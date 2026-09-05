import test from "node:test";
import assert from "node:assert/strict";
import { fillPromptBody } from "../src/lib/prompt-template";

// Placeholders are zero-based: `$0` is the first argument. These tests previously asserted the
// opposite (`$1` → first), which is why they passed while the feature was off by one against every
// installed skill. See the 2026-09-05 entry in `#use-40`'s ship-plan row.

test("fills aggregate and positional prompt placeholders", () => {
  const body = "All: $ARGUMENTS\nFirst: $0\nSecond: $1\nAgain: $0";

  assert.equal(fillPromptBody(body, ["alpha", "beta"]), "All: alpha beta\nFirst: alpha\nSecond: beta\nAgain: alpha");
});

test("leaves missing and rest/range-like placeholders untouched", () => {
  const body = "$0 $1 $2 $1+ $10 $ARGUMENTST";

  assert.equal(fillPromptBody(body, ["alpha", "beta"]), "alpha beta $2 $1+ $10 $ARGUMENTST");
});

test("$0 resolves to the first argument, not to an unfilled token", () => {
  // The exact defect human Scenario 1 caught on 2026-09-05: `$0` was returned untouched because
  // the index was computed as `Number(key) - 1`, making it -1 and tripping the `index < 0` guard.
  assert.equal(fillPromptBody("a=$0 b=$1 c=$2", ["FILES", "TABLE"]), "a=FILES b=TABLE c=$2");
});

test("fills a real corpus body the way its author reads it", () => {
  // `reformat-md-table`'s body, reduced to its placeholder lines. Its frontmatter hint is
  // `files type:[table | bullets]`, so `$0` is the file and `$1` is the type.
  const body = ["`$1` missing → default `table`.", "# if `$1` == `bullets`", "Reformat markdown tables in `$0`"].join(
    "\n",
  );

  assert.equal(
    fillPromptBody(body, ["notes.md", "bullets"]),
    ["`bullets` missing → default `table`.", "# if `bullets` == `bullets`", "Reformat markdown tables in `notes.md`"].join(
      "\n",
    ),
  );
});
