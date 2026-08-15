import { Request } from 'express';

export const getRouteParam = (req: Request, name: string): string => {
  const value = req.params[name];

  if (typeof value !== 'string') {
    throw new TypeError(`Expected a single route parameter: ${name}`);
  }

  return value;
};

export const getWildcardRouteParam = (req: Request, name: string): string => {
  const value = req.params[name];
  return Array.isArray(value) ? value.join('/') : value;
};
