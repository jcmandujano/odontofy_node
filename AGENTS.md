# Guía para trabajar en Odontofy API

## Producto y alcance

Odontofy ayuda al médico a gestionar su consulta de forma práctica y amigable. La API debe permitir flujos sencillos, consistentes y seguros. Estamos construyendo un MVP: resolver la necesidad actual sin anticipar funciones futuras.

- Implementar el alcance solicitado. Proponer mejoras adicionales por separado.
- Aprovechar los datos y relaciones existentes para evitar captura repetida en la UI.
- No agregar estados, entidades, endpoints, dependencias o abstracciones sin una necesidad actual que los justifique.
- La simplicidad del flujo no elimina validaciones de negocio, autorización ni consistencia financiera.

## Reglas del dominio

- El catálogo de tratamientos es la fuente de los nuevos tratamientos y servicios cobrados. No permitir nuevos servicios de texto libre ajenos al catálogo.
- Mantener las instantáneas históricas de nombre y precio; editar el catálogo no debe reescribir tratamientos ni movimientos anteriores.
- Un tratamiento del paciente puede ser independiente o pertenecer a un plan. El plan es una agrupación opcional para cotización y seguimiento.
- Un paciente puede tener varios odontogramas, de adulto o pediátricos. Los hallazgos pueden ser referencia clínica y asociarse opcionalmente a tratamientos.
- Citas, tratamientos y notas de evolución pueden existir sin odontograma. No introducir dependencias obligatorias entre estos flujos.
- Generar un plan desde el odontograma debe reutilizar los tratamientos elegibles existentes, sin duplicarlos ni perder sus relaciones.
- Crear o aceptar una cotización o plan, asociar tratamientos y completar su estado clínico no genera deuda. Solo la confirmación explícita del cargo la genera.
- Mantener separados el estado clínico y el financiero. Los pagos pueden aplicarse a tratamientos independientes o incluidos en planes.
- Los anticipos deben tener como origen un tratamiento del paciente vinculado al catálogo. Aplicar saldo disponible requiere una acción explícita y no debe registrar ingreso nuevamente.
- Conservar la compatibilidad de registros históricos, sin inferir asociaciones financieras ni migrar silenciosamente datos manuales.

## Arquitectura y contratos

- Revisar primero el módulo equivalente, sus repositorios, validaciones y documentación en `docs`. Seguir los patrones existentes de Express, TypeScript y Sequelize.
- Validar en servidor entrada, pertenencia al usuario y paciente, referencias y transiciones permitidas. No confiar en restricciones de la UI.
- Mantener contratos compatibles. Los nombres internos heredados, como `conceptId` o `userConceptId`, no requieren renombrarse para cambiar el lenguaje visible a tratamientos.
- Actualizar el contrato OpenAPI y la integración con Angular cuando cambien endpoints o respuestas públicas.
- Expresar errores de dominio de forma consistente y útil para la UI, sin exponer datos sensibles ni detalles internos.
- Usar migraciones para cambios de esquema; revisar compatibilidad, datos existentes y condiciones de reversión.

## Consistencia financiera y datos

- Usar las utilidades monetarias y reglas de redondeo existentes; no calcular dinero con aproximaciones de punto flotante.
- Mantener transacciones, orden de bloqueos e idempotencia en operaciones que deban ser atómicas o puedan repetirse.
- Evitar cargos, tratamientos, recibos e ingresos duplicados. Conservar trazabilidad al cancelar movimientos.
- No debilitar validaciones, auditoría o controles de concurrencia para hacer pasar una prueba.
- No modificar bases de desarrollo del usuario ni producción para probar. Usar datos sintéticos y una base aislada, identificada explícitamente antes de ejecutar migraciones o limpieza.

## Skills y experiencia de usuario

- `frontend-design` y `ui-ux-pro-max` se consultan cuando la tarea incluye diseño o revisión de interfaces; no son necesarias para cambios exclusivamente de API.
- Cuando una decisión de API afecte la captura o el flujo, favorecer operaciones que aprovechen el contexto existente y eviten pasos al médico, conservando las reglas de negocio.
- Las decisiones de Odontofy y el alcance solicitado guían la adaptación de recomendaciones de las skills.

## Validación y colaboración

- Para cambios de código, ejecutar comprobaciones pertinentes del `package.json`; usar `npm run check` para validación integral. Ejecutar `npm run contract:angular` cuando cambie la integración y pruebas de base aislada cuando el cambio lo requiera.
- Añadir pruebas de comportamiento para reglas críticas y regresiones; evitar pruebas que solo reproduzcan la implementación.
- Revisar dependencias con `npm run security:check` cuando se modifiquen. No aplicar actualizaciones incompatibles ni `npm audit fix --force` automáticamente.
- Para cambios exclusivamente documentales, revisar contenido, referencias y `git diff --check`; no ejecutar la suite completa sin necesidad.
- Respetar los cambios locales del usuario y cualquier instrucción específica de la tarea.
- Al iniciar una entrega, revisar el estado del repositorio y crear una rama desde `origin/main` actualizado. No trabajar directamente en main.
- Al finalizar, revisar el diff, hacer commit y crear o actualizar el PR para revisión del usuario. El usuario realiza el merge.
- Si el usuario pide revisar en local o no hacer commit/PR, respetar esa excepción.
- Comunicar qué cambió, qué se verificó y cualquier limitación real.
