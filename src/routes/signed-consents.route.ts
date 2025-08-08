import { Router } from "express";
import { validarJWT } from "../middlewares/validar-jwt";
import { listSignedConsents, getSignedConsent, createSignedConsents, deleteSignedConsents } from "../controllers/signed-consent.controller"

const router = Router();

router.get('/:patient_id/signed-consents', [
    validarJWT
], listSignedConsents)
router.get('/:patient_id/signed-consents/:id', [
    validarJWT
], getSignedConsent)
router.post('/:patient_id/signed-consents', [
    validarJWT
], createSignedConsents)
//posiblemente no debamos editar la actualizacion de consentimientos informados.... 
//en su defecto eliminar uno que tenga errores y crear uno nuevo
/* router.put('/:id',[
    validarJWT
], updateSignedConsents) */
router.delete('/:patient_id/signed-consents/:id', [
    validarJWT
], deleteSignedConsents)

export default router;