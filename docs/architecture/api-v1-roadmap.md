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
| F1  | Linea base de calidad              | VALIDATING | Build, lint, pruebas y CI reproducibles.                     |
| F2  | Base de datos reproducible         | PENDING    | Esquema normalizado creado solo desde migraciones.           |
| F3  | Plataforma HTTP y contrato v1      | PENDING    | `/api/v1`, errores, observabilidad y OpenAPI disponibles.    |
| F4  | Identidad y acceso                 | PENDING    | Auth, sesiones y perfil migrados al primer modulo v1.        |
| F5  | Pacientes                          | PENDING    | Pacientes migrados con ownership y DTOs estrictos.           |
| F6  | Planes de tratamiento              | PENDING    | Planes e items transaccionales en v1.                        |
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
- [ ] Ejecucion exitosa del workflow en el PR de F1.
- [ ] PR de F1 revisado e integrado.

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

### Enlaces de trabajo F1

- [#22 Fijar runtime y sanear dependencias](https://github.com/jcmandujano/odontofy_node/issues/22)
- [#23 Separar createApp del arranque](https://github.com/jcmandujano/odontofy_node/issues/23)
- [#24 Agregar pruebas de caracterizacion HTTP](https://github.com/jcmandujano/odontofy_node/issues/24)
- [#25 Resolver lint y typecheck](https://github.com/jcmandujano/odontofy_node/issues/25)
- [#26 Integrar GitHub Actions](https://github.com/jcmandujano/odontofy_node/issues/26)

### Riesgos transferidos

- La actualizacion mayor de Express 5 se evaluara en F3 junto con la plataforma
  HTTP para evitar mezclar cambios de framework con esta linea base.
- Las rutas transitivas de `uuid` se resolveran al actualizar Sequelize en F2 y
  las integraciones Google en F9/F10. El detalle esta en
  [`f1-dependency-audit.md`](./f1-dependency-audit.md).

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
