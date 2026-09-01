import { randomBytes } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import {
  calendarCallbackQuerySchema,
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

  it('excludes cancelled appointments from the agenda by default', () => {
    expect(
      listAppointmentsQuerySchema.parse({
        from: '2026-01-01T00:00:00Z',
        to: '2026-01-02T00:00:00Z',
      }).status
    ).toBe('active');
    expect(
      listAppointmentsQuerySchema.parse({
        from: '2026-01-01T00:00:00Z',
        to: '2026-01-02T00:00:00Z',
        status: 'all',
      }).status
    ).toBe('all');
  });

  it('accepts provider-added OAuth callback parameters', () => {
    expect(
      calendarCallbackQuerySchema.safeParse({
        code: 'authorization-code',
        state: 'a'.repeat(32),
        iss: 'https://accounts.google.com',
        scope: 'https://www.googleapis.com/auth/calendar',
        authuser: '0',
        prompt: 'consent',
      }).success
    ).toBe(true);
  });

  it('encrypts refresh tokens with authenticated encryption', () => {
    const cipher = new AesGcmTokenCipher(randomBytes(32).toString('base64'));
    const encrypted = cipher.encrypt('refresh-token-value');

    expect(encrypted).not.toContain('refresh-token-value');
    expect(cipher.decrypt(encrypted)).toBe('refresh-token-value');
    const parts = encrypted.split('.');
    parts[2] = `${parts[2][0] === 'A' ? 'B' : 'A'}${parts[2].slice(1)}`;
    expect(() => cipher.decrypt(parts.join('.'))).toThrow();
  });

  it('generates stable provider-safe event identifiers', () => {
    const first = deterministicGoogleEventId(9, 42);
    expect(first).toBe(deterministicGoogleEventId(9, 42));
    expect(first).not.toBe(deterministicGoogleEventId(9, 43));
    expect(first).toMatch(/^[a-v0-9]+$/);
  });
});
