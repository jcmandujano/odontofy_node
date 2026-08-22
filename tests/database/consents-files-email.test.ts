import { randomBytes, randomUUID } from 'node:crypto';

import pino from 'pino';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createApp } from '../../src/app';
import db from '../../src/db/connection';
import EmailDelivery from '../../src/models/email-delivery.model';
import InformedConsent from '../../src/models/informed-consent.model';
import Patient from '../../src/models/patient.model';
import SignedConsent from '../../src/models/signed-consent.model';
import StoredFile from '../../src/models/stored-file.model';
import UserInformedConsent from '../../src/models/user-informed-consent.model';
import User from '../../src/models/user.model';
import { AesGcmEmailPayloadCipher } from '../../src/modules/email/email.crypto';
import type { EmailProvider } from '../../src/modules/email/email.provider';
import { EmailOutboxService } from '../../src/modules/email/email.service';
import type { FileStorageProvider } from '../../src/modules/files/file.provider';
import { JwtAccessTokenService } from '../../src/modules/identity/identity.tokens';

class MemoryFileProvider implements FileStorageProvider {
  readonly objects = new Map<string, Buffer>();
  bucketName() { return 'f10-test-private'; }
  async upload(key: string, content: Buffer) {
    if (this.objects.has(key)) throw new Error('duplicate');
    this.objects.set(key, content);
    return { generation: '1' };
  }
  async accessUrl(key: string, expiresAt: Date) { return `https://files.example.test/${key}?expires=${expiresAt.getTime()}`; }
  async delete(key: string) { this.objects.delete(key); }
}

class RecordingEmailProvider implements EmailProvider {
  fail = true;
  keys: string[] = [];
  async send(_payload: { to: string; subject: string; html: string }, key: string) {
    this.keys.push(key);
    if (this.fail) throw new Error('synthetic outage');
    return { messageId: 'brevo-test-message' };
  }
}

const originalEnvironment = { ...process.env };
const logger = pino({ level: 'silent' });
const files = new MemoryFileProvider();
let ownerA: User;
let ownerB: User;
let patientA: Patient;
let catalog: InformedConsent;
let tokenA: string;
let tokenB: string;
let app: ReturnType<typeof createApp>;
let templateId: number;
let signedConsentId: number;
let signedFileId: string;

const bearer = (token: string) => ({ Authorization: `Bearer ${token}` });
const owner = (suffix: string) => User.create({
  name: `Doctor ${suffix}`,
  middle_name: '',
  last_name: 'F10',
  date_of_birth: null,
  phone: '',
  avatar: '',
  email: `f10-${suffix}-${randomUUID()}@example.test`,
  password: 'unused-test-password-hash',
  status: true,
  auth_version: 0,
  show_finance_stats: false,
});

beforeAll(async () => {
  process.env.JWT_SECRET = 'f10-test-secret-with-at-least-32-bytes';
  process.env.JWT_ISSUER = 'odontofy-f10-test';
  process.env.JWT_AUDIENCE = 'odontofy-f10-client';
  process.env.EMAIL_PAYLOAD_ENCRYPTION_KEY = randomBytes(32).toString('base64');
  await db.authenticate();
  ownerA = await owner('a');
  ownerB = await owner('b');
  patientA = await Patient.create({ user_id: ownerA.id, name: 'Ada', middle_name: null, last_name: 'Lovelace', status: true, debt: 0 });
  catalog = await InformedConsent.create({ name: `Cirugia ${randomUUID()}`, description: 'Riesgos y beneficios' });
  const tokens = new JwtAccessTokenService();
  tokenA = tokens.issue(ownerA.id, 0);
  tokenB = tokens.issue(ownerB.id, 0);
  app = createApp({
    logger,
    readinessCheck: async () => undefined,
    files: { provider: files },
    consents: { files: { provider: files } },
  });
});

afterAll(async () => {
  if (ownerA) await EmailDelivery.destroy({ where: { user_id: ownerA.id } });
  if (ownerA) await SignedConsent.destroy({ where: { doctor_id: ownerA.id }, force: true });
  if (ownerA) await UserInformedConsent.destroy({ where: { user_id: ownerA.id }, force: true });
  if (ownerA) await StoredFile.destroy({ where: { user_id: ownerA.id }, force: true });
  if (catalog) await catalog.destroy();
  if (ownerA) await ownerA.destroy();
  if (ownerB) await ownerB.destroy();
  process.env = { ...originalEnvironment };
});

const uploadPdf = (token: string, purpose: string, name: string) => request(app)
  .post('/api/v1/files')
  .set(bearer(token))
  .field('purpose', purpose)
  .attach('file', Buffer.from('%PDF-1.7\nsynthetic test\n%%EOF'), { filename: name, contentType: 'application/pdf' });

