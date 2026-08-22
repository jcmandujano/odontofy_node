import { randomBytes } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import {
  createAppointmentSchema,
  listAppointmentsQuerySchema,
} from '../src/modules/appointments/appointment.schemas';
import { AesGcmTokenCipher } from '../src/modules/appointments/calendar.crypto';
import { deterministicGoogleEventId } from '../src/modules/appointments/calendar.provider';

describe('appointment contracts and calendar credentials', () => {
  it('rejects mass assignment, invalid ranges and ambiguous datetimes', () => {
    const valid = {
      patientId: 1,
      startsAt: '2026-08-20T10:00:00-06:00',
      endsAt: '2026-08-20T11:00:00-06:00',
      timeZone: 'America/Mexico_City',
    };

    expect(createAppointmentSchema.safeParse(valid).success).toBe(true);
    expect(createAppointmentSchema.safeParse({ ...valid, userId: 99 }).success).toBe(false);
    expect(createAppointmentSchema.safeParse({ ...valid, endsAt: valid.startsAt }).success).toBe(false);
    expect(
      createAppointmentSchema.safeParse({
        ...valid,
        startsAt: '2026-08-20T10:00:00-06:00',
        endsAt: '2026-08-20T12:00:00-03:00',
      }).success
    ).toBe(false);
    expect(createAppointmentSchema.safeParse({ ...valid, startsAt: '2026-08-20T10:00:00' }).success).toBe(false);
    expect(createAppointmentSchema.safeParse({ ...valid, timeZone: 'Mexico/Somewhere' }).success).toBe(false);
  });

  it('bounds agenda query ranges to one year', () => {
    expect(
      listAppointmentsQuerySchema.safeParse({
        from: '2026-01-01T00:00:00Z',
        to: '2027-02-01T00:00:00Z',
      }).success
    ).toBe(false);
  });

  it('encrypts refresh tokens with authenticated encryption', () => {
    const cipher = new AesGcmTokenCipher(randomBytes(32).toString('base64'));
    const encrypted = cipher.encrypt('refresh-token-value');

    expect(encrypted).not.toContain('refresh-token-value');
    expect(cipher.decrypt(encrypted)).toBe('refresh-token-value');
    expect(() => cipher.decrypt(`${encrypted.slice(0, -1)}x`)).toThrow();
  });

  it('generates stable provider-safe event identifiers', () => {
    const first = deterministicGoogleEventId(9, 42);
    expect(first).toBe(deterministicGoogleEventId(9, 42));
    expect(first).not.toBe(deterministicGoogleEventId(9, 43));
    expect(first).toMatch(/^[a-v0-9]+$/);
  });
});
