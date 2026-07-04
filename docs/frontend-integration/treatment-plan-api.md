# Integracion Frontend - Treatment Plan API

## Descripcion general

El modulo de Plan de Tratamiento permite crear, consultar, actualizar, cancelar y cambiar el estado de planes asociados a un paciente. Tambien permite administrar los items clinicos/economicos del plan.

Todos los endpoints del modulo estan montados bajo `/api`, requieren token JWT en el header `Authorization: Bearer <token>` y trabajan con ownership implicito a partir del usuario autenticado. El frontend no debe enviar ni asumir `user_id`: el backend valida que el paciente, el plan, los conceptos y los items pertenezcan al usuario autenticado.

Los importes se manejan en el backend. Cada item calcula su `subtotal` con `quantity * unit_price`; el plan recalcula `subtotal` y `total` cuando cambian items o descuento.

## Formato estandar de respuesta

Las respuestas exitosas del modulo usan el wrapper estandar del proyecto:

```ts
export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T | null;
  errors: unknown | null;
}
```

```json
{
  "success": true,
  "message": "Plan de tratamiento obtenido correctamente",
  "data": {},
  "errors": null
}
```

Los errores de negocio del modulo usan el mismo formato:

```json
{
  "success": false,
  "message": "El plan de tratamiento no existe o no pertenece al usuario autenticado",
  "data": null,
  "errors": null
}
```

Nota: los errores de validacion de `express-validator` se devuelven actualmente con el formato nativo:

```json
{
  "errors": [
    {
      "type": "field",
      "msg": "El titulo es obligatorio",
      "path": "title",
      "location": "body"
    }
  ]
}
```

## Endpoints disponibles

| Metodo | URL | Descripcion |
| --- | --- | --- |
| `GET` | `/api/patients/:patientId/treatment-plans` | Lista los planes de tratamiento de un paciente. |
| `POST` | `/api/patients/:patientId/treatment-plans` | Crea un plan de tratamiento para un paciente. |
| `GET` | `/api/treatment-plans/:id` | Obtiene el detalle de un plan con sus items. |
| `PUT` | `/api/treatment-plans/:id` | Actualiza datos generales del plan. |
| `DELETE` | `/api/treatment-plans/:id` | Cancela logicamente el plan. |
| `PATCH` | `/api/treatment-plans/:id/status` | Actualiza el estado del plan. |
| `POST` | `/api/treatment-plans/:id/items` | Agrega un item al plan. |
| `PUT` | `/api/treatment-plans/:id/items/:itemId` | Actualiza un item del plan. |
| `DELETE` | `/api/treatment-plans/:id/items/:itemId` | Elimina un item del plan. |
| `PATCH` | `/api/treatment-plans/:id/items/:itemId/status` | Actualiza el estado de un item. |

No hay query params definidos para estos endpoints.

## Contratos por endpoint

### GET `/api/patients/:patientId/treatment-plans`

| Campo | Detalle |
| --- | --- |
| Metodo HTTP | `GET` |
| Descripcion | Obtiene todos los planes del paciente, ordenados por `created_at` descendente. |
| Params | `patientId`: entero mayor a 0. |
| Query params | No aplica. |
| Request body | No aplica. |
| Response body | `ApiResponse<TreatmentPlan[]>`. La lista no incluye items. |
| Posibles errores | `400` parametro invalido, `401` token invalido, `404` paciente inexistente o sin ownership, `500` error interno. |

### POST `/api/patients/:patientId/treatment-plans`

| Campo | Detalle |
| --- | --- |
| Metodo HTTP | `POST` |
| Descripcion | Crea un plan en estado `DRAFT`. |
| Params | `patientId`: entero mayor a 0. |
| Query params | No aplica. |
| Request body | `CreateTreatmentPlanRequest`. `title` es obligatorio. |
| Response body | `ApiResponse<TreatmentPlan>` con status HTTP `201`. |
| Posibles errores | `400` body invalido o descuento negativo, `401` token invalido, `404` paciente inexistente o sin ownership, `500` error interno. |

### GET `/api/treatment-plans/:id`

