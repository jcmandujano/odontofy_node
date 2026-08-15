import path from 'path';
import YAML from 'yamljs';

const openApiPath = path.resolve(process.cwd(), 'src/docs/openapi-v1.yaml');

export const loadOpenApiV1 = (): object => YAML.load(openApiPath) as object;

export { openApiPath };
