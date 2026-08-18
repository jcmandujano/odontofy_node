import { Request, RequestHandler } from 'express';

import { sendSuccess } from '../../platform/http/response';
import { authenticatedUserId } from '../identity/identity.middleware';
import {
  CreateTreatmentPlanInput,
  CreateTreatmentPlanItemInput,
  ListTreatmentPlansQuery,
  PatientTreatmentPlansParams,
  TreatmentPlanItemParams,
  TreatmentPlanParams,
  UpdateTreatmentPlanInput,
  UpdateTreatmentPlanItemInput,
  UpdateTreatmentPlanItemStatusInput,
  UpdateTreatmentPlanStatusInput,
} from './treatment-plan.schemas';
import { TreatmentPlanService } from './treatment-plan.service';

const validated = <T>(req: Request, target: 'body' | 'params' | 'query'): T =>
  req.validated?.[target] as T;

export const createTreatmentPlanController = (
  service: TreatmentPlanService
) => {
  const list: RequestHandler = async (req, res) => {
    const result = await service.list(
      authenticatedUserId(req),
      validated<PatientTreatmentPlansParams>(req, 'params').patientId,
      validated<ListTreatmentPlansQuery>(req, 'query')
    );
    return sendSuccess(req, res, result.treatmentPlans, {
      message: 'Planes de tratamiento obtenidos',
      meta: { pagination: result.pagination },
    });
  };

  const get: RequestHandler = async (req, res) => {
    const plan = await service.get(
      authenticatedUserId(req),
      validated<TreatmentPlanParams>(req, 'params').treatmentPlanId
    );
    return sendSuccess(req, res, plan, {
      message: 'Plan de tratamiento obtenido',
    });
  };

  const create: RequestHandler = async (req, res) => {
    const plan = await service.create(
      authenticatedUserId(req),
      validated<PatientTreatmentPlansParams>(req, 'params').patientId,
      validated<CreateTreatmentPlanInput>(req, 'body')
    );
    return sendSuccess(req, res, plan, {
      message: 'Plan de tratamiento creado',
      statusCode: 201,
    });
  };

  const update: RequestHandler = async (req, res) => {
    const plan = await service.update(
      authenticatedUserId(req),
      validated<TreatmentPlanParams>(req, 'params').treatmentPlanId,
      validated<UpdateTreatmentPlanInput>(req, 'body')
    );
    return sendSuccess(req, res, plan, {
      message: 'Plan de tratamiento actualizado',
    });
  };

  const updateStatus: RequestHandler = async (req, res) => {
    const plan = await service.updateStatus(
      authenticatedUserId(req),
      validated<TreatmentPlanParams>(req, 'params').treatmentPlanId,
      validated<UpdateTreatmentPlanStatusInput>(req, 'body')
    );
    return sendSuccess(req, res, plan, {
      message: 'Estado del plan actualizado',
    });
  };

  const cancel: RequestHandler = async (req, res) => {
    const plan = await service.cancel(
      authenticatedUserId(req),
      validated<TreatmentPlanParams>(req, 'params').treatmentPlanId
    );
    return sendSuccess(req, res, plan, {
      message: 'Plan de tratamiento cancelado',
    });
  };

  const createItem: RequestHandler = async (req, res) => {
    const result = await service.createItem(
      authenticatedUserId(req),
      validated<TreatmentPlanParams>(req, 'params').treatmentPlanId,
      validated<CreateTreatmentPlanItemInput>(req, 'body')
    );
    return sendSuccess(req, res, result, {
      message: 'Item de tratamiento creado',
      statusCode: 201,
    });
  };

  const updateItem: RequestHandler = async (req, res) => {
    const params = validated<TreatmentPlanItemParams>(req, 'params');
    const result = await service.updateItem(
      authenticatedUserId(req),
      params.treatmentPlanId,
      params.itemId,
      validated<UpdateTreatmentPlanItemInput>(req, 'body')
    );
    return sendSuccess(req, res, result, {
      message: 'Item de tratamiento actualizado',
    });
  };

  const updateItemStatus: RequestHandler = async (req, res) => {
    const params = validated<TreatmentPlanItemParams>(req, 'params');
    const result = await service.updateItemStatus(
      authenticatedUserId(req),
      params.treatmentPlanId,
      params.itemId,
      validated<UpdateTreatmentPlanItemStatusInput>(req, 'body')
    );
    return sendSuccess(req, res, result, {
      message: 'Estado del item actualizado',
    });
  };

  const cancelItem: RequestHandler = async (req, res) => {
    const params = validated<TreatmentPlanItemParams>(req, 'params');
    const result = await service.cancelItem(
      authenticatedUserId(req),
      params.treatmentPlanId,
      params.itemId
    );
    return sendSuccess(req, res, result, {
      message: 'Item de tratamiento cancelado',
    });
  };

  return {
    cancel,
    cancelItem,
    create,
    createItem,
    get,
    list,
    update,
    updateItem,
    updateItemStatus,
    updateStatus,
  };
};
