export interface ParsedTextField {
  id: string;
  label: string;
  kind: "text";
  raw: string;
}

export interface ParsedDropdownField {
  id: string;
  label: string;
  kind: "dropdown";
  options: string[];
  raw: string;
}

export type ParsedField = ParsedTextField | ParsedDropdownField;

export interface ChoiceEntry {
  name: string;
  arg?: { label: string; raw: string };
}

export type ParseAssessment = "clean" | "suspect" | "unreadable";

export interface ArgumentHintWarning {
  title: string;
  text: string;
}

type ParsedStructure = { mode: "fields"; fields: ParsedField[] } | { mode: "choices"; choices: ChoiceEntry[] };

export type ParseResult =
  | { mode: "fields"; fields: ParsedField[]; assessment: ParseAssessment; annotation?: string }
  | { mode: "choices"; choices: ChoiceEntry[]; assessment: ParseAssessment; annotation?: string };

// Author-facing syntax and worked examples live in docs/argument-hint-grammar.md. Keep parser
// semantics bound to that document through test/argument-hints.corpus.test.ts.

/**
 * Splits a trailing `# note` off a hint so it can be shown as guidance instead of parsed.
 *
 * Three conditions, each earning its place against a real hint:
 * - outside every bracket, or `<feature-brief-path | #id>` loses its second alternative
 * - followed by whitespace, so a bare `#id` at the top level still reads as a value
 * - starting the hint or preceded by whitespace, so `<subdir># note` isn't split mid-token
 */
function splitAnnotation(hint: string): { hint: string; annotation?: string } {
  let depth = 0;
  for (let i = 0; i < hint.length; i++) {
    const ch = hint[i];
    if (ch === "[" || ch === "<") depth++;
    else if (ch === "]" || ch === ">") depth = Math.max(0, depth - 1);
    if (ch !== "#" || depth > 0) continue;
    if (i > 0 && !/\s/.test(hint[i - 1])) continue;
    if (!/\s/.test(hint[i + 1] ?? "")) continue;
    const annotation = hint.slice(i + 1).trim();
    return annotation ? { hint: hint.slice(0, i).trim(), annotation } : { hint };
  }
  return { hint };
}

function splitOutsideBrackets(hint: string): string[] {
  const segments: string[] = [];
  let current = "";
  let depth = 0;
  for (const ch of hint) {
    if (ch === "[" || ch === "<") depth++;
    else if (ch === "]" || ch === ">") depth = Math.max(0, depth - 1);
    if (ch === "|" && depth === 0) {
      segments.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  segments.push(current.trim());
  return segments;
}

function parseChoice(segment: string): ChoiceEntry {
  const argMatch = segment.match(/\[([^\]]+)\]|<([^>]+)>/);
  if (!argMatch) return { name: segment };
  const name = segment.replace(argMatch[0], "").trim();
  const label = (argMatch[1] || argMatch[2]).trim().replace(/^<(.*)>$/, "$1");
  return { name, arg: { label, raw: argMatch[0] } };
}

function mergeChoices(entries: ChoiceEntry[]): ChoiceEntry[] {
  const byName = new Map<string, ChoiceEntry>();
  for (const entry of entries) {
    const existing = byName.get(entry.name);
    if (existing) {
      if (entry.arg && !existing.arg) {
        byName.set(entry.name, entry);
      }
    } else {
      byName.set(entry.name, entry);
    }
  }
  return Array.from(byName.values());
}

export function parseArgumentHint(rawHint: string): ParseResult {
  const { hint, annotation } = splitAnnotation(rawHint);
  const structure = parseHintBody(hint);
  const assessment = assess(hint, structure);

  if (structure.mode === "fields") {
    return { ...structure, assessment, ...(annotation ? { annotation } : {}) };
  }
  return { ...structure, assessment, ...(annotation ? { annotation } : {}) };
}

export function warningForArgumentHint(rawHint: string, assessment: ParseAssessment): ArgumentHintWarning | undefined {
  if (assessment === "clean") return undefined;
  const { hint } = splitAnnotation(rawHint);
  return {
    title: "Hint partly unread",
    text: `Could not confidently match: ${hint}`,
  };
}

function parseHintBody(hint: string): ParsedStructure {
  if (!hint.trim()) return { mode: "fields", fields: [] };

  const segments = splitOutsideBrackets(hint).filter(Boolean);

  // Top-level | = choices (by design); inside [] = dropdown options
  if (segments.length >= 2) {
    const entries = segments.map(parseChoice);
    const merged = mergeChoices(entries);
    return { mode: "choices", choices: merged };
  }

  const fields: ParsedField[] = [];
  const regex = /\[([^\]]+)\]|<([^>]+)>/g;
  let match;
  let cursor = 0;
  while ((match = regex.exec(hint)) !== null) {
    const prefix = hint.slice(cursor, match.index);
    const labelMatch = prefix.match(/(?:^|\s)([\w-]+):\s*$/);
    const adjacentLabelMatch = prefix.endsWith(" ") || labelMatch ? undefined : prefix.match(/(?:^|\s)([\w-]+)$/);
    const labelPrefix = labelMatch?.[1] ?? adjacentLabelMatch?.[1];
    const labelStart = labelMatch?.index ?? adjacentLabelMatch?.index;
    const barePrefix = labelStart !== undefined ? prefix.slice(0, labelStart) : prefix;
    appendBareFields(fields, barePrefix);
    const idx = fields.length;

    if (match[1]) {
      // A square group is a dropdown only when it carries alternatives; otherwise it is text.
      const content = match[1];
      const options = content.includes("|")
        ? content
            .split("|")
            .map((o) => o.trim())
            .filter(Boolean)
        : [];
      if (options.length >= 2) {
        fields.push({
          id: `arg-${idx}`,
          label: labelPrefix ?? options[0],
          kind: "dropdown",
          options,
          raw: match[0],
        });
      } else {
        fields.push({
          id: `arg-${idx}`,
          label: labelPrefix ?? content.trim(),
          kind: "text",
          raw: match[0],
        });
      }
    } else if (match[2]) {
      // An angle group stays one text field even when its value lists alternatives.
      fields.push({
        id: `arg-${idx}`,
        label: labelPrefix ?? match[2].trim(),
        kind: "text",
        raw: match[0],
      });
    }
    cursor = regex.lastIndex;
  }

  if (fields.length === 0) {
    // Bare words like "arg1 arg2 arg3" → one field per word
    const words = hint.split(/\s+/).filter(Boolean);
    if (words.length >= 2) {
      for (let i = 0; i < words.length; i++) {
        fields.push({ id: `arg-${i}`, label: words[i], kind: "text", raw: words[i] });
      }
      return { mode: "fields", fields };
    }
    if (words.length === 1 && isBareWord(words[0])) {
      fields.push({ id: "arg-0", label: words[0], kind: "text", raw: words[0] });
      return { mode: "fields", fields };
    }
    fields.push({
      id: "arg-0",
      label: "input",
      kind: "text",
      raw: hint,
    });
    return { mode: "fields", fields };
  }

  appendBareFields(fields, hint.slice(cursor));
  return { mode: "fields", fields };
}

