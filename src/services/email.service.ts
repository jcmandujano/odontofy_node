import type { EmailKind } from '../models/email-delivery.model';
import { EmailOutboxService } from '../modules/email/email.service';

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  kind?: EmailKind;
  userId?: number | null;
}

const outbox = new EmailOutboxService();

/** @deprecated Use a domain mailer backed by EmailOutboxService. */
export const sendEmail = async ({ to, subject, html, kind = 'ACCOUNT_VERIFICATION', userId = null }: SendEmailOptions) => {
  await outbox.enqueue(userId, kind, { to, subject, html });
};
