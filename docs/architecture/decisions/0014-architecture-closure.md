# ADR-0014: limites ejecutables y cierre arquitectonico

- Estado: Accepted
- Fecha: 2026-08-24

## Contexto

F3 a F11 reemplazaron la API legacy por un monolito modular y migraron su unico
consumidor conocido. La separacion controller/service/repository ya era visible,
pero dependia de disciplina humana: estados de dominio aun salian de modelos
Sequelize, Angular no tenia CI propio y nada comparaba sus llamadas completas con
OpenAPI.

F12 debe reducir drift sin introducir microservicios, contenedores de inyeccion o
frameworks arquitectonicos que el tamano actual no justifica.

## Decision

1. Se conserva el monolito modular. Las raices de composicion ensamblan capacidades
   y cada modulo mantiene router, controller, service, repository, schemas y types.
2. Enums compartidos se mueven a `src/types`. Dentro de modulos, solo repositorios
   pueden importar modelos Sequelize o la conexion DB.
3. Las dependencias entre modulos se reducen a una matriz explicita. Identidad es
   la capacidad compartida de autenticacion; consentimientos usa archivos e
   identidad usa la outbox de correo.
4. Dos checkers basados en el parser TypeScript hacen fallar CI cuando se viola la
   matriz, persistencia cruza capas o Angular evita su frontera HTTP.
5. OpenAPI sigue siendo el contrato fuente. Un checker AST descubre llamadas
   Angular y valida sus 64 operaciones por metodo y path.
6. Ambos repositorios ejecutan CI propio, auditoria runtime y Dependency Review.
7. Angular se actualiza secuencialmente 19 -> 20 -> 21. Sequelize permanece en v6:
   la documentacion oficial mantiene v7 como alpha.
8. La readiness operativa se registra aparte. Antivirus/CDR, worker programado de
   Calendar, rotacion, restore, alertas y revision legal bloquean produccion, pero
   no se simulan con flags que puedan dar una falsa garantia.

## Referencias

- TypeScript AST y restriccion de imports en ESLint:
  https://eslint.org/docs/latest/rules/no-restricted-imports
- OpenAPI Specification: https://spec.openapis.org/oas/latest.html
- Dependency Review: https://docs.github.com/en/code-security/concepts/supply-chain-security/dependency-review
- npm audit: https://docs.npmjs.com/cli/audit/
- Angular Update Guide: https://v20.angular.dev/update-guide
- Sequelize releases: https://sequelize.org/releases/
- Sequelize v7 alpha: https://sequelize.org/docs/v7/
- OWASP File Upload Cheat Sheet:
  https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html

## Consecuencias

- Una violacion futura se detecta antes del merge y muestra archivo/linea.
- UI y API no pueden evolucionar rutas de forma independiente sin romper CI.
- Las excepciones arquitectonicas son visibles y requieren una decision versionada.
- F12 termina el refactor, mientras los riesgos operativos permanecen como gates
  verificables de un proyecto de produccion posterior.
