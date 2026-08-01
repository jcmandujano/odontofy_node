import { Router } from 'express';
import { googleAuthInit, googleCallback } from '../controllers/google.controller';
import { validarJWT } from '../middlewares/validar-jwt';

const router = Router();

router.get('/init', validarJWT, googleAuthInit);
router.get('/callback', googleCallback);

export default router;
