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
  disableModelInvocation?: boolean;
  // All other properties go to extraProperties
  extraProperties?: Record<string, unknown>;
}

export interface AgentConfig {
  agent: Agent;
  basePath: string;
  userConfigured?: boolean;
}
