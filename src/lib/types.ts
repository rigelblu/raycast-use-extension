export type Agent =
  | "amp"
  | "antigravity"
  | "claude-code"
  | "codex"
  | "copilot"
  | "droid"
  | "gemini"
  | "kilo"
  | "opencode"
  | "pi"
  | "warp"
  | "customProject1"
  | "customProject2"
  | "customProject3"
  | "customProject4"
  | "customProject5";

export interface Skill {
  name: string;
  description: string;
  agent: Agent;
  /**
   * Every agent that can reach this skill. Set when scans of different paths collapse to the
   * same physical file (e.g. agent skill dirs symlinked to one shared folder). Defaults to [agent].
   * Used for agent filtering so a deduped shared skill still matches each of its agents.
   */
  agents?: Agent[];
  filePath: string;
  body?: string;

  // Properties drive skill list UI behaviour
  argumentHint?: string;
  argumentHelp?: string;
  disableModelInvocation?: boolean;
  // All other properties go to extraProperties
  extraProperties?: Record<string, unknown>;
}

export interface AgentConfig {
  agent: Agent;
  basePath: string;
  userConfigured?: boolean;
}

/**
 * One physical directory to scan, plus every agent whose config resolves to it.
 *
 * Agent skill dirs are commonly symlinked to one shared folder, so several configs can name the
 * same directory. Grouping by resolved path before scanning keeps each directory read once —
 * scanning per config instead reads a shared folder once per agent and blows Raycast's worker heap.
 */
export interface ScanTarget {
  /** Resolved directory (realpath), or the literal basePath when it can't be resolved. */
  basePath: string;
  /** Contributing agents in getAgentConfigs order; agents[0] becomes each skill's primary `agent`. */
  agents: Agent[];
  /** True when any contributing config was user-configured, so a missing dir is reported not silent. */
  userConfigured: boolean;
}
