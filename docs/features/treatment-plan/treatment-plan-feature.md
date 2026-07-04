# Feature: Plan de Tratamiento - Odontofy API

## Objetivo

Implementar el módulo de Plan de Tratamiento en la API de Odontofy.

Un plan de tratamiento permite que un médico cree una propuesta clínica y administrativa para un paciente, agrupando procedimientos, tratamientos o servicios sugeridos, junto con diagnóstico, observaciones, costos estimados y estado de avance.

---

## Contexto del producto

Odontofy es una aplicación SaaS para consultorios dentales pequeños y dentistas independientes.

El sistema actualmente está diseñado para un solo médico por cuenta. No existe soporte multiusuario, roles, clínicas, sucursales, facturación, pagos en línea ni firma digital.

Este feature debe mantener la simplicidad del producto.

---

## Alcance MVP

La primera versión del módulo debe permitir:

1. Crear planes de tratamiento para pacientes.
2. Consultar planes de tratamiento por paciente.
3. Consultar el detalle de un plan.
4. Actualizar información general del plan.
5. Cancelar o eliminar un plan.
6. Agregar procedimientos o tratamientos al plan.
7. Editar procedimientos del plan.
8. Eliminar procedimientos del plan.
9. Cambiar estado del plan.
10. Cambiar estado de los procedimientos.
11. Calcular subtotal, descuento y total estimado.

---

## Fuera de alcance para MVP

No implementar todavía:

1. Firma digital.
2. Generación de PDF.
3. Odontograma.
4. Asociación automática con pagos.
5. Asociación automática con citas.
6. Versionado de planes.
7. Portal del paciente.
8. Facturación.
9. Pagos en línea.
10. Multiusuario o roles.

---

## Modelo de dominio

Un usuario puede tener muchos pacientes.

Un paciente puede tener muchos planes de tratamiento.

Un plan de tratamiento pertenece a un solo paciente.

Un plan de tratamiento pertenece a un solo usuario.

Un plan de tratamiento puede tener muchos ítems de tratamiento.

Un ítem de tratamiento puede estar asociado opcionalmente a un concepto del catálogo del usuario.

---

## Entidades propuestas

## TreatmentPlan

Campos sugeridos:

| Campo                 | Tipo     | Requerido | Descripción                     |
| --------------------- | -------- | --------- | ------------------------------- |
| id                    | number   | Sí        | Identificador del plan          |
| user_id               | number   | Sí        | Usuario/médico dueño del plan   |
| patient_id            | number   | Sí        | Paciente asociado               |
| title                 | string   | Sí        | Nombre del plan                 |
| description           | text     | No        | Descripción general             |
| diagnosis             | text     | No        | Diagnóstico                     |
| patient_complaint     | text     | No        | Motivo referido por el paciente |
| clinical_observations | text     | No        | Observaciones clínicas          |
| prognosis             | text     | No        | Pronóstico                      |
| status                | enum     | Sí        | Estado del plan                 |
| estimated_start_date  | date     | No        | Fecha estimada de inicio        |
| estimated_end_date    | date     | No        | Fecha estimada de finalización  |
| accepted_at           | datetime | No        | Fecha de aceptación             |
| rejected_at           | datetime | No        | Fecha de rechazo o cancelación  |
| acceptance_notes      | text     | No        | Notas de aceptación o rechazo   |
| subtotal              | decimal  | Sí        | Suma de subtotales de ítems     |
| discount              | decimal  | Sí        | Descuento aplicado              |
| total                 | decimal  | Sí        | Total estimado                  |
| createdAt             | datetime | Sí        | Fecha de creación               |
| updatedAt             | datetime | Sí        | Fecha de actualización          |

Estados permitidos:

```ts
DRAFT
PROPOSED
ACCEPTED
IN_PROGRESS
COMPLETED
CANCELLED
```

---

## TreatmentPlanItem

Campos sugeridos:

