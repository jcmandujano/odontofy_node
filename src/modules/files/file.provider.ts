import { Storage } from '@google-cloud/storage';

export interface FileStorageProvider {
  bucketName(): string;
  upload(objectKey: string, content: Buffer): Promise<{ generation: string }>;
  accessUrl(objectKey: string, expiresAt: Date): Promise<string>;
  delete(objectKey: string): Promise<void>;
}

export class GoogleCloudFileStorage implements FileStorageProvider {
  private readonly storage = new Storage();

  bucketName(): string {
    const value = process.env.GCS_BUCKET_NAME?.trim();
    if (!value) throw new Error('GCS_BUCKET_NAME is required');
    return value;
  }

  async upload(objectKey: string, content: Buffer) {
    const file = this.storage.bucket(this.bucketName()).file(objectKey);
    await file.save(content, {
      contentType: 'application/pdf',
      metadata: { cacheControl: 'private, no-store' },
      preconditionOpts: { ifGenerationMatch: 0 },
      resumable: false,
      validation: 'crc32c',
    });
    const [metadata] = await file.getMetadata();
    return { generation: String(metadata.generation ?? '') };
  }

  async accessUrl(objectKey: string, expiresAt: Date) {
    const [url] = await this.storage
      .bucket(this.bucketName())
      .file(objectKey)
      .getSignedUrl({ action: 'read', expires: expiresAt, version: 'v4' });
    return url;
  }

  async delete(objectKey: string) {
    await this.storage.bucket(this.bucketName()).file(objectKey).delete({ ignoreNotFound: true });
  }
}
