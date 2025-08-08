export const welcomeTemplate = (name: string) => `
  <div style="font-family: sans-serif; padding: 20px;">
    <h2>¡Bienvenido a Odontofy, ${name}!</h2>
    <p>Tu cuenta ha sido creada exitosamente.</p>
    <p>Estamos encantados de tenerte como usuario.</p>
    <p>— El equipo de Odontofy</p>
  </div>
`;

export const welcomeFullTemplate = (name: string, plan: string, contractLink: string, termsLink: string) => `
  <div style="font-family: sans-serif; padding: 20px;">
    <h2>Bienvenido oficialmente a Odontofy, ${name}</h2>
    <p>Tu cuenta ha sido activada correctamente. A continuación, te compartimos la información de tu cuenta:</p>
    <ul>
      <li><strong>Plan contratado:</strong> ${plan}</li>
      <li><strong>Contrato de confidencialidad:</strong> <a href="${contractLink}">Ver documento</a></li>
      <li><strong>Términos y condiciones:</strong> <a href="${termsLink}">Ver términos</a></li>
    </ul>
    <p>Si tienes dudas, puedes responder a este correo o contactarnos desde la app.</p>
    <p>— El equipo de Odontofy</p>
  </div>
`;