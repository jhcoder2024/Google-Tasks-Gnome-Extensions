# Política de Privacidad - Google Tasks GNOME Extension

**Última actualización:** 22 de junio de 2026

## Datos que recopilamos

Esta extensión **no recopila, almacena ni transmite ningún dato personal** a servidores externos que no sean los propios de Google.

### Datos procesados localmente

- **Tokens de autenticación**: Se almacenan localmente en GNOME Keyring (libsecret) para mantener la sesión iniciada.
- **Tareas de Google Tasks**: Se cargan desde Google Tasks API y se muestran en el menú de GNOME. No se almacenan en ningún otro lugar.
- **Preferencias**: Se almacenan localmente en GSettings (intervalo de refresh, notificaciones, etc.).

### Datos compartidos con Google

- La extensión se conecta a la **API de Google Tasks v1** para leer y escribir tus tareas.
- La autenticación se realiza mediante **OAuth 2.0** con los scopes mínimos necesarios (`https://www.googleapis.com/auth/tasks`).
- Google puede recopilar datos según su propia [política de privacidad](https://policies.google.com/privacy).

## Qué NO hacemos

- ❌ No recopilamos datos de uso
- ❌ No enviamos datos a servidores propios
- ❌ No compartimos información con terceros
- ❌ No mostramos anuncios
- ❌ No rastreamos tu actividad

## Seguridad

- Los tokens OAuth se almacenan en **GNOME Keyring**, el almacén de credenciales seguro del sistema.
- La comunicación con Google Tasks API es mediante **HTTPS**.
- El flujo OAuth implementa **PKCE** (Proof Key for Code Exchange) para mayor seguridad.
- Puedes cerrar sesión en cualquier momento desde las Preferencias de la extensión.

## Contacto

Si tienes preguntas sobre esta política de privacidad, puedes contactar al desarrollador en: jhcoder2024@gmail.com

## Código abierto

Esta extensión es de código abierto. Puedes revisar el código fuente completo en:
https://github.com/jhcoder/task_gnome_extension
