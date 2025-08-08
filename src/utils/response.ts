import { Response } from 'express';
import { ApiResponse } from '../types/api-response';

export const successResponse = <T>(
  res: Response,
  data: T,
  message = 'Success',
  status = 200
): Response<ApiResponse<T>> => {
  return res.status(status).json({
    success: true,
    message,
    data,
    errors: null
  });
};

export const errorResponse = (
  res: Response,
  message = 'Something went wrong',
  status = 500,
  errors: any = null
): Response<ApiResponse<null>> => {
  return res.status(status).json({
    success: false,
    message,
    data: null,
    errors
  });
};
