import { Router } from "express";
import { validarJWT } from "../middlewares/validar-jwt";

import { validateUser } from "../middlewares/validateUserExist";
import { createUserConsent, deleteUserConsent, getUserConsents, listUserConsents, updateUserConsent } from "../controllers/user-informed-consent.controller";

const router = Router();

router.get('/', [
    validarJWT,
    validateUser,
], listUserConsents)
router.get('/:id', [
    validarJWT,
    validateUser,
], getUserConsents)
router.post('/', [
    validarJWT,
    validateUser
], createUserConsent)
router.put('/:id', [
    validarJWT,
    validateUser,
], updateUserConsent)
router.delete('/:id', [
    validarJWT,
    validateUser,
], deleteUserConsent)

export default router;