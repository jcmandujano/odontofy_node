# ADR-0005: Plataforma HTTP transversal de API v1

- Estado: Accepted
- Fecha: 2026-08-15

## Contexto

La API legacy mezcla respuestas, validaciones y manejo de errores, y no ofrece
correlacion estructurada ni endpoints de salud separados. F3 debe construir estas
capacidades una vez para que los modulos de negocio no las resuelvan de manera
independiente.

## Decision

- Se actualiza a Express 5 para que errores de handlers asincronos lleguen al
  middleware central y para comenzar v1 sobre la version actual del framework.
- `/api/v1` usa un router y una cadena de middleware propios. `/api` conserva sus
  routers, body parser y respuestas durante la migracion incremental.
- Zod valida entradas v1 mediante objetos estrictos. Los datos validados se
  almacenan en `req.validated` y no se asigna `req.body` directamente a Sequelize.
- Los errores v1 usan el envelope aceptado en ADR-0003, un codigo estable y un
  mensaje publico. Las causas y stacks no forman parte de la respuesta.
- Pino emite logs JSON. Cada solicitud v1 obtiene un `requestId`; un
  `X-Request-Id` entrante solo se acepta con caracteres y longitud controlados.
  Authorization, cookies y set-cookie se redactan.
- Liveness comprueba el proceso HTTP y readiness comprueba MySQL. El proceso deja
  de aceptar conexiones antes de cerrar Sequelize ante `SIGTERM` o `SIGINT`.
- `openapi-v1.yaml` es el contrato OpenAPI 3.1.1 versionado. Se valida en
  `npm run check`, se sirve sin envelope en `/api/v1/openapi.json` para conservar
  interoperabilidad y tiene una UI separada en `/api-docs/v1`.

## Consecuencias

- Cada nuevo modulo v1 reutilizara estas primitivas y agregara sus schemas Zod,
  paths OpenAPI y pruebas de contrato en el mismo PR.
- La documentacion Swagger legacy puede retirarse solo junto con sus rutas en F11.
- OpenAPI y Zod permanecen como artefactos separados: OpenAPI origina los tipos
  del cliente y las pruebas deben detectar divergencias con la validacion runtime.
- Trazas distribuidas completas no se instalan mientras la aplicacion siga siendo
  un solo proceso; `requestId` mantiene la correlacion local.

## Referencias

- Express 5 migration: https://expressjs.com/en/guide/migrating-5/
- Express health checks: https://expressjs.com/en/advanced/healthcheck-graceful-shutdown/
- OpenAPI 3.1.1: https://spec.openapis.org/oas/v3.1.1.html
- Zod strict objects: https://zod.dev/api#strictobject
- W3C Trace Context: https://www.w3.org/TR/trace-context/
