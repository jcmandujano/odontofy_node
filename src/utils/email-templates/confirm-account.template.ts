export const accountConfirmationTemplate = (name: string, confirmationUrl: string) => `
  <div style="font-family: sans-serif; padding: 20px;">
    <h2>¡Hola, ${name}!</h2>
    <p>Gracias por registrarte en <strong>Odontofy</strong>.</p>
    <p>Por favor, confirma tu cuenta haciendo clic en el siguiente botón:</p>
    <a href="${confirmationUrl}" style="display:inline-block;padding:10px 20px;background-color:#0D47A1;color:#fff;text-decoration:none;border-radius:5px;">Confirmar cuenta</a>
    <p>Si no te registraste en nuestra plataforma, puedes ignorar este mensaje.</p>
    <p>— El equipo de Odontofy</p>
  </div>
`;