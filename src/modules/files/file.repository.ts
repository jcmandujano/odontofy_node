import { Transaction } from 'sequelize';

import db from '../../db/connection';
import SignedConsent from '../../models/signed-consent.model';
import StoredFile from '../../models/stored-file.model';
import type { FilePurpose } from '../../types/file.enums';
import UserInformedConsent from '../../models/user-informed-consent.model';
import type { StoredFileData } from './file.types';

const map = (file: StoredFile): StoredFileData => ({
  id: file.id,
  publicId: file.public_id,
  userId: file.user_id,
  purpose: file.purpose,
  bucket: file.bucket,
  objectKey: file.object_key,
  originalName: file.original_name,
  mediaType: file.media_type,
  sizeBytes: Number(file.size_bytes),
  sha256: file.sha256,
  generation: file.generation,
  status: file.status,
  securityStatus: file.security_status,
  failureCode: file.failure_code,
  deletedAt: file.deleted_at,
  createdAt: file.createdAt,
  updatedAt: file.updatedAt,
});

interface PendingFile {
  publicId: string;
  userId: number;
  purpose: FilePurpose;
  bucket: string;
  objectKey: string;
  originalName: string;
  sizeBytes: number;
  sha256: string;
}

export interface FileRepository {
  createPending(input: PendingFile): Promise<StoredFileData>;
  makeAvailable(id: number, generation: string): Promise<StoredFileData>;
  fail(id: number, code: string): Promise<void>;
  findOwn(userId: number, publicId: string): Promise<StoredFileData | null>;
  reserveDeletion(userId: number, publicId: string): Promise<StoredFileData | null>;
  finishDeletion(id: number): Promise<void>;
  cancelDeletion(id: number, code: string): Promise<void>;
}

export class SequelizeFileRepository implements FileRepository {
  async createPending(input: PendingFile) {
    const file = await StoredFile.create({
      public_id: input.publicId,
      user_id: input.userId,
      purpose: input.purpose,
      provider: 'GCS',
      bucket: input.bucket,
      object_key: input.objectKey,
      original_name: input.originalName,
      media_type: 'application/pdf',
      size_bytes: input.sizeBytes,
      sha256: input.sha256,
    });
    return map(file);
  }

  async makeAvailable(id: number, generation: string) {
    const file = await StoredFile.findByPk(id);
    if (!file) throw new Error('Pending file disappeared');
    await file.update({ status: 'AVAILABLE', generation, failure_code: null });
    return map(file);
  }

  async fail(id: number, code: string) {
    await StoredFile.update({ status: 'FAILED', failure_code: code }, { where: { id } });
  }

  async findOwn(userId: number, publicId: string) {
    const file = await StoredFile.findOne({ where: { user_id: userId, public_id: publicId } });
    return file ? map(file) : null;
  }

  async reserveDeletion(userId: number, publicId: string) {
    let result: StoredFileData | null = null;
    await db.transaction(async (transaction) => {
      const file = await this.lock(userId, publicId, transaction);
      if (!file || file.status !== 'AVAILABLE') return;
      const references = await Promise.all([
        UserInformedConsent.count({ where: { template_file_id: file.id }, transaction }),
        SignedConsent.count({ where: { template_file_id_snapshot: file.id }, transaction }),
        SignedConsent.count({ where: { signed_file_id: file.id }, transaction }),
      ]);
      if (references.some(Boolean)) return;
      await file.update({ status: 'DELETING' }, { transaction });
      result = map(file);
    });
    return result;
  }

  async finishDeletion(id: number) {
    await StoredFile.update(
      { status: 'DELETED', deleted_at: new Date(), failure_code: null },
      { where: { id, status: 'DELETING' } }
    );
  }

  async cancelDeletion(id: number, code: string) {
    await StoredFile.update(
      { status: 'AVAILABLE', failure_code: code },
      { where: { id, status: 'DELETING' } }
    );
  }

  private lock(userId: number, publicId: string, transaction: Transaction) {
    return StoredFile.findOne({
      where: { user_id: userId, public_id: publicId },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
  }
}
