# Análisis del Proyecto: GNOME Extension + Google Tasks
## 1. Contexto y Motivación
Extensión para GNOME Shell que permite visualizar y gestionar tareas de Google Tasks directamente desde el panel superior del escritorio, eliminando la necesidad de abrir el navegador o aplicaciones externas para consultar y administrar tareas.
## 2. Requerimientos
### 2.1 Funcionales
| ID | Descripción | Prioridad |
|----|-------------|-----------|
| RF-01 | Visualizar lista de tareas de Google Tasks en el panel de GNOME | Alta |
| RF-02 | Crear nuevas tareas desde la extensión | Alta |
| RF-03 | Marcar tareas como completadas | Alta |
| RF-04 | Editar tareas existentes | Media |
| RF-05 | Eliminar tareas | Media |
| RF-06 | Seleccionar entre múltiples listas de tareas | Media |
| RF-07 | Autenticarse con cuenta de Google (OAuth2) | Alta |
| RF-08 | Actualización automática de la lista de tareas | Media |
### 2.2 No Funcionales
| ID | Descripción |
|----|-------------|
| RNF-01 | Compatible con GNOME Shell 45+ (probado en 50.2) |
| RNF-02 | Autenticación segura mediante OAuth 2.0 |
| RNF-03 | Almacenamiento seguro de tokens (GNOME Keyring) |
| RNF-04 | Interfaz nativa de GNOME (St/GTK4/Adw) |
| RNF-05 | Sin dependencias externas más allá de las de GNOME |
| RNF-06 | Actualización automática configurable (30-3600 segundos) |
| RNF-07 | Manejo graceful de errores de red y autenticación |
## 3. Restricciones Técnicas
- **Runtime**: GJS (GNOME JavaScript, motor SpiderMonkey)
- **UI Panel**: St (Shell Toolkit) para widgets en el panel
- **UI Preferencias**: GTK4 + LibAdwaita
- **Sistema de extensiones**: GNOME 45+ (ESM modules)
- **API Externa**: Google Tasks API v1 (REST)
- **Autenticación**: OAuth 2.0 con Google Identity Platform
- **Plataforma**: Linux con GNOME Shell (Fedora como referencia)
- **Red**: Requiere conexión a internet para operar
## 4. Análisis de Alternativas
### 4.1 Autenticación
| Alternativa | Pros | Contras | Decisión |
|-------------|------|---------|----------|
| GOA (GNOME Online Accounts) | Ya integrado en GNOME, sin fricción para el usuario | No expone scope de Tasks API directamente; depende de implementación de GOA | **Intentar primero** |
| OAuth2 manual (loopback) | Control total del flujo, funciona siempre | Requiere setup en Google Cloud Console | **Fallback** |
| Token de servicio (Service Account) | Sin interacción del usuario | No aplica para cuentas personales, solo GSuite | Descartado |
### 4.2 UI
| Alternativa | Pros | Contras | Decisión |
|-------------|------|---------|----------|
| Menú en panel superior | Rápido, integrado, no intrusivo | Espacio limitado para contenido | **Seleccionado** |
| Ventana de aplicación separada | Más espacio para contenido | Menos integrada, más pesada | Descartado |
| Notificaciones | No bloqueante | Interacción limitada | Complementario (futuro) |
### 4.3 Almacenamiento de Tokens
| Alternativa | Pros | Contras | Decisión |
|-------------|------|---------|----------|
| GNOME Keyring (Secret Service) | Seguro, estándar en GNOME | Más complejo de implementar | **Seleccionado** |
| GSettings | Simple, integrado | No seguro para tokens | Placeholder inicial |
| Archivo plano en ~/.config | Simple | Inseguro | Descartado |
## 5. Riesgos y Mitigaciones
| ID | Riesgo | Probabilidad | Impacto | Mitigación |
|----|--------|-------------|---------|------------|
| R-01 | GOA no proporciona scope de Google Tasks | Alta | Medio | Fallback a OAuth2 manual |
| R-02 | Token de acceso expira sin refresh token | Media | Alto | Solicitar offline access type en OAuth |
| R-03 | Usuario sin conexión a internet | Baja | Alto | Mensaje claro de error, cache local |
| R-04 | Cambios en API de Google Tasks | Baja | Alto | Usar versión v1 estable de la API |
| R-05 | Compatibilidad con futuras versiones de GNOME | Media | Medio | Usar APIs públicas y estables de GNOME Shell |
| R-06 | Usuario cierra sesión de GNOME | Media | Bajo | Persistir tokens en keyring |
| R-07 | Rate limiting de Google Tasks API | Baja | Medio | Cache local, refresh controlado |
## 6. Decisiones Arquitectónicas
### ADR-001: Estrategia de Autenticación
- **Contexto**: Necesitamos autenticar al usuario contra Google Tasks
- **Decisión**: Usar GOA como método primario, OAuth2 manual como fallback
- **Consecuencias**: GOA simplifica la UX pero puede no funcionar; el fallback requiere configuración manual de Google Cloud Console
### ADR-002: Almacenamiento de Tokens
- **Contexto**: Los tokens OAuth2 son credenciales sensibles
- **Decisión**: Almacenar en GNOME Keyring (Secret Service)
- **Consecuencias**: Implementación más compleja pero segura; GSettings como placeholder temporal
### ADR-003: UI como Menú en Panel
- **Contexto**: Necesitamos una interfaz rápida y accesible
- **Decisión**: Menú desplegable en el panel superior con icono
- **Consecuencias**: Espacio limitado pero integración natural con GNOME
### ADR-004: Refresh Automático
- **Contexto**: Las tareas deben mantenerse actualizadas
- **Decisión**: Refresh automático configurable (default 5 minutos)
- **Consecuencias**: Consumo de red periódico; configurable por el usuario
### ADR-005: Cache Local
- **Contexto**: Mejorar la capacidad de respuesta y reducir llamadas API
- **Decisión**: Cache local de tareas con actualización en segundo plano
- **Consecuencias**: Datos disponibles inmediatamente al abrir el menú
## 7. Stack Tecnológico
| Componente | Tecnología | Versión |
|------------|-----------|---------|
| Lenguaje | JavaScript (ESM) | ES2020+ |
| Runtime | GJS (GNOME JavaScript) | - |
| UI Panel | St (Shell Toolkit) | GNOME 45+ |
| UI Prefs | GTK4 + LibAdwaita | GNOME 45+ |
| Build | Meson | >= 0.60.0 |
| API | Google Tasks v1 | REST |
| Auth | OAuth 2.0 | Google Identity |
| Keyring | libsecret (GNOME Keyring) | - |