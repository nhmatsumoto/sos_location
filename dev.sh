#!/usr/bin/env bash
set -euo pipefail

CMD=${1:-}

case "$CMD" in
  up)
    # Trigger backup before build/up
    docker compose run --rm db-backup /app/backup.sh once || true
    docker compose up -d --build
    ;;
  down)
    docker compose down
    ;;
  logs)
    docker compose logs -f --tail=200
    ;;
  logs-ui)
    echo "Dozzle disponível em http://localhost:${DOZZLE_PORT:-9999}"
    docker compose up -d dozzle
    ;;
  reset)
    # Trigger backup before reset
    docker compose run --rm db-backup /app/backup.sh once || true
    docker compose down -v --remove-orphans
    docker compose up -d --build
    ;;
  *)
    echo "Uso: ./dev.sh {up|down|logs|logs-ui|reset}"
    exit 1
    ;;
esac
