import test from "node:test";
import assert from "node:assert/strict";
import { parseArgumentHint, warningForArgumentHint } from "../src/lib/argument-hints";

test("parses labeled dropdown hints", () => {
  const result = parseArgumentHint("mode:[new | append]");

  assert.equal(result.mode, "fields");
  assert.equal(result.assessment, "clean");
  assert.deepEqual(result.fields, [
    {
      id: "arg-0",
      label: "mode",
      kind: "dropdown",
      options: ["new", "append"],
      raw: "[new | append]",
    },
  ]);
});

test("parses adjacent label prefixes as one field", () => {
  const result = parseArgumentHint("files<default:@src>");

  assert.equal(result.mode, "fields");
  assert.equal(result.assessment, "clean");
  assert.deepEqual(result.fields, [
    {
      id: "arg-0",
      label: "files",
      kind: "text",
      raw: "<default:@src>",
    },
  ]);
});

test("parses top-level alternatives as choices and merges duplicate choice names", () => {
  const result = parseArgumentHint("commit | commit [message]");

  assert.equal(result.mode, "choices");
  assert.equal(result.assessment, "clean");
  assert.deepEqual(result.choices, [{ name: "commit", arg: { label: "message", raw: "[message]" } }]);
});

test("marks conflicting duplicate choice arguments as unreadable", () => {
  const result = parseArgumentHint("commit [message] | commit [rev]");

  assert.equal(result.mode, "choices");
  assert.equal(result.assessment, "unreadable");
});

test("parses multi-word bare hints as separate fields", () => {
  const result = parseArgumentHint("arg1 arg2 arg3");

  assert.equal(result.mode, "fields");
  assert.equal(result.assessment, "clean");
  assert.deepEqual(
    result.fields.map((field) => field.label),
    ["arg1", "arg2", "arg3"],
  );
});

test("keeps a lone bare hint as its field label", () => {
  const result = parseArgumentHint("file");

  assert.equal(result.mode, "fields");
  assert.equal(result.assessment, "clean");
  assert.deepEqual(result.fields, [{ id: "arg-0", label: "file", kind: "text", raw: "file" }]);
});
test("falls back for unrecognized structural hints", () => {
  const result = parseArgumentHint("files:<path>, mode:[new | append]");

  assert.equal(result.mode, "fields");
  assert.equal(result.assessment, "unreadable");
});

test("marks a leaked nested group as suspect", () => {
  const result = parseArgumentHint("<type:[continue | close]> <path>");

  assert.equal(result.mode, "fields");
  assert.equal(result.assessment, "suspect");
});

test("marks unmatched structural syntax as unreadable", () => {
  const result = parseArgumentHint("<foo");

  assert.equal(result.mode, "fields");
  assert.equal(result.assessment, "unreadable");
});

test("marks an unclosed angle alternation as suspect leaked syntax", () => {
  const result = parseArgumentHint("scope:<bookmark | revision");

  assert.equal(result.mode, "fields");
  assert.equal(result.assessment, "suspect");
});

test("marks an empty top-level alternative as unreadable and warns", () => {
  const rawHint = "a || b";
  const result = parseArgumentHint(rawHint);

  assert.equal(result.mode, "choices");
  assert.equal(result.assessment, "unreadable");
  assert.deepEqual(warningForArgumentHint(rawHint, result.assessment), {
    title: "Hint partly unread",
    text: "Could not confidently match: a || b",
  });
});

test("marks an empty square group as suspect leaked label syntax", () => {
  const result = parseArgumentHint("[ | ]");

  assert.equal(result.mode, "fields");
  assert.equal(result.assessment, "suspect");
});

test("does not assess empty dropdown option values as a defect", () => {
  const result = parseArgumentHint("choice:[one || two]");

  assert.equal(result.mode, "fields");
  assert.equal(result.assessment, "clean");
  const field = result.fields[0];
  assert.equal(field.kind, "dropdown");
  if (field.kind !== "dropdown") assert.fail("expected a dropdown field");
  assert.deepEqual(field.options, ["one", "two"]);
});

test("does not assess dropdown option syntax as a defect", () => {
  const result = parseArgumentHint("target:[<rev> | #id]");

  assert.equal(result.mode, "fields");
  assert.equal(result.assessment, "clean");
});

test("keeps alternatives inside angle brackets in one field", () => {
  const result = parseArgumentHint("scope:<bookmark | revision>");

  assert.equal(result.mode, "fields");
  assert.deepEqual(result.fields, [
    {
      id: "arg-0",
      label: "scope",
      kind: "text",
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

test("removes an angle wrapper from a choice argument label", () => {
  const result = parseArgumentHint("prepare [<rev>] | commit");

  assert.equal(result.mode, "choices");
  assert.equal(result.assessment, "clean");
  assert.deepEqual(result.choices, [{ name: "prepare", arg: { label: "rev", raw: "[<rev>]" } }, { name: "commit" }]);
});
test("keeps a labeled field beside an angle-bracket alternation", () => {
  const result = parseArgumentHint("mode:[content | submit] scope:<bookmark | revision>");

  assert.equal(result.mode, "fields");
  assert.deepEqual(
    result.fields.map((field) => [field.label, field.kind]),
    [
      ["mode", "dropdown"],
      ["scope", "text"],
    ],
  );
});

test("keeps multi-word dropdown options as written", () => {
  const result = parseArgumentHint("type:[new venture | new product | refactor]");

  assert.equal(result.mode, "fields");
  const field = result.fields[0];
  assert.equal(field.kind, "dropdown");
  if (field.kind !== "dropdown") assert.fail("expected a dropdown field");
  assert.deepEqual(field.options, ["new venture", "new product", "refactor"]);
});

test("splits a trailing note off the hint", () => {
  const result = parseArgumentHint("<subdir>  # optional subpath under the tmp root");

  assert.equal(result.mode, "fields");
  assert.equal(result.assessment, "clean");
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
  const field = result.fields[0];
  assert.equal(field.kind, "dropdown");
  if (field.kind !== "dropdown") assert.fail("expected a dropdown field");
  assert.deepEqual(field.options, ["brief-path", "#id", "foundation"]);
});

test("reads a note that follows a dropdown", () => {
  const result = parseArgumentHint("[setup | location] <name>  # no mode means location");

  assert.equal(result.mode, "fields");
  assert.equal(result.annotation, "no mode means location");
  assert.equal(result.fields[0].kind, "dropdown");
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

test("builds a textual warning around the unread hint fragment", () => {
  const rawHint = "[--effort <none|minimal|high>]  # choose an effort";
  const result = parseArgumentHint(rawHint);
  const warning = warningForArgumentHint(rawHint, result.assessment);

  assert.equal(result.assessment, "suspect");
  assert.deepEqual(warning, {
    title: "Hint partly unread",
    text: "Could not confidently match: [--effort <none|minimal|high>]",
  });
});

test("does not build a warning for a clean hint", () => {
  assert.equal(warningForArgumentHint("<path>", "clean"), undefined);
});
