import test from "node:test";
import assert from "node:assert/strict";
import {
  formatCodexDesktopInvocation,
  formatSkillInvocation,
  formatSkillPasteContent,
  formatSkillPastePreview,
  getPastePrefix,
  withPrefix,
} from "../src/lib/invocation";
import type { CommandPreferences } from "../src/lib/preferences";
import type { Skill } from "../src/lib/types";

const NATIVE: CommandPreferences = {};

test("formats slash-style agent invocations with individually quoted arguments", () => {
  assert.equal(
    formatSkillInvocation("claude-code", "vcs-change", ["fix bug", 'say "hi"', "src\\lib"], NATIVE),
    'vcs-change "fix bug" "say \\"hi\\"" "src\\\\lib"',
  );
});

test("formats wrapped-style agent invocations and escapes backticks in skill names", () => {
  assert.equal(formatSkillInvocation("gemini", "use`skill", ["arg"], NATIVE), '`use\\`skill "arg"`');
});

test("returns agent paste prefixes by invocation style", () => {
  assert.equal(getPastePrefix("warp", NATIVE), "/");
  assert.equal(getPastePrefix("gemini", NATIVE), "use skill");
  assert.equal(getPastePrefix("pi", NATIVE), "/skill:");
});

test("formats Codex agent with native $ prefix (slash style, no backticks, no space separator)", () => {
  assert.equal(getPastePrefix("codex", NATIVE), "$");
  assert.equal(formatSkillInvocation("codex", "vcs-change", ["arg"], NATIVE), 'vcs-change "arg"');
  assert.equal(withPrefix("vcs-change", "$"), "$vcs-change");
  assert.equal(withPrefix('vcs-change "arg"', "$"), '$vcs-change "arg"');
});

test("formats Pi agent with native /skill: prefix (slash style, no backticks, no space separator)", () => {
  const skill: Skill = {
    name: "vcs-change",
    description: "Format git commit message",
    agent: "pi",
    filePath: "/Users/tomhosiawa/.pi/agent/skills/vcs-change/SKILL.md",
    argumentHint: "[extra_instructions]",
  };

  assert.equal(getPastePrefix("pi", NATIVE), "/skill:");
  assert.equal(formatSkillInvocation("pi", "vcs-change", ["commit"], NATIVE), 'vcs-change "commit"');
  assert.equal(withPrefix("vcs-change", "/skill:"), "/skill:vcs-change");
  assert.equal(withPrefix('vcs-change "commit"', "/skill:"), '/skill:vcs-change "commit"');
  assert.equal(
    formatSkillPasteContent(skill, "pi", NATIVE, "default", ["commit"]),
    '/skill:vcs-change "commit"',
  );
  assert.equal(
    formatSkillPasteContent(skill, "pi", NATIVE, "default", undefined),
    "/skill:vcs-change",
  );
  assert.equal(
    formatSkillPastePreview(skill, "pi", NATIVE, "default"),
    "/skill:vcs-change [extra_instructions]",
  );
});

test("formats Codex Desktop App invocations as a markdown skill link with quoted args", () => {
  assert.equal(
    formatCodexDesktopInvocation(
      "review-code-quality",
      "/Users/tomhosiawa/src/rb/tom-home-branches/tom.home.main/dotfiles/rb-agents/skills/review-code-quality/SKILL.md",
      ["deep", "change-id", "nv"],
    ),
    '[$review-code-quality](/Users/tomhosiawa/src/rb/tom-home-branches/tom.home.main/dotfiles/rb-agents/skills/review-code-quality/SKILL.md) "deep" "change-id" "nv"',
  );
});

test("uses Codex Desktop App format only for the Codex Desktop paste surface", () => {
  const skill: Skill = {
    name: "review-code-quality",
    description: "Review code",
    agent: "codex",
    filePath: "/Users/tomhosiawa/.codex/skills/review-code-quality/SKILL.md",
  };

  assert.equal(
    formatSkillPasteContent(skill, "codex", NATIVE, "codex-desktop", ["deep", "change-id", "nv"]),
    '[$review-code-quality](/Users/tomhosiawa/.codex/skills/review-code-quality/SKILL.md) "deep" "change-id" "nv"',
  );
  assert.equal(
    formatSkillPasteContent(skill, "codex", NATIVE, "default", ["deep", "change-id", "nv"]),
    '$review-code-quality "deep" "change-id" "nv"',
  );
});

test("adds a separator unless the prefix is slash-style or already spaced", () => {
  assert.equal(withPrefix("vcs-change", "use skill"), "use skill vcs-change");
  assert.equal(withPrefix("vcs-change", "use-skill"), "use-skill vcs-change");
  assert.equal(withPrefix("vcs-change", "@skill "), "@skill vcs-change");
  assert.equal(withPrefix("vcs-change", "/"), "/vcs-change");
  assert.equal(withPrefix("vcs-change", "@"), "@vcs-change");
  assert.equal(withPrefix("vcs-change", "$"), "$vcs-change");
  assert.equal(withPrefix("vcs-change", "/skill:"), "/skill:vcs-change");
  assert.equal(withPrefix("vcs-change", ":"), ":vcs-change");
  assert.equal(withPrefix("vcs-change", ""), "vcs-change");
});

