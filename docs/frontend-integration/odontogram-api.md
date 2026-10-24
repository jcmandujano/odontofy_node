# Integracion frontend: odontogramas v1

## Alcance

La API permite que un paciente tenga multiples odontogramas independientes. Un
odontograma es `ADULT` o `PEDIATRIC`, contiene hallazgos FDI y puede archivarse
sin eliminarse. Citas, planes de tratamiento y notas de evolucion no requieren
un odontograma.

Un hallazgo puede asociarse a varios tratamientos del mismo paciente, tanto
independientes como de planes. Los tratamientos tambien pueden existir sin odontograma.

## Endpoints

- `GET /patients/{patientId}/odontograms`: lista paginada; admite `dentition` y
  `status`.
- `POST /patients/{patientId}/odontograms`: crea un registro nuevo.
- `GET /odontograms/{odontogramId}`: obtiene el detalle y sus hallazgos.
- `PATCH /odontograms/{odontogramId}`: actualiza metadatos o reemplaza la lista
  completa de hallazgos.
- `DELETE /odontograms/{odontogramId}`: archiva de forma idempotente.
- `POST /odontograms/{odontogramId}/restore`: restaura de forma idempotente.
- `POST /odontograms/{odontogramId}/findings/{findingId}/treatments`: crea y asocia
  un tratamiento independiente del catalogo en una transaccion. Requiere
  `Idempotency-Key` UUID; recibe `userConceptId`, `quantity` y `notes` opcionales.
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
para pintar la relacion. `treatmentPlanId` es nullable para los independientes.
Puede crearse desde el hallazgo o vincularse un tratamiento existente por su `id`.
No se generan planes, cargos o pagos como efecto de estas operaciones.
Al reemplazar `findings`, los hallazgos que conservan pieza, condicion y
superficie mantienen su `id` y enlaces aunque cambien las notas. Los hallazgos
con tratamientos no pueden retirarse ni cambiar pieza, condicion o superficie
sin desvincularlos antes explicitamente (409). Desvincular no elimina tratamientos
ni modifica sus cargos o pagos. Las notas del hallazgo siguen editables.

El listado de tratamientos del paciente y el detalle de planes agregan
`odontogramReferences` para navegar de regreso al odontograma. Ver
`docs/odontogram-treatments-stage-4.md` para reglas de creacion, compatibilidad
historica y migracion.

La denticion adulta acepta las piezas FDI `11-18`, `21-28`, `31-38` y `41-48`.
La pediatrica acepta `51-55`, `61-65`, `71-75` y `81-85`.

`HEALTHY`, `MISSING` y `NOT_ERUPTED` son condiciones exclusivas por pieza. Las
condiciones de pieza completa no admiten superficie. En un `PATCH`, enviar
`findings` reemplaza el conjunto completo de hallazgos; omitirlo conserva los
existentes.
