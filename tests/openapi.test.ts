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
  });
});
