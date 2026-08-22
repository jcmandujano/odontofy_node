import { randomUUID } from 'node:crypto';

import type { EmailKind } from '../../models/email-delivery.model';
import { AesGcmEmailPayloadCipher, EmailPayloadCipher } from './email.crypto';
import { BrevoEmailProvider, EmailPayload, EmailProvider } from './email.provider';
import { EmailRepository, SequelizeEmailRepository } from './email.repository';

export interface EmailOutboxDependencies {
  cipher?: EmailPayloadCipher;
  clock?: () => Date;
  provider?: EmailProvider;
  repository?: EmailRepository;
}

const configuredInteger = (name: string, fallback: number, min: number, max: number) => {
  const value = Number(process.env[name] ?? fallback);
  if (!Number.isInteger(value) || value < min || value > max) throw new Error(`${name}_INVALID`);
  return value;
};

export class EmailOutboxService {
  private readonly cipher: EmailPayloadCipher;
  private readonly clock: () => Date;
  private readonly provider: EmailProvider;
  private readonly repository: EmailRepository;

  constructor(dependencies: EmailOutboxDependencies = {}) {
    this.cipher = dependencies.cipher ?? new AesGcmEmailPayloadCipher();
    this.clock = dependencies.clock ?? (() => new Date());
    this.provider = dependencies.provider ?? new BrevoEmailProvider();
    this.repository = dependencies.repository ?? new SequelizeEmailRepository();
  }

  async enqueue(userId: number | null, kind: EmailKind, payload: EmailPayload) {
    const now = this.clock();
    await this.repository.enqueue({
      publicId: randomUUID(),
      userId,
      kind,
      idempotencyKey: randomUUID(),
      encryptedPayload: this.cipher.encrypt(JSON.stringify(payload)),
      availableAt: now,
    });
  }

  async process(limit = configuredInteger('EMAIL_WORKER_BATCH_SIZE', 25, 1, 100)) {
    const now = this.clock();
    const maxAttempts = configuredInteger('EMAIL_MAX_ATTEMPTS', 8, 1, 25);
    const work = await this.repository.claim(limit, now, maxAttempts);
    let sent = 0;
    let failed = 0;
    for (const item of work) {
      try {
        const payload = JSON.parse(this.cipher.decrypt(item.encryptedPayload)) as EmailPayload;
        const result = await this.provider.send(payload, item.idempotencyKey);
        await this.repository.complete(item, result.messageId, this.clock());
        sent += 1;
      } catch (error) {
        const code = this.errorCode(error);
        const delay = Math.min(60 * 60_000, 2 ** Math.min(item.attempts + 1, 12) * 1000 + Math.floor(Math.random() * 1000));
        await this.repository.fail(item, code, new Date(this.clock().getTime() + delay));
        failed += 1;
      }
    }
    return { claimed: work.length, sent, failed };
  }

  private errorCode(error: unknown) {
    const message = error instanceof Error ? error.message : '';
    if (message === 'EMAIL_PROVIDER_NOT_CONFIGURED') return message;
    if (message.startsWith('EMAIL_PAYLOAD_')) return 'EMAIL_PAYLOAD_INVALID';
    return 'EMAIL_PROVIDER_ERROR';
  }
}