| Campo | Detalle |
| --- | --- |
| Metodo HTTP | `GET` |
| Descripcion | Obtiene el detalle de un plan y sus items. |
| Params | `id`: entero mayor a 0. |
| Query params | No aplica. |
| Request body | No aplica. |
| Response body | `ApiResponse<TreatmentPlan>` con `TreatmentPlanItems` incluido por Sequelize. |
| Posibles errores | `400` parametro invalido, `401` token invalido, `404` plan inexistente o sin ownership, `500` error interno. |

### PUT `/api/treatment-plans/:id`

| Campo | Detalle |
| --- | --- |
| Metodo HTTP | `PUT` |
| Descripcion | Actualiza campos generales del plan. Si cambia `discount`, recalcula totales. |
| Params | `id`: entero mayor a 0. |
| Query params | No aplica. |
| Request body | `UpdateTreatmentPlanRequest`. Todos los campos son opcionales, pero `title` no puede estar vacio si se envia. |
| Response body | `ApiResponse<TreatmentPlan>`. |
| Posibles errores | `400` body invalido o descuento negativo, `401` token invalido, `404` plan inexistente o sin ownership, `500` error interno. |

### DELETE `/api/treatment-plans/:id`

| Campo | Detalle |
| --- | --- |
| Metodo HTTP | `DELETE` |
| Descripcion | Cancela logicamente el plan: `status = CANCELLED` y asigna `rejected_at`. No borra fisicamente el registro. |
| Params | `id`: entero mayor a 0. |
| Query params | No aplica. |
| Request body | No aplica. |
| Response body | `ApiResponse<TreatmentPlan>`. |
| Posibles errores | `400` parametro invalido, `401` token invalido, `404` plan inexistente o sin ownership, `500` error interno. |

### PATCH `/api/treatment-plans/:id/status`

| Campo | Detalle |
| --- | --- |
| Metodo HTTP | `PATCH` |
| Descripcion | Actualiza el estado del plan. Si el estado es `ACCEPTED`, asigna `accepted_at`; si es `CANCELLED`, asigna `rejected_at`. |
| Params | `id`: entero mayor a 0. |
| Query params | No aplica. |
| Request body | `UpdateTreatmentPlanStatusRequest`. |
| Response body | `ApiResponse<TreatmentPlan>`. |
| Posibles errores | `400` estado invalido, `401` token invalido, `404` plan inexistente o sin ownership, `500` error interno. |

### POST `/api/treatment-plans/:id/items`

| Campo | Detalle |
| --- | --- |
| Metodo HTTP | `POST` |
| Descripcion | Agrega un item al plan en estado `PENDING` y recalcula totales del plan. |
| Params | `id`: entero mayor a 0. |
| Query params | No aplica. |
| Request body | `CreateTreatmentPlanItemRequest`. `name`, `quantity` y `unit_price` son obligatorios. |
| Response body | `ApiResponse<{ item: TreatmentPlanItem; treatmentPlan: TreatmentPlan }>` con status HTTP `201`. |
| Posibles errores | `400` body invalido, `401` token invalido, `404` plan/concepto inexistente o sin ownership, `500` error interno. |

### PUT `/api/treatment-plans/:id/items/:itemId`

| Campo | Detalle |
| --- | --- |
| Metodo HTTP | `PUT` |
| Descripcion | Actualiza un item y recalcula totales del plan. |
| Params | `id`: entero mayor a 0, `itemId`: entero mayor a 0. |
| Query params | No aplica. |
| Request body | `UpdateTreatmentPlanItemRequest`. Todos los campos son opcionales, pero `name` no puede estar vacio si se envia. |
| Response body | `ApiResponse<{ item: TreatmentPlanItem; treatmentPlan: TreatmentPlan }>` |
| Posibles errores | `400` body invalido, `401` token invalido, `404` plan/item/concepto inexistente o sin ownership, `500` error interno. |

### DELETE `/api/treatment-plans/:id/items/:itemId`

| Campo | Detalle |
| --- | --- |
| Metodo HTTP | `DELETE` |
| Descripcion | Elimina fisicamente el item y recalcula totales del plan. |
| Params | `id`: entero mayor a 0, `itemId`: entero mayor a 0. |
| Query params | No aplica. |
| Request body | No aplica. |
| Response body | `ApiResponse<{ treatmentPlan: TreatmentPlan }>` |
| Posibles errores | `400` parametro invalido, `401` token invalido, `404` plan o item inexistente/sin ownership, `500` error interno. |

