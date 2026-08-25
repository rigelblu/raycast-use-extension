---
title: Changelog
---

# 🔵⋯ [Unreleased]
(nothing yet)

---

# 🔵⋯ v0.20.1 (2026-08-25)
## 🟠⋯ Added for End Users
- 2026-08-25 - feat (user need) | explain an argument with a trailing note without breaking the form (#use-63)

---

# 🔵⋯ v0.20.0 (2026-08-25)
## 🟠⋯ Fixed for End Users
- 2026-08-25 - fix (user need) | keep alternatives inside a required placeholder together instead of splitting them into nonsense controls (#use-63)

---

# 🔵⋯ v0.19.1 (2026-08-23)
## 🟠⋯ Fixed
- 2026-08-23 - fix (user need) | skill list no longer runs out of memory when several agents share one skill folder — each folder is now read once instead of once per agent. Completes the 2026-05-25 fix below, which deduped the list but left the reads unbounded

---

# 🔵⋯ v0.19.0 (2026-06-29)
## 🟠⋯ Added
- 2026-06-29 - feat (user need) | Codex Desktop App paste target uses rich skill links (`[$skill](/path/SKILL.md) "args"`)
- 2026-05-23 - feat (design user need) | Antigravity agent support (~/.gemini/antigravity/skills/)
- 2026-05-16 - ux (design user need) | sticky target agent override for paste actions
- 2026-05-16 - ux (design user need) | command-enter paste-now shortcut from the skill list
- 2026-05-18 - feat (design user need) | change selected agent within the argument form
- 2026-05-18 - config (design user need) | customizable direct execution frontmatter property via preferences
- 2026-05-18 - doc (ux) | document Raycast native accessory limitation for Esc-back agent sync

## 🟠⋯ Fixed
- 2026-05-25 - fix (user need) | skill list no longer crashes (out of memory) when agent skill dirs symlink to one shared folder — skills are deduped by real path
- 2026-05-17 - fix | changing agent of skill form doesn't persist it to skill search after pasting action
- 2026-05-16 - fix (ux) | search-list agent changes now carry into the argument form
- 2026-05-16 - fix (ux) | manual agent filter selection now persists over default preference
- 2026-05-16 - fix (ux) | argument form `cmd+enter` action now correctly uses paste prefix and formatting
- 2026-05-16 - fix (technical) | prevent crashes on missing agent icons with fallback logic
- 2026-05-13 - fix (ux) | agent filter selection persists across extension reopens and agent renames
- 2026-05-13 - fix (technical) | reliable paste completion in active apps

## 🟠⋯ Improved
- 2026-05-16 - ux (design) | sort direct execution skills to the top of the skill list
- 2026-05-13 - ux (design) | refined custom-project preferences with visual field pairing
- 2026-05-11 - doc (convo technical) | refactor changelog to new blue-and-orange convention

---

# 🔵⋯ v0.18.0
## 🟠⋯ Added
- 2026-05-12 - feat (design user need) | set up to 5 custom project skill paths via preferences

## 🟠⋯ Breaking
- 2026-05-12 - config (breaking) | renamed `customAgentName` and `customAgentPath` to `customProjectName1` and `customProjectPath1`. Existing users must re-enter their custom path in preferences.

---

# 🔵⋯ v0.17.1
## 🟠⋯ Improved
- 2026-05-11 - config (fix technical) | satisfy Raycast store validation for author handle and preference titles
- 2026-05-11 - config (fix technical) | eslint 8 compatibility and legacy config for stable linting
- 2026-05-11 - doc (fix ux) | action title case compliance per Raycast UI guidelines
- 2026-05-11 - doc (design technical) | generate 6 store screenshots with platform padding

---

# 🔵⋯ v0.17.0
## 🟠⋯ Added
- 2026-05-11 - feat (design user need) | pi agent support (~/.pi/skills/)

---

# 🔵⋯ v0.16.0
## 🟠⋯ Added
- 2026-03-22 - feat (design user need) | github copilot support (~/.copilot/skills/)
- 2026-03-22 - feat (design user need) | kilo code support (~/.kilocode/skills/)

## 🟠⋯ Improved
- 2026-03-22 - doc (convo technical) | jules, devin, cursor agent evaluation

---

# 🔵⋯ v0.15.0
## 🟠⋯ Added
- 2026-03-22 - feat (design user need) | factory droid support (~/.factory/skills/)
- 2026-03-22 - feat (design user need) | opencode support (~/.config/opencode/skills/)

---

# 🔵⋯ v0.14.0
## 🟠⋯ Added
- 2026-03-22 - feat (design user need) | required/optional argument validation syntax
- 2026-03-22 - feat (design user need) | display extra properties in argument form
- 2026-03-22 - feat (design user need) | persist agent filter selection via localstorage
- 2026-03-22 - feat (design user need) | show shared-path skills under all scanning agents

## 🟠⋯ Fixed
- 2026-03-22 - fix (ux) | target active app by closing window before paste
- 2026-03-22 - fix (technical) | escape backslashes in quoted arguments
- 2026-03-22 - fix (ux) | fallback to text field for low-option dropdown hints
- 2026-03-22 - fix (technical) | escape backticks in skill name invocations
- 2026-03-22 - fix (technical) | case-insensitive frontmatter key matching
- 2026-03-22 - fix (technical) | subcommand keywords pasted unquoted
- 2026-03-22 - fix (ux) | pop navigation before paste in detail view prompt action
- 2026-03-22 - fix (ux) | localstorage no longer overrides defaultAgent preference
- 2026-03-22 - fix (technical) | theme-aware brand color for warp

---

# 🔵⋯ v0.13.4
## 🟠⋯ Fixed
- 2026-03-10 - fix (technical) | deduplicate shared-path skills
- 2026-03-10 - fix (technical) | escape double quotes in argument values
- 2026-03-10 - fix (technical) | clamp bracket depth in argument parser
- 2026-03-10 - fix (technical) | reject skills with empty name or description
- 2026-03-10 - fix (technical) | surface filesystem scan errors to logs
- 2026-03-10 - fix (technical) | non-greedy regex in warp argument parser
- 2026-03-10 - fix (technical) | detect codex built-in skills for filter

## 🟠⋯ Improved
- 2026-03-10 - doc (ux) | show argument hint without quotes in preview

---

# 🔵⋯ v0.13.3
## 🟠⋯ Fixed
- 2026-03-04 - fix (ux) | pop to root before paste to prevent stale navigation

---

# 🔵⋯ v0.13.2
## 🟠⋯ Added
- 2026-03-04 - feat (design user need) | tab key selects current skill in list view

---

# 🔵⋯ v0.13.1
## 🟠⋯ Fixed
- 2026-03-04 - fix (ux) | changed argument form paste shortcut to avoid raycast conflict

---

# 🔵⋯ v0.13.0
## 🟠⋯ Added
- 2026-03-04 - feat (design user need) | paste skill body as prompt (Cmd+Shift+V)

---

# 🔵⋯ v0.12.0
## 🟠⋯ Added
- 2026-03-03 - feat (design user need) | per-agent paste prefix and invocation format

## 🟠⋯ Removed
- 2026-03-03 - feat (chore technical) | removed global pastePrefix preference

---

# 🔵⋯ v0.11.2
## 🟠⋯ Fixed
- 2026-02-27 - fix (ux) | changed open preferences shortcut to avoid raycast conflict

---

# 🔵⋯ v0.11.0
## 🟠⋯ Added
- 2026-02-27 - feat (design user need) | amp support (~/.agents/skills/)

---

# 🔵⋯ v0.10.2
## 🟠⋯ Added
- 2026-02-27 - feat (design user need) | paste arguments only (Cmd+Shift+P)

---

# 🔵⋯ v0.10.1
## 🟠⋯ Added
- 2026-02-27 - feat (design user need) | paste with prefix (Cmd+P)

---

# 🔵⋯ v0.10.0
## 🟠⋯ Added
- 2026-02-27 - feat (design user need) | custom agent support via preferences

---

# 🔵⋯ v0.9.6
## 🟠⋯ Added
- 2026-02-27 - feat (design user need) | default agent filter preference

---

# 🔵⋯ v0.9.5
## 🟠⋯ Added
- 2026-02-27 - feat (design user need) | custom argument hint key and direct execution prefix preferences
- 2026-02-27 - feat (design user need) | open preferences action (Cmd+;)

## 🟠⋯ Improved
- 2026-02-27 - feat (chore technical) | settings cleanup: removed path and enable/disable fields

---

# 🔵⋯ v0.9.4
## 🟠⋯ Improved
- 2026-02-27 - doc (design ux) | detail view accent styling for paste preview

---

# 🔵⋯ v0.9.3
## 🟠⋯ Improved
- 2026-02-27 - doc (fix ux) | hide redundant hint text in argument form

---

# 🔵⋯ v0.9.2
## 🟠⋯ Improved
- 2026-02-27 - doc (design ux) | renamed preview label to paste into agent

---

# 🔵⋯ v0.9.1
## 🟠⋯ Fixed
- 2026-02-25 - fix (technical) | subcommand alternatives with conditional arguments

---

# 🔵⋯ v0.9.0
## 🟠⋯ Improved
- 2026-02-25 - doc (design ux) | custom extension icon
- 2026-02-25 - doc (design ux) | command title updated to Use Agent Skill

---

# 🔵⋯ v0.8.x
## 🟠⋯ Added
- 2026-02-17 - feat (design user need) | warp support (~/.warp/workflows/)
- 2026-02-17 - feat (design technical) | warp workflow parser and argument hint derivation

---

# 🔵⋯ v0.7.x
## 🟠⋯ Improved
- 2026-02-17 - doc (convo technical) | amp support skipped (no local skill storage)

---

# 🔵⋯ v0.6.x
## 🟠⋯ Added
- 2026-02-17 - feat (design user need) | agent enable/disable checkboxes
- 2026-02-17 - feat (design user need) | hide cmd- prefix from skill names
- 2026-02-17 - feat (design user need) | filter by execution type (direct vs model)

## 🟠⋯ Improved
- 2026-02-17 - doc (design ux) | command subtitle updated to Agent Skills

---

# 🔵⋯ v0.5.x
## 🟠⋯ Added
- 2026-02-17 - feat (design user need) | agent source filter dropdown

---

# 🔵⋯ v0.4.x
## 🟠⋯ Added
- 2026-02-17 - feat (design user need) | codex support (~/.codex/skills/)

---

# 🔵⋯ v0.3.x
## 🟠⋯ Added
- 2026-02-17 - feat (design user need) | claude code support (~/.claude/skills/)
- 2026-02-17 - feat (design technical) | multi-source architecture with parallel loading

## 🟠⋯ Improved
- 2026-02-17 - feat (refactor technical) | simplified skill loading with recursive support
- 2026-02-17 - feat (refactor technical) | alphabetical skill sorting by name and source

---

# 🔵⋯ v0.2.x
## 🟠⋯ Added
- 2026-02-17 - feat (design user need) | smart argument dropdowns for bracket patterns
- 2026-02-17 - feat (design user need) | open skill file action (Cmd+O)
- 2026-02-17 - feat (design user need) | copy as slash command action (Cmd+/)

---

# 🔵⋯ v0.1.x
## 🟠⋯ Added
- 2026-02-17 - feat (design user need) | paste directly to active app (Enter)
- 2026-02-17 - feat (design user need) | argument form with live paste preview
- 2026-02-17 - feat (design user need) | list layout showing skill name and hint
- 2026-02-17 - feat (design user need) | side panel detail view (Cmd+D)

## 🟠⋯ Improved
- 2026-02-17 - doc (ux) | agent-agnostic error messaging

---

# 🔵⋯ v0.0.1
## 🟠⋯ Added
- 2026-02-10 - feat (design user need) | initial release with gemini skill search
