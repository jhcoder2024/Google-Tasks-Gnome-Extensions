// Google Tasks Extension - Widget de Lista de Tareas
import St from 'gi://St';
import GObject from 'gi://GObject';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';
import Clutter from 'gi://Clutter';
import { TaskItemWidget } from './taskItemWidget.js';
// Función de traducción simple (gettext no disponible en este sistema)
const _ = (text) => text;
import { formatDate, getSettings } from './utils.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';

export class TaskListWidget {
    constructor(api) {
        this._api = api;
        this._currentTaskListId = null;
        this._currentTaskListTitle = '';
        this._taskLists = [];
        this._tasks = [];
        this._settings = null;
    }

    _getSettings() {
        if (!this._settings) {
            try {
                this._settings = getSettings();
            } catch (e) {
                log('Google Tasks: Error obteniendo settings: ' + e.message);
            }
        }
        return this._settings;
    }

    /**
     * Construir el menú completo con lista de tareas
     */
    async buildMenu(menu) {
        menu.removeAll();
        this._showLoading(menu, _('Cargando listas...'));
        try {
            this._taskLists = await this._api.listTaskLists();
            if (this._taskLists.length === 0) {
                menu.removeAll();
                this._renderEmptyState(menu);
                return;
            }
            if (!this._currentTaskListId) {
                this._currentTaskListId = this._taskLists[0].id;
                this._currentTaskListTitle = this._taskLists[0].title;
            }
            await this._refreshMenu(menu);
        } catch (e) {
            logError(e, 'Google Tasks: Error cargando listas');
            this._showError(menu, `Error: ${e.message}`);
        }
    }

    _renderEmptyState(menu) {
        const emptyItem = new PopupMenu.PopupMenuItem('📋 No hay listas de tareas');
        emptyItem.setSensitive(false);
        menu.addMenuItem(emptyItem);
        menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
        menu.addAction('➕ Crear nueva lista...', () => {
            this._showCreateListDialog(menu);
        });
    }

    async _refreshMenu(menu) {
        menu.removeAll();
        this._renderHeader(menu);
        menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
        try {
            this._tasks = await this._api.listTasks(this._currentTaskListId, {
                showCompleted: false,
                showHidden: false,
                maxResults: 50
            });
            if (this._tasks.length === 0) {
                const emptyItem = new PopupMenu.PopupMenuItem('✨ No hay tareas pendientes');
                emptyItem.setSensitive(false);
                menu.addMenuItem(emptyItem);
            } else {
                for (const task of this._tasks) {
                    const taskWidget = new TaskItemWidget(
                        task,
                        () => this._onCompleteTask(task, menu),
                        () => this._onEditTask(task, menu),
                        () => this._onDeleteTask(task, menu)
                    );
                    taskWidget.render(menu);
                }
            }
        } catch (e) {
            logError(e, 'Google Tasks: Error cargando tareas');
            this._showError(menu, `Error cargando tareas: ${e.message}`);
        }
        menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
        this._renderActions(menu);
    }

    _renderHeader(menu) {
        const headerItem = new PopupMenu.PopupBaseMenuItem({
            reactive: false,
            can_focus: false
        });
        const headerLayout = new St.BoxLayout({
            vertical: false,
            x_expand: true
        });
        const titleLabel = new St.Label({
            text: `📋 ${this._currentTaskListTitle || 'Google Tasks'}`,
            style_class: 'google-tasks-header-title',
            x_expand: true,
            y_align: Clutter.ActorAlign.CENTER
        });
        headerLayout.add_child(titleLabel);
        headerItem.add_child(headerLayout);
        menu.addMenuItem(headerItem);

        if (this._taskLists.length > 1) {
            const listSelectorItem = new PopupMenu.PopupSubMenuMenuItem('📂 Cambiar lista');
            for (const list of this._taskLists) {
                const isActive = list.id === this._currentTaskListId;
                const label = isActive ? `✓ ${list.title}` : list.title;
                if (isActive) {
                    const activeItem = new PopupMenu.PopupMenuItem(label);
                    activeItem.setSensitive(false);
                    listSelectorItem.menu.addMenuItem(activeItem);
                } else {
                    listSelectorItem.menu.addAction(label, () => {
                        this._currentTaskListId = list.id;
                        this._currentTaskListTitle = list.title;
                        this._refreshMenu(menu);
                    });
                }
            }
            menu.addMenuItem(listSelectorItem);
        }

        const manageItem = new PopupMenu.PopupSubMenuMenuItem('⚙️ Gestionar lista');
        manageItem.menu.addAction('✏️ Renombrar lista', () => {
            this._showRenameListDialog(menu);
        });
        manageItem.menu.addAction('🗑️ Eliminar lista', () => {
            this._showDeleteListConfirm(menu);
        });
        menu.addMenuItem(manageItem);

        menu.addAction('➕ Nueva lista...', () => {
            this._showCreateListDialog(menu);
        });
    }

