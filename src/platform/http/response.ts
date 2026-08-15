import { Request, Response } from 'express';

export interface ApiV1ErrorItem {
  code: string;
  details: unknown;
}

export interface ApiV1Response<T> {
  success: boolean;
  message: string;
  data: T | null;
  errors: ApiV1ErrorItem[] | null;
  requestId: string;
  meta?: Record<string, unknown>;
}

const getRequestId = (req: Request): string => req.requestId ?? 'unavailable';

export const sendSuccess = <T>(
  req: Request,
  res: Response,
  data: T,
  options: {
    message?: string;
    statusCode?: number;
    meta?: Record<string, unknown>;
  } = {}
): Response<ApiV1Response<T>> => {
  const payload: ApiV1Response<T> = {
    success: true,
    message: options.message ?? 'Solicitud completada',
    data,
    errors: null,
    requestId: getRequestId(req),
  };

  if (options.meta) payload.meta = options.meta;

  return res.status(options.statusCode ?? 200).json(payload);
};

export const sendError = (
  req: Request,
  res: Response,
  options: {
    code: string;
    message: string;
    statusCode: number;
    details?: unknown;
  }
): Response<ApiV1Response<null>> => {
  return res.status(options.statusCode).json({
    success: false,
    message: options.message,
    data: null,
    errors: [
      {
        code: options.code,
        details: options.details ?? null,
      },
    ],
    requestId: getRequestId(req),
  });
};
