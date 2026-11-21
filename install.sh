#!/usr/bin/env bash
# Install animate-visual-motion as a Claude Code skill (macOS / Linux / WSL / Git Bash).
#
#   bash install.sh              # personal skill  → ~/.claude/skills/animate-visual-motion
#   bash install.sh --project    # project skill   → ./.claude/skills/animate-visual-motion
#   bash install.sh --deps       # also install Playwright + Chromium (npm, global)
#   bash install.sh --uninstall  # remove the personal skill (add --project for the project one)
#
# One-liner (no clone needed):
#   curl -fsSL https://raw.githubusercontent.com/frapay/animate-visual-motion/main/install.sh | bash
set -euo pipefail

NAME="animate-visual-motion"
REPO_URL="https://github.com/frapay/animate-visual-motion.git"
SKILL_SUBDIR="plugins/$NAME/skills/$NAME"

SCOPE="personal"; DEPS=0; UNINSTALL=0
for arg in "$@"; do
  case "$arg" in
    --project)   SCOPE="project" ;;
    --deps)      DEPS=1 ;;
    --uninstall) UNINSTALL=1 ;;
    -h|--help)   sed -n '2,10p' "$0" 2>/dev/null || true; exit 0 ;;
    *) echo "Unknown option: $arg (try --help)"; exit 2 ;;
  esac
done

if [ "$SCOPE" = "project" ]; then BASE="$PWD/.claude/skills"; else BASE="$HOME/.claude/skills"; fi
DEST="$BASE/$NAME"

if [ "$UNINSTALL" -eq 1 ]; then
  if [ -f "$DEST/SKILL.md" ]; then rm -rf "$DEST"; echo "Removed $DEST"; else echo "Nothing to remove at $DEST"; fi
  exit 0
fi

# Find the skill: next to this script (a clone), or fetch a shallow clone.
SRC=""; TMP=""
HERE="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" 2>/dev/null && pwd || true)"
if [ -n "$HERE" ] && [ -f "$HERE/$SKILL_SUBDIR/SKILL.md" ]; then
  SRC="$HERE/$SKILL_SUBDIR"
else
  command -v git >/dev/null 2>&1 || { echo "git is required to download the skill."; exit 1; }
  TMP="$(mktemp -d)"
  echo "Downloading $REPO_URL …"
  git clone --depth 1 --quiet "$REPO_URL" "$TMP/repo"
  SRC="$TMP/repo/$SKILL_SUBDIR"
fi

# Install (replace an older copy of this skill; your pieces live in your projects, not here).
mkdir -p "$BASE"
if [ -e "$DEST" ] && [ ! -f "$DEST/SKILL.md" ]; then
  echo "$DEST exists and is not this skill — move it away first."; exit 1
fi
[ -e "$DEST" ] && echo "Updating the existing copy at $DEST"
rm -rf "$DEST"
cp -R "$SRC" "$DEST"
[ -n "$TMP" ] && rm -rf "$TMP"
echo "Installed the skill → $DEST"

if [ "$DEPS" -eq 1 ]; then
  echo
  echo "Installing Playwright + Chromium (npm i -g playwright) …"
  npm i -g playwright
  npx playwright install chromium
fi

# Requirement check (doctor.sh ships next to this script in a clone; fall back to a quick inline check).
echo
if [ -n "$HERE" ] && [ -f "$HERE/scripts/doctor.sh" ]; then
  bash "$HERE/scripts/doctor.sh" || true
else
  for c in node ffmpeg; do command -v "$c" >/dev/null 2>&1 && echo "  ✔ $c" || echo "  ✘ $c missing"; done
  echo "  (Playwright + Chromium: npm i -g playwright && npx playwright install chromium)"
fi

echo
echo "Done. Start a new Claude Code session and try:"
echo "  /$NAME a 20-second history of the bicycle, cut paper"
