import { Router } from "express";
import { validarJWT } from "../middlewares/validar-jwt";
import { listPayments, getPayment, createPayment, updatePayment, deletePayment } from "../controllers/payment.controller";

const router = Router();

router.get('/:patient_id/payment/', [
    validarJWT
], listPayments)
router.get('/:patient_id/payment/:id', [
    validarJWT
], getPayment)
router.post('/:patient_id/payment/', [
    validarJWT
], createPayment)
router.put('/:patient_id/payment/:id',[
    validarJWT
], updatePayment)
router.delete('/:patient_id/payment/:id',[
    validarJWT
], deletePayment)

export default router;