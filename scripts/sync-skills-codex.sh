#!/bin/bash
# DevFlow: sync selected skills-source/ entries into Codex skills.
#
# Usage:
#   bash scripts/sync-skills-codex.sh --dry-run
#   bash scripts/sync-skills-codex.sh
#   bash scripts/sync-skills-codex.sh --test
#   bash scripts/sync-skills-codex.sh --all
#   bash scripts/sync-skills-codex.sh dev-orchestrator
#
# MVP note: devflow-self-improve is intentionally excluded because its scripts
# read Cowork session JSONL paths and are not Codex-ready yet.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEVFLOW_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
LOCAL_SKILLS="$DEVFLOW_ROOT/skills-source"
LOCAL_TEST_SKILLS="$DEVFLOW_ROOT/skills-source/test"
CODEX_HOME_DIR="${CODEX_HOME:-$HOME/.codex}"
GLOBAL_SKILLS="$CODEX_HOME_DIR/skills"

DEVFLOW_SKILLS=(
  dev-orchestrator
  web-app-architect
  backend-data-api
  webapp-interaction-designer
  frontend-design
  full-stack-developer
  code-reviewer
  webapp-consistency-audit
  pre-release-test-reviewer
  playwright-e2e-testing
  state-auditor
  release-and-change-manager
  component-library-maintainer
  product-manager
)

TEST_SKILLS=(
  change-audit
  change-audit-l1-design-review
  change-audit-l2-contract-review
)

DRY_RUN=false
SYNC_TARGET="core"
SINGLE_SKILL=""

for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_RUN=true ;;
    --test) SYNC_TARGET="test" ;;
    --all) SYNC_TARGET="all" ;;
    --help|-h)
      sed -n '1,15p' "$0"
      exit 0
      ;;
    --*)
      echo "Unknown option: $arg" >&2
      exit 2
      ;;
    *)
      SYNC_TARGET="single"
      SINGLE_SKILL="$arg"
      ;;
  esac
done

validate_target() {
  CODEX_HOME_DIR="${CODEX_HOME_DIR%/}"
  GLOBAL_SKILLS="$CODEX_HOME_DIR/skills"

  if [ -z "${CODEX_HOME_DIR:-}" ] || [ -z "${GLOBAL_SKILLS:-}" ]; then
    echo "Unsafe Codex skills target: empty path" >&2
    exit 1
  fi
  case "$CODEX_HOME_DIR" in
    /*) ;;
    *)
      echo "Refusing relative CODEX_HOME path: $CODEX_HOME_DIR" >&2
      exit 1
      ;;
  esac
  if [ "$CODEX_HOME_DIR" = "/" ] || [ "$GLOBAL_SKILLS" = "/" ] || [ "$GLOBAL_SKILLS" = "/skills" ]; then
    echo "Unsafe Codex skills target: '$GLOBAL_SKILLS'" >&2
    exit 1
  fi
  if [ "$CODEX_HOME_DIR" = "$HOME" ] || [ "$GLOBAL_SKILLS" = "$HOME/skills" ]; then
    echo "Refusing to treat HOME as CODEX_HOME: $CODEX_HOME_DIR" >&2
    exit 1
  fi
  case "$GLOBAL_SKILLS" in
    "$CODEX_HOME_DIR"/skills) ;;
    *)
      echo "Refusing to sync outside Codex skills dir: $GLOBAL_SKILLS" >&2
      exit 1
      ;;
  esac
}

contains() {
  local needle="$1"; shift
  local item
  for item in "$@"; do
    [ "$item" = "$needle" ] && return 0
  done
  return 1
}

source_root_for() {
  local name="$1"
  if contains "$name" "${DEVFLOW_SKILLS[@]}"; then
    echo "$LOCAL_SKILLS"
    return 0
  fi
  if contains "$name" "${TEST_SKILLS[@]}"; then
    echo "$LOCAL_TEST_SKILLS"
    return 0
  fi
  echo ""
  return 1
}

sync_skill() {
  local name="$1"
  local src_root
  src_root="$(source_root_for "$name" || true)"
  if [ -z "$src_root" ]; then
    echo "Refusing unknown or unsupported skill: $name" >&2
    return 1
  fi
  if [ "$name" = "devflow-self-improve" ]; then
    echo "Refusing unsupported Codex MVP skill: $name" >&2
    return 1
  fi
  if [ ! -d "$src_root/$name" ]; then
    echo "Skill source missing: $src_root/$name" >&2
    return 1
  fi

  local dest="$GLOBAL_SKILLS/$name"
  if $DRY_RUN; then
    echo "DRY-RUN sync $name -> $dest"
  else
    mkdir -p "$GLOBAL_SKILLS"
    rm -rf "$dest"
    cp -R "$src_root/$name" "$dest"
    echo "Synced $name -> $dest"
  fi
}

sync_core() {
  local skill
  for skill in "${DEVFLOW_SKILLS[@]}"; do
    sync_skill "$skill"
  done
}

sync_test() {
  local skill
  for skill in "${TEST_SKILLS[@]}"; do
    sync_skill "$skill"
  done
}

validate_target

echo "Local skills: $LOCAL_SKILLS"
echo "Codex skills: $GLOBAL_SKILLS"
echo "Mode: $SYNC_TARGET"
$DRY_RUN && echo "Dry run: true"
echo ""

case "$SYNC_TARGET" in
  core) sync_core ;;
  test) sync_test ;;
  all) sync_core; sync_test ;;
  single) sync_skill "$SINGLE_SKILL" ;;
esac

echo ""
echo "Done. Restart Codex to load newly synced skills."
