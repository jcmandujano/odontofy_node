import jwt from 'jsonwebtoken';
import { Request } from 'express';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { getRefreshCookie } from '../src/modules/identity/identity.cookies';
import {
  loginSchema,
  passwordSchema,
  registerSchema,
  updateProfileSchema,
} from '../src/modules/identity/identity.schemas';
import { IdentityService } from '../src/modules/identity/identity.service';
import { JwtAccessTokenService } from '../src/modules/identity/identity.tokens';
import { IdentityError } from '../src/modules/identity/identity.types';

const originalEnvironment = { ...process.env };

beforeEach(() => {
  process.env.JWT_SECRET = 'test-secret-with-at-least-32-characters';
  process.env.JWT_ISSUER = 'odontofy-test';
  process.env.JWT_AUDIENCE = 'odontofy-test-client';
  process.env.JWT_ACCESS_TTL_SECONDS = '600';
});

afterEach(() => {
  process.env = { ...originalEnvironment };
  vi.restoreAllMocks();
});

describe('identity schemas', () => {
  it('allows the authenticated user to update the finance visibility preference', () => {
    expect(updateProfileSchema.parse({ showFinanceStats: false })).toEqual({
      showFinanceStats: false,
    });
  });

  it('accepts long passphrases and rejects bcrypt truncation or unknown fields', () => {
    expect(passwordSchema.safeParse('correct horse battery staple').success).toBe(
      true
    );
    expect(passwordSchema.safeParse('a'.repeat(73)).success).toBe(false);
    expect(
      loginSchema.safeParse({
        email: 'ada@example.test',
        password: '\u00e9'.repeat(40),
      }).success
    ).toBe(false);
    expect(passwordSchema.safeParse('contrasena-segura-😀'.repeat(4)).success).toBe(
      false
    );
    expect(
      registerSchema.safeParse({
        name: 'Ada',
        lastName: 'Lovelace',
        email: 'ada@example.test',
        password: 'Password1!',
      }).success
    ).toBe(true);
    expect(
      registerSchema.safeParse({
        name: 'Ada',
        lastName: 'Lovelace',
        email: 'ada@example.test',
        password: 'password1!',
      }).success
    ).toBe(false);
    expect(
      registerSchema.safeParse({
        name: 'Ada',
        lastName: 'Lovelace',
        email: 'ada@example.test',
        password: 'correct horse battery staple',
        role: 'admin',
      }).success
    ).toBe(false);
  });

  it('normalizes emails and prevents mass assignment in profile updates', () => {
    expect(
      loginSchema.parse({
        email: '  ADA@EXAMPLE.TEST ',
        password: 'password',
      }).email
    ).toBe('ada@example.test');
    expect(updateProfileSchema.safeParse({ email: 'new@example.test' }).success).toBe(
      false
    );
    expect(updateProfileSchema.safeParse({}).success).toBe(false);
    expect(
      getRefreshCookie({
        headers: { cookie: 'odontofy_refresh_v1=%' },
      } as Request)
    ).toBeUndefined();
  });
});

describe('v1 access tokens', () => {
  it('issues explicitly typed JWTs and verifies identity and auth version', () => {
    const tokens = new JwtAccessTokenService();
    const token = tokens.issue(42, 3);
    const decoded = jwt.decode(token, { complete: true });

    expect(decoded?.header).toMatchObject({ alg: 'HS256', typ: 'at+jwt' });
    expect(decoded?.payload).toMatchObject({
      aud: 'odontofy-test-client',
      iss: 'odontofy-test',
      sub: '42',
      ver: 3,
    });
    expect(tokens.verify(token)).toEqual({ userId: 42, authVersion: 3 });
  });

  it('rejects tokens with the wrong type, audience, signature, or expiration', () => {
    const tokens = new JwtAccessTokenService();
    const secret = process.env.JWT_SECRET as string;
    const base = {
      algorithm: 'HS256' as const,
      audience: 'odontofy-test-client',
      issuer: 'odontofy-test',
      subject: '42',
      jwtid: 'test-jti',
    };
    const wrongType = jwt.sign({ ver: 0 }, secret, {
      ...base,
      expiresIn: 600,
      header: { alg: 'HS256', typ: 'JWT' },
    });
    const wrongAudience = jwt.sign({ ver: 0 }, secret, {
      ...base,
      audience: 'another-client',
      expiresIn: 600,
      header: { alg: 'HS256', typ: 'at+jwt' },
    });
    const expired = jwt.sign({ ver: 0 }, secret, {
      ...base,
      expiresIn: -1,
      header: { alg: 'HS256', typ: 'at+jwt' },
    });
    const wrongSignature = new JwtAccessTokenService().issue(42, 0);

    expect(() => tokens.verify(wrongType)).toThrow();
    expect(() => tokens.verify(wrongAudience)).toThrow();
    expect(() => tokens.verify(expired)).toThrow();
    process.env.JWT_SECRET = 'another-secret-with-at-least-32-characters';
    expect(() => tokens.verify(wrongSignature)).toThrow();
  });

  it('rejects undersized secrets instead of silently signing weak tokens', () => {
    process.env.JWT_SECRET = 'short';
    expect(() => new JwtAccessTokenService().issue(1, 0)).toThrow(
      'JWT_SECRET must contain at least 32 bytes'
    );
  });
});

describe('identity anti-enumeration', () => {
  it('activates local test accounts without creating a verification token when disabled', async () => {
    const createUser = vi.fn().mockResolvedValue({ id: 1 });
    const sendAccountVerification = vi.fn();
    const service = new IdentityService({
      accountVerificationRequired: false,
      passwordHasher: { hash: vi.fn().mockResolvedValue('password-hash'), verify: vi.fn() },
      repository: { createUser } as never,
      emailSender: { sendAccountVerification, sendPasswordReset: vi.fn() },
    });
    const input = {
      name: 'Ada',
      middleName: '',
      lastName: 'Lovelace',
      dateOfBirth: undefined,
      phone: '',
      avatar: '',
      email: 'ada@example.test',
      password: 'correct horse battery staple',
    };

    await expect(service.register(input)).resolves.toBe(false);
    expect(createUser).toHaveBeenCalledWith(input, 'password-hash', null);
    expect(sendAccountVerification).not.toHaveBeenCalled();
  });

  it('performs password verification for an unknown email and returns a generic error', async () => {
    const verify = vi.fn().mockResolvedValue(false);
    const service = new IdentityService({
      passwordHasher: { hash: vi.fn(), verify },
      repository: {
        findUserByEmail: vi.fn().mockResolvedValue(null),
      } as never,
      emailSender: {
        sendAccountVerification: vi.fn(),
        sendPasswordReset: vi.fn(),
      },
    });

    await expect(
      service.login(
        { email: 'missing@example.test', password: 'unknown-password' },
        { ipAddress: null, userAgent: null }
      )
    ).rejects.toEqual(
      expect.objectContaining<Partial<IdentityError>>({
        code: 'INVALID_CREDENTIALS',
        message: 'Correo o contrasena incorrectos',
      })
    );
    expect(verify).toHaveBeenCalledWith('unknown-password', undefined);
  });
});
