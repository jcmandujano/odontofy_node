import { Router } from "express";
import { check } from "express-validator";
import { confirmAccount, doLogin, register, verifyPassword } from "../controllers/auth.controller";
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
router.get('/verify-account/:userId/:token', confirmAccount)

export default router;
