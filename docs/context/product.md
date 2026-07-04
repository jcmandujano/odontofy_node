# Producto: Odontofy

## Descripción general

Odontofy es una aplicación SaaS enfocada en la gestión de consultorios dentales pequeños, diseñada para ayudar a médicos a organizar la información de sus pacientes, su operación diaria y el seguimiento clínico de forma simple y práctica.

El enfoque principal del producto es la facilidad de uso, priorizando flujos sencillos sobre funcionalidades complejas.

---

## Usuario objetivo

* Dentistas independientes
* Consultorios pequeños (1 médico)
* Profesionales que actualmente gestionan su información de forma manual o con herramientas no especializadas

---

## Problemas que resuelve

* Desorganización de información de pacientes
* Dificultad para dar seguimiento clínico (notas, evolución)
* Falta de control estructurado de pagos
* Gestión manual o desordenada de citas
* Manejo inconsistente de consentimientos informados

---

## Propuesta de valor

* Centralización de la información clínica y administrativa
* Simplicidad en la operación diaria
* Reducción de errores por falta de seguimiento
* Estandarización de procesos básicos del consultorio

---

## Alcance del producto (fase actual)

Odontofy está diseñado actualmente como una herramienta de uso individual:

* Un solo usuario (médico) por cuenta
* No existe soporte para múltiples usuarios por clínica
* No existe jerarquía de roles (admin, asistente, etc.)
* No existe modelo multi-clínica

---

## Funcionalidades principales

### Autenticación

* Registro de usuario con:

  * Nombre
  * Apellidos
  * Teléfono
  * Fecha de nacimiento
  * Correo electrónico
  * Contraseña

* Inicio de sesión mediante correo y contraseña

---

### Configuración inicial

El usuario debe configurar dos catálogos base:

#### Catálogo de consentimientos informados

Permite al médico:

* Crear un consentimiento con:

  * Nombre
  * Descripción
  * Archivo PDF

Uso:

* El PDF puede imprimirse para firma física
* Posteriormente se adjunta al expediente del paciente

---

#### Catálogo de conceptos de pago

Permite definir servicios o tratamientos:

* Nombre
* Descripción
* Monto

Uso:

* Sirve como base para registrar pagos de pacientes

---

### Gestión de pacientes

El usuario puede:

* Listar pacientes
* Crear nuevos pacientes
* Buscar pacientes
* Actualizar información de pacientes
* Eliminar pacientes

---

### Expediente del paciente

Cada paciente cuenta con un expediente donde se puede:

#### Notas de evolución

* Crear notas con:

  * Nombre
  * Fecha
  * Descripción (texto largo)

Nota:

* Las notas se almacenan como datos estructurados, no como documentos

---

#### Pagos

* Registrar pagos realizados por el paciente
* Asociar pagos a conceptos definidos previamente

Nota:

* No se procesan pagos en línea (solo registro informativo)

---

#### Consentimientos informados firmados

* Asociar consentimientos al paciente
* Adjuntar documentos firmados (flujo físico-digital)

---

### Agenda y citas

El médico puede:

* Crear y gestionar citas
* Asociar citas a pacientes

Adicional:

* Posibilidad de integración con Google Calendar (sincronización de agenda)

---

## Limitaciones actuales

* No hay soporte para múltiples usuarios por cuenta
* No hay roles ni permisos
* No hay procesamiento de pagos en línea
* No hay facturación fiscal
* No hay soporte multi-sucursal
* No hay firma digital integrada (solo flujo físico)

---

## Principios de diseño del producto

* Simplicidad sobre complejidad     
* Flujos claros y rápidos
* Minimizar fricción para el usuario
* Evitar sobrecargar con funcionalidades innecesarias
* Priorizar casos de uso reales del consultorio pequeño

---

## Futuro (no implementado aún)

* Multiusuario por clínica
* Roles (admin, asistente, doctor)
* Facturación
* Pagos en línea
* Firma digital de documentos
* Soporte para múltiples consultorios

---
