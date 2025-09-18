/* import sgMail from '@sendgrid/mail';

sgMail.setApiKey(process.env.SENDGRID_API_KEY!);

interface SendEmailOptions {
    to: string;
    subject: string;
    html: string;
}

export const sendEmail = async ({ to, subject, html }: SendEmailOptions) => {
    const msg = {
        to,
        from: process.env.SENDGRID_FROM_EMAIL!, // no-reply@odontofy.com.mx
        subject,
        html,
    };

    return sgMail.send(msg);
}; */

import * as Brevo from "@getbrevo/brevo";

const brevoClient = new Brevo.TransactionalEmailsApi();

brevoClient.setApiKey(
    Brevo.TransactionalEmailsApiApiKeys.apiKey,
    process.env.BREVO_API_KEY!
);

interface SendEmailOptions {
    to: string;
    subject: string;
    html: string;
}

export const sendEmail = async ({ to, subject, html }: SendEmailOptions) => {
    const senderEmail = process.env.BREVO_FROM_EMAIL!;
    const senderName = process.env.BREVO_FROM_NAME || "Odontofy";

    const msg = {
        sender: { email: senderEmail, name: senderName },
        to: [{ email: to }],
        subject,
        htmlContent: html,
    };

    try {
        const response = await brevoClient.sendTransacEmail(msg);
        return response;
    } catch (error) {
        console.error("Error al enviar correo con Brevo:", error);
        throw error;
    }
};
