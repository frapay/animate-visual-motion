#!/usr/bin/env bash
# Install animate-visual-motion as an Agent Skill (macOS / Linux / WSL / Git Bash).
#
#   bash install.sh                    # Claude Code, personal → ~/.claude/skills/animate-visual-motion
#   bash install.sh --agent opencode   # another agent (see the list below)
#   bash install.sh --project          # project skill (inside the current folder) instead of personal
#   bash install.sh --deps             # also install Playwright + Chromium (npm, global)
#   bash install.sh --uninstall        # remove it again (same --agent / --project as when installing)
#   bash install.sh --list             # show every agent and where the skill goes
#
#   --agent  claude (default) · agents (the shared ~/.agents/skills, read by most agents)
#            opencode · codex · gemini · cursor · copilot · windsurf · amp · goose
#
# One-liner (no clone needed):
#   curl -fsSL https://raw.githubusercontent.com/frapay/animate-visual-motion/main/install.sh | bash -s -- --agent opencode
set -euo pipefail

NAME="animate-visual-motion"
REPO_URL="https://github.com/frapay/animate-visual-motion.git"
SKILL_SUBDIR="plugins/$NAME/skills/$NAME"

# agent → "personal dir|project dir|how to call it"  (paths from each agent's official skills docs, Nov 2026)
agent_info() {
  case "$1" in
    claude)   echo "$HOME/.claude/skills|.claude/skills|/$NAME in Claude Code" ;;
    agents)   echo "$HOME/.agents/skills|.agents/skills|any agent that reads ~/.agents/skills (Codex, Gemini CLI, Cursor, Copilot, Windsurf, Amp, Goose, OpenCode)" ;;
    opencode) echo "$HOME/.config/opencode/skills|.opencode/skills|ask for an animation (OpenCode loads it with its skill tool)" ;;
    codex)    echo "$HOME/.agents/skills|.agents/skills|\$$NAME or /skills in Codex" ;;
    gemini)   echo "$HOME/.gemini/skills|.gemini/skills|ask for an animation in Gemini CLI (or /skills reload in a running session)" ;;
    cursor)   echo "$HOME/.cursor/skills|.cursor/skills|/$NAME in Cursor Agent chat (restart Cursor first)" ;;
    copilot)  echo "$HOME/.copilot/skills|.github/skills|/$NAME in Copilot (CLI: /skills reload)" ;;
    windsurf) echo "$HOME/.config/devin/skills|.devin/skills|/$NAME in Windsurf / Devin Desktop" ;;
    amp)      echo "$HOME/.config/amp/skills|.agents/skills|ask for an animation in Amp (new thread)" ;;
    goose)    echo "$HOME/.agents/skills|.agents/skills|/skills $NAME in goose (new session)" ;;
    *) return 1 ;;
  esac
}
AGENTS="claude agents opencode codex gemini cursor copilot windsurf amp goose"

AGENT="claude"; SCOPE="personal"; DEPS=0; UNINSTALL=0
while [ $# -gt 0 ]; do
  case "$1" in
    --agent)     shift; AGENT="${1:-}" ;;
    --agent=*)   AGENT="${1#--agent=}" ;;
    --project)   SCOPE="project" ;;
    --deps)      DEPS=1 ;;
    --uninstall) UNINSTALL=1 ;;
    --list)
      printf "%-9s %-34s %s\n" agent personal project
      for a in $AGENTS; do IFS='|' read -r g p _ <<< "$(agent_info "$a")"; printf "%-9s %-34s %s\n" "$a" "${g/#$HOME/~}" "$p"; done
      exit 0 ;;
    -h|--help)   sed -n '2,16p' "$0" 2>/dev/null || true; exit 0 ;;
    *) echo "Unknown option: $1 (try --help)"; exit 2 ;;
  esac
  shift
done

INFO="$(agent_info "$AGENT")" || { echo "Unknown agent: '$AGENT'. Choose one of: $AGENTS"; exit 2; }
IFS='|' read -r G_DIR P_DIR HOWTO <<< "$INFO"
if [ "$SCOPE" = "project" ]; then BASE="$PWD/$P_DIR"; else BASE="$G_DIR"; fi
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
echo "Done ($AGENT, $SCOPE). Start a new session, then: $HOWTO"
echo "  e.g. \"make a 20-second history of the bicycle, cut paper style\""
