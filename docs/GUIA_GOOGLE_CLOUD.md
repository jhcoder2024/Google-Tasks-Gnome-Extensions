# Guía de Configuración: Google Cloud Console

Para que la extensión Google Tasks funcione, necesitas crear un proyecto en Google Cloud Console y obtener un **Client ID** de OAuth 2.0.

> **Nota:** La extensión usa **PKCE (Proof Key for Code Exchange)**, por lo que **no necesitas** el Client Secret. Solo el Client ID es suficiente.

## Paso 1: Crear un proyecto en Google Cloud Console

1. Abre [Google Cloud Console](https://console.cloud.google.com/)
2. Inicia sesión con tu cuenta de Google
3. Haz clic en el selector de proyectos (arriba a la izquierda)
4. Haz clic en **NUEVO PROYECTO**
5. Ponle un nombre, por ejemplo: `GNOME Tasks Extension`
6. Haz clic en **CREAR**

## Paso 2: Habilitar Google Tasks API

1. En el menú de navegación (☰), ve a **APIs y Servicios** > **Biblioteca**
2. Busca "Google Tasks API"
3. Haz clic en **Google Tasks API**
4. Haz clic en **HABILITAR**

## Paso 3: Configurar pantalla de consentimiento OAuth

1. Ve a **APIs y Servicios** > **Pantalla de consentimiento de OAuth**
2. Verás un menú lateral con estas opciones:
   - Descripción general
   - **Información de la marca** ← EMPIEZA AQUÍ
   - Público
   - Clientes
   - Acceso a los datos
   - Centro de verificación
   - Configuración
3. Haz clic en **Información de la marca** (si no estás ahí ya)
4. En **Tipo de usuario**, selecciona **Externo** (para cuentas personales)
5. Haz clic en **CREAR**
6. Completa los campos:
   - **Nombre de la aplicación**: `GNOME Google Tasks`
   - **Correo electrónico de soporte**: selecciona tu correo
   - **Correo electrónico de contacto**: tu correo
7. Haz clic en **GUARDAR Y CONTINUAR**
8. Ve a la sección **Acceso a los datos** en el menú lateral
9. Haz clic en **AGREGAR O ELIMINAR SCOPES**
10. En el panel que se abre, busca `Tasks` o filtra por `https://www.googleapis.com/auth/tasks`
11. Selecciona: **.../auth/tasks** (Google Tasks API)
12. Haz clic en **ACTUALIZAR** > **GUARDAR Y CONTINUAR**
13. Ve a la sección **Clientes** en el menú lateral (aquí verás los clientes que crees después)
14. Ve a la sección **Público** en el menú lateral
15. En **Usuarios de prueba**, haz clic en **AGREGAR USUARIOS**
16. Agrega tu correo electrónico (el mismo de tu cuenta de Google)
17. Haz clic en **GUARDAR Y CONTINUAR**

## Paso 4: Crear credenciales OAuth 2.0

1. Ve a **APIs y Servicios** > **Credenciales**
2. Haz clic en **+ CREAR CREDENCIALES** > **ID de cliente de OAuth**
3. En **Tipo de aplicación**, selecciona **Aplicación de escritorio**
4. Ponle un nombre: `GNOME Extension Client`
5. Haz clic en **CREAR**
6. **IMPORTANTE**: Aparecerá una ventana con tu **Client ID**
   - **Client ID**: `algo.apps.googleusercontent.com`
7. Copia el **Client ID** y guárdalo en un lugar seguro
8. **IMPORTANTE**: Después de crear las credenciales, haz clic en **EDITAR** (el lápiz) sobre la credencial que acabas de crear
9. En **URI de redireccionamiento autorizados**, haz clic en **AGREGAR URI**
10. Agrega: `http://127.0.0.1:18080`
11. Haz clic en **GUARDAR**

> **Nota sobre PKCE:** La extensión usa PKCE, por lo que el Client Secret **no es necesario**. Google no te pedirá configurar un secret para aplicaciones de escritorio que usan PKCE. Si ves un Client Secret en la consola, puedes ignorarlo — la extensión no lo usa.

## Paso 5: Configurar la extensión

1. Abre la extensión Google Tasks en GNOME
2. Haz clic derecho en el icono y selecciona **Preferencias**
3. En la ventana de preferencias, ingresa el **Client ID** que copiaste
4. Cierra preferencias
5. Haz clic en el icono de Google Tasks en el panel
6. Selecciona **Conectar con Google...**
7. Se abrirá el navegador para autorizar la aplicación
8. Acepta los permisos solicitados
9. ¡Listo! La extensión mostrará tus tareas

## Solución de Problemas

### "Error: redirect_uri_mismatch"
- Asegúrate de haber seleccionado "Aplicación de escritorio" al crear las credenciales
- Verifica que hayas agregado `http://127.0.0.1:18080` como URI de redireccionamiento autorizado

### "Error: access_denied"
- Asegúrate de haber agregado tu correo como usuario de prueba en la pantalla de consentimiento

### "La extensión no muestra mis tareas"
- Verifica que Google Tasks API esté habilitada en tu proyecto
- Revisa que el Client ID esté correcto en preferencias
- Revisa los logs de GNOME Shell: `journalctl -f -o cat /usr/bin/gnome-shell`

### "Error: State mismatch"
- Cierra la extensión y vuelve a intentar la autenticación desde cero
- Si persiste, reinicia GNOME Shell (Alt+F2, escribe `r`, Enter)
```
