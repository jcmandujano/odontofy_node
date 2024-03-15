import { Router } from "express";
import { validarJWT } from "../middlewares/validar-jwt";
import { createPatient, deletePatient, getPatient, listPatient, updatePatient } from "../controllers/patient.controller";

const router = Router();

router.get('/', [
    validarJWT
], listPatient)
router.get('/:id', [
    validarJWT
], getPatient)
router.post('/', [
    validarJWT
],
createPatient)
router.put('/:id',[
    validarJWT
], updatePatient)
router.delete('/:id',[
    validarJWT
], deletePatient)

export default router;