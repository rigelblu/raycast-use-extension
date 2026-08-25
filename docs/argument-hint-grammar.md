# Argument hint grammar

An argument hint is a docopt-style usage line: angle brackets name a required placeholder, square
brackets enclose an optional input, and `|` marks alternatives. The extension uses that line as a
form sketch—a `name:` prefix labels the next control and a trailing `#` leaves a note in the margin.
Required and optional are cues for the reader; the rendered form does not enforce either one.

## Rules

1. `<value>` cues a required value and draws one text field.
2. `[value]` cues an optional value and draws one text field.
3. `[one | two]` draws one dropdown. Its options are preserved as written, including spaces and
   escape-hatch values such as `<custom>` or `#id`.
4. `name:<value>` and `name:[one | two]` use `name` as the field label.
5. Bare words draw text fields in source order.
6. A `|` outside every bracket group draws a command-choice dropdown. A choice may carry one
   conditional argument, such as `prepare [rev]`.
7. Repeated command choices merge by name; the version carrying an argument wins.
8. A top-level `# note` is an annotation when the `#` begins the hint or follows whitespace and is
   itself followed by whitespace. A `#` inside brackets is a value, not an annotation.
9. Empty and malformed hints never throw. If syntax leaks into a rendered label the parse is
   `suspect`; if structural text could not be matched it is `unreadable`; otherwise it is `clean`.
   Dropdown options are values and are never assessed as leaked syntax.

The required/optional distinction is intentionally not validation. Raycast renders both shapes as
editable text fields; the brackets tell the person filling the form what the author intended.

## Conformance cases

The test suite reads this block directly and binds the rule text above. Keep each rule change and its
expected form shape together. Clean examples come from installed or historically installed hints;
malformed examples are constructed because the installed corpus is clean.

<!-- argument-hint-conformance:start -->

```json
[
  {
    "rule": "angle group is one text field",
    "hint": "scope:<bookmark | revision>",
    "expected": {
      "mode": "fields",
      "fields": [{ "kind": "text", "label": "scope" }],
      "assessment": "clean"
    }
  },
  {
    "rule": "single square group is one text field",
    "hint": "[message]",
    "expected": {
      "mode": "fields",
      "fields": [{ "kind": "text", "label": "message" }],
      "assessment": "clean"
    }
  },
  {
    "rule": "square alternatives form a dropdown",
    "hint": "mode:[new venture | new product]",
    "expected": {
      "mode": "fields",
      "fields": [{ "kind": "dropdown", "label": "mode", "options": ["new venture", "new product"] }],
      "assessment": "clean"
    }
  },
  {
    "rule": "bare words preserve order",
    "hint": "source destination",
    "expected": {
      "mode": "fields",
      "fields": [
        { "kind": "text", "label": "source" },
        { "kind": "text", "label": "destination" }
      ],
      "assessment": "clean"
    }
  },
  {
    "rule": "top-level alternatives form choices",
    "hint": "prepare [<rev>] | commit | update <rev>",
    "expected": {
      "mode": "choices",
      "choices": [
        { "name": "prepare", "argLabel": "rev" },
        { "name": "commit" },
        { "name": "update", "argLabel": "rev" }
      ],
      "assessment": "clean"
    }
  },
  {
    "rule": "duplicate choices merge",
    "hint": "commit | commit [message]",
    "expected": {
      "mode": "choices",
      "choices": [{ "name": "commit", "argLabel": "message" }],
      "assessment": "clean"
    }
  },
  {
    "rule": "annotation is separate from fields",
    "hint": "<subdir>  # optional subpath",
    "expected": {
      "mode": "fields",
      "fields": [{ "kind": "text", "label": "subdir" }],
      "assessment": "clean",
      "annotation": "optional subpath"
    }
  },
  {
    "rule": "hash inside a dropdown is a value",
    "hint": "target:[brief | #id | <custom>]",
    "expected": {
      "mode": "fields",
      "fields": [{ "kind": "dropdown", "label": "target", "options": ["brief", "#id", "<custom>"] }],
      "assessment": "clean"
    }
  },
  {
    "rule": "leaked label syntax is suspect",
    "hint": "[--effort <none|minimal|high>]",
    "expected": {
      "mode": "fields",
      "fields": [
        {
          "kind": "dropdown",
          "label": "--effort <none",
          "options": ["--effort <none", "minimal", "high>"]
        }
      ],
      "assessment": "suspect"
    }
  },
  {
    "rule": "unmatched structural text is unreadable",
    "hint": "<foo",
    "expected": {
      "mode": "fields",
      "fields": [{ "kind": "text", "label": "input" }],
      "assessment": "unreadable"
    }
  }
]
```

<!-- argument-hint-conformance:end -->
