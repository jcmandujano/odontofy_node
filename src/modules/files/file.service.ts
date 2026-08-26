import { createHash, randomUUID } from 'node:crypto';
import path from 'node:path';

import type { FilePurpose } from '../../types/file.enums';
import { FileStorageProvider, GoogleCloudFileStorage } from './file.provider';
import { FileRepository, SequelizeFileRepository } from './file.repository';
import { FileError, StoredFileData } from './file.types';

export interface UploadedFile {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
  size: number;
}

export interface FileServiceDependencies {
  clock?: () => Date;
  provider?: FileStorageProvider;
  repository?: FileRepository;
}

const publicView = (file: StoredFileData) => ({
  id: file.publicId,
  purpose: file.purpose,
  originalName: file.originalName,
  mediaType: file.mediaType,
  sizeBytes: file.sizeBytes,
  sha256: file.sha256,
  status: file.status,
  securityStatus: file.securityStatus,
  createdAt: file.createdAt.toISOString(),
});

export class FileService {
  private readonly clock: () => Date;
  private readonly provider: FileStorageProvider;
  private readonly repository: FileRepository;

  constructor(dependencies: FileServiceDependencies = {}) {
    this.clock = dependencies.clock ?? (() => new Date());
    this.provider = dependencies.provider ?? new GoogleCloudFileStorage();
    this.repository = dependencies.repository ?? new SequelizeFileRepository();
  }

  async upload(userId: number, purpose: FilePurpose, upload: UploadedFile | undefined) {
    this.validate(upload);
    const file = upload!;
    const publicId = randomUUID();
    const objectKey = `documents/${purpose.toLowerCase()}/${publicId}.pdf`;
    const pending = await this.repository.createPending({
      publicId,
      userId,
      purpose,
      bucket: this.provider.bucketName(),
      objectKey,
      originalName: this.safeOriginalName(file.originalname),
      sizeBytes: file.size,
      sha256: createHash('sha256').update(file.buffer).digest('hex'),
    });
    try {
      const result = await this.provider.upload(objectKey, file.buffer);
      return publicView(await this.repository.makeAvailable(pending.id, result.generation));
    } catch {
      try {
        await this.provider.delete(objectKey);
      } catch {
        // Metadata remains FAILED so an operator can reconcile provider state.
      }
      await this.repository.fail(pending.id, 'PROVIDER_UPLOAD_FAILED');
      throw new FileError('FILE_PROVIDER_UNAVAILABLE', 'No fue posible almacenar el archivo');
    }
  }

  async access(userId: number, publicId: string) {
    const file = await this.repository.findOwn(userId, publicId);
    if (!file) throw new FileError('FILE_NOT_FOUND', 'Archivo no encontrado');
    if (file.status !== 'AVAILABLE') throw new FileError('FILE_NOT_AVAILABLE', 'Archivo no disponible');
    const expiresAt = new Date(this.clock().getTime() + 5 * 60_000);
    try {
      return { url: await this.provider.accessUrl(file.objectKey, expiresAt), expiresAt: expiresAt.toISOString() };
    } catch {
      throw new FileError('FILE_PROVIDER_UNAVAILABLE', 'No fue posible autorizar el acceso al archivo');
    }
  }

  async delete(userId: number, publicId: string) {
    const current = await this.repository.findOwn(userId, publicId);
    if (!current) throw new FileError('FILE_NOT_FOUND', 'Archivo no encontrado');
    if (current.status === 'DELETED') return;
    const file = await this.repository.reserveDeletion(userId, publicId);
    if (!file) throw new FileError('FILE_IN_USE', 'El archivo esta vinculado o no puede eliminarse');
    try {
      await this.provider.delete(file.objectKey);
      await this.repository.finishDeletion(file.id);
    } catch {
      await this.repository.cancelDeletion(file.id, 'PROVIDER_DELETE_FAILED');
      throw new FileError('FILE_PROVIDER_UNAVAILABLE', 'No fue posible eliminar el archivo');
    }
  }

  async requireAvailable(userId: number, publicId: string, purpose: FilePurpose) {
    const file = await this.repository.findOwn(userId, publicId);
    if (!file || file.status !== 'AVAILABLE' || file.purpose !== purpose) {
      throw new FileError('FILE_NOT_FOUND', 'Archivo no encontrado');
    }
    return file;
  }

  private validate(upload: UploadedFile | undefined) {
    if (!upload) throw new FileError('FILE_INVALID', 'Se requiere un archivo PDF');
    const extension = path.extname(upload.originalname).toLowerCase();
    const header = upload.buffer.subarray(0, 1024).toString('latin1');
    if (extension !== '.pdf' || upload.mimetype !== 'application/pdf' || !header.includes('%PDF-')) {
      throw new FileError('FILE_INVALID', 'El archivo no es un PDF valido');
    }
  }

  private safeOriginalName(value: string) {
    const safe = [...path.basename(value)]
      .filter((character) => character.charCodeAt(0) > 31 && character.charCodeAt(0) !== 127)
      .join('')
      .trim();
    return (safe || 'document.pdf').slice(0, 255);
  }
}
