import { mkdtemp, mkdir, rm, symlink, writeFile } from "node:fs/promises";
import { realpathSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import test from "node:test";
import assert from "node:assert/strict";
import matter from "gray-matter";

// gray-matter ships its cache at runtime but omits it from the type defs
const matterCache = matter as unknown as { cache: Record<string, unknown>; clearCache(): void };
import { resolveScanTargets } from "../src/lib/skill-discovery";
import { getAgentSkills } from "../src/lib/skill-loader";
import type { Agent, AgentConfig } from "../src/lib/types";

// Every agent whose config resolves to the shared skills folder, in getAgentConfigs order.
// amp and antigravity reach it via their own scanPath; the rest via SHARED_AGENTS_PATH.
const SHARED_AGENTS: Agent[] = [
  "amp",
  "antigravity",
  "claude-code",
  "codex",
  "droid",
  "gemini",
  "opencode",
  "pi",
  "warp",
];

async function writeSkill(dir: string, name: string) {
  await mkdir(join(dir, name), { recursive: true });
  await writeFile(join(dir, name, "SKILL.md"), `---\nname: ${name}\ndescription: ${name} skill\n---\n\nBody.\n`);
}

/**
 * Mirrors the real config shape: one real directory reached by ten configs through nine aliases,
 * with antigravity appearing twice (its own scanPath plus the shared path).
 */
async function sharedFolderFixture(skillCount: number) {
  const base = await mkdtemp(join(tmpdir(), "use-skill-discovery-"));
  const real = join(base, "shared");
  await mkdir(real);
  for (let i = 0; i < skillCount; i++) await writeSkill(real, `skill-${i}`);

  const aliases: string[] = [];
  for (const agent of SHARED_AGENTS) {
    const alias = join(base, `alias-${agent}`);
    await symlink(real, alias);
    aliases.push(alias);
  }

  const configs: AgentConfig[] = SHARED_AGENTS.map((agent, i) => ({ agent, basePath: aliases[i] }));
  // antigravity reaches the folder twice, as it does in getAgentConfigs
  configs.splice(2, 0, { agent: "antigravity", basePath: real });

  return { base, real: realpathSync(real), configs };
}

test("collapses every config resolving to one directory into a single scan target", async () => {
  const { base, real, configs } = await sharedFolderFixture(3);
  try {
    assert.equal(configs.length, 10, "fixture should mirror the real ten-config fan-out");

    const targets = resolveScanTargets(configs);

    assert.equal(targets.length, 1);
    assert.deepEqual(targets[0].agents, SHARED_AGENTS, "nine distinct agents, deduplicated, in config order");
    assert.equal(targets[0].basePath, real, "target resolves through the symlinks to the real directory");
  } finally {
    await rm(base, { recursive: true, force: true });
  }
});

test("reads a shared directory once no matter how many agents reach it", async () => {
  const { base, configs } = await sharedFolderFixture(10);
  try {
    // Measure the work directly rather than mocking fs: getAgentSkills does exactly one readdir
    // plus one readFile per skill dir, so the records it produces are the read count.
    // Scanning per config is what the code did before resolveScanTargets existed.
    const perConfig = await Promise.all(
      configs.map((c) => getAgentSkills({ basePath: c.basePath, agents: [c.agent], userConfigured: false })),
    );
    const readsBefore = perConfig.reduce((n, r) => n + r.skills.length, 0);

    const targets = resolveScanTargets(configs);
    const perTarget = await Promise.all(targets.map((t) => getAgentSkills(t)));
    const readsAfter = perTarget.reduce((n, r) => n + r.skills.length, 0);

    assert.equal(targets.length, 1, "ten configs, one physical directory");
    assert.equal(readsBefore, 100, "scanning per config reads the same 10 files once per config");
    assert.equal(readsAfter, 10, "scanning per target reads each file exactly once");
    assert.equal(readsBefore / readsAfter, configs.length, "amplification equals the config fan-out");
  } finally {
    await rm(base, { recursive: true, force: true });
  }
});

test("stamps the first contributing config as primary and carries every agent", async () => {
  const { base, configs } = await sharedFolderFixture(2);
  try {
    const [target] = resolveScanTargets(configs);
    const { skills } = await getAgentSkills(target);

    assert.equal(skills.length, 2);
    for (const skill of skills) {
      // Primary drives tag colour and paste prefix — amp is config index 0 on the shared path
      assert.equal(skill.agent, "amp");
      assert.deepEqual(skill.agents, SHARED_AGENTS);
    }
  } finally {
    await rm(base, { recursive: true, force: true });
  }
});

test("a merged target reports a missing directory when any contributing config is user-configured", async () => {
  const missing = join(tmpdir(), `use-skill-missing-${Date.now()}`);
  const configs: AgentConfig[] = [
    { agent: "codex", basePath: missing },
    { agent: "customProject1", basePath: missing, userConfigured: true },
  ];

  const targets = resolveScanTargets(configs);

  assert.equal(targets.length, 1);
  assert.equal(targets[0].userConfigured, true, "user-configured must win, or a mistyped path goes silent");
  assert.deepEqual(targets[0].agents, ["codex", "customProject1"]);

  const result = await getAgentSkills(targets[0]);
  assert.deepEqual(result, { skills: [], error: `Skill directory not found: ${missing}` });
});

test("keeps unresolvable paths separate so missing directories still report", async () => {
  const a = join(tmpdir(), `use-skill-missing-a-${Date.now()}`);
  const b = join(tmpdir(), `use-skill-missing-b-${Date.now()}`);

  const targets = resolveScanTargets([
    { agent: "codex", basePath: a },
    { agent: "gemini", basePath: b },
  ]);

  assert.equal(targets.length, 2);
  assert.deepEqual(
    targets.map((t) => t.basePath),
    [a, b],
  );
});

test("does not populate gray-matter's global cache", async () => {
  const { base, configs } = await sharedFolderFixture(10);
  try {
    matterCache.clearCache();
    const [target] = resolveScanTargets(configs);
    await getAgentSkills(target);

    // The cache is keyed by each file's entire content and never evicted — it must stay empty
    assert.equal(Object.keys(matterCache.cache).length, 0);
  } finally {
    await rm(base, { recursive: true, force: true });
  }
});

test("a skill carrying many agents survives the file-level dedupe with all of them", async () => {
  const { base, configs } = await sharedFolderFixture(1);
  try {
    const [target] = resolveScanTargets(configs);
    const { skills } = await getAgentSkills(target);

    // Replays loadAllSkills' second dedupe pass. Overwriting instead of unioning here would
    // flatten the skill to one agent and drop it from every other agent's filter.
    const byRealPath = new Map<string, (typeof skills)[number]>();
    for (const skill of skills) {
      const incoming = skill.agents ?? [skill.agent];
      const existing = byRealPath.get(skill.filePath);
      if (existing) {
        existing.agents = existing.agents ?? [existing.agent];
        for (const agent of incoming) {
          if (!existing.agents.includes(agent)) existing.agents.push(agent);
        }
      } else {
        byRealPath.set(skill.filePath, { ...skill, agents: [...incoming] });
      }
    }

    const [survivor] = [...byRealPath.values()];
    assert.deepEqual(survivor.agents, SHARED_AGENTS);
    for (const agent of SHARED_AGENTS) {
      assert.ok((survivor.agents ?? [survivor.agent]).includes(agent), `${agent} filter must still match`);
    }
  } finally {
    await rm(base, { recursive: true, force: true });
  }
});

test("collapses one SKILL.md symlinked between two distinct folders", async () => {
  const base = await mkdtemp(join(tmpdir(), "use-skill-crosslink-"));
  try {
    // Two real directories with different inodes, so resolveScanTargets keeps them apart.
    // Only the file-level dedupe can collapse the shared SKILL.md — this is the case that
    // justifies keeping that second pass after the directory-level one exists.
    const a = join(base, "a");
    const b = join(base, "b");
    await writeSkill(a, "shared-skill");
    await mkdir(join(b, "shared-skill"), { recursive: true });
    await symlink(join(a, "shared-skill", "SKILL.md"), join(b, "shared-skill", "SKILL.md"));

    const targets = resolveScanTargets([
      { agent: "codex", basePath: a },
      { agent: "gemini", basePath: b },
    ]);
    assert.equal(targets.length, 2, "different inodes must scan separately");

    const results = await Promise.all(targets.map((t) => getAgentSkills(t)));
    assert.equal(
      results.reduce((n, r) => n + r.skills.length, 0),
      2,
      "both directories yield the skill before file-level dedupe",
    );

    // Replay the file-level pass the way loadAllSkills does
    const byRealPath = new Map<string, { agents?: Agent[]; agent: Agent }>();
    for (const skill of results.flatMap((r) => r.skills)) {
      const key = realpathSync(skill.filePath);
      const incoming = skill.agents ?? [skill.agent];
      const existing = byRealPath.get(key);
      if (existing) {
        existing.agents = existing.agents ?? [existing.agent];
        for (const agent of incoming) if (!existing.agents.includes(agent)) existing.agents.push(agent);
      } else {
        byRealPath.set(key, { ...skill, agents: [...incoming] });
      }
    }

    assert.equal(byRealPath.size, 1, "one row survives");
    assert.deepEqual([...byRealPath.values()][0].agents, ["codex", "gemini"]);
  } finally {
    await rm(base, { recursive: true, force: true });
  }
});
