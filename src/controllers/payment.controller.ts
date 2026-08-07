import { Request, Response } from 'express';
import {
  PaymentServiceError,
  createPayment as createPaymentService,
  deletePayment as deletePaymentService,
  getPaymentBalance as getPaymentBalanceService,
  getPaymentById as getPaymentByIdService,
  listPayments as listPaymentsService,
  updatePayment as updatePaymentService,
} from '../services/payment.service';
import { errorResponse, successResponse } from '../utils/response';

const getAuthorUid = (req: Request) => {
  if (typeof req.authorUid !== 'number') {
    throw new PaymentServiceError('Usuario autenticado no valido', 401);
  }

  return req.authorUid;
};

const handlePaymentError = (res: Response, error: unknown) => {
  console.error('Error en payment.controller:', error);

  if (error instanceof PaymentServiceError) {
    return errorResponse(res, error.message, error.statusCode);
  }

  return errorResponse(res, 'Ocurrio un problema al procesar el pago', 500, error);
};

export const listPayments = async (req: Request, res: Response) => {
  const patientId = parseInt(req.params.patient_id, 10);
  const page = parseInt(req.query.page as string, 10) || 1;
  const limit = parseInt(req.query.limit as string, 10) || 10;

  try {
    const payments = await listPaymentsService(getAuthorUid(req), patientId, page, limit);
    return successResponse(res, payments, 'Pagos obtenidos correctamente');
  } catch (error) {
    return handlePaymentError(res, error);
  }
};

export const getPayment = async (req: Request, res: Response) => {
  const patientId = parseInt(req.params.patient_id, 10);
  const paymentId = parseInt(req.params.id, 10);

  try {
    const payment = await getPaymentByIdService(getAuthorUid(req), patientId, paymentId);
    return successResponse(res, payment, 'Pago obtenido correctamente');
  } catch (error) {
    return handlePaymentError(res, error);
  }
};

export const createPayment = async (req: Request, res: Response) => {
  const patientId = parseInt(req.params.patient_id, 10);

  try {
    const payment = await createPaymentService(getAuthorUid(req), patientId, req.body);
    return successResponse(res, payment, 'Pago creado correctamente', 201);
  } catch (error) {
    return handlePaymentError(res, error);
  }
};

export const updatePayment = async (req: Request, res: Response) => {
  const patientId = parseInt(req.params.patient_id, 10);
  const paymentId = parseInt(req.params.id, 10);

  try {
    const payment = await updatePaymentService(
      getAuthorUid(req),
      patientId,
      paymentId,
      req.body
    );
    return successResponse(res, payment, 'Pago actualizado correctamente');
  } catch (error) {
    return handlePaymentError(res, error);
  }
};

export const deletePayment = async (req: Request, res: Response) => {
  const patientId = parseInt(req.params.patient_id, 10);
  const paymentId = parseInt(req.params.id, 10);

  try {
    await deletePaymentService(getAuthorUid(req), patientId, paymentId);
    return successResponse(res, null, 'Pago eliminado correctamente');
  } catch (error) {
    return handlePaymentError(res, error);
  }
};

export const getPaymentBalancePerUser = async (req: Request, res: Response) => {
  const currentMonthOnly = req.query.currentMonthOnly === 'true';

  try {
    const balance = await getPaymentBalanceService(getAuthorUid(req), currentMonthOnly);
    return successResponse(res, balance, 'Balance obtenido correctamente');
  } catch (error) {
    return handlePaymentError(res, error);
  }
};
