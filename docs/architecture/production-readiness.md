# Readiness para produccion

F12 cierra el programa de refactor arquitectonico, no autoriza por si sola el uso
de datos clinicos reales. Mientras esta matriz tenga bloqueos, el sistema debe
permanecer en desarrollo o con datos sinteticos.

## Estado al cierre de F12

| Area | Estado | Evidencia o accion requerida |
| ---- | ------ | ---------------------------- |
| Esquema y datos | Cerrado para desarrollo | La base se crea desde migraciones y seed sintetico. No se versiona ningun dump ni dato real. |
| Contrato HTTP | Cerrado | OpenAPI 3.1 se valida y 64 llamadas Angular coinciden por metodo y ruta. |
| Limites de codigo | Cerrado | Checkers AST en API/UI y CI propio en ambos repositorios. |
| Dependencias runtime | Aceptado temporalmente | UI: cero avisos. API: tres moderados transitivos de `uuid`; cero high/critical. El CI bloquea high/critical. |
| Upload Angular | Pendiente de modernizacion | `ngx-dropzone@3` esta deprecado. Migrar al sucesor `@ngx-dropzone/*` compatible antes de Angular 22 y repetir pruebas visuales de ambos dialogos. |
| ORM | Aceptado temporalmente | Sequelize `6.37.8` se conserva; v7 sigue alpha. Revisar trimestralmente, sin downgrades sugeridos por `npm audit --force`. |
| Correo durable | Cerrado para piloto | Worker con exclusion local, lotes, intentos, backoff, idempotencia y payload cifrado. Faltan dashboards y alertas para produccion. |
| Calendar outbox | Bloqueante | La cola y retry son durables, pero el procesamiento depende de `/calendar/sync`. Crear worker programado multiusuario y metricas antes de habilitar Google Calendar en produccion. |
| Archivos privados | Bloqueante | Hay ownership, limites, firma PDF basica, hash y bucket privado. Integrar antivirus o CDR y un estado `SCANNED/CLEAN` antes de aceptar documentos reales. |
| Secretos y cifrado | Bloqueante | Llevar llaves a un secret manager, definir rotacion por version y ensayar recuperacion sin exponer plaintext. |
| Backup y recuperacion | Bloqueante | Configurar backup/PITR, RPO/RTO y ejecutar al menos una restauracion completa verificada. |
| Observabilidad | Bloqueante | Definir SLI/SLO, metricas de HTTP/DB/outbox, alertas, retencion de logs y redaccion comprobada. |
| Rendimiento financiero | Pendiente de carga | Ejecutar concurrencia y volumen representativos sobre billing; conservar locks cortos y medir deadlocks/p95. |
| Privacidad y retencion | Bloqueante | Aprobar con asesoria aplicable avisos, retencion, exportacion, eliminacion y contenido de consentimientos. |
| Proveedores externos | Bloqueante | Validar cuotas, sandbox, revocacion, webhooks de rebote y procedimientos de incidente para GCS, Google y Brevo. |

## Gate de liberacion

Antes del primer ambiente productivo se abre un milestone independiente de
readiness. Cada fila bloqueante se convierte en issue con responsable, fecha,
evidencia y rollback. El go-live requiere:

1. Todos los bloqueos cerrados y ensayados en un ambiente no productivo.
2. `npm ci`, checks, auditoria, migraciones, rollback y reconstruccion aprobados.
3. Smoke test de UI contra la imagen exacta de API y esquema a desplegar.
4. Restauracion de backup y rotacion de secretos ensayadas, no solo documentadas.
5. Aprobacion funcional, de privacidad y operativa registrada.

## Riesgos de dependencias aceptados

- API, 2026-08-24: `@google-cloud/storage@8.0.1`, `googleapis@176.0.0` y
  `sequelize@6.37.8`. Permanecen tres avisos moderados de `uuid` en Gaxios y
  Sequelize. No se usa el parametro `buf` afectado por el advisory y no existe
  una correccion compatible ofrecida por esos arboles.
- UI, 2026-08-24: Angular `21.2`, Material `21.2` y dependencias runtime con cero
  avisos. Los hallazgos restantes de `npm audit` pertenecen al toolchain; el CI
  revisa cambios de lockfile y bloquea cualquier high/critical de runtime.
- La revision se repite en cada PR mediante `security:check` y Dependency Review,
  y trimestralmente aunque no haya cambios funcionales.