function assess(hint: string, structure: ParsedStructure): ParseAssessment {
  const labels =
    structure.mode === "choices"
      ? structure.choices.flatMap((choice) => (choice.arg ? [choice.name, choice.arg.label] : [choice.name]))
      : structure.fields.map((field) => field.label);

  if (labels.some(hasLeakedSyntax)) return "suspect";
  if (!accountsForHint(hint, structure) && !isBareWord(hint)) return "unreadable";
  return "clean";
}

function accountsForHint(hint: string, structure: ParsedStructure): boolean {
  if (structure.mode === "choices") {
    const authoredChoices = splitOutsideBrackets(hint).map(parseChoice);
    return authoredChoices.every((authored) => {
      if (!isBareWord(authored.name)) return false;
      const parsed = structure.choices.find((choice) => choice.name === authored.name);
      if (!parsed) return false;
      if (!authored.arg) return true;
      return parsed.arg?.label === authored.arg.label && parsed.arg.raw === authored.arg.raw;
    });
  }

  let cursor = 0;
  for (const field of structure.fields) {
    const index = hint.indexOf(field.raw, cursor);
    if (index < 0) return false;

    const gap = hint.slice(cursor, index);
    const isBracketGroup =
      (field.raw.startsWith("[") && field.raw.endsWith("]")) || (field.raw.startsWith("<") && field.raw.endsWith(">"));
    if (isBracketGroup) {
      if (!isFieldGap(gap, field.label)) return false;
    } else if (!isBareWord(field.raw) || gap.trim()) {
      return false;
    }
    cursor = index + field.raw.length;
  }
  return !hint.slice(cursor).trim();
}

function isFieldGap(gap: string, label: string): boolean {
  if (!gap.trim()) return true;
  const escapedLabel = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`^\\s*${escapedLabel}:?\\s*$`).test(gap);
}

function hasLeakedSyntax(label: string): boolean {
  return /[[\]<>|]/.test(label) || label.split("<").length !== label.split(">").length;
}

function isBareWord(value: string): boolean {
  return /^[\w-]+$/.test(value.trim());
}

function appendBareFields(fields: ParsedField[], segment: string): void {
  const text = segment.trim();
  if (!text || !/^[\w\s-]+$/.test(text)) return;

  for (const word of text.split(/\s+/)) {
    fields.push({
      id: `arg-${fields.length}`,
      label: word,
      kind: "text",
      raw: word,
    });
  }
}
