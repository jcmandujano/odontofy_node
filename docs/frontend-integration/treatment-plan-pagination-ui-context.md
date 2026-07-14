# Treatment Plan Pagination UI Context

## Endpoint actualizado

`GET /patients/:patientId/treatment-plans`

El listado de planes de tratamiento ahora responde con paginacion, siguiendo el mismo contrato usado por `evolution-note`, `patient` y `payment`.

## Query params

| Param | Tipo | Default | Descripcion |
| --- | --- | --- | --- |
| `page` | number | `1` | Pagina actual. Debe ser mayor a 0. |
| `limit` | number | `10` | Cantidad de registros por pagina. Debe ser mayor a 0. |

Ejemplo:

```http
GET /patients/123/treatment-plans?page=1&limit=10
```

## Nuevo formato de respuesta

Antes, `data` era un array directo de planes:

```json
{
  "success": true,
  "message": "Planes de tratamiento obtenidos correctamente",
  "data": []
}
```

Ahora, `data` contiene metadata de paginacion y los planes vienen dentro de `results`:

```json
{
  "success": true,
  "message": "Planes de tratamiento obtenidos correctamente",
  "data": {
    "total": 25,
    "page": 1,
    "perPage": 10,
    "totalPages": 3,
    "results": []
  },
  "errors": null
}
```

## Ajuste requerido en UI

Actualizar el consumo del endpoint para leer la lista desde:

```ts
response.data
```

a:

```ts
response.data.results
```

La UI tambien puede usar:

```ts
response.data.total
response.data.page
response.data.perPage
response.data.totalPages
```

para renderizar controles de paginacion.

## Notas de compatibilidad

Este cambio modifica el contrato del endpoint de listado. Las pantallas que esperaban un array directo deben adaptarse al nuevo objeto paginado.
