import { Request, Response } from 'express';
import {
  TreatmentPlanServiceError,
  createTreatmentPlan as createTreatmentPlanService,
  deleteTreatmentPlan as deleteTreatmentPlanService,
  getTreatmentPlanById as getTreatmentPlanByIdService,
  getTreatmentPlansByPatient as getTreatmentPlansByPatientService,
  updateTreatmentPlan as updateTreatmentPlanService,
  updateTreatmentPlanStatus as updateTreatmentPlanStatusService,
} from '../services/treatment-plan.service';
import { errorResponse, successResponse } from '../utils/response';

const getAuthorUid = (req: Request) => {
  if (typeof req.authorUid !== 'number') {
    throw new TreatmentPlanServiceError('Usuario autenticado no válido', 401);
  }

  return req.authorUid;
};

const handleTreatmentPlanError = (res: Response, error: unknown) => {
  console.error('Error en treatment-plan.controller:', error);

  if (error instanceof TreatmentPlanServiceError) {
    return errorResponse(res, error.message, error.statusCode);
  }

  return errorResponse(res, 'Ocurrió un problema al procesar el plan de tratamiento', 500, error);
};

export const createTreatmentPlan = async (req: Request, res: Response) => {
  const { patientId } = req.params;
  const { body } = req;

  try {
    const authorUid = getAuthorUid(req);
    const treatmentPlan = await createTreatmentPlanService(authorUid, parseInt(patientId, 10), body);

    return successResponse(res, treatmentPlan, 'Plan de tratamiento creado correctamente', 201);
  } catch (error) {
    return handleTreatmentPlanError(res, error);
  }
};

export const getTreatmentPlansByPatient = async (req: Request, res: Response) => {
  const { patientId } = req.params;
  const page = parseInt(req.query.page as string, 10) || 1;
  const limit = parseInt(req.query.limit as string, 10) || 10;

  try {
    const authorUid = getAuthorUid(req);
    const treatmentPlans = await getTreatmentPlansByPatientService(
      authorUid,
      parseInt(patientId, 10),
      page,
      limit
    );

    return successResponse(res, treatmentPlans, 'Planes de tratamiento obtenidos correctamente');
  } catch (error) {
    return handleTreatmentPlanError(res, error);
  }
};

export const getTreatmentPlanById = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const authorUid = getAuthorUid(req);
    const treatmentPlan = await getTreatmentPlanByIdService(authorUid, parseInt(id, 10));

    return successResponse(res, treatmentPlan, 'Plan de tratamiento obtenido correctamente');
  } catch (error) {
    return handleTreatmentPlanError(res, error);
  }
};

export const updateTreatmentPlan = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { body } = req;

  try {
    const authorUid = getAuthorUid(req);
    const treatmentPlan = await updateTreatmentPlanService(authorUid, parseInt(id, 10), body);

    return successResponse(res, treatmentPlan, 'Plan de tratamiento actualizado correctamente');
  } catch (error) {
    return handleTreatmentPlanError(res, error);
  }
};

export const deleteTreatmentPlan = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const authorUid = getAuthorUid(req);
    const treatmentPlan = await deleteTreatmentPlanService(authorUid, parseInt(id, 10));

    return successResponse(res, treatmentPlan, 'Plan de tratamiento cancelado correctamente');
  } catch (error) {
    return handleTreatmentPlanError(res, error);
  }
};

export const updateTreatmentPlanStatus = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { body } = req;

  try {
    const authorUid = getAuthorUid(req);
    const treatmentPlan = await updateTreatmentPlanStatusService(authorUid, parseInt(id, 10), body);

    return successResponse(res, treatmentPlan, 'Estado del plan de tratamiento actualizado correctamente');
  } catch (error) {
    return handleTreatmentPlanError(res, error);
  }
};
