import { homedir } from "node:os";
import { realpathSync } from "node:fs";
import { getAgentSkills } from "./skill-loader";
import type { Skill, Agent, AgentConfig } from "./types";
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

export async function loadAllSkills(): Promise<{
  skills: Skill[];
  errors: Map<Agent, string>;
}> {
  const prefs = getPrefs();
  const configs = getAgentConfigs(prefs);
  const argumentHintKey = prefs.argumentHintKey;
  const directExecProperty = prefs.directExecProperty;
  const errors = new Map<Agent, string>();
  const allSkills: Skill[] = [];

  const agentResults = await Promise.all(configs.map((c) => getAgentSkills(c, argumentHintKey, directExecProperty)));
  agentResults.forEach((result, i) => {
    allSkills.push(...result.skills);
    if (result.error) {
      const agent = configs[i].agent;
      const existing = errors.get(agent);
      errors.set(agent, existing ? `${existing}; ${result.error}` : result.error);
    }
  });

  // Sort: alphabetical by name, then by agent for ties.
  // Shared-path skills (e.g. ~/.agents/skills/) intentionally appear under each agent that scans the path.
  // Collapse skills that resolve to the same physical file. Agent skill dirs are often symlinked
  // to one shared folder (e.g. ~/.claude/skills -> shared), so one canonical skill would otherwise
  // appear once per scanning agent — hundreds of redundant List items that exhaust Raycast's
  // 100 MB worker heap when rendered. The surviving skill records every agent that reaches it.
  const byRealPath = new Map<string, Skill>();
  for (const skill of allSkills) {
    let key: string;
    try {
      key = realpathSync(skill.filePath);
    } catch {
      key = skill.filePath;
    }
    const existing = byRealPath.get(key);
    if (existing) {
      existing.agents = existing.agents ?? [existing.agent];
      if (!existing.agents.includes(skill.agent)) existing.agents.push(skill.agent);
    } else {
      byRealPath.set(key, { ...skill, agents: [skill.agent] });
    }
  }

  const skills = [...byRealPath.values()];
  skills.sort((a, b) => a.name.localeCompare(b.name) || a.agent.localeCompare(b.agent));

  return { skills, errors };
}
