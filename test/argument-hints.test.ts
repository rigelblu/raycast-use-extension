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
