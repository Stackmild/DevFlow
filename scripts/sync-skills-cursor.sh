#!/usr/bin/env bash
# DevFlow → Cursor 全局 Skills 同步（cursor-integration）
#
# 用法：
#   bash scripts/sync-skills-cursor.sh              # 同步核心 skill
#   bash scripts/sync-skills-cursor.sh --test       # 仅同步 skills-source/test/
#   bash scripts/sync-skills-cursor.sh --all        # 核心 + 测试 + devflow-self-improve
#   bash scripts/sync-skills-cursor.sh <skill-name> # 单个 skill
#   GLOBAL_SKILLS=~/path bash scripts/sync-skills-cursor.sh   # 覆盖目标目录
#
# 安装后重启 Cursor 或刷新 Skills。

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOCAL_SKILLS="$SCRIPT_DIR/../skills-source"
LOCAL_TEST_SKILLS="$SCRIPT_DIR/../skills-source/test"

GLOBAL_SKILLS="${GLOBAL_SKILLS:-$HOME/.cursor/skills}"

if [[ ! -d "$LOCAL_SKILLS" ]]; then
  echo "❌ skills-source not found: $LOCAL_SKILLS"
  exit 1
fi

mkdir -p "$GLOBAL_SKILLS"

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
  state-auditor
  release-and-change-manager
  component-library-maintainer
  product-manager
  devflow-self-improve
)

TEST_SKILLS=(
  change-audit
  change-audit-l1-design-review
  change-audit-l2-contract-review
)

sync_skill() {
  local name=$1
  local src_dir=${2:-}

  if [[ -z "$src_dir" ]]; then
    if   [[ -d "$LOCAL_SKILLS/$name" ]]; then src_dir="$LOCAL_SKILLS"
    elif [[ -d "$LOCAL_TEST_SKILLS/$name" ]]; then src_dir="$LOCAL_TEST_SKILLS"
    else
      echo "❌ $name (not found under skills-source/ or skills-source/test/)"
      return
    fi
  fi

  rm -rf "$GLOBAL_SKILLS/$name"
  cp -R "$src_dir/$name" "$GLOBAL_SKILLS/$name"
  echo "✅ $name"
}

sync_pm_subskills() {
  local pm_skills="$LOCAL_SKILLS/product-manager/skills"
  [[ -d "$pm_skills" ]] || return 0
  echo "Syncing product-manager sub-skills..."
  local d name
  for d in "$pm_skills"/*; do
    [[ -d "$d" ]] || continue
    name=$(basename "$d")
    rm -rf "$GLOBAL_SKILLS/$name"
    cp -R "$d" "$GLOBAL_SKILLS/$name"
    echo "✅ $name (from product-manager/skills)"
  done
}

sync_core_skills() {
  echo "Syncing core skills..."
  local s
  for s in "${DEVFLOW_SKILLS[@]}"; do
    sync_skill "$s" "$LOCAL_SKILLS"
  done
  sync_pm_subskills
}

sync_test_skills() {
  echo "Syncing test skills..."
  local s
  for s in "${TEST_SKILLS[@]}"; do
    sync_skill "$s" "$LOCAL_TEST_SKILLS"
  done
}

SYNC_TARGET="core"
if   [[ "${1:-}" == "--test" ]]; then SYNC_TARGET="test"
elif [[ "${1:-}" == "--all"  ]]; then SYNC_TARGET="all"
elif [[ -n "${1:-}" ]]; then SYNC_TARGET="single"; SINGLE_SKILL="$1"
fi

echo ""
echo "DevFlow skills-source: $LOCAL_SKILLS"
echo "Cursor GLOBAL_SKILLS:  $GLOBAL_SKILLS"
echo ""

case "$SYNC_TARGET" in
  core)   sync_core_skills ;;
  test)   sync_test_skills ;;
  all)    sync_core_skills; echo ""; sync_test_skills ;;
  single) sync_skill "$SINGLE_SKILL" ;;
esac

echo ""
echo "Done. Restart Cursor or reload Skills to pick up changes."
