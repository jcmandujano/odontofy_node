const dotenv = require('dotenv');

dotenv.config();

const requestedEnvironment = (() => {
  const envArgument = process.argv.indexOf('--env');
  if (envArgument >= 0) return process.argv[envArgument + 1];
  return process.env.NODE_ENV || 'development';
})();

const createConfig = (environment) => {
  const isTest = environment === 'test';
  const prefix = isTest ? 'MYSQL_TEST_' : 'MYSQL';

  return {
    username: process.env[`${prefix}USER`] || 'odontofy_local',
    password: process.env[`${prefix}PASSWORD`] || 'local-password',
    database:
      process.env[`${prefix}DATABASE`] ||
      (isTest ? 'odontofy_test' : 'odontofy_dev'),
    host: process.env[`${prefix}HOST`] || '127.0.0.1',
    port: Number(process.env[`${prefix}PORT`] || 3307),
    dialect: 'mysql',
    logging: false,
    timezone: '+00:00',
    migrationStorageTableName: 'sequelize_meta',
    seederStorage: 'sequelize',
    seederStorageTableName: 'sequelize_seed_meta',
  };
};

const configurations = {
  development: createConfig('development'),
  test: createConfig('test'),
  production: createConfig('production'),
};

if (!Object.hasOwn(configurations, requestedEnvironment)) {
  throw new Error(`Database environment "${requestedEnvironment}" is not allowed`);
}

const expectedSuffix = requestedEnvironment === 'test' ? '_test' : '_dev';
const selectedDatabase = configurations[requestedEnvironment].database;

if (
  requestedEnvironment !== 'production' &&
  (!selectedDatabase.startsWith('odontofy_') || !selectedDatabase.endsWith(expectedSuffix))
) {
  throw new Error(
    `Refusing database operation on "${selectedDatabase}". ` +
      `Expected an odontofy database ending in "${expectedSuffix}".`
  );
}

if (
  requestedEnvironment === 'production' &&
  process.env.ALLOW_PRODUCTION_MIGRATIONS !== 'true'
) {
  throw new Error(
    'Refusing production database operation. Set ALLOW_PRODUCTION_MIGRATIONS=true for a controlled deployment.'
  );
}

module.exports = configurations;
