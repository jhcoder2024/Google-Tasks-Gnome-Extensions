// Google Tasks Extension - Utilidades
import Gio from 'gi://Gio';

const SCHEMA_ID = 'org.gnome.shell.extensions.google-tasks';

/**
 * Obtener instancia de GSettings
 */
export function getSettings() {
    return new Gio.Settings({ schema_id: SCHEMA_ID });
}

/**
 * Formatear fecha ISO a formato legible
 * @param {string} dateString - Fecha en formato ISO (Google Tasks)
 * @returns {string} Fecha formateada
 */
export function formatDate(dateString) {
    if (!dateString) return '';
    // Validar formato ISO 8601 básico
    if (!/^\d{4}-\d{2}-\d{2}/.test(dateString)) {
        return dateString;
    }
    try {
        // Extraer solo YYYY-MM-DD y crear fecha en zona horaria local
        const parts = dateString.substring(0, 10).split('-').map(Number);
        const date = new Date(parts[0], parts[1] - 1, parts[2]);
        if (isNaN(date.getTime())) {
            return dateString;
        }
        // Fecha de hoy en zona horaria local
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const diff = date - today;
        const days = Math.round(diff / (1000 * 60 * 60 * 24));
        if (days < 0) {
            return `Vencida: ${date.toLocaleDateString()}`;
        } else if (days === 0) {
            return 'Hoy';
        } else if (days === 1) {
            return 'Mañana';
        } else if (days < 7) {
            return `En ${days} días`;
        } else {
            return date.toLocaleDateString();
        }
    } catch (e) {
        return dateString;
    }
}

/**
 * Sanitizar texto para evitar inyección HTML
 * @param {string} text
 * @returns {string}
 */
export function sanitizeText(text) {
    if (!text) return '';
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return String(text).replace(/[&<>"']/g, c => map[c]);
}

/**
 * Crear un debounce para evitar llamadas frecuentes
 * @param {Function} func
 * @param {number} wait - Milisegundos
 * @returns {Function}
 */
export function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}
