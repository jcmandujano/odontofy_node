import {
  AccountVerificationConfirmInput,
  AccountVerificationRequestInput,
  ForgotPasswordInput,
  LoginInput,
  RegisterInput,
  ResetPasswordInput,
  UpdateProfileInput,
  VerifyPasswordInput,
} from './identity.schemas';
import {
  BcryptPasswordHasher,
  createActionToken,
  createRefreshToken,
  hashToken,
  PasswordHasher,
} from './identity.crypto';
import {
  IdentityRepository,
  SequelizeIdentityRepository,
} from './identity.repository';
import {
  AccessTokenService,
  JwtAccessTokenService,
} from './identity.tokens';
import {
  AuthenticatedSession,
  IdentityEmailSender,
  IdentityError,
  IdentityUser,
  PublicUser,
  SessionContext,
} from './identity.types';
import { BrevoIdentityEmailSender } from './identity.mailer';

const milliseconds = {
  minute: 60 * 1000,
  hour: 60 * 60 * 1000,
  day: 24 * 60 * 60 * 1000,
} as const;

const configuredNumber = (
  name: string,
  fallback: number,
  minimum: number,
  maximum: number
): number => {
  const value = Number(process.env[name] ?? fallback);
  if (!Number.isInteger(value) || value < minimum || value > maximum) {
    throw new Error(`${name} must be between ${minimum} and ${maximum}`);
  }
  return value;
};

const toPublicUser = (user: IdentityUser): PublicUser => ({
  id: user.id,
  name: user.name,
  middleName: user.middleName,
  lastName: user.lastName,
  dateOfBirth: user.dateOfBirth
    ? user.dateOfBirth.toISOString().slice(0, 10)
    : null,
  phone: user.phone,
  avatar: user.avatar,
  email: user.email,
  showFinanceStats: user.showFinanceStats,
  isGoogleSynced: user.isGoogleSynced,
});

export interface IdentityServiceDependencies {
  accessTokens?: AccessTokenService;
  clock?: () => Date;
  emailSender?: IdentityEmailSender;
  passwordHasher?: PasswordHasher;
  repository?: IdentityRepository;
}

export class IdentityService {
  private readonly accessTokens: AccessTokenService;
  private readonly clock: () => Date;
  private readonly emailSender: IdentityEmailSender;
  private readonly passwordHasher: PasswordHasher;
  private readonly repository: IdentityRepository;

  constructor(dependencies: IdentityServiceDependencies = {}) {
    this.accessTokens = dependencies.accessTokens ?? new JwtAccessTokenService();
    this.clock = dependencies.clock ?? (() => new Date());
    this.emailSender =
      dependencies.emailSender ?? new BrevoIdentityEmailSender();
    this.passwordHasher =
      dependencies.passwordHasher ?? new BcryptPasswordHasher();
    this.repository =
      dependencies.repository ?? new SequelizeIdentityRepository();
  }

  async login(
    input: LoginInput,
    context: SessionContext
  ): Promise<AuthenticatedSession> {
    const user = await this.repository.findUserByEmail(input.email);
    const passwordMatches = await this.passwordHasher.verify(
      input.password,
      user?.passwordHash
    );

    if (!user || !user.active || !passwordMatches) {
      throw new IdentityError(
        'INVALID_CREDENTIALS',
        'Correo o contrasena incorrectos'
      );
    }

    return this.createAuthenticatedSession(user, context);
  }

  async refresh(
    refreshToken: string | undefined,
    context: SessionContext
  ): Promise<AuthenticatedSession> {
    if (!refreshToken) {
      throw new IdentityError('INVALID_SESSION', 'Sesion no valida');
    }

    const nextToken = createRefreshToken();
    const now = this.clock();
    const result = await this.repository.rotateRefreshSession(
      hashToken(refreshToken),
      hashToken(nextToken),
      this.refreshExpiresAt(now),
      context,
      now
    );

    if (result.status !== 'rotated') {
      throw new IdentityError('INVALID_SESSION', 'Sesion no valida');
    }

    return {
      accessToken: this.accessTokens.issue(
        result.user.id,
        result.user.authVersion
      ),
      refreshToken: nextToken,
      user: toPublicUser(result.user),
    };
  }

