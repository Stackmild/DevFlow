#!/usr/bin/env bash
# Copy DevFlow-aligned Cursor Subagent definitions to ~/.cursor/agents
#
# Usage:
#   bash scripts/install-cursor-subagents.sh
#   CURSOR_AGENTS_DIR=~/.cursor/agents bash scripts/install-cursor-subagents.sh

set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PACK_DIR="$SCRIPT_DIR/../cursor-pack/agents"
TARGET="${CURSOR_AGENTS_DIR:-$HOME/.cursor/agents}"

if [[ ! -d "$PACK_DIR" ]]; then
  echo "❌ Missing $PACK_DIR"
  exit 1
fi

mkdir -p "$TARGET"
shopt -s nullglob
for f in "$PACK_DIR"/*.md; do
  base=$(basename "$f")
  cp "$f" "$TARGET/$base"
  echo "✅ $TARGET/$base"
done
shopt -u nullglob

echo ""
echo "Done. Restart Cursor if new agents do not appear."
