# Memakai animate-visual-motion di coding agent lain

🇬🇧 [English](OTHER-AGENTS.md) · ← [kembali ke README](../README.id.md)

Skill ini mengikuti format terbuka **Agent Skills**: satu folder berisi `SKILL.md` (dengan frontmatter `name` dan `description`) plus file pendukungnya. Tools-nya berupa script Node biasa. Jadi agent apa pun yang bisa memuat folder skill dan menjalankan perintah terminal bisa membuat video dengan skill ini: OpenCode, Codex CLI, Gemini CLI, Cursor, GitHub Copilot, Windsurf, Amp, goose, dan lainnya.

> Lokasi folder di bawah diambil dari dokumentasi resmi skills masing-masing agent per **November 2026**. Agent bisa mengubahnya sewaktu-waktu. Kalau ada path yang tidak berfungsi, cek link dokumentasinya, lalu [buka issue](https://github.com/frapay/animate-visual-motion/issues).

---

## 1. Pasang toolchain render (untuk semua agent)

Sama seperti untuk Claude Code: Node 18+, Playwright + Chromium, dan ffmpeg. Lihat [Prasyarat](../README.id.md#prasyarat), lalu cek:

```bash
bash scripts/doctor.sh
```

## 2. Pasang skill-nya

### Cara termudah: satu folder bersama

Sebagian besar agent juga membaca folder bersama **`~/.agents/skills/`** (atau `.agents/skills/` di dalam proyek). Memasang di sana sekaligus mencakup Codex, Gemini CLI, Cursor, Copilot, Windsurf, Amp, goose, dan OpenCode:

```bash
git clone https://github.com/frapay/animate-visual-motion.git
cd animate-visual-motion
bash install.sh --agent agents              # → ~/.agents/skills/animate-visual-motion
bash install.sh --agent agents --project    # → ./.agents/skills/animate-visual-motion (jalankan di dalam proyekmu)
```

### Atau: folder khusus agent

```bash
bash install.sh --agent opencode     # atau codex, gemini, cursor, copilot, windsurf, amp, goose
bash install.sh --list               # tampilkan semua folder yang dikenal script
```

| agent | `--agent` | folder pribadi | folder proyek | juga membaca | dokumentasi |
|---|---|---|---|---|---|
| **OpenCode** | `opencode` | `~/.config/opencode/skills/` | `.opencode/skills/` | `~/.claude/skills`, `~/.agents/skills`, `.claude/skills`, `.agents/skills` | [opencode.ai/docs/skills](https://opencode.ai/docs/skills) |
| **Codex CLI** | `codex` | `~/.agents/skills/` | `.agents/skills/` | — | [learn.chatgpt.com/docs/build-skills](https://learn.chatgpt.com/docs/build-skills) |
| **Gemini CLI** | `gemini` | `~/.gemini/skills/` | `.gemini/skills/` | `~/.agents/skills`, `.agents/skills` | [geminicli.com/docs/cli/skills](https://geminicli.com/docs/cli/skills/) |
| **Cursor** | `cursor` | `~/.cursor/skills/` | `.cursor/skills/` | folder skill `.agents`, `.claude`, `.codex` | [cursor.com/docs/context/skills](https://cursor.com/docs/context/skills) |
| **GitHub Copilot** (CLI + VS Code) | `copilot` | `~/.copilot/skills/` | `.github/skills/` | `~/.agents/skills`, `.claude/skills`, `.agents/skills` | [docs.github.com](https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/add-skills) · [VS Code](https://code.visualstudio.com/docs/copilot/customization/agent-skills) |
| **Windsurf / Devin Desktop** | `windsurf` | `~/.config/devin/skills/` | `.devin/skills/` (lama: `.windsurf/skills/`) | `~/.agents/skills`, `.agents/skills` | [docs.devin.ai](https://docs.devin.ai/desktop/cascade/skills) |
| **Amp** | `amp` | `~/.config/amp/skills/` | `.agents/skills/` | `~/.agents/skills`, `~/.config/agents/skills`, `~/.claude/skills`, `.claude/skills` | [ampcode.com/docs/customize/skills](https://ampcode.com/docs/customize/skills) |
| **goose** | `goose` | `~/.agents/skills/` | `.agents/skills/` | `.goose/skills`, `.claude/skills`, `~/.claude/skills` | [goose-docs.ai](https://goose-docs.ai/docs/guides/context-engineering/using-skills) |

**Pasang di satu tempat saja.** Beberapa agent membaca lebih dari satu folder. OpenCode, Cursor, Copilot, Amp, dan goose membaca `~/.claude/skills` sekaligus `~/.agents/skills`, jadi kalau ada salinan di keduanya, skill bisa muncul dua kali. Kalau kamu memakai Claude Code *dan* agent lain, biasanya cukup pasang di `~/.claude/skills` (default) atau di `~/.agents/skills` saja. Lihat kolom "juga membaca".

### Windows (PowerShell), tanpa script

```powershell
git clone https://github.com/frapay/animate-visual-motion.git
$src = "animate-visual-motion\plugins\animate-visual-motion\skills\animate-visual-motion"
$dst = "$env:USERPROFILE\.agents\skills"          # atau folder khusus agent dari tabel
New-Item -ItemType Directory -Force $dst | Out-Null
Copy-Item -Recurse $src $dst
```

## 3. Memanggil skill

Buka **sesi baru** setelah instalasi, karena kebanyakan agent memindai skill saat mulai. Lalu tulis video yang kamu mau, misalnya *"buatkan video 30 detik sejarah sepeda dengan gaya cut paper"*. Agent akan memilih skill ini berdasarkan deskripsinya. Untuk memanggil dengan nama:

| agent | panggil dengan nama | muat ulang tanpa restart |
|---|---|---|
| OpenCode | `@animate-visual-motion`, atau biarkan tool `skill` yang memuatnya | — |
| Codex CLI | `$animate-visual-motion`, atau pilih dari `/skills` | otomatis; restart kalau tidak muncul |
| Gemini CLI | model mengaktifkannya (kamu yang konfirmasi) | `/skills reload` |
| Cursor | `/animate-visual-motion` di Agent chat | restart Cursor |
| Copilot | `/animate-visual-motion` | CLI: `/skills reload` |
| Windsurf | `/animate-visual-motion` | — |
| Amp | otomatis saja | buka thread baru |
| goose | `/skills animate-visual-motion` (CLI) | buka sesi baru |

---

## Bedanya dengan Claude Code

Alur kerja, tools, dan hasilnya sama. Ada tiga hal yang bergantung pada fitur agent, dan skill ini sudah menangani ketiganya:

| fitur | kalau agent punya | kalau tidak |
|---|---|---|
| **Pertanyaan dengan pilihan** (intake dan tiga check-in) | memakai tool pertanyaan milik agent (mis. OpenCode `question`, Gemini `ask_user`, Copilot `ask_user`) | bertanya dalam bentuk daftar bernomor dengan opsi yang disarankan, lalu menunggu jawabanmu |
| **Voice-over ElevenLabs** | memakai MCP server atau tool ElevenLabs, kalau sudah kamu sambungkan ke agent | pakai rekaman suara sendiri (satu file per baris), atau `voice.mjs --scratch` sebagai suara penanda waktu selama pengerjaan |
| **Menggambar paralel untuk video panjang** | membagi scene ke subagent (OpenCode, Codex, Gemini, Cursor, Copilot, Amp, goose) | agent mengerjakan file per era satu per satu; lebih lambat, hasilnya sama |

Jangan pernah menempelkan API key di chat agent. Atur lewat pengaturan MCP atau connector milik agent itu.

## Kalau ada masalah

| masalah | solusi |
|---|---|
| Agent tidak menemukan skill | Buka sesi baru. Pastikan `<folder>/animate-visual-motion/SKILL.md` ada. Cocokkan foldernya dengan tabel di atas dan dokumentasi agent. |
| Skill muncul dua kali | Skill terpasang di dua folder yang dibaca agent (mis. `~/.claude/skills` dan `~/.agents/skills`). Hapus salah satunya dengan `bash install.sh --agent <nama> --uninstall`. |
| Agent tidak bisa menjalankan `node` / `ffmpeg` | Izinkan perintah terminal di pengaturan izin agent, lalu jalankan `bash scripts/doctor.sh`. |
| Render gagal | Lihat bagian [Kalau ada masalah](../README.id.md#kalau-ada-masalah) di README utama. |
