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

test("keeps a lone bare hint as its field label before assessment", () => {
  const result = parseArgumentHint("file");

  assert.equal(result.mode, "fields");
  assert.equal(result.recognized, false);
  assert.deepEqual(result.fields, [{ id: "arg-0", label: "file", type: "text", raw: "file" }]);
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

test("removes an angle wrapper from a choice argument label before assessment", () => {
  const result = parseArgumentHint("prepare [<rev>] | commit");

  assert.equal(result.mode, "choices");
  assert.equal(result.recognized, true);
  assert.deepEqual(result.choices, [{ name: "prepare", arg: { label: "rev", raw: "[<rev>]" } }, { name: "commit" }]);
});

test("does not recognize an unclosed angle group after the depth fix", () => {
  const result = parseArgumentHint("scope:<bookmark | revision");

  assert.equal(result.mode, "fields");
  assert.equal(result.recognized, false);
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

test("splits a trailing note off the hint", () => {
  const result = parseArgumentHint("<subdir>  # optional subpath under the tmp root");

  assert.equal(result.mode, "fields");
  assert.equal(result.recognized, true);
  assert.equal(result.annotation, "optional subpath under the tmp root");
  assert.deepEqual(
    result.fields.map((field) => field.label),
    ["subdir"],
  );
});

test("keeps a bare # value inside brackets out of the note", () => {
  const result = parseArgumentHint("target-brief:<feature-brief-path | #id> <decision>");

  assert.equal(result.mode, "fields");
  assert.equal(result.annotation, undefined);
  assert.deepEqual(
    result.fields.map((field) => field.label),
    ["target-brief", "decision"],
  );
});

test("keeps a bare # value inside a dropdown group out of the note", () => {
  const result = parseArgumentHint("[brief-path | #id | foundation] <batch>");

  assert.equal(result.mode, "fields");
  assert.equal(result.annotation, undefined);
  assert.deepEqual(result.fields[0].options, ["brief-path", "#id", "foundation"]);
});

test("reads a note that follows a dropdown", () => {
  const result = parseArgumentHint("[setup | location] <name>  # no mode means location");

  assert.equal(result.mode, "fields");
  assert.equal(result.annotation, "no mode means location");
  assert.equal(result.fields[0].type, "dropdown");
});

// Each of the next three pins one guard alone. Together the earlier #id fixtures
// pass even with a guard removed, because their `#` trips two guards at once.
test("keeps a spaced # inside brackets out of the note — depth guard alone", () => {
  const result = parseArgumentHint("<path | # id> <x>");

  assert.equal(result.annotation, undefined);
});

test("keeps an unspaced # at the top level out of the note — trailing-space guard alone", () => {
  const result = parseArgumentHint("foo #id");

  assert.equal(result.annotation, undefined);
});

test("keeps a # joined to the previous token out of the note — leading-space guard alone", () => {
  const result = parseArgumentHint("<subdir># note");

  assert.equal(result.annotation, undefined);
});

test("reads a hint that is only a note", () => {
  const result = parseArgumentHint("# the whole hint is a note");

  assert.equal(result.mode, "fields");
  assert.equal(result.annotation, "the whole hint is a note");
  assert.deepEqual(result.fields, []);
});
