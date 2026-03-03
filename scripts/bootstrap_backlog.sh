#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

DRY_RUN="${DRY_RUN:-0}"
FRONTEND_PORT="${FRONTEND_PORT:-8088}"
BACKEND_PORT="${BACKEND_PORT:-8001}"
REPO_SLUG="${REPO_SLUG:-nhmatsumoto/mg_location}"
REPO_OWNER="${REPO_OWNER:-${REPO_SLUG%%/*}}"
REPO_NAME="${REPO_NAME:-${REPO_SLUG##*/}}"
PROJECT_TITLE="${PROJECT_TITLE:-MG Location — Crisis Backlog}"
ARTIFACT_DIR="${ARTIFACT_DIR:-artifacts}"
SMOKE_FILE="$ARTIFACT_DIR/smoke-test.json"
BACKLOG_FILE="${BACKLOG_FILE:-BACKLOG.md}"

mkdir -p "$ARTIFACT_DIR"

log() { printf '[%s] %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$*"; }
warn() { log "WARN: $*" >&2; }
fail() { log "ERROR: $*" >&2; exit 1; }
run_cmd() {
  if [[ "$DRY_RUN" == "1" ]]; then
    log "DRY_RUN=1 :: $*"
    return 0
  fi
  eval "$@"
}

install_hint() {
  local bin="$1"
  case "$bin" in
    docker) echo "Instalação: https://docs.docker.com/engine/install/" ;;
    gh) echo "Instalação: https://cli.github.com/ (Linux: apt/yum; macOS: brew install gh)" ;;
    jq) echo "Instalação: https://jqlang.github.io/jq/download/ (macOS: brew install jq)" ;;
    rg) echo "Instalação: https://github.com/BurntSushi/ripgrep (macOS: brew install ripgrep)" ;;
    *) echo "Instale o binário '$bin' no PATH." ;;
  esac
}

require_cmd() {
  local bin="$1"
  if ! command -v "$bin" >/dev/null 2>&1; then
    fail "Dependência '$bin' não encontrada. $(install_hint "$bin")"
  fi
}

check_prereqs() {
  require_cmd jq
  require_cmd rg

  if [[ "$DRY_RUN" == "1" ]]; then
    command -v docker >/dev/null 2>&1 || warn "docker ausente (ok em DRY_RUN). $(install_hint docker)"
    command -v gh >/dev/null 2>&1 || warn "gh ausente (ok em DRY_RUN). $(install_hint gh)"
    log "DRY_RUN habilitado: validações de autenticação GitHub serão simuladas."
    return 0
  fi

  require_cmd docker
  require_cmd gh

  if [[ -z "${GITHUB_TOKEN:-}" && -z "${GH_TOKEN:-}" ]]; then
    fail "Defina GITHUB_TOKEN ou GH_TOKEN com escopos repo + project."
  fi
  gh auth status >/dev/null 2>&1 || fail "GitHub CLI não autenticado. Use: gh auth login --with-token < <(echo "$GITHUB_TOKEN")"
}
up_stack() {
  log "Subindo ambiente com Docker Compose..."
  run_cmd "FRONTEND_PORT=$FRONTEND_PORT BACKEND_PORT=$BACKEND_PORT docker compose up -d --build"
}

wait_backend_health() {
  local health_urls=("http://localhost:${BACKEND_PORT}/api/health" "http://localhost:${BACKEND_PORT}/health")
  local max_retries=60
  local sleep_s=5

  if [[ "$DRY_RUN" == "1" ]]; then
    log "DRY_RUN: healthcheck do backend simulado em ${health_urls[0]}"
    return 0
  fi

  log "Aguardando healthcheck do backend..."
  for ((i=1; i<=max_retries; i++)); do
    for url in "${health_urls[@]}"; do
      if curl -fsS "$url" >/dev/null 2>&1; then
        log "Backend saudável em: $url"
        return 0
      fi
    done
    sleep "$sleep_s"
  done

  warn "Healthcheck indisponível. Será adicionada tarefa P0 para criar /api/health."
  return 1
}

