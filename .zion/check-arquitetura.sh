#!/usr/bin/env bash
# check-arquitetura.sh — verificador do architecture.md do PRODUTO + regra instalada (ADR-015/018).
# Verifica; NÃO bloqueia (RN-01, ADR-004): a Fase 4 das skills ecoa e o Autor decide. O guard
# de pre-commit opt-in do /zion-speckit-install usa o exit 1 para bloquear POR ESCOLHA do Autor.
#
# Uso:
#   check-arquitetura.sh [ROOT]   # raiz do repo do produto (default: .)
#
# Olha: ROOT/docs/architecture.md · ROOT/docs/adr/ · ROOT/docs/backlog.md · ROOT/CLAUDE.md.
# Exit: 0 (limpo) · 1 (achados) · 2 (erro de uso/ambiente).
set -u

usage() { echo "uso: check-arquitetura.sh [ROOT]" >&2; exit 2; }

ROOT="${1:-.}"
case "$ROOT" in -*) usage ;; esac
[ -d "$ROOT" ] || { echo "check-arquitetura: diretório não encontrado: $ROOT" >&2; exit 2; }

# Acompanha a versão dos marcadores de assets/templates/regras-speckit.md — mude os dois juntos.
EXPECTED_VERSION="v2"

ARCH="$ROOT/docs/architecture.md"
ADR_DIR="$ROOT/docs/adr"
BACKLOG="$ROOT/docs/backlog.md"
RULES="$ROOT/CLAUDE.md"
TAB="$(printf '\t')"

# Conteúdo entre os marcadores de um bloco (vazio se marcadores ausentes). O marcador de abertura
# casa por PREFIXO — o bloco zion:narrativa carrega o atributo adrs= na própria linha (ADR-018).
block_content() {  # $1 arquivo  $2 nome-do-bloco
  awk -v start="<!-- zion:$2:start" -v end="<!-- zion:$2:end -->" '
    index($0, start)==1 { inb=1; next }
    $0==end   { inb=0 }
    inb { print }
  ' "$1"
}

# Âncora do bloco de narrativa: os ADRs que a máquina usou ao redigir (vazio se ausente).
narrativa_ancora() {  # $1 arquivo → "ADR-002,ADR-004" ou vazio
  grep -m1 -oE '<!-- zion:narrativa:start[^>]*-->' "$1" \
    | grep -oE 'adrs=[^ >]+' | head -1 | sed 's/^adrs=//' | tr -d ' '
}

# 1. Documento presente + as quatro seções obrigatórias do esqueleto.
check_secoes() {
  if [ ! -f "$ARCH" ]; then
    printf 'docs/architecture.md: arquitetura-ausente — documento não existe (rode /zion-speckit-install)\n'
    return 0
  fi
  grep -q '^## 1\. Visão geral'            "$ARCH" || printf 'docs/architecture.md: secao-ausente — "## 1. Visão geral"\n'
  grep -q '^## 2\. Integrações externas'   "$ARCH" || printf 'docs/architecture.md: secao-ausente — "## 2. Integrações externas"\n'
  grep -q '^## 3\. Decisões estruturantes' "$ARCH" || printf 'docs/architecture.md: secao-ausente — "## 3. Decisões estruturantes"\n'
  grep -q '^## 4\. Visão do backlog'       "$ARCH" || printf 'docs/architecture.md: secao-ausente — "## 4. Visão do backlog"\n'
}

# 2. §1 Visão geral: a narrativa estrutural (bloco zion:narrativa) existe, tem prosa e é ancorada
#    nos ADRs que a sustentam (ADR-018). A prosa é do Autor; o que se cobra é presença e âncora.
check_narrativa() {
  [ -f "$ARCH" ] || return 0
  if ! grep -q '<!-- zion:narrativa:start' "$ARCH"; then
    printf 'docs/architecture.md: narrativa-ausente — a §1 não tem o bloco zion:narrativa (rode /zion-prd-decompose --narrativa)\n'
    return 0
  fi
  local prosa ancora
  prosa="$(block_content "$ARCH" narrativa | grep -vE '^[[:space:]]*$' | grep -vE '^[[:space:]]*_.*_[[:space:]]*$')"
  if [ -z "$prosa" ]; then
    printf 'docs/architecture.md: narrativa-ausente — bloco zion:narrativa sem prosa (rode /zion-prd-decompose --narrativa)\n'
    return 0
  fi
  ancora="$(narrativa_ancora "$ARCH")"
  [ -n "$ancora" ] \
    || printf 'docs/architecture.md: ancora-ausente — narrativa sem adrs= no marcador de abertura (rode /zion-prd-decompose --narrativa)\n'
}

