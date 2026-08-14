// src/utils/googleStorageClient.ts
import { Bucket, Storage } from '@google-cloud/storage';
import path from 'path';

const keyPath = path.join(__dirname, '../keys/storage-key.json');

export const getGoogleStorageBucket = (): Bucket => {
  const bucketName = process.env.GCS_BUCKET_NAME;

  if (!bucketName) {
    throw new Error('GCS_BUCKET_NAME is not defined in environment variables.');
  }

  const storage = new Storage({ keyFilename: keyPath });
  return storage.bucket(bucketName);
};
