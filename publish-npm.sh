#!/bin/bash
# Script para publicar el paquete myssh en npm

# Primero debes iniciar sesión en npm (solo la primera vez)
# npm login

# Verificar si estás logueado
echo "Verificando si estás logueado en npm..."
npm whoami || { echo "No estás logueado. Ejecutando npm login..."; npm login; }

# Realizar un dry-run para ver qué archivos se publicarán
echo "Realizando un ensayo de publicación (dry-run)..."
npm publish --dry-run

echo ""
echo "Los archivos anteriores serán publicados a npm."
echo "Si todo se ve bien, ejecuta el siguiente comando para publicar realmente:"
echo "npm publish --access=public"
echo ""
echo "Si necesitas publicar una versión específica, primero actualiza la versión:"
echo "npm version patch  # incrementa la versión de parche (1.0.0 -> 1.0.1)"
echo "npm version minor  # incrementa la versión menor (1.0.0 -> 1.1.0)"
echo "npm version major  # incrementa la versión mayor (1.0.0 -> 2.0.0)"
echo ""
echo "Luego puedes publicar con:"
echo "npm publish --access=public"
