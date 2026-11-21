# Using animate-visual-motion with other coding agents

🇮🇩 [Bahasa Indonesia](OTHER-AGENTS.id.md) · ← [back to README](../README.md)

The skill follows the open **Agent Skills** format: one folder containing `SKILL.md` (with `name` and `description` frontmatter) plus its supporting files. Its tools are plain Node scripts. Any agent that can load a skill folder and run terminal commands can make videos with it: OpenCode, Codex CLI, Gemini CLI, Cursor, GitHub Copilot, Windsurf, Amp, goose, and more.

> Paths below come from each agent's official skills docs as of **November 2026**. Agents change these, so if a path stops working, check the linked docs, then [open an issue](https://github.com/frapay/animate-visual-motion/issues).

---

## 1. Install the render toolchain (every agent)

Same as for Claude Code: Node 18+, Playwright + Chromium, ffmpeg. See [Requirements](../README.md#requirements), then check:

```bash
bash scripts/doctor.sh
```

## 2. Install the skill

### The easy way: one shared folder

Most agents also read the shared folder **`~/.agents/skills/`** (or `.agents/skills/` inside a project). Installing there covers Codex, Gemini CLI, Cursor, Copilot, Windsurf, Amp, goose and OpenCode at once:

```bash
git clone https://github.com/frapay/animate-visual-motion.git
cd animate-visual-motion
bash install.sh --agent agents              # → ~/.agents/skills/animate-visual-motion
bash install.sh --agent agents --project    # → ./.agents/skills/animate-visual-motion (run inside your project)
```

### Or: the agent's own folder

```bash
bash install.sh --agent opencode     # or codex, gemini, cursor, copilot, windsurf, amp, goose
bash install.sh --list               # show every folder the script knows
```

| agent | `--agent` | personal folder | project folder | also reads | docs |
|---|---|---|---|---|---|
| **OpenCode** | `opencode` | `~/.config/opencode/skills/` | `.opencode/skills/` | `~/.claude/skills`, `~/.agents/skills`, `.claude/skills`, `.agents/skills` | [opencode.ai/docs/skills](https://opencode.ai/docs/skills) |
| **Codex CLI** | `codex` | `~/.agents/skills/` | `.agents/skills/` | — | [learn.chatgpt.com/docs/build-skills](https://learn.chatgpt.com/docs/build-skills) |
| **Gemini CLI** | `gemini` | `~/.gemini/skills/` | `.gemini/skills/` | `~/.agents/skills`, `.agents/skills` | [geminicli.com/docs/cli/skills](https://geminicli.com/docs/cli/skills/) |
| **Cursor** | `cursor` | `~/.cursor/skills/` | `.cursor/skills/` | `.agents`, `.claude`, `.codex` skill folders | [cursor.com/docs/context/skills](https://cursor.com/docs/context/skills) |
| **GitHub Copilot** (CLI + VS Code) | `copilot` | `~/.copilot/skills/` | `.github/skills/` | `~/.agents/skills`, `.claude/skills`, `.agents/skills` | [docs.github.com: add skills](https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/add-skills) · [VS Code](https://code.visualstudio.com/docs/copilot/customization/agent-skills) |
| **Windsurf / Devin Desktop** | `windsurf` | `~/.config/devin/skills/` | `.devin/skills/` (old: `.windsurf/skills/`) | `~/.agents/skills`, `.agents/skills` | [docs.devin.ai: skills](https://docs.devin.ai/desktop/cascade/skills) |
| **Amp** | `amp` | `~/.config/amp/skills/` | `.agents/skills/` | `~/.agents/skills`, `~/.config/agents/skills`, `~/.claude/skills`, `.claude/skills` | [ampcode.com/docs/customize/skills](https://ampcode.com/docs/customize/skills) |
| **goose** | `goose` | `~/.agents/skills/` | `.agents/skills/` | `.goose/skills`, `.claude/skills`, `~/.claude/skills` | [goose-docs.ai: skills](https://goose-docs.ai/docs/guides/context-engineering/using-skills) |

**Install it in one place only.** Several agents read more than one folder. OpenCode, Cursor, Copilot, Amp and goose all read both `~/.claude/skills` and `~/.agents/skills`, so a copy in each can show up twice. If you use Claude Code *and* other agents, `~/.claude/skills` (the default) or `~/.agents/skills` alone is usually enough. Check the "also reads" column.

### Windows (PowerShell), without the script

```powershell
git clone https://github.com/frapay/animate-visual-motion.git
$src = "animate-visual-motion\plugins\animate-visual-motion\skills\animate-visual-motion"
$dst = "$env:USERPROFILE\.agents\skills"          # or the agent's own folder from the table
New-Item -ItemType Directory -Force $dst | Out-Null
Copy-Item -Recurse $src $dst
```

## 3. Call it

Start a **new session** after installing (most agents scan skills at startup), then describe the video you want, e.g. *"make a 30-second history of the bicycle in the cut-paper style"*. The agent picks the skill from its description. To call it by name:

| agent | by name | reload without restarting |
|---|---|---|
| OpenCode | `@animate-visual-motion`, or let the `skill` tool load it | — |
| Codex CLI | `$animate-visual-motion`, or pick it from `/skills` | picked up automatically; restart if it doesn't appear |
| Gemini CLI | the model activates it (you confirm) | `/skills reload` |
| Cursor | `/animate-visual-motion` in Agent chat | restart Cursor |
| Copilot | `/animate-visual-motion` | CLI: `/skills reload` |
| Windsurf | `/animate-visual-motion` | — |
| Amp | automatic only | start a new thread |
| goose | `/skills animate-visual-motion` (CLI) | start a new session |

---

## What differs from Claude Code

The workflow, tools and output are the same. Three things depend on what your agent offers, and the skill handles each one:

| feature | with the agent feature | without it |
|---|---|---|
| **Questions with options** (intake and the three check-ins) | uses the agent's question tool (e.g. OpenCode `question`, Gemini `ask_user`, Copilot `ask_user`) | asks as a short numbered list with a recommended default and waits for your answer |
| **Voice-over from ElevenLabs** | uses an ElevenLabs MCP server or tool, if you've connected one to your agent | use your own recording (one file per line), or `voice.mjs --scratch` for a timing voice while you build |
| **Parallel drawing for long pieces** | splits scenes across subagents (OpenCode, Codex, Gemini, Cursor, Copilot, Amp, goose) | the agent draws the same per-era files one at a time; slower, same result |

Never paste API keys into an agent chat. Set them up in the agent's own MCP or connector settings.

## Troubleshooting

| problem | fix |
|---|---|
| The agent doesn't find the skill | Start a new session. Make sure `<folder>/animate-visual-motion/SKILL.md` exists. Check the folder against the table above and your agent's docs. |
| The skill shows up twice | It's installed in two folders the agent reads (e.g. `~/.claude/skills` and `~/.agents/skills`). Remove one with `bash install.sh --agent <name> --uninstall`. |
| The agent can't run `node` / `ffmpeg` | Allow terminal commands in the agent's permission settings, then run `bash scripts/doctor.sh`. |
| Renders fail | See [Troubleshooting](../README.md#troubleshooting) in the main README. |
