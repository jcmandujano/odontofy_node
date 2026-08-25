# Roadmap de Refactor API v1

## Objetivo

Evolucionar Odontofy hacia un monolito modular dentro de este repositorio. La API
legacy bajo `/api` permanecio disponible durante la reconstruccion de modulos y se
retira cuando Angular completa el corte a `/api/v1`. La base de datos se recrea
desde migraciones versionadas y datos sinteticos.

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
| F5  | Pacientes                          | DONE       | Pacientes migrados con ownership y DTOs estrictos.           |
| F6  | Planes de tratamiento              | DONE       | Planes e items transaccionales en v1.                        |
| F7  | Expediente clinico                 | DONE       | Historial y notas versionadas en v1.                         |
| F8  | Facturacion y catalogos            | DONE       | Pagos y conceptos transaccionales migrados.                  |
| F9  | Agenda y Google Calendar           | DONE       | Agenda desacoplada del proveedor externo.                    |
| F10 | Consentimientos, archivos y correo | DONE       | Integraciones restantes encapsuladas.                        |
| F11 | Migracion Angular y retiro legacy  | VALIDATING | UI en v1 y rutas legacy retiradas por modulo.               |
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

| Fecha      | Evidencia                  | Resultado                                                                     |
| ---------- | ---------------------------- | ---------------------------------------------------------------------------- |
| 2026-08-07 | Bootstrap testeable        | `createApp()` separado de `server.ts`; DB autentica antes de `listen`.        |
| 2026-08-07 | Pruebas de caracterizacion | 4 pruebas HTTP pasan sin MySQL ni credenciales de integraciones.              |
| 2026-08-07 | Validacion local           | `npm run check` pasa: lint, typecheck, 4 pruebas y build.                     |
| 2026-08-07 | Dependencias compatibles   | Alertas npm reducidas a 8 moderadas; no quedan altas ni criticas.             |
| 2026-08-07 | Riesgo residual            | Dependencias transitivas de `uuid` documentadas sin aplicar cambios forzados. |
| 2026-08-07 | CI de F1                   | Job `quality` del PR `#27` aprobado en GitHub Actions sobre Node 24.          |
| 2026-08-14 | Cierre F1                  | PR `#27` integrado, issues `#22` a `#26` cerrados y milestone completado.     |

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

| Fecha      | Evidencia                 | Resultado                                                                       |
| ---------- | ---------------------------- | ------------------------------------------------------------------------------ |
| 2026-08-14 | Inventario legacy         | 17 modelos/tablas y cinco scripts SQL manuales incorporados al diseño objetivo. |
| 2026-08-14 | Migracion desde cero      | Seis migraciones aplicadas correctamente sobre MySQL 8.4 limpio.                |
| 2026-08-14 | Seed sintetico            | Tres conceptos y dos consentimientos ficticios, sin datos reales.               |
| 2026-08-14 | Integridad y mappings     | Nueve pruebas validan tablas, FKs, checks, ownership, cascadas y mappings.      |
| 2026-08-14 | Rollback y reconstruccion | Las seis migraciones bajan y vuelven a subir en orden sin intervencion manual.  |
| 2026-08-14 | Seguridad de operaciones  | Pruebas unitarias rechazan production y nombres de base no autorizados.         |
| 2026-08-14 | CI de F2                  | Jobs `quality` y `database` del PR `#33` aprobados sobre Node 24 y MySQL 8.4.   |
| 2026-08-14 | Integracion de F2         | PR `#33` integrado en `main` mediante commit `0e8e032`.                         |

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

| Fecha      | Evidencia                  | Resultado                                                            |
| ---------- | -------------------------- | ---------------------------------------------------------------- |
| 2026-08-15 | Migracion a Express 5      | Suite legacy aprobada y wildcard de archivos adaptado y probado.     |
| 2026-08-15 | Pruebas HTTP de plataforma | Ocho escenarios cubren IDs, errores, health, Zod y shutdown.         |
| 2026-08-15 | Contrato OpenAPI           | Documento 3.1.1 validado automaticamente con Swagger Parser.         |
| 2026-08-15 | Suite local                | 15 pruebas aprobadas sin abrir puerto ni requerir MySQL.             |
| 2026-08-15 | Regresion de base de datos | Nueve pruebas pasan antes y despues de reconstruir seis migraciones. |
| 2026-08-15 | CI de F3                   | Jobs `quality` y `database` del PR `#39` aprobados.                  |
| 2026-08-15 | Integracion de F3          | PR `#39` integrado en `main` mediante commit `5f5e461`.              |

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

