export interface IdentityUser {
  id: number;
  name: string;
  middleName: string;
  lastName: string;
  dateOfBirth: Date | null;
  phone: string;
  avatar: string;
  email: string;
  passwordHash: string;
  active: boolean;
  authVersion: number;
  showFinanceStats: boolean;
  isGoogleSynced: boolean;
}

export interface PublicUser {
  id: number;
  name: string;
  middleName: string;
  lastName: string;
  dateOfBirth: string | null;
  phone: string;
  avatar: string;
  email: string;
  showFinanceStats: boolean;
  isGoogleSynced: boolean;
}

export interface SessionContext {
  ipAddress: string | null;
  userAgent: string | null;
}

export interface AuthenticatedSession {
  accessToken: string;
  refreshToken: string;
  user: PublicUser;
}

export interface IdentityEmailSender {
  sendAccountVerification(
    user: IdentityUser,
    token: string
  ): Promise<void>;
  sendPasswordReset(user: IdentityUser, token: string): Promise<void>;
}

export type IdentityErrorCode =
  | 'INVALID_CREDENTIALS'
  | 'INVALID_SESSION'
  | 'INVALID_TOKEN'
  | 'INVALID_PASSWORD'
  | 'UNAUTHENTICATED'
  | 'USER_NOT_FOUND';

export class IdentityError extends Error {
  readonly code: IdentityErrorCode;

  constructor(code: IdentityErrorCode, message: string) {
    super(message);
    this.name = 'IdentityError';
    this.code = code;
  }
}
