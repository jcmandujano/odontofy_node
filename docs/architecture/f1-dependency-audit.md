# Auditoria de dependencias F1

Fecha: 2026-08-07

## Alcance

F1 permite actualizaciones compatibles con los rangos semanticos existentes y la
eliminacion de paquetes no utilizados. Los cambios mayores de frameworks,
persistencia e integraciones pertenecen a las fases que pueden validar su
comportamiento de dominio.

## Acciones realizadas

- Se actualizaron Express dentro de v4, Sequelize dentro de v6, MySQL2, Multer y
  Google Cloud Storage dentro de sus lineas compatibles.
- Se actualizaron dependencias directas y transitivas permitidas por el lockfile.
- Se retiraron SendGrid, Nodemailer, swagger-jsdoc, TSLint, Nodemon y tipos o
  plugins asociados que no tenian imports activos.
- Se agregaron Vitest, V8 coverage y Supertest como dependencias de desarrollo.
- No se ejecuto `npm audit fix --force`.

## Resultado

El reporte inicial de GitHub sobre `main` contenia 110 alertas, incluidas 5
criticas y 48 altas. Despues de F1, `npm audit` reporta 8 vulnerabilidades
moderadas y ninguna alta o critica.

Las 8 entradas residuales corresponden al advisory de `uuid` menor a 11.1.1 y
llegan de forma transitiva por Sequelize 6, Google APIs y Google Cloud Storage.
El codigo de Odontofy no importa `uuid` directamente. El advisory afecta las
variantes v3/v5/v6 cuando reciben un buffer del consumidor, superficie que no usa
la aplicacion actualmente.

## Decision

Se acepta temporalmente el riesgo moderado. La correccion automatica propuesta
por npm requiere `--force` y sugiere una version incompatible de Sequelize, por
lo que no es una remediacion valida.

- F2 revisara la dependencia al definir la capa de persistencia y migraciones.
- F9/F10 actualizaran las librerias Google al encapsular calendario y archivos.
- Dependabot y `npm audit` continuaran mostrando cualquier cambio de severidad.
