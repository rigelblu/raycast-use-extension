import { homedir } from "node:os";
import { realpathSync } from "node:fs";
import { getAgentSkills } from "./skill-loader";
import type { Skill, Agent, AgentConfig, ScanTarget } from "./types";
import { getPrefs, type CommandPreferences } from "./preferences";
import { AGENTS } from "./agent-config";

function expandHomePath(path: string): string {
  return path.replace(/^~/, homedir());
}

// Additional scan paths beyond each agent's primary scanPath in agent-config
const SHARED_AGENTS_PATH = "~/.agents/skills";
const CODEX_BUILTIN_PATH = "~/.codex/vendor_imports/skills/skills/.curated";

function getAgentConfigs(prefs: CommandPreferences): AgentConfig[] {
  const configs: AgentConfig[] = [
    { agent: "amp", basePath: expandHomePath(AGENTS.amp.scanPath!) },
    { agent: "antigravity", basePath: expandHomePath(AGENTS.antigravity.scanPath!) },
    { agent: "antigravity", basePath: expandHomePath(SHARED_AGENTS_PATH) },
    { agent: "claude-code", basePath: expandHomePath(AGENTS["claude-code"].scanPath!) },
    { agent: "codex", basePath: expandHomePath(AGENTS.codex.scanPath!) },
    { agent: "codex", basePath: expandHomePath(CODEX_BUILTIN_PATH) },
    { agent: "copilot", basePath: expandHomePath(AGENTS.copilot.scanPath!) },
    { agent: "droid", basePath: expandHomePath(AGENTS["droid"].scanPath!) },
    { agent: "gemini", basePath: expandHomePath(AGENTS.gemini.scanPath!) },
    { agent: "gemini", basePath: expandHomePath(SHARED_AGENTS_PATH) },
    { agent: "kilo", basePath: expandHomePath(AGENTS.kilo.scanPath!) },
    { agent: "opencode", basePath: expandHomePath(AGENTS.opencode.scanPath!) },
    { agent: "opencode", basePath: expandHomePath(SHARED_AGENTS_PATH) },
    { agent: "pi", basePath: expandHomePath(AGENTS.pi.scanPath!) },
    { agent: "pi", basePath: expandHomePath(SHARED_AGENTS_PATH) },
    { agent: "warp", basePath: expandHomePath(SHARED_AGENTS_PATH) },
    { agent: "warp", basePath: expandHomePath(AGENTS.warp.scanPath!) },
  ];

  if (prefs.customProjectPath1) {
    configs.push({ agent: "customProject1", basePath: expandHomePath(prefs.customProjectPath1), userConfigured: true });
  }
  if (prefs.customProjectPath2) {
    configs.push({ agent: "customProject2", basePath: expandHomePath(prefs.customProjectPath2), userConfigured: true });
  }
  if (prefs.customProjectPath3) {
    configs.push({ agent: "customProject3", basePath: expandHomePath(prefs.customProjectPath3), userConfigured: true });
  }
  if (prefs.customProjectPath4) {
    configs.push({ agent: "customProject4", basePath: expandHomePath(prefs.customProjectPath4), userConfigured: true });
  }
  if (prefs.customProjectPath5) {
    configs.push({ agent: "customProject5", basePath: expandHomePath(prefs.customProjectPath5), userConfigured: true });
  }

  return configs;
}

/**
 * Group configs by the directory they actually resolve to, so each physical directory is scanned
 * once no matter how many agents point at it.
 *
 * Several agents' skill dirs are symlinks onto one shared folder, so scanning per config reads that
 * folder once per agent. Identity is knowable from the path alone — resolving it up front is what
 * keeps the load proportional to the corpus instead of to the agent count.
 *
 * Preserves getAgentConfigs order, so agents[0] is the same primary the previous file-level dedupe
 * kept. That primary drives each skill's tag colour and paste prefix, so the order is load-bearing.
 */
export function resolveScanTargets(configs: AgentConfig[]): ScanTarget[] {
  const byPath = new Map<string, ScanTarget>();

  for (const config of configs) {
    let resolved: string;
    try {
      resolved = realpathSync(config.basePath);
    } catch {
      // Missing dir — keep the literal path so readdir still reports ENOENT as before
      resolved = config.basePath;
    }

    const existing = byPath.get(resolved);
    if (existing) {
      if (!existing.agents.includes(config.agent)) existing.agents.push(config.agent);
      // Any user-configured contributor makes a missing dir reportable, so a mistyped custom
      // path can't go silent by colliding with a default one
      existing.userConfigured ||= config.userConfigured ?? false;
    } else {
      byPath.set(resolved, {
        basePath: resolved,
        agents: [config.agent],
        userConfigured: config.userConfigured ?? false,
      });
    }
  }

  return [...byPath.values()];
}

export async function loadAllSkills(): Promise<{
  skills: Skill[];
  errors: Map<Agent, string>;
}> {
  const prefs = getPrefs();
  const targets = resolveScanTargets(getAgentConfigs(prefs));
  const argumentHintKey = prefs.argumentHintKey;
  const directExecProperty = prefs.directExecProperty;
  const errors = new Map<Agent, string>();
  const allSkills: Skill[] = [];

  const agentResults = await Promise.all(targets.map((t) => getAgentSkills(t, argumentHintKey, directExecProperty)));
  agentResults.forEach((result, i) => {
    allSkills.push(...result.skills);
    if (result.error) {
      // One directory failure belongs to every agent that reaches it
      for (const agent of targets[i].agents) {
        const existing = errors.get(agent);
        errors.set(agent, existing ? `${existing}; ${result.error}` : result.error);
      }
    }
  });

  // Second dedupe pass, keyed on the file rather than its directory. resolveScanTargets already
  // collapsed agents sharing a directory; this catches the remaining case — one SKILL.md symlinked
  // between two otherwise-distinct folders, which have different inodes and so scan separately.
  // On a corpus without such a file this removes nothing, and that is the expected state.
  //
  // Skills now arrive carrying their target's full agent list, so both branches take the union.
  // Overwriting instead would flatten a shared skill to a single agent and drop it from every
  // other agent's filter.
  const byRealPath = new Map<string, Skill>();
  for (const skill of allSkills) {
    let key: string;
    try {
      key = realpathSync(skill.filePath);
    } catch {
      key = skill.filePath;
    }
    const incoming = skill.agents ?? [skill.agent];
    const existing = byRealPath.get(key);
    if (existing) {
      existing.agents = existing.agents ?? [existing.agent];
      for (const agent of incoming) {
        if (!existing.agents.includes(agent)) existing.agents.push(agent);
      }
    } else {
      byRealPath.set(key, { ...skill, agents: [...incoming] });
    }
  }

  // Sort: alphabetical by name, then by agent for ties.

  const skills = [...byRealPath.values()];
  skills.sort((a, b) => a.name.localeCompare(b.name) || a.agent.localeCompare(b.agent));

  return { skills, errors };
}
