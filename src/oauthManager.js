// Google Tasks Extension - Gestor de Autenticación OAuth2
// Soporta: GOA (GNOME Online Accounts) como primario
//           OAuth2 manual (loopback) como fallback
//           PKCE + State parameter para seguridad
// Almacenamiento: GNOME Keyring (libsecret)
import GLib from 'gi://GLib';
import Gio from 'gi://Gio';
import Soup from 'gi://Soup';
import Secret from 'gi://Secret';
import { getSettings } from './utils.js';

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const SCOPES = 'https://www.googleapis.com/auth/tasks';
const REDIRECT_URI = 'http://127.0.0.1:18080';
const CALLBACK_PORT = 18080;

const KEYRING_ATTRS = {
    'service': 'google-tasks',
    'account': 'default'
};

export class OAuthManager {
    constructor() {
        this._settings = getSettings();
        this._accessToken = null;
        this._refreshToken = null;
        this._httpSession = new Soup.Session({
            timeout: 10,
            idle_timeout: 30,
            user_agent: 'GNOME Google Tasks Extension/1.0'
        });
        this._callbackTimeoutId = null;
        // Estado para PKCE + State
        this._pendingState = null;
        this._pendingCodeVerifier = null;
    }

    static _getKeyringSchema() {
        if (!this._keyringSchema) {
            this._keyringSchema = new Secret.Schema(
                'org.gnome.shell.extensions.google-tasks',
                Secret.SchemaFlags.NONE,
                {
                    'service': Secret.SchemaAttributeType.STRING,
                    'account': Secret.SchemaAttributeType.STRING
                }
            );
        }
        return this._keyringSchema;
    }

    /**
     * Liberar recursos
     */
    destroy() {
        if (this._callbackTimeoutId) {
            GLib.source_remove(this._callbackTimeoutId);
            this._callbackTimeoutId = null;
        }
        if (this._httpSession) {
            this._httpSession.abort();
            this._httpSession = null;
        }
    }

    /**
     * Método principal de autenticación
     * Intenta GOA primero, luego OAuth2 manual
     * @returns {Promise<string|null>} Token de acceso o null
     */
    async authenticate() {
        // 1. Intentar GOA si está habilitado
        if (this._settings.get_boolean('use-goa')) {
            try {
                const token = await this._tryGOA();
                if (token) {
                    this._accessToken = token;
                    return token;
                }
            } catch (e) {
                log('GOA falló, usando OAuth2 manual: ' + e.message);
            }
        }
        // 2. Intentar OAuth2 manual
        try {
            const token = await this._startOAuthFlow();
            if (token) {
                this._accessToken = token;
                return token;
            }
        } catch (e) {
            logError(e, 'OAuth2 manual falló');
        }
        return null;
    }

    /**
     * Intentar autenticación via GNOME Online Accounts
     * @returns {Promise<string|null>}
     */
    async _tryGOA() {
        try {
            const Goa = (await import('gi://Goa')).default;
            if (!Goa) return null;
            const client = Goa.Client.get_default();
            const accounts = client.get_accounts();
            for (const account of accounts) {
                if (account.provider_type === 'google') {
                    const token = await new Promise((resolve, reject) => {
                        account.call_get_access_token(
                            SCOPES,
                            null,
                            (source, result) => {
                                try {
                                    const [accessToken] = account.call_get_access_token_finish(result);
                                    resolve(accessToken);
                                } catch (e) {
                                    reject(e);
                                }
                            }
                        );
                    });
                    if (token) {
                        log('Google Tasks: Token obtenido via GOA');
                        return token;
                    }
                }
            }
        } catch (e) {
            log('GOA no disponible: ' + e.message);
        }
        return null;
    }

    // ============================================================
    // PKCE (Proof Key for Code Exchange)
    // ============================================================

    /**
     * Generar code_verifier aleatorio para PKCE
     * 32 bytes aleatorios codificados en base64url (sin padding)
     * @returns {string}
     */
    _generateCodeVerifier() {
        // Generar 32 bytes aleatorios y codificar en base64url sin padding
        const bytes = new Uint8Array(32);
        for (let i = 0; i < 32; i++) {
            bytes[i] = GLib.random_int_range(0, 256);
        }
        const base64 = GLib.base64_encode(bytes);
        return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    }

    /**
     * Generar code_challenge (SHA-256 del code_verifier) en base64url
     * @param {string} verifier
     * @returns {string}
     */
    _generateCodeChallenge(verifier) {
        const checksum = new GLib.Checksum(GLib.ChecksumType.SHA256);
        checksum.update(verifier);
        const digest = checksum.get_string();
        // El digest está en hex, convertir a base64url
        const bytes = new Uint8Array(digest.length / 2);
        for (let i = 0; i < digest.length; i += 2) {
            bytes[i / 2] = parseInt(digest.substring(i, i + 2), 16);
        }
        const base64 = GLib.base64_encode(bytes);
        return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    }

