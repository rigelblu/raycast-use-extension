import test from "node:test";
import assert from "node:assert/strict";
import { fillPromptBody } from "../src/lib/prompt-template";

test("fills aggregate and positional prompt placeholders", () => {
  const body = "All: $ARGUMENTS\nFirst: $1\nSecond: $2\nAgain: $1";

  assert.equal(fillPromptBody(body, ["alpha", "beta"]), "All: alpha beta\nFirst: alpha\nSecond: beta\nAgain: alpha");
});

test("leaves missing and rest/range-like placeholders untouched", () => {
  const body = "$1 $2 $3 $2+ $10 $ARGUMENTST";

  assert.equal(fillPromptBody(body, ["alpha", "beta"]), "alpha beta $3 $2+ $10 $ARGUMENTST");
});
