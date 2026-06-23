#!/bin/bash
# Script de instalación manual para Google Tasks GNOME Extension
# Uso: ./install.sh [--user|--system]

set -e

EXT_ID="google-tasks@jhcode.dev"
SRC_DIR="$(cd "$(dirname "$0")" && pwd)"

if [ "$1" = "--system" ]; then
    EXT_DIR="/usr/share/gnome-shell/extensions/$EXT_ID"
    SCHEMA_DIR="/usr/share/glib-2.0/schemas"
    echo "Instalando para todos los usuarios (sistema)..."
else
    EXT_DIR="$HOME/.local/share/gnome-shell/extensions/$EXT_ID"
    SCHEMA_DIR="$HOME/.local/share/glib-2.0/schemas"
    echo "Instalando para el usuario actual..."
fi

echo "Creando directorios..."
mkdir -p "$EXT_DIR"
mkdir -p "$SCHEMA_DIR"

echo "Copiando archivos fuente..."
cp "$SRC_DIR/src/"*.js "$EXT_DIR/"
cp "$SRC_DIR/src/"*.css "$EXT_DIR/"

echo "Copiando metadatos..."
cp "$SRC_DIR/metadata.json" "$EXT_DIR/"

echo "Copiando schemas..."
cp "$SRC_DIR/schemas/"*.xml "$SCHEMA_DIR/"
cp "$SRC_DIR/schemas/"*.compiled "$SCHEMA_DIR/" 2>/dev/null || true

echo "Copiando documentación..."
cp -r "$SRC_DIR/docs" "$EXT_DIR/" 2>/dev/null || true
cp "$SRC_DIR/README.md" "$EXT_DIR/" 2>/dev/null || true
cp "$SRC_DIR/CHANGELOG.md" "$EXT_DIR/" 2>/dev/null || true

echo "Copiando traducciones..."
cp -r "$SRC_DIR/po" "$EXT_DIR/" 2>/dev/null || true

echo "Compilando schemas..."
glib-compile-schemas "$SCHEMA_DIR"

echo ""
echo "✅ Instalación completada en: $EXT_DIR"
echo ""
echo "Para activar la extensión:"
echo "  1. Reinicia GNOME Shell: Alt+F2, escribe 'r', Enter"
echo "  2. O cierra sesión y vuelve a entrar"
echo "  3. Abre Extensiones y activa Google Tasks"
echo ""
echo "Para desinstalar:"
echo "  rm -rf $EXT_DIR"
