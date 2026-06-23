// Google Tasks Extension - Cliente API Google Tasks v1
import GLib from 'gi://GLib';
import Soup from 'gi://Soup';
const API_BASE = 'https://tasks.googleapis.com/tasks/v1';
export class GoogleTasksApi {
    constructor(oauthManager) {
        this._oauth = oauthManager;
        this._httpSession = new Soup.Session({
            timeout: 10,
            idle_timeout: 30,
            user_agent: 'GNOME Google Tasks Extension/1.0'
        });
    }
    /**
     * Hacer una petición autenticada a la API
     */
    async _request(method, path, body = null) {
        const token = await this._oauth.getAccessToken();
        const url = `${API_BASE}${path}`;
        const message = Soup.Message.new(method, url);
        message.request_headers.append(
            'Authorization',
            `Bearer ${token}`
        );
        message.request_headers.append(
            'Content-Type',
            'application/json'
        );
        if (body) {
            message.set_request_body_from_bytes(
                'application/json',
                new TextEncoder().encode(JSON.stringify(body))
            );
        }
        const response = await this._httpSession.send_and_read_async(
            message,
            GLib.PRIORITY_DEFAULT,
            null
        );
        const decoder = new TextDecoder();
        const data = JSON.parse(decoder.decode(response));
        if (message.status_code >= 200 && message.status_code < 300) {
            return data;
        }
        // Si el token expiró, intentar refresh
        if (message.status_code === 401) {
            await this._oauth.refreshAccessToken();
            return this._request(method, path, body);
        }
        throw new Error(`API Error ${message.status_code}: ${JSON.stringify(data)}`);
    }
    /**
     * Obtener todas las listas de tareas
     * GET /users/@me/lists
     */
    async listTaskLists() {
        const data = await this._request('GET', '/users/@me/lists');
        return data.items || [];
    }
    /**
     * Obtener tareas de una lista
     * GET /lists/{taskListId}/tasks
     */
    async listTasks(taskListId, options = {}) {
        let path = `/lists/${encodeURIComponent(taskListId)}/tasks`;
        const params = [];
        if (options.showCompleted) params.push('showCompleted=true');
        if (options.showHidden) params.push('showHidden=true');
        if (options.maxResults) params.push(`maxResults=${options.maxResults}`);
        if (params.length > 0) {
            path += '?' + params.join('&');
        }
        const data = await this._request('GET', path);
        return data.items || [];
    }
    /**
     * Crear una nueva tarea
     * POST /lists/{taskListId}/tasks
     */
    async createTask(taskListId, task) {
        const path = `/lists/${encodeURIComponent(taskListId)}/tasks`;
        const body = {
            title: task.title,
            notes: task.notes || ''
        };
        // Formatear fecha a ISO completo si tiene valor
        if (task.due) {
            body.due = task.due + 'T00:00:00.000Z';
        }
        return await this._request('POST', path, body);
    }
    /**
     * Actualizar una tarea existente
     * PUT /lists/{taskListId}/tasks/{taskId}
     */
    async updateTask(taskListId, taskId, task) {
        const path = `/lists/${encodeURIComponent(taskListId)}/tasks/${encodeURIComponent(taskId)}`;
        const body = {
            title: task.title,
            notes: task.notes || '',
            status: task.status || 'needsAction'
        };
        // Incluir due solo si tiene valor, formateado a ISO completo
        if (task.due) {
            body.due = task.due + 'T00:00:00.000Z';
        }
        return await this._request('PATCH', path, body);
    }
    /**
     * Eliminar una tarea
     * DELETE /lists/{taskListId}/tasks/{taskId}
     */
    async deleteTask(taskListId, taskId) {
        const path = `/lists/${encodeURIComponent(taskListId)}/tasks/${encodeURIComponent(taskId)}`;
        return await this._request('DELETE', path);
    }
    /**
     * Marcar tarea como completada
     * PATCH /lists/{taskListId}/tasks/{taskId}
     */
    async completeTask(taskListId, taskId) {
        const path = `/lists/${encodeURIComponent(taskListId)}/tasks/${encodeURIComponent(taskId)}`;
        return await this._request('PATCH', path, {
            status: 'completed'
        });
    }
    /**
     * Marcar tarea como pendiente
     * PATCH /lists/{taskListId}/tasks/{taskId}
     */
    async uncompleteTask(taskListId, taskId) {
        const path = `/lists/${encodeURIComponent(taskListId)}/tasks/${encodeURIComponent(taskId)}`;
        return await this._request('PATCH', path, {
            status: 'needsAction'
        });
    }
    // ============================================================
    // CRUD de LISTAS de tareas
    // ============================================================
    /**
     * Crear una nueva lista de tareas
     * POST /users/@me/lists
     * @param {string} title - Título de la nueva lista
     * @returns {Promise<Object>} La lista creada
     */
    async createTaskList(title) {
        return await this._request('POST', '/users/@me/lists', {
            title: title
        });
    }
    /**
     * Actualizar (renombrar) una lista de tareas
     * PUT /users/@me/lists/{taskListId}
     * @param {string} taskListId - ID de la lista a actualizar
     * @param {string} title - Nuevo título de la lista
     * @returns {Promise<Object>} La lista actualizada
     */
    async updateTaskList(taskListId, title) {
        const path = `/users/@me/lists/${encodeURIComponent(taskListId)}`;
        return await this._request('PUT', path, {
            title: title
        });
    }
    /**
     * Eliminar una lista de tareas
     * DELETE /users/@me/lists/{taskListId}
     * @param {string} taskListId - ID de la lista a eliminar
     * @returns {Promise<Object>} Respuesta vacía en éxito
     */
    async deleteTaskList(taskListId) {
        const path = `/users/@me/lists/${encodeURIComponent(taskListId)}`;
        return await this._request('DELETE', path);
    }
}
