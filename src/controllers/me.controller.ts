import { Request, Response } from 'express';
import User from '../models/user.model';
import { errorResponse, successResponse } from '../utils/response';

const editableFields = ['name', 'middle_name', 'last_name', 'date_of_birth', 'phone', 'avatar'] as const;

export const getMe = async (req: Request, res: Response) => {
  const user = await User.findByPk(req.authorUid);
  if (!user) return errorResponse(res, 'Usuario no encontrado', 404);
  return successResponse(res, user.toSafeJSON(), 'Perfil obtenido correctamente');
};

export const updateMe = async (req: Request, res: Response) => {
  const user = await User.findByPk(req.authorUid);
  if (!user) return errorResponse(res, 'Usuario no encontrado', 404);
  const payload = Object.fromEntries(editableFields.filter((field) => req.body[field] !== undefined).map((field) => [field, req.body[field]]));
  await user.update(payload);
  return successResponse(res, user.toSafeJSON(), 'Perfil actualizado correctamente');
};
