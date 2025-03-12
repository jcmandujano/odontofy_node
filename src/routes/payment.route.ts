import { Router } from "express";
import { validarJWT } from "../middlewares/validar-jwt";
import { listPayments, getPayment, createPayment, updatePayment, deletePayment, getPaymentBalancePerUser } from "../controllers/payment.controller";

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
router.patch('/:patient_id/payment/:id',[
    validarJWT
], updatePayment)
router.delete('/:patient_id/payment/:id',[
    validarJWT
], deletePayment)
router.get('/payment/payment-balance',[
    validarJWT
], getPaymentBalancePerUser)

export default router;