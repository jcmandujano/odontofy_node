# Reglas de producto: tratamientos, odontogramas, planes y pagos

## Propósito y uso

Odontofy está pensado para un médico y un consultorio pequeño. La prioridad es gestionar la atención del paciente con claridad, pocas acciones y captura mínima.

Este documento reúne las decisiones funcionales acordadas para orientar el reanálisis y refactor. No autoriza cambios de funcionalidad ni certifica que todos los recorridos actuales las cumplan: las diferencias deben identificarse en el análisis antes de proponer su corrección.

Es la referencia funcional vigente para este flujo, compartida por API y UI. Las instrucciones explícitas posteriores del usuario pueden cambiar estas decisiones; actualizar entonces este documento. Los documentos de etapas describen implementación y limitaciones de cada entrega, no necesariamente el producto completo actual. En particular, las menciones antiguas a «conceptos de pago» en `context/product.md` y `domain/domain.md` deben interpretarse con las definiciones siguientes.

## Vocabulario común

| Elemento | Significado | No implica por sí mismo |
| --- | --- | --- |
| Catálogo de tratamientos | Servicios que ofrece el médico, con descripción y precio de referencia. | Una indicación para un paciente, un cargo o un pago. |
| Tratamiento del paciente | Indicación concreta tomada del catálogo, con cantidad, precio conservado, seguimiento clínico y datos aplicables, como pieza o superficie. | Pertenecer a un plan, tener odontograma o generar deuda. |
| Plan de tratamiento | Conjunto de tratamientos del paciente para organizar trabajo, cotizar y dar seguimiento. | Confirmar cargos, recibir dinero o completar tratamientos. |
| Odontograma | Registro del estado dental de un paciente, adulto o pediátrico. | Crear tratamientos ni generar un plan. |
| Hallazgo | Condición documentada en una pieza y, cuando aplique, una superficie, con notas opcionales. | Exigir un tratamiento o sincronizarse con su estado clínico. |
| Cargo | Importe que se confirma explícitamente como obligación de pago por un tratamiento. | Haber recibido dinero. |
| Pago o abono | Registro de dinero recibido y, cuando corresponda, su aplicación a cargos. | Una nueva indicación clínica ni otro cargo por el mismo servicio. |
| Anticipo | Dinero recibido con un tratamiento del paciente como origen, que puede quedar disponible para aplicar. | Confirmación o liquidación automática de un cargo. |

En la interfaz se usa «tratamientos». Los nombres técnicos heredados como `conceptId` no requieren renombrarse como parte de un refactor de experiencia.

## Relaciones y autonomía de los módulos

1. El paciente es el contexto común. Todas las asociaciones deben pertenecer al mismo paciente y estar autorizadas para el médico.
2. Un paciente puede tener varios odontogramas; el odontograma no es requisito para crear citas, tratamientos, notas ni registrar pagos de servicios del catálogo.
3. Un tratamiento puede ser independiente o pertenecer a un plan. El catálogo y el tratamiento del paciente son elementos distintos: utilizar el mismo servicio en dos intervenciones no las convierte en el mismo tratamiento.
4. Un odontograma puede tener solo hallazgos y funcionar como referencia clínica. Asociar tratamientos y generar un plan son acciones opcionales.
5. Un hallazgo puede asociarse a varios tratamientos; un tratamiento puede atender varios hallazgos del paciente. La asociación reutiliza el tratamiento y no lo copia.
6. Retirar una asociación clínica elimina únicamente ese vínculo. No elimina ni cancela tratamientos, planes, notas, cargos o pagos.
7. Completar un tratamiento no cambia automáticamente el hallazgo. El estado clínico y el registro del odontograma conservan su propio significado.

## Catálogo y tratamiento del paciente

- Todo tratamiento nuevo del paciente y todo nuevo servicio cobrado deben proceder del catálogo del médico. No se admiten servicios libres fuera del catálogo.
- Al asignar un tratamiento se conserva su nombre y precio. Cambiar después el catálogo no modifica intervenciones, cotizaciones o movimientos anteriores.
- El precio proviene del catálogo; descuentos y cantidades usan las reglas explícitas de cotización y cargo, no una sustitución libre del precio.
- Conservar registros históricos manuales no habilita nuevas capturas manuales. Tampoco permite inventar su relación con el catálogo por coincidencia de texto.

## Planes y odontograma

- Se puede crear y gestionar un plan sin odontograma.
- Generar un plan desde un odontograma agrupa tratamientos existentes elegidos por el médico. Cada tratamiento aparece una sola vez, aunque esté asociado a varios hallazgos.
- Deben conservarse identidad, datos clínicos, referencias e historial financiero de los tratamientos agrupados.
- La operación debe completarse por entero o fallar sin crear un plan vacío ni agrupar parcialmente la selección. Reintentar no debe duplicar el plan ni sus tratamientos.
- Crear o aceptar el plan, modificar hallazgos o vincular tratamientos no confirma cargos ni aplica anticipos.

## Cargos, pagos y anticipos

