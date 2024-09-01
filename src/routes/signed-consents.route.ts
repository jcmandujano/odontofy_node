import { Router } from "express";
import { validarJWT } from "../middlewares/validar-jwt";
import { listSignedConsents, getSignedConsent, createSignedConsents, deleteSignedConsents } from "../controllers/signed-consent.controller"

const router = Router();

router.get('/', [
    validarJWT
], listSignedConsents)
router.get('/:id', [
    validarJWT
], getSignedConsent)
router.post('/', [
    validarJWT
], createSignedConsents)
//posiblemente no debamos editar la actualizacion de consentimientos informados.... 
//en su defecto eliminar uno que tenga errores y crear uno nuevo
/* router.put('/:id',[
    validarJWT
], updateSignedConsents) */
router.delete('/:id',[
    validarJWT
], deleteSignedConsents)

export default router;