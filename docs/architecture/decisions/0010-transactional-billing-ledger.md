# ADR 0010: registros financieros transaccionales y trazabilidad

- Estado: aceptado
- Fecha: 2026-08-18

## Contexto

El modelo legacy `payments` representaba simultaneamente venta, ingreso recibido
y adeudo. Cada fila almacenaba un `debt` aislado, mientras `patients.current_balance`
no se mantenia al crear, editar o eliminar pagos. Los conceptos se resolvian desde
un catalogo mutable al consultar el historial y las ediciones reemplazaban items
sin conservar versiones. Esto producia dos fuentes de saldo y evidencia historica
mutable.

El alcance actual del producto no incluye cobro en linea ni facturacion fiscal.
SAT mantiene CFDI 4.0 como esquema fiscal vigente, por lo que llamar factura a un
registro interno seria una promesa contractual incorrecta. PCI SSC prohibe guardar
datos sensibles de autenticacion despues de autorizar una operacion; Odontofy no
necesita recibirlos para clasificar un cobro.

Referencias consultadas:

- [SAT: servicio de facturacion CFDI 4.0](https://wwwmat.sat.gob.mx/aplicacion/75169/servicio-de-facturacion-cfdi-version-4.0-%28vigente-a-partir-del-1-de-enero-de-2022%29)
- [PCI SSC: almacenamiento de datos sensibles de autenticacion](https://www.pcisecuritystandards.org/faqs/1533/)
- [OWASP: autorizacion de transacciones](https://cheatsheetseries.owasp.org/cheatsheets/Transaction_Authorization_Cheat_Sheet.html)
- [OWASP: seguridad de servicios REST](https://cheatsheetseries.owasp.org/cheatsheets/REST_Security_Cheat_Sheet.html)
- [MySQL: locking reads](https://dev.mysql.com/doc/refman/8.4/en/innodb-locking-reads.html)
- [MySQL: manejo de deadlocks](https://dev.mysql.com/doc/refman/8.4/en/innodb-deadlocks-handling.html)
- [Stripe: solicitudes idempotentes](https://docs.stripe.com/api/idempotent_requests)

## Decision

1. El lenguaje publico usa `billing-records`: son registros financieros internos,
   no CFDI, timbrado, factura fiscal ni confirmacion de un procesador de pagos.
2. Un registro agrupa conceptos facturados, descuento, total, importe recibido y
   metodo de pago. `balanceChange = total - amountReceived`; un valor negativo es
   saldo a favor del paciente.
3. Todos los importes publicos son strings decimales con dos posiciones y las
   operaciones usan unidades enteras (`BigInt`). La base persiste `DECIMAL(12,2)`.
4. El alta exige `Idempotency-Key` UUID. La llave se liga al hash del paciente y
   payload; repetirlos devuelve el mismo registro y reutilizar la llave con otro
   payload responde conflicto. Es un contrato de Odontofy, no una afirmacion de
   que el encabezado sea un estandar HTTP definitivo.
5. El paciente se bloquea antes de escribir. Dentro de la misma transaccion se
   bloquean registros y conceptos en orden estable, se guardan snapshots de linea,
   se recalculan saldos cronologicos y se actualiza `patients.current_balance`.
6. Descripcion, precio unitario y subtotal se copian al item. Cambiar o archivar
   el catalogo solo afecta registros futuros.
7. Las correcciones crean una version y revision append-only con autor y motivo.
   La cancelacion es logica e idempotente; nunca borra items ni revisiones.
8. `balanceAfter` es una proyeccion cronologica derivada. Puede recalcularse ante
   movimientos retroactivos; importes, items y revisiones preservan la evidencia.
9. Ownership se exige en paciente, concepto y registro. Un ID ajeno y uno
   inexistente comparten respuesta `404`.
10. Solo se persiste un enum de metodo de pago. La API no acepta ni almacena PAN,
    CVV, PIN, banda, tokens de proveedor o credenciales bancarias.
11. Las rutas legacy conservan sus DTOs durante la transicion, pero delegan altas,
    ediciones y bajas al motor F8 para no evadir saldos ni versionado.

## Consecuencias

- Existe una sola regla de saldo y puede reconstruirse desde registros vigentes.
- Altas retroactivas y correcciones tienen un costo lineal por historial del
  paciente; es una eleccion conservadora adecuada al volumen actual. F12 puede
  medir y optimizar la proyeccion sin cambiar el contrato.
- Las tablas fisicas legacy mantienen sus nombres durante la convivencia para
  reducir el riesgo de migracion, aunque su semantica ya es la de F8.
- Integrar un procesador, pagos divididos detallados, CFDI, devoluciones bancarias
  o conciliacion requerira decisiones y modelos separados.
- El control de acceso y la trazabilidad reducen riesgo, pero no constituyen por
  si mismos cumplimiento fiscal, contable, PCI o juridico integral.
