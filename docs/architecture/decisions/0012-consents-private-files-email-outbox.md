# ADR 0012: consentimientos fisicos, archivos privados y correo durable

- Estado: aceptado
- Fecha: 2026-08-22

## Contexto

Los controladores legacy aceptaban asignacion masiva, URLs externas y borrado
fisico para consentimientos. El upload confiaba en `Content-Type`, no limitaba el
tamano, construia rutas predecibles y cargaba una llave JSON local. Identidad
esperaba sincronicamente a Brevo despues de confirmar cambios en la base, por lo
que una caida del proveedor podia convertir un alta persistida en un error HTTP.

El producto imprime el documento, obtiene firmas manuscritas y posteriormente
digitaliza la hoja. No ofrece firma electronica ni una firma criptografica.

Referencias consultadas:

- [NOM-004-SSA3-2012, expediente clinico](https://www.dof.gob.mx/nota_detalle.php?codigo=5272787&fecha=15/10/2012)
- [OWASP File Upload Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html)
- [Google Cloud Storage: Application Default Credentials](https://docs.cloud.google.com/storage/docs/authentication)
- [Google Cloud Storage: precondiciones de carga](https://docs.cloud.google.com/storage/docs/uploading-objects)
- [Google Cloud Storage: validacion de datos](https://docs.cloud.google.com/storage/docs/data-validation)
- [Google Cloud Storage: signed URLs](https://docs.cloud.google.com/storage/docs/access-control/signed-urls)
- [Brevo: envio transaccional](https://developers.brevo.com/reference/send-transac-email)
- [Brevo: idempotencia](https://developers.brevo.com/docs/heterogenous-versions-batch-emails)
- [Brevo: sandbox](https://developers.brevo.com/docs/using-sandbox-mode)

## Decision

1. `stored_files` conserva ownership, proposito, hash SHA-256, tamano, tipo,
   generacion y estado. El bucket y object key son internos y nunca forman parte
   del DTO publico.
2. Solo se aceptan PDFs de hasta 10 MiB por defecto. Se validan extension,
   `Content-Type` y encabezado `%PDF-`; el nombre del objeto es un UUID generado.
   GCS permanece privado, usa ADC, checksum CRC32C y `ifGenerationMatch=0`.
3. El acceso se concede despues de verificar ownership mediante una URL firmada
   de cinco minutos. La URL es bearer data, no se persiste y se responde con
   `Cache-Control: no-store`.
4. Un archivo referenciado por una plantilla o constancia no puede eliminarse.
   La eliminacion libre reserva el estado antes de llamar al proveedor y es
   recuperable si el proveedor falla.
5. Las plantillas propias se versionan y archivan logicamente. Copiar el catalogo
   crea datos propios; cambiar despues el catalogo no modifica la copia.
6. Una constancia toma snapshots de plantilla, version, paciente, odontologo,
   firmante y capacidad. La hoja digitalizada puede adjuntarse una sola vez. El
   unico cambio posterior es `VOIDED`, con fecha y motivo; no existe `PATCH` ni
   borrado fisico.
7. `PENDING_DOCUMENT` significa que existe el registro operativo pero falta la
   digitalizacion. Solo `COMPLETED` tiene un PDF firmado asociado. Ninguno de
   estos estados representa firma electronica o certifica por si solo validez
   juridica.
8. Las URLs legacy no se migran. Los datos de desarrollo existentes quedan como
   `PENDING_DOCUMENT`, evitando convertir referencias no verificadas en evidencia.
9. El correo usa `email_deliveries`: payload AES-256-GCM, clave idempotente,
   bloqueo de trabajo, espera exponencial y maximo configurable de intentos. El
   worker borra el payload cifrado al confirmar envio y conserva metadatos
   tecnicos de entrega.
10. Brevo es un adaptador. Una falla del proveedor ocurre despues del enqueue y
    no bloquea el flujo HTTP de identidad. El endpoint legacy que permitia enviar
    a un destinatario arbitrario deja de montarse.

## Limites y riesgos aceptados

- La seccion 10 de NOM-004 enumera contenidos y eventos minimos para cartas de
  consentimiento. La aplicacion conserva documentos y procedencia, pero no
  declara cumplimiento legal. Formularios, retencion y procedimiento deben ser
  revisados por asesoria juridica antes de produccion.
- La validacion basica no detecta malware ni contenido activo complejo. Antes de
  produccion se debe incorporar antivirus o CDR y cambiar el estado de seguridad
  para distinguir archivos escaneados.
- La URL firmada puede ser usada por quien la posea mientras siga vigente. La UI
  no debe registrarla, compartirla ni almacenarla.
- El enqueue sucede despues de la transaccion de identidad. Si falla la propia
  base en ese intervalo, el endpoint explicito de reenvio recupera la entrega;
  integrar ambos repositorios en una transaccion queda para una fase posterior.
- Webhooks de rebote, queja y entrega, rotacion automatizada de claves y politica
  final de retencion se completan antes de produccion.

## Consecuencias

- GCS y Brevo pueden sustituirse con adaptadores sin cambiar reglas de negocio.
- La UI F11 debe subir primero el archivo, conservar su UUID y despues vincularlo.
- La evidencia historica deja de depender del estado actual de pacientes o
  plantillas y no puede desaparecer por una cascada ordinaria.
