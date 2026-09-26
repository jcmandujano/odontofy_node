# Integracion frontend: odontogramas v1

## Alcance

La API permite que un paciente tenga multiples odontogramas independientes. Un
odontograma es `ADULT` o `PEDIATRIC`, contiene hallazgos FDI y puede archivarse
sin eliminarse. Citas, planes de tratamiento y notas de evolucion no requieren
un odontograma.

La asociacion entre hallazgos e items de tratamiento se agregara en un contrato
posterior. La UI no debe inferir ni crear tratamientos desde estos endpoints.

## Endpoints

- `GET /patients/{patientId}/odontograms`: lista paginada; admite `dentition` y
  `status`.
- `POST /patients/{patientId}/odontograms`: crea un registro nuevo.
- `GET /odontograms/{odontogramId}`: obtiene el detalle y sus hallazgos.
- `PATCH /odontograms/{odontogramId}`: actualiza metadatos o reemplaza la lista
  completa de hallazgos.
- `DELETE /odontograms/{odontogramId}`: archiva de forma idempotente.
- `POST /odontograms/{odontogramId}/restore`: restaura de forma idempotente.

Todas las rutas requieren access token, responden con `Cache-Control: no-store`
y ocultan con `404` los recursos de otros usuarios.

## Hallazgo

```json
{
  "toothCode": "16",
  "condition": "CARIES",
  "surface": "OCCLUSAL_INCISAL",
  "notes": "Lesion visible"
}
```

La denticion adulta acepta las piezas FDI `11-18`, `21-28`, `31-38` y `41-48`.
La pediatrica acepta `51-55`, `61-65`, `71-75` y `81-85`.

`HEALTHY`, `MISSING` y `NOT_ERUPTED` son condiciones exclusivas por pieza. Las
condiciones de pieza completa no admiten superficie. En un `PATCH`, enviar
`findings` reemplaza el conjunto completo de hallazgos; omitirlo conserva los
existentes.
