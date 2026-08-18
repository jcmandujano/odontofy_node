import { Request, RequestHandler } from 'express';

import { sendSuccess } from '../../platform/http/response';
import { authenticatedUserId } from '../identity/identity.middleware';
import {
  CreatePatientInput,
  ListPatientsQuery,
  PatientIdParams,
  UpdatePatientInput,
} from './patient.schemas';
import { PatientService } from './patient.service';

const validated = <T>(req: Request, target: 'body' | 'params' | 'query'): T =>
  req.validated?.[target] as T;

export const createPatientController = (service: PatientService) => {
  const list: RequestHandler = async (req, res) => {
    const result = await service.list(
      authenticatedUserId(req),
      validated<ListPatientsQuery>(req, 'query')
    );
    return sendSuccess(req, res, result.patients, {
      message: 'Pacientes obtenidos',
      meta: { pagination: result.pagination },
    });
  };

  const get: RequestHandler = async (req, res) => {
    const patient = await service.get(
      authenticatedUserId(req),
      validated<PatientIdParams>(req, 'params').patientId
    );
    return sendSuccess(req, res, patient, { message: 'Paciente obtenido' });
  };

  const create: RequestHandler = async (req, res) => {
    const patient = await service.create(
      authenticatedUserId(req),
      validated<CreatePatientInput>(req, 'body')
    );
    return sendSuccess(req, res, patient, {
      message: 'Paciente creado',
      statusCode: 201,
    });
  };

  const update: RequestHandler = async (req, res) => {
    const patient = await service.update(
      authenticatedUserId(req),
      validated<PatientIdParams>(req, 'params').patientId,
      validated<UpdatePatientInput>(req, 'body')
    );
    return sendSuccess(req, res, patient, {
      message: 'Paciente actualizado',
    });
  };

  const archive: RequestHandler = async (req, res) => {
    await service.archive(
      authenticatedUserId(req),
      validated<PatientIdParams>(req, 'params').patientId
    );
    return sendSuccess(req, res, null, { message: 'Paciente archivado' });
  };

  return { archive, create, get, list, update };
};
