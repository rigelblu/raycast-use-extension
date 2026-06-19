import type { Agent } from "./types";
import { AGENTS, type InvocationStyle } from "./agent-config";
import type { CommandPreferences } from "./preferences";

const DEFAULT_GENERAL_PREFIX = "use skill";

const PASTE_PREFIX_BY_STYLE: Record<InvocationStyle, string> = {
  slash: "/",
  wrapped: DEFAULT_GENERAL_PREFIX,
};

function normalizeGeneralPrefix(prefix: string | undefined): string {
  return prefix?.trim() || DEFAULT_GENERAL_PREFIX;
}

/** Return the paste prefix for the given agent. */
export function getPastePrefix(agent: Agent, prefs: CommandPreferences): string {
  if (prefs.prefixStyle === "general") {
    return normalizeGeneralPrefix(prefs.generalPrefix);
  }

  const profile = AGENTS[agent];
  if (profile?.nativePrefix) {
    return profile.nativePrefix;
  }

  const style = profile?.invocationStyle || "wrapped";
  return PASTE_PREFIX_BY_STYLE[style];
}

/** Format skill invocation text appropriate for the agent. */
export function formatSkillInvocation(
  agent: Agent,
  skillName: string,
  args: string[] | undefined,
  prefs: CommandPreferences,
): string {
  // Quote each arg for display: ["fix bug", "v2"] → '"fix bug" "v2"'
  const argsStr = args?.length
    ? args.map((arg) => `"${arg.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`).join(" ")
    : undefined;
  const invocation = argsStr ? `${skillName} ${argsStr}` : skillName;

  let style: InvocationStyle;
  if (prefs.prefixStyle === "general") {
    // A general prefix ending in "/" or "@" is treated as slash-style (no backtick wrap).
    // "/" → slash, "@" → slash, "foo/" → slash, "call agent" → wrapped.
    const val = normalizeGeneralPrefix(prefs.generalPrefix);
    style = val.endsWith("/") || val.endsWith("@") ? "slash" : "wrapped";
  } else {
    style = AGENTS[agent]?.invocationStyle || "wrapped";
  }

  return style === "slash" ? invocation : `\`${invocation.replace(/`/g, "\\`")}\``;
}

export function withPrefix(text: string, prefix: string): string {
  if (!prefix) return text;
  const spacer = prefix.endsWith("/") || prefix.endsWith("@") || /\s$/.test(prefix) ? "" : " ";
  return `${prefix}${spacer}${text}`;
}
