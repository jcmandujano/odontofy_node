# Mapa de modulos API v1

Odontofy se mantiene como monolito modular. `app.ts`, `server.ts` y
`platform/http/v1.router.ts` son raices de composicion; las reglas de negocio
permanecen agrupadas por capacidad bajo `src/modules`.

## Capas

```text
HTTP router -> middleware/controller -> service -> repository -> Sequelize/MySQL
                                      -> provider externo
```

- `schemas` valida DTOs de entrada y `types` define contratos internos.
- Los controladores traducen HTTP y dependen de servicios, nunca de repositorios.
- Los servicios orquestan reglas y puertos; no importan Express, modelos ni DB.
- Solo `*.repository.ts` dentro de un modulo puede importar `src/models` o `src/db`.
- Los enums de dominio viven en `src/types`; los modelos los consumen, no los poseen.
- `src/platform` puede ensamblar modulos unicamente desde `http/v1.router.ts`.

Estas reglas se verifican mediante `npm run architecture:check` y son parte de
`npm run check`.

## Dependencias permitidas

| Modulo             | Puede depender de       | Motivo |
| ------------------ | ----------------------- | ------ |
| `identity`         | `email`                 | Encola correo de identidad mediante un puerto durable. |
| `patients`         | `identity`              | Autenticacion y ownership del usuario actual. |
| `treatment-plans`  | `identity`              | Autenticacion del limite HTTP. |
| `clinical-records` | `identity`              | Autenticacion del limite HTTP. |
| `billing`          | `identity`              | Autenticacion del limite HTTP. |
| `appointments`     | `identity`              | Autenticacion y conexion del usuario. |
| `files`            | `identity`              | Autenticacion del limite HTTP. |
| `consents`         | `identity`, `files`     | Autenticacion y validacion de archivos privados. |
| `email`            | ninguno                 | Adaptador de salida autocontenido. |

Cualquier dependencia distinta falla el checker. La matriz es deliberadamente
pequena: una nueva flecha requiere actualizar este documento y el guardrail en el
mismo PR.

## Frontera Angular

La UI mantiene `HttpClient`, `HttpBackend` y `environment.API_URL` dentro de
`core/services/api.service.ts` y `core/interceptors/interceptor.service.ts`.
Features y componentes consumen servicios de dominio; los DTOs y mappers `ApiV1`
no salen de `core`.

`npm run contract:angular` analiza los llamados TypeScript de esa frontera y
comprueba metodo y ruta contra `src/docs/openapi-v1.yaml`. El CI de API, propietario
del contrato, hace checkout de la rama `main` de UI y ejecuta esta validacion; UI
mantiene ademas pruebas HTTP de contrato sobre sus servicios.
