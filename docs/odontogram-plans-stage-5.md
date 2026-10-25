# Etapa 5: borrador de plan desde el odontograma

## Flujo

Generar plan abre una revisión de los tratamientos asociados a **todo** el odontograma, independientemente de la pieza filtrada en pantalla. Cada tratamiento se muestra una sola vez, con sus hallazgos, cantidad, precio de referencia, importe y disponibilidad. El médico elige hasta 100 tratamientos, captura un título y confirma haber revisado la selección y el total.

Solo se agrupan tratamientos independientes, vinculados al catálogo, no cancelados y sin cargo confirmado. Los ya incluidos en un plan o financieramente fijados permanecen como referencia; no se trasladan entre planes ni se duplican. Un tratamiento completado clínicamente, pero independiente y sin cargo, puede seleccionarse; su estado se conserva. No se exige que el catálogo siga activo para agrupar un tratamiento previamente asignado: se conserva su fotografía de nombre/precio.

Se crea un nuevo plan DRAFT con descuento cero y el importe exacto de los tratamientos seleccionados. No se crean nuevas intervenciones: únicamente se actualiza treatment_plan_id de las mismas filas. Se mantienen IDs, nombre/precio, cantidades, notas, estado clínico, fechas, referencias a hallazgos y recibos de anticipo. Esos tratamientos dejan de aparecer como independientes y se administran desde el plan.

Crear el borrador no acepta el plan, no confirma cargos, no registra pagos ni consume anticipos. El saldo e ingreso financiero permanecen iguales. El descuento y otros datos de cotización pueden ajustarse después con las herramientas existentes del plan, sujeto a sus bloqueos financieros.

## API y concurrencia

- GET /odontograms/:odontogramId/treatment-plan-preview no muta datos. Devuelve tratamientos únicos, hallazgos y una revisión opaca por tratamiento. Los no seleccionables incluyen la causa: ALREADY_IN_PLAN, CHARGE_CONFIRMED, CANCELLED o CATALOG_REQUIRED.
- POST /odontograms/:odontogramId/treatment-plans requiere Idempotency-Key UUID y un cuerpo con title, expectedSubtotal y treatments: [{ treatmentId, revision }]. No acepta precios libres, descuento, estado, plan de destino ni confirmación de cargos.
- La revisión verifica que los datos y vínculos relevantes no hayan cambiado desde la consulta. El subtotal se recalcula en centavos y debe coincidir con lo revisado. Una selección obsoleta, desvinculada o no elegible falla por completo, sin plan vacío ni traslado parcial.
- La transacción toma el bloqueo del paciente, odontograma y tratamientos. Se evitan grupos duplicados ante reintentos, doble clic y operaciones competidoras. La solicitud normaliza el orden de selección para su huella idempotente.
- Repetir una operación exitosa devuelve el mismo plan, aunque este haya cambiado después. No restaura tratamientos ni fuerza estados anteriores. Reusar la llave con otra selección/título/importes produce conflicto. Una nueva llave no permite volver a agrupar tratamientos que ya están en un plan.

El plan expone sourceOdontogramId en listados y detalle. Su origen se muestra con un enlace al odontograma exacto, además de las referencias clínicas de cada tratamiento. La API conserva las rutas y comportamiento para planes creados manualmente.

## Migración y límites

Aplicar npm run db:migrate en la API antes de habilitar la UI. 202610240004-odontogram-treatment-plans agrega origen nullable, llave/huella de creación e índice único a los planes. No transforma ni duplica planes anteriores. El rollback rechaza retirar el origen o trazabilidad de planes generados.

No se agregan tratamientos a planes existentes desde el odontograma, no se mueven tratamientos ya confirmados financieramente y no hay copia de intervenciones, generación de cargos, aceptación automática ni exportación de cotizaciones. Estas decisiones mantienen acotado el MVP. La etapa 6 pendiente es la revisión integral y de compatibilidad histórica.
