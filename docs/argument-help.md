---
title: Argument help authoring contract
---

# 🔵⋯ Contract

Use optional `metadata["argument-help"]` when a skill's non-obvious arguments need explanation beyond the compact `argument-hint`. @use leaves ordinary prose in a titled `Argument help` row after any parser warning or Hint. A canonical lookup table instead shows only its current resolved value immediately beneath its row-axis dropdown.

The value must be a non-empty string. Missing, blank, whitespace-only, and non-string values do not show an Argument help row. Top-level `docs` is generic metadata and is never an alias or fallback.

# 🔵⋯ Authoring

Use a YAML `|-` block. Name exact argument identifiers in `argument-hint` order. Explain meaning, relationships, consequential caveats, and opaque mappings; do not restate syntax the controls already show.

```yaml
argument-hint: "how_deeply_capable:[1 | 13] family:[claude | codex]"
metadata:
  argument-help: |-
    family — Selects the model family used for capability and effort mappings.
```

The form supplies the `Argument help` label. Omit that heading from the value. Omit obvious arguments, and omit the key instead of writing an empty block. Do not claim a default the form does not select.

# 🔵⋯ Dense reference tables

Keep matrix-like material as a manually space-aligned Markdown pipe table in `SKILL.md`. Immediately before the table, bind its exact output and axes as `<output> — <row argument> × <column argument>`. Alignment improves source readability but carries no semantics, so every row descriptor and output label must remain understandable when shown alone.

A canonical lookup has:

- a plain title line shaped exactly `<output> — <row argument> × <column argument>`
- one header row
- one immediately following delimiter row
- one or more data rows
- leading and trailing pipes on every row
- the same cell count on every row
- delimiter cells containing three or more hyphens only
- plain single-line cells without pipes, bold, backticks, or links
- exact generated dropdown identifiers for both axes
- every column-axis option in the header exactly once
- every row-axis option as `<row value> — <descriptor>` exactly once

```yaml
metadata:
  argument-help: |-
    model — how_deeply_capable × family
    | how_deeply_capable | claude | codex        |
    | ------------------ | ------ | ------------ |
    | 1 — barely         | haiku  | gpt-5.6-luna |
    | 13 — deeply        | opus   | gpt-5.6-sol  |
```

# 🔵⋯ Contextual resolution

For each canonical lookup, @use:

1. binds the named axes to exact generated dropdowns
2. requires both complete option sets exactly once
3. matches the current row and column values exactly
4. renders `<descriptor> — <output>: <matched cell>` in one untitled native description immediately below the row-axis dropdown
5. re-resolves when either bound dropdown changes without changing the submitted values

For the example above, `how_deeply_capable=1` and `family=claude` shows `barely — model: haiku` beneath `how_deeply_capable`.

Malformed or unsupported table markup remains ordinary Argument help prose. A structurally valid lookup with missing, duplicate, extra, ambiguous, or non-matching dropdown bindings produces no contextual row. @use never partially binds, guesses, implements a `docs` fallback, or renders general Markdown.
