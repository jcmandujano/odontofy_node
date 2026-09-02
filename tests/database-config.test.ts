import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const configPath = path.resolve(process.cwd(), 'database/config.js');

const loadConfig = (environment: string, database: string) =>
  spawnSync(process.execPath, [configPath, '--env', environment], {
    cwd: process.cwd(),
    encoding: 'utf8',
    env: {
      ...process.env,
      MYSQL_TEST_DATABASE: database,
      MYSQLDATABASE: database,
    },
  });

describe('database safety guard', () => {
  it('rejects a test database without the safe naming convention', () => {
    const result = loadConfig('test', 'odontofy_production');

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('Refusing database operation');
  });

  it('rejects production migrations without an explicit deployment opt-in', () => {
    const result = loadConfig('production', 'odontofy_production');

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('ALLOW_PRODUCTION_MIGRATIONS=true');
  });
});
