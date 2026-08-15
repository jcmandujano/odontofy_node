import { randomUUID } from 'node:crypto';
import { Transaction, UniqueConstraintError } from 'sequelize';

import db from '../../db/connection';
import AuthSession from '../../models/auth-session.model';
import PasswordReset from '../../models/password-reset.model';
import Token from '../../models/token.model';
import User from '../../models/user.model';
import {
  RegisterInput,
  UpdateProfileInput,
} from './identity.schemas';
import { IdentityUser, SessionContext } from './identity.types';

const mapUser = (user: User): IdentityUser => ({
  id: user.id,
  name: user.name,
  middleName: user.middle_name,
  lastName: user.last_name,
  dateOfBirth: user.date_of_birth ?? null,
  phone: user.phone,
  avatar: user.avatar,
  email: user.email,
  passwordHash: user.password,
  active: user.status,
  authVersion: user.auth_version,
  showFinanceStats: user.show_finance_stats,
  isGoogleSynced: Boolean(user.google_refresh_token),
});

export type SessionRotationResult =
  | { status: 'invalid' | 'replayed' }
  | { status: 'rotated'; user: IdentityUser };

export interface IdentityRepository {
  findUserByEmail(email: string): Promise<IdentityUser | null>;
  findActiveUserById(userId: number): Promise<IdentityUser | null>;
  createPendingUser(
    input: RegisterInput,
    passwordHash: string,
    verificationTokenHash: string,
    verificationExpiresAt: Date
  ): Promise<IdentityUser | null>;
  replaceVerificationToken(
    email: string,
    tokenHash: string,
    expiresAt: Date
  ): Promise<IdentityUser | null>;
  activateUser(userId: number, tokenHash: string, now: Date): Promise<boolean>;
  createRefreshSession(
    userId: number,
    tokenHash: string,
    expiresAt: Date,
    context: SessionContext
  ): Promise<void>;
  rotateRefreshSession(
    currentTokenHash: string,
    nextTokenHash: string,
    nextExpiresAt: Date,
    context: SessionContext,
    now: Date
  ): Promise<SessionRotationResult>;
  revokeRefreshSession(tokenHash: string, now: Date): Promise<void>;
  createPasswordReset(
    email: string,
    tokenHash: string,
    expiresAt: Date
  ): Promise<IdentityUser | null>;
  resetPassword(
    tokenHash: string,
    passwordHash: string,
    now: Date
  ): Promise<boolean>;
  updateProfile(
    userId: number,
    input: UpdateProfileInput
  ): Promise<IdentityUser | null>;
}

const sessionExpiry = (expiresAt: Date, now: Date): boolean =>
  expiresAt.getTime() <= now.getTime();

export class SequelizeIdentityRepository implements IdentityRepository {
  async findUserByEmail(email: string): Promise<IdentityUser | null> {
    const user = await User.findOne({ where: { email } });
    return user ? mapUser(user) : null;
  }

  async findActiveUserById(userId: number): Promise<IdentityUser | null> {
    const user = await User.findOne({ where: { id: userId, status: true } });
    return user ? mapUser(user) : null;
  }

  async createPendingUser(
    input: RegisterInput,
    passwordHash: string,
    verificationTokenHash: string,
    verificationExpiresAt: Date
  ): Promise<IdentityUser | null> {
    try {
      return await db.transaction(async (transaction) => {
        const existing = await User.findOne({
          where: { email: input.email },
          transaction,
          lock: transaction.LOCK.UPDATE,
        });
        if (existing) return null;

        const user = await User.create(
          {
            name: input.name,
            middle_name: input.middleName,
            last_name: input.lastName,
            date_of_birth: input.dateOfBirth
              ? new Date(`${input.dateOfBirth}T00:00:00.000Z`)
              : null,
            phone: input.phone,
            avatar: input.avatar,
            email: input.email,
            password: passwordHash,
            status: false,
            auth_version: 0,
            show_finance_stats: false,
          },
          { transaction }
        );
        await Token.create(
          {
            userId: user.id,
            token: verificationTokenHash,
            expiresAt: verificationExpiresAt,
          },
          { transaction }
        );
        return mapUser(user);
      });
    } catch (error) {
      if (error instanceof UniqueConstraintError) return null;
      throw error;
    }
  }

