import { Request, Response } from 'express';

import Patient from '../models/patient.model';
import { ConsentService } from '../modules/consents/consent.service';
import { errorResponse, successResponse } from '../utils/response';

const service = new ConsentService();
const uuid = (value: unknown): string | null =>
  typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
    ? value
    : null;

export const listSignedConsents = async (req: Request, res: Response) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(req.query.limit) || 10));
    const result = await service.listSigned(req.authorUid || 0, Number(req.params.patient_id), { page, pageSize, status: 'all' });
    return successResponse(res, {
      total: result.pagination.total,
      page,
      perPage: pageSize,
      totalPages: result.pagination.totalPages,
      results: result.consents,
    }, 'Signed consents list fetched successfully');
  } catch (error) {
    return errorResponse(res, 'An error occurred while fetching the informed consent list', 404, error);
  }
};

export const getSignedConsent = async (req: Request, res: Response) => {
  try {
    const value = await service.getSigned(req.authorUid || 0, Number(req.params.patient_id), Number(req.params.id));
    return successResponse(res, value, 'Consentimiento obtenido');
  } catch (error) {
    return errorResponse(res, 'El consentimiento informado no ha sido encontrado', 404, error);
  }
};

export const createSignedConsents = async (req: Request, res: Response) => {
  try {
    const userId = req.authorUid || 0;
    const patientId = Number(req.params.patient_id);
    const patient = await Patient.findOne({ where: { id: patientId, user_id: userId } });
    if (!patient) return errorResponse(res, 'Paciente no encontrado', 404);
    const patientName = [patient.name, patient.middle_name, patient.last_name].map((part) => part?.trim()).filter(Boolean).join(' ');
    const result = await service.createSigned(userId, patientId, {
      templateId: Number(req.body.templateId ?? req.body.consent_id ?? req.body.user_informed_consent_id),
      signedAt: new Date(req.body.signedAt ?? req.body.signed_date ?? Date.now()).toISOString(),
      signedDocumentFileId: uuid(req.body.signedDocumentFileId ?? req.body.signed_file_id),
      signatoryName: typeof req.body.signatoryName === 'string' ? req.body.signatoryName : patientName,
      signatoryCapacity: req.body.signatoryCapacity === 'REPRESENTATIVE' ? 'REPRESENTATIVE' : 'PATIENT',
    });
    return successResponse(res, result, 'Consentimiento registrado correctamente');
  } catch (error) {
    return errorResponse(res, 'Ocurrio un problema al realizar tu solicitud', 400, error);
  }
};

export const updateSignedConsents = async (_req: Request, res: Response) =>
  errorResponse(res, 'Los consentimientos firmados no pueden editarse', 405);

export const deleteSignedConsents = async (req: Request, res: Response) => {
  try {
    const result = await service.void(req.authorUid || 0, Number(req.params.patient_id), Number(req.params.id), {
      reason: 'Anulado desde la API legacy',
    });
    return successResponse(res, result, 'Consentimiento anulado correctamente');
  } catch (error) {
    return errorResponse(res, 'Consentimiento no encontrado', 404, error);
  }
};
