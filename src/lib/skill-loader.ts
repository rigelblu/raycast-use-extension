import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import matter from "gray-matter";
import type { Skill, Agent, ScanTarget } from "./types";

const SKILL_FILENAME = "SKILL.md";

function normalizeToCamel(str: string): string {
  return str.replace(/[-_]([a-zA-Z])/g, (_, c: string) => c.toUpperCase());
}

function findValue(
  data: Record<string, unknown>,
  targetKey: string,
): { originalKey: string; value: unknown } | undefined {
  for (const [key, value] of Object.entries(data)) {
    if (normalizeToCamel(key).toLowerCase() === targetKey.toLowerCase()) return { originalKey: key, value };
  }
  return undefined;
}

function buildSkill(
  content: string,
  filePath: string,
  agents: Agent[],
  argumentHintKey?: string,
  directExecProperty?: string,
): Skill | null {
  let data: Record<string, unknown>;
  let body: string;

  try {
    // Pass options so gray-matter skips its module-global cache, which is keyed by the file's
    // entire content and never evicted. It only memoizes across loads; within one load every
    // file is parsed once, so caching costs the whole corpus in retained heap and buys nothing.
    ({ data, content: body } = matter(content, {}));
  } catch {
    console.warn(`Failed to parse YAML frontmatter: ${filePath}`);
    return null;
  }

  const name = findValue(data, "name");
  const description = findValue(data, "description");
  if (typeof name?.value !== "string" || !name.value || typeof description?.value !== "string" || !description.value) {
    console.warn(`Skipping skill (missing name or description): ${filePath}`);
    return null;
  }

  const hintKey = argumentHintKey ? normalizeToCamel(argumentHintKey) : "argumentHint";
  const hint = findValue(data, hintKey);

  const directProp = directExecProperty ? normalizeToCamel(directExecProperty) : "disableModelInvocation";
  const disableFlag = findValue(data, directProp);
  const metadata = data.metadata;
  const argumentHelpValue =
    typeof metadata === "object" &&
    metadata !== null &&
    !Array.isArray(metadata) &&
    typeof (metadata as Record<string, unknown>)["argument-help"] === "string"
      ? (metadata as Record<string, unknown>)["argument-help"]
      : undefined;
  const argumentHelp =
    typeof argumentHelpValue === "string" && argumentHelpValue.trim().length > 0 ? argumentHelpValue : undefined;

  const knownOriginalKeys = new Set(
    [name, description, hint, disableFlag]
      .filter((r): r is { originalKey: string; value: unknown } => r !== undefined)
      .map((r) => r.originalKey),
  );

  const extraProperties: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    if (knownOriginalKeys.has(key)) continue;

    if (key === "metadata" && argumentHelp !== undefined) {
      const remainingMetadata = { ...(value as Record<string, unknown>) };
      delete remainingMetadata["argument-help"];
      if (Object.keys(remainingMetadata).length > 0) extraProperties[key] = remainingMetadata;
      continue;
    }

    extraProperties[key] = value;
  }

  const trimmedBody = body.trim();

  return {
    name: name.value,
    description: description.value,
    agent: agents[0],
    agents: [...agents],
    filePath,
    ...(trimmedBody ? { body: trimmedBody } : {}),
    argumentHint: typeof hint?.value === "string" ? hint.value : undefined,
    ...(argumentHelp ? { argumentHelp } : {}),
    disableModelInvocation: disableFlag?.value === true || disableFlag?.value === "true" ? true : undefined,
    ...(Object.keys(extraProperties).length > 0 ? { extraProperties } : {}),
  };
}

export async function getAgentSkills(
  target: ScanTarget,
  argumentHintKey?: string,
  directExecProperty?: string,
): Promise<{ skills: Skill[]; error?: string }> {
  let entries;
  try {
    entries = await readdir(target.basePath, { withFileTypes: true });
  } catch (err: unknown) {
    // Directory doesn't exist — silent for default paths, error for user-configured
    if (typeof err === "object" && err !== null && "code" in err && err.code === "ENOENT") {
      return target.userConfigured
        ? { skills: [], error: `Skill directory not found: ${target.basePath}` }
        : { skills: [] };
    }
    return {
      skills: [],
      error: `Cannot access ${target.basePath}: ${err instanceof Error ? err.message : String(err)}`,
    };
  }

  const skillResults = await Promise.all(
    entries
      .filter((e) => e.isDirectory() && !e.name.startsWith("."))
      .map(async (dir) => {
        const filePath = join(target.basePath, dir.name, SKILL_FILENAME);
        try {
          const content = await readFile(filePath, "utf-8");
          return buildSkill(content, filePath, target.agents, argumentHintKey, directExecProperty);
        } catch (err) {
          console.warn(`Failed to read skill file ${filePath}:`, err);
          return null;
        }
      }),
  );

  return { skills: skillResults.filter((skill): skill is Skill => skill !== null) };
}
