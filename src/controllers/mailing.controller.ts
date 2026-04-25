import { Request, Response } from 'express';
import { sendEmail } from '../services/email.service';
//import { welcomeTemplate } from '../utils/email-templates/welcome.template'; for now we dont need this template
import { accountConfirmationTemplate } from '../utils/email-templates/confirm-account.template';


export const sendWelcomeEmail = async (req: Request, res: Response) => {
    const { email, name } = req.body;

    try {
        await sendEmail({
            to: email,
            subject: 'Confirma tu cuenta en Odontofy',
            html: accountConfirmationTemplate(name, ''),
        });

        res.status(200).json({ ok: true, msg: 'Correo de confirmación enviado' });
    } catch (error) {
        console.error('Error al enviar el correo:', error);
        res.status(500).json({ ok: false, msg: 'Error al enviar el correo' });
    }
};
