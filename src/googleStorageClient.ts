// src/utils/googleStorageClient.ts
import { Storage } from '@google-cloud/storage';
import path from 'path';

// Ruta al archivo de la clave JSON
const keyPath = path.join(__dirname, '../keys/storage-key.json');

// Inicializa el cliente de Google Cloud Storage
const storage = new Storage({
    keyFilename: keyPath,
});

// Nombre del bucket (puedes usar variable de entorno si prefieres)
const bucketName = process.env.GCS_BUCKET_NAME;

if (!bucketName) {
    throw new Error('GCS_BUCKET_NAME is not defined in environment variables.');
}
const bucket = storage.bucket(bucketName);

export default bucket;
