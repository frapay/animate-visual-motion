#!/usr/bin/env bash
# Check that this machine can run animate-visual-motion.
# Usage: bash scripts/doctor.sh
# Exit code 0 = everything required is present, 1 = something required is missing.

ok()   { printf '  \033[32m✔\033[0m %s\n' "$1"; }
warn() { printf '  \033[33m!\033[0m %s\n' "$1"; }
bad()  { printf '  \033[31m✘\033[0m %s\n' "$1"; MISSING=1; }
MISSING=0

echo "animate-visual-motion — checking requirements"
echo
echo "Required:"

# Node 18+
if command -v node >/dev/null 2>&1; then
  NV=$(node -p 'process.versions.node.split(".")[0]')
  if [ "$NV" -ge 18 ]; then ok "Node $(node -v)"; else bad "Node $(node -v) is too old — install Node 18 or newer (https://nodejs.org)"; fi
else
  bad "Node not found — install Node 18+ (https://nodejs.org, or: brew install node)"
fi

# ffmpeg
if command -v ffmpeg >/dev/null 2>&1; then
  ok "ffmpeg $(ffmpeg -version 2>/dev/null | head -1 | awk '{print $3}')"
else
  bad "ffmpeg not found — macOS: brew install ffmpeg · Ubuntu/Debian: sudo apt install ffmpeg · Windows: winget install ffmpeg"
fi

# Playwright + Chromium (the tools look in the local node_modules first, then the global one)
if command -v node >/dev/null 2>&1; then
  PW=$(node -e '
    const path = require("path"), { execSync } = require("child_process");
    let pw; try { pw = require("playwright"); } catch { try { pw = require(path.join(execSync("npm root -g").toString().trim(), "playwright")); } catch {} }
    if (!pw) { console.log("none"); process.exit(); }
    const fs = require("fs"); let exe = ""; try { exe = pw.chromium.executablePath(); } catch {}
    console.log(exe && fs.existsSync(exe) ? "ok" : "nochromium");
  ' 2>/dev/null)
  case "$PW" in
    ok)          ok "Playwright + Chromium" ;;
    nochromium)  bad "Playwright found but Chromium is not installed — run: npx playwright install chromium" ;;
    *)           bad "Playwright not found — run: npm i -g playwright && npx playwright install chromium" ;;
  esac
fi

echo
echo "Optional (voice-over word timing):"
if command -v python3 >/dev/null 2>&1 && python3 -c 'import faster_whisper' >/dev/null 2>&1; then
  ok "faster-whisper"
else
  warn "faster-whisper not found — only needed for voice-overs: pip install faster-whisper"
fi

echo
if [ "$MISSING" -eq 0 ]; then
  echo "All required tools are present. 🎬"
else
  echo "Install the missing tools above, then run this check again."
fi
exit "$MISSING"
