# Roadmap de Refactor API v1

## Objetivo

Evolucionar Odontofy hacia un monolito modular dentro de este repositorio. La API
actual bajo `/api` permanecera disponible mientras los modulos se reconstruyen en
`/api/v1`. La base de datos se recreara desde migraciones versionadas y datos
sinteticos.

## Estados

Cada fase usa uno de estos estados:

- `PENDING`: aun no iniciada.
- `IN_PROGRESS`: tiene trabajo activo.
- `VALIDATING`: implementada y reuniendo evidencias.
- `DONE`: cumple todos sus criterios de salida.
- `BLOCKED`: no puede avanzar y documenta la causa.

Solo puede existir una fase `IN_PROGRESS`. No se inicia la fase siguiente hasta que
la anterior se encuentre en `DONE`.

## Evidencia requerida

Para cerrar una fase se deben registrar:

- Milestone e issues de GitHub asociados.
- PRs integrados y decisiones ADR relacionadas.
- Comandos de verificacion ejecutados y sus resultados.
- Migraciones o cambios de contrato, cuando correspondan.
- Riesgos o deuda aceptada que pase a una fase posterior.

## Resumen de fases

| ID  | Fase                               | Estado     | Objetivo de salida                                           |
| --- | ---------------------------------- | ---------- | ------------------------------------------------------------ |
| F0  | Gobierno e higiene                 | DONE       | Trazabilidad instalada y repositorio sin snapshots de datos. |
| F1  | Linea base de calidad              | DONE       | Build, lint, pruebas y CI reproducibles.                     |
| F2  | Base de datos reproducible         | DONE       | Esquema normalizado creado solo desde migraciones.           |
| F3  | Plataforma HTTP y contrato v1      | DONE       | `/api/v1`, errores, observabilidad y OpenAPI disponibles.    |
| F4  | Identidad y acceso                 | DONE       | Auth, sesiones y perfil migrados al primer modulo v1.        |
| F5  | Pacientes                          | DONE       | Pacientes migrados con ownership y DTOs estrictos.          |
| F6  | Planes de tratamiento              | IN PROGRESS | Planes e items transaccionales en v1.                       |
| F7  | Expediente clinico                 | PENDING    | Notas y relaciones clinicas migradas.                        |
| F8  | Facturacion y catalogos            | PENDING    | Pagos y conceptos transaccionales migrados.                  |
| F9  | Agenda y Google Calendar           | PENDING    | Agenda desacoplada del proveedor externo.                    |
| F10 | Consentimientos, archivos y correo | PENDING    | Integraciones restantes encapsuladas.                        |
| F11 | Migracion Angular y retiro legacy  | PENDING    | UI en v1 y rutas legacy retiradas por modulo.                |
| F12 | Cierre arquitectonico              | PENDING    | Reglas de arquitectura y validacion integral en CI.          |

## F0 - Gobierno e higiene

### Objetivos

- Instalar una fuente de verdad versionada para el programa de refactor.
- Registrar las decisiones iniciales que gobiernan todas las fases.
- Evitar que dumps o configuracion sensible entren al repositorio.
- Preparar plantillas uniformes para issues y PRs.

### Entregables