run_smoke_test() {
  local endpoints=(
    "/api/missing-persons"
    "/api/hotspots"
    "/api/rescue-support"
    "/api/terrain/context"
    "/api/weather/forecast"
    "/api/alerts"
    "/api/transparency/search"
    "/api/satellite/layers"
  )

  local ts
  ts="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  local items_json="[]"

  for ep in "${endpoints[@]}"; do
    local url="http://localhost:${BACKEND_PORT}${ep}"
    local code="000"
    local ok="false"

    if [[ "$DRY_RUN" == "1" ]]; then
      code="200"
      ok="true"
    else
      code="$(curl -sS -o /tmp/mg_location_smoke_body.$$ -w '%{http_code}' "$url" || true)"
      if [[ "$code" =~ ^2|3 ]]; then
        ok="true"
      fi
    fi

    items_json="$(jq -c \
      --arg endpoint "$ep" \
      --arg url "$url" \
      --arg code "$code" \
      --argjson ok "$ok" \
      '. + [{endpoint:$endpoint,url:$url,http_status:$code,ok:$ok}]' <<<"$items_json")"
  done

  jq -n --arg generated_at "$ts" --arg backend_port "$BACKEND_PORT" --argjson results "$items_json" \
    '{generated_at:$generated_at, backend_port:$backend_port, results:$results}' > "$SMOKE_FILE"
  log "Smoke test salvo em $SMOKE_FILE"
}

scan_repo_findings() {
  local todo_count fixme_count
  todo_count="$( (rg -n "TODO" apps core frontend-react/src README.md docs 2>/dev/null || true) | wc -l | tr -d ' ' )"
  fixme_count="$( (rg -n "FIXME" apps core frontend-react/src README.md docs 2>/dev/null || true) | wc -l | tr -d ' ' )"

  local api_url_count
  api_url_count="$( (rg -n "VITE_API_BASE_URL|localhost:8000|localhost:8001" frontend-react/src 2>/dev/null || true) | wc -l | tr -d ' ' )"

  HEALTH_ENDPOINT_EXISTS=0
  rg -n "path\('health'" apps/api/urls.py >/dev/null && HEALTH_ENDPOINT_EXISTS=1 || true

  FINDINGS_MD="- TODOs encontrados: ${todo_count}\n- FIXMEs encontrados: ${fixme_count}\n- Referências a baseURL/portas no frontend: ${api_url_count}\n- Endpoint /api/health implementado: $([[ $HEALTH_ENDPOINT_EXISTS -eq 1 ]] && echo 'sim' || echo 'não')"
}

build_backlog_data() {
  BACKLOG_ITEMS=$(cat <<'TSV'
P0	operational	Critical	Backlog	Disponibilidade da API e readiness/healthchecks	Garantir uptime da API durante crise, com health checks e fallback operacional.
P0	frontend	Critical	Backlog	Padronizar CORS/proxy dev para frontend em localhost:8088	Eliminar bloqueios de integração frontend-backend por CORS/baseURL.
P0	datahub	High	Backlog	Estabilizar endpoint /api/alerts	Assegurar alertas acionáveis para coordenação de resposta em campo.
P0	operational	Critical	Backlog	Validar /api/missing-persons para busca de desaparecidos	Habilitar registro e consulta de desaparecidos com resposta rápida.
P0	operational	High	Backlog	Validar /api/hotspots para áreas críticas	Publicar hotspots para priorização de deslocamento de equipes.
P0	operational	Critical	Backlog	Validar /api/rescue-support para suporte de resgate	Garantir recomendações operacionais para suporte imediato.
P0	operational	High	Backlog	Publicar /api/risk-areas e /api/searched-areas	Exibir risco e áreas já varridas para evitar retrabalho em campo.
P0	datahub	High	Backlog	Validar /api/weather/forecast no fluxo operacional	Integrar previsão do tempo ao planejamento de resgate.
P1	infra	High	Backlog	Implementar caching em endpoints críticos	Reduzir latência e carga em momentos de pico.
P1	infra	High	Backlog	Aplicar rate limiting e retries/backoff	Proteger API e integrações sob alta demanda.
P1	backend	Medium	Backlog	Observabilidade com logs estruturados e métricas	Aumentar visibilidade operacional e MTTR.
P1	backend	Medium	Backlog	Validação estrita de payloads	Evitar inconsistências e erros em produção.
P1	backend	Medium	Backlog	Ampliar cobertura de testes automatizados	Garantir regressão baixa em evolução rápida.
P2	datahub	Medium	Backlog	Expandir /api/transparency/transfers e /api/transparency/search	Aprimorar integração com dados governamentais.
P2	datahub	Medium	Backlog	Expandir /api/satellite/layers /stac/search /goes/recent	Melhorar consciência situacional via imagens de satélite.
P3	frontend	Low	Backlog	Melhorar filtros e UX de busca no mapa	Aumentar eficiência de uso sem impacto crítico imediato.
P3	frontend	Low	Backlog	Otimizar performance do mapa no frontend	Melhorar fluidez em dispositivos limitados.
P3	frontend	Low	Backlog	Acessibilidade e i18n	Ampliar inclusão e alcance da solução.
TSV
)

  if [[ "$HEALTH_ENDPOINT_EXISTS" -eq 0 ]]; then
    BACKLOG_ITEMS+=$'\nP0\tbackend\tCritical\tBacklog\tCriar endpoint /api/health\tEndpoint de health inexistente; necessário para automação e uptime.'
  fi
}

