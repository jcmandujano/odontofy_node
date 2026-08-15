import db from '../../src/db/connection';

export default async function teardown(): Promise<void> {
  await db.close();
}
