#!/bin/bash
# Ghestror — test runner por fase
# Uso: ./test.sh <1-7>

set -uo pipefail
cd "$(dirname "$0")"

PASS=0
FAIL=0
HTTP_PID=""

ok()   { echo "  ✓ $1"; ((PASS++)) || true; }
fail() { echo "  ✗ $1"; ((FAIL++)) || true; }

cleanup() { [ -n "$HTTP_PID" ] && kill "$HTTP_PID" 2>/dev/null || true; }
trap cleanup EXIT

# ── helpers ──────────────────────────────────────────────────────────

check_exists() {
  [ -f "$1" ] && ok "existe: $1" || fail "falta: $1"
}

check_syntax() {
  if node --check "$1" 2>/tmp/node_err; then
    ok "sintaxe OK: $1"
  else
    fail "sintaxe ERRO: $1 — $(cat /tmp/node_err | head -1)"
  fi
}

check_no_content_besides() {
  # Verifica que um ficheiro só tem @import e linhas vazias/comentários
  local file="$1"
  local extra
  extra=$(grep -v "^@import\|^[[:space:]]*$\|^[[:space:]]*/\*\|^[[:space:]]* \*\|^[[:space:]]*//" "$file" | wc -l)
  [ "$extra" -eq 0 ] && ok "$file contém só @imports" || fail "$file tem $extra linhas não-import"
}

check_http_200() {
  local url="$1"
  local code
  code=$(curl -s -o /dev/null -w "%{http_code}" "$url" 2>/dev/null)
  [ "$code" = "200" ] && ok "HTTP 200: $url" || fail "HTTP $code: $url"
}

start_server() {
  python3 -m http.server 18099 &>/dev/null &
  HTTP_PID=$!
  sleep 0.6
}

stop_server() {
  [ -n "$HTTP_PID" ] && kill "$HTTP_PID" 2>/dev/null || true
  HTTP_PID=""
}

check_has_export() {
  grep -q "^export " "$1" && ok "exports presentes: $1" || fail "sem exports: $1"
}

check_import_files_exist() {
  local file="$1"
  local dir
  dir=$(dirname "$file")
  local missing=0
  while IFS= read -r path; do
    path="${path//\'/}"
    path="${path//\"/}"
    local resolved="$dir/$path"
    # Remove query string or hash
    resolved="${resolved%%\?*}"
    resolved="${resolved%%#*}"
    [ -f "$resolved" ] || { fail "import não resolve: $path (em $file)"; ((missing++)) || true; }
  done < <(grep -oP "from\s+['\"](\./[^'\"]+)['\"]" "$file" 2>/dev/null | grep -oP "\./[^'\"]+")
  [ "$missing" -eq 0 ] && ok "todos os imports resolvem: $(basename "$file")"
}

check_sw_assets() {
  # Verifica que cada ficheiro listado no ASSETS do sw.js existe em disco
  local missing=0
  while IFS= read -r asset; do
    # Remove leading /
    local path="${asset#/}"
    [ -z "$path" ] && continue
    [ "$path" = "" ] && continue
    [ -f "$path" ] || { fail "ASSETS: ficheiro não existe: $path"; ((missing++)) || true; }
  done < <(grep -oP "'/[^']*'" sw.js | tr -d "'")
  [ "$missing" -eq 0 ] && ok "todos os ASSETS existem em disco"
}

check_assets_includes() {
  local file="$1"
  grep -qF "'/$file'" sw.js && ok "ASSETS inclui: $file" || fail "ASSETS não inclui: $file"
}

# ── fases ─────────────────────────────────────────────────────────────

phase1() {
  echo ""
  echo "╔══════════════════════════════════════╗"
  echo "║  FASE 1 — Divisão do CSS             ║"
  echo "╚══════════════════════════════════════╝"

  echo ""
  echo "▸ Ficheiros CSS existem?"
  check_exists "css/base.css"
  check_exists "css/layout.css"
  check_exists "css/tasks.css"
  check_exists "css/calendar.css"
  check_exists "css/sheets.css"
  check_exists "css/modal.css"

  echo ""
  echo "▸ style.css contém apenas @imports?"
  check_no_content_besides "style.css"

  echo ""
  echo "▸ Servidor HTTP responde com 200?"
  start_server
  check_http_200 "http://localhost:18099/css/base.css"
  check_http_200 "http://localhost:18099/css/layout.css"
  check_http_200 "http://localhost:18099/css/tasks.css"
  check_http_200 "http://localhost:18099/css/calendar.css"
  check_http_200 "http://localhost:18099/css/sheets.css"
  check_http_200 "http://localhost:18099/css/modal.css"
  check_http_200 "http://localhost:18099/"
  stop_server
}

