import { Request, RequestHandler } from 'express';

import { sendSuccess } from '../../platform/http/response';
import { authenticatedUserId } from '../identity/identity.middleware';
import {
  CreateOdontogramInput,
  ListOdontogramsQuery,
  OdontogramParams,
  OdontogramTreatmentLinkParams,
  PatientOdontogramsParams,
  UpdateOdontogramInput,
} from './odontogram.schemas';
import { OdontogramService } from './odontogram.service';

const validated = <T>(req: Request, target: 'body' | 'params' | 'query'): T =>
  req.validated?.[target] as T;

export const createOdontogramController = (service: OdontogramService) => {
  const list: RequestHandler = async (req, res) => {
    const result = await service.list(
      authenticatedUserId(req),
      validated<PatientOdontogramsParams>(req, 'params').patientId,
      validated<ListOdontogramsQuery>(req, 'query')
    );
    return sendSuccess(req, res, result.odontograms, {
      message: 'Odontogramas obtenidos',
      meta: { pagination: result.pagination },
    });
  };

  const get: RequestHandler = async (req, res) => {
    const odontogram = await service.get(
      authenticatedUserId(req),
      validated<OdontogramParams>(req, 'params').odontogramId
    );
    return sendSuccess(req, res, odontogram, {
      message: 'Odontograma obtenido',
    });
  };

  const create: RequestHandler = async (req, res) => {
    const odontogram = await service.create(
      authenticatedUserId(req),
      validated<PatientOdontogramsParams>(req, 'params').patientId,
      validated<CreateOdontogramInput>(req, 'body')
    );
    return sendSuccess(req, res, odontogram, {
      message: 'Odontograma creado',
      statusCode: 201,
    });
  };

  const update: RequestHandler = async (req, res) => {
    const odontogram = await service.update(
      authenticatedUserId(req),
      validated<OdontogramParams>(req, 'params').odontogramId,
      validated<UpdateOdontogramInput>(req, 'body')
    );
    return sendSuccess(req, res, odontogram, {
      message: 'Odontograma actualizado',
    });
  };

  const archive: RequestHandler = async (req, res) => {
    const odontogram = await service.archive(
      authenticatedUserId(req),
      validated<OdontogramParams>(req, 'params').odontogramId
    );
    return sendSuccess(req, res, odontogram, {
      message: 'Odontograma archivado',
    });
  };

  const restore: RequestHandler = async (req, res) => {
    const odontogram = await service.restore(
      authenticatedUserId(req),
      validated<OdontogramParams>(req, 'params').odontogramId
    );
    return sendSuccess(req, res, odontogram, {
      message: 'Odontograma restaurado',
    });
  };

  const linkTreatmentItem: RequestHandler = async (req, res) => {
    const { odontogramId, findingId, itemId } =
      validated<OdontogramTreatmentLinkParams>(req, 'params');
    const odontogram = await service.linkTreatmentItem(
      authenticatedUserId(req),
      odontogramId,
      findingId,
      itemId
    );
    return sendSuccess(req, res, odontogram, {
      message: 'Tratamiento asociado al hallazgo',
    });
  };

  const unlinkTreatmentItem: RequestHandler = async (req, res) => {
    const { odontogramId, findingId, itemId } =
      validated<OdontogramTreatmentLinkParams>(req, 'params');
    const odontogram = await service.unlinkTreatmentItem(
      authenticatedUserId(req),
      odontogramId,
      findingId,
      itemId
    );
    return sendSuccess(req, res, odontogram, {
      message: 'Tratamiento desvinculado del hallazgo',
    });
  };

  return {
    archive,
    create,
    get,
    linkTreatmentItem,
    list,
    restore,
    unlinkTreatmentItem,
    update,
  };
};
