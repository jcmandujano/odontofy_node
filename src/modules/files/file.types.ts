import type { FilePurpose, StoredFileStatus } from '../../models/stored-file.model';

export interface StoredFileData {
  id: number;
  publicId: string;
  userId: number;
  purpose: FilePurpose;
  bucket: string;
  objectKey: string;
  originalName: string;
  mediaType: string;
  sizeBytes: number;
  sha256: string;
  generation: string | null;
  status: StoredFileStatus;
  securityStatus: 'BASIC_VALIDATED';
  failureCode: string | null;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export type FileErrorCode =
  | 'FILE_INVALID'
  | 'FILE_NOT_FOUND'
  | 'FILE_NOT_AVAILABLE'
  | 'FILE_IN_USE'
  | 'FILE_PROVIDER_UNAVAILABLE';

export class FileError extends Error {
  constructor(readonly code: FileErrorCode, message: string) {
    super(message);
    this.name = 'FileError';
  }
}
