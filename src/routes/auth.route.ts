import { Router } from "express";
import { check } from "express-validator";
import { confirmAccount, doLogin, forgotPassword, register, resetPassword, verifyPassword } from "../controllers/auth.controller";
import { validarCampos } from "../middlewares/validarCampos";
import { validarJWT } from "../middlewares/validar-jwt";
import { loginLimiter, registerLimiter, forgotPasswordLimiter, authLimiter } from "../middlewares/rate-limiting";
import { registerValidations, loginValidations, forgotPasswordValidations, resetPasswordValidations } from "../middlewares/auth-validations";

const router = Router();

// Login con rate limiting y validaciones
router.post('/login', [
    authLimiter,
    loginLimiter,
    ...loginValidations,
    validarCampos
], doLogin);

// Registro con rate limiting y validaciones completas
router.post('/register', [
    registerLimiter,
    ...registerValidations,
    validarCampos
], register);

// Verificación de contraseña (requiere JWT)
router.post('/verify-password', [
    authLimiter,
    validarJWT,
    check('password', 'La contraseña es obligatoria').not().isEmpty(),
    validarCampos
], verifyPassword);

// Confirmación de cuenta (sin rate limiting ya que viene por email)
router.get('/verify-account/:userId/:token', confirmAccount);

// Recuperación de contraseña con rate limiting
router.post('/forgot-password', [
    forgotPasswordLimiter,
    ...forgotPasswordValidations,
    validarCampos
], forgotPassword);

// Reset de contraseña con validaciones
router.post('/reset-password', [
    authLimiter,
    ...resetPasswordValidations,
    validarCampos
], resetPassword);

export default router;
