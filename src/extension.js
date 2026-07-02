// GNOME Shell 45+ ESM Module
// Google Tasks Extension - Entry Point
import St from 'gi://St';
import GObject from 'gi://GObject';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';
import Clutter from 'gi://Clutter';
import GLib from 'gi://GLib';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as Util from 'resource:///org/gnome/shell/misc/util.js';
import { OAuthManager } from './oauthManager.js';
import { GoogleTasksApi } from './googleTasksApi.js';
import { TaskListWidget } from './taskListWidget.js';
// Función de traducción simple (gettext no disponible en este sistema)
const _ = (text) => text;
import { getSettings } from './utils.js';

let _indicator = null;

export default class GoogleTasksExtension {
    constructor(metadata) {
        this._metadata = metadata;
    }

    enable() {
        _indicator = new GoogleTasksIndicator();
        Main.panel.addToStatusArea('google-tasks', _indicator, 1, 'right');
    }

    disable() {
        _indicator?.destroy();
        _indicator = null;
    }
}

class GoogleTasksIndicator extends PanelMenu.Button {
    static {
        GObject.registerClass(this);
    }

    _init() {
        super._init(0.0, 'Google Tasks', false);

        // Icono del panel
        const icon = new St.Icon({
            icon_name: 'view-list-symbolic',
            style_class: 'system-status-icon google-tasks-panel-icon'
        });
        this.add_child(icon);

        // Estado
        this._settings = getSettings();
        this._oauthManager = new OAuthManager();
        this._api = null;
        this._taskListWidget = null;
        this._isAuthenticated = false;
        this._refreshTimerId = null;
        this._suspendId = null;
        this._menuOpenStateId = 0;
        this._connectItemId = 0;
        this._retryItemId = 0;
        this._isAuthenticating = false;

        // Conectar señal de apertura del menú para refrescar
        this._menuOpenStateId = this.menu.connect('open-state-changed', (menu, isOpen) => {
            if (isOpen) {
                // Verificar si la sesión se cerró desde Preferencias
                if (this._isAuthenticated && this._settings.get_boolean('first-run')) {
                    this._isAuthenticated = false;
                    this._api = null;
                    this._taskListWidget = null;
                    this._stopAutoRefresh();
                    this._buildInitialMenu();
                    log('Google Tasks: Sesión cerrada desde Preferencias');
                    return;
                }
                if (this._isAuthenticated && this._taskListWidget) {
                    this._taskListWidget.buildMenu(menu);
                }
            }
        });

        // Construir menú inicial
        this._buildInitialMenu();

        // Intentar autenticación automática con tokens guardados
        this._tryAutoAuth();

        // Conectar señal de reanudación del sistema para refrescar tareas
        this._suspendId = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, 60, () => {
            // Refrescar tareas periódicamente (cada 60s)
            if (this._isAuthenticated && this._taskListWidget) {
                this._taskListWidget.refresh();
                this._checkDueTasks();
            }
            return GLib.SOURCE_CONTINUE;
        });
    }

    async _tryAutoAuth() {
        // Verificar si hay tokens en el Keyring sin lanzar excepción
        const accessToken = await this._oauthManager._getStoredAccessToken();
        const refreshToken = await this._oauthManager._getStoredRefreshToken();
        if (accessToken || refreshToken) {
            try {
                const token = await this._oauthManager.getAccessToken();
                if (token) {
                    this._api = new GoogleTasksApi(this._oauthManager);
                    this._taskListWidget = new TaskListWidget(this._api);
                    this._taskListWidget._onReconnect = () => {
                        this._startAuthentication();
                    };
                    this._isAuthenticated = true;
                    this._startAutoRefresh();
                    // Verificar que la API realmente funciona (el token podría estar expirado)
                    try {
                        await this._taskListWidget.buildMenu(this.menu);
                        log('Google Tasks: ' + _('Sesión restaurada desde Keyring'));
                        return;
                    } catch (apiErr) {
                        log('Google Tasks: Token expirado, intentando refresh...');
                        this._isAuthenticated = false;
                        this._api = null;
                        this._taskListWidget = null;
                        this._stopAutoRefresh();
                        // Intentar refresh forzado
                        try {
                            const refreshed = await this._oauthManager.refreshAccessToken();
                            if (refreshed) {
                                this._api = new GoogleTasksApi(this._oauthManager);
                                this._taskListWidget = new TaskListWidget(this._api);
                                this._taskListWidget._onReconnect = () => {
                                    this._startAuthentication();
                                };
                                this._isAuthenticated = true;
                                this._startAutoRefresh();
                                log('Google Tasks: ' + _('Sesión restaurada desde Keyring'));
                                return;
                            }
                        } catch (refreshErr) {
                            log('Google Tasks: Refresh falló: ' + refreshErr.message);
                        }
                    }
                }
            } catch (e) {
                log('Google Tasks: Error restaurando sesión: ' + e.message);
            }
            // Si llegamos aquí, la restauración con tokens falló
            if (!this._isAuthenticating) {
                this._oauthManager.clearTokens();
                this._buildInitialMenu();
                // Fallback: intentar GOA
                if (this._settings.get_boolean('use-goa')) {
                    try {
                        const goaToken = await this._oauthManager._tryGOA();
                        if (goaToken) {
                            this._api = new GoogleTasksApi(this._oauthManager);
                            this._taskListWidget = new TaskListWidget(this._api);
                            this._taskListWidget._onReconnect = () => {
                                this._startAuthentication();
                            };
                            this._isAuthenticated = true;
                            this._startAutoRefresh();
                            log('Google Tasks: ' + _('Sesión restaurada via GOA'));
                        }
                    } catch (goaErr) {
                        log('Google Tasks: GOA no disponible: ' + goaErr.message);
                    }
                }
            }
        } else if (this._settings.get_boolean('use-goa')) {
            // Intentar auto-auth via GOA si no hay tokens guardados
            try {
                const token = await this._oauthManager._tryGOA();
                if (token) {
                    this._api = new GoogleTasksApi(this._oauthManager);
                    this._taskListWidget = new TaskListWidget(this._api);
                    this._taskListWidget._onReconnect = () => {
                        this._startAuthentication();
                    };
                    this._isAuthenticated = true;
                    this._startAutoRefresh();
                    log('Google Tasks: ' + _('Sesión restaurada via GOA'));
                }
            } catch (e) {
                log('Google Tasks: GOA no disponible: ' + e.message);
            }
        } else {
            log('Google Tasks: ' + _('No hay sesión guardada'));
        }
    }

    _buildInitialMenu() {
        this.menu.removeAll();
        const titleItem = this.menu.addAction(_('Google Tasks'));
        titleItem.setSensitive(false);
        this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
        const connectItem = this.menu.addAction('Conectar con Google...');
        this._connectItemId = connectItem.connect('activate', () => {
            this._startAuthentication();
        });
    }

    async _startAuthentication() {
        // Verificar que hay Client ID configurado
        const clientId = this._settings.get_string('oauth-client-id');
        if (!clientId) {
            this._showError(_('Configura el Client ID en Preferencias de la extensión.'));
            return;
        }

        // Mostrar estado de carga
        this.menu.removeAll();
        const loadingItem = this.menu.addAction(_('Autenticando...'));
        loadingItem.setSensitive(false);

        this._isAuthenticating = true;
        try {
            const token = await this._oauthManager.authenticate();
            if (token) {
                // Marcar que ya no es primera ejecución (sesión activa)
                this._settings.set_boolean('first-run', false);
                this._api = new GoogleTasksApi(this._oauthManager);
                this._taskListWidget = new TaskListWidget(this._api);
                this._taskListWidget._onReconnect = () => {
                    this._startAuthentication();
                };
                this._isAuthenticated = true;
                await this._taskListWidget.buildMenu(this.menu);
                this._startAutoRefresh();
                // Verificar tareas próximas a vencer justo después de autenticar
                this._checkDueTasks();
            } else {
                this._showError(_('No se pudo autenticar. Revisa la configuración.'));
            }
        } catch (e) {
            logError(e, 'Google Tasks Auth Error');
            this._showError(`Error: ${e.message}`);
        } finally {
            this._isAuthenticating = false;
        }
    }

    _startAutoRefresh() {
        this._stopAutoRefresh();
        const interval = this._settings.get_int('refresh-interval') * 1000;
        if (interval > 0) {
            this._refreshTimerId = GLib.timeout_add_seconds(
                GLib.PRIORITY_DEFAULT,
                interval / 1000,
                () => {
                    if (this._taskListWidget) {
                        // Solo refrescar datos en background, sin reconstruir menú
                        this._taskListWidget.refresh();
                        this._checkDueTasks();
                    }
                    return GLib.SOURCE_CONTINUE;
                }
            );
        }
    }

    _checkDueTasks() {
        if (!this._settings.get_boolean('show-notifications') || !this._api || !this._taskListWidget) {
            return;
        }
        // La verificación se hace desde el widget que tiene los datos
        this._taskListWidget._checkDueTasks();
    }

    _stopAutoRefresh() {
        if (this._refreshTimerId) {
            GLib.source_remove(this._refreshTimerId);
            this._refreshTimerId = null;
        }
    }

    _showError(message) {
        this.menu.removeAll();
        const errorItem = this.menu.addAction(`⚠ ${message}`);
        errorItem.setSensitive(false);
        this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
        const retryItem = this.menu.addAction('Reconectar');
        this._retryItemId = retryItem.connect('activate', () => {
            this._startAuthentication();
        });
    }

    _disconnectSignals() {
        if (this._menuOpenStateId) {
            this.menu.disconnect(this._menuOpenStateId);
            this._menuOpenStateId = 0;
        }
        if (this._connectItemId) {
            // No podemos desconectar directamente porque el item puede haber sido
            // destruido por removeAll(). Los items del menú se limpian al llamar
            // menu.removeAll() en _buildInitialMenu() y _showError().
            this._connectItemId = 0;
        }
        if (this._retryItemId) {
            this._retryItemId = 0;
        }
    }

    destroy() {
        this._stopAutoRefresh();
        if (this._suspendId) {
            GLib.source_remove(this._suspendId);
            this._suspendId = null;
        }
        this._disconnectSignals();
        this._api = null;
        if (this._oauthManager) {
            this._oauthManager.destroy();
            this._oauthManager = null;
        }
        super.destroy();
    }
}
