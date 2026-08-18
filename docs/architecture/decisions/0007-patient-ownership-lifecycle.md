# ADR-0007: Ownership y ciclo de vida de pacientes

- Estado: Accepted
- Fecha: 2026-08-17

## Contexto

Pacientes contiene datos personales, contacto e historia medica. El CRUD legacy
ya filtra algunos accesos por usuario, pero serializa modelos completos, actualiza
el body sin allowlist y elimina fisicamente al paciente junto con relaciones que
usan `ON DELETE CASCADE`.

F5 debe establecer una frontera reutilizable para los modulos clinicos siguientes
sin retirar las rutas legacy antes de la migracion Angular de F11.

## Decision

- El modulo `patients` agrupa schemas, HTTP, casos de uso y persistencia.
- El owner se toma del access token v1. Cada query de un recurso concreto incluye
  simultaneamente `id` y `user_id`; no se carga globalmente para autorizar despues.
- Un recurso ajeno y uno inexistente producen el mismo `PATIENT_NOT_FOUND` con
  status `404` para no revelar existencia.
- Entrada y salida usan DTOs explicitos camelCase. El cliente no puede asignar
  owner, IDs, balance ni timestamps, y nunca se serializa un modelo directamente.
- El listado usa un DTO resumen y selecciona solo sus columnas en SQL. Historias
  medicas, motivo de consulta, direccion y contacto de emergencia solo aparecen
  en el detalle y en respuestas de escritura.
- El listado usa paginacion por offset compatible con la UI actual, `pageSize`
  maximo de 100 y orden estable por `created_at DESC, id DESC`.
- Las historias medicas aceptan solo objetos JSON de hasta 64 KiB. Su vocabulario
  clinico permanece intacto hasta F7.
- `DELETE /api/v1/patients/{patientId}` es un archivado idempotente mediante
  `status=false`. PATCH permite restaurar explicitamente con `active=true`.
- El listado muestra activos por defecto y admite `active`, `inactive` o `all`.
- Las respuestas de pacientes llevan `Cache-Control: no-store`.

## Consecuencias

- No se destruyen en cascada citas, notas, planes, pagos o consentimientos desde
  la API v1 de pacientes.
- La restauracion no requiere una tabla adicional mientras el ciclo de vida solo
  tenga dos estados. Una auditoria detallada puede agregar eventos posteriormente.
- Offset pagination es suficiente para la UI y volumen actuales; si las tablas
  crecen hasta volver costosos offsets profundos, el contrato podra agregar cursores
  sin eliminar los parametros existentes.
- Las rutas legacy conservan su comportamiento hasta F11 y deben considerarse una
  superficie temporal distinta.

## Referencias

- OWASP API1:2023 BOLA: https://owasp.org/API-Security/editions/2023/en/0xa1-broken-object-level-authorization/
- OWASP API3:2023 Object Property Authorization: https://owasp.org/API-Security/editions/2023/en/0xa3-broken-object-property-level-authorization/
- OWASP API4:2023 Resource Consumption: https://owasp.org/API-Security/editions/2023/en/0xa4-unrestricted-resource-consumption/
- Sequelize v6 querying: https://sequelize.org/docs/v6/core-concepts/model-querying-basics/
