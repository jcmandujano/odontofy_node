import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const root = process.cwd();
const sourceRoot = path.join(root, 'src');
const forbiddenLegacyDirectories = ['controllers', 'middlewares', 'routes', 'services'];
const allowedModuleDependencies = new Map([
  ['appointments', new Set(['identity'])],
  ['billing', new Set(['identity'])],
  ['clinical-records', new Set(['identity'])],
  ['consents', new Set(['files', 'identity'])],
  ['files', new Set(['identity'])],
  ['identity', new Set(['email'])],
  ['patients', new Set(['identity'])],
  ['treatment-plans', new Set(['identity'])],
]);
const errors = [];

const normalize = (value) => value.split(path.sep).join('/');
const relative = (value) => normalize(path.relative(root, value));

const sourceFiles = (directory) => fs.readdirSync(directory, { withFileTypes: true })
  .flatMap((entry) => {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) return sourceFiles(target);
    return entry.isFile() && entry.name.endsWith('.ts') ? [target] : [];
  });

const report = (file, node, message, sourceFile) => {
  const { line } = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
  errors.push(`${relative(file)}:${line + 1} ${message}`);
};

for (const directory of forbiddenLegacyDirectories) {
  const target = path.join(sourceRoot, directory);
  if (fs.existsSync(target)) errors.push(`src/${directory} must not be reintroduced`);
}

for (const file of sourceFiles(sourceRoot)) {
  const fileRelative = relative(file);
  const sourceFile = ts.createSourceFile(
    file,
    fs.readFileSync(file, 'utf8'),
    ts.ScriptTarget.Latest,
    true,
  );

  const currentModule = fileRelative.match(/^src\/modules\/([^/]+)\//)?.[1];
  const inspect = (node) => {
    const isImport = ts.isImportDeclaration(node) || ts.isExportDeclaration(node);
    if (isImport && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
      const specifier = node.moduleSpecifier.text;
      if (specifier.startsWith('.')) {
        const target = normalize(path.resolve(path.dirname(file), specifier));
        const targetRelative = normalize(path.relative(root, target));
        const targetModule = targetRelative.match(/^src\/modules\/([^/]+)\//)?.[1];

        if (
          currentModule
          && targetModule
          && currentModule !== targetModule
          && !allowedModuleDependencies.get(currentModule)?.has(targetModule)
        ) {
          report(file, node, `module '${currentModule}' may not depend on module '${targetModule}'`, sourceFile);
        }

        const persistenceImport = targetRelative.startsWith('src/models/') || targetRelative.startsWith('src/db/');
        if (currentModule && persistenceImport && !fileRelative.endsWith('.repository.ts')) {
          report(file, node, 'only repositories may import database connections or Sequelize models', sourceFile);
        }

        if (
          fileRelative.startsWith('src/platform/')
          && targetModule
          && fileRelative !== 'src/platform/http/v1.router.ts'
        ) {
          report(file, node, 'platform may import business modules only from v1.router.ts', sourceFile);
        }

        if (fileRelative.endsWith('.controller.ts') && targetRelative.endsWith('.repository')) {
          report(file, node, 'controllers must depend on services, not repositories', sourceFile);
        }
      }

      if (
        currentModule
        && !fileRelative.endsWith('.controller.ts')
        && !fileRelative.endsWith('.middleware.ts')
        && !fileRelative.endsWith('.router.ts')
        && !fileRelative.endsWith('.cookies.ts')
        && specifier === 'express'
      ) {
        report(file, node, 'Express types belong only to HTTP controllers and middleware', sourceFile);
      }

      if (
        currentModule
        && specifier === 'sequelize'
        && !fileRelative.endsWith('.repository.ts')
      ) {
        report(file, node, 'only repositories may import Sequelize', sourceFile);
      }
    }

    ts.forEachChild(node, inspect);
  };

  inspect(sourceFile);
}

if (errors.length > 0) {
  console.error('Architecture violations:\n');
  errors.forEach((error) => console.error(`- ${error}`));
  process.exitCode = 1;
} else {
  console.log('Architecture boundaries are valid.');
}
