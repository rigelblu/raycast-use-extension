import test from "node:test";
import assert from "node:assert/strict";
import { parseArgumentHint } from "../src/lib/argument-hints";

test("parses labeled dropdown hints", () => {
  const result = parseArgumentHint("mode:[new | append]");

  assert.equal(result.mode, "fields");
  assert.equal(result.recognized, true);
  assert.deepEqual(result.fields, [
    {
      id: "arg-0",
      label: "mode",
      type: "dropdown",
      options: ["new", "append"],
      raw: "[new | append]",
    },
  ]);
});

test("parses adjacent label prefixes as one field", () => {
  const result = parseArgumentHint("files<default:@src>");

  assert.equal(result.mode, "fields");
  assert.equal(result.recognized, true);
  assert.deepEqual(result.fields, [
    {
      id: "arg-0",
      label: "files",
      type: "text",
      raw: "<default:@src>",
    },
  ]);
});

test("parses top-level alternatives as choices and merges duplicate choice names", () => {
  const result = parseArgumentHint("commit | commit [message]");

  assert.equal(result.mode, "choices");
  assert.equal(result.recognized, true);
  assert.deepEqual(result.choices, [{ name: "commit", arg: { label: "message", raw: "[message]" } }]);
});

test("parses multi-word bare hints as separate fields", () => {
  const result = parseArgumentHint("arg1 arg2 arg3");

  assert.equal(result.mode, "fields");
  assert.equal(result.recognized, true);
  assert.deepEqual(
    result.fields.map((field) => field.label),
    ["arg1", "arg2", "arg3"],
  );
});

test("falls back for unrecognized structural hints", () => {
  const result = parseArgumentHint("files:<path>, mode:[new | append]");

  assert.equal(result.mode, "fields");
  assert.equal(result.recognized, false);
});

test("keeps alternatives inside angle brackets in one field", () => {
  const result = parseArgumentHint("scope:<bookmark | revision>");

  assert.equal(result.mode, "fields");
  assert.deepEqual(result.fields, [
    {
      id: "arg-0",
      label: "scope",
      type: "text",
      raw: "<bookmark | revision>",
    },
  ]);
});

test("still splits top-level alternatives when a segment holds angle brackets", () => {
  const result = parseArgumentHint("commit <rev> | bookmark <name> | abandon-empty");

  assert.equal(result.mode, "choices");
  assert.deepEqual(
    result.choices.map((choice) => choice.name),
    ["commit", "bookmark", "abandon-empty"],
  );
});

test("keeps a labeled field beside an angle-bracket alternation", () => {
  const result = parseArgumentHint("mode:[content | submit] scope:<bookmark | revision>");

  assert.equal(result.mode, "fields");
  assert.deepEqual(
    result.fields.map((field) => [field.label, field.type]),
    [
      ["mode", "dropdown"],
      ["scope", "text"],
    ],
  );
});

test("keeps multi-word dropdown options as written", () => {
  const result = parseArgumentHint("type:[new venture | new product | refactor]");

  assert.equal(result.mode, "fields");
  assert.deepEqual(result.fields[0].options, ["new venture", "new product", "refactor"]);
});
