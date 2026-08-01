# Auth migration

1. Back up the database and apply `docs/db/202607-auth-hardening.sql` once.
2. Configure `SECRETORPRIVATEKEY`, `JWT_ISSUER`, `JWT_AUDIENCE`, `CORS_ORIGINS`, `FRONTEND_URL`, `BACKEND_URL`, `BCRYPT_ROUNDS=12`, and `NODE_ENV=production` in production.
3. Deploy API and UI together over HTTPS. The UI sends `withCredentials`; CORS must list the exact UI origin.
4. Existing password-reset and confirmation links are intentionally invalidated. Existing JWTs expire naturally within their former lifetime.

## API contract

- `POST /api/auth/login`: returns `data.user` and temporary compatibility `data.token`; also sets `odontofy_refresh` as an HttpOnly cookie.
- `POST /api/auth/refresh`: rotates the refresh token and returns a new short-lived access token.
- `POST /api/auth/logout`: revokes the current refresh token and clears its cookie.
- `GET|PUT /api/me`: authenticated profile endpoints.
- `GET /api/google/init`: authenticated; returns `data.url` to open in a popup.

`/api/users` is retired. The API never returns password hashes or OAuth credentials.