### PATCH `/api/treatment-plans/:id/items/:itemId/status`

| Campo | Detalle |
| --- | --- |
| Metodo HTTP | `PATCH` |
| Descripcion | Actualiza el estado de un item. Si el estado es `COMPLETED`, asigna `completed_at`. |
| Params | `id`: entero mayor a 0, `itemId`: entero mayor a 0. |
| Query params | No aplica. |
| Request body | `UpdateTreatmentPlanItemStatusRequest`. |
| Response body | `ApiResponse<TreatmentPlanItem>`. |
| Posibles errores | `400` estado invalido, `401` token invalido, `404` plan o item inexistente/sin ownership, `500` error interno. |

## Interfaces TypeScript sugeridas para Angular

```ts
export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T | null;
  errors: unknown | null;
}

export type ISODateString = string;

export interface TreatmentPlan {
  id: number;
  user_id: number;
  patient_id: number;
  title: string;
  description: string | null;
  diagnosis: string | null;
  patient_complaint: string | null;
  clinical_observations: string | null;
  prognosis: string | null;
  status: TreatmentPlanStatus;
  estimated_start_date: ISODateString | null;
  estimated_end_date: ISODateString | null;
  accepted_at: ISODateString | null;
  rejected_at: ISODateString | null;
  acceptance_notes: string | null;
  subtotal: number | string;
  discount: number | string;
  total: number | string;
  created_at?: ISODateString;
  updated_at?: ISODateString;
  TreatmentPlanItems?: TreatmentPlanItem[];
}

export interface TreatmentPlanItem {
  id: number;
  treatment_plan_id: number;
  user_concept_id: number | null;
  name: string;
  description: string | null;
  tooth: string | null;
  area: string | null;
  quantity: number | string;
  unit_price: number | string;
  subtotal: number | string;
  phase: string | null;
  priority: TreatmentPlanItemPriority | null;
  status: TreatmentPlanItemStatus;
  notes: string | null;
  sort_order: number;
  completed_at: ISODateString | null;
  created_at?: ISODateString;
  updated_at?: ISODateString;
}

export interface CreateTreatmentPlanRequest {
  title: string;
  description?: string | null;
  diagnosis?: string | null;
  patient_complaint?: string | null;
  clinical_observations?: string | null;
  prognosis?: string | null;
  estimated_start_date?: ISODateString | null;
  estimated_end_date?: ISODateString | null;
  acceptance_notes?: string | null;
  discount?: number;
}

export interface UpdateTreatmentPlanRequest {
  title?: string;
  description?: string | null;
  diagnosis?: string | null;
  patient_complaint?: string | null;
  clinical_observations?: string | null;
  prognosis?: string | null;
  estimated_start_date?: ISODateString | null;
  estimated_end_date?: ISODateString | null;
  acceptance_notes?: string | null;
  discount?: number;
}

export interface UpdateTreatmentPlanStatusRequest {
  status: TreatmentPlanStatus;
  acceptance_notes?: string | null;
}

export interface CreateTreatmentPlanItemRequest {
  user_concept_id?: number | null;
  name: string;
  description?: string | null;
  tooth?: string | null;
  area?: string | null;
  quantity: number;
  unit_price: number;
  phase?: string | null;
  priority?: TreatmentPlanItemPriority | null;
  notes?: string | null;
  sort_order?: number;
}

export interface UpdateTreatmentPlanItemRequest {
  user_concept_id?: number | null;
  name?: string;
  description?: string | null;
  tooth?: string | null;
  area?: string | null;
  quantity?: number;
  unit_price?: number;
  phase?: string | null;
  priority?: TreatmentPlanItemPriority | null;
  notes?: string | null;
  sort_order?: number;
}

export interface UpdateTreatmentPlanItemStatusRequest {
  status: TreatmentPlanItemStatus;
}

export interface TreatmentPlanItemMutationResponse {
  item: TreatmentPlanItem;
  treatmentPlan: TreatmentPlan;
}

export interface DeleteTreatmentPlanItemResponse {
  treatmentPlan: TreatmentPlan;
}
```