    _renderActions(menu) {
        menu.addAction('✏️ Nueva tarea...', () => {
            this._showNewTaskInput(menu);
        });
        menu.addAction('🔄 Refrescar', () => {
            this._refreshMenu(menu);
        });
        menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
        menu.addAction('🚪 Cerrar sesión', () => {
            this._onLogout(menu);
        });
    }

    async _onLogout(menu) {
        try {
            // Limpiar solo los tokens del Keyring (NO el Client ID/Secret, son de la app)
            await this._api._oauth.clearTokens();
            // Marcar que no hay sesión activa
            const Gio = (await import('gi://Gio')).default;
            const settings = new Gio.Settings({ schema_id: 'org.gnome.shell.extensions.google-tasks' });
            settings.set_boolean('first-run', true);
            // Reconstruir menú inicial
            menu.removeAll();
            const titleItem = new PopupMenu.PopupMenuItem('Google Tasks');
            titleItem.setSensitive(false);
            menu.addMenuItem(titleItem);
            menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
            menu.addAction('Conectar con Google...', () => {
                if (this._onReconnect) {
                    this._onReconnect();
                }
            });
        } catch (e) {
            logError(e, 'Error cerrando sesión');
        }
    }

    // ============================================================
    // CRUD de TAREAS
    // ============================================================

    async _onCompleteTask(task, menu) {
        try {
            await this._api.completeTask(this._currentTaskListId, task.id);
            await this._refreshMenu(menu);
        } catch (e) {
            logError(e, 'Error completando tarea');
            this._showError(menu, `Error: ${e.message}`);
        }
    }

    async _onEditTask(task, menu) {
        this._showEditTaskInput(task, menu);
    }

    async _onDeleteTask(task, menu) {
        this._showDeleteTaskConfirm(task, menu);
    }

    _showNewTaskInput(menu) {
        menu.removeAll();
        const headerItem = new PopupMenu.PopupMenuItem('✏️ Nueva tarea');
        headerItem.setSensitive(false);
        menu.addMenuItem(headerItem);

        // Selector de lista (submenu)
        if (this._taskLists && this._taskLists.length > 1) {
            const listSubmenu = new PopupMenu.PopupSubMenuMenuItem('📂 Lista: ' + this._currentTaskListTitle);
            for (const list of this._taskLists) {
                const isActive = list.id === this._currentTaskListId;
                const label = isActive ? '✓ ' + list.title : list.title;
                const item = listSubmenu.menu.addAction(label, () => {
                    this._currentTaskListId = list.id;
                    this._currentTaskListTitle = list.title;
                    listSubmenu.label.text = '📂 Lista: ' + list.title;
                });
                if (isActive) {
                    item.setSensitive(false);
                }
            }
            menu.addMenuItem(listSubmenu);
        }

        menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

        const titleItem = new PopupMenu.PopupBaseMenuItem({ reactive: false });
        const titleEntry = new St.Entry({
            hint_text: _('Título de la tarea'),
            can_focus: true,
            x_expand: true
        });
        titleItem.add_child(titleEntry);
        menu.addMenuItem(titleItem);

        const notesItem = new PopupMenu.PopupBaseMenuItem({ reactive: false });
        const notesEntry = new St.Entry({
            hint_text: _('Notas (opcional)'),
            can_focus: true,
            x_expand: true
        });
        notesItem.add_child(notesEntry);
        menu.addMenuItem(notesItem);

        // Campo de fecha de vencimiento
        const dateItem = new PopupMenu.PopupBaseMenuItem({ reactive: false });
        const dateEntry = new St.Entry({
            hint_text: 'Vence: YYYY-MM-DD (ej: 2026-06-20)',
            can_focus: true,
            x_expand: true
        });
        dateItem.add_child(dateEntry);
        menu.addMenuItem(dateItem);

        menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

        menu.addAction('💾 Guardar', async () => {
            const title = titleEntry.get_text().trim();
            if (!title) {
                titleEntry.set_text('');
                titleEntry.set_hint_text('⚠️ El título es obligatorio');
                titleEntry.grab_key_focus();
                return;
            }
            const dueDate = dateEntry.get_text().trim();
            // Validar formato de fecha si se proporcionó
            if (dueDate && !/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) {
                dateEntry.set_text('');
                dateEntry.set_hint_text('⚠️ Formato: YYYY-MM-DD');
                return;
            }
            try {
                const taskData = {
                    title: title,
                    notes: notesEntry.get_text().trim()
                };
                if (dueDate) {
                    taskData.due = dueDate;
                }
                await this._api.createTask(this._currentTaskListId, taskData);
                await this._refreshMenu(menu);
            } catch (e) {
                logError(e, 'Error creando tarea');
                this._showError(menu, `Error: ${e.message}`);
            }
        });

        menu.addAction('❌ Cancelar', () => {
            this._refreshMenu(menu);
        });

        titleEntry.grab_key_focus();
    }

