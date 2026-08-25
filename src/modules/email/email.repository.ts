import { Op } from 'sequelize';

import db from '../../db/connection';
import EmailDelivery from '../../models/email-delivery.model';
import type { EmailKind } from '../../types/email.enums';

export interface EmailWork {
  id: number;
  kind: EmailKind;
  idempotencyKey: string;
  encryptedPayload: string;
  attempts: number;
  lockedAt: Date;
}

export interface EmailRepository {
  enqueue(input: { publicId: string; userId: number | null; kind: EmailKind; idempotencyKey: string; encryptedPayload: string; availableAt: Date }): Promise<void>;
  claim(limit: number, now: Date, maxAttempts: number): Promise<EmailWork[]>;
  complete(work: EmailWork, messageId: string | null, now: Date): Promise<void>;
  fail(work: EmailWork, code: string, retryAt: Date): Promise<void>;
}

export class SequelizeEmailRepository implements EmailRepository {
  async enqueue(input: { publicId: string; userId: number | null; kind: EmailKind; idempotencyKey: string; encryptedPayload: string; availableAt: Date }) {
    await EmailDelivery.create({
      public_id: input.publicId,
      user_id: input.userId,
      kind: input.kind,
      idempotency_key: input.idempotencyKey,
      encrypted_payload: input.encryptedPayload,
      available_at: input.availableAt,
    });
  }

  async claim(limit: number, now: Date, maxAttempts: number) {
    const result: EmailWork[] = [];
    await db.transaction(async (transaction) => {
      const rows = await EmailDelivery.findAll({
        where: {
          status: { [Op.in]: ['PENDING', 'FAILED'] },
          attempts: { [Op.lt]: maxAttempts },
          available_at: { [Op.lte]: now },
          [Op.or]: [{ locked_at: null }, { locked_at: { [Op.lt]: new Date(now.getTime() - 5 * 60_000) } }],
        },
        limit,
        order: [['available_at', 'ASC'], ['id', 'ASC']],
        transaction,
        lock: transaction.LOCK.UPDATE,
        skipLocked: true,
      });
      for (const row of rows) {
        await row.update({ locked_at: now }, { transaction });
        result.push({ id: row.id, kind: row.kind, idempotencyKey: row.idempotency_key, encryptedPayload: row.encrypted_payload, attempts: row.attempts, lockedAt: now });
      }
    });
    return result;
  }

  async complete(work: EmailWork, messageId: string | null, now: Date) {
    await EmailDelivery.update({
      status: 'SENT',
      attempts: work.attempts + 1,
      locked_at: null,
      sent_at: now,
      provider_message_id: messageId,
      last_error_code: null,
      encrypted_payload: '',
    }, { where: { id: work.id, locked_at: work.lockedAt } });
  }

  async fail(work: EmailWork, code: string, retryAt: Date) {
    await EmailDelivery.update({
      status: 'FAILED',
      attempts: work.attempts + 1,
      locked_at: null,
      available_at: retryAt,
      last_error_code: code,
    }, { where: { id: work.id, locked_at: work.lockedAt } });
  }
}
