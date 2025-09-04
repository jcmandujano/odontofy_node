export const accountActivatedTemplate = (name: string) => `
  <html>
<head>
    <title>Cuenta Verificada</title>
    <style>
        body {
            background-color: #f4f6f9;
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 0;
            color: #333;
        }

        .content {
            position: absolute;
            left: 50%;
            top: 50%;
            transform: translate(-50%, -50%);
            text-align: center;
            background: white;
            padding: 40px;
            border-radius: 15px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.1);
            width: 350px;
        }

        .content img {
            max-width: 120px;
            margin-bottom: 20px;
        }

        h1 {
            color: #407DDA;
            font-size: 24px;
            margin-bottom: 15px;
        }

        p {
            font-size: 16px;
            margin-bottom: 30px;
        }

        .button {
            background-color: #407DDA;
            color: white;
            border: none;
            padding: 10px 25px;
            border-radius: 25px;
            font-size: 16px;
            cursor: pointer;
            margin: 5px;
            text-decoration: none;
            display: inline-block;
        }

        .button:hover {
            background-color: #305FA6;
        }

        .content_legal {
            margin-top: 20px;
            font-size: 14px;
        }

        .content_legal a {
            color: #407DDA;
            text-decoration: none;
            margin: 0 5px;
        }

        .content_legal a:hover {
            text-decoration: underline;
        }
    </style>
</head>
<body>
    <section class="content">
        <img src="${process.env.FRONTEND_URL}/img/logo.png" alt="Logo">
        <h1>¡Cuenta Verificada!</h1>
        <p>${name}, tu cuenta ha sido verificada exitosamente.  
        Ahora puedes iniciar sesión y comenzar a usar la plataforma.</p>
        
        <div>
            <a href="http://localhost:4200/login" class="button">Iniciar Sesión</a>
        </div>

        <div class="content_legal">
            <a href="/terminos" target="_blank">Términos y condiciones</a> | 
            <a href="/privacidad" target="_blank">Aviso de privacidad</a>
        </div>
    </section>
</body>
</html>

`;