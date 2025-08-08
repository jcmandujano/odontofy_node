import { Router } from 'express';
import { sendWelcomeEmail } from '../controllers/mailing.controller';
import { validarCampos } from '../middlewares/validarCampos';

const router = Router();

router.post('/welcome', validarCampos, sendWelcomeEmail);

export default router;
