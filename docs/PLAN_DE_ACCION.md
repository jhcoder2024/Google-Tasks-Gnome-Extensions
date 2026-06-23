# Plan de Acción: GNOME Extension + Google Tasks
## Visión General
Crear una extensión para GNOME Shell que permita a los usuarios visualizar y gestionar sus tareas de Google Tasks directamente desde el panel superior del escritorio.
## Fases del Proyecto
| Fase | Descripción | Duración Est. | Dependencias | Agente(s) |
|------|-------------|---------------|--------------|-----------|
| 1 | Setup del proyecto | 1 día | Ninguna | dev-semi |
| 2 | Autenticación OAuth2 | 2-3 días | Fase 1 | dev-semi |
| 3 | UI Panel | 2 días | Fase 1 | dev-semi |
| 4 | CRUD Tareas | 3 días | Fases 2, 3 | dev-semi |
| 5 | Pruebas y Seguridad | 1 día | Fase 4 | qa-semi, security-review |
| 6 | Documentación final | 1 día | Fase 5 | docs-semi |
| 7 | Empaquetado | 1 día | Fase 6 | devops |
**Duración total estimada**: 11-13 días
## Desglose de Tareas por Fase
### Fase 1: Setup del Proyecto ✅ (COMPLETADA)
- [x] Refinar requerimientos con el usuario
- [x] Planificación técnica y arquitectura
- [x] Crear ANALISIS.md con análisis completo
- [x] Crear PLAN_DE_ACCION.md con plan detallado
- [x] Crear estructura de directorios del proyecto
- [x] Crear metadata.json
- [x] Crear schemas GSettings
- [x] Crear esqueletos de código (extension.js, prefs.js, etc.)
- [x] Crear stylesheet.css base
- [x] Crear meson.build
- [x] Crear README.md y CHANGELOG.md
### Fase 2: Autenticación OAuth2 (PENDIENTE)
- [ ] Implementar detección de GOA (GNOME Online Accounts)
- [ ] Implementar flujo OAuth2 manual con loopback redirect
- [ ] Implementar servidor HTTP local para capturar callback
- [ ] Implementar intercambio de código por tokens
- [ ] Implementar refresh automático de tokens
- [ ] Implementar almacenamiento en GNOME Keyring
- [ ] Crear GUIA_GOOGLE_CLOUD.md (paso a paso)
- [ ] Guiar al usuario en configuración de Google Cloud Console
### Fase 3: UI del Panel (PENDIENTE)
- [ ] Implementar indicador en panel superior con icono
- [ ] Implementar menú desplegable con estado de carga
- [ ] Implementar widget de lista de tareas (TaskListWidget)
- [ ] Implementar widget de item de tarea (TaskItemWidget)
- [ ] Implementar estilos CSS completos
- [ ] Implementar selector de listas de tareas
- [ ] Implementar botón de refresh manual
### Fase 4: CRUD de Tareas (PENDIENTE)
- [ ] Implementar GoogleTasksApi.listTaskLists()
- [ ] Implementar GoogleTasksApi.listTasks()
- [ ] Implementar GoogleTasksApi.createTask()
- [ ] Implementar GoogleTasksApi.updateTask()
- [ ] Implementar GoogleTasksApi.deleteTask()
- [ ] Implementar GoogleTasksApi.completeTask()
- [ ] Integrar API con widgets de UI
- [ ] Implementar diálogo de nueva tarea
- [ ] Implementar diálogo de edición de tarea
- [ ] Implementar confirmación de eliminación
### Fase 5: Pruebas y Seguridad (PENDIENTE)
- [ ] Revisión de seguridad del flujo OAuth
- [ ] Verificar almacenamiento seguro de tokens
- [ ] Pruebas de manejo de errores de red
- [ ] Pruebas de refresh de token expirado
- [ ] Pruebas de UI/UX en GNOME Shell 50.2
- [ ] Pruebas de rendimiento del menú
### Fase 6: Documentación Final (PENDIENTE)
- [ ] Completar README.md con instrucciones de instalación
- [ ] Completar ANALISIS.md con lecciones aprendidas
- [ ] Completar PLAN_DE_ACCION.md con resultados
- [ ] Crear GUIA_INSTALACION.md detallada
- [ ] Revisar y pulir toda la documentación
### Fase 7: Empaquetado (PENDIENTE)
- [ ] Configurar meson.build completo
- [ ] Probar instalación local con meson
- [ ] Probar instalación manual (copia de archivos)
- [ ] Verificar compilación de schemas
- [ ] Preparar para publicación en extensions.gnome.org
## Hitos (Milestones)
| Hito | Descripción | Fase | Criterio de Aceptación |
|------|-------------|------|------------------------|
| M1 | Setup completo | 1 | Estructura creada, metadata válida, schemas compilables |
| M2 | Autenticación funcional | 2 | Token obtenido y almacenado en keyring |
| M3 | UI operativa | 3 | Icono visible en panel, menú desplegable funcional |
| M4 | CRUD completo | 4 | Crear, leer, actualizar, completar y eliminar tareas |
| M5 | Extensión empaquetada | 7 | Instalable via meson o copia manual |
## Dependencias entre Tareas
Fase 1 (Setup)
  ├──> Fase 2 (Auth) ──┐
  └──> Fase 3 (UI) ────┤
                        ├──> Fase 4 (CRUD) ──> Fase 5 (Tests) ──> Fase 6 (Docs) ──> Fase 7 (Package)
## Asignación de Recursos
| Recurso | Rol | Fases Asignadas |
|---------|-----|-----------------|
| PMO (Project Manager) | Gestión, planificación, seguimiento | Todas |
| dev-semi | Desarrollo de código | 1, 2, 3, 4 |
| qa-semi | Pruebas de calidad | 5 |
| security-review | Revisión de seguridad | 5 |
| docs-semi | Documentación técnica | 6 |
| devops | Empaquetado y despliegue | 7 |
## Riesgos y Plan de Contingencia
| Riesgo | Plan de Contingencia |
|--------|---------------------|
| GOA no funciona | Proceder directamente con OAuth2 manual |
| Usuario no configura Google Cloud | Proveer guía paso a paso con capturas |
| Token refresh falla | Pedir re-autenticación completa |
| Bug en producción | Sistema de logging, versión con rollback |