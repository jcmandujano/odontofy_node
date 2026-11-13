# Etapa 3: pagos directos de catálogo y abonos

## Operación del MVP

Agregar pago selecciona servicios del catálogo, con precio unitario de servidor, cantidad, descuento existente e importe recibido. No crea un tratamiento del paciente, plan ni cargo de tratamiento. La UI carga todas las páginas del catálogo activo.

Si un registro de servicios tiene un adeudo, Registrar abono captura únicamente fecha, importe recibido y forma de pago. Ejemplo: servicio de $1,000 e ingreso inicial de $400; un abono posterior de $600 deja el total de servicios en $1,000, ingresos acumulados en $1,000 y pendiente cero. No se selecciona ni se cobra otra vez el catálogo para ese abono.

Los abonos generan recibos financieros con total y descuento cero, sin líneas de servicios nuevas y con referencia explícita al registro original. Su descripción procede de los servicios originales. No se crea una bolsa libre de dinero ni se infieren asociaciones por nombre. Los importes recibidos en exceso en registros históricos/directos conservan su comportamiento contable anterior; esta fase no añade distribución automática de crédito.

## Contrato y consistencia

- `POST /api/v1/patients/:patientId/billing-records/:billingRecordId/installments`, con `Idempotency-Key` UUID y `{ occurredOn, amountReceived, paymentMethod }`. Fecha no futura ni anterior al servicio, importe positivo hasta el pendiente. No acepta precios, servicios, totales ni referencias arbitrarias.
- Requiere propiedad del paciente y del registro, origen vigente de servicios de catálogo y sin otro origen. Un abono no puede ser origen de más abonos. El catálogo original puede estar archivado: se paga un adeudo existente, no se crea un servicio nuevo.
- Transacción y bloqueo del paciente serializan abonos, correcciones y cancelaciones. La misma operación devuelve el mismo recibo; cambiar su payload o reutilizar la clave para otro origen produce conflicto. Reintentar un recibo cancelado no lo reactiva.
- `sourceBillingRecordId` identifica recibos de abono. En el origen, `amountPaid` suma ingreso inicial y abonos vigentes; `outstandingAmount` es el pendiente actual, y `hasInstallments` incluye abonos cancelados para conservar trazabilidad. No confundir estos campos con `balanceAfter`, que representa saldo cronológico del paciente.
- Correcciones sin abonos conservan nombre y precio de los servicios originales, aunque cambie o se archive el catálogo. Un servicio diferente toma su precio vigente. Registros con historial de abonos y recibos de abono no se sobrescriben desde corrección.
- Cancelar un abono conserva revisiones y devuelve su importe al pendiente. Para cancelar el servicio original deben cancelarse antes todos sus abonos vigentes; la UI comunica la restricción si se intenta en otro orden. La cancelación no representa devolución bancaria.
- Saldo e informes siguen sumando importes de servicios, cargos anteriores e ingresos vigentes, con centavos exactos. No duplican ingresos por las referencias nuevas.

## Experiencia y compatibilidad

El historial muestra servicios e ingresos individuales. Los abonos llevan la referencia al registro original, importe recibido y total cero. Adeudo del servicio muestra el pendiente actualizado; los recibos no repiten una cifra de adeudo del servicio. Registros sin abonos pueden editarse; los demás conservan cancelación según sus restricciones.

Las capturas permanecen abiertas si falla el servidor y bloquean envíos repetidos durante el guardado. La misma captura conserva su clave de creación para reintentar. Se evita abrir varios diálogos de pago simultáneamente.

El panel anterior deja de aparecer como requisito del recorrido nuevo. `meta.hasTreatmentFinance` en el listado de pagos indica, para todo el paciente y no solo la página visible, si existen cargos o recibos del flujo de tratamientos. Solo entonces se ofrece Movimientos anteriores: cargos y anticipos, plegado inicialmente y cargado al abrir.

Ese acceso permite atender cargos y anticipos anteriores; usa `confirmedOnly=true` para paginar cargos ya confirmados y oculta creación de nuevos anticipos desde filas. No ofrece confirmación de nuevas cotizaciones. El intento de cobrar directamente un catálogo que ya tiene cargo pendiente conserva la protección contra duplicado e indica dónde registrar su abono.

No se convierten pagos, cargos ni anticipos existentes ni se eliminan registros. El indicador de compatibilidad no debe usarse como permiso de autorización ni calcularse únicamente a partir de la página de pagos.

## Migración y despliegue

Aplicar `202611120001-billing-installments.js` antes de desplegar la API nueva y, después, la UI. En desarrollo: `npm run db:migrate`; en producción seguir el procedimiento controlado de migraciones.

La migración añade `payments.source_billing_record_id` nullable, FK a payments con RESTRICT e índice por origen/estado. No rellena asociaciones antiguas ni recalcula importes. El rollback se rechaza si existen abonos, incluso cancelados, para no borrar referencias de auditoría.

## Prueba manual y validación

1. Crear un servicio de catálogo de $1,000. Agregar pago con cantidad 1 e ingreso de $400: debe mostrar pendiente $600 sin pedir plan o tratamiento clínico.
2. Registrar abono de $600 en ese registro. Debe aparecer otro recibo, pendiente del origen cero y saldo neto correcto, sin repetir el servicio.
3. Cambiar el precio del catálogo y verificar que los registros anteriores conservan su precio. Probar edición antes de abonos y pago de un adeudo de servicio archivado.
4. Reintentar la misma solicitud, simular error de conexión y abonar simultáneamente: no duplicar el recibo ni exceder el pendiente. La UI conserva captura y muestra el error.
5. Intentar cancelar el origen con un abono vigente; debe indicar cancelar primero el abono. Cancelar este, comprobar pendiente restituido, después cancelar el origen y revisar auditoría.
6. Con datos anteriores, abrir Movimientos anteriores, abonar un cargo o aplicar saldo ya recibido. Comprobar que no cambia la contabilidad por abrir la pantalla ni permite repetir el cobro desde catálogo.
7. Probar un catálogo de más de 100 servicios y revisar listado y diálogos en escritorio y móvil. Las tablas anchas se desplazan dentro de su región; no debe desbordarse la página.

Validación: checks de API con 61 pruebas, suite MySQL con 91 pruebas, UI con 66 pruebas ChromeHeadless y build de ambos proyectos. Contrato OpenAPI válido y 84 llamadas Angular compatibles. Security check de producción aprobado en ambos; API conserva 8 alertas moderadas preexistentes y UI reporta cero.

Chrome verificó el registro de catálogo de $1,000 con $400 iniciales y $600 posteriores contra la API y MySQL aislados, con total de servicios $1,000, ingresos $1,000, saldo cero y ningún tratamiento clínico creado. Se revisaron 1440 y 390 px sin errores de ejecución ni desborde horizontal de página. Las tablas anchas mantienen desplazamiento local. Las capturas y fixtures son sintéticas y están fuera del repositorio; se limpian al terminar. No se modificó la base local del usuario. Las comprobaciones de esta entrega no incluyen Google Calendar ni datos reales.
