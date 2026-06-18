import { Request, Response } from 'express';
import {
  createTreatmentPlanItem as createTreatmentPlanItemService,
  deleteTreatmentPlanItem as deleteTreatmentPlanItemService,
  updateTreatmentPlanItem as updateTreatmentPlanItemService,
  updateTreatmentPlanItemStatus as updateTreatmentPlanItemStatusService,
} from '../services/treatment-plan-item.service';
import { TreatmentPlanServiceError } from '../services/treatment-plan.service';
import { errorResponse, successResponse } from '../utils/response';

const getAuthorUid = (req: Request) => {
  if (typeof req.authorUid !== 'number') {
    throw new TreatmentPlanServiceError('Usuario autenticado no válido', 401);
  }

  return req.authorUid;
};

const handleTreatmentPlanItemError = (res: Response, error: unknown) => {
  console.error('Error en treatment-plan-item.controller:', error);

  if (error instanceof TreatmentPlanServiceError) {
    return errorResponse(res, error.message, error.statusCode);
  }

  return errorResponse(res, 'Ocurrió un problema al procesar el ítem del plan de tratamiento', 500, error);
};

export const createTreatmentPlanItem = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { body } = req;

  try {
    const authorUid = getAuthorUid(req);
    const result = await createTreatmentPlanItemService(authorUid, parseInt(id, 10), body);

    return successResponse(res, result, 'Ítem agregado al plan de tratamiento correctamente', 201);
  } catch (error) {
    return handleTreatmentPlanItemError(res, error);
  }
};

export const updateTreatmentPlanItem = async (req: Request, res: Response) => {
  const { id, itemId } = req.params;
  const { body } = req;

  try {
    const authorUid = getAuthorUid(req);
    const result = await updateTreatmentPlanItemService(
      authorUid,
      parseInt(id, 10),
      parseInt(itemId, 10),
      body
    );

    return successResponse(res, result, 'Ítem del plan de tratamiento actualizado correctamente');
  } catch (error) {
    return handleTreatmentPlanItemError(res, error);
  }
};

export const deleteTreatmentPlanItem = async (req: Request, res: Response) => {
  const { id, itemId } = req.params;

  try {
    const authorUid = getAuthorUid(req);
    const result = await deleteTreatmentPlanItemService(authorUid, parseInt(id, 10), parseInt(itemId, 10));

    return successResponse(res, result, 'Ítem eliminado del plan de tratamiento correctamente');
  } catch (error) {
    return handleTreatmentPlanItemError(res, error);
  }
};

export const updateTreatmentPlanItemStatus = async (req: Request, res: Response) => {
  const { id, itemId } = req.params;
  const { body } = req;

  try {
    const authorUid = getAuthorUid(req);
    const treatmentPlanItem = await updateTreatmentPlanItemStatusService(
      authorUid,
      parseInt(id, 10),
      parseInt(itemId, 10),
      body
    );

    return successResponse(res, treatmentPlanItem, 'Estado del ítem actualizado correctamente');
  } catch (error) {
    return handleTreatmentPlanItemError(res, error);
  }
};
