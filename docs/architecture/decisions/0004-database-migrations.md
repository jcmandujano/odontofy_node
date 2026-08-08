# ADR-0004: Esquema SQL reproducible mediante migraciones

- Estado: Accepted
- Fecha: 2026-08-07

## Contexto

El proyecto esta en desarrollo, los datos son descartables y los cambios de esquema
se distribuyen actualmente entre un dump y scripts SQL manuales.

## Decision

La base de desarrollo y la base MySQL local de pruebas se reconstruiran desde cero.
Sequelize CLI administrara una migracion base normalizada y las migraciones
incrementales posteriores.

El esquema usara nombres `snake_case`, claves foraneas, nulabilidad, checks e indices
coherentes con las consultas reales. Los seeds solo contendran datos sinteticos.
Los scripts de reset validaran el ambiente y el nombre de la base antes de eliminar
objetos.

## Consecuencias

- El dump versionado se elimina y no se reescribe el historial porque se confirmo
  que no contiene datos productivos.
- Los scripts SQL existentes se retiraran despues de incorporar su intencion a las
  migraciones.
- Los datos actuales de desarrollo no se preservaran.
