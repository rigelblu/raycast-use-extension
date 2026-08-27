import test from "node:test";
import assert from "node:assert/strict";
import type { ParsedField } from "../src/lib/argument-hints";
import { parseArgumentHelp, resolveArgumentHelp } from "../src/lib/argument-help";

const FIELDS: ParsedField[] = [
  {
    id: "arg-0",
    label: "how_deeply_capable",
    kind: "dropdown",
    options: ["1", "5", "8", "13", "20"],
    raw: "[1 | 5 | 8 | 13 | 20]",
  },
  {
    id: "arg-1",
    label: "how_thorough",
    kind: "dropdown",
    options: ["1", "5", "8", "13", "20"],
    raw: "[1 | 5 | 8 | 13 | 20]",
  },
  {
    id: "arg-2",
    label: "family",
    kind: "dropdown",
    options: ["claude", "codex", "gemini"],
    raw: "[claude | codex | gemini]",
  },
];

const MODEL_TABLE = `model — how_deeply_capable × family
| how_deeply_capable    | claude | codex         | gemini           |
| --------------------- | ------ | ------------- | ---------------- |
| 1 — barely            | haiku  | gpt-5.6-luna  | Gemini 3.5 Flash |
| 5 — a bit             | sonnet | gpt-5.6-terra | Gemini 3.5 Flash |
| 8 — considerably      | opus   | gpt-5.6-terra | Gemini 3.5 Flash |
| 13 — deeply           | opus   | gpt-5.6-sol   | Gemini 3.1 Pro   |
| 20 — all the way down | fable  | gpt-5.6-sol   | Gemini 3.1 Pro   |`;

const EFFORT_TABLE = `effort — how_thorough × family
| how_thorough      | claude | codex  | gemini |
| ----------------- | ------ | ------ | ------ |
| 1 — barely        | low    | low    | Low    |
| 5 — a bit         | medium | medium | Medium |
| 8 — some          | high   | high   | High   |
| 13 — extremely    | xhigh  | xhigh  | High   |
| 20 — exhaustively | max    | ultra  | High   |`;

const MODEL_RESULTS: Record<string, Record<string, string>> = {
  "1": {
    claude: "barely — model: haiku",
    codex: "barely — model: gpt-5.6-luna",
    gemini: "barely — model: Gemini 3.5 Flash",
  },
  "5": {
    claude: "a bit — model: sonnet",
    codex: "a bit — model: gpt-5.6-terra",
    gemini: "a bit — model: Gemini 3.5 Flash",
  },
  "8": {
    claude: "considerably — model: opus",
    codex: "considerably — model: gpt-5.6-terra",
    gemini: "considerably — model: Gemini 3.5 Flash",
  },
  "13": {
    claude: "deeply — model: opus",
    codex: "deeply — model: gpt-5.6-sol",
    gemini: "deeply — model: Gemini 3.1 Pro",
  },
  "20": {
    claude: "all the way down — model: fable",
    codex: "all the way down — model: gpt-5.6-sol",
    gemini: "all the way down — model: Gemini 3.1 Pro",
  },
};

const EFFORT_RESULTS: Record<string, Record<string, string>> = {
  "1": { claude: "barely — effort: low", codex: "barely — effort: low", gemini: "barely — effort: Low" },
  "5": { claude: "a bit — effort: medium", codex: "a bit — effort: medium", gemini: "a bit — effort: Medium" },
  "8": { claude: "some — effort: high", codex: "some — effort: high", gemini: "some — effort: High" },
  "13": {
    claude: "extremely — effort: xhigh",
    codex: "extremely — effort: xhigh",
    gemini: "extremely — effort: High",
  },
  "20": {
    claude: "exhaustively — effort: max",
    codex: "exhaustively — effort: ultra",
    gemini: "exhaustively — effort: High",
  },
};

test("binds canonical lookups and preserves only remaining prose", () => {
  const parsed = parseArgumentHelp(`Before.\n\n${MODEL_TABLE}\n\nBetween.\n\n${EFFORT_TABLE}\n\nAfter.`, FIELDS);

  assert.equal(parsed.lookups.length, 2);
  assert.equal(parsed.prose, "Before.\n\nBetween.\n\nAfter.");
  assert.deepEqual(
    parsed.lookups.map(({ output, rowArgument, rowFieldId, columnArgument, columnFieldId }) => ({
      output,
      rowArgument,
      rowFieldId,
      columnArgument,
      columnFieldId,
    })),
    [
      {
        output: "model",
        rowArgument: "how_deeply_capable",
        rowFieldId: "arg-0",
        columnArgument: "family",
        columnFieldId: "arg-2",
      },
      {
        output: "effort",
        rowArgument: "how_thorough",
        rowFieldId: "arg-1",
        columnArgument: "family",
        columnFieldId: "arg-2",
      },
    ],
  );
});

test("resolves every exact row and column combination without changing submitted values", () => {
  const { lookups } = parseArgumentHelp(`${MODEL_TABLE}\n\n${EFFORT_TABLE}`, FIELDS);

  for (const family of ["claude", "codex", "gemini"]) {
    for (const row of ["1", "5", "8", "13", "20"]) {
      const values = { "arg-0": row, "arg-1": row, "arg-2": family };
      const before = { ...values };
      const resolved = resolveArgumentHelp(lookups, values);

      assert.deepEqual(
        resolved.map(({ fieldId, text }) => ({ fieldId, text })),
        [
          { fieldId: "arg-0", text: MODEL_RESULTS[row][family] },
          { fieldId: "arg-1", text: EFFORT_RESULTS[row][family] },
        ],
      );
      assert.deepEqual(values, before);
    }
  }
});

