import { Router } from 'express';
import { sendWelcomeEmail } from '../controllers/mailing.controller';
import { validarCampos } from '../middlewares/validarCampos';
import { validarJWT } from '../middlewares/validar-jwt';
import { rateLimit } from '../middlewares/rate-limit';

const router = Router();

router.post('/welcome', validarJWT, rateLimit(60 * 60 * 1000, 10), validarCampos, sendWelcomeEmail);

export default router;
