import type { Request, RequestHandler } from 'express';

import { sendSuccess } from '../../platform/http/response';
import { authenticatedUserId } from '../identity/identity.middleware';
import type { FileParams, UploadFileInput } from './file.schemas';
import { FileService } from './file.service';

const validated = <T>(req: Request, target: 'body' | 'params'): T => req.validated?.[target] as T;

export const createFileController = (service: FileService) => {
  const upload: RequestHandler = async (req, res) => {
    const result = await service.upload(authenticatedUserId(req), validated<UploadFileInput>(req, 'body').purpose, req.file);
    return sendSuccess(req, res, result, { message: 'Archivo almacenado', statusCode: 201 });
  };
  const access: RequestHandler = async (req, res) => {
    const result = await service.access(authenticatedUserId(req), validated<FileParams>(req, 'params').fileId);
    res.set('Cache-Control', 'no-store');
    return sendSuccess(req, res, result, { message: 'Acceso temporal autorizado' });
  };
  const remove: RequestHandler = async (req, res) => {
    await service.delete(authenticatedUserId(req), validated<FileParams>(req, 'params').fileId);
    return sendSuccess(req, res, null, { message: 'Archivo eliminado' });
  };
  return { access, remove, upload };
};
