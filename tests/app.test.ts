import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';

import { createApp } from '../src/app';
import db from '../src/db/connection';

describe('HTTP application', () => {
  it('can be created without opening a port or authenticating the database', () => {
    const authenticate = vi.spyOn(db, 'authenticate');
    const app = createApp();

    expect(app.listen).toBeTypeOf('function');
    expect(authenticate).not.toHaveBeenCalled();
    authenticate.mockRestore();
  });

  it('returns the v1 validation envelope for an invalid login request', async () => {
    const response = await request(createApp()).post('/api/v1/auth/login').send({});

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('errors');
    expect(response.body).toHaveProperty('requestId');
  });

  it('serves only the v1 Swagger UI entry point', async () => {
    const response = await request(createApp()).get('/api-docs/v1/');
    const legacy = await request(createApp()).get('/api-docs/');

    expect(response.status).toBe(200);
    expect(response.type).toMatch(/html/);
    expect(legacy.status).toBe(404);
  });

  it('does not expose legacy API routes', async () => {
    const response = await request(createApp()).post('/api/auth/login').send({});

    expect(response.status).toBe(404);
  });

  it('preserves the default 404 response for unknown routes', async () => {
    const response = await request(createApp()).get('/route-that-does-not-exist');

    expect(response.status).toBe(404);
  });
});
