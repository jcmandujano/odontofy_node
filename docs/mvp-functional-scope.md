# MVP funcional: alcance y plan de simplificación

Estado: fase 1, análisis y documentación. Fecha: 12 de noviembre de 2026.

## Objetivo y recorrido principal

El médico configura sus catálogos, registra al paciente, agenda una cita, documenta la atención en una nota general y registra el pago de servicios del catálogo. Puede crear y consultar un odontograma como referencia clínica. Cada tarea funciona sin planes ni tratamientos del paciente.

Las [reglas de producto](product-rules.md) contienen el alcance vigente. El catálogo de tratamientos se conserva; la gestión clínica separada de tratamientos y los planes se posponen. Esta decisión sustituye el plan previo de unificar y ampliar tratamientos.

## Inventario de dependencias comprobadas

Las rutas de API parten de este repositorio; las de UI corresponden a `odontofy_UI/src/app`.

| Zona | Comportamiento actual observado en código | Ajuste posterior y precaución |
| --- | --- | --- |
| Navegación | UI `app.routes.ts` registra `patient-treatment-plans` y `treatment-plan-detail`; componentes del expediente acceden a esos flujos. | Revisar menús, accesos rápidos, enlaces y rutas directas. Ocultar menús solamente no delimita toda la experiencia. Definir destino de enlaces antiguos sin borrar datos. |
| Notas | UI `shared/dialogs/evolution-note-mgmt-dialog` muestra plan y procedimiento; `features/patients/evolution-notes` presenta filtros y columnas asociados. | Conservar editor, fecha, historial y notas generales. Retirar selección de planes y procedimientos del recorrido nuevo. Las ediciones de notas previas deben preservar referencias existentes que no se muestren. |
| API de notas | `src/modules/clinical-records/clinical-record.schemas.ts` admite referencias nulas; `clinical-record.repository.ts` exige plan solo si se referencia un tratamiento. Las revisiones conservan esos vínculos. | Reutilizar creación general, sin ampliar la API para notas de tratamientos independientes. No enviar nulos al editar si eso borraría referencias antiguas. Mantener autorización y revisiones. |
| Odontograma | UI `features/patients/odontogram` ofrece asociación de tratamientos y generación de plan. API `src/modules/odontograms/odontogram.repository.ts` preserva asociaciones y restringe cambios de hallazgos vinculados. | Retirar esas acciones del recorrido MVP. Probar hallazgos sin vínculos y detectar los vinculados antes de modificar su edición. Conservar contratos y asociaciones hasta decidir su retirada; no desactivar restricciones dejando datos inconsistentes. |
| Pago directo | UI `shared/dialogs/payment-mgmt-dialog` selecciona catálogo y muestra precio de solo lectura. API `src/modules/billing/billing.repository.ts` obtiene precio y calcula subtotal, total, ingreso y variación de saldo. | Mantener esta entrada como recorrido de pago del MVP y verificar el precio en servidor. No crear tratamientos del paciente como requisito del pago. |
| Nuevos cargos | UI `shared/components/treatment-finance` se reutiliza en pagos, independientes y detalle de plan. | Retirar el panel de la experiencia ordinaria solo después de definir cómo atender movimientos y pendientes existentes. No convertir cargos previos en pagos directos automáticamente. |
| Conflicto de cobro | `billing.repository.ts` rechaza pago directo si encuentra cargos pendientes del mismo catálogo (`CHARGE_PAYMENT_REQUIRED`). | No basta con ocultar Cargos y abonos: con datos previos se podría bloquear el pago directo sin alternativa. Resolver expresamente compatibilidad y probar el caso. |
| Saldo e informes | `billing.repository.ts` y la lógica financiera combinan pagos directos y cargos confirmados; cancelar abonos conserva auditoría y devuelve pendientes. | Mantener saldo e ingresos antes y después de cambios visuales. No excluir cargos antiguos de los cálculos para aparentar simplificación. |
| Seguimiento de adeudo | El pago directo agrega al saldo la diferencia entre total e ingreso. | Verificar cómo registrar el ingreso posterior del mismo servicio sin generar otro total. Si falta una operación clara, diseñar el ajuste mínimo en fase 3; no declarar resuelto el abono por poder volver a elegir el catálogo. |
| Catálogos y consentimientos | Tienen flujos propios en configuración y expediente. | Conservar selección y documentos, revisar permisos y archivos al validar el MVP; no introducir dependencia con planes. |
| Agenda y Google Calendar | Forman parte del MVP solicitado. | La sincronización no se da por validada por este inventario documental. Comprobar conexión, selección de calendario, creación, actualización, cancelación, errores y reintentos en fase 4 con cuenta y calendario de prueba. |

