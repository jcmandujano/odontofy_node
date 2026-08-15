import 'dotenv/config';

import { Server } from 'http';
import { Sequelize } from 'sequelize';

import { createApp } from './app';
import db from './db/connection';
import { applicationLogger } from './platform/http/logger';

export const stopServer = async (
  server: Pick<Server, 'close'>,
  database: Pick<Sequelize, 'close'> = db
): Promise<void> => {
  await new Promise<void>((resolve, reject) => {
    server.close((error?: Error) => {
      if (error) reject(error);
      else resolve();
    });
  });
  await database.close();
};

export const startServer = async (): Promise<Server> => {
  await db.authenticate();

  const app = createApp();
  const port = process.env.PORT || '8000';

  const server = await new Promise<Server>((resolve, reject) => {
    const listeningServer = app.listen(port, (error?: Error) => {
      if (error) reject(error);
      else resolve(listeningServer);
    });
  });

  let shutdownPromise: Promise<void> | undefined;
  const shutdown = (signal: NodeJS.Signals): void => {
    if (shutdownPromise) return;

    applicationLogger.info({ signal }, 'Stopping HTTP server');
    shutdownPromise = stopServer(server).catch((error: unknown) => {
      applicationLogger.error({ err: error }, 'Graceful shutdown failed');
      process.exitCode = 1;
    });
  };

  process.once('SIGTERM', shutdown);
  process.once('SIGINT', shutdown);
  applicationLogger.info({ port }, 'HTTP server listening');

  return server;
};

if (require.main === module) {
  startServer().catch((error: unknown) => {
    applicationLogger.fatal({ err: error }, 'No fue posible iniciar el servidor');
    process.exitCode = 1;
  });
}
