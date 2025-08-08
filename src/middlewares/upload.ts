import multer from 'multer';

const storage = multer.memoryStorage(); // Guardamos en memoria para subir directo a GCS
export const upload = multer({ storage });
