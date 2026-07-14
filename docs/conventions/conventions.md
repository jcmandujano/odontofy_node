# Convenciones de Desarrollo - Odontofy

## Propósito

Este documento define las reglas técnicas y convenciones del proyecto.
Todo el código nuevo debe seguir estas reglas para mantener consistencia y facilitar el uso de herramientas de generación de código como Copilot.

---

## Arquitectura

### Flujo de una request

Todas las requests deben seguir este flujo:

Route → Middlewares → Controller → Service → Model → Response

---

### Responsabilidades por capa

#### Routes

* Definen endpoints REST bajo `/api/*`
* Aplican middlewares en orden

#### Middlewares

* Validaciones (express-validator)
* Autenticación (JWT)
* Seguridad (rate limiting, logging)

#### Controllers

* Reciben y procesan request/response
* Extraen datos (`req.body`, `req.params`, `req.query`)
* Obtienen usuario autenticado (`req.authorUid`)
* Llaman a services
* Devuelven responses estandarizadas
* NO contienen lógica de negocio

#### Services

* Contienen lógica de negocio
* Orquestan operaciones
* Pueden llamar a models
* No manejan request/response directamente

#### Models

* Manejan acceso a base de datos con Sequelize
* Definen relaciones
* Representan entidades del dominio

#### Utils / Helpers

* Funciones auxiliares (responses, JWT, logging)

---

## Convenciones de Código

### Naming

* Archivos: kebab-case
  Ejemplo: `auth.controller.ts`, `patient.service.ts`

* Variables y funciones: camelCase
  Ejemplo: `doLogin`, `getPatientById`

* Clases y modelos: PascalCase
  Ejemplo: `User`, `Patient`

* Base de datos:

  * Columnas: snake_case (`user_id`)
  * Código: camelCase (`userId`)

---

## Controllers

Reglas:

* Siempre usar funciones async
* Extraer datos con destructuring
* Delegar lógica a services
* Manejar errores con try/catch
* Usar respuestas estandarizadas

Ejemplo:

```ts
export const doLogin = async (req: Request, res: Response) => {
    const { username, password } = req.body;

    try {
        const user = await User.findOne({ where: { email: username } });

        return successResponse(res, user, 'Login exitoso');
    } catch (error) {
        return errorResponse(res, 'Error en login', 500, error);
    }
};
```

---

## Services

Reglas:

* Encapsulan lógica de negocio
* No manejan objetos `req` o `res`
* Reciben parámetros simples (objetos o primitivas)
* Pueden interactuar con models

Ejemplo:

```ts
interface SendEmailOptions {
    to: string;
    subject: string;
    html: string;
}

export const sendEmail = async ({ to, subject, html }: SendEmailOptions) => {
    // integración externa
};
```

---

## Models

Reglas:

* Usar Sequelize
* Definir interfaces TypeScript
* Incluir métodos de instancia cuando sea necesario
* Definir relaciones explícitas

Ejemplo:

```ts
class User extends Model<UserAttributes> implements UserAttributes {
    toSafeJSON() {
        // Oculta campos sensibles
    }
}
```

---

## Formato de Respuestas

Todas las respuestas deben seguir esta estructura:

```json
{
  "success": true,
  "message": "string",
  "data": {},
  "errors": null
}
```

Para errores:

```json
{
  "success": false,
  "message": "string",
  "data": null,
  "errors": {}
}
```

Reglas:

* Usar `successResponse` y `errorResponse`
* No devolver datos sin este formato
* Mensajes en español

---

## Manejo de Errores

Reglas:

* Usar try/catch en controllers y services
* No exponer errores internos directamente
* Loggear errores relevantes

Ejemplo:

```ts
try {
    // lógica
} catch (error) {
    logSecurityEvent('EVENT', 'error', { ip: req.ip });
    return errorResponse(res, 'Error interno', 500, error);
}
```

---

## Validaciones

Reglas:

* Usar `express-validator`
* Definir validaciones en middlewares
* Aplicarlas en routes
* Usar mensajes en español

Ejemplo:

```ts
export const loginValidations = [
    body('username').isEmail().withMessage('Email inválido'),
    body('password').notEmpty().withMessage('Contraseña requerida')
];
```

---

## Acceso a Datos

Reglas:

* Usar Sequelize para todas las operaciones
* No hacer queries directos fuera de models/services
* Usar relaciones (`include`) cuando sea necesario
* Implementar paginación en listados

Ejemplo:

```ts
const { count, rows } = await Patient.findAndCountAll({
    where: { user_id: authorUid },
    include: [{ model: Appointment }],
    limit,
    offset
});
```

---

## Reglas de Consistencia

* Todos los endpoints deben seguir el mismo formato de respuesta
* Todas las validaciones deben estar en middlewares
* Todos los errores deben manejarse de forma consistente
* Todos los nombres deben seguir las convenciones definidas

---

## Qué NO hacer

* No agregar lógica de negocio en controllers
* No usar `req` o `res` dentro de services
* No devolver respuestas sin el formato estándar
* No duplicar lógica entre controllers y services
* No omitir validaciones en endpoints

---

## Generación de Código con IA

Cuando se genere código con Copilot o ChatGPT:

* Seguir estrictamente este documento
* Mantener el flujo: Controller → Service → Model
* Usar respuestas estandarizadas
* Respetar naming conventions
* Priorizar simplicidad y claridad

---