test("re-resolves shared columns and omits missing current values", () => {
  const { lookups } = parseArgumentHelp(`${MODEL_TABLE}\n\n${EFFORT_TABLE}`, FIELDS);

  assert.deepEqual(
    resolveArgumentHelp(lookups, { "arg-0": "1", "arg-1": "1", "arg-2": "claude" }).map((row) => row.text),
    ["barely — model: haiku", "barely — effort: low"],
  );
  assert.deepEqual(
    resolveArgumentHelp(lookups, { "arg-0": "1", "arg-1": "1", "arg-2": "codex" }).map((row) => row.text),
    ["barely — model: gpt-5.6-luna", "barely — effort: low"],
  );
  assert.deepEqual(resolveArgumentHelp(lookups, { "arg-0": "1", "arg-1": "1" }), []);
});

test("consumes structurally valid lookups that cannot bind exactly", () => {
  const bindFailures = [
    MODEL_TABLE.replace("how_deeply_capable × family", "unknown × family"),
    MODEL_TABLE.replace(
      "| claude | codex         | gemini           |",
      "| claude | codex         | other            |",
    ),
    MODEL_TABLE.replace(
      "| claude | codex         | gemini           |",
      "| claude | codex         | codex             |",
    ),
    MODEL_TABLE.replace(
      "| 20 — all the way down | fable  | gpt-5.6-sol   | Gemini 3.1 Pro   |",
      "| 13 — again            | fable  | gpt-5.6-sol   | Gemini 3.1 Pro   |",
    ),
    MODEL_TABLE.replace(
      "| 20 — all the way down | fable  | gpt-5.6-sol   | Gemini 3.1 Pro   |",
      "| 21 — unknown          | fable  | gpt-5.6-sol   | Gemini 3.1 Pro   |",
    ),
  ];

  for (const source of bindFailures) assert.deepEqual(parseArgumentHelp(source, FIELDS), { lookups: [] });

  const duplicateLabelFields: ParsedField[] = [
    ...FIELDS,
    { id: "arg-3", label: "family", kind: "text", raw: "<family>" },
  ];
  assert.deepEqual(parseArgumentHelp(MODEL_TABLE, duplicateLabelFields), { lookups: [] });

  const duplicateOptionFields: ParsedField[] = FIELDS.map((field) =>
    field.label === "family" && field.kind === "dropdown"
      ? { ...field, options: ["claude", "claude", "codex"] }
      : field,
  );
  assert.deepEqual(parseArgumentHelp(MODEL_TABLE, duplicateOptionFields), { lookups: [] });
});

test("leaves unsupported table markup as ordinary prose", () => {
  const unsupported = [
    MODEL_TABLE.replace("| ---------------------", "| --"),
    MODEL_TABLE.replace(
      "| 1 — barely            | haiku  | gpt-5.6-luna  | Gemini 3.5 Flash |",
      "| 1 — barely | haiku |",
    ),
    MODEL_TABLE.replace("| claude | codex         | gemini           |", "| claude | codex         |"),
    MODEL_TABLE.replace("| 1 — barely            |", "1 — barely            |"),
    MODEL_TABLE.replace("how_deeply_capable    |", "**how_deeply_capable** |"),
    MODEL_TABLE.replace("haiku", "`haiku`"),
    MODEL_TABLE.replace("haiku", "[haiku][model]"),
    MODEL_TABLE.replace("haiku", "<https://example.com>"),
    MODEL_TABLE.replace("haiku", "<ftp://example.com>"),
    MODEL_TABLE.replace("haiku", "<dev@example.com>"),
    MODEL_TABLE.replace("haiku", '<a href="https://example.com">haiku</a>'),
    `${MODEL_TABLE.replace("haiku", "[haiku]")}\n\n[haiku]: https://example.com`,
    MODEL_TABLE.replace("haiku", "one \\| two"),
    `| a | b |\n| --- | --- |\n| 1 | 2 |`,
    "Choose a | b in prose.",
  ];

  for (const source of unsupported) {
    assert.deepEqual(parseArgumentHelp(source, FIELDS), { lookups: [], prose: source });
  }
});

test("accepts plain brackets and standalone comparison signs", () => {
  const fields: ParsedField[] = [
    { id: "arg-0", label: "threshold", kind: "dropdown", options: ["<13", ">=13"], raw: "[<13 | >=13]" },
    { id: "arg-1", label: "format", kind: "dropdown", options: ["[preview]", "plain"], raw: "[[preview] | plain]" },
  ];
  const table = `score — threshold × format
| threshold  | [preview] | plain |
| ---------- | --------- | ----- |
| <13 — low  | score < 5 | low   |
| >=13 — high | score > 5 | high  |`;

  const parsed = parseArgumentHelp(table, fields);
  assert.equal(parsed.lookups.length, 1);
  assert.deepEqual(resolveArgumentHelp(parsed.lookups, { "arg-0": "<13", "arg-1": "[preview]" }), [
    { fieldId: "arg-0", text: "low — score: score < 5" },
  ]);
});

test("preserves unsupported prose byte-for-byte", () => {
  const prose = "  Keep edge spaces.  \n\nAnd boundary newlines.\n";
  assert.deepEqual(parseArgumentHelp(prose, FIELDS), { lookups: [], prose });
});

test("rejects duplicate lookup bindings instead of choosing one", () => {
  assert.deepEqual(parseArgumentHelp(`${MODEL_TABLE}\n\n${MODEL_TABLE}`, FIELDS), { lookups: [] });
});

test("omits absent help without a row or gap", () => {
  assert.deepEqual(parseArgumentHelp(undefined, FIELDS), { lookups: [] });
  assert.deepEqual(parseArgumentHelp("", FIELDS), { lookups: [] });
});
