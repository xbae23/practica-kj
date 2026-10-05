# Acceso Nexo UPA — login y panel

Este repositorio contiene **el login genérico, el panel y la API de cuentas**. La app principal vive por separado en [`xbae23/nexo-upa`](https://github.com/xbae23/nexo-upa). Ambos repositorios se conectan al mismo Cloudflare Worker.

## ⛔ NO TOCAR AL CAMBIAR EL DISEÑO

Puedes cambiar textos, colores, fuentes, imágenes y `styles.css`. Para que las cuentas sigan funcionando, conserva estos archivos y sus rutas:

- `auth-client.js`: registro, inicio y redirección a Nexo.
- `admin-client.js`: lectura de registros del panel.
- `cloudflare/worker.js`: API de cuentas y perfiles.
- `cloudflare/schema.sql`: tablas de la base D1.
- `config.js`: **cambia solo las URLs públicas**; nunca pongas claves privadas aquí.

Si reemplazas por completo el HTML, conserva los IDs: `form-registro`, `registro-usuario`, `registro-correo`, `form-entrada`, `entrada-identificador`, `aviso` en el login; `form-admin`, `admin-clave`, `usuarios-cuerpo`, `estado-panel`, `contador` en el panel. Son el contrato con los archivos de conexión.

## Qué se guarda

| Lugar | Datos |
| --- | --- |
| Panel `admin.html` | ID, usuario y correo del login, fecha de alta |
| Perfil dentro de Nexo | Nombre visible, alias, carrera, biografía, nota y teléfono opcional |

Los datos del perfil de Nexo **no aparecen en el panel**. El usuario de registro y el alias visible de Nexo son independientes: el alias no se copia automáticamente del login.

## Activar Cloudflare desde cero

1. En Cloudflare crea una base **D1** llamada `nexo-usuarios`. En su **Console**, ejecuta todo el contenido de [`cloudflare/schema.sql`](cloudflare/schema.sql).
2. Crea un **Worker** llamado `nexo-acceso`. Pega en él todo [`cloudflare/worker.js`](cloudflare/worker.js).
3. En el Worker, agrega un binding **D1 database** con nombre exacto `DB` y selecciona `nexo-usuarios`.
4. En **Variables and Secrets**, crea la variable normal `ALLOWED_ORIGINS` con valor `https://xbae23.github.io`. Es el origen compartido por ambos repositorios de GitHub Pages; no agregues `/practica-kj/` ni `/nexo-upa/`.
5. En el mismo lugar crea un **Secret** llamado `ADMIN_KEY` con una clave larga y aleatoria de al menos 24 caracteres. Consérvala fuera de GitHub. Se escribirá en el formulario del panel cuando quieras ver registros.
6. Despliega el Worker y copia su URL `https://...workers.dev`.
7. Cambia `apiUrl` en [`config.js`](config.js) por esa URL. En el repositorio de Nexo cambia `authApiUrl` en `public/app-config.js` por **la misma URL**. Publica ambos cambios.

Guías oficiales: [D1](https://developers.cloudflare.com/d1/get-started/), [Workers](https://developers.cloudflare.com/workers/get-started/dashboard/) y [Secrets](https://developers.cloudflare.com/workers/configuration/secrets/).

## Probar

1. Abre la [página de registro](https://xbae23.github.io/practica-kj/#registro). Crea una cuenta con usuario y correo de prueba.
2. Debe enviarte a Nexo. Allí escribe **otro nombre y alias visibles** y entra al feed.
3. Abre el [panel](https://xbae23.github.io/practica-kj/admin.html) e introduce `ADMIN_KEY`. Debes ver únicamente ID, usuario, correo y fecha.
4. Cierra la sesión en el perfil de Nexo. Desde el [mismo login](https://xbae23.github.io/practica-kj/#entrada), vuelve a entrar con tu correo o usuario. Deben recuperarse el mismo ID y perfil visible.

Para ejecutar la prueba automática local del backend con Node 24: `node tests/flujo.mjs`.

## Advertencia obligatoria de la demo

**El correo no se verifica. Cualquiera que conozca el usuario o correo de una cuenta podría entrar.** Es un experimento solicitado para pruebas, no un sistema de autenticación apto para estudiantes reales. No publiques datos sensibles aquí. El contenido social (posts, chats y medios) todavía se guarda en el navegador de cada cuenta; este backend centraliza únicamente cuentas y datos básicos del perfil.
