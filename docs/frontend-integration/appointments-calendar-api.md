# Integracion frontend: agenda y Google Calendar API v1

Base: `/api/v1`. Salvo el callback OAuth, todas las rutas requieren
`Authorization: Bearer <token>` y usan el envelope comun v1.

## Agenda local

- `GET /appointments?from=<RFC3339>&to=<RFC3339>` lista citas que intersectan el
  rango; admite `patientId`, `status`, `page` y `pageSize`.
- `POST /appointments` crea una cita con `patientId`, `startsAt`, `endsAt` y
  `timeZone`; `reason` y `note` son opcionales.
- `PATCH /appointments/{appointmentId}` modifica solo campos editables.
- `PATCH /appointments/{appointmentId}/status` recibe uno de `SCHEDULED`,
  `CONFIRMED`, `COMPLETED`, `CANCELLED` o `NO_SHOW`.
- `DELETE /appointments/{appointmentId}` cancela logicamente y devuelve la cita.

Los datetimes deben incluir offset y `timeZone` debe ser un identificador IANA.
No se debe inferir sincronizacion por la presencia de un ID externo: usar
`appointment.sync.status` (`NOT_CONNECTED`, `PENDING`, `SYNCED` o `FAILED`).

## Conexion Google

1. Consultar `GET /calendar/connection`.
2. Abrir en popup la URL retornada por `POST
   /calendar/connection/authorization`.
3. Escuchar `google_sync_success` o `google_sync_error` mediante `postMessage` y
   validar que `event.origin` coincida con el backend configurado.
4. Procesar pendientes con `POST /calendar/sync`. La UI puede repetirlo: los
   eventos usan IDs deterministas y la outbox conserva el ultimo cambio.
5. Desconectar mediante `DELETE /calendar/connection`.

`REAUTH_REQUIRED` indica que Google invalido la credencial y debe repetirse el
flujo de autorizacion. Nunca se entrega un token al navegador.

## Eventos externos

`GET /calendar/external-events?from=...&to=...&timeZone=...` devuelve eventos de
Google no administrados por Odontofy. Se muestran como bloques de calendario sin
acciones de cita. No deben combinarse por ID ni guardarse localmente.

Durante la convivencia, `/api/appointments` y `/api/google/init` siguen siendo
adaptadores. F11 reemplazara su uso en Angular y retirara esos DTOs legacy.
