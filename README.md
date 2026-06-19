---
title: Use Agent Skill
---

Search and use agent skills from Antigravity, Gemini, Claude Code, Codex, Amp, Warp, Factory Droid, OpenCode, GitHub Copilot, Kilo Code, Pi, and any custom agent — all from Raycast.

# 🔵⋯ Supported Agents
Built-in agents are scanned automatically. All agents use the **YAML frontmatter in Markdown** format.

| Agent               | Skill location                                                                            |
| :------------------ | :---------------------------------------------------------------------------------------- |
| Amp                 | `~/.agents/skills/*/SKILL.md`                                                             |
| Antigravity         | `~/.gemini/antigravity/skills/*/SKILL.md`, `~/.agents/skills/*/SKILL.md`                  |
| Codex               | `~/.codex/skills/*/SKILL.md`, `~/.codex/vendor_imports/skills/skills/.curated/*/SKILL.md` |
| Claude Code         | `~/.claude/skills/*/SKILL.md`                                                             |
| Droid               | `~/.factory/skills/*/SKILL.md`                                                            |
| Gemini CLI          | `~/.gemini/skills/*/SKILL.md`, `~/.agents/skills/*/SKILL.md`                              |
| GitHub Copilot      | `~/.copilot/skills/*/SKILL.md`                                                            |
| Kilo Code           | `~/.kilocode/skills/*/SKILL.md`                                                           |
| OpenCode            | `~/.config/opencode/skills/*/SKILL.md`, `~/.agents/skills/*/SKILL.md`                     |
| Warp                | `~/.agents/skills/*/SKILL.md`, `~/.warp/skills/*/SKILL.md`                                |
| Pi                  | `~/.pi/agent/skills/*/SKILL.md`, `~/.agents/skills/*/SKILL.md`                            |
| :------------------ | :---------------------------------------------------------------------------------------- |
| Custom Agent        | Any path you configure                                                                    |
| Custom Projects 1–5 | Any path you configure                                                                    |

Built-in supported agents are scanned automatically. Agents without a valid directory are silently skipped. Skills from shared paths (e.g., `~/.agents/skills/`) appear under each agent that scans the path.

The agent filter persists between uses. Set a default agent in preferences to choose the initial filter before you manually change it.
Changing the target agent in the argument form persists for future paste actions until you reset it.

# 🔵⋯ Usage
| Action                | Shortcut | Description                                                                        |
| :-------------------- | :------- | :--------------------------------------------------------------------------------- |
| Paste skill           | `Enter`  | Pastes skills without arguments; opens the argument form when arguments are needed |
| Paste now             | `⌘Enter` | List action that immediately pastes the selected skill invocation                  |
| Fill & Paste          | `Tab`    | Opens the argument form for skills with argument hints                             |
| Paste without prefix  | `⌘⇧P`    | List action for skills without arguments                                           |
| Paste arguments only  | `⌘⇧P`    | Argument-form action that pastes only filled argument values                       |
| Paste without prefix  | `⌘⌥P`    | Argument-form action that pastes the invocation without the agent prefix           |
| Paste filled prompt   | `⌘⇧V`    | Argument-form action that substitutes form values into the skill body              |
| Paste as prompt       |          | Pastes the original skill body unchanged                                           |
| Copy name             | `⌘C`     | Copies skill name without argument hints                                           |
| Copy with arguments   | `⌘⇧C`    | Copies `skill-name <args>` to clipboard                                            |
| Copy as slash command | `⌘/`     | Copies `/skill-name <args>`                                                        |
| Show detail           | `⌘D`     | Opens a detail view with full skill metadata                                       |
| Reset target agent    |          | Clears the manually selected paste target and returns to each skill's source agent |
| Open skill file       | `⌘O`     | Opens the SKILL.md file in your default editor                                     |
| Open preferences      | `⌘;`     | Opens extension preferences                                                        |

# 🔵⋯ Argument Form
Skills with argument hints automatically show a guided form when you press `Enter`:

# 🔵⋯ Limitations
- Changing agent on the skill form doesn't persist to skill search view (when using ESC-go back)
- `<arg>` — optional text field
- `arg:[option1 | option2]` — dropdown with predefined options
- Top-level choices (e.g., `commit | commit [message]`) render as a choice dropdown with conditional fields
- All other hints show a free-form text field

When a skill has a body, the argument form also offers `Paste Filled Prompt`. It replaces `$ARGUMENTS`
with all form values joined by spaces, and `$1`, `$2`, `$3`, etc. with positional form values. Empty
fields remain visible as placeholders like `<topic>` in the pasted prompt.

# 🔵⋯ Preferences
| Setting                   | Default                    | Description                                                   |
| :------------------------ | :------------------------- | :------------------------------------------------------------ |
| Default Agent             | All                        | Agent source pre-selected when opening the command            |
| Argument Hint Key         | `argument-hint`            | Frontmatter key used for argument hints                       |
| Direct Exec Prefix        | `@!`                       | Prefix shown before direct-execution skills                   |
| Direct Execution Property | `disable-model-invocation` | Frontmatter property that identifies a direct execution skill |
| Project 1 Skills (Name)   | _(empty)_                  | Display name (shown in filter and tag)                        |
| _(Path)_                  | _(empty)_                  | Folder to scan for SKILL.md files                             |
| Project 2–5 …             | _(empty)_                  | Same Name (titled) + Path (untitled) pair                     |
