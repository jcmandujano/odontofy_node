# Integracion frontend: odontogramas v1

## Alcance

La API permite que un paciente tenga multiples odontogramas independientes. Un
odontograma es `ADULT` o `PEDIATRIC`, contiene hallazgos FDI y puede archivarse
sin eliminarse. Citas, planes de tratamiento y notas de evolucion no requieren
un odontograma.

Un hallazgo puede asociarse a varios items de tratamiento de planes del mismo
paciente. Los planes y sus items tambien pueden existir sin odontograma.

## Endpoints

- `GET /patients/{patientId}/odontograms`: lista paginada; admite `dentition` y
  `status`.
- `POST /patients/{patientId}/odontograms`: crea un registro nuevo.
- `GET /odontograms/{odontogramId}`: obtiene el detalle y sus hallazgos.
- `PATCH /odontograms/{odontogramId}`: actualiza metadatos o reemplaza la lista
  completa de hallazgos.
- `DELETE /odontograms/{odontogramId}`: archiva de forma idempotente.
- `POST /odontograms/{odontogramId}/restore`: restaura de forma idempotente.
- `PUT /odontograms/{odontogramId}/findings/{findingId}/treatment-items/{itemId}`:
  asocia un item existente al hallazgo; repetir la solicitud no duplica el enlace.
- `DELETE /odontograms/{odontogramId}/findings/{findingId}/treatment-items/{itemId}`:
  desvincula el item; repetir la solicitud no produce error.

Todas las rutas requieren access token, responden con `Cache-Control: no-store`
y ocultan con `404` los recursos de otros usuarios.
Un item del mismo usuario pero de otro paciente produce `409`. Un odontograma
archivado debe restaurarse antes de modificar sus enlaces.

## Hallazgo

```json
{
  "toothCode": "16",
  "condition": "CARIES",
  "surface": "OCCLUSAL_INCISAL",
  "notes": "Lesion visible"
}
```

El detalle agrega `treatmentPlanItemIds` y `treatmentPlanItems` a cada hallazgo.
El segundo campo trae `id`, `treatmentPlanId`, `userConceptId`, `name` y `status`
para pintar la relacion y navegar al plan sin consultas adicionales. Primero se
crea el item con la API de planes de tratamiento y luego se vincula su `id`.
Al reemplazar `findings`, los hallazgos que conservan pieza, condicion y
superficie mantienen su `id` y enlaces aunque cambien las notas. Los hallazgos
que se retiran pierden sus enlaces; cambiar pieza, condicion o superficie
equivale a retirar el hallazgo anterior y crear uno nuevo.

La denticion adulta acepta las piezas FDI `11-18`, `21-28`, `31-38` y `41-48`.
La pediatrica acepta `51-55`, `61-65`, `71-75` y `81-85`.

`HEALTHY`, `MISSING` y `NOT_ERUPTED` son condiciones exclusivas por pieza. Las
condiciones de pieza completa no admiten superficie. En un `PATCH`, enviar
`findings` reemplaza el conjunto completo de hallazgos; omitirlo conserva los
existentes.
