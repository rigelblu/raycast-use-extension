import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import test from "node:test";
import assert from "node:assert/strict";
import { getAgentSkills } from "../src/lib/skill-loader";

test("loads one-level SKILL.md files and preserves body plus extra frontmatter", async () => {
  const basePath = await mkdtemp(join(tmpdir(), "use-skill-loader-"));
  try {
    await mkdir(join(basePath, "valid"));
    await mkdir(join(basePath, ".hidden"));
    await mkdir(join(basePath, "recursive", "deeper"), { recursive: true });

    await writeFile(
      join(basePath, "valid", "SKILL.md"),
      `---
name: test-skill
description: Test skill
argument-hint: mode:[new | append]
disable-model-invocation: true
model: gpt-5
---

Use this body.
`,
    );
    await writeFile(
      join(basePath, ".hidden", "SKILL.md"),
      `---
name: hidden-skill
description: Hidden skill
---
`,
    );
    await writeFile(
      join(basePath, "recursive", "SKILL.md"),
      `---
name: recursive-skill
description: Recursive skill
---
`,
    );
    await writeFile(
      join(basePath, "recursive", "deeper", "SKILL.md"),
      `---
name: too-deep-skill
description: Too deep skill
---
`,
    );

    const result = await getAgentSkills({ agent: "codex", basePath });

    assert.equal(result.error, undefined);
    assert.equal(result.skills.length, 2);
    assert.deepEqual(
      result.skills.map((skill) => skill.name).sort(),
      ["recursive-skill", "test-skill"],
    );
    assert.deepEqual(result.skills.find((skill) => skill.name === "test-skill"), {
      name: "test-skill",
      description: "Test skill",
      agent: "codex",
      filePath: join(basePath, "valid", "SKILL.md"),
      body: "Use this body.",
      argumentHint: "mode:[new | append]",
      disableModelInvocation: true,
      extraProperties: { model: "gpt-5" },
    });
  } finally {
    await rm(basePath, { recursive: true, force: true });
  }
});

test("matches custom argument hint keys case-insensitively", async () => {
  const basePath = await mkdtemp(join(tmpdir(), "use-skill-loader-"));
  try {
    await mkdir(join(basePath, "valid"));
    await writeFile(
      join(basePath, "valid", "SKILL.md"),
      `---
name: test-skill
description: Test skill
ARGUMENT_HINT: topic
---
`,
    );

    const result = await getAgentSkills({ agent: "gemini", basePath }, "argument-hint");

    assert.equal(result.skills[0]?.argumentHint, "topic");
  } finally {
    await rm(basePath, { recursive: true, force: true });
  }
});

test("silences missing default directories but reports missing user-configured directories", async () => {
  const missingPath = join(tmpdir(), `use-skill-missing-${Date.now()}`);

  assert.deepEqual(await getAgentSkills({ agent: "codex", basePath: missingPath }), { skills: [] });

  const result = await getAgentSkills({ agent: "customProject1", basePath: missingPath, userConfigured: true });
  assert.deepEqual(result, { skills: [], error: `Skill directory not found: ${missingPath}` });
});