| Fecha      | Evidencia                  | Resultado                                                           |
| ---------- | -------------------------- | ------------------------------------------------------------------ |
| 2026-08-15 | Politica y JWT             | Seis pruebas cubren schemas, claims, secretos y anti-enumeracion.   |
| 2026-08-15 | Ciclo identity sobre MySQL | Diez pruebas cubren cuenta, sesion, replay, perfil y recovery.      |
| 2026-08-15 | Esquema                    | Migracion reversible agrega `users.auth_version`.                   |
| 2026-08-15 | Contrato                   | OpenAPI 3.1 valida los diez endpoints y dos esquemas de seguridad.  |
| 2026-08-15 | Calidad local              | Lint, tipos, contrato, 21 pruebas rapidas y build pasan.            |
| 2026-08-15 | Reconstruccion MySQL       | 19 pruebas pasan antes y despues del rollback de siete migraciones. |
| 2026-08-15 | CI remoto                  | Jobs `quality` y `database` pasan en el PR #46.                     |
| 2026-08-15 | Integracion                | PR #46 integrado en `beb3a11`; issues y milestone cerrados.         |

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

| Fecha      | Evidencia             | Resultado                                                        |
| ---------- | ---------------------- | --------------------------------------------------------------- |
| 2026-08-17 | Schemas y propiedades | Tres pruebas cubren limites, normalizacion y mass assignment.    |
| 2026-08-17 | Ownership sobre MySQL | Seis pruebas con dos owners cubren CRUD, archivo y restauracion. |
| 2026-08-17 | Contrato              | OpenAPI 3.1 valida cinco operaciones y DTOs de pacientes.        |
| 2026-08-17 | Calidad local         | Lint, tipos, contrato, 24 pruebas rapidas y build pasan.         |
| 2026-08-17 | Reconstruccion MySQL  | 25 pruebas pasan antes y despues de siete migraciones.           |
| 2026-08-17 | CI remoto             | Jobs `quality` y `database` pasan en el PR #53.                  |
| 2026-08-17 | Integracion           | PR #53 integrado en `main` mediante `e56f035`.                   |

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
- [x] CI remoto de F6 y PR abierto.
- [x] PR de F6 integrado.

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

| Fecha      | Evidencia                 | Resultado                                                    |
| ---------- | ------------------------ | ---------------------------------------------------------------- |
| 2026-08-17 | Schemas y decimales       | Cinco pruebas cubren exactitud, limites y mass assignment.   |
| 2026-08-17 | Transacciones sobre MySQL | Ocho pruebas cubren BOLA, rollback, totales y ciclo de vida. |
| 2026-08-17 | Contrato                  | OpenAPI 3.1 valida diez operaciones de planes e items.       |
| 2026-08-17 | Calidad local             | Lint, tipos, contrato, 29 pruebas rapidas y build pasan.     |
| 2026-08-17 | Reconstruccion MySQL      | 33 pruebas pasan antes y despues de ocho migraciones.        |
| 2026-08-17 | CI remoto                 | Jobs `quality` y `database` pasan en el PR #60.              |
| 2026-08-18 | Integracion               | PR #60 integrado en `main` mediante `93bf6b9`.               |

### Enlaces de trabajo F6