generate_backlog_md() {
  log "Gerando $BACKLOG_FILE"
  {
    echo "# MG Location — Crisis Backlog"
    echo
    echo "Gerado automaticamente por scripts/bootstrap_backlog.sh."
    echo
    echo "## Critérios de priorização"
    echo "1. **P0**: resgate/coordenação em campo + prevenção de downtime."
    echo "2. **P1**: confiabilidade, escala e qualidade operacional."
    echo "3. **P2**: integrações gov e expansão de dados."
    echo "4. **P3**: melhorias UX não-críticas."
    echo
    echo "## Findings automáticos do repositório"
    printf '%b\n' "$FINDINGS_MD"
    echo
    echo "## TODO list por prioridade"
    local p
    for p in P0 P1 P2 P3; do
      echo "### ${p}"
      while IFS=$'\t' read -r pri area impact status title desc; do
        [[ -z "${pri:-}" ]] && continue
        [[ "$pri" != "$p" ]] && continue
        echo "- [ ] **[$pri]** $title _(area:$area | crisis:$impact | status:$status)_"
      done <<< "$BACKLOG_ITEMS"
      echo
    done

    echo "## Kanban"
    echo "| Priority | Item | Area | CrisisImpact | Status |"
    echo "|---|---|---|---|---|"
    while IFS=$'\t' read -r pri area impact status title desc; do
      [[ -z "${pri:-}" ]] && continue
      echo "| $pri | $title | $area | $impact | $status |"
    done <<< "$BACKLOG_ITEMS"
  } > "$BACKLOG_FILE"
}

ensure_project_and_fields() {
  if [[ "$DRY_RUN" == "1" ]]; then
    log "DRY_RUN: criação/validação de Project v2 simulada: $PROJECT_TITLE"
    PROJECT_ID="dryrun_project_id"
    return 0
  fi

  export REPO_OWNER REPO_NAME
  # shellcheck source=/dev/null
  source "$ROOT_DIR/scripts/lib/github_projects_v2.sh"

  local owner_repo_json owner_id
  owner_repo_json="$(gh_get_owner_and_repo_ids)"
  owner_id="$(jq -r '.data.repository.owner.id' <<<"$owner_repo_json")"
  [[ -n "$owner_id" && "$owner_id" != "null" ]] || fail "Não foi possível obter ownerId do repositório."

  local found
  found="$(gh_find_project_v2_by_title "$PROJECT_TITLE")"
  if [[ -n "$found" ]]; then
    PROJECT_ID="$(jq -r '.id' <<<"$found")"
    log "Project v2 existente encontrado: $PROJECT_TITLE ($PROJECT_ID)"
  else
    local created
    created="$(gh_create_project_v2 "$owner_id" "$PROJECT_TITLE")"
    PROJECT_ID="$(jq -r '.data.createProjectV2.projectV2.id' <<<"$created")"
    log "Project v2 criado: $PROJECT_TITLE ($PROJECT_ID)"
  fi

  local fields_json
  fields_json="$(gh_get_project_fields "$PROJECT_ID")"

  if ! jq -e '.data.node.fields.nodes[] | select(.name=="Priority")' <<<"$fields_json" >/dev/null; then
    log "Criando campo Priority (P0,P1,P2,P3)..."
    gh_create_single_select_field "$PROJECT_ID" "Priority" "P0" "P1" "P2" "P3" >/dev/null
  fi

  fields_json="$(gh_get_project_fields "$PROJECT_ID")"
  if ! jq -e '.data.node.fields.nodes[] | select(.name=="CrisisImpact")' <<<"$fields_json" >/dev/null; then
    log "Criando campo CrisisImpact (Critical,High,Medium,Low)..."
    gh_create_single_select_field "$PROJECT_ID" "CrisisImpact" "Critical" "High" "Medium" "Low" >/dev/null
  fi

  fields_json="$(gh_get_project_fields "$PROJECT_ID")"
  if ! jq -e '.data.node.fields.nodes[] | select(.name=="Status")' <<<"$fields_json" >/dev/null; then
    warn "Campo Status não encontrado no Project. Crie manualmente com: Backlog, Ready, In Progress, Blocked, Done."
  fi
}

