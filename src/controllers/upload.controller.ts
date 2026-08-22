import { Request, Response } from 'express';

import { FileService } from '../modules/files/file.service';
import { errorResponse, successResponse } from '../utils/response';
import { getWildcardRouteParam } from '../utils/route-param';

const service = new FileService();

export const uploadFile = async (req: Request, res: Response) => {
  try {
    const purpose = req.body.purpose === 'CONSENT_TEMPLATE'
      ? 'CONSENT_TEMPLATE'
      : 'SIGNED_CONSENT';
    const result = await service.upload(req.authorUid || 0, purpose, req.file);
    return successResponse(res, result.id, 'File created successfully');
  } catch (error) {
    return errorResponse(res, 'Invalid or unavailable file', 400, error);
  }
};

export const getSignedFileUrl = async (req: Request, res: Response) => {
  try {
    const fileId = getWildcardRouteParam(req, 'filePath');
    const result = await service.access(req.authorUid || 0, fileId);
    res.set('Cache-Control', 'no-store');
    return successResponse(res, result.url, 'File URL generated successfully');
  } catch (error) {
    return errorResponse(res, 'File not found', 404, error);
  }
};
