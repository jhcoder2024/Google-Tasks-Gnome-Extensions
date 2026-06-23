# Google Tasks - GNOME Shell Extension

Visualiza, crea, edita y gestiona tus tareas de Google Tasks directamente desde el panel superior de GNOME Shell. Compatible con GNOME Shell 45 a 50.

## Captura rápida

Haz clic en el icono del panel para ver tus tareas, crear nuevas, marcar como completadas, o cambiar de lista. Las notificaciones te avisan de tareas próximas a vencer.

## Características

- **Ver tareas** de Google Tasks desde el panel superior
- **Seleccionar listas** de tareas con un selector rápido
- **Crear tareas** con título, notas y fecha de vencimiento (formato YYYY-MM-DD)
- **Editar tareas** existentes (cambiar título, notas, fecha, lista destino)
- **Completar/descompletar tareas** con un clic en el checkbox
- **Eliminar tareas** con confirmación
- **Gestionar listas**: crear, renombrar y eliminar listas (con confirmación de seguridad)
- **Notificaciones** de tareas próximas a vencer (hoy, mañana, o en N días configurables)
- **Actualización automática** configurable (30s a 3600s)
- **Recuerda la sesión** al reiniciar GNOME Shell (tokens persistidos en Keyring)
- **Cerrar sesión** para cambiar de cuenta
- **Autenticación dual**: GNOME Online Accounts (GOA) como primario, OAuth 2.0 manual como fallback
- **Seguridad OAuth 2.0 + PKCE** con `state` parameter anti-CSRF y `code_challenge` SHA-256
- **Tokens almacenados** de forma segura en GNOME Keyring (libsecret)
- **Interfaz GTK4 + LibAdwaita** en preferencias
- **Internacionalización** con soporte gettext (PO archivos para traducciones)

## Requisitos

- GNOME Shell `>= 45` (probado en 45, 46, 47, 48, 49 y 50)
- Conexión a internet
- Una cuenta de Google
- Cliente OAuth 2.0 configurado en Google Cloud Console (ver [guía](docs/GUIA_GOOGLE_CLOUD.md))

### Dependencias de sistema (runtime)

| Paquete | Propósito |
|---------|-----------|
| `gnome-shell` (>= 45) | Runtime de la extensión |
| `gjs` | JavaScript runtime de GNOME |
| `libsecret` / `libsecret-1-0` | Almacenamiento seguro de tokens en GNOME Keyring |
| `libsoup3` | Cliente HTTP para peticiones API REST |
| `glib-networking` | Soporte TLS/SSL para libsoup |

## Instalación

### Desde extensions.gnome.org (próximamente)

