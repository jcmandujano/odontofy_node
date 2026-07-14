# Copilot Tasks: Plan de Tratamiento - Odontofy API

## Instrucciones generales para Copilot

Implementar el feature por fases.

No implementar todo el módulo en una sola respuesta.

Antes de escribir código, revisar:

* `/docs/treatment-plan-feature.md`
* Convenciones del proyecto
* Estructura actual de routes, controllers, services, models y middlewares
* Modelos existentes de `Patient`, `User`, `UserConcept`, `Payment` y otros módulos relacionados

Respetar siempre:

```text
Route → Middlewares → Controller → Service → Model → Response
```

Reglas obligatorias:

1. No colocar lógica de negocio en controllers.
2. No usar `req` ni `res` dentro de services.
3. Usar respuestas estandarizadas.
4. Usar validaciones con middlewares.
5. Usar Sequelize para acceso a base de datos.
6. Validar ownership por `req.authorUid`.
7. No romper endpoints existentes.
8. No modificar módulos no relacionados salvo que sea necesario para agregar relaciones.
9. Mantener mensajes en español.
10. Implementar una fase a la vez.

---

# Fase 1: Models y relaciones Sequelize

## Objetivo

Crear los modelos Sequelize necesarios para el módulo de Plan de Tratamiento.

## Tareas

1. Crear modelo `TreatmentPlan`.
2. Crear modelo `TreatmentPlanItem`.
3. Definir atributos TypeScript.
4. Definir enums necesarios.
5. Definir relaciones:

   * `User.hasMany(TreatmentPlan)`
   * `Patient.hasMany(TreatmentPlan)`
   * `TreatmentPlan.belongsTo(User)`
   * `TreatmentPlan.belongsTo(Patient)`
   * `TreatmentPlan.hasMany(TreatmentPlanItem)`
   * `TreatmentPlanItem.belongsTo(TreatmentPlan)`
   * `TreatmentPlanItem.belongsTo(UserConcept)` opcional
6. Registrar los modelos en la configuración central donde se inicializan los modelos Sequelize.
7. No crear endpoints todavía.

## Criterios de aceptación

* Los modelos compilan correctamente.
* Las relaciones están definidas explícitamente.
* Los nombres en base de datos usan `snake_case`.
* Los nombres en código usan `camelCase`.
* No se modifican controllers ni routes en esta fase.

---

# Fase 2: Services de TreatmentPlan

## Objetivo

Crear la lógica de negocio para administrar planes de tratamiento.

## Tareas

Crear un archivo de service para planes de tratamiento.

Funciones sugeridas:

```ts
createTreatmentPlan
getTreatmentPlansByPatient
getTreatmentPlanById
updateTreatmentPlan
deleteTreatmentPlan
updateTreatmentPlanStatus
recalculateTreatmentPlanTotals
```

Reglas:

1. Validar que el paciente pertenezca al usuario autenticado.
2. Validar que el plan pertenezca al usuario autenticado.
3. No usar `req` ni `res`.
4. Retornar datos o lanzar errores controlados.
5. Recalcular totales cuando sea necesario.
6. No manejar respuestas HTTP.

## Criterios de aceptación

* El service encapsula la lógica de negocio.
* El service puede ser llamado desde controllers.
* Se evita duplicar lógica de validación de ownership.
* No se crean routes en esta fase.

---

# Fase 3: Controllers de TreatmentPlan

## Objetivo

Crear controllers HTTP para planes de tratamiento.

## Tareas

Crear controller con funciones:

```ts
createTreatmentPlan
getTreatmentPlansByPatient
getTreatmentPlanById
updateTreatmentPlan
deleteTreatmentPlan
updateTreatmentPlanStatus
```

Reglas:

1. Extraer datos de `req.params`, `req.body` y `req.query`.
2. Obtener usuario autenticado desde `req.authorUid`.
3. Llamar al service correspondiente.
4. Usar `successResponse` y `errorResponse`.
5. Manejar errores con `try/catch`.
6. No poner lógica de negocio en el controller.

## Criterios de aceptación

* Todas las respuestas tienen formato estándar.
* Los mensajes están en español.
* El controller no accede directamente a Sequelize salvo casos ya establecidos por el proyecto.
* El controller no contiene reglas de negocio complejas.

---

# Fase 4: Validaciones y routes de TreatmentPlan

## Objetivo

Exponer los endpoints del módulo de planes de tratamiento.

## Tareas

1. Crear middlewares de validación con `express-validator`.
2. Crear archivo de rutas para treatment plans.
3. Registrar las rutas en el router principal.
4. Proteger endpoints con autenticación JWT.
5. Aplicar validaciones antes del controller.

Endpoints:

```text
GET /patients/:patientId/treatment-plans
POST /patients/:patientId/treatment-plans
GET /treatment-plans/:id
PUT /treatment-plans/:id
DELETE /treatment-plans/:id
PATCH /treatment-plans/:id/status
```

## Criterios de aceptación

* Todos los endpoints requieren autenticación.
* Todas las validaciones están en middlewares.
* Se respetan los nombres REST.
* Se mantiene `/api` como base URL.
* No se implementan todavía los endpoints de items si no corresponde a esta fase.

---

# Fase 5: TreatmentPlanItem

## Objetivo

Implementar la administración de ítems dentro del plan.

## Tareas

Crear services, controllers, validaciones y rutas para:

```text
POST /treatment-plans/:id/items
PUT /treatment-plans/:id/items/:itemId
DELETE /treatment-plans/:id/items/:itemId
PATCH /treatment-plans/:id/items/:itemId/status
```

Reglas:

1. Validar que el plan pertenezca al usuario autenticado.
2. Si se envía `user_concept_id`, validar que pertenezca al usuario autenticado.
3. Calcular `subtotal = quantity * unit_price`.
4. Recalcular totales del plan después de crear, actualizar o eliminar un ítem.
5. Si el ítem se marca como `COMPLETED`, guardar `completed_at`.

## Criterios de aceptación

* Los ítems se crean correctamente.
* Los totales del plan se recalculan correctamente.
* No se permite modificar ítems de planes de otro usuario.
* El estado del ítem solo acepta valores permitidos.

---

# Fase 6: Checklist de pruebas manuales

## Objetivo

Validar el feature completo antes de conectarlo con frontend.

## Casos de prueba

1. Crear un plan para un paciente existente.
2. Intentar crear un plan para un paciente que no pertenece al usuario.
3. Listar planes de un paciente.
4. Consultar el detalle de un plan.
5. Actualizar datos generales del plan.
6. Cambiar estado de `DRAFT` a `PROPOSED`.
7. Cambiar estado de `PROPOSED` a `ACCEPTED`.
8. Agregar un ítem manual.
9. Agregar un ítem usando `user_concept_id`.
10. Editar cantidad de un ítem.
11. Verificar que el total se recalcula.
12. Eliminar un ítem.
13. Verificar que el total se recalcula.
14. Cambiar estado de un ítem a `COMPLETED`.
15. Cancelar un plan.
16. Validar que todas las respuestas respetan el formato estándar.
17. Validar que todos los mensajes están en español.
18. Validar que endpoints protegidos requieren token.