describe('consents and private files v1', () => {
  it('rejects spoofed content and enforces opaque owner-scoped access', async () => {
    const spoofed = await request(app).post('/api/v1/files').set(bearer(tokenA))
      .field('purpose', 'CONSENT_TEMPLATE')
      .attach('file', Buffer.from('not a pdf'), { filename: 'fake.pdf', contentType: 'application/pdf' });
    const uploaded = await uploadPdf(tokenA, 'CONSENT_TEMPLATE', 'cirugia.pdf');
    const foreign = await request(app).get(`/api/v1/files/${uploaded.body.data.id}/access`).set(bearer(tokenB));
    expect(spoofed.status).toBe(400);
    expect(uploaded.status).toBe(201);
    expect(uploaded.body.data.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(uploaded.body.data).not.toHaveProperty('objectKey');
    expect(foreign.status).toBe(404);

    const template = await request(app).post('/api/v1/consent-templates/from-catalog').set(bearer(tokenA)).send({
      catalogId: catalog.id,
      templateFileId: uploaded.body.data.id,
    });
    expect(template.status).toBe(201);
    templateId = template.body.data.id;
    const hidden = await request(app).get(`/api/v1/consent-templates/${templateId}`).set(bearer(tokenB));
    expect(hidden.status).toBe(404);
  });

  it('preserves snapshots, attaches one signed scan and only allows voiding', async () => {
    const created = await request(app).post(`/api/v1/patients/${patientA.id}/signed-consents`).set(bearer(tokenA)).send({
      templateId,
      signedAt: '2026-08-20T10:00:00-06:00',
      signedDocumentFileId: null,
      signatoryName: 'Ada Lovelace',
      signatoryCapacity: 'PATIENT',
    });
    expect(created.status).toBe(201);
    expect(created.body.data.status).toBe('PENDING_DOCUMENT');
    const originalName = created.body.data.template.name;
    signedConsentId = created.body.data.id;

    await request(app).patch(`/api/v1/consent-templates/${templateId}`).set(bearer(tokenA)).send({ name: 'Nombre corregido' });
    const signedFile = await uploadPdf(tokenA, 'SIGNED_CONSENT', 'firmado.pdf');
    signedFileId = signedFile.body.data.id;
    const attached = await request(app).put(`/api/v1/patients/${patientA.id}/signed-consents/${signedConsentId}/document`).set(bearer(tokenA)).send({ signedDocumentFileId: signedFileId });
    const repeated = await request(app).put(`/api/v1/patients/${patientA.id}/signed-consents/${signedConsentId}/document`).set(bearer(tokenA)).send({ signedDocumentFileId: signedFileId });
    const removeLinked = await request(app).delete(`/api/v1/files/${signedFileId}`).set(bearer(tokenA));
    expect(attached.status).toBe(200);
    expect(attached.body.data.status).toBe('COMPLETED');
    expect(attached.body.data.template.name).toBe(originalName);
    expect(repeated.status).toBe(409);
    expect(removeLinked.status).toBe(409);

    const voided = await request(app).post(`/api/v1/patients/${patientA.id}/signed-consents/${signedConsentId}/void`).set(bearer(tokenA)).send({ reason: 'Documento capturado por error' });
    expect(voided.body.data.status).toBe('VOIDED');
    const foreign = await request(app).get(`/api/v1/patients/${patientA.id}/signed-consents/${signedConsentId}`).set(bearer(tokenB));
    expect(foreign.status).toBe(404);
  });
});

describe('durable email delivery', () => {
  it('stores encrypted content and retries with the same provider idempotency key', async () => {
    let now = new Date('2026-08-22T18:00:00.000Z');
    const provider = new RecordingEmailProvider();
    const outbox = new EmailOutboxService({
      provider,
      cipher: new AesGcmEmailPayloadCipher(process.env.EMAIL_PAYLOAD_ENCRYPTION_KEY),
      clock: () => now,
    });
    await outbox.enqueue(ownerA.id, 'ACCOUNT_VERIFICATION', { to: ownerA.email, subject: 'Confirmar', html: '<p>private-token</p>' });
    const pending = await EmailDelivery.findOne({ where: { user_id: ownerA.id } });
    expect(pending?.encrypted_payload).not.toContain(ownerA.email);
    expect((await outbox.process()).failed).toBe(1);
    provider.fail = false;
    now = new Date(now.getTime() + 10_000);
    expect((await outbox.process()).sent).toBe(1);
    expect(provider.keys[0]).toBe(provider.keys[1]);
    await pending?.reload();
    expect(pending?.status).toBe('SENT');
    expect(pending?.encrypted_payload).toBe('');
  });
});
