import test from "node:test";
import assert from "node:assert/strict";
import type { ParsedField } from "../src/lib/argument-hints";
import { buildArgumentFormRows } from "../src/lib/argument-form-rows";
import { buildArgumentFormTailRows } from "../src/lib/argument-form-tail";

const WARNING = { title: "Hint partly unread", text: "Could not confidently read the hint." };
const FIELDS: ParsedField[] = [
  { id: "arg-0", label: "depth", kind: "dropdown", options: ["1", "5"], raw: "[1 | 5]" },
  { id: "arg-1", label: "family", kind: "dropdown", options: ["claude", "codex"], raw: "[claude | codex]" },
];

test("orders each untitled contextual value immediately after its owning field", () => {
  assert.deepEqual(buildArgumentFormRows(FIELDS, [{ fieldId: "arg-0", text: "barely — model: haiku" }]), [
    { kind: "field", field: FIELDS[0], fieldIndex: 0 },
    { kind: "contextual-help", fieldId: "arg-0", helpIndex: 0, text: "barely — model: haiku" },
    { kind: "field", field: FIELDS[1], fieldIndex: 1 },
  ]);
});

test("keeps the field row tree unchanged when no contextual value resolves", () => {
  assert.deepEqual(
    buildArgumentFormRows(FIELDS, []),
    FIELDS.map((field, fieldIndex) => ({ kind: "field", field, fieldIndex })),
  );
});

test("builds warning, Hint, Argument help, separator, and Paste in order", () => {
  assert.deepEqual(
    buildArgumentFormTailRows({
      warning: WARNING,
      hint: "Choose a mode.",
      argumentHelp: "mode — Determines how the skill runs.",
      pasteContent: "$skill fast",
    }),
    [
      { kind: "description", ...WARNING },
      { kind: "description", title: "Hint", text: "Choose a mode." },
      { kind: "description", title: "Argument help", text: "mode — Determines how the skill runs." },
      { kind: "separator" },
      { kind: "description", title: "Paste into agent", text: "$skill fast" },
    ],
  );
});

test("omits absent help without leaving a row or gap", () => {
  const withHelp = buildArgumentFormTailRows({
    warning: WARNING,
    hint: "Choose a mode.",
    argumentHelp: "mode — Determines how the skill runs.",
    pasteContent: "$skill fast",
  });
  const withoutHelp = buildArgumentFormTailRows({
    warning: WARNING,
    hint: "Choose a mode.",
    pasteContent: "$skill fast",
  });

  assert.deepEqual(
    withoutHelp,
    withHelp.filter((row) => row.kind !== "description" || row.title !== "Argument help"),
  );
  assert.deepEqual(buildArgumentFormTailRows({ pasteContent: "$skill" }), [
    { kind: "separator" },
    { kind: "description", title: "Paste into agent", text: "$skill" },
  ]);
});
