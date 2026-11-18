# Despliegue de la API en Render

El servicio existente se configura desde el panel de Render. Este repositorio
no incluye un Blueprint vinculado al servicio, por lo que actualizar estos
archivos o hacer merge de este documento no cambia sus comandos automaticamente.

En la configuracion del servicio web de la API, selecciona la rama que se va a
desplegar y configura:

| Campo | Valor |
| --- | --- |
| Build Command | `npm ci --include=dev && npm run build` |
| Start Command | `npm start` |

La instalacion incluye las dependencias de desarrollo porque TypeScript se
utiliza durante la compilacion. `npm run build` genera `dist/server.js` y
`npm start` ejecuta ese archivo. `src/app.ts` define la aplicacion Express,
pero el servidor se inicia desde `src/server.ts`.

Guarda la configuracion y vuelve a desplegar. Comprueba en el registro que
termina la compilacion y que el comando de inicio es `npm start`. El inicio
requiere que las variables de entorno y la conexion a la base de datos ya esten
configuradas. Si aparece otro error, revisa el registro del despliegue antes de
cambiar variables o ejecutar migraciones.