    _showEditTaskInput(task, menu) {
        menu.removeAll();
        const headerItem = new PopupMenu.PopupMenuItem('✏️ Editar tarea');
        headerItem.setSensitive(false);
        menu.addMenuItem(headerItem);

        // Selector de lista (submenu)
        if (this._taskLists && this._taskLists.length > 1) {
            const listSubmenu = new PopupMenu.PopupSubMenuMenuItem('📂 Lista: ' + this._currentTaskListTitle);
            for (const list of this._taskLists) {
                const isActive = list.id === this._currentTaskListId;
                const label = isActive ? '✓ ' + list.title : list.title;
                const item = listSubmenu.menu.addAction(label, () => {
                    this._currentTaskListId = list.id;
                    this._currentTaskListTitle = list.title;
                    listSubmenu.label.text = '📂 Lista: ' + list.title;
                });
                if (isActive) {
                    item.setSensitive(false);
                }
            }
            menu.addMenuItem(listSubmenu);
        }

        menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

        const titleItem = new PopupMenu.PopupBaseMenuItem({ reactive: false });
        const titleEntry = new St.Entry({
            text: task.title || '',
            can_focus: true,
            x_expand: true
        });
        titleItem.add_child(titleEntry);
        menu.addMenuItem(titleItem);

        const notesItem = new PopupMenu.PopupBaseMenuItem({ reactive: false });
        const notesEntry = new St.Entry({
            text: task.notes || '',
            hint_text: 'Notas',
            can_focus: true,
            x_expand: true
        });
        notesItem.add_child(notesEntry);
        menu.addMenuItem(notesItem);

        // Campo de fecha de vencimiento
        const dateItem = new PopupMenu.PopupBaseMenuItem({ reactive: false });
        const dueStr = task.due ? task.due.substring(0, 10) : '';
        const dateEntry = new St.Entry({
            text: dueStr,
            hint_text: 'Vence: YYYY-MM-DD (ej: 2026-06-20)',
            can_focus: true,
            x_expand: true
        });
        dateItem.add_child(dateEntry);
        menu.addMenuItem(dateItem);

        menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

        menu.addAction('💾 Guardar cambios', async () => {
            const title = titleEntry.get_text().trim();
            if (!title) {
                titleEntry.set_text('');
                titleEntry.set_hint_text('⚠️ El título es obligatorio');
                titleEntry.grab_key_focus();
                return;
            }
            const dueDate = dateEntry.get_text().trim();
            // Validar formato de fecha si se proporcionó
            if (dueDate && !/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) {
                dateEntry.set_text('');
                dateEntry.set_hint_text('⚠️ Formato: YYYY-MM-DD');
                return;
            }
            try {
                const taskData = {
                    title: title,
                    notes: notesEntry.get_text().trim(),
                    status: task.status
                };
                if (dueDate) {
                    taskData.due = dueDate;
                }
                if (!task.id) {
                    this._showError(menu, 'Error: ID de tarea no encontrado.');
                    return;
                }
                log('Google Tasks: Editando tarea ID=' + JSON.stringify(task.id) + ' taskListId=' + this._currentTaskListId);
                await this._api.updateTask(this._currentTaskListId, task.id, taskData);
                await this._refreshMenu(menu);
            } catch (e) {
                logError(e, 'Error actualizando tarea');
                this._showError(menu, `Error: ${e.message}`);
            }
        });

        menu.addAction('❌ Cancelar', () => {
            this._refreshMenu(menu);
        });

        titleEntry.grab_key_focus();
    }

