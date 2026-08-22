import type { Logger } from 'pino';

import { applicationLogger } from '../../platform/http/logger';
import { EmailOutboxService } from './email.service';

export const startEmailWorker = (
  service = new EmailOutboxService(),
  logger: Logger = applicationLogger
): (() => void) => {
  const intervalMs = Number(process.env.EMAIL_WORKER_INTERVAL_MS ?? 30_000);
  let running = false;
  const run = async () => {
    if (running) return;
    running = true;
    try {
      const result = await service.process();
      if (result.claimed) logger.info(result, 'Email outbox processed');
    } catch (error) {
      logger.error({ err: error }, 'Email outbox processing failed');
    } finally {
      running = false;
    }
  };
  const timer = setInterval(() => void run(), intervalMs);
  timer.unref();
  void run();
  return () => clearInterval(timer);
};
