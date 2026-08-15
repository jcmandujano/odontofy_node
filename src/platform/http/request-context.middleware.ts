import { NextFunction, Request, Response } from 'express';

export const attachRequestContext = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  req.requestId = String(req.id);
  next();
};