test("treats a general $ prefix as slash-style for every agent, not just Codex", () => {
  const prefs = { prefixStyle: "general" as const, generalPrefix: "$" };
  // gemini is wrapped-style natively, warp is slash-style — the general prefix overrides both.
  for (const agent of ["gemini", "warp"] as const) {
    assert.equal(formatSkillInvocation(agent, "vcs-change", undefined, prefs), "vcs-change");
    assert.equal(withPrefix("vcs-change", getPastePrefix(agent, prefs)), "$vcs-change");
  }
});

test("treats a general prefix ending in : as slash-style for every agent", () => {
  const prefs = { prefixStyle: "general" as const, generalPrefix: "/skill:" };
  for (const agent of ["gemini", "warp"] as const) {
    assert.equal(formatSkillInvocation(agent, "vcs-change", undefined, prefs), "vcs-change");
    assert.equal(withPrefix("vcs-change", getPastePrefix(agent, prefs)), "/skill:vcs-change");
  }
});

test("leaves the Codex Desktop rich link untouched by the $ prefix change", () => {
  assert.equal(
    formatCodexDesktopInvocation("vcs-change", "/skills/vcs-change/SKILL.md", ["arg"]),
    '[$vcs-change](/skills/vcs-change/SKILL.md) "arg"',
  );
});

test("preserves or normalizes separators for custom general prefixes", () => {
  const invocation = formatSkillInvocation("warp", "vcs-change", undefined, {
    prefixStyle: "general",
    generalPrefix: "use-skill",
  });

  assert.equal(invocation, "`vcs-change`");
  assert.equal(
    withPrefix(invocation, getPastePrefix("warp", { prefixStyle: "general", generalPrefix: "use-skill" })),
    "use-skill `vcs-change`",
  );
  assert.equal(
    withPrefix(invocation, getPastePrefix("warp", { prefixStyle: "general", generalPrefix: "@skill " })),
    "@skill `vcs-change`",
  );
});

test("respects general prefix preference for getPastePrefix", () => {
  assert.equal(getPastePrefix("warp", { prefixStyle: "general", generalPrefix: "call agent" }), "call agent");
  assert.equal(getPastePrefix("gemini", { prefixStyle: "general", generalPrefix: "/" }), "/");
});

test("respects general prefix preference for formatSkillInvocation", () => {
  // If general prefix is word-like, it wraps in backticks
  assert.equal(
    formatSkillInvocation("warp", "vcs-change", ["fix bug"], { prefixStyle: "general", generalPrefix: "call agent" }),
    '`vcs-change "fix bug"`',
  );
  // If general prefix is slash, it does not wrap
  assert.equal(
    formatSkillInvocation("gemini", "vcs-change", ["fix bug"], { prefixStyle: "general", generalPrefix: "/" }),
    'vcs-change "fix bug"',
  );
});

test("general prefix falls back to default when blank, whitespace, or missing", () => {
  // getPastePrefix returns the fallback string
  assert.equal(getPastePrefix("warp", { prefixStyle: "general", generalPrefix: "" }), "use skill");
  assert.equal(getPastePrefix("warp", { prefixStyle: "general", generalPrefix: "   " }), "use skill");
  assert.equal(getPastePrefix("warp", { prefixStyle: "general" }), "use skill");

  // formatSkillInvocation treats the fallback as wrapped style
  assert.equal(
    formatSkillInvocation("warp", "vcs-change", undefined, { prefixStyle: "general", generalPrefix: "" }),
    "`vcs-change`",
  );
  assert.equal(formatSkillInvocation("warp", "vcs-change", undefined, { prefixStyle: "general" }), "`vcs-change`");
});

test("general prefix with trailing slash is treated as slash style", () => {
  // "foo/" is slash style — no backtick wrap, no trailing space from withPrefix
  assert.equal(
    formatSkillInvocation("gemini", "vcs-change", undefined, { prefixStyle: "general", generalPrefix: "/" }),
    "vcs-change",
  );
  assert.equal(
    withPrefix("vcs-change", getPastePrefix("gemini", { prefixStyle: "general", generalPrefix: "/" })),
    "/vcs-change",
  );
  assert.equal(
    formatSkillInvocation("warp", "vcs-change", undefined, { prefixStyle: "general", generalPrefix: "foo/" }),
    "vcs-change",
  );
  assert.equal(withPrefix("vcs-change", "foo/"), "foo/vcs-change");
});

test("general prefix with trailing @ is treated as slash style", () => {
  assert.equal(
    formatSkillInvocation("gemini", "vcs-change", undefined, { prefixStyle: "general", generalPrefix: "@" }),
    "vcs-change",
  );
  assert.equal(
    withPrefix("vcs-change", getPastePrefix("gemini", { prefixStyle: "general", generalPrefix: "@" })),
    "@vcs-change",
  );
  assert.equal(
    formatSkillInvocation("warp", "vcs-change", undefined, { prefixStyle: "general", generalPrefix: "foo@" }),
    "vcs-change",
  );
  assert.equal(withPrefix("vcs-change", "foo@"), "foo@vcs-change");
});
