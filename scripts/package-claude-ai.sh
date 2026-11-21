#!/usr/bin/env bash
# Package the skill as a .zip for uploading to claude.ai (Settings → Capabilities → Skills).
#
#   bash scripts/package-claude-ai.sh               # dist/animate-visual-motion.zip (with style samples)
#   bash scripts/package-claude-ai.sh --no-samples  # smaller zip without styles/*/sample.png
set -euo pipefail

NAME="animate-visual-motion"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="$ROOT/plugins/$NAME/skills"
OUT="$ROOT/dist/$NAME.zip"
EXCLUDE=('*.DS_Store' '*/renders/*' '*/review/*' '*/frames/*' '*.mp4' '*.wav')
[ "${1:-}" = "--no-samples" ] && EXCLUDE+=('*/sample.png')

mkdir -p "$ROOT/dist"
rm -f "$OUT"
(cd "$SRC" && zip -qr "$OUT" "$NAME" -x "${EXCLUDE[@]}")
echo "Wrote $OUT ($(du -h "$OUT" | cut -f1))"