## Enums TypeScript

```ts
export enum TreatmentPlanStatus {
  DRAFT = 'DRAFT',
  PROPOSED = 'PROPOSED',
  ACCEPTED = 'ACCEPTED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum TreatmentPlanItemStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum TreatmentPlanItemPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}
```

## Labels sugeridos para UI

```ts
export const TREATMENT_PLAN_STATUS_LABELS: Record<TreatmentPlanStatus, string> = {
  [TreatmentPlanStatus.DRAFT]: 'Borrador',
  [TreatmentPlanStatus.PROPOSED]: 'Propuesto',
  [TreatmentPlanStatus.ACCEPTED]: 'Aceptado',
  [TreatmentPlanStatus.IN_PROGRESS]: 'En progreso',
  [TreatmentPlanStatus.COMPLETED]: 'Completado',
  [TreatmentPlanStatus.CANCELLED]: 'Cancelado',
};

export const TREATMENT_PLAN_ITEM_STATUS_LABELS: Record<TreatmentPlanItemStatus, string> = {
  [TreatmentPlanItemStatus.PENDING]: 'Pendiente',
  [TreatmentPlanItemStatus.APPROVED]: 'Aprobado',
  [TreatmentPlanItemStatus.IN_PROGRESS]: 'En progreso',
  [TreatmentPlanItemStatus.COMPLETED]: 'Completado',
  [TreatmentPlanItemStatus.CANCELLED]: 'Cancelado',
};

export const TREATMENT_PLAN_ITEM_PRIORITY_LABELS: Record<TreatmentPlanItemPriority, string> = {
  [TreatmentPlanItemPriority.LOW]: 'Baja',
  [TreatmentPlanItemPriority.MEDIUM]: 'Media',
  [TreatmentPlanItemPriority.HIGH]: 'Alta',
  [TreatmentPlanItemPriority.URGENT]: 'Urgente',
};
```

## Ejemplos de requests JSON

### Crear plan

```json
{
  "title": "Rehabilitacion integral",
  "description": "Plan por etapas para restauracion funcional y estetica.",
  "diagnosis": "Caries multiples y ausencias dentales",
  "patient_complaint": "Dolor al masticar",
  "clinical_observations": "Requiere control periodontal previo",
  "prognosis": "Favorable con seguimiento",
  "estimated_start_date": "2026-07-01",
  "estimated_end_date": "2026-09-30",
  "acceptance_notes": null,
  "discount": 500
}
```

### Actualizar estado del plan

```json
{
  "status": "ACCEPTED",
  "acceptance_notes": "Paciente acepta el plan completo."
}
```

### Crear item

```json
{
  "user_concept_id": 12,
  "name": "Resina clase II",
  "description": "Restauracion en molar inferior",
  "tooth": "36",
  "area": "Oclusal",
  "quantity": 1,
  "unit_price": 1200,
  "phase": "Fase restaurativa",
  "priority": "HIGH",
  "notes": "Realizar despues de profilaxis",
  "sort_order": 1
}
```

### Actualizar estado de item

```json
{
  "status": "COMPLETED"
}
```

## Ejemplos de responses JSON

### Plan creado

```json
{
  "success": true,
  "message": "Plan de tratamiento creado correctamente",
  "data": {
    "id": 25,
    "user_id": 3,
    "patient_id": 10,
    "title": "Rehabilitacion integral",
    "description": "Plan por etapas para restauracion funcional y estetica.",
    "diagnosis": "Caries multiples y ausencias dentales",
    "patient_complaint": "Dolor al masticar",
    "clinical_observations": "Requiere control periodontal previo",
    "prognosis": "Favorable con seguimiento",
    "status": "DRAFT",
    "estimated_start_date": "2026-07-01T00:00:00.000Z",
    "estimated_end_date": "2026-09-30T00:00:00.000Z",
    "accepted_at": null,
    "rejected_at": null,
    "acceptance_notes": null,
    "subtotal": 0,
    "discount": 500,
    "total": -500,
    "created_at": "2026-06-26T20:00:00.000Z",
    "updated_at": "2026-06-26T20:00:00.000Z"
  },
  "errors": null
}
```

