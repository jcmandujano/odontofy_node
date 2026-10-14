import request from 'supertest';
import { expect } from 'vitest';
import type { createApp } from '../../src/app';

export const createCatalogEntry = async (app: ReturnType<typeof createApp>, token: string, description: string, unitPrice: string) => {
  const response = await request(app).post('/api/v1/billing-concepts').set('Authorization', `Bearer ${token}`).send({ description, unitPrice });
  expect(response.status).toBe(201);
  return response.body.data.id as number;
};
