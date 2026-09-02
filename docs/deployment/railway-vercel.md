# Despliegue de produccion: Railway + Vercel

La UI publica conserva `API_URL: '/api/v1'`. Vercel debe hacer un *rewrite*
interno hacia la API; no se debe sustituir por un redirect. Asi el navegador
mantiene el mismo origen de la UI y la cookie refresh `HttpOnly; Secure;
SameSite=Strict` sigue siendo valida.

## 1. Base de datos y API en Railway

1. Cree un servicio MySQL administrado y un servicio de la API desde este
   repositorio. Conecte ambos mediante las variables de referencia de Railway;
   no use la IP publica de MySQL ni copie una contraseña a un archivo.
2. En la API, configure `NODE_ENV=production`; Railway inyecta `PORT`. Configure
   tambien las cinco variables `MYSQLHOST`, `MYSQLPORT`,
   `MYSQLDATABASE`, `MYSQLUSER` y `MYSQLPASSWORD` desde el servicio MySQL.
3. Configure los valores de aplicacion: `JWT_SECRET` (minimo 32 bytes),
   `JWT_ISSUER`, `JWT_AUDIENCE`, `CALENDAR_TOKEN_ENCRYPTION_KEY`,
   `EMAIL_PAYLOAD_ENCRYPTION_KEY`, `GOOGLE_CLIENT_ID`,
   `GOOGLE_CLIENT_SECRET`, `GCS_BUCKET_NAME`, `BREVO_API_KEY`,
   `BREVO_FROM_EMAIL` y `BREVO_FROM_NAME`. Las dos claves de cifrado y el JWT
   deben ser distintos. Mantengalos como variables sensibles de Railway.
4. Configure `FRONTEND_URL` con la URL canonica HTTPS de Vercel y
   `BACKEND_URL` con la URL publica HTTPS de Railway. Configure tambien
   `GOOGLE_REDIRECT_URI=${BACKEND_URL}/api/v1/calendar/google/callback`.
5. Para el primer despliegue, establezca
   `ALLOW_PRODUCTION_MIGRATIONS=true`. `railway.json` ejecuta las migraciones
   antes de iniciar la API y bloquea la activacion hasta que
   `/api/v1/health/ready` responda 200. Quite esa variable despues de validar
   el despliegue; vuelva a habilitarla solo en un cambio controlado que incluya
   migraciones.

`railway.json` es configuracion de despliegue, no contiene secretos. El
comando de migracion se niega a operar en produccion sin el opt-in anterior.

## 2. Conectar Vercel

En el proyecto Vercel de la UI, cree `ODONTOFY_API_ORIGIN` para Production
(y para Preview si se prueba contra una API de staging). Su valor es solamente
el origen publico de la API, por ejemplo `https://api.example.com`, sin
`/api/v1` ni slash final. No es un secreto.

El archivo `vercel.ts` genera el rewrite:

`/api/v1/:path*` -> `${ODONTOFY_API_ORIGIN}/api/v1/:path*`

Vercel debe redeplegarse una vez guardada la variable. No configure
`ODONTOFY_API_ORIGIN` con la antigua URL inactiva de Railway.

## 3. CORS y cookies

Con el rewrite, las llamadas del navegador son same-origin. Conserve
`CORS_ORIGINS` limitado a la URL canonica de Vercel (separada por comas si hay
un origen de preview controlado); nunca use `*` porque la UI usa
`withCredentials`.

La API ya envía la refresh cookie como `HttpOnly`, `Secure` en produccion,
`SameSite=Strict` y limitada a `/api/v1/auth`. No cambie a `SameSite=None`
mientras se use el proxy; hacerlo ampliaria innecesariamente su alcance.

## 4. Validacion y rollback

1. Confirme `GET https://<api>/api/v1/health/ready` = 200.
2. Abra la URL de Vercel y confirme `GET /api/v1/health/ready` = 200 sin que
   cambie la URL del navegador.
3. Registre una cuenta de prueba, confirme correo, inicie sesion, recargue la
   pagina y compruebe que `/auth/refresh` conserva la sesion. Luego cierre
   sesion y compruebe que el cookie se elimina.
4. Pruebe un upload, un archivo firmado, el envio de correo y OAuth de Google
   solo con cuentas de prueba. Verifique que Brevo no este en sandbox antes de
   enviar correo real.
5. Antes de promover datos reales, complete los bloqueos de
   `docs/architecture/production-readiness.md`: backup/restauracion,
   observabilidad, privacidad, antivirus/CDR y el worker programado de
   Calendar.

Si falla el smoke test, revierta la API al ultimo deployment sano en Railway y
la UI al ultimo deployment sano en Vercel. No ejecute migraciones destructivas
como mecanismo de rollback; prepare una migracion compensatoria y restaure una
copia verificada si fuera necesario.
