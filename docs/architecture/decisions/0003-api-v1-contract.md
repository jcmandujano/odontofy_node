# ADR-0003: Contrato HTTP de API v1

- Estado: Accepted
- Fecha: 2026-08-07

## Contexto

La API mezcla idiomas, formatos de error y convenciones de nombres. Algunos
endpoints pasan `req.body` directamente a Sequelize y Swagger solo cubre una parte
pequena de la superficie existente.

## Decision

- Los payloads v1 usaran `camelCase` y los modelos mapearan a SQL `snake_case`.
- Zod validara entradas con esquemas estrictos por modulo; campos desconocidos se
  rechazaran.
- La respuesta conservara un envelope con `success`, `message`, `data`, `errors`,
  `requestId` y `meta` opcional.
- Los errores tendran codigos estables independientes del mensaje en espanol.
- OpenAPI 3.1 sera el contrato verificable y origen de tipos compartidos con Angular.
- Fechas se expresaran en ISO 8601 y timestamps en UTC.
- Importes se expondran como strings decimales de dos posiciones y se calcularan
  internamente en centavos.

## Consecuencias

- La UI requerira una migracion explicita de DTOs.
- Se elimina la asignacion masiva como mecanismo de actualizacion.
- Cada endpoint v1 debera incorporar esquema, OpenAPI y pruebas de contrato.
