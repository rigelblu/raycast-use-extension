import type { Agent } from "./types";
import type { Skill } from "./types";
import { AGENTS, type InvocationStyle } from "./agent-config";
import type { CommandPreferences } from "./preferences";
import type { PasteSurface } from "./paste-target";

const DEFAULT_GENERAL_PREFIX = "use skill";

const PASTE_PREFIX_BY_STYLE: Record<InvocationStyle, string> = {
  slash: "/",
  wrapped: DEFAULT_GENERAL_PREFIX,
};

/** Sigils that attach straight to a skill name — no separating space, no backtick wrap. */
const SIGIL_PREFIXES = new Set(["/", "@", "$", ":"]);

/** True when the prefix ends in a sigil: "/", "@", "$", or a word ending in one like "foo/". */
function isSigilPrefix(prefix: string): boolean {
  return SIGIL_PREFIXES.has(prefix.slice(-1));
}

function normalizeGeneralPrefix(prefix: string | undefined): string {
  return prefix?.trim() || DEFAULT_GENERAL_PREFIX;
}

function quoteArg(arg: string): string {
  return `"${arg.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

function escapeMarkdownLinkLabel(label: string): string {
  return label.replace(/\\/g, "\\\\").replace(/\]/g, "\\]");
}

function escapeMarkdownLinkDestination(destination: string): string {
  return destination.replace(/\\/g, "\\\\").replace(/\)/g, "\\)");
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
  const argsStr = args?.length ? args.map(quoteArg).join(" ") : undefined;
  const invocation = argsStr ? `${skillName} ${argsStr}` : skillName;

  let style: InvocationStyle;
  if (prefs.prefixStyle === "general") {
    // A general prefix ending in a sigil is treated as slash-style (no backtick wrap).
    // "/" → slash, "@" → slash, "$" → slash, "foo/" → slash, "call agent" → wrapped.
    const val = normalizeGeneralPrefix(prefs.generalPrefix);
    style = isSigilPrefix(val) ? "slash" : "wrapped";
  } else {
    style = AGENTS[agent]?.invocationStyle || "wrapped";
  }

  return style === "slash" ? invocation : `\`${invocation.replace(/`/g, "\\`")}\``;
}

export function formatCodexDesktopInvocation(skillName: string, filePath: string, args?: string[]): string {
  const link = `[$${escapeMarkdownLinkLabel(skillName)}](${escapeMarkdownLinkDestination(filePath)})`;
  return args?.length ? `${link} ${args.map(quoteArg).join(" ")}` : link;
}

export function formatSkillPasteContent(
  skill: Skill,
  targetAgent: Agent,
  prefs: CommandPreferences,
  surface: PasteSurface,
  args?: string[],
): string {
  if (surface === "codex-desktop") {
    return formatCodexDesktopInvocation(skill.name, skill.filePath, args);
  }

  return withPrefix(formatSkillInvocation(targetAgent, skill.name, args, prefs), getPastePrefix(targetAgent, prefs));
}

export function formatSkillPastePreview(
  skill: Skill,
  targetAgent: Agent,
  prefs: CommandPreferences,
  surface: PasteSurface,
): string {
  const hint = skill.argumentHint?.trim();

  if (surface === "codex-desktop") {
    const invocation = formatCodexDesktopInvocation(skill.name, skill.filePath);
    return hint ? `${invocation} ${hint}` : invocation;
  }

  const invocation = formatSkillInvocation(targetAgent, skill.name, undefined, prefs);
  const preview = hint ? `${invocation} ${hint}` : invocation;
  return withPrefix(preview, getPastePrefix(targetAgent, prefs));
}

export function withPrefix(text: string, prefix: string): string {
  if (!prefix) return text;
  // A sigil attaches directly; a prefix the author already spaced needs no second space.
  const spacer = isSigilPrefix(prefix) || /\s$/.test(prefix) ? "" : " ";
  return `${prefix}${spacer}${text}`;
}
