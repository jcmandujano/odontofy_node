import { EmailOutboxService } from '../email/email.service';
import { accountConfirmationTemplate } from '../../utils/email-templates/confirm-account.template';
import { resetPasswordTemplate } from '../../utils/email-templates/reset-password.template';
import { IdentityEmailSender, IdentityUser } from './identity.types';

const frontendUrl = (path: string): URL =>
  new URL(path, process.env.FRONTEND_URL || 'http://localhost:4200');

export class QueuedIdentityEmailSender implements IdentityEmailSender {
  constructor(private readonly outbox = new EmailOutboxService()) {}

  async sendAccountVerification(
    user: IdentityUser,
    token: string
  ): Promise<void> {
    const url = frontendUrl('/confirm-account');
    url.searchParams.set('userId', String(user.id));
    url.searchParams.set('token', token);

    await this.outbox.enqueue(user.id, 'ACCOUNT_VERIFICATION', {
      to: user.email,
      subject: 'Confirma tu cuenta en Odontofy',
      html: accountConfirmationTemplate(user.name, url.toString()),
    });
  }

  async sendPasswordReset(user: IdentityUser, token: string): Promise<void> {
    const url = frontendUrl('/reset-password');
    url.searchParams.set('token', token);

    await this.outbox.enqueue(user.id, 'PASSWORD_RESET', {
      to: user.email,
      subject: 'Restablece tu contrasena en Odontofy',
      html: resetPasswordTemplate(user.name, url.toString()),
    });
  }
}
