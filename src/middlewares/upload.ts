import multer from 'multer';

const storage = multer.memoryStorage();
export const upload = multer({
  storage,
  limits: {
    fileSize: Number(process.env.FILE_UPLOAD_MAX_BYTES ?? 10 * 1024 * 1024),
    files: 1,
    fields: 4,
  },
});
