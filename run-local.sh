#!/bin/sh

set -eu

ROOT_DIR="$(CDPATH= cd -- "$(dirname "$0")" && pwd)"

if ! command -v bun >/dev/null 2>&1; then
  echo "bun nao encontrado no PATH."
  exit 1
fi

if [ ! -f "$ROOT_DIR/.env" ]; then
  cp "$ROOT_DIR/.env.example" "$ROOT_DIR/.env"
  echo ".env criado a partir de .env.example."
  echo "Preencha GEMINI_API_KEY antes de usar as partes que dependem da API."
fi

"$ROOT_DIR/.zscripts/dev.sh"

APP_URL="http://localhost:3000"
echo "Abrindo $APP_URL ..."

if command -v open >/dev/null 2>&1; then
  open "$APP_URL"
elif command -v xdg-open >/dev/null 2>&1; then
  xdg-open "$APP_URL" >/dev/null 2>&1 &
else
  echo "Abra manualmente: $APP_URL"
fi
