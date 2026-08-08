import 'dotenv/config';

import { createApp } from './app';
import db from './db/connection';

const startServer = async (): Promise<void> => {
  await db.authenticate();

  const app = createApp();
  const port = process.env.PORT || '8000';

  app.listen(port, () => {
    console.log(`Servidor corriendo en ${port}`);
  });
};

startServer().catch((error: unknown) => {
  console.error('No fue posible iniciar el servidor', error);
  process.exitCode = 1;
});
