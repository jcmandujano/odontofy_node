# Dominio: Odontofy

## Propósito del dominio

El dominio de Odontofy modela la operación básica de un consultorio dental individual, permitiendo al médico gestionar pacientes, seguimiento clínico, citas, pagos y documentación legal de forma estructurada.

---

## Entidades principales

### Usuario

Representa al médico que utiliza la plataforma.

Campos clave:

* nombre
* apellidos
* email
* password
* telefono
* fechaNacimiento

Notas:

* Actualmente es un modelo de un solo usuario por cuenta
* No existen roles ni jerarquías

---

### Paciente

Representa a una persona que recibe atención médica.

Campos clave:

* nombre
* apellidos
* fechaNacimiento
* telefono
* email
* direccion

---

### Cita (Appointment)

Representa una reserva de tiempo en la agenda del médico.

Campos clave:

* fechaHora
* motivo
* estado
* notas
* referencia a paciente

Notas:

* Puede integrarse con Google Calendar

---

### Nota de Evolución (ClinicalNote)

Representa el seguimiento clínico del paciente.

Campos clave:

* nombre
* fecha
* descripcion
* referencia a paciente

Notas:

* Se almacena como datos estructurados, no como documento

---

### Pago (Payment)

Representa un registro de pago realizado por el paciente.

Campos clave:

* fecha
* monto
* referencia a paciente

Notas:

* No procesa pagos en línea
* Solo registra información

---

### Concepto de Pago (PaymentConcept)

Define los servicios o tratamientos que el médico ofrece.

Campos clave:

* nombre
* descripcion
* monto

Notas:

* Es un catálogo configurable por el usuario

---

### Consentimiento (Consent)

Representa una plantilla de consentimiento informado.

Campos clave:

* nombre
* descripcion
* archivoPDF

Notas:

* Se utiliza como base para generar consentimientos firmados

---

### Consentimiento Firmado (SignedConsent)

Representa un consentimiento ya firmado por el paciente.

Campos clave:

* referencia a paciente
* referencia a consentimiento
* fecha
* archivo firmado (opcional)

---

## Relaciones

* Un Usuario tiene muchos Pacientes

* Un Paciente tiene muchas Citas

* Un Paciente tiene muchas Notas de Evolución

* Un Paciente tiene muchos Pagos

* Un Paciente tiene muchos Consentimientos Firmados

* Una Cita pertenece a un Paciente

* Una Nota de Evolución pertenece a un Paciente

* Un Pago pertenece a un Paciente

* Un Pago puede estar asociado a uno o varios Conceptos de Pago (dependiendo de implementación)

* Un Consentimiento Firmado pertenece a:

  * un Paciente
  * un Consentimiento

---

## Responsabilidades por entidad

Usuario:

* Gestionar toda la información del sistema

Paciente:

* Centralizar la información clínica y administrativa

Cita:

* Organizar la agenda del médico

Nota de Evolución:

* Registrar el seguimiento clínico del paciente

Pago:

* Registrar transacciones realizadas

Concepto de Pago:

* Definir los servicios disponibles

Consentimiento:

* Proveer plantillas legales

Consentimiento Firmado:

* Registrar evidencia de aceptación del paciente

---

## Flujos principales

### Creación de paciente

1. Usuario registra un paciente
2. El paciente queda disponible para citas, pagos y notas

---

### Registro de cita

1. Usuario selecciona un paciente
2. Define fecha y hora
3. Se crea la cita
4. (Opcional) Se sincroniza con Google Calendar

---

### Registro de nota de evolución

1. Usuario selecciona un paciente
2. Crea una nota con fecha y descripción
3. Se guarda en el historial del paciente

---

### Registro de pago

1. Usuario selecciona un paciente
2. Define monto y concepto
3. Se registra el pago

---

### Registro de consentimiento firmado

1. Usuario selecciona un consentimiento
2. Se imprime y firma físicamente
3. Se adjunta al paciente como consentimiento firmado

---

## Decisiones de diseño del dominio

* Separación entre Consentimiento (plantilla) y Consentimiento Firmado (instancia)
* Separación entre Concepto de Pago y Pago
* Paciente como entidad central del sistema
* Modelo simplificado enfocado en un solo usuario

---

## Fuera del dominio (importante)

Estas entidades no forman parte del dominio de negocio:

* Tokens de autenticación
* Recuperación de contraseña
* Integraciones externas (Google Calendar a nivel técnico)

Estas pertenecen a la capa de infraestructura.

---