| Campo             | Tipo     | Requerido | Descripción                       |
| ----------------- | -------- | --------- | --------------------------------- |
| id                | number   | Sí        | Identificador del ítem            |
| treatment_plan_id | number   | Sí        | Plan al que pertenece             |
| user_concept_id   | number   | No        | Concepto del catálogo del usuario |
| name              | string   | Sí        | Nombre del tratamiento            |
| description       | text     | No        | Descripción del tratamiento       |
| tooth             | string   | No        | Diente relacionado                |
| area              | string   | No        | Zona, cuadrante o región          |
| quantity          | number   | Sí        | Cantidad                          |
| unit_price        | decimal  | Sí        | Precio unitario                   |
| subtotal          | decimal  | Sí        | quantity * unit_price             |
| phase             | string   | No        | Fase del tratamiento              |
| priority          | enum     | No        | Prioridad                         |
| status            | enum     | Sí        | Estado del ítem                   |
| notes             | text     | No        | Notas clínicas o administrativas  |
| sort_order        | number   | No        | Orden dentro del plan             |
| completed_at      | datetime | No        | Fecha de finalización             |
| createdAt         | datetime | Sí        | Fecha de creación                 |
| updatedAt         | datetime | Sí        | Fecha de actualización            |

Estados permitidos:

```ts
PENDING
APPROVED
IN_PROGRESS
COMPLETED
CANCELLED
```

Prioridades permitidas:

```ts
LOW
MEDIUM
HIGH
URGENT
```

---

## Reglas de negocio

1. El paciente debe pertenecer al usuario autenticado.
2. El plan debe pertenecer al usuario autenticado.
3. Un usuario no puede acceder a planes de pacientes de otro usuario.
4. El título del plan es obligatorio.
5. El estado inicial por defecto debe ser `DRAFT`.
6. El descuento no puede ser negativo.
7. La cantidad de cada ítem debe ser mayor a 0.
8. El precio unitario no puede ser negativo.
9. El subtotal de cada ítem se calcula como `quantity * unit_price`.
10. El subtotal del plan se calcula como la suma de los subtotales de sus ítems.
11. El total del plan se calcula como `subtotal - discount`.
12. Cada vez que se agrega, edita o elimina un ítem, se deben recalcular los totales del plan.
13. Si se envía `user_concept_id`, debe existir y pertenecer al usuario autenticado.
14. El plan de tratamiento no representa un pago real.
15. Los pagos reales deben seguir registrándose desde el módulo de pagos.

---

## Endpoints MVP

### GET `/patients/:patientId/treatment-plans`

Obtiene los planes de tratamiento de un paciente.

### POST `/patients/:patientId/treatment-plans`

Crea un plan de tratamiento para un paciente.

### GET `/treatment-plans/:id`

Obtiene el detalle de un plan, incluyendo sus ítems.

### PUT `/treatment-plans/:id`

Actualiza la información general de un plan.

### DELETE `/treatment-plans/:id`

Cancela o elimina un plan.

### PATCH `/treatment-plans/:id/status`

Actualiza el estado general del plan.

### POST `/treatment-plans/:id/items`

Agrega un ítem al plan.

### PUT `/treatment-plans/:id/items/:itemId`

Actualiza un ítem del plan.

### DELETE `/treatment-plans/:id/items/:itemId`

Elimina un ítem del plan.

### PATCH `/treatment-plans/:id/items/:itemId/status`

Actualiza el estado de un ítem.

---

## Formato de respuesta

Todas las respuestas deben usar el formato estándar de Odontofy.

Respuesta exitosa:

```json
{
  "success": true,
  "message": "Operación realizada correctamente",
  "data": {},
  "errors": null
}
```

Respuesta con error:

```json
{
  "success": false,
  "message": "No se pudo realizar la operación",
  "data": null,
  "errors": {}
}
```

---

## Criterios de aceptación generales

1. El feature respeta la arquitectura Route → Middlewares → Controller → Service → Model → Response.
2. Los controllers no contienen lógica de negocio.
3. Los services no usan `req` ni `res`.
4. Todas las respuestas usan `successResponse` y `errorResponse`.
5. Todas las validaciones están en middlewares.
6. Todos los endpoints requieren autenticación.
7. Se valida que el paciente pertenece al usuario autenticado.
8. Se valida que el plan pertenece al usuario autenticado.
9. Los totales se recalculan correctamente.
10. El código sigue las convenciones de naming del proyecto.
