import { NextFunction, Request, RequestHandler, Response } from 'express';
import { z } from 'zod';

import { ApiError } from './api-error';

type RequestTarget = 'body' | 'headers' | 'params' | 'query';
type RequestSchemas = Partial<Record<RequestTarget, z.ZodType>>;

const formatIssues = (error: z.ZodError) =>
  error.issues.map((issue) => ({
    code: issue.code,
    path: issue.path.map(String),
    message: issue.message,
  }));

export const validateRequest = (schemas: RequestSchemas): RequestHandler => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const validated: Request['validated'] = {};

    for (const target of Object.keys(schemas) as RequestTarget[]) {
      const result = schemas[target]?.safeParse(req[target]);
      if (!result) continue;

      if (!result.success) {
        next(
          new ApiError({
            code: 'VALIDATION_ERROR',
            message: 'La solicitud contiene datos invalidos',
            statusCode: 400,
            details: formatIssues(result.error),
          })
        );
        return;
      }

      validated[target] = result.data;
    }

    req.validated = validated;
    next();
  };
};
