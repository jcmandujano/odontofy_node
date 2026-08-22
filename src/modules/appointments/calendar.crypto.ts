import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

import { AppointmentError } from './appointment.types';

export interface TokenCipher {
  encrypt(value: string): string;
  decrypt(value: string): string;
}

export class AesGcmTokenCipher implements TokenCipher {
  private readonly encodedKey: string;

  constructor(encodedKey = process.env.CALENDAR_TOKEN_ENCRYPTION_KEY ?? '') {
    this.encodedKey = encodedKey;
  }

  private key(): Buffer {
    const key = Buffer.from(this.encodedKey, 'base64');
    if (key.length !== 32) {
      throw new AppointmentError(
        'CALENDAR_CONFIGURATION_INVALID',
        'CALENDAR_TOKEN_ENCRYPTION_KEY debe contener 32 bytes en base64'
      );
    }
    return key;
  }

  encrypt(value: string): string {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.key(), iv);
    const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
    return ['v1', iv.toString('base64url'), cipher.getAuthTag().toString('base64url'), encrypted.toString('base64url')].join('.');
  }

  decrypt(payload: string): string {
    const [version, encodedIv, encodedTag, encodedValue, extra] = payload.split('.');
    if (version !== 'v1' || !encodedIv || !encodedTag || !encodedValue || extra) {
      throw new AppointmentError('CALENDAR_CONFIGURATION_INVALID', 'Credencial de calendario invalida');
    }
    try {
      const decipher = createDecipheriv('aes-256-gcm', this.key(), Buffer.from(encodedIv, 'base64url'));
      decipher.setAuthTag(Buffer.from(encodedTag, 'base64url'));
      return Buffer.concat([
        decipher.update(Buffer.from(encodedValue, 'base64url')),
        decipher.final(),
      ]).toString('utf8');
    } catch {
      throw new AppointmentError('CALENDAR_CONFIGURATION_INVALID', 'No fue posible descifrar la credencial de calendario');
    }
  }
}