    _showDeleteTaskConfirm(task, menu) {
        menu.removeAll();
        const warnItem = new PopupMenu.PopupMenuItem(`⚠️ ¿Eliminar "${task.title}"?`);
        warnItem.setSensitive(false);
        menu.addMenuItem(warnItem);
        menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

        menu.addAction('🗑️ Sí, eliminar', async () => {
            try {
                await this._api.deleteTask(this._currentTaskListId, task.id);
                await this._refreshMenu(menu);
            } catch (e) {
                logError(e, 'Error eliminando tarea');
                this._showError(menu, `Error: ${e.message}`);
            }
        });

        menu.addAction('❌ Cancelar', () => {
            this._refreshMenu(menu);
        });
    }

    // ============================================================
    // CRUD de LISTAS
    // ============================================================

    _showCreateListDialog(menu) {
        menu.removeAll();
        const headerItem = new PopupMenu.PopupMenuItem('📋 Nueva lista');
        headerItem.setSensitive(false);
        menu.addMenuItem(headerItem);
        menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

        const inputItem = new PopupMenu.PopupBaseMenuItem({ reactive: false });
        const entry = new St.Entry({
            hint_text: _('Nombre de la lista'),
            can_focus: true,
            x_expand: true
        });
        inputItem.add_child(entry);
        menu.addMenuItem(inputItem);

        menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

        menu.addAction('💾 Crear', async () => {
            const title = entry.get_text().trim();
            if (!title) return;
            try {
                const newList = await this._api.createTaskList(title);
                this._currentTaskListId = newList.id;
                this._currentTaskListTitle = newList.title;
                await this.buildMenu(menu);
            } catch (e) {
                logError(e, 'Error creando lista');
                this._showError(menu, `Error: ${e.message}`);
            }
        });

        menu.addAction('❌ Cancelar', () => {
            this.buildMenu(menu);
        });

        entry.grab_key_focus();
    }

    _showRenameListDialog(menu) {
        menu.removeAll();
        const headerItem = new PopupMenu.PopupMenuItem('✏️ Renombrar lista');
        headerItem.setSensitive(false);
        menu.addMenuItem(headerItem);
        menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

        const inputItem = new PopupMenu.PopupBaseMenuItem({ reactive: false });
        const entry = new St.Entry({
            text: this._currentTaskListTitle || '',
            can_focus: true,
            x_expand: true
        });
        inputItem.add_child(entry);
        menu.addMenuItem(inputItem);

        menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

        menu.addAction('💾 Guardar', async () => {
            const title = entry.get_text().trim();
            if (!title) return;
            try {
                await this._api.updateTaskList(this._currentTaskListId, title);
                this._currentTaskListTitle = title;
                await this._refreshMenu(menu);
            } catch (e) {
                logError(e, 'Error renombrando lista');
                this._showError(menu, `Error: ${e.message}`);
            }
        });

        menu.addAction('❌ Cancelar', () => {
            this._refreshMenu(menu);
        });

        entry.grab_key_focus();
    }

