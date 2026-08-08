# ADR-0002: Coexistencia y retiro de API legacy

- Estado: Accepted
- Fecha: 2026-08-07

## Contexto

El frontend consume rutas bajo `/api`. Un reemplazo total impediria validar el
refactor por partes y ocultaria regresiones hasta el final.

## Decision

La nueva API se publicara bajo `/api/v1`. Las rutas actuales bajo `/api` conservaran
su comportamiento durante todas las fases backend.

El frontend se migrara al final, un modulo a la vez. La ruta legacy de un modulo se
retirara solamente cuando su contrato v1, adaptacion Angular y pruebas end-to-end
esten completos.

## Consecuencias

- No se exige compatibilidad de payload entre legacy y v1.
- Los modelos legacy podran mapear temporalmente el nuevo esquema SQL.
- No se mantendra una API legacy una vez migrado su consumidor conocido.
