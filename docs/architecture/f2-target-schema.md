# Esquema objetivo F2

## Objetivo

La base nueva se crea exclusivamente desde migraciones sobre MySQL 8.4, usa
InnoDB, `utf8mb4_0900_ai_ci`, IDs `INT UNSIGNED`, timestamps UTC y nombres
`snake_case`. No se importa ningun dato del esquema anterior.

MySQL exige tipos y signo compatibles entre claves relacionadas y crea indices
para las foreign keys; F2 los declara de forma explicita para que reflejen las
consultas de ownership y listado. Los `CHECK` se nombran y permanecen enforced.

Referencias:

- [Migraciones de Sequelize v6](https://sequelize.org/docs/v6/other-topics/migrations/)
- [Foreign keys de MySQL 8.4](https://dev.mysql.com/doc/refman/8.4/en/constraint-foreign-key.html)
- [CHECK constraints de MySQL 8.4](https://dev.mysql.com/doc/refman/8.4/en/create-table-check-constraints.html)
- [Healthchecks y orden de arranque en Docker Compose](https://docs.docker.com/compose/how-tos/startup-order/)

## Tablas

| Area | Tablas |
| --- | --- |
| Identidad | `users`, `account_verification_tokens`, `password_resets`, `auth_sessions`, `oauth_states` |
| Pacientes y agenda | `patients`, `appointments` |
| Catalogos y tratamientos | `concepts`, `user_concepts`, `treatment_plans`, `treatment_plan_items` |
| Expediente | `evolution_notes` |
| Facturacion | `payments`, `payment_items` |
| Consentimientos | `informed_consents`, `user_informed_consents`, `signed_consents` |

Todas las entidades dependientes tienen foreign keys con una accion explicita de
borrado. Los indices comienzan por `idx_`, las unicidades por `uq_`, las foreign
keys por `fk_` y los checks por `chk_`.

## Compatibilidad legacy

La API actual conserva temporalmente sus atributos TypeScript. Sequelize los
mapea a nombres fisicos consistentes:

| Atributo legacy | Columna o tabla nueva |
| --- | --- |
| `User.password` | `users.password_hash` |
| `Token.userId`, `token`, `expiresAt` | `account_verification_tokens.user_id`, `token_hash`, `expires_at` |
| `Appointment.appointment_datetime` | `appointments.starts_at` |
| `Appointment.google_event_id` | `appointments.external_event_id` |
| `Patient.debt` | `patients.current_balance` |
| `Payment.patientId` | `payments.patient_id` |
| `Payment.income`, `debt`, `total`, `discount` | `amount_received`, `balance_after`, `total_amount`, `discount_amount` |
| `PaymentUser.paymentId`, `conceptId`, `paymentMethod` | `payment_items.payment_id`, `user_concept_id`, `payment_method` |
| `SignedConsent.consent_id`, `signed_date` | `signed_consents.user_informed_consent_id`, `signed_at` |

El mapping evita cambios HTTP en F2. Los DTOs camelCase y los repositorios por
modulo reemplazaran gradualmente estos atributos desde F4.

## Deuda deliberadamente diferida

- Las credenciales Google siguen en `users` hasta encapsular calendario en F9.
- Los historiales medicos JSON se revisaran con el expediente clinico en F7.
- Los snapshots `current_balance` y `balance_after` se revisaran en F8 junto con
  las reglas contables.
- Los catalogos globales/personalizados se simplificaran en F8 y F10.

Estas decisiones conservan compatibilidad durante la coexistencia, pero ya no
condicionan nombres, tipos, integridad referencial ni reconstruccion del esquema.
