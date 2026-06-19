import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import matter from "gray-matter";
import type { Skill, Agent, AgentConfig } from "./types";

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
  agent: Agent,
  argumentHintKey?: string,
  directExecProperty?: string,
): Skill | null {
  let data: Record<string, unknown>;
  let body: string;

  try {
    ({ data, content: body } = matter(content));
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

  const knownOriginalKeys = new Set(
    [name, description, hint, disableFlag]
      .filter((r): r is { originalKey: string; value: unknown } => r !== undefined)
      .map((r) => r.originalKey),
  );

  const extraProperties: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    if (!knownOriginalKeys.has(key)) extraProperties[key] = value;
  }

  const trimmedBody = body.trim();

  return {
    name: name.value,
    description: description.value,
    agent,
    filePath,
    ...(trimmedBody ? { body: trimmedBody } : {}),
    argumentHint: typeof hint?.value === "string" ? hint.value : undefined,
    disableModelInvocation: disableFlag?.value === true || disableFlag?.value === "true" ? true : undefined,
    ...(Object.keys(extraProperties).length > 0 ? { extraProperties } : {}),
  };
}

export async function getAgentSkills(
  config: AgentConfig,
  argumentHintKey?: string,
  directExecProperty?: string,
): Promise<{ skills: Skill[]; error?: string }> {
  let entries;
  try {
    entries = await readdir(config.basePath, { withFileTypes: true });
  } catch (err: unknown) {
    // Directory doesn't exist — silent for default paths, error for user-configured
    if (typeof err === "object" && err !== null && "code" in err && err.code === "ENOENT") {
      return config.userConfigured
        ? { skills: [], error: `Skill directory not found: ${config.basePath}` }
        : { skills: [] };
    }
    return {
      skills: [],
      error: `Cannot access ${config.basePath}: ${err instanceof Error ? err.message : String(err)}`,
    };
  }

  const skillResults = await Promise.all(
    entries
      .filter((e) => e.isDirectory() && !e.name.startsWith("."))
      .map(async (dir) => {
        const filePath = join(config.basePath, dir.name, SKILL_FILENAME);
        try {
          const content = await readFile(filePath, "utf-8");
          return buildSkill(content, filePath, config.agent, argumentHintKey, directExecProperty);
        } catch (err) {
          console.warn(`Failed to read skill file ${filePath}:`, err);
          return null;
        }
      }),
  );

  return { skills: skillResults.filter((skill): skill is Skill => skill !== null) };
}
