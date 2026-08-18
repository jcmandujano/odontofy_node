# Integracion frontend: expediente clinico API v1

Todas las rutas requieren `Authorization: Bearer <token>` y responden con el
envelope v1. Los IDs ajenos y los inexistentes producen la misma respuesta 404.

## Historial medico

| Metodo | Ruta                                                    | Uso                                  |
| ------ | ------------------------------------------------------- | ------------------------------------ |
| `GET`  | `/api/v1/patients/:patientId/medical-history`           | Snapshot actual.                     |
| `PUT`  | `/api/v1/patients/:patientId/medical-history`           | Reemplazo completo y nueva revision. |
| `GET`  | `/api/v1/patients/:patientId/medical-history/revisions` | Historial paginado.                  |

El `PUT` recibe `questionnaireVersion: "1.0"`, `familyHistory`, `answers`,
`otherNotes` y `changeReason`. Cada respuesta usa un `questionId` del contrato y
un valor `YES`, `NO` o `UNKNOWN`. Ya no se envian historiales medicos al crear o
actualizar el recurso general de paciente.

## Notas de evolucion

| Metodo   | Ruta                                                            | Uso                    |
| -------- | --------------------------------------------------------------- | ---------------------- |
| `GET`    | `/api/v1/patients/:patientId/evolution-notes`                   | Listado paginado.      |
| `POST`   | `/api/v1/patients/:patientId/evolution-notes`                   | Alta de nota.          |
| `GET`    | `/api/v1/patients/:patientId/evolution-notes/:noteId`           | Detalle.               |
| `PATCH`  | `/api/v1/patients/:patientId/evolution-notes/:noteId`           | Correccion versionada. |
| `DELETE` | `/api/v1/patients/:patientId/evolution-notes/:noteId`           | Archivado logico.      |
| `POST`   | `/api/v1/patients/:patientId/evolution-notes/:noteId/restore`   | Restauracion.          |
| `GET`    | `/api/v1/patients/:patientId/evolution-notes/:noteId/revisions` | Trazabilidad paginada. |

El listado acepta `page`, `pageSize`, `search`, `status`, `treatmentPlanId` y
`treatmentPlanItemId`. `status` puede ser `active`, `archived` o `all`.

Al crear, `completeTreatmentItem: true` exige `treatmentPlanId` y
`treatmentPlanItemId`. La nota y el cambio del item se confirman juntos o se
revierten juntos. `PATCH`, `DELETE` y restauracion exigen `changeReason`.

Los clientes deben mostrar `author`, `occurredAt`, `version` y `archivedAt`, y
no deben presentar una correccion como si hubiera reemplazado el registro
original: las revisiones siguen disponibles en su endpoint dedicado.
