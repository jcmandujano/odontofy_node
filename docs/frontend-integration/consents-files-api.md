# Integracion F10: consentimientos y archivos

## Secuencia de plantilla

1. Subir el PDF con `POST /api/v1/files`, multipart `file` y
   `purpose=CONSENT_TEMPLATE`.
2. Conservar `data.id`; es un UUID de archivo, no una URL.
3. Crear `POST /api/v1/consent-templates` o
   `/api/v1/consent-templates/from-catalog` usando `templateFileId`.
4. Para visualizar, solicitar `GET /api/v1/files/{id}/access` en el momento de
   abrir. No guardar `url`; expira en cinco minutos.

## Secuencia de constancia firmada

1. Registrar la firma fisica con
   `POST /api/v1/patients/{patientId}/signed-consents`.
2. Si la digitalizacion ya existe, subirla con
   `purpose=SIGNED_CONSENT` y enviar `signedDocumentFileId` en el alta.
3. Si aun no existe, enviar `null`; la respuesta sera `PENDING_DOCUMENT`.
4. Cuando se digitalice, usar una sola vez `PUT
   /api/v1/patients/{patientId}/signed-consents/{consentId}/document`.
5. Un error se corrige anulando con `/void` y creando una nueva constancia. No se
   reemplaza el documento anterior.

## Estados

- Plantilla: `ACTIVE`, `ARCHIVED`.
- Constancia: `PENDING_DOCUMENT`, `COMPLETED`, `VOIDED`.
- Archivo aceptado: `AVAILABLE` y `securityStatus=BASIC_VALIDATED`.

`BASIC_VALIDATED` significa PDF con validaciones basicas; no significa analisis
antimalware. La interfaz no debe presentar estos registros como firma digital o
electronica.

## Compatibilidad

Las rutas legacy siguen disponibles salvo `/api/mailing/welcome`, retirado por
permitir destinatarios arbitrarios. Las propiedades `file_url` externas ya no se
aceptan como evidencia. F11 debe migrar la UI a UUIDs antes de retirar el resto.
