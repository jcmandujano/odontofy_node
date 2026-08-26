import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import YAML from 'yamljs';

const apiRoot = process.cwd();
const uiRoot = path.resolve(apiRoot, process.argv[2] ?? '../odontofy_UI');
const servicesRoot = path.join(uiRoot, 'src', 'app', 'core');
const openApiPath = path.join(apiRoot, 'src', 'docs', 'openapi-v1.yaml');
const methods = new Set(['get', 'post', 'put', 'patch', 'delete']);
const calls = [];
const errors = [];

if (!fs.existsSync(servicesRoot)) {
  console.error(`Angular source was not found at ${servicesRoot}`);
  process.exit(1);
}

const sourceFiles = (directory) => fs.readdirSync(directory, { withFileTypes: true })
  .flatMap((entry) => {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) return sourceFiles(target);
    return entry.isFile() && entry.name.endsWith('.ts') && !entry.name.endsWith('.spec.ts')
      ? [target]
      : [];
  });

const templatePath = (node, sourceFile) => {
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return node.text;
  if (!ts.isTemplateExpression(node)) return null;

  let value = node.head.text;
  for (const span of node.templateSpans) {
    const expression = span.expression.getText(sourceFile);
    value += expression === 'environment.API_URL' ? '' : '{value}';
    value += span.literal.text;
  }
  return value;
};

for (const file of sourceFiles(servicesRoot)) {
  const relativeFile = path.relative(uiRoot, file).split(path.sep).join('/');
  const sourceFile = ts.createSourceFile(
    file,
    fs.readFileSync(file, 'utf8'),
    ts.ScriptTarget.Latest,
    true,
  );

  const inspect = (node) => {
    if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)) {
      const method = node.expression.name.text.toLowerCase();
      const isApiBoundary = (
        relativeFile.includes('/services/')
        && !relativeFile.endsWith('/api.service.ts')
      ) || relativeFile.includes('/interceptors/');
      if (methods.has(method) && isApiBoundary && node.arguments[0]) {
        const requestPath = templatePath(node.arguments[0], sourceFile);
        if (requestPath?.startsWith('/')) {
          const { line } = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
          calls.push({ method, path: `/api/v1${requestPath}`, file: relativeFile, line: line + 1 });
        }
      }
    }
    ts.forEachChild(node, inspect);
  };

  inspect(sourceFile);
}

const contract = YAML.load(openApiPath);
const canonical = (value) => value.replace(/\{[^}]+\}/g, '{}');
const serverBase = String(contract.servers?.[0]?.url ?? '').replace(/\/$/, '');
const operations = new Set(
  Object.entries(contract.paths ?? {}).flatMap(([requestPath, definition]) =>
    Object.keys(definition)
      .filter((method) => methods.has(method.toLowerCase()))
      .map((method) => `${method.toLowerCase()} ${canonical(`${serverBase}${requestPath}`)}`),
  ),
);

for (const call of calls) {
  const operation = `${call.method} ${canonical(call.path)}`;
  if (!operations.has(operation)) {
    errors.push(`${call.file}:${call.line} ${call.method.toUpperCase()} ${call.path}`);
  }
}

if (calls.length === 0) errors.push('No Angular API calls were discovered');

if (errors.length > 0) {
  console.error('Angular calls missing from OpenAPI:\n');
  errors.forEach((error) => console.error(`- ${error}`));
  process.exitCode = 1;
} else {
  console.log(`Angular contract is valid: ${calls.length} calls match OpenAPI.`);
}
