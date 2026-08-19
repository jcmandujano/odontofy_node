import SwaggerParser from '@apidevtools/swagger-parser';
import { describe, expect, it } from 'vitest';

import { openApiPath } from '../src/platform/http/openapi';

describe('OpenAPI v1 contract', () => {
  it('is a valid OpenAPI 3.1 document with the platform operations', async () => {
    const document = await SwaggerParser.validate(openApiPath);

    expect(document.openapi).toBe('3.1.1');
    expect(document.paths).toHaveProperty('/');
    expect(document.paths).toHaveProperty('/health/live');
    expect(document.paths).toHaveProperty('/health/ready');
    expect(document.paths).toHaveProperty('/openapi.json');
    expect(document.paths).toHaveProperty('/auth/login');
    expect(document.paths).toHaveProperty('/auth/refresh');
    expect(document.paths).toHaveProperty('/auth/password/reset');
    expect(document.paths).toHaveProperty('/me');
    expect(document.paths).toHaveProperty('/patients');
    expect(document.paths).toHaveProperty('/patients/{patientId}');
    expect(document.paths).toHaveProperty(
      '/patients/{patientId}/treatment-plans'
    );
    expect(document.paths).toHaveProperty('/treatment-plans/{treatmentPlanId}');
    expect(document.paths).toHaveProperty(
      '/treatment-plans/{treatmentPlanId}/items/{itemId}/status'
    );
    expect(document.paths).toHaveProperty(
      '/patients/{patientId}/medical-history/revisions'
    );
    expect(document.paths).toHaveProperty(
      '/patients/{patientId}/evolution-notes/{noteId}/revisions'
    );
    expect(document.paths).toHaveProperty(
      '/patients/{patientId}/evolution-notes/{noteId}/restore'
    );
    expect(document.paths).toHaveProperty('/billing-concepts');
    expect(document.paths).toHaveProperty('/billing/summary');
    expect(document.paths).toHaveProperty(
      '/patients/{patientId}/billing-records'
    );
    expect(document.paths).toHaveProperty(
      '/patients/{patientId}/billing-records/{billingRecordId}/revisions'
    );
    expect(document.components?.schemas).toHaveProperty(
      'PublicEvolutionNoteRevision'
    );
    expect(document.components?.schemas).toHaveProperty('BillingRevision');
  });
});