issue_exists_by_title() {
  local title="$1"
  gh issue list -R "$REPO_SLUG" --state all --search "$title in:title" --json title,number | jq -e --arg t "$title" 'map(select(.title==$t)) | length > 0' >/dev/null
}

create_or_update_issues() {
  while IFS=$'\t' read -r pri area impact status title desc; do
    [[ -z "${pri:-}" ]] && continue
    local issue_title="[$pri] $title"
    local marker="<!-- mg-location-backlog-key:${pri}:${area}:$(echo "$title" | tr ' ' '_' | tr -cd '[:alnum:]_:-') -->"
    local body
    body=$(cat <<EOB
$marker
## Contexto de crise
$desc

## Definição de pronto (DoD)
- [ ] Endpoint/fluxo funcional validado em ambiente local
- [ ] Cobertura de testes adicionada/atualizada
- [ ] Documentação operacional atualizada

## Passos sugeridos
1. Reproduzir cenário atual.
2. Implementar ajuste mínimo viável.
3. Validar com smoke test e testes automatizados.

## Checklist
- [ ] Logs úteis para operação
- [ ] Tratamento de erro e timeout
- [ ] Sem regressão de segurança/performance

## Riscos
- Atraso de resposta em campo durante crise climática.

## Links
- API base: http://localhost:${BACKEND_PORT}/api
- Frontend: http://localhost:${FRONTEND_PORT}
- Backlog local: ${BACKLOG_FILE}
EOB
)

    local labels="priority:${pri},area:${area},crisis:${impact,,}"

    if [[ "$DRY_RUN" == "1" ]]; then
      log "DRY_RUN: garantir issue '$issue_title' com labels [$labels]"
      continue
    fi

    if issue_exists_by_title "$issue_title"; then
      log "Issue já existe: $issue_title"
    else
      gh issue create -R "$REPO_SLUG" --title "$issue_title" --body "$body" >/dev/null
      log "Issue criada: $issue_title"
    fi

    IFS=',' read -r -a label_array <<< "$labels"
    for label in "${label_array[@]}"; do
      gh label create "$label" -R "$REPO_SLUG" --color BFDADC --description "Auto-created by bootstrap_backlog" 2>/dev/null || true
      gh issue edit -R "$REPO_SLUG" "$issue_title" --add-label "$label" >/dev/null 2>&1 || true
    done

    add_issue_to_project "$issue_title" "$pri" "$impact" "$status"
  done <<< "$BACKLOG_ITEMS"
}

