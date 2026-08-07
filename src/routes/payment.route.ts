import { Router } from 'express';
import {
  createPayment,
  deletePayment,
  getPayment,
  getPaymentBalancePerUser,
  listPayments,
  updatePayment,
} from '../controllers/payment.controller';
import {
  validateCreatePayment,
  validateListPayments,
  validatePaymentBalance,
  validatePaymentParams,
  validateUpdatePayment,
} from '../middlewares/payment.validators';
import { validarJWT } from '../middlewares/validar-jwt';

const router = Router();

router.get('/payment/payment-balance', validarJWT, validatePaymentBalance, getPaymentBalancePerUser);
router.get('/:patient_id/payment', validarJWT, validateListPayments, listPayments);
router.get('/:patient_id/payment/:id', validarJWT, validatePaymentParams, getPayment);
router.post('/:patient_id/payment', validarJWT, validateCreatePayment, createPayment);
router.patch('/:patient_id/payment/:id', validarJWT, validateUpdatePayment, updatePayment);
router.delete('/:patient_id/payment/:id', validarJWT, validatePaymentParams, deletePayment);

export default router;
