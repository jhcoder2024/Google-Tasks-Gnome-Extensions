// Google Tasks Extension - Preferencias
// GNOME Shell 45+ Preferences
import Adw from 'gi://Adw';
import Gtk from 'gi://Gtk';
import Gio from 'gi://Gio';
import GObject from 'gi://GObject';
import Secret from 'gi://Secret';
import {ExtensionPreferences} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

export default class GoogleTasksPreferences extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        const settings = new Gio.Settings({ schema_id: 'org.gnome.shell.extensions.google-tasks' });

        // Página principal
        const page = new Adw.PreferencesPage({
            title: 'Google Tasks',
            icon_name: 'task-due-symbolic'
        });
        window.add(page);

        // Grupo: Autenticación
        const authGroup = new Adw.PreferencesGroup({
            title: 'Autenticación',
            description: 'Configuración de la conexión con Google Tasks'
        });
        page.add(authGroup);

        // GOA toggle
        const useGoaRow = new Adw.SwitchRow({
            title: 'Usar GNOME Online Accounts',
            subtitle: 'Intentar usar la cuenta de Google configurada en el sistema'
        });
        settings.bind('use-goa', useGoaRow, 'active', Gio.SettingsBindFlags.DEFAULT);
        authGroup.add(useGoaRow);

        // Client ID
        const clientIdRow = new Adw.EntryRow({
            title: 'Client ID'
        });
        clientIdRow.set_text(settings.get_string('oauth-client-id'));
        clientIdRow.connect('changed', () => {
            settings.set_string('oauth-client-id', clientIdRow.get_text());
        });
        authGroup.add(clientIdRow);

        // Client Secret
        const clientSecretRow = new Adw.PasswordEntryRow({
            title: 'Client Secret'
        });
        clientSecretRow.set_text(settings.get_string('oauth-client-secret'));
        clientSecretRow.connect('changed', () => {
            settings.set_string('oauth-client-secret', clientSecretRow.get_text());
        });
        authGroup.add(clientSecretRow);

        // Grupo: General
        const generalGroup = new Adw.PreferencesGroup({
            title: 'General',
            description: 'Configuración general de la extensión'
        });
        page.add(generalGroup);

        // Refresh interval
        const refreshRow = Adw.SpinRow.new_with_range(
            30, 3600, 30
        );
        refreshRow.set_title('Intervalo de actualización');
        refreshRow.set_subtitle('Segundos entre actualizaciones automáticas');
        refreshRow.set_value(settings.get_int('refresh-interval'));
        refreshRow.connect('changed', () => {
            settings.set_int('refresh-interval', refreshRow.get_value());
        });
        generalGroup.add(refreshRow);

        // Grupo: Notificaciones
        const notifGroup = new Adw.PreferencesGroup({
            title: 'Notificaciones',
            description: 'Alertas de tareas próximas a vencer'
        });
        page.add(notifGroup);

        // Activar notificaciones
        const showNotifRow = new Adw.SwitchRow({
            title: 'Notificaciones',
            subtitle: 'Mostrar alertas de tareas próximas a vencer'
        });
        settings.bind('show-notifications', showNotifRow, 'active', Gio.SettingsBindFlags.DEFAULT);
        notifGroup.add(showNotifRow);

        // Días de anticipación
        const daysRow = Adw.SpinRow.new_with_range(
            0, 7, 1
        );
        daysRow.set_title('Días de anticipación');
        daysRow.set_subtitle('Notificar tareas que vencen en este número de días (0 = solo hoy)');
        daysRow.set_value(settings.get_int('notify-days-before'));
        daysRow.connect('changed', () => {
            settings.set_int('notify-days-before', daysRow.get_value());
        });
        notifGroup.add(daysRow);

        }
}