### Detalle de plan con items

```json
{
  "success": true,
  "message": "Plan de tratamiento obtenido correctamente",
  "data": {
    "id": 25,
    "user_id": 3,
    "patient_id": 10,
    "title": "Rehabilitacion integral",
    "status": "ACCEPTED",
    "subtotal": "1200.00",
    "discount": "500.00",
    "total": "700.00",
    "TreatmentPlanItems": [
      {
        "id": 40,
        "treatment_plan_id": 25,
        "user_concept_id": 12,
        "name": "Resina clase II",
        "description": "Restauracion en molar inferior",
        "tooth": "36",
        "area": "Oclusal",
        "quantity": "1.00",
        "unit_price": "1200.00",
        "subtotal": "1200.00",
        "phase": "Fase restaurativa",
        "priority": "HIGH",
        "status": "PENDING",
        "notes": "Realizar despues de profilaxis",
        "sort_order": 1,
        "completed_at": null
      }
    ]
  },
  "errors": null
}
```

### Item agregado

```json
{
  "success": true,
  "message": "Item agregado al plan de tratamiento correctamente",
  "data": {
    "item": {
      "id": 40,
      "treatment_plan_id": 25,
      "user_concept_id": 12,
      "name": "Resina clase II",
      "quantity": 1,
      "unit_price": 1200,
      "subtotal": 1200,
      "status": "PENDING",
      "priority": "HIGH",
      "completed_at": null
    },
    "treatmentPlan": {
      "id": 25,
      "subtotal": 1200,
      "discount": 500,
      "total": 700,
      "status": "DRAFT"
    }
  },
  "errors": null
}
```

### Error de ownership o recurso inexistente

```json
{
  "success": false,
  "message": "El plan de tratamiento no existe o no pertenece al usuario autenticado",
  "data": null,
  "errors": null
}
```

## Reglas importantes para frontend

- Los totales los calcula el backend. El frontend puede mostrar subtotales preliminares para UX, pero debe persistir y renderizar los valores devueltos por la API.
- El frontend no debe asumir ownership ni filtrar por `user_id`. El backend resuelve el usuario desde el JWT y valida pertenencia.
- Todos los endpoints requieren token JWT: `Authorization: Bearer <token>`.
- Los pagos reales siguen en el modulo de pagos. No se debe registrar cobro, ingreso, deuda ni recibo desde Plan de Tratamiento.
- El plan de tratamiento no representa un pago. Es una propuesta clinica/economica, no una transaccion financiera.
- `DELETE /api/treatment-plans/:id` cancela el plan; no lo elimina fisicamente.
- `DELETE /api/treatment-plans/:id/items/:itemId` elimina el item y devuelve el plan recalculado.
- Las fechas pueden enviarse como `YYYY-MM-DD` o ISO 8601; la API responde normalmente como string ISO.
- Los campos monetarios pueden llegar como `number` o `string` segun la serializacion de Sequelize/DECIMAL. En Angular conviene normalizarlos antes de formatear moneda.

## Checklist de integracion para Angular

- Crear modelos/interfaces del modulo en `treatment-plan.models.ts`.
- Crear enums y labels compartidos para estados/prioridades.
- Crear `TreatmentPlanService` con `HttpClient` y base path `/api`.
- Agregar interceptor o helper para enviar `Authorization: Bearer <token>`.
- Implementar listado por paciente: `GET /api/patients/:patientId/treatment-plans`.
- Implementar detalle del plan: `GET /api/treatment-plans/:id`.
- Implementar formularios de creacion/edicion usando `snake_case` en el payload.
- No enviar `subtotal`, `total`, `user_id`, `patient_id`, `accepted_at`, `rejected_at` ni `completed_at` desde formularios.
- Despues de crear, actualizar o borrar items, refrescar el plan con el `treatmentPlan` devuelto o recargar detalle.
- Manejar errores estandar `ApiResponse` y tambien errores de validacion con propiedad `errors` de `express-validator`.
- Convertir importes a numero antes de usar pipes o calculos visuales.
- Usar labels de UI para no mostrar valores crudos como `IN_PROGRESS` al usuario.
