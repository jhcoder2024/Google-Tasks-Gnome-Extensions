# ─── Translation compilation ──────────────────────────────────────────────────
# List of available languages (.po files)
langs = [
  'en',
  'fr',
]

# Generate .mo files from .po files
foreach lang : langs
  custom_target('mo-' + lang,
    input: lang + '.po',
    output: lang + '.mo',
    command: [
      'msgfmt',
      '--check',
      '--statistics',
      '-o', '@OUTPUT@',
      '@INPUT@',
    ],
    install: true,
    install_dir: join_paths(locale_dir, lang, 'LC_MESSAGES'),
    install_tag: 'locale',
  )
endforeach
