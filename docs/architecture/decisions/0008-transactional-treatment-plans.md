# ADR-0008: Planes de tratamiento transaccionales

- Estado: Accepted
- Fecha: 2026-08-17

## Contexto

Un plan es un agregado cuyos importes dependen de sus items. La implementacion
legacy crea, cambia o elimina el item y recalcula el plan mediante operaciones
separadas. Dos solicitudes concurrentes pueden perder actualizaciones o dejar
`subtotal`, `discount` y `total` desalineados. Ademas usa `number` y `toFixed`
para dinero, acepta asignacion amplia y carga notas clinicas pertenecientes a F7.

F6 debe migrar este agregado a `/api/v1` sin retirar las rutas legacy antes de
F11 y sin imponer transiciones de estado que producto todavia no ha definido.

## Decision

- El modulo `treatment-plans` agrupa schemas, HTTP, aplicacion, aritmetica
  decimal y persistencia. Los modelos Sequelize no salen del repositorio.
- El owner se obtiene del access token. Cada plan se busca por `id` y `user_id`;
  cada item se busca por `id` y `treatment_plan_id` despues de autorizar el plan.
  Recursos ajenos e inexistentes producen el mismo `404` por tipo de recurso.
- Las mutaciones de items y descuentos usan transacciones administradas. Se
  bloquea la fila del plan con `SELECT ... FOR UPDATE`, se muta el item, se
  recalculan importes y se confirma todo como una sola unidad.
- Dinero y cantidades entran y salen de HTTP como strings decimales con dos
  posiciones. La aplicacion convierte a unidades enteras con `BigInt`, redondea
  el subtotal de cada item una sola vez y nunca usa punto flotante para sumar.
- MySQL conserva importes en `DECIMAL(12,2)`. Un `CHECK` exige que el descuento
  no exceda el subtotal y que el total no sea negativo; la migracion normaliza
  previamente cualquier dato sintetico de desarrollo que viole esa regla.
- El descuento de un plan vacio debe ser cero. Toda mutacion que dejaria el
  descuento por encima del subtotal falla y revierte la transaccion completa.
- Los items `CANCELLED` se conservan, no contribuyen al subtotal y pueden
  restaurarse mediante el endpoint de estado. `DELETE` de plan o item es una
  cancelacion logica idempotente; no destruye historia relacionada.
- Un plan cancelado no admite mutaciones de items hasta restaurarse. Los estados
  validos se pueden seleccionar libremente porque las transiciones permitidas
  requieren una decision de producto. El modulo solo mantiene coherentes
  `acceptedAt`, `rejectedAt` y `completedAt`.
- El listado esta paginado, ordenado por `created_at DESC, id DESC` y devuelve
  resumenes. El detalle contiene items ordenados, pero no notas de evolucion.
- DTOs estrictos camelCase impiden asignar owner, IDs, estado, subtotales o
  timestamps fuera de sus operaciones dedicadas. Todas las respuestas privadas
  llevan `Cache-Control: no-store`.

## Consecuencias

- Una mutacion concurrente espera el bloqueo del plan en lugar de sobrescribir
  un total calculado por otra solicitud.
- Los clientes deben tratar dinero como decimal textual y convertirlo solo para
  presentacion. F11 adaptara Angular al contrato v1.
- Cancelar un item puede fallar si el descuento restante ya no cabe en el nuevo
  subtotal; el usuario debe reducir primero el descuento.
- Los registros cancelados permanecen disponibles en el detalle. Una politica
  de retencion o auditoria mas rica puede agregarse sin recuperar filas borradas.
- La maquina de estados queda deliberadamente abierta. Cuando producto defina
  transiciones, se incorporaran en el servicio y en el contrato sin cambiar los
  valores persistidos.

## Referencias

- Sequelize v6, transacciones y locks: https://sequelize.org/docs/v6/other-topics/transactions/
- MySQL 8.0, tipos numericos exactos: https://dev.mysql.com/doc/refman/8.0/en/numeric-type-syntax.html
- OWASP API1:2023 BOLA: https://owasp.org/API-Security/editions/2023/en/0xa1-broken-object-level-authorization/
- OWASP API3:2023 Object Property Authorization: https://owasp.org/API-Security/editions/2023/en/0xa3-broken-object-property-level-authorization/
- RFC 9110, metodos idempotentes: https://www.rfc-editor.org/rfc/rfc9110.html#name-idempotent-methods
- OpenAPI decimal format: https://spec.openapis.org/registry/format/decimal
