export const resetPasswordTemplate = (name: string, resetUrl: string) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">

  <!-- Google Fonts (para clientes que lo soportan) -->
  <link href="https://fonts.googleapis.com/css2?family=Roboto+Condensed:wght@400;700&display=swap" rel="stylesheet">

  <style>
    body, table, td, p, a, h1, h2, h3, h4, h5, h6 {
      font-family: 'Roboto Condensed', Arial, sans-serif !important;
    }
  </style>
</head>

<body style="margin:0; padding:0; background-color:#e0e0e0; font-family: 'Roboto Condensed', Arial, sans-serif;">
  <!-- Tabla principal que ocupa toda la pantalla -->
  <table width="100%" height="100%" border="0" cellspacing="0" cellpadding="0" style="background-color:#e0e0e0; min-height:100vh;">
    <tr>
      <td align="center" valign="middle">
        
        <!-- Contenedor blanco centrado -->
        <table width="650" border="0" cellspacing="0" cellpadding="0" style="background-color:#ffffff; border-radius:8px;">
          <tr>
            <td style="padding:40px; text-align:center; font-family: 'Roboto Condensed', Arial, sans-serif; color:#333;">
              <!-- Contenido -->
              <img src="${process.env.BACKEND_URL}/img/logo.png" width="150" alt="Logo" style="margin-bottom:20px; display:block; margin-left:auto; margin-right:auto;">
              <h1 style="color:#6ca6fe; font-weight:700; margin:0; margin-bottom:20px;">Forgot your password?</h1>
              
              <p style="color:#6ca6fe; font-size:16px; margin:0; margin-bottom:20px;">
                We received a request to reset your password.<br>
                If you didn’t make this request, simply ignore this email.
              </p>
              
              <a href="${resetUrl}" target="_blank"
                 style="display:inline-block; margin-top:20px; background:#6ca6fe; color:#fff; text-decoration:none; 
                        padding:12px 30px; font-size:14px; border-radius:4px; font-weight:700;">
                RESET MY PASSWORD
              </a>
              
              <p style="color:#6ca6fe; font-size:12px; margin-top:30px;">
                If you didn't request to change your password, you don't have to do anything.
              </p>
            </td>
          </tr>
        </table>
        
      </td>
    </tr>
  </table>
</body>
</html>
`;