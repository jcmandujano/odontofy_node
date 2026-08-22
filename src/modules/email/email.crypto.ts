import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

export interface EmailPayloadCipher {
  encrypt(value: string): string;
  decrypt(value: string): string;
}

export class AesGcmEmailPayloadCipher implements EmailPayloadCipher {
  constructor(private readonly encodedKey = process.env.EMAIL_PAYLOAD_ENCRYPTION_KEY ?? '') {}

  encrypt(value: string): string {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.key(), iv);
    const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
    return ['v1', iv.toString('base64url'), cipher.getAuthTag().toString('base64url'), encrypted.toString('base64url')].join('.');
  }

  decrypt(payload: string): string {
    const [version, iv, tag, value, extra] = payload.split('.');
    if (version !== 'v1' || !iv || !tag || !value || extra) throw new Error('EMAIL_PAYLOAD_INVALID');
    const decipher = createDecipheriv('aes-256-gcm', this.key(), Buffer.from(iv, 'base64url'));
    decipher.setAuthTag(Buffer.from(tag, 'base64url'));
    return Buffer.concat([decipher.update(Buffer.from(value, 'base64url')), decipher.final()]).toString('utf8');
  }

  private key() {
    const key = Buffer.from(this.encodedKey, 'base64');
    if (key.length !== 32) throw new Error('EMAIL_PAYLOAD_ENCRYPTION_KEY_INVALID');
    return key;
  }
}