- [#54 Definir contrato e invariantes](https://github.com/jcmandujano/odontofy_node/issues/54)
- [#55 Implementar repositorio transaccional](https://github.com/jcmandujano/odontofy_node/issues/55)
- [#56 Migrar listado y detalle](https://github.com/jcmandujano/odontofy_node/issues/56)
- [#57 Migrar mutaciones de planes](https://github.com/jcmandujano/odontofy_node/issues/57)
- [#58 Implementar items y recalculo atomico](https://github.com/jcmandujano/odontofy_node/issues/58)
- [#59 Validar contrato y regresion](https://github.com/jcmandujano/odontofy_node/issues/59)
- [PR #60 Planes de tratamiento transaccionales](https://github.com/jcmandujano/odontofy_node/pull/60)

### Riesgos transferidos

- Las notas de evolucion y su vinculacion clinica pertenecen a F7 y no se
  incluyen en respuestas de F6.
- Las transiciones permitidas entre estados requieren una decision de producto;
  F6 valida enums y timestamps, pero no impone una maquina de estados.
- La UI legacy envia numeros para importes y pagina localmente; F11 la adaptara a
  strings decimales y paginacion del servidor.

## F7 - Expediente clinico

### Objetivos

- Estructurar el historial medico y retirar su escritura JSON generica en v1.
- Conservar autoria, fecha clinica, motivo y versiones append-only.
- Aplicar ownership uniforme a paciente, plan, item y nota.
- Completar un item junto con la nota dentro de una sola transaccion.
- Sustituir borrado fisico por archivado y restauracion idempotentes.

### Entregables

- [x] Rama `refactor/api-v1-f7-clinical-records`.
- [x] [Milestone `API v1 - F7 Expediente clinico`](https://github.com/jcmandujano/odontofy_node/milestone/8).
- [x] Issues #61 a #66 con criterios verificables.
- [x] ADR de versionado, procedencia y conservacion clinica.
- [x] Modulo `clinical-records` con schemas, HTTP, servicio y repositorio.
- [x] Historial medico estructurado con snapshot y revisiones.
- [x] Notas con autoria, fecha clinica, correcciones y ciclo de archivo.
- [x] Referencias plan-item autorizadas y cierre atomico opcional.
- [x] Migracion que normaliza contenido legacy sin descartarlo silenciosamente.
- [x] Contrato OpenAPI 3.1 y guia de integracion frontend.
- [x] Validacion local integral de F7.
- [x] CI remoto de F7 y PR abierto.
- [x] PR de F7 integrado.

### Criterios de salida

- El historial solo cambia mediante el endpoint dedicado y cada cambio conserva
  snapshot, version, autor, fecha y motivo.
- Cada nota propia es recuperable con sus revisiones; ningun endpoint v1 realiza
  borrado fisico.
- IDs ajenos son indistinguibles de IDs inexistentes y no filtran relaciones.
- Una nota y el cierre opcional del item confirman o revierten juntos.
- Notas o items cancelados no aceptan mutaciones incompatibles.
- OpenAPI, pruebas rapidas, pruebas MySQL, rollback y build pasan en CI.

### Evidencias

| Fecha      | Evidencia                 | Resultado                                                         |
| ---------- | ------------------------- | --------------------------------------------------------------- |
| 2026-08-18 | Schemas clinicos          | Cuatro pruebas cubren cuestionario, referencias y DTOs estrictos. |
| 2026-08-18 | Transacciones sobre MySQL | Cinco pruebas cubren BOLA, versionado, archivo y rollback.        |
| 2026-08-18 | Calidad local             | Lint, tipos, contrato, 33 pruebas rapidas y build pasan.          |
| 2026-08-18 | Reconstruccion MySQL      | 38 pruebas pasan antes y despues de nueve migraciones.            |
| 2026-08-18 | CI remoto                 | Jobs `quality` y `database` pasan en el PR #67.                   |
| 2026-08-18 | Integracion               | PR #67 integrado en `main` mediante `bb33c72`.                    |

### Enlaces de trabajo F7

- [#61 Definir contrato, retencion y trazabilidad](https://github.com/jcmandujano/odontofy_node/issues/61)
- [#62 Estructurar y versionar historial medico](https://github.com/jcmandujano/odontofy_node/issues/62)
- [#63 Versionar notas con ownership](https://github.com/jcmandujano/odontofy_node/issues/63)
- [#64 Integrar referencias y cierre atomico](https://github.com/jcmandujano/odontofy_node/issues/64)
- [#65 Implementar consulta y ciclo de archivo](https://github.com/jcmandujano/odontofy_node/issues/65)
- [#66 Validar contrato, migraciones y regresion](https://github.com/jcmandujano/odontofy_node/issues/66)
- [PR #67 Expediente clinico versionado](https://github.com/jcmandujano/odontofy_node/pull/67)

### Riesgos transferidos

- La firma clinica, bitacora de lecturas y controles por rol requieren las fases
  de seguridad y observabilidad; las revisiones F7 representan procedencia, no
  una firma criptografica.
- La politica operativa de retencion, exportacion y eliminacion debe validarse
  con asesoria juridica antes de produccion. F7 impide borrado accidental.
- La UI legacy conserva sus DTOs hasta F11, aunque sus mutaciones ya delegan al
  repositorio versionado.

## F8 - Facturacion y catalogos

### Objetivos

- Separar cobranza interna de facturacion fiscal y procesamiento de pagos.
- Unificar cargos, ingresos y saldo del paciente bajo invariantes transaccionales.
- Conservar precios, autoria, correcciones y cancelaciones como evidencia historica.
- Aplicar ownership e idempotencia a catalogos y registros financieros.
- Mantener temporalmente las rutas legacy sobre el mismo motor financiero.

### Entregables

- [x] Rama `refactor/api-v1-f8-billing`.
- [x] [Milestone `API v1 - F8 Facturacion y catalogos`](https://github.com/jcmandujano/odontofy_node/milestone/9).
- [x] Issues #68 a #73 con criterios verificables.
- [x] ADR de alcance, decimales, idempotencia, snapshots y saldos.
- [x] Modulo `billing` con schemas, HTTP, servicio y repositorio.
- [x] Catalogo propio con archivo y reactivacion logicos.
- [x] Registros con snapshots de items, autoria y saldo cronologico.
- [x] Correcciones versionadas y cancelacion logica idempotente.
- [x] Puente de escritura para pagos legacy.
- [x] Contrato OpenAPI 3.1 y guia de integracion frontend.
- [x] Migracion, rollback y reconstruccion MySQL validados.
- [x] Validacion local integral de F8.
- [x] CI remoto de F8 y PR abierto.
- [x] PR de F8 integrado (`e8ad271`).

### Criterios de salida

- Un registro propio usa conceptos propios activos y persiste sus snapshots; un
  cambio posterior al catalogo no altera el historial.
- Dinero viaja como string decimal, se calcula sin punto flotante y respeta
  `DECIMAL(12,2)`.
- Repetir una llave con el mismo payload devuelve el mismo registro; cambiar el
  payload devuelve `409` y no duplica movimientos.
- Alta, correccion y cancelacion bloquean el paciente, recalculan el historial
  cronologico y actualizan su saldo dentro de una sola transaccion.
- Correcciones y cancelaciones conservan revisiones; v1 no borra fisicamente.
- IDs ajenos no revelan recursos y ningun DTO acepta importes calculados o autor.
- La API no se presenta como CFDI ni acepta datos sensibles de tarjetas.
- OpenAPI, pruebas rapidas, pruebas MySQL, rollback y build pasan en CI.

### Evidencias

| Fecha      | Evidencia                 | Resultado                                                         |
| ---------- | ------------------------- | ----------------------------------------------------------------- |
| 2026-08-18 | Investigacion y ADR       | Alcance no CFDI, PCI, idempotencia y locking documentados.        |
| 2026-08-18 | Schemas y decimales       | Tres pruebas cubren exactitud, limites, fechas y mass assignment. |
| 2026-08-18 | Transacciones sobre MySQL | Cinco pruebas cubren BOLA, snapshots, saldos y revisiones.        |
| 2026-08-18 | Calidad local             | Lint, tipos, contrato, 36 pruebas rapidas y build pasan.          |
| 2026-08-18 | Reconstruccion MySQL      | 43 pruebas pasan antes y despues de diez migraciones.             |
| 2026-08-18 | Rollback F8               | Reversion y reaplicacion de la migracion pasan sin residuos.      |
| 2026-08-18 | CI remoto                 | Jobs `quality` y `database` pasan en el PR #74.                    |

### Enlaces de trabajo F8

- [#68 Definir contrato e invariantes](https://github.com/jcmandujano/odontofy_node/issues/68)
- [#69 Asegurar ownership del catalogo](https://github.com/jcmandujano/odontofy_node/issues/69)
- [#70 Implementar repositorio transaccional](https://github.com/jcmandujano/odontofy_node/issues/70)
- [#71 Versionar correcciones y cancelaciones](https://github.com/jcmandujano/odontofy_node/issues/71)
- [#72 Exponer resumen y puente legacy](https://github.com/jcmandujano/odontofy_node/issues/72)
- [#73 Validar migracion, contrato y pruebas](https://github.com/jcmandujano/odontofy_node/issues/73)
- [PR #74 Facturacion interna transaccional](https://github.com/jcmandujano/odontofy_node/pull/74)

### Riesgos transferidos

- CFDI, conciliacion, reembolsos bancarios y un procesador de pagos quedan fuera
  del producto actual y requieren fases propias si se incorporan.
- La UI legacy sigue usando numeros y nombres `payment`; F11 migrara sus DTOs y
  mostrara revisiones, estados e idempotencia nativos de v1.
- Medicion de rendimiento y retry automatico de deadlocks se revisaran en F12;
  F8 usa transacciones cortas y orden estable de bloqueo.

## F9 - Agenda y Google Calendar

### Objetivos

- Hacer de la agenda local la fuente de verdad y separar el proveedor externo.
- Normalizar ownership, tiempos, estados y cancelacion de citas.
- Proteger OAuth y eliminar credenciales en texto plano.
- Persistir reintentos de sincronizacion sin duplicar eventos.
- Mantener adaptadores legacy hasta la migracion Angular de F11.

### Entregables

- [x] Rama `refactor/api-v1-f9-appointments-calendar`.
- [x] [Milestone `API v1 - F9 Agenda y Google Calendar`](https://github.com/jcmandujano/odontofy_node/milestone/10).
- [x] Issues #75 a #80 con criterios verificables.
- [x] ADR de agenda local, OAuth, privacidad y outbox.
- [x] Modulo `appointments` con schemas, HTTP, servicio y repositorios.
- [x] Cancelacion logica, ownership y contrato temporal estricto.
- [x] Conexion Google con PKCE, scope minimo y refresh token cifrado.
- [x] Outbox durable, retry y evento externo idempotente.
- [x] Ruta separada para eventos externos y adaptadores legacy.
- [x] Contrato OpenAPI 3.1 y guia de integracion frontend.
- [x] Migracion de desarrollo que descarta tokens legacy en vez de propagarlos.
- [x] Validacion local integral, rollback y reconstruccion MySQL.
- [x] CI remoto y [PR #81 de F9](https://github.com/jcmandujano/odontofy_node/pull/81) abierto.
- [x] PR de F9 integrado (`073e3a2`).

### Criterios de salida

- Una falla del proveedor no revierte ni elimina una cita local.
- Crear y mutar cita encola el ultimo cambio dentro de la misma transaccion.
- Reintentar usa el mismo ID externo y no crea eventos duplicados.
- Citas canceladas conservan fila y marca temporal; no pueden reactivarse.
- Pacientes y citas ajenos responden como inexistentes; DTOs extra se rechazan.
- OAuth usa state de un solo uso, PKCE S256 y `calendar.events`.
- No existen tokens Google en `users`, respuestas, logs ni eventos exportados.
- Eventos Google ajenos se consultan separados de las citas locales.
- OpenAPI, pruebas rapidas, pruebas MySQL, rollback y build pasan en CI.

### Enlaces de trabajo F9

- [#79 Contrato temporal y ciclo de vida](https://github.com/jcmandujano/odontofy_node/issues/79)
- [#75 Modulo appointments y ownership](https://github.com/jcmandujano/odontofy_node/issues/75)
- [#77 OAuth y conexiones Google](https://github.com/jcmandujano/odontofy_node/issues/77)
- [#78 Sincronizacion durable](https://github.com/jcmandujano/odontofy_node/issues/78)
- [#80 Eventos externos y puente legacy](https://github.com/jcmandujano/odontofy_node/issues/80)
- [#76 Migracion, contrato y regresion](https://github.com/jcmandujano/odontofy_node/issues/76)
- [PR #81 Agenda local y Google Calendar desacoplado](https://github.com/jcmandujano/odontofy_node/pull/81)

### Evidencias

| Fecha      | Evidencia                 | Resultado                                                    |
| ---------- | ------------------------- | ------------------------------------------------------------ |
| 2026-08-18 | Contratos, OAuth y cifrado | 4 pruebas rapidas cubren DTOs, rangos, AES-GCM e IDs estables. |
| 2026-08-18 | Agenda y outbox MySQL     | 5 pruebas cubren BOLA, fallo, retry, cancelacion y externos. |
| 2026-08-18 | Reconstruccion MySQL      | 48 pruebas pasan antes y despues de recrear 11 migraciones.  |
| 2026-08-18 | Rollback F9               | Reversion total y reaplicacion terminan sin residuos.        |
| 2026-08-18 | CI remoto                 | Jobs `quality` y `database` pasan en el PR #81.              |
| 2026-08-22 | Integracion               | PR #81 integrado en `main` mediante `073e3a2`.               |

### Riesgos transferidos

- F12 puede ejecutar la outbox en un worker con scheduler y metricas; F9 expone
  un procesador autenticado y acotado a 25 trabajos.
- La rotacion operativa de claves y alertas de conexiones en
  `REAUTH_REQUIRED` se completaran antes de produccion.
- F11 migrara Angular al contrato v1 y retirara la mezcla visual legacy.

## F10 - Consentimientos, archivos y correo

### Objetivos

- Modelar el flujo real de firma manuscrita y digitalizacion sin prometer firma electronica.
- Encapsular archivos privados con ownership, validacion, integridad y acceso temporal.
- Conservar snapshots e impedir reemplazo o borrado silencioso de evidencia.
- Desacoplar identidad de Brevo mediante correo durable, cifrado e idempotente.
- Mantener solo la compatibilidad legacy que no contradiga estas invariantes.

### Entregables

- [x] Rama `refactor/api-v1-f10-consents-files-mail`.
- [x] [Milestone `API v1 - F10 Consentimientos, archivos y correo`](https://github.com/jcmandujano/odontofy_node/milestone/11).
- [x] Issues #82 a #87 con criterios verificables.
- [x] ADR de alcance fisico-digital, almacenamiento y correo durable.
- [x] Modulo `files` con proveedor GCS intercambiable y ADC.
- [x] Modulo `consents` con plantillas versionadas y constancias inmutables.
- [x] Outbox de correo cifrada con retry e idempotencia Brevo.
- [x] Retiro del endpoint legacy de mailing arbitrario.
- [x] Migracion que descarta URLs legacy no verificables.
- [x] Contrato OpenAPI 3.1 y guia de integracion frontend.
- [x] Validacion local integral, rollback y reconstruccion MySQL.
- [x] CI remoto y [PR #88 de F10](https://github.com/jcmandujano/odontofy_node/pull/88) abierto.
- [x] PR de F10 integrado mediante `6b6c708`.

### Criterios de salida

- Solo PDFs basicos validos y acotados se almacenan con nombre opaco y checksum.
- Archivos ajenos no se distinguen de inexistentes; las URLs duran cinco minutos.
- Un archivo referenciado no se elimina y ninguna respuesta expone bucket u object key.
- Una constancia conserva snapshots y su documento solo puede adjuntarse una vez.
- Constancias y plantillas se archivan o anulan logicamente; no existe borrado v1.
- Editar una plantilla no altera constancias ya registradas.
- Brevo no se invoca en el request de identidad; retry conserva idempotency key.
- OpenAPI, pruebas rapidas, MySQL, rollback, reconstruccion y build pasan.

### Evidencias

| Fecha      | Evidencia                 | Resultado                                                        |
| ---------- | ------------------------- | ---------------------------------------------------------------- |
| 2026-08-22 | Investigacion y ADR       | Limites NOM, OWASP, GCS y Brevo documentados con fuentes oficiales. |
| 2026-08-22 | Calidad local             | Lint, tipos, OpenAPI, 43 pruebas rapidas y build pasan.          |
| 2026-08-22 | Integracion MySQL         | 51 pruebas cubren ownership, snapshots, archivos y retry.        |
| 2026-08-22 | Rollback F10              | Reversion y reaplicacion de F10 terminan sin residuos.           |
| 2026-08-22 | Reconstruccion MySQL      | 12 migraciones y seed sintetico se reconstruyen desde cero.      |
| 2026-08-22 | CI remoto                 | Jobs `quality` y `database` pasan en el PR #88.                   |

### Enlaces de trabajo F10

- [#82 ADR y contrato de seguridad documental](https://github.com/jcmandujano/odontofy_node/issues/82)
- [#83 Almacenamiento privado encapsulado](https://github.com/jcmandujano/odontofy_node/issues/83)
- [#84 Plantillas versionables](https://github.com/jcmandujano/odontofy_node/issues/84)
- [#85 Consentimientos firmados inmutables](https://github.com/jcmandujano/odontofy_node/issues/85)
- [#86 Correo durable desacoplado](https://github.com/jcmandujano/odontofy_node/issues/86)
- [#87 Migracion, contrato y pruebas](https://github.com/jcmandujano/odontofy_node/issues/87)

### Riesgos transferidos

- Antivirus o CDR, webhooks de entrega y politica legal de retencion son requisitos
  previos a produccion y se revisaran en F12.
- F11 debe dejar de enviar `file_url` y usar UUIDs de archivo antes de retirar rutas legacy.
- La aplicacion conserva digitalizaciones; no implementa ni declara firma electronica.

## F11 - Migracion Angular y retiro legacy

### Objetivos

- Migrar el unico consumidor conocido al contrato `/api/v1` completo.
- Preservar la experiencia existente mediante adaptadores tipados en el limite HTTP.
- Retirar la superficie y las capas Express legacy cuando ya no tengan consumidores.
- Dejar una recuperacion verificable que no dependa de cambios de base de datos.

### Entregables

- [x] Ramas `refactor/api-v1-f11-angular-migration` y
  `refactor/api-v1-f11-angular-legacy-retirement`.
- [x] Milestones F11 en API y UI, con issues #89 a #91 y UI #16 a #18.
- [x] Snapshots remotos pre-F11 para ambos repositorios.
- [x] ADR de corte, orden de integracion y recuperacion.
- [x] Infraestructura Angular para envelope, paginacion, refresh y entornos v1.
- [x] Migracion de identidad, pacientes, expediente, planes, billing, agenda,
  archivos y consentimientos.
- [x] Retiro de mounts, Swagger, rutas, controladores, validadores y servicios legacy.
- [x] Calidad local, pruebas de contrato, build y suites backend aprobadas.
- [x] CI remoto y PRs coordinados preparados.

### Criterios de salida

- Ningun servicio Angular construye URLs `/api` fuera de la base `/api/v1`.
- Los flujos financieros usan idempotencia, decimales exactos y ciclo de vida v1.
- Historial medico y notas se escriben por sus endpoints clinicos versionados.
- Consentimientos no almacenan URLs ficticias y solo usan UUIDs privados.
- `/api/auth/login`, `/api/upload/*` y `/api-docs` responden `404`.
- OpenAPI, TypeScript, pruebas, build y suites MySQL pasan.
- El PR UI se integra antes del PR de retiro backend.

### Enlaces de trabajo F11

- [API #89 Corte y recuperacion](https://github.com/jcmandujano/odontofy_node/issues/89)
- [API #90 Retiro legacy](https://github.com/jcmandujano/odontofy_node/issues/90)
- [API #91 Contrato y regresion](https://github.com/jcmandujano/odontofy_node/issues/91)
- [UI #16 Plataforma, identidad y clinica](https://github.com/jcmandujano/odontofy_UI/issues/16)
- [UI #17 Billing, agenda y documentos](https://github.com/jcmandujano/odontofy_UI/issues/17)
- [UI #18 Calidad y rollback](https://github.com/jcmandujano/odontofy_UI/issues/18)
- [PR UI #19 Migracion Angular](https://github.com/jcmandujano/odontofy_UI/pull/19)
- [PR API #92 Retiro legacy](https://github.com/jcmandujano/odontofy_node/pull/92)

### Evidencias F11

| Fecha      | Evidencia             | Resultado                                                        |
| ---------- | --------------------- | ---------------------------------------------------------------- |
| 2026-08-22 | Snapshot UI y API     | Ramas y tags anotados pre-F11 publicados en ambos repositorios.  |
| 2026-08-22 | Calidad Angular       | TypeScript, 13 pruebas Karma y build de produccion pasan.        |
| 2026-08-22 | Calidad API           | Lint, tipos, OpenAPI, 46 pruebas rapidas y build pasan.          |
| 2026-08-22 | Integracion MySQL     | 51 pruebas de identidad y modulos de dominio pasan.              |
| 2026-08-22 | Revision estatica     | Sin consumidores Angular ni mounts backend de rutas legacy.      |
| 2026-08-23 | CI remoto coordinado  | UI/Vercel y jobs API `quality` y `database` pasan en los PRs.    |

## F12 - Cierre arquitectonico y readiness

### Objetivos

- Convertir la arquitectura modular y la frontera Angular en reglas ejecutables.
- Evitar drift entre OpenAPI y el consumidor UI.
- Modernizar dependencias fuera de soporte sin adoptar versiones inestables.
- Separar cierre del refactor de autorizacion para operar datos reales.

### Entregables

- [x] Ramas F12 y snapshots remotos previos en API/UI.
- [x] Milestone F12 e issues API #93 a #98; UI #20 y #21.
- [x] Mapa de modulos, matriz de dependencias y ADR-0014.
- [x] Enums de dominio desacoplados de modelos Sequelize.
- [x] Checkers AST para capas backend y frontera HTTP Angular.
- [x] Validacion automatica de llamadas Angular contra OpenAPI.
- [x] CI Angular, auditoria runtime y Dependency Review en ambos repositorios.
- [x] Angular 21 y SDKs estables de Google actualizados.
- [x] Matriz explicita de readiness y riesgos transferidos a produccion.
- [x] Validacion integral local de F12.
- [x] CI remoto de F12.
- [ ] PRs F12 revisados e integrados.

### Criterios de salida

- Servicios, schemas y types no importan Sequelize, modelos ni DB.
- Toda dependencia entre modulos pertenece a la matriz aprobada.
- Features Angular no importan HttpClient, URL de entorno ni DTOs ApiV1.
- Todas las llamadas Angular descubiertas coinciden con OpenAPI por metodo y ruta.
- Dependencias runtime no tienen hallazgos high o critical.
- Base, pruebas, build, contrato y checks arquitectonicos pasan localmente y en CI.
- Ningun dump ni dato sensible forma parte de Git; el esquema nace de migraciones.
- Los bloqueos operativos impiden declarar readiness productiva prematuramente.

### Recuperacion

- API: `snapshot/pre-f12-api-20260824` / `api-pre-f12-20260824`.
- UI: `snapshot/pre-f12-ui-20260824` / `ui-pre-f12-20260824`.
- F12 no agrega migraciones. Revertir sus merges restaura codigo y toolchains sin
  rollback de datos; los snapshots permiten recuperar ambos repositorios juntos.

### Evidencias F12

| Fecha      | Evidencia                  | Resultado |
| ---------- | -------------------------- | --------- |
| 2026-08-24 | Arquitectura y contrato    | Limites API/UI pasan; 64 llamadas Angular coinciden con OpenAPI. |
| 2026-08-24 | Calidad API                | Lint, tipos, OpenAPI, 46 pruebas rapidas y build pasan. |
| 2026-08-24 | Calidad UI                 | Angular 21, tipos, 13 pruebas Karma y build de produccion pasan. |
| 2026-08-24 | Seguridad runtime          | UI sin avisos; API sin high/critical y tres moderados aceptados. |
| 2026-08-24 | Reconstruccion MySQL       | 51 pruebas pasan antes y despues de recrear 12 migraciones. |
| 2026-08-24 | CI remoto                  | API quality/database/dependency-review y UI quality/dependency-review/Vercel pasan. |

### Enlaces de trabajo F12

- [API #93 a #98](https://github.com/jcmandujano/odontofy_node/milestone/13): arquitectura, limites, contrato, dependencias, resiliencia y cierre.
- [UI #20 y #21](https://github.com/jcmandujano/odontofy_UI/milestone/2): frontera HTTP, CI y evidencia cruzada.
- [PR UI #22](https://github.com/jcmandujano/odontofy_UI/pull/22).
- [PR API #99](https://github.com/jcmandujano/odontofy_node/pull/99).

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