phase2() {
  echo ""
  echo "╔══════════════════════════════════════╗"
  echo "║  FASE 2 — store.js + utils.js        ║"
  echo "╚══════════════════════════════════════╝"

  echo ""
  echo "▸ Ficheiros existem?"
  check_exists "js/store.js"
  check_exists "js/utils.js"

  echo ""
  echo "▸ Sintaxe válida?"
  check_syntax "js/store.js"
  check_syntax "js/utils.js"

  echo ""
  echo "▸ Exportam funções/objetos?"
  check_has_export "js/store.js"
  check_has_export "js/utils.js"

  echo ""
  echo "▸ store.js não importa módulos do browser (zero imports)?"
  local imports
  imports=$(grep -c "^import " js/store.js 2>/dev/null) || imports=0
  [ "$imports" -eq 0 ] && ok "store.js não tem imports (correto)" || fail "store.js tem imports inesperados"
}

phase3() {
  echo ""
  echo "╔══════════════════════════════════════╗"
  echo "║  FASE 3 — tasks + notifications + export ║"
  echo "╚══════════════════════════════════════╝"

  echo ""
  echo "▸ Ficheiros existem?"
  check_exists "js/tasks.js"
  check_exists "js/notifications.js"
  check_exists "js/export.js"

  echo ""
  echo "▸ Sintaxe válida?"
  check_syntax "js/tasks.js"
  check_syntax "js/notifications.js"
  check_syntax "js/export.js"

  echo ""
  echo "▸ Exportam funções?"
  check_has_export "js/tasks.js"
  check_has_export "js/notifications.js"
  check_has_export "js/export.js"

  echo ""
  echo "▸ Imports resolvem para ficheiros existentes?"
  check_import_files_exist "js/tasks.js"
  check_import_files_exist "js/notifications.js"
  check_import_files_exist "js/export.js"
}

phase4() {
  echo ""
  echo "╔══════════════════════════════════════╗"
  echo "║  FASE 4 — events.js                  ║"
  echo "╚══════════════════════════════════════╝"

  echo ""
  echo "▸ Ficheiro existe?"
  check_exists "js/events.js"

  echo ""
  echo "▸ Sintaxe válida?"
  check_syntax "js/events.js"

  echo ""
  echo "▸ Exports presentes?"
  check_has_export "js/events.js"

  echo ""
  echo "▸ Imports resolvem?"
  check_import_files_exist "js/events.js"

  echo ""
  echo "▸ Usa CustomEvent para notificar calendar?"
  grep -q "CustomEvent\|calendar:refresh" js/events.js \
    && ok "CustomEvent encontrado" \
    || fail "CustomEvent não encontrado — calendar não será notificado"
}

phase5() {
  echo ""
  echo "╔══════════════════════════════════════╗"
  echo "║  FASE 5 — calendar.js                ║"
  echo "╚══════════════════════════════════════╝"

  echo ""
  echo "▸ Ficheiro existe?"
  check_exists "js/calendar.js"

  echo ""
  echo "▸ Sintaxe válida?"
  check_syntax "js/calendar.js"

  echo ""
  echo "▸ Exports presentes (renderCalendar obrigatório)?"
  check_has_export "js/calendar.js"
  grep -q "export.*renderCalendar\|export { .*renderCalendar" js/calendar.js \
    && ok "renderCalendar exportado" \
    || fail "renderCalendar não exportado"

  echo ""
  echo "▸ Imports resolvem?"
  check_import_files_exist "js/calendar.js"
}

