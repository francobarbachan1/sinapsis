#!/usr/bin/env bash
# Sinapsis — script de deploy a VPS.
# Editar HOST y DEST con tus datos, después chmod +x deploy/upload.sh
# y correr desde la raíz del proyecto: ./deploy/upload.sh

set -e

HOST="${SINAPSIS_HOST:-usuario@vps}"
DEST="${SINAPSIS_DEST:-/var/www/sinapsis}"

echo "Subiendo a $HOST:$DEST …"

rsync -avz --delete \
    --exclude '.git' \
    --exclude '.claude' \
    --exclude 'deploy' \
    --exclude 'tools' \
    --exclude '*.md' \
    --exclude 'Sinapsis_Especificacion_Tecnica*.md' \
    ./ "$HOST:$DEST/"

ssh "$HOST" "sudo chown -R www-data:www-data $DEST"

echo "✓ Deploy hecho. Ver en https://tu-dominio.com"
