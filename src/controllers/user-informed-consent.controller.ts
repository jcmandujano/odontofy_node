import { Request, Response } from 'express';

import { ConsentService } from '../modules/consents/consent.service';
import { errorResponse, successResponse } from '../utils/response';
import { getRouteParam } from '../utils/route-param';

const service = new ConsentService();
const uuid = (value: unknown): string | null =>
  typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
    ? value
    : null;

export const listUserConsents = async (req: Request, res: Response) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(req.query.limit) || 10));
    const result = await service.listTemplates(req.authorUid || 0, { page, pageSize, status: 'all' });
    return successResponse(res, {
      total: result.pagination.total,
      page,
      perPage: pageSize,
      totalPages: result.pagination.totalPages,
      results: result.templates,
    }, 'Consentimientos informados obtenidos exitosamente');
  } catch (error) {
    return errorResponse(res, 'Error al obtener los consentimientos informados', 500, error);
  }
};

export const getUserConsents = async (req: Request, res: Response) => {
  try {
    return successResponse(res, await service.getTemplate(req.authorUid || 0, Number(getRouteParam(req, 'id'))), 'Consentimiento informado obtenido exitosamente');
  } catch (error) {
    return errorResponse(res, 'Consentimiento no encontrado', 404, error);
  }
};

export const createUserConsent = async (req: Request, res: Response) => {
  try {
    const result = await service.createTemplate(req.authorUid || 0, {
      name: String(req.body.name ?? '').trim(),
      description: typeof req.body.description === 'string' ? req.body.description : null,
      templateFileId: uuid(req.body.templateFileId ?? req.body.template_file_id),
    });
    return successResponse(res, result, 'Consentimiento creado exitosamente');
  } catch (error) {
    return errorResponse(res, 'Error al crear el consentimiento', 400, error);
  }
};

export const updateUserConsent = async (req: Request, res: Response) => {
  try {
    const input: { name?: string; description?: string | null; templateFileId?: string | null } = {};
    if (typeof req.body.name === 'string') input.name = req.body.name.trim();
    if ('description' in req.body) input.description = typeof req.body.description === 'string' ? req.body.description : null;
    if ('templateFileId' in req.body || 'template_file_id' in req.body) input.templateFileId = uuid(req.body.templateFileId ?? req.body.template_file_id);
    return successResponse(res, await service.updateTemplate(req.authorUid || 0, Number(getRouteParam(req, 'id')), input as never), 'Consentimiento actualizado exitosamente');
  } catch (error) {
    return errorResponse(res, 'Error al personalizar el consentimiento', 400, error);
  }
};

export const deleteUserConsent = async (req: Request, res: Response) => {
  try {
    await service.setTemplateArchived(req.authorUid || 0, Number(getRouteParam(req, 'id')), true);
    return successResponse(res, null, 'Consentimiento archivado exitosamente');
  } catch (error) {
    return errorResponse(res, 'Consentimiento no encontrado', 404, error);
  }
};