    _showDeleteListConfirm(menu) {
        menu.removeAll();
        const warnItem = new PopupMenu.PopupMenuItem(`⚠️ ¿Eliminar "${this._currentTaskListTitle}"?`);
        warnItem.setSensitive(false);
        menu.addMenuItem(warnItem);
        const subWarn = new PopupMenu.PopupMenuItem('Se eliminarán TODAS las tareas de esta lista');
        subWarn.setSensitive(false);
        menu.addMenuItem(subWarn);
        menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

        menu.addAction('🗑️ Sí, eliminar lista', async () => {
            try {
                const deletedId = this._currentTaskListId;
                await this._api.deleteTaskList(deletedId);
                this._taskLists = this._taskLists.filter(l => l.id !== deletedId);
                if (this._taskLists.length > 0) {
                    this._currentTaskListId = this._taskLists[0].id;
                    this._currentTaskListTitle = this._taskLists[0].title;
                    await this._refreshMenu(menu);
                } else {
                    this._currentTaskListId = null;
                    this._currentTaskListTitle = '';
                    this._renderEmptyState(menu);
                }
            } catch (e) {
                logError(e, 'Error eliminando lista');
                this._showError(menu, `Error: ${e.message}`);
            }
        });

        menu.addAction('❌ Cancelar', () => {
            this._refreshMenu(menu);
        });
    }

    // ============================================================
    // Utilidades
    // ============================================================

    _showLoading(menu, message) {
        menu.removeAll();
        const loadingItem = new PopupMenu.PopupMenuItem(message || 'Cargando...');
        loadingItem.setSensitive(false);
        menu.addMenuItem(loadingItem);
    }

    _showError(menu, message) {
        menu.removeAll();
        const errorItem = new PopupMenu.PopupMenuItem(`⚠ ${message}`);
        errorItem.setSensitive(false);
        menu.addMenuItem(errorItem);
        menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
        menu.addAction(_('Reintentar'), () => {
            this.buildMenu(menu);
        });
    }

    _checkDueTasks() {
        if (!this._tasks || this._tasks.length === 0) return;

        const settings = this._getSettings();
        const daysBefore = settings ? settings.get_int('notify-days-before') : 1;
        const dueTasks = [];

        // Obtener fecha de hoy en formato YYYY-MM-DD (zona horaria local)
        const now = new Date();
        const todayStr = now.getFullYear() + '-' +
            String(now.getMonth() + 1).padStart(2, '0') + '-' +
            String(now.getDate()).padStart(2, '0');

        for (const task of this._tasks) {
            if (task.status === 'completed' || !task.due) continue;

            // Extraer solo YYYY-MM-DD de la fecha ISO de Google Tasks
            const dueStr = task.due.substring(0, 10);

            // Calcular diferencia en días usando strings de fecha (sin zona horaria)
            const dueParts = dueStr.split('-').map(Number);
            const todayParts = todayStr.split('-').map(Number);

            const dueDate = new Date(dueParts[0], dueParts[1] - 1, dueParts[2]);
            const todayDate = new Date(todayParts[0], todayParts[1] - 1, todayParts[2]);

            const diffDays = Math.round((dueDate - todayDate) / (1000 * 60 * 60 * 24));

            if (diffDays >= 0 && diffDays <= daysBefore) {
                dueTasks.push({ title: task.title, due: task.due, daysLeft: diffDays });
            }
        }

        if (dueTasks.length === 0) return;

        // Mostrar notificación
        const count = dueTasks.length;
        let body = '';
        if (count <= 3) {
            body = dueTasks.map(t => {
                const label = t.daysLeft === 0 ? _('Hoy') : t.daysLeft === 1 ? _('Mañana') : `En ${t.daysLeft} días`;
                return `• ${t.title} (${label})`;
            }).join('\n');
        } else {
            body = `${count} tareas próximas a vencer.`;
        }

        this._showNotification(
            'Google Tasks',
            body,
            'task-due-symbolic'
        );
    }

    _showNotification(title, body, icon) {
        try {
            Main.notify(title, body);
        } catch (e) {
            log('Google Tasks: Error mostrando notificación: ' + e.message);
        }
    }

    async refresh(menu = null) {
        if (this._currentTaskListId) {
            this._tasks = await this._api.listTasks(this._currentTaskListId);
            if (menu) {
                await this._refreshMenu(menu);
            }
        }
    }
}
