# Etapa 4: tratamientos desde hallazgos

## Alcance

Desde un hallazgo guardado se puede crear un tratamiento independiente del catálogo o vincular un tratamiento existente del paciente, sea independiente o de un plan. No se exige crear un plan. El odontograma puede seguir utilizándose únicamente como referencia clínica, sin asignaciones.

La relación reutiliza la tabla existente odontogram_finding_treatment_items. Un hallazgo admite varios tratamientos y un mismo tratamiento puede atender varios hallazgos, incluso en distintos odontogramas del paciente. Vincular no copia el tratamiento ni sobrescribe su pieza, superficie, notas, importes, estado o pertenencia a un plan.

## Crear desde catálogo

POST /odontograms/:odontogramId/findings/:findingId/treatments exige Idempotency-Key UUID y recibe userConceptId, quantity opcional (1.00) y notes opcionales. En una sola transacción se crea el tratamiento y su asociación. Se copian nombre y precio del catálogo activo propio, y pieza/superficie del hallazgo. Se rechazan precio, nombre, plan, estado y campos financieros arbitrarios. El tratamiento queda PENDING y sin plan.

La llave se conserva en el tratamiento junto con la huella de la solicitud, incluyendo usuario, odontograma y hallazgo. Una misma operación concurrente o reintentada no duplica el registro; otra solicitud con esa llave produce conflicto. Reintentar después de desvincular no vuelve a asociar ni crea otro tratamiento.

Para evitar duplicados accidentales también se rechaza crear desde un catálogo que ya tenga un tratamiento asociado a ese hallazgo, incluso si está cancelado. Para una intervención distinta se revisa el existente y, si corresponde, se retira explícitamente su relación antes de crear otra.

## Asociar y retirar vínculos

PUT/DELETE /odontograms/:odontogramId/findings/:findingId/treatment-items/:itemId mantienen sus rutas. Ahora aceptan tratamientos independientes y de planes. Se comprueba propiedad y mismo paciente; los registros de otro usuario no se revelan. Una nueva asociación requiere catálogo y tratamiento/plan no cancelado. Los vínculos históricos manuales existentes se conservan y pueden retirarse, pero no se crean nuevos vínculos manuales.

Crear/asociar/desvincular nunca confirma cargos, registra pagos, consume anticipos ni modifica estado clínico. Completar un tratamiento no cambia automáticamente el hallazgo: el odontograma conserva su carácter de registro de referencia.

Desvincular retira solo la relación: no elimina ni cancela el tratamiento, plan, cargo, recibos o notas de evolución. Archivar conserva los vínculos y los muestra en modo lectura. Para quitar un hallazgo con tratamientos o cambiar su pieza/condición/superficie deben retirarse primero sus vínculos explícitamente; editar sus notas conserva ID y referencias.

## Consulta y UI

El listado de tratamientos del paciente y el detalle de planes incluyen odontogramReferences con odontograma, hallazgo, título, pieza, condición, superficie y bandera de archivo. Solo se consultan referencias propias y del mismo paciente. Los enlaces vuelven al odontograma exacto mediante el parámetro chartId, también si no estaba en la primera página del selector.

Se conserva el layout superior de dientes y las columnas actuales de hallazgos. El botón Tratamientos (n), dentro de Hallazgo, abre un panel de asociaciones con creación desde catálogo y selección paginada de tratamientos existentes. No se agrega una columna nueva. Las acciones de asociación se deshabilitan mientras haya cambios del odontograma sin guardar; primero se guardan o descartan para evitar sobrescribir borradores.

## Migración y límites

Ejecutar npm run db:migrate en la API antes de habilitar la UI. 202610240003-odontogram-treatment-creation agrega dos columnas opcionales y un índice único para idempotencia; no duplica ni transforma tratamientos históricos. Su rollback rechaza borrar la trazabilidad de creaciones existentes.

No se generan planes ni cotizaciones desde el odontograma en esta entrega: eso corresponde a la etapa 5. No hay sincronización automática de diagnósticos/estados ni modificación de la lógica financiera de las etapas anteriores.
