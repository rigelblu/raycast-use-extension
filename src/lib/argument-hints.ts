export interface ParsedField {
  id: string;
  label: string;
  type: "text" | "dropdown";
  options?: string[];
  raw: string;
}

export interface ChoiceEntry {
  name: string;
  arg?: { label: string; raw: string };
}

export type ParseResult =
  | { mode: "fields"; fields: ParsedField[]; recognized: boolean }
  | { mode: "choices"; choices: ChoiceEntry[]; recognized: boolean };

function splitOutsideBrackets(hint: string): string[] {
  const segments: string[] = [];
  let current = "";
  let depth = 0;
  for (const ch of hint) {
    if (ch === "[") depth++;
    else if (ch === "]") depth = Math.max(0, depth - 1);
    if (ch === "|" && depth === 0) {
      segments.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  segments.push(current.trim());
  return segments.filter(Boolean);
}

function parseChoice(segment: string): ChoiceEntry {
  const argMatch = segment.match(/\[([^\]]+)\]|<([^>]+)>/);
  if (!argMatch) return { name: segment };
  const name = segment.replace(argMatch[0], "").trim();
  const label = (argMatch[1] || argMatch[2]).trim();
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

export function parseArgumentHint(hint: string): ParseResult {
  const segments = splitOutsideBrackets(hint);

  // Top-level | = choices (by design); inside [] = dropdown options
  if (segments.length >= 2) {
    const entries = segments.map(parseChoice);
    const merged = mergeChoices(entries);
    const recognized = merged.every((e) => /^[\w-]+$/.test(e.name));
    return { mode: "choices", choices: merged, recognized };
  }

  const fields: ParsedField[] = [];
  const regex = /\[([^\]]+)\]|<([^>]+)>/g;
  let match;
  let cursor = 0;
  let hasUnparsedHintText = false;
  while ((match = regex.exec(hint)) !== null) {
    const prefix = hint.slice(cursor, match.index);
    const labelMatch = prefix.match(/(?:^|\s)([\w-]+):\s*$/);
    const adjacentLabelMatch = prefix.endsWith(" ") || labelMatch ? undefined : prefix.match(/(?:^|\s)([\w-]+)$/);
    const labelPrefix = labelMatch?.[1] ?? adjacentLabelMatch?.[1];
    const labelStart = labelMatch?.index ?? adjacentLabelMatch?.index;
    const barePrefix = labelStart !== undefined ? prefix.slice(0, labelStart) : prefix;
    hasUnparsedHintText = !appendBareFields(fields, barePrefix) || hasUnparsedHintText;
    const idx = fields.length;

    if (match[1]) {
      // [content] — optional argument or dropdown
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
          type: "dropdown",
          options,
          raw: match[0],
        });
      } else {
        fields.push({
          id: `arg-${idx}`,
          label: labelPrefix ?? content.trim(),
          type: "text",
          raw: match[0],
        });
      }
    } else if (match[2]) {
      // <content> — optional text field
      fields.push({
        id: `arg-${idx}`,
        label: labelPrefix ?? match[2].trim(),
        type: "text",
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
        fields.push({ id: `arg-${i}`, label: words[i], type: "text", raw: words[i] });
      }
      return { mode: "fields", fields, recognized: true };
    }
    fields.push({
      id: "arg-0",
      label: "input",
      type: "text",
      raw: hint,
    });
    return { mode: "fields", fields, recognized: false };
  }

  hasUnparsedHintText = !appendBareFields(fields, hint.slice(cursor)) || hasUnparsedHintText;
  const recognized = !hasUnparsedHintText;

  return { mode: "fields", fields, recognized };
}

function appendBareFields(fields: ParsedField[], segment: string): boolean {
  const text = segment.trim();
  if (!text) return true;
  if (!/^[\w\s-]+$/.test(text)) return false;

  for (const word of text.split(/\s+/)) {
    fields.push({
      id: `arg-${fields.length}`,
      label: word,
      type: "text",
      raw: word,
    });
  }
  return true;
}
