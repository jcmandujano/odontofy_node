import express from 'express';
import pino from 'pino';
import request from 'supertest';
import { z } from 'zod';
import { describe, expect, it, vi } from 'vitest';

import { createApp } from '../src/app';
import { apiErrorHandler } from '../src/platform/http/error.middleware';
import { attachRequestContext } from '../src/platform/http/request-context.middleware';
import { createRequestLogger } from '../src/platform/http/logger';
import { sendSuccess } from '../src/platform/http/response';
import { validateRequest } from '../src/platform/http/validate.middleware';
import { stopServer } from '../src/server';

const silentLogger = pino({ level: 'silent' });

const testApp = (readinessCheck: () => Promise<void> = async () => undefined) =>
  createApp({ logger: silentLogger, readinessCheck });

describe('API v1 HTTP platform', () => {
  it('returns the v1 envelope and correlates a generated request ID', async () => {
    const response = await request(testApp()).get('/api/v1');

    expect(response.status).toBe(200);
    expect(response.headers['x-request-id']).toBeTypeOf('string');
    expect(response.body).toMatchObject({
      success: true,
      message: 'Odontofy API v1',
      data: { version: 'v1' },
      errors: null,
      requestId: response.headers['x-request-id'],
    });
  });

  it('reuses a valid incoming request ID and replaces an invalid one', async () => {
    const accepted = await request(testApp())
      .get('/api/v1/health/live')
      .set('X-Request-Id', 'frontend:request-123');
    const replaced = await request(testApp())
      .get('/api/v1/health/live')
      .set('X-Request-Id', 'invalid request id');

    expect(accepted.headers['x-request-id']).toBe('frontend:request-123');
    expect(accepted.body.requestId).toBe('frontend:request-123');
    expect(replaced.headers['x-request-id']).not.toBe('invalid request id');
    expect(replaced.body.requestId).toBe(replaced.headers['x-request-id']);
  });

  it('separates liveness from readiness and reports dependency failures', async () => {
    const readinessCheck = vi.fn().mockRejectedValue(new Error('database secret'));
    const app = testApp(readinessCheck);

    const live = await request(app).get('/api/v1/health/live');
    const ready = await request(app).get('/api/v1/health/ready');

    expect(live.status).toBe(200);
    expect(readinessCheck).toHaveBeenCalledTimes(1);
    expect(ready.status).toBe(503);
    expect(ready.body).toMatchObject({
      success: false,
      data: null,
      errors: [{ code: 'SERVICE_UNAVAILABLE', details: null }],
      requestId: ready.headers['x-request-id'],
    });
    expect(JSON.stringify(ready.body)).not.toContain('database secret');
  });

  it('returns stable v1 errors for unknown routes and malformed JSON', async () => {
    const app = testApp();
    const missing = await request(app).get('/api/v1/missing');
    const malformed = await request(app)
      .post('/api/v1/missing')
      .set('Content-Type', 'application/json')
      .send('{');

    expect(missing.status).toBe(404);
    expect(missing.body.errors[0].code).toBe('ROUTE_NOT_FOUND');
    expect(malformed.status).toBe(400);
    expect(malformed.body.errors[0].code).toBe('MALFORMED_JSON');
  });

  it('rejects unknown properties through reusable strict Zod validation', async () => {
    const app = express();
    app.use(createRequestLogger(silentLogger));
    app.use(attachRequestContext);
    app.use(express.json());
    app.post(
      '/test',
      validateRequest({ body: z.strictObject({ name: z.string() }) }),
      (req, res) => sendSuccess(req, res, req.validated?.body)
    );
    app.use(apiErrorHandler);

    const response = await request(app)
      .post('/test')
      .send({ name: 'Ada', unexpected: true });

    expect(response.status).toBe(400);
    expect(response.body.errors[0].code).toBe('VALIDATION_ERROR');
    expect(response.body.errors[0].details[0]).toMatchObject({
      code: 'unrecognized_keys',
    });
  });

  it('serves raw OpenAPI 3.1 and the v1 documentation UI', async () => {
    const app = testApp();
    const contract = await request(app).get('/api/v1/openapi.json');
    const docs = await request(app).get('/api-docs/v1/');

    expect(contract.status).toBe(200);
    expect(contract.body.openapi).toBe('3.1.1');
    expect(contract.body.paths).toHaveProperty('/health/ready');
    expect(docs.status).toBe(200);
    expect(docs.type).toMatch(/html/);
  });

  it('does not expose the legacy upload wildcard', async () => {
    const response = await request(testApp()).get(
      '/api/upload/storage/example-1.pdf'
    );

    expect(response.status).toBe(404);
  });

  it('closes the HTTP server before releasing the database connection', async () => {
    const events: string[] = [];
    const server = {
      close: (callback: (error?: Error) => void) => {
        events.push('http');
        callback();
        return server;
      },
    };
    const database = {
      close: async () => {
        events.push('database');
      },
    };

    await stopServer(server, database);

    expect(events).toEqual(['http', 'database']);
  });
});
