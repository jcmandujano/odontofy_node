import { createHash, randomBytes } from 'node:crypto';
import bcrypt from 'bcryptjs';

const DUMMY_PASSWORD_HASH =
  '$2a$12$PdtzFQDUiN11kuPhoTB8ZuunUh3e3ZYlQnZZjd8uij2injb3e7EYK';

export interface PasswordHasher {
  hash(password: string): Promise<string>;
  verify(password: string, passwordHash?: string): Promise<boolean>;
}

const bcryptRounds = (): number => {
  const rounds = Number(process.env.BCRYPT_ROUNDS ?? 12);
  if (!Number.isInteger(rounds) || rounds < 10 || rounds > 15) {
    throw new Error('BCRYPT_ROUNDS must be an integer between 10 and 15');
  }
  return rounds;
};

export class BcryptPasswordHasher implements PasswordHasher {
  async hash(password: string): Promise<string> {
    return bcrypt.hash(password, bcryptRounds());
  }

  async verify(password: string, passwordHash?: string): Promise<boolean> {
    return bcrypt.compare(password, passwordHash ?? DUMMY_PASSWORD_HASH);
  }
}

export const createRefreshToken = (): string =>
  randomBytes(48).toString('base64url');

export const createActionToken = (): string => randomBytes(32).toString('hex');

export const hashToken = (token: string): string =>
  createHash('sha256').update(token).digest('hex');
