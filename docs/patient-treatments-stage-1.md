# Tratamientos del paciente — etapa 1

## Despliegue

1. Respaldar la base y desplegar la API con su migración antes de habilitar la UI nueva.
2. Ejecutar `npm run db:migrate` en desarrollo; en producción utilizar el procedimiento controlado `npm run db:migrate:production`.
3. La migración `202610130001-patient-treatments` agrega y rellena `patient_id` desde el plan existente, sin cambiar identificadores, enlaces clínicos ni importes. El plan pasa a ser opcional.
4. No ejecutar rollback si existen tratamientos independientes: se bloquea expresamente para evitar pérdida de datos.

## Contrato y compatibilidad

- Listado: `GET /api/v1/patients/:patientId/treatments`, paginado, con filtros `scope=all|independent|plan`, `status` y `treatmentPlanId`.
- Registro independiente: `POST` a esa colección. `userConceptId` es obligatorio. Nombre y precio se copian de un catálogo propio y activo; el cliente no puede definirlos libremente.
- Edición clínica: `PATCH /patients/:patientId/treatments/:itemId`; estado: `PATCH /patients/:patientId/treatments/:itemId/status`.
- Los tratamientos con plan conservan sus endpoints actuales; estos mantienen las actualizaciones y totales en transacción.
- Creaciones de tratamientos con plan también requieren catálogo. `name` y `unitPrice` de creación se aceptan por compatibilidad pero se sustituyen por el catálogo.
- Editar cantidad, notas o estado conserva el precio guardado, incluso si cambia o se archiva el servicio del catálogo. Elegir un servicio distinto toma su nuevo nombre y precio.
- Tratamientos manuales históricos siguen consultables y editables clínicamente; no se crean otros nuevos. No hay cobros ni adeudos nuevos en esta etapa.
- Pagos, generación de planes desde odontograma y vinculación de hallazgos a tratamientos independientes quedan para las siguientes etapas.

## Validación

`npm run check`, `npm run security:check`, `npm run contract:angular -- <ruta_UI>` y pruebas MySQL en una base aislada con migraciones y catálogos sintéticos.
