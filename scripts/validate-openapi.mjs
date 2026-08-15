import path from 'node:path';
import SwaggerParser from '@apidevtools/swagger-parser';

const contractPath = path.resolve(process.cwd(), 'src/docs/openapi-v1.yaml');

await SwaggerParser.validate(contractPath);
console.log(`OpenAPI contract is valid: ${contractPath}`);
