# Integracion frontend: facturacion interna API v1

Base: `/api/v1`. Todas las rutas requieren `Authorization: Bearer <token>` y
responden con el envelope comun de v1. Los importes se envian y reciben como
strings con dos decimales, por ejemplo `"1250.00"`.

## Alcance

`billing-records` representa cargos, importes recibidos y saldo interno del
paciente. No genera CFDI y no procesa tarjetas. `paymentMethod` solo clasifica la
operacion; el cliente nunca debe enviar numeros de tarjeta, CVV, PIN o credenciales.

## Flujo recomendado

1. Consultar o administrar `GET/POST /billing-concepts`.
2. Crear el registro en `POST /patients/{patientId}/billing-records` con un UUID
   nuevo en `Idempotency-Key`.
3. Reutilizar la misma llave solo al reintentar exactamente el mismo payload.
4. Corregir mediante `PUT .../{billingRecordId}/correction` con motivo obligatorio.
5. Cancelar mediante `POST .../{billingRecordId}/cancellation`; no borrar localmente.
6. Mostrar trazabilidad desde `GET .../{billingRecordId}/revisions`.

Ejemplo de alta:

```json
{
  "occurredOn": "2026-08-18",
  "discount": "100.00",
  "amountReceived": "500.00",
  "paymentMethod": "CASH",
  "items": [{ "conceptId": 12, "quantity": 2 }]
}
```

El servidor obtiene los precios del catalogo autorizado. No acepta `subtotal`,
`total`, `balanceAfter`, autor, estado, version ni snapshots en el input.

## Consultas

- `GET /patients/{patientId}/billing-records`: por defecto solo `POSTED`; admite
  `status`, `dateFrom`, `dateTo`, `page` y `pageSize`.
- `GET /billing/summary`: totales vigentes por rango y `currentBalance` global
  actual, aunque se consulte un rango historico.
- `GET /billing-concepts?status=archived`: conceptos no disponibles para altas.
- `POST /billing-concepts/{conceptId}/reactivate`: restaura un concepto.

`balanceChange` puede ser negativo cuando existe saldo a favor. `balanceAfter`
es una proyeccion cronologica y puede cambiar si se captura o corrige un registro
con fecha anterior.
