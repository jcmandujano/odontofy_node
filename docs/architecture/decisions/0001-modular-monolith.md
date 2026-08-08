# ADR-0001: Monolito modular incremental

- Estado: Accepted
- Fecha: 2026-08-07

## Contexto

La API actual contiene reglas validas de autenticacion, pacientes, tratamientos,
pagos e integraciones, pero distribuye cada capacidad entre carpetas tecnicas
globales y mantiene distintos niveles de separacion entre controllers y services.

## Decision

La API evolucionara dentro de este repositorio hacia un monolito modular orientado
por capacidades de negocio. Cada modulo agrupara HTTP, aplicacion, persistencia,
validacion e integraciones propias, con una interfaz publica explicita.

La migracion sera incremental. El codigo legacy permanecera disponible hasta que
su reemplazo v1 y el frontend correspondiente hayan sido validados.

No se introduciran microservicios, CQRS, event sourcing, un contenedor de inyeccion
de dependencias ni repositorios base genericos sin una necesidad demostrada.

## Consecuencias

- Se puede comparar comportamiento legacy y v1 dentro del mismo proceso.
- Los limites modulares se descubren antes de considerar distribucion fisica.
- Durante la transicion coexistiran dos estructuras y se vigilara que el codigo
  nuevo no dependa de internals legacy.
