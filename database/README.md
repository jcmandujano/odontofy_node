# Base de datos local

F2 usa MySQL 8.4 en un contenedor aislado. El contenedor solo contiene datos
sinteticos y expone el puerto `3307` para no interferir con otra instalacion local.

## Flujo de desarrollo

```bash
npm run db:up
npm run db:migrate:test
npm run db:seed:test
npm run test:database
```

`npm run db:rebuild:test` revierte seeds y migraciones antes de reconstruir la
base de pruebas. La configuracion rechaza `production` y cualquier nombre que no
comience con `odontofy_` y termine en `_dev` o `_test`, segun el ambiente.

`npm run db:down` detiene el contenedor sin eliminar su volumen. No existe un
comando versionado que borre volumenes o una base no validada.

## Fuente de verdad

- `database/migrations`: estructura, foreign keys, checks e indices.
- `database/seeders`: catalogos sinteticos y repetibles.
- `docs/architecture/f2-target-schema.md`: decisiones y compatibilidad legacy.

Los archivos SQL manuales anteriores dejan de ser ejecutables y se eliminan al
quedar representada su intencion en las migraciones.
