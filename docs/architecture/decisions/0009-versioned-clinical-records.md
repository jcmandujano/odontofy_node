# ADR 0009: expediente clinico versionado y conservacion logica

- Estado: aceptado
- Fecha: 2026-08-18

## Contexto

El historial medico se almacenaba como JSON libre dentro de `patients` y las
notas de evolucion permitian edicion y borrado fisico sin conservar autor,
motivo ni versiones. La UI ademas guardaba una nota y completaba un item de
tratamiento mediante dos solicitudes independientes, con riesgo de estado
parcial.

La NOM-004-SSA3-2012 establece requisitos generales del expediente clinico,
confidencialidad y una conservacion minima de cinco anos desde el ultimo acto
medico. Para estomatologia, la NOM-013-SSA2-2015 requiere registrar la evolucion
en cada atencion con fecha, actividad realizada e identificacion del personal.
FHIR separa la definicion de un cuestionario de sus respuestas y distingue la
procedencia clinica (`Provenance`) del registro de seguridad (`AuditEvent`).

Referencias consultadas:

- [NOM-004-SSA3-2012](https://www.dof.gob.mx/normasOficiales/4909/SALUD/SALUD.html)
- [NOM-013-SSA2-2015](https://www.dof.gob.mx/nota_detalle_popup.php?codigo=5462039)
- [FHIR R4 Questionnaire](https://hl7.org/fhir/R4/questionnaire.html)
- [FHIR R4 Provenance](https://hl7.org/fhir/R4/provenance.html)
- [FHIR R4 AuditEvent](https://hl7.org/fhir/R4/auditevent.html)

## Decision

1. `clinical-records` es el unico modulo v1 que modifica historial medico y
   notas de evolucion. Los endpoints generales de pacientes ya no aceptan los
   campos JSON clinicos.
2. El cuestionario v1 usa IDs estables, respuestas `YES`, `NO` o `UNKNOWN`,
   notas por respuesta y una version explicita. Cada reemplazo guarda el
   snapshot actual y una revision append-only en la misma transaccion.
3. Las notas conservan autor original, fecha clinica, version y estado de
   archivo. Crear, corregir, archivar y restaurar agregan una revision con el
   actor y, salvo el alta, un motivo obligatorio.
4. La correccion crea una version nueva; nunca reescribe versiones anteriores.
   El borrado v1 es archivado logico idempotente.
5. Las referencias plan-item se validan contra usuario y paciente. Crear una
   nota puede completar su item dentro de la misma transaccion; cualquier
   conflicto revierte ambas operaciones.
6. Las revisiones impiden mediante llaves foraneas el borrado fisico accidental
   de notas, pacientes o autores que deban conservarse.
7. La migracion convierte el cuestionario legacy conocido y preserva campos no
   reconocidos como texto en `otherNotes`; tambien crea una primera revision
   para registros existentes.

## Consecuencias

- La API obtiene procedencia clinica basica y una historia reconstruible.
- El historial medico ya no puede escribirse durante el alta o PATCH general de
  paciente; el cliente debe usar `/medical-history`.
- Las tablas de revisiones crecen de forma monotona y deben entrar en las
  politicas futuras de respaldo, cifrado, exportacion y retencion.
- La API legacy de notas delega mutaciones al repositorio F7 para no evadir el
  versionado, pero su retiro contractual sigue perteneciendo a F11.
- Esta decision no afirma cumplimiento legal integral. Firma clinica,
  inmutabilidad criptografica, control por roles, bitacora de acceso, privacidad
  y politica operativa de retencion requieren trabajo posterior y revision
  juridica especializada.
