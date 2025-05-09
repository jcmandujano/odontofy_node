import { Router } from "express";
import { check } from "express-validator";
import { doLogin, register, verifyPassword } from "../controllers/auth.controller";
import { validarCampos } from "../middlewares/validarCampos";
import { validarJWT } from "../middlewares/validar-jwt";

const router = Router();

router.post('/login', [
    check('username', 'El correo es obligatorio').isEmail(),
    check('password', 'La contraseña es obligatoria').not().isEmpty(),
    validarCampos
], doLogin)
router.post('/register', register)
router.post('/verify-password', [
    validarJWT
], verifyPassword)

export default router;
