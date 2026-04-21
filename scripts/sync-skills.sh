#!/bin/bash
# DevFlow: 同步 skills-source/ 到全局 skills 目录
#
# 用法：
#   bash scripts/sync-skills.sh              # 同步所有核心 skill
#   bash scripts/sync-skills.sh --test       # 同步所有测试 skill（skills-source/test/）
#   bash scripts/sync-skills.sh --all        # 同步核心 + 测试
#   bash scripts/sync-skills.sh <skill-name> # 只同步指定 skill（核心或测试均可）
#   bash scripts/sync-skills.sh --watch      # 监听文件变更，自动同步（需要 fswatch）
#   bash scripts/sync-skills.sh --watch --test   # watch 模式下只同步测试 skill
#   bash scripts/sync-skills.sh --watch --all    # watch 模式下同步全部
#
# DevFlow skill 安装与同步工具。
# 用户安装：Cowork 在执行安装指令时会自动调用此脚本
# 维护者同步：本地编辑 skills-source/ 后运行此脚本同步到全局目录

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOCAL_SKILLS="$SCRIPT_DIR/../skills-source"
LOCAL_TEST_SKILLS="$SCRIPT_DIR/../skills-source/test"

# ── 自动检测 Cowork 全局 skills 目录 ──────────────────────────────────────────
detect_global_skills() {
  # 首选：Claude Code canonical skills 路径
  local canonical="$HOME/.claude/skills"
  if [ -d "$canonical" ]; then echo "$canonical"; return; fi

  # 回退：Cowork 会话目录下的 symlink
  local base="$HOME/Library/Application Support/Hong Cowork/claude-sessions"
  if [ ! -d "$base" ]; then echo ""; return; fi

  local candidates=()
  while IFS= read -r dir; do
    candidates+=("$dir")
  done < <(find "$base" -maxdepth 2 -name "skills" -type d 2>/dev/null)

  if   [ ${#candidates[@]} -eq 0 ]; then echo ""
  elif [ ${#candidates[@]} -eq 1 ]; then echo "${candidates[0]}"
  else echo "$(ls -td "${candidates[@]}" 2>/dev/null | head -1)"
  fi
}

GLOBAL_SKILLS=$(detect_global_skills)

if [ -z "$GLOBAL_SKILLS" ]; then
  echo "❌ 未能自动找到 Cowork 全局 skills 目录。"
  echo "   请确认 Cowork 已安装，或手动在脚本顶部设置 GLOBAL_SKILLS 路径。"
  exit 1
fi

# ── 核心 skill 列表 ────────────────────────────────────────────────────────────
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

# ── DevFlow 实验性 skill 列表（存放于 skills-source/test/）────────────────────
TEST_SKILLS=(
  change-audit
  change-audit-l1-design-review
  change-audit-l2-contract-review
)

# ── 同步函数 ──────────────────────────────────────────────────────────────────
sync_skill() {
  local name=$1
  local src_dir=$2  # 可选：明确指定源目录（核心 or 测试）

  # 若未指定源目录，自动查找
  if [ -z "$src_dir" ]; then
    if   [ -d "$LOCAL_SKILLS/$name" ];      then src_dir="$LOCAL_SKILLS"
    elif [ -d "$LOCAL_TEST_SKILLS/$name" ]; then src_dir="$LOCAL_TEST_SKILLS"
    else
      echo "❌ $name (not found in skills-source/ or skills-source/test/)"
      return
    fi
  fi

  rm -rf "$GLOBAL_SKILLS/$name"
  cp -R "$src_dir/$name" "$GLOBAL_SKILLS/$name"
  echo "✅ $name"
}

sync_core_skills() {
  echo "Syncing core skills..."
  for skill in "${DEVFLOW_SKILLS[@]}"; do
    sync_skill "$skill" "$LOCAL_SKILLS"
  done
}

sync_test_skills() {
  echo "Syncing test skills (skills-source/test/)..."
  for skill in "${TEST_SKILLS[@]}"; do
    sync_skill "$skill" "$LOCAL_TEST_SKILLS"
  done
}

# ── 参数解析 ──────────────────────────────────────────────────────────────────
WATCH_MODE=false
SYNC_TARGET="core"  # core | test | all | single

# 提取 --watch 标志
args=()
for arg in "$@"; do
  if [ "$arg" = "--watch" ]; then WATCH_MODE=true
  else args+=("$arg")
  fi
done
set -- "${args[@]}"

# 确定同步目标
if   [ "$1" = "--test" ]; then SYNC_TARGET="test"
elif [ "$1" = "--all"  ]; then SYNC_TARGET="all"
elif [ -n "$1" ]; then         SYNC_TARGET="single"; SINGLE_SKILL="$1"
fi

# ── 执行同步 ──────────────────────────────────────────────────────────────────
do_sync() {
  echo ""
  echo "Local (core): $LOCAL_SKILLS"
  echo "Local (test): $LOCAL_TEST_SKILLS"
  echo "Global:       $GLOBAL_SKILLS"
  echo ""

  case "$SYNC_TARGET" in
    core)   sync_core_skills ;;
    test)   sync_test_skills ;;
    all)    sync_core_skills; echo ""; sync_test_skills ;;
    single) sync_skill "$SINGLE_SKILL" ;;
  esac

  echo ""
  echo "Done. Restart Cowork or toggle skills off/on to refresh."
}

# ── Watch 模式 ────────────────────────────────────────────────────────────────
if $WATCH_MODE; then
  if ! command -v fswatch &>/dev/null; then
    echo "❌ watch 模式需要 fswatch。请先执行：brew install fswatch"
    exit 1
  fi

  # 确定监听目录
  case "$SYNC_TARGET" in
    core)   WATCH_DIRS=("$LOCAL_SKILLS");;
    test)   WATCH_DIRS=("$LOCAL_TEST_SKILLS");;
    all)    WATCH_DIRS=("$LOCAL_SKILLS");;  # LOCAL_SKILLS 已包含 test/ 子目录
    single) WATCH_DIRS=("$LOCAL_SKILLS" "$LOCAL_TEST_SKILLS");;
  esac

  echo "👀 Watch 模式启动（Ctrl-C 退出）"
  echo "   监听: ${WATCH_DIRS[*]}"
  echo "   目标: $SYNC_TARGET"
  echo ""

  # 先做一次全量同步
  do_sync

  # 然后监听变更
  fswatch -o --event Updated --event Created --event Removed \
    "${WATCH_DIRS[@]}" | while read -r _; do
    echo ""
    echo "🔄 变更检测到，重新同步... ($(date '+%H:%M:%S'))"
    do_sync
  done
else
  do_sync
fi
