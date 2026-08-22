import { randomBytes } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import { AesGcmEmailPayloadCipher } from '../src/modules/email/email.crypto';
import type { EmailProvider } from '../src/modules/email/email.provider';
import type { EmailRepository, EmailWork } from '../src/modules/email/email.repository';
import { EmailOutboxService } from '../src/modules/email/email.service';
import { createSignedConsentSchema, updateConsentTemplateSchema } from '../src/modules/consents/consent.schemas';
import { FileService } from '../src/modules/files/file.service';

describe('F10 boundary validation', () => {
  it('rejects consent mass assignment and accepts the explicit physical-signature contract', () => {
    expect(updateConsentTemplateSchema.safeParse({ name: 'Cirugia', userId: 7 }).success).toBe(false);
    expect(createSignedConsentSchema.safeParse({
      templateId: 2,
      signedAt: '2026-08-22T10:00:00-06:00',
      signedDocumentFileId: null,
      signatoryName: 'Ada Lovelace',
      signatoryCapacity: 'PATIENT',
      doctorId: 99,
    }).success).toBe(false);
    expect(createSignedConsentSchema.safeParse({
      templateId: 2,
      signedAt: '2026-08-22T10:00:00-06:00',
      signedDocumentFileId: null,
      signatoryName: 'Ada Lovelace',
      signatoryCapacity: 'PATIENT',
    }).success).toBe(true);
  });

  it('does not trust a claimed PDF content type', async () => {
    const service = new FileService({ provider: {} as never, repository: {} as never });
    await expect(service.upload(1, 'SIGNED_CONSENT', {
      buffer: Buffer.from('plain text'),
      originalname: 'evidence.pdf',
      mimetype: 'application/pdf',
      size: 10,
    })).rejects.toMatchObject({ code: 'FILE_INVALID' });
  });
});

class MemoryEmailRepository implements EmailRepository {
  work: EmailWork | null = null;
  status = '';
  availableAt = new Date(0);

  async enqueue(input: { idempotencyKey: string; encryptedPayload: string; availableAt: Date }) {
    this.work = { id: 1, kind: 'ACCOUNT_VERIFICATION', idempotencyKey: input.idempotencyKey, encryptedPayload: input.encryptedPayload, attempts: 0, lockedAt: input.availableAt };
    this.availableAt = input.availableAt;
  }
  async claim(_limit: number, now: Date) {
    return this.work && this.availableAt <= now ? [this.work] : [];
  }
  async complete(work: EmailWork) {
    this.status = 'SENT';
    this.work = { ...work, attempts: work.attempts + 1 };
  }
  async fail(work: EmailWork, _code: string, retryAt: Date) {
    this.status = 'FAILED';
    this.work = { ...work, attempts: work.attempts + 1 };
    this.availableAt = retryAt;
  }
}

class FlakyEmailProvider implements EmailProvider {
  attempts: string[] = [];
  fail = true;
  async send(_payload: { to: string; subject: string; html: string }, idempotencyKey: string) {
    this.attempts.push(idempotencyKey);
    if (this.fail) throw new Error('provider down');
    return { messageId: 'message-1' };
  }
}

describe('email outbox', () => {
  it('encrypts pending content and keeps one idempotency key across retries', async () => {
    let now = new Date('2026-08-22T16:00:00.000Z');
    const repository = new MemoryEmailRepository();
    const provider = new FlakyEmailProvider();
    const cipher = new AesGcmEmailPayloadCipher(randomBytes(32).toString('base64'));
    const service = new EmailOutboxService({ cipher, provider, repository, clock: () => now });

    await service.enqueue(1, 'ACCOUNT_VERIFICATION', {
      to: 'private@example.test',
      subject: 'Confirm account',
      html: '<p>secret-token</p>',
    });
    expect(repository.work?.encryptedPayload).not.toContain('private@example.test');
    expect((await service.process()).failed).toBe(1);

    provider.fail = false;
    now = new Date(now.getTime() + 10_000);
    expect((await service.process()).sent).toBe(1);
    expect(provider.attempts).toHaveLength(2);
    expect(provider.attempts[0]).toBe(provider.attempts[1]);
    expect(repository.status).toBe('SENT');
  });
});
