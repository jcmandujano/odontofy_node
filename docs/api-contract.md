# API Contract - Odontofy

## Base URL

```text
/api
```

---

## Formato de Respuesta

Todas las respuestas deben seguir la estructura estandar del proyecto.

### Respuesta exitosa

```json
{
  "success": true,
  "message": "string",
  "data": {},
  "errors": null
}
```

### Respuesta con error

```json
{
  "success": false,
  "message": "string",
  "data": null,
  "errors": {}
}
```

---

## Auth

### POST `/auth/login`

Inicia sesion y devuelve un token de autenticacion.

#### Request

```json
{
  "email": "string",
  "password": "string"
}
```

#### Response

```json
{
  "success": true,
  "message": "Login exitoso",
  "data": {
    "token": "string"
  },
  "errors": null
}
```

---

## Patients

### GET `/patients`

Obtiene un listado paginado de pacientes.

#### Query Params

| Param | Type | Required | Description |
| --- | --- | --- | --- |
| `page` | `number` | No | Numero de pagina. |
| `limit` | `number` | No | Cantidad de registros por pagina. |

#### Response

```json
{
  "success": true,
  "message": "Pacientes obtenidos correctamente",
  "data": {
    "items": [],
    "total": 0
  },
  "errors": null
}
```
