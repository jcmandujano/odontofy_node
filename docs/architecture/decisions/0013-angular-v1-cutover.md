# ADR-0013: Corte Angular a API v1 y retiro legacy

- Estado: Accepted
- Fecha: 2026-08-22

## Contexto

Las fases F3 a F10 mantuvieron `/api` y `/api/v1` en convivencia para migrar el
backend sin interrumpir el unico consumidor conocido, `odontofy_UI`. Mantener dos
superficies despues de migrar Angular duplicaria validacion, autorizacion,
documentacion y caminos de escritura sobre los mismos agregados.

F11 no incluye una migracion de base de datos. El riesgo principal esta en el
contrato HTTP y puede recuperarse con referencias Git inmutables.

## Decision

- Angular usa una unica URL base terminada en `/api/v1`.
- `ApiService` construye URLs relativas y conserva cookies refresh; los servicios
  de dominio adaptan DTOs v1 a los modelos visuales que aun usa la aplicacion.
- La paginacion v1 se toma de `meta.pagination`; nunca se envia `limit`.
- Correcciones, cancelaciones y archivados incluyen los motivos requeridos por v1.
- PDFs se suben a `/files`, se vinculan por UUID y se consultan con acceso temporal.
- El interceptor funcional comparte una sola renovacion cuando coinciden varios
  `401` y limita cada request a un reintento. Angular recomienda interceptores
  funcionales por su comportamiento predecible:
  https://angular.dev/guide/http/interceptors
- Los entornos definen la URL v1 en ambos builds según el mecanismo de reemplazo
  de Angular CLI: https://angular.dev/tools/cli/environments
- Se retiran todos los mounts `/api`, Swagger legacy y sus capas Express. Los
  activos publicos usados por correo permanecen fuera de la API.

## Orden de integracion

1. Integrar y verificar el PR Angular mientras el backend F10 aun ofrece v1 y legacy.
2. Integrar el PR backend que retira legacy.
3. Confirmar que `/api/v1/openapi.json` responde y `/api/auth/login` responde `404`.

Este orden evita una ventana en la que la UI anterior apunte a rutas ya retiradas.

## Recuperacion

Referencias remotas previas a F11:

- UI: rama `snapshot/pre-api-v1-f11-ui-20260822` y tag
  `ui-pre-api-v1-f11-20260822` en `18fefebe917ebc8b483bf3643ee3b02469c0a1f0`.
- API: rama `snapshot/pre-f11-api-20260822` y tag
  `api-pre-f11-20260822` en `6b6c7085e6b085506c3359822a631b09d169ba4c`.

Si ambos PR ya fueron integrados, se revierte primero el merge backend para
restaurar simultaneamente v1 y legacy; despues se revierte el merge UI. Al no haber
migracion F11, esta recuperacion no requiere modificar datos.

## Consecuencias

- `/api/v1` es la unica API soportada.
- Los mapeadores Angular constituyen una capa anticorrupcion temporal; permiten
  modernizar modelos visuales por separado sin reintroducir DTOs HTTP legacy.
- Cualquier nuevo endpoint se agrega primero a OpenAPI y no puede crear otra ruta
  sin version.