  async logout(refreshToken: string | undefined): Promise<void> {
    if (!refreshToken) return;
    await this.repository.revokeRefreshSession(
      hashToken(refreshToken),
      this.clock()
    );
  }

  async register(input: RegisterInput): Promise<void> {
    const passwordHash = await this.passwordHasher.hash(input.password);
    const token = createActionToken();
    const now = this.clock();
    const user = await this.repository.createPendingUser(
      input,
      passwordHash,
      hashToken(token),
      new Date(now.getTime() + 24 * milliseconds.hour)
    );

    if (user) await this.emailSender.sendAccountVerification(user, token);
  }

  async requestAccountVerification(
    input: AccountVerificationRequestInput
  ): Promise<void> {
    const token = createActionToken();
    const now = this.clock();
    const user = await this.repository.replaceVerificationToken(
      input.email,
      hashToken(token),
      new Date(now.getTime() + 24 * milliseconds.hour)
    );

    if (user) await this.emailSender.sendAccountVerification(user, token);
  }

  async confirmAccount(input: AccountVerificationConfirmInput): Promise<void> {
    const activated = await this.repository.activateUser(
      input.userId,
      hashToken(input.token),
      this.clock()
    );
    if (!activated) {
      throw new IdentityError(
        'INVALID_TOKEN',
        'El token no es valido o ha expirado'
      );
    }
  }

  async forgotPassword(input: ForgotPasswordInput): Promise<void> {
    const token = createActionToken();
    const now = this.clock();
    const user = await this.repository.createPasswordReset(
      input.email,
      hashToken(token),
      new Date(now.getTime() + milliseconds.hour)
    );

    if (user) await this.emailSender.sendPasswordReset(user, token);
  }

  async resetPassword(input: ResetPasswordInput): Promise<void> {
    const passwordHash = await this.passwordHasher.hash(input.password);
    const reset = await this.repository.resetPassword(
      hashToken(input.token),
      passwordHash,
      this.clock()
    );
    if (!reset) {
      throw new IdentityError(
        'INVALID_TOKEN',
        'El token no es valido o ha expirado'
      );
    }
  }

  async verifyPassword(
    userId: number,
    input: VerifyPasswordInput
  ): Promise<void> {
    const user = await this.repository.findActiveUserById(userId);
    const matches = await this.passwordHasher.verify(
      input.password,
      user?.passwordHash
    );
    if (!user || !matches) {
      throw new IdentityError('INVALID_PASSWORD', 'Contrasena incorrecta');
    }
  }

  async authenticateAccessToken(accessToken: string): Promise<number> {
    let tokenIdentity: { userId: number; authVersion: number };
    try {
      tokenIdentity = this.accessTokens.verify(accessToken);
    } catch {
      throw new IdentityError('UNAUTHENTICATED', 'Token de acceso no valido');
    }

    const user = await this.repository.findActiveUserById(tokenIdentity.userId);
    if (!user || user.authVersion !== tokenIdentity.authVersion) {
      throw new IdentityError('UNAUTHENTICATED', 'Token de acceso no valido');
    }
    return user.id;
  }

  async getProfile(userId: number): Promise<PublicUser> {
    const user = await this.repository.findActiveUserById(userId);
    if (!user) {
      throw new IdentityError('USER_NOT_FOUND', 'Usuario no encontrado');
    }
    return toPublicUser(user);
  }

  async updateProfile(
    userId: number,
    input: UpdateProfileInput
  ): Promise<PublicUser> {
    const user = await this.repository.updateProfile(userId, input);
    if (!user) {
      throw new IdentityError('USER_NOT_FOUND', 'Usuario no encontrado');
    }
    return toPublicUser(user);
  }

  private async createAuthenticatedSession(
    user: IdentityUser,
    context: SessionContext
  ): Promise<AuthenticatedSession> {
    const refreshToken = createRefreshToken();
    const now = this.clock();
    await this.repository.createRefreshSession(
      user.id,
      hashToken(refreshToken),
      this.refreshExpiresAt(now),
      context
    );
    return {
      accessToken: this.accessTokens.issue(user.id, user.authVersion),
      refreshToken,
      user: toPublicUser(user),
    };
  }

  private refreshExpiresAt(now: Date): Date {
    const days = configuredNumber('REFRESH_TOKEN_TTL_DAYS', 30, 1, 90);
    return new Date(now.getTime() + days * milliseconds.day);
  }
}