  async replaceVerificationToken(
    email: string,
    tokenHash: string,
    expiresAt: Date
  ): Promise<IdentityUser | null> {
    return db.transaction(async (transaction) => {
      const user = await User.findOne({
        where: { email },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (!user || user.status) return null;

      await Token.destroy({ where: { userId: user.id }, transaction });
      await Token.create(
        { userId: user.id, token: tokenHash, expiresAt },
        { transaction }
      );
      return mapUser(user);
    });
  }

  async activateUser(
    userId: number,
    tokenHash: string,
    now: Date
  ): Promise<boolean> {
    return db.transaction(async (transaction) => {
      const token = await Token.findOne({
        where: { userId, token: tokenHash },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (!token || token.expiresAt.getTime() <= now.getTime()) return false;

      const [updated] = await User.update(
        { status: true },
        { where: { id: userId, status: false }, transaction }
      );
      if (!updated) return false;

      await Token.destroy({ where: { userId }, transaction });
      return true;
    });
  }

  async createRefreshSession(
    userId: number,
    tokenHash: string,
    expiresAt: Date,
    context: SessionContext
  ): Promise<void> {
    await AuthSession.create({
      user_id: userId,
      token_hash: tokenHash,
      family_id: randomUUID(),
      expires_at: expiresAt,
      user_agent: context.userAgent,
      ip_address: context.ipAddress,
    });
  }

  async rotateRefreshSession(
    currentTokenHash: string,
    nextTokenHash: string,
    nextExpiresAt: Date,
    context: SessionContext,
    now: Date
  ): Promise<SessionRotationResult> {
    return db.transaction(async (transaction) => {
      const session = await AuthSession.findOne({
        where: { token_hash: currentTokenHash },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (!session) return { status: 'invalid' };

      if (session.revoked_at) {
        await this.revokeSessionFamily(session.family_id, now, transaction);
        return { status: 'replayed' };
      }

      if (sessionExpiry(session.expires_at, now)) {
        session.revoked_at = now;
        await session.save({ transaction });
        return { status: 'invalid' };
      }

      const user = await User.findOne({
        where: { id: session.user_id, status: true },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (!user) {
        await this.revokeSessionFamily(session.family_id, now, transaction);
        return { status: 'invalid' };
      }

      session.revoked_at = now;
      await session.save({ transaction });
      await AuthSession.create(
        {
          user_id: user.id,
          token_hash: nextTokenHash,
          family_id: session.family_id,
          expires_at: nextExpiresAt,
          user_agent: context.userAgent,
          ip_address: context.ipAddress,
        },
        { transaction }
      );

      return { status: 'rotated', user: mapUser(user) };
    });
  }

  async revokeRefreshSession(tokenHash: string, now: Date): Promise<void> {
    await AuthSession.update(
      { revoked_at: now },
      { where: { token_hash: tokenHash, revoked_at: null } }
    );
  }

  async createPasswordReset(
    email: string,
    tokenHash: string,
    expiresAt: Date
  ): Promise<IdentityUser | null> {
    return db.transaction(async (transaction) => {
      const user = await User.findOne({
        where: { email, status: true },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (!user) return null;

      await PasswordReset.destroy({
        where: { user_id: user.id, used: false },
        transaction,
      });
      await PasswordReset.create(
        {
          user_id: user.id,
          token: tokenHash,
          expires_at: expiresAt,
          used: false,
        },
        { transaction }
      );
      return mapUser(user);
    });
  }

  async resetPassword(
    tokenHash: string,
    passwordHash: string,
    now: Date
  ): Promise<boolean> {
    return db.transaction(async (transaction) => {
      const reset = await PasswordReset.findOne({
        where: { token: tokenHash, used: false },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (!reset || reset.expires_at.getTime() <= now.getTime()) return false;

      const user = await User.findOne({
        where: { id: reset.user_id, status: true },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (!user) return false;

      user.password = passwordHash;
      user.auth_version += 1;
      await user.save({ transaction });

      reset.used = true;
      await reset.save({ transaction });
      await AuthSession.update(
        { revoked_at: now },
        {
          where: { user_id: reset.user_id, revoked_at: null },
          transaction,
        }
      );
      return true;
    });
  }

  async updateProfile(
    userId: number,
    input: UpdateProfileInput
  ): Promise<IdentityUser | null> {
    const user = await User.findOne({ where: { id: userId, status: true } });
    if (!user) return null;

    await user.update({
      ...(input.name !== undefined && { name: input.name }),
      ...(input.middleName !== undefined && { middle_name: input.middleName }),
      ...(input.lastName !== undefined && { last_name: input.lastName }),
      ...(input.dateOfBirth !== undefined && {
        date_of_birth: input.dateOfBirth
          ? new Date(`${input.dateOfBirth}T00:00:00.000Z`)
          : null,
      }),
      ...(input.phone !== undefined && { phone: input.phone }),
      ...(input.avatar !== undefined && { avatar: input.avatar }),
    });
    return mapUser(user);
  }

  private async revokeSessionFamily(
    familyId: string,
    now: Date,
    transaction: Transaction
  ): Promise<void> {
    await AuthSession.update(
      { revoked_at: now },
      { where: { family_id: familyId, revoked_at: null }, transaction }
    );
  }
}
