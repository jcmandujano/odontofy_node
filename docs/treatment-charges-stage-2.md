# Etapa 2: cargos y aplicaciones de abonos

## Despliegue

Respaldar la base, aplicar `202610240001-treatment-charges` y desplegar la API antes de la UI. En desarrollo ejecutar `npm run db:migrate`; producción conserva su procedimiento de migraciones controladas.

La migración agrega tablas de cargos y aplicaciones, la clasificación del registro financiero y un snapshot del descuento por tratamiento. No transforma registros históricos, no cambia sus importes ni infiere vínculos por nombre o servicio. El rollback se bloquea si existen cargos o abonos nuevos, para evitar pérdida financiera.

## Reglas

- Cotizar, aceptar un plan, guardar un odontograma o completar clínicamente un tratamiento no genera deuda. La confirmación del cargo es explícita y única por tratamiento.
- La confirmación exige catálogo y un tratamiento/plan no cancelado. Usa la cantidad y precio ya guardados; el importe revisado por el médico se valida contra cambios simultáneos.
- Un independiente admite descuento al confirmar. Para planes se distribuye su descuento en centavos, en orden de ID y conservando exactamente el total. El primer cargo fija los snapshots de todos sus tratamientos, incluidos los todavía no confirmados; el resto no genera deuda hasta su confirmación individual.
- Después de esa confirmación, no se agregan servicios ni se cambian cantidades, servicios, precios o descuento de la cotización fijada. Notas, datos clínicos y estados siguen editables. La cotización queda conservada aunque un tratamiento se cancele clínicamente.
- Los cargos confirmados no se sobrescriben. Esta etapa no incluye anulación o sustitución de cargos confirmados: revisar el importe y los pagos históricos antes de confirmar.
- Un pago aplica importes a uno o varios cargos del mismo paciente. Un cargo puede recibir varios abonos. Solo el dinero recibido se registra como ingreso; el abono no genera otro cargo.
- Los pagos usan idempotencia, transacciones y bloqueo por paciente para impedir duplicación o sobrepago simultáneo.
- Corregir un abono requiere cancelarlo con motivo y registrar uno nuevo. La cancelación conserva sus aplicaciones y revisiones, deja de contar el ingreso y devuelve el saldo pendiente del cargo. Cancelar clínicamente un tratamiento o plan no anula cargos ni abonos.
- Por ahora los nuevos abonos no exceden el saldo de los cargos. Anticipos, saldo a favor y su aplicación manual corresponden a la etapa 3. Los saldos a favor históricos no se asignan automáticamente.

## Compatibilidad

Los registros anteriores siguen funcionando. Los nuevos abonos se clasifican como `TREATMENT_PAYMENT`, tienen `total=0`, `amountReceived` igual a la suma de aplicaciones y no llevan líneas de servicios nuevamente. Su descripción se obtiene de las aplicaciones.

Saldo del paciente = cargos nuevos confirmados + cargos de registros históricos vigentes − ingresos vigentes de ambos flujos. Reportes de ingresos, descuentos y cargos incluyen ambos orígenes sin duplicación.

Se bloquea crear un nuevo registro anterior de un servicio si ese paciente ya tiene un cargo pendiente por ese servicio: debe abonarse al cargo o registrarse otra intervención concreta. No se vinculan ni se descuentan automáticamente pagos históricos al confirmar nuevos cargos.

## API

- `GET /patients/:patientId/treatment-charges`: listado paginado, filtros `scope` y `treatmentPlanId`, importes por tratamiento y resumen de toda la selección.
- `POST /patients/:patientId/treatment-charges/:treatmentId/confirmation`: fecha, descuento independiente opcional e importe esperado. Repetir la misma confirmación devuelve el cargo existente.
- `POST /patients/:patientId/treatment-payments`: fecha, medio de pago, aplicaciones e `Idempotency-Key` obligatorio.
- Los registros, cancelaciones y revisiones existentes incluyen el tipo y las aplicaciones del nuevo abono.

## Verificación

Pruebas unitarias de centavos, distribución y validaciones; integración MySQL para concurrencia, propiedad, pagos parciales/múltiples, cancelación, auditoría, reportes e históricos; contratos Angular/OpenAPI y flujos UI con catálogo, confirmación y abonos. Usar exclusivamente una base sintética aislada para las pruebas destructivas de migración.
