import { randomUUID } from 'node:crypto';
import jwt, { Jwt, JwtPayload } from 'jsonwebtoken';

const accessTokenSecret = (): string => {
  const secret = process.env.JWT_SECRET || process.env.SECRETORPRIVATEKEY || '';
  if (Buffer.byteLength(secret, 'utf8') < 32) {
    throw new Error('JWT_SECRET must contain at least 32 bytes');
  }
  return secret;
};

const accessTokenTtl = (): number => {
  const ttl = Number(process.env.JWT_ACCESS_TTL_SECONDS ?? 600);
  if (!Number.isInteger(ttl) || ttl < 60 || ttl > 3600) {
    throw new Error('JWT_ACCESS_TTL_SECONDS must be between 60 and 3600');
  }
  return ttl;
};

const issuer = (): string => process.env.JWT_ISSUER || 'odontofy-api';
const audience = (): string => process.env.JWT_AUDIENCE || 'odontofy-web';

const isAccessToken = (decoded: Jwt): decoded is Jwt & { payload: JwtPayload } =>
  decoded.header.alg === 'HS256' &&
  decoded.header.typ === 'at+jwt' &&
  typeof decoded.payload !== 'string' &&
  typeof decoded.payload.sub === 'string' &&
  /^\d+$/.test(decoded.payload.sub) &&
  typeof decoded.payload.jti === 'string' &&
  typeof decoded.payload.ver === 'number' &&
  Number.isInteger(decoded.payload.ver) &&
  decoded.payload.ver >= 0 &&
  typeof decoded.payload.exp === 'number';

export interface AccessTokenIdentity {
  userId: number;
  authVersion: number;
}

export interface AccessTokenService {
  issue(userId: number, authVersion: number): string;
  verify(token: string): AccessTokenIdentity;
}

export class JwtAccessTokenService implements AccessTokenService {
  issue(userId: number, authVersion: number): string {
    return jwt.sign({ ver: authVersion }, accessTokenSecret(), {
      algorithm: 'HS256',
      audience: audience(),
      expiresIn: accessTokenTtl(),
      header: { alg: 'HS256', typ: 'at+jwt' },
      issuer: issuer(),
      jwtid: randomUUID(),
      subject: String(userId),
    });
  }

  verify(token: string): AccessTokenIdentity {
    const decoded = jwt.verify(token, accessTokenSecret(), {
      algorithms: ['HS256'],
      audience: audience(),
      complete: true,
      issuer: issuer(),
    });

    if (!isAccessToken(decoded)) throw new Error('Invalid access token claims');

    return {
      userId: Number(decoded.payload.sub),
      authVersion: decoded.payload.ver as number,
    };
  }
}
