// src/routes/upload.route.ts
import { Router } from 'express';
import { uploadFile, getSignedFileUrl } from '../controllers/upload.controller';
import { upload } from '../middlewares/upload';
import { validarJWT } from "../middlewares/validar-jwt";

const router = Router();

router.post('/', [
    validarJWT
],
    upload.single('file'),
    uploadFile);
router.get('/:filePath(*)', getSignedFileUrl);

export default router;