# 2b. §2 Integrações externas: placeholder do esqueleto = integrações nunca declaradas. Declarar
#     "_(nenhuma integração externa)_" é saída válida — a §2 não tem marcadores, por escolha.
check_integracoes() {
  [ -f "$ARCH" ] || return 0
  grep -q '^## 2\. Integrações externas' "$ARCH" || return 0
  awk '
    /^## 2\. Integrações externas/ { insec=1; next }
    insec && /^## /                { insec=0 }
    insec && index($0, "prosa do Autor:") { found=1 }
    END { exit(found?0:1) }
  ' "$ARCH" \
    && printf 'docs/architecture.md: integracoes-nao-declaradas — a §2 ainda tem o placeholder do esqueleto (declare as integrações ou "_(nenhuma integração externa)_")\n'
  return 0
}

# 3. Índice de ADRs (bloco zion:adr-index) em dia com docs/adr/ — nos dois sentidos.
#    ADR substituído é ignorado no sentido disco→bloco (o mapa é o vigente — ADR-018).
#    docs/adr/ ausente não engole o sentido bloco→disco: citação vira fantasma e é acusada.
check_adr_index() {
  [ -f "$ARCH" ] || return 0
  local blk f base tgt
  blk="$(block_content "$ARCH" adr-index)"
  for f in "$ADR_DIR"/ADR-*.md; do
    [ -f "$f" ] || continue
    base="$(basename "$f")"
    # Decisão substituída sai do mapa por decisão (ADR-018): não é fantasma, é histórico.
    grep -qE '^[[:space:]]*-[[:space:]]*\*\*Status:\*\*.*Substitu[ií]do por' "$f" && continue
    printf '%s' "$blk" | grep -qF "$base" \
      || printf 'docs/architecture.md: adr-index-defasado — %s fora do bloco zion:adr-index (rode /zion-prd-trace)\n' "$base"
  done
  printf '%s\n' "$blk" | grep -oE '\([^)]*ADR-[0-9]+[^)]*\.md\)' | tr -d '()' | sort -u | while read -r tgt; do
    [ -f "$ADR_DIR/$(basename "$tgt")" ] \
      || printf 'docs/architecture.md: adr-index-defasado — %s citado no bloco mas ausente de docs/adr/ (rode /zion-prd-trace)\n' "$(basename "$tgt")"
  done
}

# 4. Visão do backlog (bloco zion:backlog-view) em dia: cada slug da PRIMEIRA tabela do
#    backlog presente no bloco com o MESMO status.
check_backlog_view() {
  [ -f "$ARCH" ] && [ -f "$BACKLOG" ] || return 0
  local blk slug status
  blk="$(block_content "$ARCH" backlog-view)"
  awk '
    function trim(s){ gsub(/^[[:space:]]+|[[:space:]]+$/,"",s); return s }
    function lc(s){ return tolower(s) }
    done { next }
    /^[[:space:]]*\|/ {
      line=$0; sub(/^[[:space:]]*\|/,"",line); sub(/\|[[:space:]]*$/,"",line)
      nc=split(line, c, /\|/); for(i=1;i<=nc;i++) c[i]=trim(c[i])
      if (!intab) {
        for(i=1;i<=nc;i++){ h=lc(c[i]); if (index(h,"slug")) scol=i; else if (index(h,"status")) stcol=i }
        ok=(scol && stcol); intab=1; next
      }
      if (c[1] ~ /^[-:]+$/) next
      if (ok && c[scol] != "") printf "%s\t%s\n", c[scol], c[stcol]
      next
    }
    intab { done=1 }
  ' "$BACKLOG" | while IFS="$TAB" read -r slug status; do
    printf '%s' "$blk" | grep -qF "\`$slug\` — $status" \
      || printf 'docs/architecture.md: backlog-view-defasada — `%s` (%s) fora do bloco zion:backlog-view (rode /zion-prd-trace)\n' "$slug" "$status"
  done
}

# 5. Bloco de regras do CLAUDE.md presente e na versão esperada (drift pós-upgrade).
check_regras() {
  if [ ! -f "$RULES" ] || ! grep -qE '<!-- zion:speckit:v[0-9]+:start -->' "$RULES"; then
    printf 'CLAUDE.md: regras-ausentes — bloco zion:speckit não instalado (rode /zion-speckit-install)\n'
    return 0
  fi
  local ver
  ver="$(grep -oE '<!-- zion:speckit:v[0-9]+:start -->' "$RULES" | head -1 | grep -oE 'v[0-9]+')"
  [ "$ver" = "$EXPECTED_VERSION" ] \
    || printf 'CLAUDE.md: regras-defasadas — bloco %s instalado, o harness espera %s (re-rode /zion-speckit-install)\n' "$ver" "$EXPECTED_VERSION"
}

findings="$(
  check_secoes
  check_narrativa
  check_integracoes
  check_adr_index
  check_backlog_view
  check_regras
)"

if [ -n "$findings" ]; then
  printf '%s\n' "$findings"
  count="$(printf '%s\n' "$findings" | grep -c .)"
  echo "check-arquitetura: $count achado(s)"
  exit 1
else
  echo "check-arquitetura: limpo"
  exit 0
fi
