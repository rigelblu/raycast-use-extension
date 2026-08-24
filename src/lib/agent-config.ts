import type { Color } from "@raycast/api";
import type { Agent } from "./types";

import type { CommandPreferences } from "./preferences";

export type HexColor = `#${string}`;
export type InvocationStyle = "slash" | "wrapped";

export interface AgentProfile {
  displayName: string;
  // Color.* values are theme-aware (adapt to light/dark mode).
  // Hex colors are fixed brand colors that stay constant regardless of theme.
  color: Color | HexColor;
  iconSource: string;
  invocationStyle: InvocationStyle;
  scanPath?: string;
  nativePrefix?: string;
}

export const AGENTS: Record<Agent, AgentProfile> = {
  amp: {
    displayName: "Amp",
    color: "#F34E3F",
    iconSource: "logo-amp.svg",
    invocationStyle: "wrapped",
    scanPath: "~/.agents/skills",
  },
  antigravity: {
    displayName: "Antigravity",
    color: "#7C3AED",
    iconSource: "logo-antigravity.svg",
    invocationStyle: "slash",
    scanPath: "~/.gemini/antigravity/skills",
  },
  "claude-code": {
    displayName: "Claude",
    color: "#D97757",
    iconSource: "logo-claude.svg",
    invocationStyle: "slash",
    scanPath: "~/.claude/skills",
  },
  codex: {
    displayName: "Codex",
    color: "#263FD4",
    iconSource: "logo-codex.svg",
    invocationStyle: "slash",
    scanPath: "~/.codex/skills",
    nativePrefix: "$",
  },
  copilot: {
    displayName: "Copilot",
    color: "#1F6FEB",
    iconSource: "logo-copilot.svg",
    invocationStyle: "slash",
    scanPath: "~/.copilot/skills",
  },
  droid: {
    displayName: "Droid",
    color: "#8B5CF6",
    iconSource: "logo-droid.svg",
    invocationStyle: "slash",
    scanPath: "~/.factory/skills",
  },
  gemini: {
    displayName: "Gemini",
    color: "#1086FC",
    iconSource: "logo-gemini.svg",
    invocationStyle: "wrapped",
    scanPath: "~/.gemini/skills",
  },
  kilo: {
    displayName: "Kilo",
    color: "#EC4899",
    iconSource: "logo-kilo.svg",
    invocationStyle: "slash",
    scanPath: "~/.kilocode/skills",
  },
  opencode: {
    displayName: "OpenCode",
    color: "#06B6D4",
    iconSource: "logo-opencode.svg",
    invocationStyle: "slash",
    scanPath: "~/.config/opencode/skills",
  },
  pi: {
    displayName: "Pi",
    color: "#FFFFFF",
    iconSource: "logo-pi.svg",
    invocationStyle: "slash",
    scanPath: "~/.pi/agent/skills",
  },
  warp: {
    displayName: "Warp",
    color: "raycast-secondary-text" as Color,
    iconSource: "logo-warp.svg",
    invocationStyle: "slash",
    scanPath: "~/.warp/skills",
  },
  customProject1: {
    displayName: "Custom Project 1",
    color: "raycast-green" as Color,
    iconSource: "logo-project.svg",
    invocationStyle: "wrapped",
  },
  customProject2: {
    displayName: "Custom Project 2",
    color: "raycast-green" as Color,
    iconSource: "logo-project.svg",
    invocationStyle: "wrapped",
  },
  customProject3: {
    displayName: "Custom Project 3",
    color: "raycast-green" as Color,
    iconSource: "logo-project.svg",
    invocationStyle: "wrapped",
  },
  customProject4: {
    displayName: "Custom Project 4",
    color: "raycast-green" as Color,
    iconSource: "logo-project.svg",
    invocationStyle: "wrapped",
  },
  customProject5: {
    displayName: "Custom Project 5",
    color: "raycast-green" as Color,
    iconSource: "logo-project.svg",
    invocationStyle: "wrapped",
  },
};

export function getSourceName(agent: Agent, prefs: CommandPreferences): string {
  if (agent === "customProject1") return prefs.customProjectName1 || AGENTS.customProject1.displayName;
  if (agent === "customProject2") return prefs.customProjectName2 || AGENTS.customProject2.displayName;
  if (agent === "customProject3") return prefs.customProjectName3 || AGENTS.customProject3.displayName;
  if (agent === "customProject4") return prefs.customProjectName4 || AGENTS.customProject4.displayName;
  if (agent === "customProject5") return prefs.customProjectName5 || AGENTS.customProject5.displayName;

  return AGENTS[agent]?.displayName || agent;
}

// Normalize agent values persisted from a prior version that no longer exist in AGENTS.
// Falls back to "all" so the usersees their skills instead of an empty list.
// TODO: make function name more intuitive
export function normalizeAgent(value: string | undefined | null): string {
  if (!value || value === "all") return "all";
  return value in AGENTS ? value : "all";
}
