import { Request, Response, NextFunction } from 'express';

export const rateLimit = (windowMs: number, max: number) => {
  const requests = new Map<string, { count: number; resetAt: number }>();
  return (req: Request, res: Response, next: NextFunction) => {
    const key = req.ip || 'unknown';
    const now = Date.now();
    const entry = requests.get(key);
    const current = !entry || entry.resetAt <= now ? { count: 0, resetAt: now + windowMs } : entry;
    current.count += 1;
    requests.set(key, current);
    if (current.count > max) return res.status(429).json({ success: false, message: 'Demasiados intentos. Intenta mas tarde.', data: null, errors: null });
    return next();
  };
};
