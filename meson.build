project('google-tasks-extension',
  version: '1.0.0',
  meson_version: '>= 0.60.0',
  license: 'GPL-3.0-or-later'
)

# ─── Extension metadata ────────────────────────────────────────────────────────
extension_id = 'google-tasks@jhcode.dev'
extension_dir = join_paths(get_option('datadir'), 'gnome-shell', 'extensions', extension_id)
schema_dir = join_paths(get_option('prefix'), get_option('datadir'), 'glib-2.0', 'schemas')
locale_dir = join_paths(get_option('prefix'), get_option('datadir'), 'locale')

# ─── Source files (JS + CSS) installed directly (no src/ subdirectory) ─────────
install_data(
  'src/extension.js',
  'src/googleTasksApi.js',
  'src/oauthManager.js',
  'src/prefs.js',
  'src/taskItemWidget.js',
  'src/taskListWidget.js',
  'src/utils.js',
  'src/stylesheet.css',
  install_dir: extension_dir
)

# ─── Extension metadata ────────────────────────────────────────────────────────
install_data(
  'metadata.json',
  install_dir: extension_dir
)

# ─── GSettings schema ──────────────────────────────────────────────────────────
install_data(
  'schemas/org.gnome.shell.extensions.google-tasks.gschema.xml',
  install_dir: join_paths(get_option('datadir'), 'glib-2.0', 'schemas')
)

# ─── Documentation ─────────────────────────────────────────────────────────────
install_subdir('docs',
  install_dir: extension_dir,
  strip_directory: false
)

# ─── README and CHANGELOG ──────────────────────────────────────────────────────
install_data(
  'README.md',
  'CHANGELOG.md',
  install_dir: extension_dir
)

# ─── Translations ──────────────────────────────────────────────────────────────
# Install .po source files alongside the extension (useful for development/debug)
install_subdir('po',
  install_dir: extension_dir,
  strip_directory: false
)

# Compile .po → .mo and install into the system locale directory
subdir('po')

# ─── Post-install tasks ────────────────────────────────────────────────────────
# Compile GSettings schemas so the extension is immediately usable
meson.add_install_script(
  'glib-compile-schemas',
  schema_dir
)

# ─── Summary ───────────────────────────────────────────────────────────────────
summary({
  'Extension ID': extension_id,
  'Prefix': get_option('prefix'),
  'Extension dir': join_paths(get_option('prefix'), extension_dir),
  'Schema dir': schema_dir,
  'Translations': locale_dir,
}, section: 'Install paths', bool_yn: false, list_sep: ', ')
