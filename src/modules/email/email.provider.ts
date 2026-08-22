import * as Brevo from '@getbrevo/brevo';

export interface EmailPayload {
  to: string;
  subject: string;
  html: string;
}

export interface EmailProvider {
  send(payload: EmailPayload, idempotencyKey: string): Promise<{ messageId: string | null }>;
}

export class BrevoEmailProvider implements EmailProvider {
  async send(payload: EmailPayload, idempotencyKey: string) {
    const apiKey = process.env.BREVO_API_KEY;
    const senderEmail = process.env.BREVO_FROM_EMAIL;
    if (!apiKey || !senderEmail) throw new Error('EMAIL_PROVIDER_NOT_CONFIGURED');
    const client = new Brevo.TransactionalEmailsApi();
    client.setApiKey(Brevo.TransactionalEmailsApiApiKeys.apiKey, apiKey);
    try {
      const response = await client.sendTransacEmail({
        sender: { email: senderEmail, name: process.env.BREVO_FROM_NAME || 'Odontofy' },
        to: [{ email: payload.to }],
        subject: payload.subject,
        htmlContent: payload.html,
        headers: {
          idempotencyKey,
          ...(process.env.BREVO_SANDBOX === 'true' && { 'X-Sib-Sandbox': 'drop' }),
        },
      });
      return { messageId: response.body?.messageId ?? null };
    } catch (error) {
      if (this.errorCode(error) === 'duplicate_parameter') {
        return { messageId: null };
      }
      throw error;
    }
  }

  private errorCode(error: unknown): string | null {
    if (!error || typeof error !== 'object') return null;
    const direct = 'body' in error ? error.body : null;
    const nested = 'response' in error && error.response && typeof error.response === 'object' && 'body' in error.response
      ? error.response.body
      : null;
    for (const value of [direct, nested]) {
      if (value && typeof value === 'object' && 'code' in value && typeof value.code === 'string') return value.code;
    }
    return null;
  }
}