- La cotización, el avance clínico y el dinero son dimensiones distintas. Solo la confirmación explícita de un cargo nuevo genera deuda en el flujo de tratamientos.
- Un pago puede cubrir tratamientos independientes o tratamientos de planes; no es obligatorio elegir un plan ni tener un odontograma.
- Un cargo puede recibir varios abonos y un recibo puede cubrir varios cargos del mismo paciente. No aplicar más que el pendiente del cargo.
- Todo anticipo nuevo requiere un tratamiento del paciente vinculado al catálogo, incluso cuando aún no tenga cargo. No hay anticipos libres sin tratamiento de origen.
- El excedente recibido puede conservarse disponible, con el origen correspondiente. Confirmar un cargo no lo consume automáticamente.
- Aplicar un anticipo es una acción explícita. Puede cubrir otros tratamientos del mismo paciente; no crea ingreso nuevamente ni altera el dinero ya recibido.
- Distinguir importe cotizado, cargo confirmado, importe aplicado, pendiente por cargo, disponible sin aplicar y saldo neto del paciente. No son cantidades intercambiables.
- Ejemplo: con un cargo de $1,000 y un anticipo de $1,200 sin aplicar, el cargo tiene $1,000 pendientes, hay $1,200 disponibles y el saldo neto es -$200. Al aplicar $1,000, quedan $0 pendientes y $200 disponibles; el saldo neto sigue en -$200.
- Cancelar clínicamente un tratamiento o plan no cancela movimientos financieros. Cancelar un recibo deja sin efecto su ingreso y sus aplicaciones, conserva la auditoría y no representa un reembolso bancario.
- Las cotizaciones con importes financieros fijados no se reescriben para simplificar la edición. Los cambios deben respetar las restricciones vigentes y conservar trazabilidad.

### Compatibilidad del registro directo de pagos

Actualmente también existe captura directa de servicios del catálogo en Pagos, sin seleccionar previamente un tratamiento del paciente ni un plan. Ese registro conserva sus propias líneas de servicio e importes. No debe confundirse con un abono a un cargo existente ni duplicar el cobro de una intervención ya cargada.

La regla de confirmación explícita anterior describe el flujo nuevo de cargos por tratamiento; no elimina las obligaciones registradas por el flujo directo o histórico. No relacionar ni compensar automáticamente registros antiguos con cargos nuevos por compartir nombre o catálogo.

La unificación de ambas entradas es un punto del futuro análisis, no una autorización para retirar la captura directa o cambiar cómo se contabilizan registros existentes.

## Casos que el refactor debe preservar

| Caso | Resultado esperado |
| --- | --- |
| Registrar cita o nota sin odontograma | Se permite en el contexto del paciente. |
| Crear tratamiento del catálogo sin plan ni odontograma | Queda como tratamiento independiente, sin cargo automático. |
| Guardar odontograma adulto o pediátrico solo con hallazgos | Se conserva sin obligar a crear tratamientos ni plan. |
| Vincular un tratamiento existente a otro hallazgo | Se reutiliza su identidad y no se genera deuda. |
| Generar plan con un tratamiento vinculado a varios hallazgos | Se incluye una sola vez y se conservan las referencias. |
| Crear o aceptar un plan | No cambia los ingresos ni genera cargos automáticamente. |
| Confirmar cargo y registrar abonos parciales | Se genera deuda una vez y cada ingreso se registra una vez. |
| Registrar anticipo y aplicarlo después | Exige origen de catálogo; la aplicación no registra otro ingreso. |
| Registrar pago directo de catálogo sin plan | No se exige odontograma ni plan; se evita duplicar cargos existentes. |
| Editar el catálogo | No reescribe tratamientos ni movimientos previos. |
| Desvincular hallazgo o completar tratamiento | No elimina ni modifica automáticamente movimientos financieros. |
| Consultar registros anteriores al refactor | Se conservan importes, relaciones e historial, sin deducciones silenciosas. |

## Límites actuales y decisiones pendientes

Estos límites describen la implementación actual, no requisitos permanentes de UX:

- Desde odontograma se genera un plan nuevo en borrador con tratamientos independientes, de catálogo, no cancelados y sin importes financieros fijados. No se trasladan tratamientos ya incluidos en otros planes ni se copian intervenciones.
- Archivar un odontograma conserva sus asociaciones y lo deja en lectura. Cambiar pieza, condición o superficie de un hallazgo vinculado exige retirar antes sus relaciones; editar notas las conserva.
- El primer cargo de un plan fija su cotización, incluidos los importes de sus otros tratamientos; los cargos restantes requieren confirmación individual.
- No hay anulación o sustitución de cargos confirmados, devolución bancaria ni anulación individual de aplicaciones de anticipos. No diseñar controles que prometan esas operaciones sin una fase funcional específica.

El reanálisis debe resolver cómo presentar catálogo y tratamientos del paciente sin ambigüedad, dónde iniciar cada tarea y cómo simplificar pagos y relaciones opcionales. No se fijan aquí pestañas, diálogos, pasos, textos de confirmación ni campos nuevos. Cada cambio funcional deberá proponerse explícitamente antes de implementarlo.

## Referencias de implementación

- [Tratamientos independientes](patient-treatments-stage-1.md).
- [Cargos y abonos](treatment-charges-stage-2.md).
- [Anticipos y aplicación manual](patient-credit-stage-3.md).
- [Hallazgos y tratamientos](odontogram-treatments-stage-4.md).
- [Planes desde odontograma](odontogram-plans-stage-5.md).