phase6() {
  echo ""
  echo "╔══════════════════════════════════════╗"
  echo "║  FASE 6 — main.js + index.html       ║"
  echo "╚══════════════════════════════════════╝"

  echo ""
  echo "▸ Ficheiro existe?"
  check_exists "js/main.js"

  echo ""
  echo "▸ Sintaxe válida?"
  check_syntax "js/main.js"

  echo ""
  echo "▸ Imports resolvem?"
  check_import_files_exist "js/main.js"

  echo ""
  echo "▸ index.html usa type=module?"
  grep -q 'type="module"' index.html \
    && ok "index.html usa type=module" \
    || fail "index.html ainda usa <script src=app.js>"

  echo ""
  echo "▸ index.html aponta para js/main.js?"
  grep -q 'js/main.js' index.html \
    && ok "index.html aponta para js/main.js" \
    || fail "index.html não aponta para js/main.js"

  echo ""
  echo "▸ Servidor HTTP — página carrega sem 404?"
  start_server
  check_http_200 "http://localhost:18099/"
  check_http_200 "http://localhost:18099/js/main.js"
  check_http_200 "http://localhost:18099/js/store.js"
  check_http_200 "http://localhost:18099/js/utils.js"
  check_http_200 "http://localhost:18099/js/tasks.js"
  check_http_200 "http://localhost:18099/js/notifications.js"
  check_http_200 "http://localhost:18099/js/export.js"
  check_http_200 "http://localhost:18099/js/events.js"
  check_http_200 "http://localhost:18099/js/calendar.js"
  stop_server
}

phase7() {
  echo ""
  echo "╔══════════════════════════════════════╗"
  echo "║  FASE 7 — sw.js (cache v2)           ║"
  echo "╚══════════════════════════════════════╝"

  echo ""
  echo "▸ Versão da cache incrementada (v2+)?"
  grep -qE "ghestror-v[2-9]" sw.js \
    && ok "cache versão v2+ encontrada" \
    || fail "cache ainda é v1 — utilizadores não receberão novos ficheiros"

  echo ""
  echo "▸ ASSETS inclui ficheiros JS?"
  check_assets_includes "js/main.js"
  check_assets_includes "js/store.js"
  check_assets_includes "js/utils.js"
  check_assets_includes "js/tasks.js"
  check_assets_includes "js/notifications.js"
  check_assets_includes "js/export.js"
  check_assets_includes "js/events.js"
  check_assets_includes "js/calendar.js"

  echo ""
  echo "▸ ASSETS inclui ficheiros CSS?"
  check_assets_includes "css/base.css"
  check_assets_includes "css/layout.css"
  check_assets_includes "css/tasks.css"
  check_assets_includes "css/calendar.css"
  check_assets_includes "css/sheets.css"
  check_assets_includes "css/modal.css"

  echo ""
  echo "▸ Todos os ficheiros no ASSETS existem em disco?"
  check_sw_assets

  echo ""
  echo "▸ app.js removido ou vazio?"
  if [ ! -f "app.js" ] || [ ! -s "app.js" ]; then
    ok "app.js removido/vazio"
  else
    fail "app.js ainda existe com conteúdo — pode confundir o SW"
  fi
}

# ── report ────────────────────────────────────────────────────────────

report() {
  echo ""
  echo "──────────────────────────────────────────"
  if [ "$FAIL" -eq 0 ]; then
    echo "✅  FASE PASSOU  ($PASS verificações)"
  else
    echo "❌  FASE FALHOU  ($PASS OK · $FAIL falha(s))"
    echo "    → Corrija os erros acima e corra ./test.sh $PHASE novamente"
  fi
  echo "──────────────────────────────────────────"
  return "$FAIL"
}

phase8() {
  echo ""
  echo "╔══════════════════════════════════════╗"
  echo "║  FASE 8 — auth.js + firebase-config  ║"
  echo "╚══════════════════════════════════════╝"

  echo ""
  echo "▸ Ficheiros existem?"
  check_exists "js/auth.js"
  check_exists "js/firebase-config.js"

  echo ""
  echo "▸ Sintaxe válida?"
  check_syntax "js/auth.js"
  check_syntax "js/firebase-config.js"

  echo ""
  echo "▸ auth.js exporta funções obrigatórias?"
  for fn in initAuth signInGoogle signInEmail signUpEmail signInAnon signOut; do
    grep -q "export.*function $fn\|export.*$fn\b" js/auth.js \
      && ok "exporta: $fn" || fail "falta export: $fn"
  done

  echo ""
  echo "▸ firebase-config.js exporta firebaseConfig?"
  grep -q "export.*firebaseConfig" js/firebase-config.js \
    && ok "firebaseConfig exportado" || fail "firebaseConfig não exportado"
}