add_issue_to_project() {
  local issue_title="$1" priority="$2" impact="$3" status="$4"

  if [[ "$DRY_RUN" == "1" ]]; then
    log "DRY_RUN: adicionar '$issue_title' ao project com Status=$status Priority=$priority CrisisImpact=$impact"
    return 0
  fi

  local issue_id
  issue_id="$(gh issue list -R "$REPO_SLUG" --state all --search "$issue_title in:title" --json id,title | jq -r --arg t "$issue_title" 'map(select(.title==$t))|first.id // empty')"
  [[ -n "$issue_id" ]] || { warn "Issue ID não encontrado para '$issue_title'"; return 0; }

  local add_q vars add_res item_id
  add_q='mutation($projectId:ID!,$contentId:ID!){ addProjectV2ItemById(input:{projectId:$projectId, contentId:$contentId}){ item{ id } } }'
  vars=$(jq -nc --arg projectId "$PROJECT_ID" --arg contentId "$issue_id" '{projectId:$projectId, contentId:$contentId}')
  add_res="$(gh api graphql -f query="$add_q" -f variables="$vars" 2>/dev/null || true)"
  item_id="$(jq -r '.data.addProjectV2ItemById.item.id // empty' <<<"$add_res")"

  if [[ -z "$item_id" ]]; then
    # já pode estar no projeto: buscar item existente
    local item_query
    item_query='query($projectId:ID!){ node(id:$projectId){ ... on ProjectV2 { items(first:100){ nodes { id content { ... on Issue { id title } } } } } } }'
    item_id="$(gh api graphql -f query="$item_query" -f variables="$(jq -nc --arg projectId "$PROJECT_ID" '{projectId:$projectId}')" | jq -r --arg issue_id "$issue_id" '.data.node.items.nodes[] | select(.content.id==$issue_id) | .id' | head -n1)"
  fi

  [[ -n "$item_id" ]] || { warn "Não foi possível vincular item '$issue_title' ao project."; return 0; }

  local fields_json status_field priority_field impact_field
  fields_json="$(gh api graphql -f query='query($projectId:ID!){ node(id:$projectId){ ... on ProjectV2{ fields(first:100){ nodes{ ... on ProjectV2FieldCommon{id name dataType} ... on ProjectV2SingleSelectField{id name options{id name}} } } } } }' -f variables="$(jq -nc --arg projectId "$PROJECT_ID" '{projectId:$projectId}')")"

  status_field="$(jq -r '.data.node.fields.nodes[] | select(.name=="Status") | .id' <<<"$fields_json" | head -n1)"
  priority_field="$(jq -r '.data.node.fields.nodes[] | select(.name=="Priority") | .id' <<<"$fields_json" | head -n1)"
  impact_field="$(jq -r '.data.node.fields.nodes[] | select(.name=="CrisisImpact") | .id' <<<"$fields_json" | head -n1)"

  set_single_select_field "$item_id" "$status_field" "$status" "$fields_json"
  set_single_select_field "$item_id" "$priority_field" "$priority" "$fields_json"
  set_single_select_field "$item_id" "$impact_field" "$impact" "$fields_json"
}

set_single_select_field() {
  local item_id="$1" field_id="$2" option_name="$3" fields_json="$4"
  [[ -n "$field_id" ]] || return 0
  local option_id
  option_id="$(jq -r --arg fid "$field_id" --arg n "$option_name" '.data.node.fields.nodes[] | select(.id==$fid) | .options[]? | select(.name==$n) | .id' <<<"$fields_json" | head -n1)"
  [[ -n "$option_id" ]] || { warn "Opção '$option_name' não encontrada no campo $field_id"; return 0; }

  local q vars
  q='mutation($projectId:ID!,$itemId:ID!,$fieldId:ID!,$optionId:String!){ updateProjectV2ItemFieldValue(input:{projectId:$projectId,itemId:$itemId,fieldId:$fieldId,value:{singleSelectOptionId:$optionId}}){ projectV2Item { id } } }'
  vars=$(jq -nc --arg projectId "$PROJECT_ID" --arg itemId "$item_id" --arg fieldId "$field_id" --arg optionId "$option_id" '{projectId:$projectId,itemId:$itemId,fieldId:$fieldId,optionId:$optionId}')
  gh api graphql -f query="$q" -f variables="$vars" >/dev/null || warn "Falha ao atualizar campo $field_id para item $item_id"
}

main() {
  log "Iniciando bootstrap de backlog para crise climática"
  check_prereqs
  scan_repo_findings
  build_backlog_data
  generate_backlog_md
  up_stack
  if ! wait_backend_health; then
    warn "Sem healthcheck ativo; mantenha issue P0 de health endpoint no backlog."
  fi
  run_smoke_test
  ensure_project_and_fields
  create_or_update_issues
  log "Concluído. Artefatos: $SMOKE_FILE e $BACKLOG_FILE"
}

main "$@"
