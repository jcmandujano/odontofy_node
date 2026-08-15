import { CookieOptions, Request, Response } from 'express';

const isProduction = (): boolean => process.env.NODE_ENV === 'production';

const cookieName = 'odontofy_refresh_v1';

const refreshTokenTtlDays = (): number => {
  const days = Number(process.env.REFRESH_TOKEN_TTL_DAYS ?? 30);
  if (!Number.isInteger(days) || days < 1 || days > 90) {
    throw new Error('REFRESH_TOKEN_TTL_DAYS must be between 1 and 90');
  }
  return days;
};

const cookieOptions = (): CookieOptions => ({
  httpOnly: true,
  maxAge: refreshTokenTtlDays() * 24 * 60 * 60 * 1000,
  path: '/api/v1/auth',
  sameSite: 'strict',
  secure: isProduction(),
});

export const getRefreshCookie = (req: Request): string | undefined => {
  for (const part of req.headers.cookie?.split(';') ?? []) {
    const [key, ...value] = part.trim().split('=');
    if (key === cookieName) {
      try {
        return decodeURIComponent(value.join('='));
      } catch {
        return undefined;
      }
    }
  }
  return undefined;
};

export const setRefreshCookie = (res: Response, token: string): void => {
  res.cookie(cookieName, token, cookieOptions());
};

export const clearRefreshCookie = (res: Response): void => {
  const options = cookieOptions();
  delete options.maxAge;
  res.clearCookie(cookieName, options);
};