phase9() {
  echo ""
  echo "╔══════════════════════════════════════╗"
  echo "║  FASE 9 — login.html + auth.css      ║"
  echo "╚══════════════════════════════════════╝"

  echo ""
  echo "▸ Ficheiros existem?"
  check_exists "login.html"
  check_exists "css/auth.css"
  check_exists "js/login.js"

  echo ""
  echo "▸ Sintaxe JS válida?"
  check_syntax "js/login.js"

  echo ""
  echo "▸ login.html tem elementos obrigatórios?"
  grep -q 'id="btn-google"'    login.html && ok "botão Google presente"    || fail "botão Google ausente"
  grep -q 'id="auth-email"'    login.html && ok "input email presente"     || fail "input email ausente"
  grep -q 'id="auth-password"' login.html && ok "input password presente"  || fail "input password ausente"
  grep -q 'id="btn-anon"'      login.html && ok "botão anon presente"      || fail "botão anon ausente"
  grep -q 'id="auth-error"'    login.html && ok "elemento erro presente"   || fail "elemento erro ausente"
  grep -q 'type="module"'      login.html && ok "login.html usa module"    || fail "login.html não usa module"

  echo ""
  echo "▸ login.html importa css/auth.css?"
  grep -q 'css/auth.css' login.html && ok "auth.css importado" || fail "auth.css não importado"

  echo ""
  echo "▸ Servidor HTTP responde com 200?"
  start_server
  check_http_200 "http://localhost:18099/login.html"
  check_http_200 "http://localhost:18099/css/auth.css"
  check_http_200 "http://localhost:18099/js/login.js"
  check_http_200 "http://localhost:18099/js/auth.js"
  stop_server
}

phase10() {
  echo ""
  echo "╔══════════════════════════════════════╗"
  echo "║  FASE 10 — guard main.js + logout    ║"
  echo "╚══════════════════════════════════════╝"

  echo ""
  echo "▸ main.js importa auth.js?"
  grep -q "from './auth.js'" js/main.js \
    && ok "auth.js importado em main.js" || fail "auth.js não importado em main.js"

  echo ""
  echo "▸ main.js tem guard de autenticação?"
  grep -q "initAuth\|location.*login" js/main.js \
    && ok "guard de auth presente" || fail "guard de auth ausente"

  echo ""
  echo "▸ main.js tem DOMContentLoaded async?"
  grep -q "async.*DOMContentLoaded\|DOMContentLoaded.*async" js/main.js \
    && ok "DOMContentLoaded é async" || fail "DOMContentLoaded não é async (necessário para await)"

  echo ""
  echo "▸ index.html tem botão de logout?"
  grep -q 'id="btn-logout"' index.html \
    && ok "botão logout presente" || fail "botão logout ausente"
}

phase11() {
  echo ""
  echo "╔══════════════════════════════════════╗"
  echo "║  FASE 11 — sw.js v3 + novos assets   ║"
  echo "╚══════════════════════════════════════╝"

  echo ""
  echo "▸ Versão da cache incrementada para v3+?"
  grep -qE "ghestror-v[3-9]" sw.js \
    && ok "cache versão v3+ encontrada" || fail "cache ainda não é v3+"

  echo ""
  echo "▸ ASSETS inclui novos ficheiros?"
  check_assets_includes "login.html"
  check_assets_includes "css/auth.css"
  check_assets_includes "js/auth.js"
  check_assets_includes "js/firebase-config.js"
  check_assets_includes "js/login.js"

  echo ""
  echo "▸ Todos os ficheiros no ASSETS existem em disco?"
  check_sw_assets
}



PHASE=${1:-""}

case "$PHASE" in
  1)  phase1;  report;;
  2)  phase2;  report;;
  3)  phase3;  report;;
  4)  phase4;  report;;
  5)  phase5;  report;;
  6)  phase6;  report;;
  7)  phase7;  report;;
  8)  phase8;  report;;
  9)  phase9;  report;;
  10) phase10; report;;
  11) phase11; report;;
  *)
    echo ""
    echo "Uso: ./test.sh <fase>"
    echo ""
    echo "  Fase 1  — Divisão do CSS"
    echo "  Fase 2  — store.js + utils.js"
    echo "  Fase 3  — tasks.js + notifications.js + export.js"
    echo "  Fase 4  — events.js"
    echo "  Fase 5  — calendar.js"
    echo "  Fase 6  — main.js + index.html"
    echo "  Fase 7  — sw.js (ASSETS + versão cache)"
    echo "  Fase 8  — auth.js + firebase-config.js"
    echo "  Fase 9  — login.html + css/auth.css + js/login.js"
    echo "  Fase 10 — guard main.js + botão logout"
    echo "  Fase 11 — sw.js v3 + novos assets"
    echo ""
    exit 1
    ;;
esac
