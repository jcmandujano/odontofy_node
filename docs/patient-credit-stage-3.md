# Etapa 3: anticipos de tratamientos y aplicación manual

## Reglas

- Todo anticipo nuevo requiere un tratamiento **del paciente** vinculado al catálogo. Puede pertenecer o no a un plan y no necesita tener cargo confirmado. No se admite una bolsa de dinero sin tratamiento de origen.
- Se conserva el ID y nombre del tratamiento de origen en el recibo. No se permite cambiar su vínculo al catálogo mientras tenga anticipos vigentes. Se mantienen editables sus datos clínicos; cancelarlos clínicamente no cancela el dinero.
- El anticipo registra ingreso una sola vez, sin confirmar un cargo. Se acepta un importe mayor a la cotización. También se puede registrar un abono a cargos y guardar el excedente como anticipo en el mismo recibo.
- Confirmar un cargo **no** consume anticipos. La aplicación es una segunda operación explícita: seleccionar recibo de origen, cargos del mismo paciente e importes. Puede cubrir tratamientos independientes o de planes, aunque sean distintos del tratamiento de origen.
- Aplicar dinero ya recibido no crea pagos, no cambia el ingreso reportado ni el saldo neto del paciente. Únicamente cambia cuánto se ha cubierto de cada cargo y cuánto sigue sin aplicar del recibo.
- El disponible sin aplicar y el saldo neto de la cuenta son distintos: con cargos por $1,000 y anticipo de $1,200, antes de aplicar hay $1,000 pendientes por asignación y $1,200 disponibles; el saldo neto es -$200. Tras aplicar $1,000 quedan $0 pendientes, $200 disponibles y el saldo neto sigue en -$200.
- Las aplicaciones usan centavos exactos, transacción y bloqueo del paciente. No se excede el disponible del recibo ni el saldo de ningún cargo, tampoco entre solicitudes simultáneas.
- Recibos y aplicaciones tienen llaves idempotentes. Reintentar la misma operación devuelve el resultado original; reutilizar una llave con otros datos produce conflicto. Las llaves de aplicación tienen su propio espacio por usuario, separado del de creación de recibos.
- Se conserva un evento inmutable por aplicación con fecha efectiva, fecha de registro, usuario, cargos, importes y disponible resultante. El recibo original y su revisión de creación no se sobrescriben. La tabla de asignaciones resume el aplicado acumulado por recibo/cargo.
- Cancelar un recibo desde Pagos deja sin efecto **todas** sus asignaciones, tanto iniciales como posteriores: los cargos recuperan sus pendientes y el disponible del recibo pasa a cero. Se conservan eventos y revisiones; no es un reembolso bancario.

## API

`POST /patients/:patientId/treatment-payments` mantiene compatible el abono de la etapa 2. Añade `sourceTreatmentId` y `amountReceived` opcionales. Todo excedente exige ambos; `allocations: []` permite un anticipo puro. Sin `amountReceived`, el recibido sigue siendo la suma de las aplicaciones. La fecha no puede ser futura ni anterior a un cargo aplicado en el recibo.

`GET /patients/:patientId/treatment-credits?page=1&pageSize=20` devuelve recibos de anticipos, incluso agotados/cancelados, y eventos de aplicación. `meta.availableCredit` suma lo disponible de **todo el paciente**, no solo de la página o plan mostrado.

`POST /patients/:patientId/treatment-credits/:paymentId/applications` recibe `{ occurredOn, allocations: [{ chargeId, amount }] }` con `Idempotency-Key` UUID. La fecha no puede ser anterior al recibo ni a los cargos, ni futura. Una aplicación puede repartir el anticipo entre varios cargos. Repetir una aplicación ya exitosa no la reactiva si después se canceló el recibo.

## UI y despliegue

El panel compartido Cargos y abonos ofrece Registrar anticipo, excedente opcional al abonar, Aplicar anticipo y el listado paginado del disponible/historial. Se reutiliza en tratamientos independientes, detalle del plan y pagos. Al aplicar se selecciona entre los recibos disponibles de la página actual; la paginación permite ubicar recibos anteriores. Los cargos seleccionables son los de la página actual de tratamientos.

Aplicar `npm run db:migrate` en la API antes de desplegar la UI. La migración `202610240002-patient-credit.js` agrega referencias opcionales y la tabla de eventos. No transforma pagos históricos ni deduce anticipos a partir de saldos negativos antiguos. El rollback se rechaza si existen anticipos o aplicaciones, para no borrar su trazabilidad.

## Fuera de esta entrega

No hay anticipo libre sin catálogo, transferencia entre pacientes, conversión automática de créditos históricos, aplicación automática, devolución bancaria ni anulación individual de aplicaciones. Para corregir una asignación equivocada en este MVP se cancela el recibo completo y se registra el correcto, conservando la auditoría. El enlace de tratamientos desde hallazgos del odontograma corresponde a la etapa 4.
