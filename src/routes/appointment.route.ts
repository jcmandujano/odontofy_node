import { Router } from "express";
import { validarJWT } from "../middlewares/validar-jwt";
import {createAppointment, updateAppointment, getAppointment, listAppointments, deleteAppointment} from "../controllers/appointment.controller"

const router = Router();

router.get('/', [
    validarJWT
], listAppointments)
router.get('/:id', [
    validarJWT
], getAppointment)
router.post('/', [
    validarJWT
], createAppointment)
router.put('/:id',[
    validarJWT
], updateAppointment)
router.delete('/:id',[
    validarJWT
], deleteAppointment)

export default router;