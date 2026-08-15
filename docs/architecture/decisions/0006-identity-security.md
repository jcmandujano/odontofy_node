# ADR-0006: Identidad, access tokens y sesiones refresh

- Estado: Accepted
- Fecha: 2026-08-15

## Contexto

La autenticacion legacy mezcla Express, Sequelize, cookies, email y criptografia
en controllers y services compartidos. F4 necesita una frontera reutilizable para
los modulos v1 y debe preservar las rutas legacy hasta que Angular sea migrado.

## Decision

- `identity` es un modulo vertical con schemas, adaptadores HTTP, casos de uso y
  un repositorio Sequelize. Los controllers no acceden a modelos directamente.
- Los access tokens son JWT HS256 de diez minutos. La verificacion fija algoritmo,
  tipo `at+jwt`, issuer y audience, y exige subject numerico, expiracion, `jti` y
  `authVersion`. La clave simetrica requiere al menos 32 bytes.
- El refresh token es opaco, aleatorio y solo se guarda como SHA-256. Se entrega
  en una cookie HttpOnly, SameSite Strict, Secure en production y limitada a
  `/api/v1/auth`.
- Cada refresh rota dentro de una transaccion con lock. La fila usada se conserva;
  si vuelve a presentarse, se revocan todas las sesiones de su familia.
- Password reset incrementa `users.auth_version` y revoca sesiones refresh en la
  misma transaccion. Esto invalida de inmediato access tokens anteriores.
- Bcrypt se mantiene para compatibilidad, de forma asincrona, con costo de 10 a 15
  y entradas de hasta 72 bytes. No se imponen reglas de composicion arbitrarias.
- Registro, reenvio de activacion y recuperacion usan tokens aleatorios de un solo
  uso, almacenados como hash y con expiracion. Las respuestas no confirman si un
  correo existe.
- El access token se devuelve en JSON para uso en memoria por Angular. El refresh
  token nunca queda accesible a JavaScript. Las respuestas identity usan
  `Cache-Control: no-store`.

## Consecuencias

- Las rutas v1 dependen de MySQL para confirmar que el usuario sigue activo y que
  `authVersion` coincide; se privilegia revocacion sobre una validacion sin estado.
- Logout no mantiene una denylist de access tokens: su exposicion maxima es diez
  minutos. Password reset si revoca access tokens mediante la version del usuario.
- El rate limiter en memoria funciona para una instancia. Se puede conectar un
  store compartido sin cambiar los endpoints al escalar horizontalmente.
- El correo permanece detras de una interfaz y las pruebas usan un adaptador en
  memoria; una cola transaccional puede incorporarse sin cambiar los casos de uso.

## Referencias

- JWT Best Current Practices: https://www.rfc-editor.org/rfc/rfc8725.html
- OAuth 2.0 Security BCP: https://www.rfc-editor.org/rfc/rfc9700.html
- OWASP Authentication: https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html
- OWASP Session Management: https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html
- OWASP Password Storage: https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html
- OWASP Forgot Password: https://cheatsheetseries.owasp.org/cheatsheets/Forgot_Password_Cheat_Sheet.html
