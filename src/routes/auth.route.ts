import { Router } from "express";
import { check } from "express-validator";
import { confirmAccount, doLogin, forgotPassword, logout, refreshSession, register, resetPassword, verifyPassword } from "../controllers/auth.controller";
import { validarCampos } from "../middlewares/validarCampos";
import { validarJWT } from "../middlewares/validar-jwt";
import { rateLimit } from '../middlewares/rate-limit';

const router = Router();

router.post('/login', rateLimit(15 * 60 * 1000, 10), [
    check('username', 'El correo es obligatorio').isEmail(),
    check('password', 'La contraseña es obligatoria').not().isEmpty(),
    validarCampos
], doLogin)
router.post('/register', rateLimit(60 * 60 * 1000, 5), register)
router.post('/refresh', refreshSession)
router.post('/logout', logout)
router.post('/verify-password', [
    validarJWT
], verifyPassword)
router.get('/verify-account/:userId/:token', confirmAccount)
router.post('/forgot-password', rateLimit(60 * 60 * 1000, 5), [
    validarCampos
], forgotPassword)
router.post('/reset-password', rateLimit(15 * 60 * 1000, 5), resetPassword);

export default router;
