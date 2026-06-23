// Google Tasks Extension - Widget de Item de Tarea
import St from 'gi://St';
import GObject from 'gi://GObject';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';
import Clutter from 'gi://Clutter';
// Función de traducción simple (gettext no disponible en este sistema)
const _ = (text) => text;
import { formatDate, sanitizeText } from './utils.js';
export class TaskItemWidget {
    constructor(task, onComplete, onEdit, onDelete) {
        this._task = task;
        this._onComplete = onComplete;
        this._onEdit = onEdit;
        this._onDelete = onDelete;
    }
    /**
     * Renderizar el item de tarea en el menú
     */
    render(menu) {
        const isCompleted = this._task.status === 'completed';
        // Contenedor principal
        const item = new PopupMenu.PopupBaseMenuItem({
            reactive: true,
            can_focus: true,
            style_class: 'google-tasks-item' + (isCompleted ? ' completed' : '')
        });
        // Layout horizontal
        const layout = new St.BoxLayout({
            vertical: false,
            x_expand: true
        });
        // Checkbox (completar)
        const checkBox = new St.BoxLayout({
            style_class: 'task-checkbox',
            reactive: true,
            width: 24,
            height: 24
        });
        const checkIcon = new St.Icon({
            icon_name: isCompleted ? 'checkbox-checked-symbolic' : 'checkbox-symbolic',
            icon_size: 16
        });
        checkBox.add_child(checkIcon);
        checkBox.connect('button-press-event', () => {
            if (this._onComplete) {
                this._onComplete(this._task);
            }
        });
        layout.add_child(checkBox);
        // Contenido (título, fecha, notas)
        const contentBox = new St.BoxLayout({
            vertical: true,
            x_expand: true,
            y_align: Clutter.ActorAlign.CENTER
        });
        // Título
        const titleLabel = new St.Label({
            text: sanitizeText(this._task.title) || _('(sin título)'),
            style_class: 'task-title',
            x_expand: true
        });
        contentBox.add_child(titleLabel);
        // Fecha de vencimiento
        if (this._task.due) {
            const dueLabel = new St.Label({
                text: formatDate(this._task.due),
                style_class: 'task-due'
            });
            contentBox.add_child(dueLabel);
        }
        // Notas (truncadas)
        if (this._task.notes) {
            const notesText = this._task.notes.length > 80
                ? this._task.notes.substring(0, 80) + '...'
                : this._task.notes;
            const notesLabel = new St.Label({
                text: sanitizeText(notesText),
                style_class: 'task-notes'
            });
            contentBox.add_child(notesLabel);
        }
        layout.add_child(contentBox);
        // Botones de acción (editar, eliminar)
        const actionsBox = new St.BoxLayout({
            vertical: false,
            x_align: Clutter.ActorAlign.END
        });
        // Botón editar
        const editBtn = new St.Button({
            style_class: 'task-action-btn',
            reactive: true,
            width: 24,
            height: 24
        });
        const editIcon = new St.Icon({
            icon_name: 'edit-symbolic',
            icon_size: 12
        });
        editBtn.add_child(editIcon);
        editBtn.connect('clicked', () => {
            if (this._onEdit) {
                this._onEdit(this._task);
            }
        });
        actionsBox.add_child(editBtn);
        // Botón eliminar
        const deleteBtn = new St.Button({
            style_class: 'task-action-btn',
            reactive: true,
            width: 24,
            height: 24
        });
        const deleteIcon = new St.Icon({
            icon_name: 'user-trash-symbolic',
            icon_size: 12
        });
        deleteBtn.add_child(deleteIcon);
        deleteBtn.connect('clicked', () => {
            if (this._onDelete) {
                this._onDelete(this._task);
            }
        });
        actionsBox.add_child(deleteBtn);
        layout.add_child(actionsBox);
        item.add_child(layout);
        menu.addMenuItem(item);
    }
}