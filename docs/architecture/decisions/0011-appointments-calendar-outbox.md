# ADR 0011: agenda local y sincronizacion durable de calendario

- Estado: aceptado
- Fecha: 2026-08-18

## Contexto

El controlador legacy mezclaba validacion HTTP, persistencia y llamadas a Google.
Una escritura local esperaba al proveedor, los errores se descartaban y los
eventos externos se convertian en instancias ficticias de `Appointment`. Los
access y refresh tokens se almacenaban sin cifrado en `users`, se solicitaba el
scope completo de Calendar y no existia PKCE, desconexion ni reintento durable.

Referencias oficiales consultadas:

- [OAuth 2.0 Security Best Current Practice, RFC 9700](https://www.rfc-editor.org/info/rfc9700/)
- [Google OAuth 2.0 para aplicaciones web](https://developers.google.com/identity/protocols/oauth2/web-server)
- [Google OAuth: practicas recomendadas](https://developers.google.com/identity/protocols/oauth2/resources/best-practices)
- [Google Calendar: scopes](https://developers.google.com/workspace/calendar/api/auth)
- [Google Calendar: crear eventos](https://developers.google.com/workspace/calendar/api/guides/create-events)
- [Google Calendar: errores y reintentos](https://developers.google.com/workspace/calendar/api/guides/errors)

## Decision

1. `appointments` es la fuente de verdad. Crear, modificar o cancelar una cita
   confirma su transaccion local sin depender de latencia o disponibilidad Google.
2. Una cita nueva exige un paciente propio, dos instantes RFC 3339 con offset,
   una zona IANA y `startsAt < endsAt`. No se prohiben traslapes porque el producto
   no ha definido esa regla.
3. Los estados son `SCHEDULED`, `CONFIRMED`, `COMPLETED`, `CANCELLED` y `NO_SHOW`.
   Cancelar es logico, irreversible e idempotente; v1 nunca borra la fila.
4. La misma transaccion de la cita crea o reemplaza un trabajo en
   `calendar_sync_jobs`. El proveedor se invoca despues, mediante `POST
   /calendar/sync`; una falla deja evidencia `FAILED` y un trabajo reintentable.
5. El ID de evento Google se deriva de usuario y cita. Repetir un insert ambiguo
   actualiza el mismo ID, evitando duplicados. Solo se envia el resumen `Cita
   Odontofy`, tiempos y metadatos privados tecnicos; no se exportan paciente,
   motivo ni nota clinica.
6. Los eventos externos no administrados se consultan en una ruta separada. No
   se persisten ni se representan como citas locales ficticias.
7. OAuth usa `state` aleatorio de un solo uso, PKCE S256 y el scope minimo
   `calendar.events`. El callback no registra query strings y responde HTML sin
   recursos externos ni referrer.
8. Solo se persiste el refresh token, cifrado con AES-256-GCM y una clave de
   ambiente versionable. Los access tokens viven en memoria del cliente OAuth.
9. Una conexion puede estar `ACTIVE`, `REAUTH_REQUIRED` o `DISCONNECTED`.
   Desconectar revoca en Google de forma best effort y siempre elimina la
   autoridad local.
10. Como todos los ambientes son de desarrollo y no existen datos reales, F9 no
    migra los tokens legacy. Elimina sus columnas y exige reconexion, evitando
    transportar secretos cuyo origen y exposicion no pueden garantizarse.
11. Las rutas legacy delegan al modulo F9 hasta F11 para no mantener un segundo
    motor de agenda o credenciales.

## Consecuencias

- Una caida Google no impide trabajar en la agenda y el estado de sincronizacion
  es visible y recuperable.
- El endpoint de sincronizacion es un procesador acotado adecuado al desarrollo
  actual. F12 puede moverlo a un worker programado conservando la misma outbox.
- La UI debe presentar eventos externos y citas locales como recursos distintos.
- Rotar la clave exige una operacion que descifre con la version anterior y
  vuelva a cifrar; F9 deja `token_key_version` preparado para ello.
- La integracion reduce exposicion de datos, pero la politica de privacidad y el
  consentimiento del usuario deben revisarse antes de produccion.
