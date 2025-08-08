import sgMail from '@sendgrid/mail';

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
};
