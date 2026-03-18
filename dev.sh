#!/usr/bin/env bash
set -euo pipefail

# --- CONFIGURAÇÕES ---
PROJECT_NAME="sos-location"
BACKUP_CMD="docker compose run --rm db-backup /app/backup.sh once"

# Cores para feedback
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log() { echo -e "${BLUE}[$(date +%T)]${NC} $1"; }
success() { echo -e "${GREEN}[OK]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; }

print_usage() {
  echo "Uso: ./dev.sh {up|down|build|backup|status|reset|logs|logs-ui|clean}"
  echo ""
  echo "Comandos:"
  echo "  up       - Inicia o ambiente (build paralelo + backup preventivo)"
  echo "  down     - Para containers"
  echo "  build    - Apenas realiza o build paralelo das imagens"
  echo "  backup   - Executa um dump imediato do banco"
  echo "  status   - Mostra o estado dos serviços e saúde"
  echo "  reset    - Limpa TUDO (volumes inclusos) e reinicia"
  echo "  logs     - Tail dos logs principais"
  echo "  logs-ui  - Ativa interface Dozzle (http://localhost:9999)"
  echo "  clean    - Remove imagens órfãs e containers parados"
}

CMD=${1:-}

case "$CMD" in
  up)
    log "Iniciando build paralelo..."
    docker compose build --parallel
    log "Executando backup de segurança..."
    $BACKUP_CMD || warn "Falha no backup preventivo, continuando..."
    log "Subindo serviços..."
    docker compose up -d
    success "Ambiente pronto em http://localhost:${FRONTEND_PORT:-8088}"
    ;;

  down)
    log "Parando serviços..."
    docker compose down
    success "Serviços parados."
    ;;

  build)
    log "Iniciando build otimizado (BuildKit)..."
    DOCKER_BUILDKIT=1 docker compose build --parallel
    success "Build concluído."
    ;;

  backup)
    log "Forçando backup manual..."
    $BACKUP_CMD
    success "Backup concluído em ./infra/backups"
    ;;

  status)
    log "Estado do ecossistema SOS Location:"
    docker compose ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}"
    echo ""
    log "Verificando Healthchecks..."
    docker compose ps | grep "(healthy)" || warn "Nenhum serviço saudável detectado ainda (aguarde a inicialização)"
    ;;

  reset)
    warn "ISSO IRÁ APAGAR TODOS OS DADOS LOCAIS!"
    read -p "Tem certeza? (s/N) " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Ss]$ ]]; then
       log "Salvando último estado antes do expurgo..."
       $BACKUP_CMD || true
       docker compose down -v --remove-orphans
       log "Reiniciando do zero..."
       docker compose build --parallel
       docker compose up -d
       success "Sistema resetado e reiniciado."
    fi
    ;;

  logs)
    docker compose logs -f --tail=100
    ;;

  logs-ui)
    log "Dozzle disponível em http://localhost:9999"
    docker compose up -d dozzle
    ;;

  clean)
    log "Limpando entulho Docker..."
    docker system prune -f --volumes
    docker image prune -f
    success "Limpeza concluída."
    ;;

  *)
    print_usage
    exit 1
    ;;
esac
