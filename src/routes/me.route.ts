import { Router } from 'express';
import { getMe, updateMe } from '../controllers/me.controller';
import { validarJWT } from '../middlewares/validar-jwt';

const router = Router();
router.use(validarJWT);
router.get('/', getMe);
router.put('/', updateMe);
export default router;
