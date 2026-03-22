#!/bin/bash
# DevFlow: 同步 skills-source/ 到全局 skills 目录
# 用法: bash scripts/sync-skills.sh [skill-name]
#   不带参数 = 同步所有 DevFlow skill
#   带参数 = 只同步指定 skill
#
# 此脚本供 DevFlow skill 维护者使用（本地编辑 skills-source/ 后同步到 Cowork 全局目录）
# 普通用户无需此脚本——直接在 Cowork 中安装 skill 即可。

# 本地 skills-source 目录（相对于脚本位置，无论从哪里调用都正确）
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOCAL_SKILLS="$SCRIPT_DIR/../skills-source"

# 自动检测 Cowork 全局 skills 目录
detect_global_skills() {
  local base="$HOME/Library/Application Support/Hong Cowork/claude-sessions"
  if [ ! -d "$base" ]; then
    echo ""
    return
  fi

  # 收集所有 .../skills 子目录
  local candidates=()
  while IFS= read -r dir; do
    candidates+=("$dir")
  done < <(find "$base" -maxdepth 2 -name "skills" -type d 2>/dev/null)

  if [ ${#candidates[@]} -eq 0 ]; then
    echo ""
  elif [ ${#candidates[@]} -eq 1 ]; then
    echo "${candidates[0]}"
  else
    # 多个候选，取最近修改的 session
    echo "$(ls -td "${candidates[@]}" 2>/dev/null | head -1)"
  fi
}

GLOBAL_SKILLS=$(detect_global_skills)

if [ -z "$GLOBAL_SKILLS" ]; then
  echo "❌ 未能自动找到 Cowork 全局 skills 目录。"
  echo "   请确认 Cowork 已安装，或手动在脚本顶部设置 GLOBAL_SKILLS 路径。"
  exit 1
fi

# DevFlow 管理的 skill 列表
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
)

sync_skill() {
  local name=$1
  if [ -d "$LOCAL_SKILLS/$name" ]; then
    rm -rf "$GLOBAL_SKILLS/$name"
    cp -R "$LOCAL_SKILLS/$name" "$GLOBAL_SKILLS/$name"
    echo "✅ $name"
  else
    echo "❌ $name (not found in skills-source/)"
  fi
}

echo "Local:  $LOCAL_SKILLS"
echo "Global: $GLOBAL_SKILLS"
echo ""

if [ -n "$1" ]; then
  echo "Syncing: $1"
  sync_skill "$1"
else
  echo "Syncing all DevFlow skills..."
  for skill in "${DEVFLOW_SKILLS[@]}"; do
    sync_skill "$skill"
  done
fi

echo ""
echo "Done. Restart Cowork or toggle skills off/on to refresh."