    /**
     * Generar state parameter aleatorio (16 bytes hex)
     * @returns {string}
     */
    _generateState() {
        const bytes = [];
        for (let i = 0; i < 16; i++) {
            bytes.push(GLib.random_int_range(0, 256));
        }
        return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
    }

    // ============================================================
    // Flujo OAuth2 con PKCE
    // ============================================================

    /**
     * Flujo OAuth2 manual usando loopback redirect con PKCE + State
     * Abre navegador + inicia servidor HTTP local para capturar callback
     * @returns {Promise<string|null>}
     */
    async _startOAuthFlow() {
        const clientId = this._settings.get_string('oauth-client-id');
        if (!clientId) {
            throw new Error(
                'Configuración incompleta. Abre Preferencias y configura ' +
                'el Client ID de Google Cloud Console.'
            );
        }

        // Generar PKCE values
        const codeVerifier = this._generateCodeVerifier();
        const codeChallenge = this._generateCodeChallenge(codeVerifier);
        this._pendingCodeVerifier = codeVerifier;

        // Generar state parameter anti-CSRF
        const state = this._generateState();
        this._pendingState = state;

        // Construir URL de autorización con PKCE + State
        const authUrl = `${GOOGLE_AUTH_URL}?` +
            `client_id=${encodeURIComponent(clientId)}` +
            `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
            `&response_type=code` +
            `&scope=${encodeURIComponent(SCOPES)}` +
            `&access_type=offline` +
            `&prompt=consent` +
            `&state=${encodeURIComponent(state)}` +
            `&code_challenge=${encodeURIComponent(codeChallenge)}` +
            `&code_challenge_method=S256`;

        // Abrir navegador primero para que el usuario autorice
        GLib.spawn_async(
            null,
            ['xdg-open', authUrl],
            null,
            GLib.SpawnFlags.SEARCH_PATH,
            null
        );

        // Luego iniciar servidor HTTP para capturar el callback
        const authCode = await this._startCallbackServer();

        if (!authCode) {
            throw new Error('No se recibió el código de autorización.');
        }

        // Intercambiar código por tokens (con PKCE + client_secret)
        const tokens = await this._exchangeCodeForTokens(authCode, codeVerifier);
        return tokens.access_token;
    }

    /**
     * Iniciar servidor HTTP local para capturar el callback OAuth
     * Valida el state parameter para prevenir CSRF
     * @returns {Promise<string>} Código de autorización
     */
    _startCallbackServer() {
        return new Promise((resolve, reject) => {
            const server = new Soup.Server();
            server.listen_local(CALLBACK_PORT, Soup.ServerListenOptions.IPV4_ONLY);

            // Timeout de 5 minutos con GLib
            this._callbackTimeoutId = GLib.timeout_add_seconds(
                GLib.PRIORITY_DEFAULT,
                120,
                () => {
                    server.disconnect();
                    reject(new Error('Tiempo de espera agotado. La autorización debe completarse en 5 minutos.'));
                    return GLib.SOURCE_REMOVE;
                }
            );

            server.add_handler(null, (server, msg, path, query) => {
                // Validar state parameter (anti-CSRF)
                if (!query || !query['state'] || query['state'] !== this._pendingState) {
                    msg.set_response(
                        'text/html',
                        Soup.MemoryUse.COPY,
                        '<html><body style="font-family:sans-serif;text-align:center;padding:40px;background:#f0f4f8"><h1 style="color:#c62828">⚠️ Error</h1><p style="font-size:18px;color:#333">State inválido.</p><p style="font-size:14px;color:#666">Reintenta desde GNOME.</p></body></html>'
                    );
                    msg.set_status(403, 'Forbidden');
                    if (this._callbackTimeoutId) {
                        GLib.source_remove(this._callbackTimeoutId);
                        this._callbackTimeoutId = null;
                    }
                    GLib.timeout_add(GLib.PRIORITY_DEFAULT, 1000, () => {
                        server.disconnect();
                        return GLib.SOURCE_REMOVE;
                    });
                    reject(new Error('State mismatch — posible ataque CSRF. Reintenta la autenticación.'));
                    return;
                }

                if (query['code']) {
                    // Código de autorización recibido y validado
                    if (this._callbackTimeoutId) {
                        GLib.source_remove(this._callbackTimeoutId);
                        this._callbackTimeoutId = null;
                    }
                    const code = query['code'];
                    msg.set_response(
                        'text/html',
                        Soup.MemoryUse.COPY,
                        '<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>Autenticación exitosa</title><style>body{margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Oxygen,Ubuntu,Cantarell,sans-serif;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);min-height:100vh;display:flex;justify-content:center;align-items:center}.card{background:white;border-radius:20px;padding:48px 40px;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,0.15);max-width:380px;width:90%}.checkmark{width:80px;height:80px;border-radius:50%;background:linear-gradient(135deg,#43e97b 0%,#38f9d7 100%);display:flex;align-items:center;justify-content:center;margin:0 auto 24px;box-shadow:0 8px 24px rgba(67,233,123,0.3)}.checkmark svg{width:40px;height:40px;fill:white}.title{font-size:26px;font-weight:700;color:#1a1a2e;margin-bottom:8px}.subtitle{font-size:16px;color:#666;line-height:1.6;margin-bottom:32px}</style></head><body><div class="card"><div class="checkmark"><svg viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/></svg></div><div class="title">¡Autenticación exitosa!</div><div class="subtitle">Tu cuenta de Google se ha conectado correctamente a la extensión Google Tasks.<br><br>Ya puedes cerrar esta ventana y volver a GNOME para ver tus tareas.</div></div></body></html>'
                    );
                    msg.set_status(200, 'OK');
                    // Cerrar servidor después de 1s para que el navegador reciba la respuesta
                    GLib.timeout_add(GLib.PRIORITY_DEFAULT, 1000, () => {
                        server.disconnect();
                        return GLib.SOURCE_REMOVE;
                    });
                    resolve(code);
                } else if (query['error']) {
                    // Error en la autorización
                    if (this._callbackTimeoutId) {
                        GLib.source_remove(this._callbackTimeoutId);
                        this._callbackTimeoutId = null;
                    }
                    const error = query['error'];
                    msg.set_response(
                        'text/html',
                        Soup.MemoryUse.COPY,
                        '<html><body style="font-family:sans-serif;text-align:center;padding:40px;background:#f0f4f8"><h1 style="color:#c62828">❌ Error</h1><p style="font-size:18px;color:#333">Autenticación rechazada.</p><p style="font-size:14px;color:#666">Vuelve a intentarlo desde GNOME.</p></body></html>'
                    );
                    msg.set_status(403, 'Forbidden');
                    GLib.timeout_add(GLib.PRIORITY_DEFAULT, 1000, () => {
                        server.disconnect();
                        return GLib.SOURCE_REMOVE;
                    });
                    reject(new Error(`Autorización rechazada: ${error}`));
                } else {
                    // Petición sin code ni error (ej: primera carga)
                    msg.set_response(
                        'text/html',
                        Soup.MemoryUse.COPY,
                        '<html><body style="font-family:sans-serif;text-align:center;padding:40px;background:#f0f4f8"><h1>⏳ Esperando...</h1><p style="font-size:18px;color:#333">Completa la autorización en el navegador.</p></body></html>'
                    );
                    msg.set_status(200, 'OK');
                }
            });

        });
    }

    /**
     * Intercambiar código de autorización por tokens usando PKCE
     * @param {string} authCode
     * @param {string} codeVerifier
     * @returns {Promise<Object>}
     */
    async _exchangeCodeForTokens(authCode, codeVerifier) {
        const clientId = this._settings.get_string('oauth-client-id');
        const clientSecret = this._settings.get_string('oauth-client-secret');
        const params = Soup.form_encode_hash({
            code: authCode,
            client_id: clientId,
            client_secret: clientSecret,
            redirect_uri: REDIRECT_URI,
            grant_type: 'authorization_code',
            code_verifier: codeVerifier
        });
        const message = Soup.Message.new_from_encoded_form(
            'POST',
            GOOGLE_TOKEN_URL,
            params
        );
        const response = await this._httpSession.send_and_read_async(
            message,
            GLib.PRIORITY_DEFAULT,
            null
        );
        const decoder = new TextDecoder();
        const data = JSON.parse(decoder.decode(response));
        if (data.access_token) {
            this._accessToken = data.access_token;
            // Google no siempre devuelve un nuevo refresh_token en re-autorizaciones
            // si el anterior sigue siendo válido. Preservar el existente.
            if (!data.refresh_token) {
                this._refreshToken = this._refreshToken || await this._getStoredRefreshToken();
            } else {
                this._refreshToken = data.refresh_token;
            }
            await this._storeTokens(data.access_token, this._refreshToken);
            return data;
        }
        throw new Error('Error obteniendo token: ' + (data.error_description || data.error || 'Error desconocido'));
    }

    /**
     * Refrescar token de acceso
     * @returns {Promise<string>}
     */
    async refreshAccessToken() {
        const clientId = this._settings.get_string('oauth-client-id');
        const clientSecret = this._settings.get_string('oauth-client-secret');
        if (!this._refreshToken) {
            this._refreshToken = await this._getStoredRefreshToken();
        }
        if (!this._refreshToken) {
            // Fallback: intentar renovar token via GOA
            if (this._settings.get_boolean('use-goa')) {
                try {
                    const goaToken = await this._tryGOA();
                    if (goaToken) {
                        this._accessToken = goaToken;
                        return goaToken;
                    }
                } catch (e) {
                    log('GOA refresh fallback falló: ' + e.message);
                }
            }
            throw new Error('No hay refresh token disponible. Re-autenticación necesaria.');
        }
        const params = Soup.form_encode_hash({
            client_id: clientId,
            client_secret: clientSecret,
            refresh_token: this._refreshToken,
            grant_type: 'refresh_token'
        });
        const message = Soup.Message.new_from_encoded_form(
            'POST',
            GOOGLE_TOKEN_URL,
            params
        );
        const response = await this._httpSession.send_and_read_async(
            message,
            GLib.PRIORITY_DEFAULT,
            null
        );
        const decoder = new TextDecoder();
        const data = JSON.parse(decoder.decode(response));
        if (data.access_token) {
            this._accessToken = data.access_token;
            // Google puede rotar el refresh token
            if (data.refresh_token) {
                this._refreshToken = data.refresh_token;
            }
            await this._storeTokens(data.access_token, this._refreshToken);
            return data.access_token;
        }
        // Detectar refresh token inválido/revocado
        if (data.error === 'invalid_grant') {
            await this.clearTokens();
            throw new Error('Sesión expirada. Por favor, autentícate de nuevo.');
        }
        throw new Error('Error refrescando token: ' + (data.error_description || data.error || 'Error desconocido'));
    }

    /**
     * Obtener token de acceso válido (con refresh automático)
     * @returns {Promise<string>}
     */
    async getAccessToken() {
        if (this._accessToken) {
            return this._accessToken;
        }
        this._accessToken = await this._getStoredAccessToken();
        this._refreshToken = await this._getStoredRefreshToken();
        if (this._accessToken) {
            return this._accessToken;
        }
        if (this._refreshToken) {
            return await this.refreshAccessToken();
        }
        throw new Error('No hay token disponible. Autenticación requerida.');
    }

    // ============================================================
    // Almacenamiento en GNOME Keyring (libsecret)
    // ============================================================

    /**
     * Almacenar tokens en GNOME Keyring
     * @param {string} accessToken
     * @param {string} refreshToken
     */
    async _storeTokens(accessToken, refreshToken) {
        try {
            Secret.password_store_sync(
                OAuthManager._getKeyringSchema(),
                KEYRING_ATTRS,
                Secret.COLLECTION_DEFAULT,
                'Google Tasks - Access Token',
                accessToken,
                null
            );
            const refreshAttrs = { ...KEYRING_ATTRS, 'token-type': 'refresh' };
            if (refreshToken) {
                Secret.password_store_sync(
                    OAuthManager._getKeyringSchema(),
                    refreshAttrs,
                    Secret.COLLECTION_DEFAULT,
                    'Google Tasks - Refresh Token',
                    refreshToken,
                    null
                );
            }
            log('Google Tasks: Tokens almacenados en GNOME Keyring');
        } catch (e) {
            logError(e, 'Error almacenando tokens en Keyring');
        }
    }

    /**
     * Leer access token del GNOME Keyring
     * @returns {Promise<string|null>}
     */
    async _getStoredAccessToken() {
        try {
            const password = Secret.password_lookup_sync(
                OAuthManager._getKeyringSchema(),
                KEYRING_ATTRS,
                null
            );
            return password || null;
        } catch (e) {
            logError(e, 'Error leyendo access token del Keyring');
            return null;
        }
    }

    /**
     * Leer refresh token del GNOME Keyring
     * @returns {Promise<string|null>}
     */
    async _getStoredRefreshToken() {
        try {
            const refreshAttrs = { ...KEYRING_ATTRS, 'token-type': 'refresh' };
            const password = Secret.password_lookup_sync(
                OAuthManager._getKeyringSchema(),
                refreshAttrs,
                null
            );
            return password || null;
        } catch (e) {
            logError(e, 'Error leyendo refresh token del Keyring');
            return null;
        }
    }

    /**
     * Limpiar tokens (logout)
     */
    async clearTokens() {
        this._accessToken = null;
        this._refreshToken = null;
        try {
            Secret.password_clear_sync(
                OAuthManager._getKeyringSchema(),
                KEYRING_ATTRS,
                null
            );
            const refreshAttrs = { ...KEYRING_ATTRS, 'token-type': 'refresh' };
            Secret.password_clear_sync(
                OAuthManager._getKeyringSchema(),
                refreshAttrs,
                null
            );
            log('Google Tasks: Tokens eliminados del Keyring');
        } catch (e) {
            logError(e, 'Error limpiando tokens del Keyring');
        }
    }
}
