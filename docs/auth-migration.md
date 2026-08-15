# Migracion de identidad API v1

F4 agrega identidad bajo `/api/v1` sin retirar `/api/auth` ni `/api/me`. Angular
seguira consumiendo legacy hasta F11 y migrara todos los endpoints de identidad en
un cambio coordinado.

## Configuracion

- `JWT_SECRET`: secreto v1 de al menos 32 bytes. `SECRETORPRIVATEKEY` permanece
  como fallback temporal para facilitar desarrollo y se retirara con legacy.
- `JWT_ISSUER` y `JWT_AUDIENCE`: valores esperados al emitir y verificar JWT.
- `JWT_ACCESS_TTL_SECONDS`: entre 60 y 3600; el valor recomendado es 600.
- `BCRYPT_ROUNDS`: entre 10 y 15; desarrollo y production usan 12 por defecto.
- `REFRESH_TOKEN_TTL_DAYS`: entre 1 y 90; el valor por defecto es 30.
- `FRONTEND_URL`: origen usado en enlaces de activacion y password reset.

No se requiere SQL manual. `users.auth_version` se crea mediante la migracion
`202608150001-add-user-auth-version.js`.

## Contrato v1

- `POST /api/v1/auth/login`, `/refresh`, `/logout`.
- `POST /api/v1/auth/register`.
- `POST /api/v1/auth/account-verification/request|confirm`.
- `POST /api/v1/auth/password/forgot|reset|verify`.
- `GET|PATCH /api/v1/me`.

El contrato completo esta en `src/docs/openapi-v1.yaml`. La cookie
`odontofy_refresh_v1` es HttpOnly, SameSite Strict y usa Secure en production. El
access token debe mantenerse solo en memoria y enviarse como `Authorization:
Bearer <token>`.