## Recorridos y criterios de aceptación

1. **Atención sencilla:** registrar paciente, crear una nota general y cobrar un servicio del catálogo, sin plan, tratamiento del paciente ni odontograma obligatorio.
2. **Catálogo:** intentar usar un servicio inexistente exige crearlo en configuración; el pago no acepta un precio arbitrario enviado por el cliente. Cambiar el catálogo conserva importes históricos.
3. **Nota:** crear, consultar y editar una nota conserva contenido, fecha y auditoría; editar una nota anterior no borra vínculos ocultos inadvertidamente.
4. **Odontograma:** crear adulto y pediátrico, capturar y consultar hallazgos. No hay acciones para asociar tratamientos ni generar planes. No se redefine el odontograma como registro inmutable sin una decisión explícita.
5. **Pago completo:** servicios del catálogo, cantidades e importe recibido se registran una sola vez; reintentar no duplica el ingreso.
6. **Pago parcial:** servicio de $1,000, ingreso inicial de $400 y posterior de $600 deben resultar en total cobrado por servicio de $1,000, ingresos de $1,000 y adeudo cero. No se registra de nuevo un servicio de $1,000 para justificar el segundo ingreso.
7. **Datos anteriores:** importes, cancelaciones, revisiones y relaciones se conservan. Listado vacío, saldo y errores no dependen de que el usuario haya limpiado la base.
8. **Agenda:** una cita local funciona sin Google. Con conexión, comprobar el alcance realmente soportado de sincronización en ambos sentidos y documentar cualquier diferencia con lo esperado antes de anunciarla como completa.
9. **Acceso y documentos:** registro, login, información del médico, catálogos y consentimientos pueden completarse con la navegación del MVP.

## Entregas por fases

| Fase | Entrega | Condición de cierre |
| --- | --- | --- |
| 1. Alcance y dependencias | Este documento, alcance vigente en reglas de producto y actualización de AGENTS en ambos proyectos. | Reglas consistentes y rutas referenciadas comprobadas. Sin cambios de código, migraciones ni limpieza. |
| 2. Expediente sencillo | Retirar entradas de planes y tratamientos, simplificar notas a generales y odontograma a hallazgos. | Recorrido clínico autónomo, enlaces antiguos atendidos y datos previos conservados. |
| 3. Pagos desde catálogo | Priorizar captura directa y resolver adeudos posteriores y compatibilidad antes de retirar el panel financiero. | Pago completo, parcial y posterior, cancelaciones e historial sin duplicados ni variación injustificada del saldo. |
| 4. Módulos restantes | Verificar acceso, configuración, ficha, consentimientos y agenda local/Google; corregir defectos del alcance. | Recorridos demostrados y límites de Google documentados con pruebas, sin asumir sincronización por existir una conexión OAuth. |
| 5. Validación integral | Probar recorridos completos, históricos, errores, móvil y teclado con datos sintéticos. | Checks pertinentes aprobados y guía de prueba manual para revisión del usuario. |

Cada fase tendrá ramas desde main actualizado, commits y PR en los proyectos afectados. El usuario revisa y realiza el merge antes de continuar a la siguiente fase. No implementar fases posteriores por el hecho de estar descritas aquí.

## Datos y límites de esta fase

- No eliminar tablas, contratos, migraciones ni registros para retirar opciones de navegación.
- No ejecutar SQL de limpieza. Si se aborda después, identificar entorno y registros de prueba concretos, dependencias y consecuencias antes de actuar.
- La confirmación de que los odontogramas son de prueba no se extiende automáticamente a notas, pagos, cargos o documentos.
- No diseñar módulos clínicos de tratamientos, planes, cotizaciones, aplicaciones de anticipos o relaciones con odontograma como requisito del MVP nuevo.
- La política de descuentos y cantidades existentes se mantiene hasta analizar pagos; precio unitario libre queda excluido.
- La fase 1 verifica dependencias en código y documentación. No incluye validación visual, pruebas clínicas, acceso a bases ni verificación real de Google Calendar.