La extensión será publicada en [extensions.gnome.org](https://extensions.gnome.org/) próximamente.

### Instalación manual con script

```bash
git clone https://github.com/jhcoder/task_gnome_extension.git
cd task_gnome_extension
chmod +x install.sh
./install.sh          # Instalación para el usuario actual
# ./install.sh --system  # Instalación para todos los usuarios (requiere sudo)
```

### Instalación con Meson

```bash
git clone https://github.com/jhcoder/task_gnome_extension.git
cd task_gnome_extension
meson setup build --prefix=/usr/local   # o ~/.local para local
ninja -C build install
```

### Activación

1. Reinicia GNOME Shell: `Alt+F2`, escribe `r`, `Enter`
2. Abre **Extensiones** (GNOME Extensions app)
3. Habilita **Google Tasks**

## Configuración inicial

1. Sigue la **[Guía de Google Cloud](docs/GUIA_GOOGLE_CLOUD.md)** para:
   - Crear un proyecto
   - Habilitar Google Tasks API
   - Configurar pantalla de consentimiento OAuth
   - Crear un **Client ID** para aplicación de escritorio
   - Agregar `http://127.0.0.1:18080` como URI de redireccionamiento autorizado
   - Agregar tu correo como usuario de prueba

2. Abre **Preferencias** de la extensión (clic derecho en el icono del panel > Preferencias, o desde Extensions app)

3. Configura los siguientes campos:

   | Campo | Descripción |
   |-------|-------------|
   | **Usar GNOME Online Accounts** | Activado por defecto. Intenta autenticar con la cuenta de Google configurada en el sistema |
   | **Client ID** | ID de cliente OAuth de Google Cloud Console (obligatorio si GOA no está disponible) |
   | **Client Secret** | Secreto de cliente (opcional, PKCE lo hace innecesario) |
   | **Intervalo de actualización** | Segundos entre recargas automáticas (por defecto 300s = 5 min) |
   | **Notificaciones** | Activar/desactivar alertas de tareas próximas a vencer |
   | **Días de anticipación** | Notificar tareas que vencen en este número de días (0 = solo hoy, por defecto 1) |

4. Haz clic en el icono de Google Tasks en el panel superior
5. Selecciona **Conectar con Google...**
6. Autoriza la aplicación en el navegador
7. ¡Listo! Tus tareas aparecerán en el menú

## Uso

### Menú principal

Al hacer clic en el icono del panel (icono `view-list-symbolic`), se despliega el menú con:

- **Cabecera**: nombre de la lista actual
- **Selector de lista** (si hay más de una): permite cambiar entre listas
- **Gestionar lista**: renombrar o eliminar la lista actual
- **Lista de tareas**: cada tarea muestra checkbox, título, fecha de vencimiento, notas (truncadas a 80 caracteres), y botones de editar/eliminar
- **Nueva lista...**: crear una lista nueva
- **Nueva tarea...**: abrir formulario de creación
- **Refrescar**: recargar tareas manualmente
- **Cerrar sesión**: desconectar la cuenta de Google

### Gestión de tareas

| Acción | Cómo |
|--------|------|
| **Completar** | Haz clic en el checkbox de la tarea |
| **Editar** | Haz clic en el icono de editar (lápiz) |
| **Eliminar** | Haz clic en el icono de eliminar (papelera) con confirmación |
| **Crear** | Selecciona "Nueva tarea..." y completa título, notas (opcional) y fecha (opcional, formato YYYY-MM-DD) |
| **Navegar entre listas** | Usa el selector "Cambiar lista" en la cabecera |

### Notificaciones

La extensión muestra notificaciones nativas de GNOME Shell para tareas próximas a vencer. Verifica al:
- Autenticarse exitosamente
- Cada ciclo de actualización automática
- Al abrir el menú

## Preferencias

Las preferencias están construidas con **GTK4 + LibAdwaita** y ofrecen:

| Sección | Opción | Valores | Descripción |
|---------|--------|---------|-------------|
| **Autenticación** | Usar GNOME Online Accounts | On/Off | Priorizar GOA sobre OAuth manual |
| | Client ID | Texto | ID de cliente OAuth de Google Cloud |
| | Client Secret | Texto (oculto) | Secreto de cliente OAuth |
| **General** | Intervalo de actualización | 30-3600s (pasos de 30) | Frecuencia de recarga automática |
| **Notificaciones** | Notificaciones | On/Off | Activar alertas de tareas próximas |
| | Días de anticipación | 0-7 | Notificar tareas que vencen en N días |

## Arquitectura de autenticación

1. **GNOME Online Accounts (GOA)**: intenta obtener un token usando la cuenta de Google ya configurada en el sistema
2. **OAuth 2.0 manual (fallback)**: abre el navegador con una URL de autorización que incluye:
   - `response_type=code`
   - `access_type=offline` (para recibir refresh token)
   - `prompt=consent` (forzar pantalla de consentimiento cada vez)
   - PKCE: `code_challenge` (SHA-256) y `code_challenge_method=S256`
   - `state` parameter: valor aleatorio de 32 caracteres hex para prevenir CSRF
3. **Callback**: la extensión inicia un servidor HTTP local en `http://127.0.0.1:18080` para capturar el código de autorización
4. **Intercambio**: el código se intercambia por tokens (`access_token` + `refresh_token`) usando PKCE
5. **Almacenamiento**: ambos tokens se guardan en GNOME Keyring vía libsecret
6. **Refresco automático**: si el `access_token` expira (HTTP 401), se usa el `refresh_token` para obtener uno nuevo

## Seguridad

- **PKCE (Proof Key for Code Exchange)**: el `code_verifier` se genera localmente (32 bytes aleatorios, base64url sin padding) y su hash SHA-256 se envía en la solicitud de autorización. Esto evita ataques de interceptación del código de autorización incluso sin Client Secret.
- **State parameter anti-CSRF**: el servidor de callback valida que el `state` recibido coincida con el generado antes de abrir el navegador.
- **Tokens en Keyring**: los tokens nunca se almacenan en disco plano; se guardan en GNOME Keyring con esquema `org.gnome.shell.extensions.google-tasks`.
- **Limpieza de tokens**: al cerrar sesión, los tokens se eliminan del Keyring. Los valores de configuración (Client ID/Secret) se conservan.
- **Timeout de autorización**: el servidor de callback tiene un timeout de 120 segundos.

## Estructura del proyecto

```
task_gnome_extension/
├── src/
│   ├── extension.js          # Punto de entrada de la extensión (PanelMenu.Button)
│   ├── oauthManager.js       # Gestor de autenticación OAuth2 + PKCE + GOA + Keyring
│   ├── googleTasksApi.js     # Cliente completo API Google Tasks v1 (CRUD tareas y listas)
│   ├── taskListWidget.js     # Widget de lista de tareas (menú completo, CRUD, notificaciones)
│   ├── taskItemWidget.js     # Widget de item individual (checkbox, editar, eliminar)
│   ├── prefs.js              # Ventana de preferencias GTK4 + LibAdwaita
│   ├── utils.js              # Utilidades (getSettings, formatDate, sanitizeText, debounce)
│   └── stylesheet.css        # Estilos CSS para el menú del panel
├── schemas/
│   └── org.gnome.shell.extensions.google-tasks.gschema.xml  # Esquema GSettings
├── docs/
│   ├── GUIA_GOOGLE_CLOUD.md  # Guía paso a paso de configuración en Google Cloud Console
│   ├── ANALISIS.md           # Análisis técnico del proyecto
│   └── PLAN_DE_ACCION.md     # Plan de desarrollo
├── po/                       # Traducciones gettext
│   ├── google-tasks-extension.pot   # Plantilla de traducciones
│   ├── en.po                 # Inglés
│   ├── fr.po                 # Francés
│   └── meson.build           # Configuración de compilación de traducciones
├── metadata.json             # Metadatos de la extensión (uuid, versiones de Shell, etc.)
├── meson.build               # Sistema de build Meson (>= 0.60.0)
├── install.sh                # Script de instalación manual
├── CHANGELOG.md              # Registro de cambios
└── README.md                 # Este archivo
```

## Tecnologías

| Componente | Tecnología |
|------------|-----------|
| Lenguaje | JavaScript (ESM) |
| Runtime | GJS (GNOME JavaScript) |
| UI Panel | St (Shell Toolkit) + Clutter |
| UI Prefs | GTK4 + LibAdwaita (Adw) |
| Build | Meson `>= 0.60.0` |
| API REST | Google Tasks v1 |
| Autenticación | OAuth 2.0 + PKCE (S256) + GOA |
| HTTP (API) | libsoup3 (Soup) |
| HTTP (Callback) | Soup.Server (loopback `127.0.0.1:18080`) |
| Almacenamiento seguro | libsecret (GNOME Keyring) |
| Configuración | GSettings (dconf) |
| Internacionalización | gettext (PO/MO) |
| Sistema de ventanas | Wayland / X11 (compatible con ambos) |

## Solución de problemas

### La extensión no aparece en el panel
- Verifica que la versión de GNOME Shell sea compatible (45-50)
- Revisa los logs: `journalctl -f -o cat /usr/bin/gnome-shell`
- Verifica que la extensión esté habilitada en Extensiones

### Error de autenticación
- Verifica que el **Client ID** esté correctamente configurado en Preferencias
- Asegúrate de que `http://127.0.0.1:18080` esté agregado como URI de redireccionamiento autorizado en Google Cloud Console
- Si usas GOA, verifica que tengas una cuenta de Google configurada en Configuración > Cuentas Online

### "State mismatch — posible ataque CSRF"
- Cierra la extensión y reintenta la autenticación
- Si persiste, reinicia GNOME Shell

### Las tareas no se cargan
- Verifica que Google Tasks API esté habilitada en tu proyecto de Google Cloud
- Revisa los logs de GNOME Shell
- Prueba a cerrar sesión y volver a autenticar

## Desarrollo

```bash
# Clonar
git clone https://github.com/jhcoder/task_gnome_extension.git
cd task_gnome_extension

# Instalar en modo desarrollo (usuario actual)
mkdir -p ~/.local/share/gnome-shell/extensions/google-tasks@jhcode.dev
cp src/*.js ~/.local/share/gnome-shell/extensions/google-tasks@jhcode.dev/
cp src/*.css ~/.local/share/gnome-shell/extensions/google-tasks@jhcode.dev/
cp metadata.json ~/.local/share/gnome-shell/extensions/google-tasks@jhcode.dev/
cp schemas/*.xml ~/.local/share/glib-2.0/schemas/
glib-compile-schemas ~/.local/share/glib-2.0/schemas/

# O usar el script de instalación
./install.sh

# Ver logs en vivo
journalctl -f -o cat /usr/bin/gnome-shell
```

## Licencia

GNU General Public License v3.0 or later (GPL-3.0-or-later)

Véase el archivo [LICENSE](LICENSE) para más detalles.