- [x] Rama `refactor/api-v1-f0-governance`.
- [x] Roadmap versionado.
- [x] ADRs iniciales de arquitectura, versionado, contrato y base de datos.
- [x] Plantillas de issue y PR.
- [x] `.env.example` sin secretos.
- [x] Reglas de ignore para ambientes y dumps.
- [x] Eliminacion del dump versionado.
- [x] [Milestone `API v1 - F0 Gobierno e higiene`](https://github.com/jcmandujano/odontofy_node/milestone/1).
- [x] Issues de F0 enlazados a este documento.
- [x] [PR #21 de F0](https://github.com/jcmandujano/odontofy_node/pull/21) publicado y enlazado.

### Criterios de salida

- No existe un dump de datos dentro del arbol de trabajo.
- Un nuevo dump que siga la convencion `dump-*.sql` queda ignorado.
- Las decisiones iniciales se pueden rastrear desde ADRs.
- Todo PR del refactor identifica fase, issue, pruebas y cambios de contrato.
- El milestone de F0 enlaza el PR y las evidencias de cierre.

### Evidencias

| Fecha      | Evidencia           | Resultado                                                                                          |
| ---------- | ------------------- | -------------------------------------------------------------------------------------------------- |
| 2026-08-07 | Inventario inicial  | 63 endpoints, 2 paths Swagger, build exitoso, lint con 26 errores y sin pruebas API.               |
| 2026-08-07 | Revision de datos   | Dump identificado para eliminacion; el proyecto se confirma como desarrollo sin datos productivos. |
| 2026-08-07 | Higiene local       | Dump eliminado; `.env.test` y nuevos dumps quedan ignorados; `.env.example` permanece versionable. |
| 2026-08-07 | Verificacion F0     | Plantillas YAML validas, `git diff --check` limpio y `npm run build` exitoso.                      |
| 2026-08-07 | Trazabilidad GitHub | Milestone y issues `#18`, `#19` y `#20` creados y clasificados.                                    |
| 2026-08-07 | Publicacion F0      | Rama remota y PR `#21` creados; F0 pasa a validacion.                                              |
| 2026-08-07 | Cierre F0           | PR `#21` integrado, issues `#18` a `#20` cerrados y milestone completado.                          |
| 2026-08-07 | Punto de retorno    | Tag remoto `pre-api-v1-refactor` creado sobre el commit anterior al programa de refactor.          |

### Enlaces de trabajo F0

- [#18 Configurar trazabilidad GitHub y cerrar la fase](https://github.com/jcmandujano/odontofy_node/issues/18)
- [#19 Eliminar dump y proteger configuracion local](https://github.com/jcmandujano/odontofy_node/issues/19)
- [#20 Versionar roadmap y decisiones arquitectonicas](https://github.com/jcmandujano/odontofy_node/issues/20)
- [PR #21 Establish API v1 refactor governance](https://github.com/jcmandujano/odontofy_node/pull/21)

### Riesgos transferidos

- GitHub reporto 110 alertas de dependencias preexistentes en `main`: 5 criticas,
  48 altas, 44 moderadas y 13 bajas. Su inventario y remediacion pertenecen a F1;
  no se mezclan actualizaciones de runtime con la gobernanza de F0.

## F1 - Linea base de calidad

### Objetivos

- Fijar un runtime reproducible para desarrollo y CI.
- Separar la construccion de Express del arranque de red y base de datos.
- Instalar pruebas de caracterizacion para proteger el contrato legacy.
- Convertir lint, typecheck, pruebas y build en una validacion unica.
- Reducir y documentar el riesgo de dependencias sin introducir cambios mayores.

### Entregables

- [x] Rama `refactor/api-v1-f1-quality-baseline`.
- [x] Node 24 y npm 11 declarados en el repositorio.
- [x] Fabrica `createApp()` importable sin abrir puertos ni autenticar MySQL.
- [x] Clientes externos inicializados solo cuando una operacion los requiere.
- [x] Vitest y Supertest con pruebas HTTP de caracterizacion.
- [x] ESLint y typecheck sin errores.
- [x] Workflow de GitHub Actions con instalacion reproducible.
- [x] Inventario de dependencias y riesgo residual documentado.
- [x] Ejecucion exitosa del workflow en el PR de F1.
- [x] PR de F1 revisado e integrado.

### Criterios de salida

- `npm ci` puede reconstruir las dependencias con Node 24.
- `npm run check` ejecuta lint, typecheck, pruebas y build sin errores.
- Importar `createApp()` no conecta MySQL, no abre un puerto y no exige secretos.
- El comportamiento legacy cubierto por las pruebas permanece sin cambios.
- Las vulnerabilidades no corregibles sin cambios mayores tienen responsable y fase.

### Evidencias

| Fecha      | Evidencia                    | Resultado                                                                    |
| ---------- | ---------------------------- | ---------------------------------------------------------------------------- |
| 2026-08-07 | Bootstrap testeable          | `createApp()` separado de `server.ts`; DB autentica antes de `listen`.        |
| 2026-08-07 | Pruebas de caracterizacion   | 4 pruebas HTTP pasan sin MySQL ni credenciales de integraciones.              |
| 2026-08-07 | Validacion local             | `npm run check` pasa: lint, typecheck, 4 pruebas y build.                      |
| 2026-08-07 | Dependencias compatibles     | Alertas npm reducidas a 8 moderadas; no quedan altas ni criticas.             |
| 2026-08-07 | Riesgo residual              | Dependencias transitivas de `uuid` documentadas sin aplicar cambios forzados. |
| 2026-08-07 | CI de F1                     | Job `quality` del PR `#27` aprobado en GitHub Actions sobre Node 24.           |
| 2026-08-14 | Cierre F1                    | PR `#27` integrado, issues `#22` a `#26` cerrados y milestone completado.      |

### Enlaces de trabajo F1

- [#22 Fijar runtime y sanear dependencias](https://github.com/jcmandujano/odontofy_node/issues/22)
- [#23 Separar createApp del arranque](https://github.com/jcmandujano/odontofy_node/issues/23)
- [#24 Agregar pruebas de caracterizacion HTTP](https://github.com/jcmandujano/odontofy_node/issues/24)
- [#25 Resolver lint y typecheck](https://github.com/jcmandujano/odontofy_node/issues/25)
- [#26 Integrar GitHub Actions](https://github.com/jcmandujano/odontofy_node/issues/26)
- [PR #27 Linea base de calidad](https://github.com/jcmandujano/odontofy_node/pull/27)

### Riesgos transferidos

- La actualizacion mayor de Express 5 se evaluara en F3 junto con la plataforma
  HTTP para evitar mezclar cambios de framework con esta linea base.
- Las rutas transitivas de `uuid` fueron reevaluadas en F2. Sequelize v6 aun las
  incluye; Google se revisara en F9/F10 y la modernizacion final del ORM en F12.
  El detalle esta en [`f1-dependency-audit.md`](./f1-dependency-audit.md).

## F2 - Base de datos reproducible

### Objetivos

- Reemplazar scripts SQL manuales por migraciones versionadas y reversibles.
- Crear un esquema nuevo con naming, tipos, constraints e indices consistentes.
- Probar el esquema sobre un MySQL real y aislado.
- Mantener la API legacy mediante mappings Sequelize, no mediante nombres fisicos
  heredados.
- Impedir que los comandos destructivos apunten a una base no reconocida.

### Entregables

- [x] Rama `refactor/api-v1-f2-reproducible-database`.
- [x] [Milestone `API v1 - F2 Base de datos reproducible`](https://github.com/jcmandujano/odontofy_node/milestone/3).
- [x] Esquema objetivo y deuda diferida documentados.
- [x] Sequelize CLI y configuracion separada para development/test.
- [x] MySQL 8.4 local aislado mediante Docker Compose.
- [x] Seis migraciones reversibles para 17 tablas.
- [x] Seed versionado con cinco registros sinteticos de catalogo.
- [x] Modelos legacy mapeados a tablas y columnas normalizadas.
- [x] Nueve pruebas de integridad y compatibilidad contra MySQL.
- [x] Job de base de datos agregado a GitHub Actions.
- [x] Ejecucion exitosa del job `database` en el PR de F2.
- [x] [PR #33 de F2](https://github.com/jcmandujano/odontofy_node/pull/33) revisado e integrado.

### Criterios de salida

- Una base vacia se migra y puebla sin dumps ni pasos SQL manuales.
- `npm run db:verify:test` prueba migracion, seed, integridad, rollback completo,
  reconstruccion y una segunda ejecucion de pruebas.
- Todas las foreign keys usan IDs `INT UNSIGNED` compatibles y acciones de
  borrado explicitas.
- Los checks rechazan rangos de fechas, cantidades y montos invalidos.
- La configuracion rechaza `production` y nombres fuera de `_dev`/`_test`.
- Los endpoints legacy no cambian su contrato por el naming fisico nuevo.

### Evidencias

| Fecha      | Evidencia                    | Resultado                                                                      |
| ---------- | ---------------------------- | ------------------------------------------------------------------------------ |
| 2026-08-14 | Inventario legacy            | 17 modelos/tablas y cinco scripts SQL manuales incorporados al diseño objetivo. |
| 2026-08-14 | Migracion desde cero         | Seis migraciones aplicadas correctamente sobre MySQL 8.4 limpio.               |
| 2026-08-14 | Seed sintetico               | Tres conceptos y dos consentimientos ficticios, sin datos reales.              |
| 2026-08-14 | Integridad y mappings        | Nueve pruebas validan tablas, FKs, checks, ownership, cascadas y mappings.      |
| 2026-08-14 | Rollback y reconstruccion    | Las seis migraciones bajan y vuelven a subir en orden sin intervencion manual.  |
| 2026-08-14 | Seguridad de operaciones     | Pruebas unitarias rechazan production y nombres de base no autorizados.         |
| 2026-08-14 | CI de F2                     | Jobs `quality` y `database` del PR `#33` aprobados sobre Node 24 y MySQL 8.4.    |
| 2026-08-14 | Integracion de F2            | PR `#33` integrado en `main` mediante commit `0e8e032`.                         |

### Enlaces de trabajo F2

- [#28 Disenar esquema y compatibilidad](https://github.com/jcmandujano/odontofy_node/issues/28)
- [#29 Configurar migraciones y MySQL aislado](https://github.com/jcmandujano/odontofy_node/issues/29)
- [#30 Crear migraciones y seeds](https://github.com/jcmandujano/odontofy_node/issues/30)
- [#31 Alinear modelos Sequelize](https://github.com/jcmandujano/odontofy_node/issues/31)
- [#32 Validar integridad y reconstruccion](https://github.com/jcmandujano/odontofy_node/issues/32)
- [PR #33 Base de datos reproducible](https://github.com/jcmandujano/odontofy_node/pull/33)

### Riesgos transferidos

- Historiales clinicos JSON se evaluan en F7; finanzas y snapshots en F8.
- Credenciales e integraciones Google permanecen diferidas a F9/F10.
- El advisory moderado de `uuid` requiere modernizar dependencias que aun no
  ofrecen una ruta compatible estable; se mantiene visible para F12.

## F3 - Plataforma HTTP y contrato v1

### Objetivos

- Crear una superficie `/api/v1` aislada que coexista con las rutas legacy.
- Estandarizar respuestas, errores y validacion estricta para los modulos v1.
- Incorporar correlacion y logging estructurado sin registrar secretos HTTP.
- Separar liveness de readiness y cerrar ordenadamente HTTP y base de datos.
- Publicar OpenAPI 3.1 como contrato verificable de cada endpoint v1.

### Entregables

- [x] Rama `refactor/api-v1-f3-http-platform`.
- [x] [Milestone `API v1 - F3 Plataforma HTTP y contrato v1`](https://github.com/jcmandujano/odontofy_node/milestone/4).
- [x] Express 5 y compatibilidad de parametros legacy validada.
- [x] Router `/api/v1` independiente de los routers `/api`.
- [x] Envelope v1 con `requestId`, errores tipados y metadata opcional.
- [x] Middleware Zod reutilizable para esquemas estrictos.
- [x] Logging JSON con redaccion de authorization, cookies y set-cookie.
- [x] Endpoints separados de liveness y readiness.
- [x] Cierre ordenado de HTTP y Sequelize ante `SIGTERM`/`SIGINT`.
- [x] Contrato OpenAPI 3.1.1 y Swagger UI v1 separados del documento legacy.
- [x] Validacion OpenAPI incorporada a `npm run check`.
- [x] Pruebas HTTP de plataforma y regresion legacy.
- [x] Ejecucion exitosa de los jobs `quality` y `database` en el PR de F3.
- [x] [PR #39 de F3](https://github.com/jcmandujano/odontofy_node/pull/39) revisado e integrado.

### Criterios de salida

- Las rutas `/api` conservan su comportamiento caracterizado.
- Todas las respuestas de aplicacion bajo `/api/v1` incluyen `requestId` y los
  errores exponen codigos estables sin stacks ni causas internas.
- IDs entrantes invalidos se reemplazan y `X-Request-Id` queda expuesto por CORS.
- Liveness no consulta dependencias; readiness responde `503` cuando MySQL falla.
- Los esquemas Zod estrictos rechazan propiedades desconocidas.
- `/api/v1/openapi.json` entrega un documento valido para tooling y
  `/api-docs/v1` ofrece la interfaz navegable.
- `npm run check` valida lint, tipos, OpenAPI, pruebas y build.

### Evidencias

| Fecha      | Evidencia                  | Resultado                                                        |
| ---------- | -------------------------- | ---------------------------------------------------------------- |
| 2026-08-15 | Migracion a Express 5      | Suite legacy aprobada y wildcard de archivos adaptado y probado. |
| 2026-08-15 | Pruebas HTTP de plataforma | Ocho escenarios cubren IDs, errores, health, Zod y shutdown.     |
| 2026-08-15 | Contrato OpenAPI            | Documento 3.1.1 validado automaticamente con Swagger Parser.     |
| 2026-08-15 | Suite local                 | 15 pruebas aprobadas sin abrir puerto ni requerir MySQL.         |
| 2026-08-15 | Regresion de base de datos  | Nueve pruebas pasan antes y despues de reconstruir seis migraciones. |
| 2026-08-15 | CI de F3                    | Jobs `quality` y `database` del PR `#39` aprobados.               |
| 2026-08-15 | Integracion de F3           | PR `#39` integrado en `main` mediante commit `5f5e461`.           |

### Enlaces de trabajo F3

- [#34 Establecer plataforma HTTP versionada y Express 5](https://github.com/jcmandujano/odontofy_node/issues/34)
- [#35 Unificar errores, envelopes y validacion estricta](https://github.com/jcmandujano/odontofy_node/issues/35)
- [#36 Agregar observabilidad, health checks y cierre ordenado](https://github.com/jcmandujano/odontofy_node/issues/36)
- [#37 Publicar y validar OpenAPI 3.1](https://github.com/jcmandujano/odontofy_node/issues/37)
- [#38 Validar plataforma HTTP y documentar evidencia](https://github.com/jcmandujano/odontofy_node/issues/38)
- [PR #39 Plataforma HTTP y contrato v1](https://github.com/jcmandujano/odontofy_node/pull/39)

### Riesgos transferidos

- F3 publica solo endpoints de plataforma; identidad comienza la migracion de
  negocio y el uso de DTOs v1 en F4.
- La propagacion W3C `traceparent` se agregara cuando una integracion saliente o
  un segundo proceso requiera trazas distribuidas; hoy `requestId` cubre la
  correlacion del monolito.
- El documento OpenAPI y los esquemas Zod son artefactos distintos. Cada modulo
  debera incorporar pruebas de contrato para impedir divergencia.

## F4 - Identidad y acceso

### Objetivos

- Migrar autenticacion, sesiones, ciclo de cuenta y perfil a `/api/v1`.
- Crear el primer modulo vertical con HTTP, aplicacion y persistencia agrupados.
- Evitar enumeracion de cuentas, asignacion masiva y exposicion de credenciales.
- Detectar replay de refresh tokens e invalidar sesiones ante cambios de clave.
- Mantener disponibles las rutas legacy hasta la migracion Angular de F11.

### Entregables

- [x] Rama `refactor/api-v1-f4-identity-access`.
- [x] [Milestone `API v1 - F4 Identidad y acceso`](https://github.com/jcmandujano/odontofy_node/milestone/5).
- [x] Modulo `identity` con schemas, HTTP, aplicacion y repositorio Sequelize.
- [x] JWT HS256 con `typ`, `iss`, `aud`, `sub`, `exp`, `jti` y `authVersion`.
- [x] Middleware Bearer que comprueba token y usuario activo.
- [x] Refresh tokens aleatorios, hasheados, rotatorios y agrupados por familia.
- [x] Cookie refresh HttpOnly, SameSite Strict, Secure en production y path limitado.
- [x] Registro, activacion y recuperacion con respuestas anti-enumeracion.
- [x] Passwords bcrypt asincronos, costo minimo 10 y limite de 72 bytes.
- [x] Reset de password de un solo uso que revoca refresh e invalida access tokens.
- [x] Perfil `/api/v1/me` con DTO camelCase y PATCH de campos permitidos.
- [x] Rate limits con headers estandar y store reemplazable.
- [x] Contrato OpenAPI 3.1 actualizado para diez endpoints de identidad.
- [x] Validacion local integral de F4.
- [x] CI remoto de F4 y PR abierto.
- [x] PR de F4 integrado.

### Criterios de salida

- Tokens JWT alterados, expirados, con tipo, issuer o audience distintos se rechazan.
- Login y recuperacion no distinguen cuentas inexistentes, inactivas o passwords
  incorrectos mediante mensaje o codigo de error.
- Un refresh token solo se usa una vez; su replay revoca toda la familia activa.
- Password reset consume un token hasheado, incrementa `auth_version` y revoca
  todas las sesiones refresh del usuario dentro de una transaccion.
- Los DTOs nunca contienen password hashes ni credenciales OAuth.
- Zod rechaza propiedades desconocidas y el perfil no permite cambiar email,
  estado, version de autenticacion ni flags por asignacion masiva.
- El proveedor de correo se sustituye en pruebas y no requiere credenciales reales.
- OpenAPI, pruebas rapidas, pruebas MySQL, rollback y build pasan en CI.

### Evidencias

| Fecha      | Evidencia                  | Resultado                                                          |
| ---------- | -------------------------- | ------------------------------------------------------------------ |
| 2026-08-15 | Politica y JWT             | Seis pruebas cubren schemas, claims, secretos y anti-enumeracion.   |
| 2026-08-15 | Ciclo identity sobre MySQL | Diez pruebas cubren cuenta, sesion, replay, perfil y recovery.      |
| 2026-08-15 | Esquema                    | Migracion reversible agrega `users.auth_version`.                   |
| 2026-08-15 | Contrato                   | OpenAPI 3.1 valida los diez endpoints y dos esquemas de seguridad.  |
| 2026-08-15 | Calidad local              | Lint, tipos, contrato, 21 pruebas rapidas y build pasan.            |
| 2026-08-15 | Reconstruccion MySQL       | 19 pruebas pasan antes y despues del rollback de siete migraciones. |
| 2026-08-15 | CI remoto                  | Jobs `quality` y `database` pasan en el PR #46.                     |
| 2026-08-15 | Integracion                | PR #46 integrado en `beb3a11`; issues y milestone cerrados.        |

### Enlaces de trabajo F4

- [#40 Definir contrato y politica de identidad](https://github.com/jcmandujano/odontofy_node/issues/40)
- [#41 Implementar JWT v1 y autenticacion central](https://github.com/jcmandujano/odontofy_node/issues/41)
- [#42 Implementar sesiones refresh rotatorias](https://github.com/jcmandujano/odontofy_node/issues/42)
- [#43 Migrar ciclo de cuenta y recuperacion](https://github.com/jcmandujano/odontofy_node/issues/43)
- [#44 Migrar perfil autenticado](https://github.com/jcmandujano/odontofy_node/issues/44)
- [#45 Validar contrato, seguridad y regresion](https://github.com/jcmandujano/odontofy_node/issues/45)
- [PR #46 Identidad y acceso en API v1](https://github.com/jcmandujano/odontofy_node/pull/46)

### Riesgos transferidos

- El access token se entrega al cliente y no debe persistirse en Web Storage; la
  adaptacion Angular y su almacenamiento solo en memoria pertenecen a F11.
- El rate limiter usa memoria en desarrollo. Su interfaz admite un store externo;
  Redis se incorporara cuando exista mas de una instancia de API.
- Logout invalida el refresh actual; el access token puede vivir hasta diez
  minutos. Cambios de password si lo invalidan inmediatamente con `authVersion`.
- MFA e integracion con un proveedor de identidad no se agregan sin un requisito
  de producto; el modulo mantiene limites para incorporarlos posteriormente.

## F5 - Pacientes

### Objetivos

- Migrar pacientes a `/api/v1` sin modificar las rutas legacy.
- Aplicar ownership en la consulta SQL de cada lectura y escritura.
- Evitar BOLA, mass assignment y exposicion de propiedades internas.
- Acotar busqueda, paginacion y objetos JSON recibidos.
- Preservar relaciones clinicas mediante archivado logico recuperable.

### Entregables

- [x] Rama `refactor/api-v1-f5-patients`.
- [x] [Milestone `API v1 - F5 Pacientes`](https://github.com/jcmandujano/odontofy_node/milestone/6).
- [x] Issues #47 a #52 con criterios verificables.
- [x] ADR de ownership, propiedades y ciclo de vida de pacientes.
- [x] Modulo `patients` con schemas, HTTP, aplicacion y repositorio Sequelize.
- [x] Listado con busqueda, filtro de estado, orden estable y paginacion acotada.
- [x] Detalle, alta y PATCH con DTOs camelCase estrictos.
- [x] Archivado idempotente y restauracion explicita sin borrado fisico v1.
- [x] Contrato OpenAPI 3.1 y pruebas con dos propietarios.
- [x] Validacion local integral de F5.
- [x] CI remoto de F5 y PR abierto.
- [x] PR de F5 integrado.

### Criterios de salida

- Toda consulta por ID incluye `user_id`; un ID ajeno y uno inexistente responden
  el mismo `404`.
- Los payloads desconocidos y los intentos de asignar owner, balance, IDs o
  timestamps se rechazan antes de persistir.
- Los DTOs no serializan modelos Sequelize ni exponen `user_id`.
- `pageSize` tiene un maximo explicito y la busqueda tiene longitud acotada.
- Los pacientes inactivos se excluyen por defecto, pueden consultarse con un
  filtro validado y pueden restaurarse mediante PATCH.
- `DELETE` conserva al paciente y sus relaciones; las rutas legacy no cambian.
- OpenAPI, pruebas rapidas, pruebas MySQL, rollback y build pasan en CI.

### Evidencias

| Fecha      | Evidencia              | Resultado                                                       |
| ---------- | ---------------------- | --------------------------------------------------------------- |
| 2026-08-17 | Schemas y propiedades  | Tres pruebas cubren limites, normalizacion y mass assignment.   |
| 2026-08-17 | Ownership sobre MySQL  | Seis pruebas con dos owners cubren CRUD, archivo y restauracion. |
| 2026-08-17 | Contrato               | OpenAPI 3.1 valida cinco operaciones y DTOs de pacientes.        |
| 2026-08-17 | Calidad local          | Lint, tipos, contrato, 24 pruebas rapidas y build pasan.         |
| 2026-08-17 | Reconstruccion MySQL   | 25 pruebas pasan antes y despues de siete migraciones.           |
| 2026-08-17 | CI remoto              | Jobs `quality` y `database` pasan en el PR #53.                  |
| 2026-08-17 | Integracion             | PR #53 integrado en `main` mediante `e56f035`.                   |

### Enlaces de trabajo F5

- [#47 Definir contrato y politica de acceso](https://github.com/jcmandujano/odontofy_node/issues/47)
- [#48 Implementar repositorio con ownership](https://github.com/jcmandujano/odontofy_node/issues/48)
- [#49 Migrar listado y detalle](https://github.com/jcmandujano/odontofy_node/issues/49)
- [#50 Migrar alta y actualizacion](https://github.com/jcmandujano/odontofy_node/issues/50)
- [#51 Implementar archivado y restauracion](https://github.com/jcmandujano/odontofy_node/issues/51)
- [#52 Validar contrato, ownership y regresion](https://github.com/jcmandujano/odontofy_node/issues/52)
- [PR #53 Pacientes con ownership en API v1](https://github.com/jcmandujano/odontofy_node/pull/53)

### Riesgos transferidos

- La estructura semantica de historiales medicos JSON se revisara en F7. F5
  conserva objetos compatibles, pero limita tipo y tamano.
- `current_balance` es de solo lectura en pacientes; sus invariantes pertenecen
  a facturacion F8.
- La politica de retencion definitiva requiere una decision de producto. F5 no
  ofrece borrado fisico y mantiene la operacion recuperable.

## F6 - Planes de tratamiento

### Objetivos

- Migrar planes e items a `/api/v1` sin retirar las rutas legacy.
- Aplicar ownership al plan y a cada recurso anidado.
- Mantener importes exactos y recalcular el agregado atomicamente.
- Evitar BOLA, mass assignment y filtrado accidental de notas clinicas.
- Conservar planes e items mediante cancelacion logica idempotente.

### Entregables

- [x] Rama `refactor/api-v1-f6-treatment-plans`.
- [x] [Milestone `API v1 - F6 Planes de tratamiento`](https://github.com/jcmandujano/odontofy_node/milestone/7).
- [x] Issues #54 a #59 con criterios verificables.
- [x] ADR de ownership anidado, decimales y transacciones.
- [x] Modulo `treatment-plans` con schemas, HTTP, servicio y repositorio.
- [x] Listado paginado y detalle sin notas de evolucion.
- [x] Mutaciones de plan e items con DTOs camelCase estrictos.
- [x] Recalculo exacto bajo transaccion y bloqueo de fila.
- [x] Cancelacion idempotente y timestamps de estado coherentes.
- [x] Restriccion MySQL para descuentos y totales no negativos.
- [x] Contrato OpenAPI 3.1 y pruebas con dos propietarios.
- [x] Validacion local integral de F6.
- [ ] CI remoto de F6 y PR abierto.
- [ ] PR de F6 integrado.

### Criterios de salida

- Cada plan por ID incluye `user_id`; cada item incluye el plan autorizado y un
  ID ajeno es indistinguible de uno inexistente.
- Inputs y outputs usan DTOs explicitos; dinero se expresa como string decimal y
  no se serializan modelos ni propiedades internas.
- Alta, edicion, cancelacion y estado de items recalculan el plan dentro de una
  sola transaccion con bloqueo del agregado.
- Un rollback conserva item e importes cuando el descuento violaria el subtotal.
- Items cancelados no suman; planes e items no se eliminan fisicamente en v1.
- Listados tienen `pageSize` maximo 100 y el detalle no incluye notas de F7.
- OpenAPI, pruebas rapidas, pruebas MySQL, rollback y build pasan en CI.

### Evidencias

| Fecha      | Evidencia                | Resultado                                                        |
| ---------- | ------------------------ | ---------------------------------------------------------------- |
| 2026-08-17 | Schemas y decimales      | Cinco pruebas cubren exactitud, limites y mass assignment.       |
| 2026-08-17 | Transacciones sobre MySQL | Ocho pruebas cubren BOLA, rollback, totales y ciclo de vida.     |
| 2026-08-17 | Contrato                 | OpenAPI 3.1 valida diez operaciones de planes e items.            |
| 2026-08-17 | Calidad local            | Lint, tipos, contrato, 29 pruebas rapidas y build pasan.          |
| 2026-08-17 | Reconstruccion MySQL     | 33 pruebas pasan antes y despues de ocho migraciones.             |

### Enlaces de trabajo F6

- [#54 Definir contrato e invariantes](https://github.com/jcmandujano/odontofy_node/issues/54)
- [#55 Implementar repositorio transaccional](https://github.com/jcmandujano/odontofy_node/issues/55)
- [#56 Migrar listado y detalle](https://github.com/jcmandujano/odontofy_node/issues/56)
- [#57 Migrar mutaciones de planes](https://github.com/jcmandujano/odontofy_node/issues/57)
- [#58 Implementar items y recalculo atomico](https://github.com/jcmandujano/odontofy_node/issues/58)
- [#59 Validar contrato y regresion](https://github.com/jcmandujano/odontofy_node/issues/59)

### Riesgos transferidos

- Las notas de evolucion y su vinculacion clinica pertenecen a F7 y no se
  incluyen en respuestas de F6.
- Las transiciones permitidas entre estados requieren una decision de producto;
  F6 valida enums y timestamps, pero no impone una maquina de estados.
- La UI legacy envia numeros para importes y pagina localmente; F11 la adaptara a
  strings decimales y paginacion del servidor.

## Definicion de terminado para fases posteriores

- Todos los criterios de aceptacion del issue estan completos.
- `npm run check` pasa cuando ese script exista desde F1.
- El contrato OpenAPI se actualiza para cada endpoint v1 desde F3.
- Las pruebas incluyen acceso con IDs de otro usuario y propiedades no permitidas.
- La documentacion, el roadmap y los ADRs reflejan el estado final.
- No queda una decision tecnica abierta para la fase siguiente.

## Convenciones de GitHub

- Milestone: `API v1 - F{numero} {nombre}`.
- Rama: `refactor/api-v1-f{numero}-{descripcion}`.
- Labels: `api-v1`, `phase:F{numero}`, `type:architecture`, `type:database`,
  `type:api`, `type:test` y `blocked`.
- Un issue representa un entregable verificable; un PR puede cerrar uno o varios
  issues relacionados, pero siempre pertenece a una sola fase.
