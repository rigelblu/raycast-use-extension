import type { ParsedDropdownField, ParsedField } from "./argument-hints";

const DELIMITER_CELL = /^-{3,}$/;
const LOOKUP_TITLE = /^(.+?) — ([\w-]+) × ([\w-]+)$/;
const RICH_CELL =
  /\*\*|__|`|!?\[[^\]]*\](?:\([^)]*\)|\[[^\]]*\])|<(?:[a-z][a-z\d+.-]{1,31}:[^<>\s]*|[^<>\s@]+@[^<>\s@]+|\/?a(?:\s+[^<>]*)?)>/i;
const REFERENCE_DEFINITION = /^ {0,3}\[([^\]]+)\]:\s*\S+/;
const SHORTCUT_REFERENCE = /!?\[([^\]]+)\]/g;

interface LookupRow {
  readonly descriptor: string;
  readonly cells: ReadonlyMap<string, string>;
}

export interface BoundArgumentHelpLookup {
  readonly output: string;
  readonly rowArgument: string;
  readonly rowFieldId: string;
  readonly columnArgument: string;
  readonly columnFieldId: string;
  readonly rows: ReadonlyMap<string, LookupRow>;
}

export interface ParsedArgumentHelp {
  readonly lookups: readonly BoundArgumentHelpLookup[];
  readonly prose?: string;
}

export interface ResolvedArgumentHelp {
  readonly fieldId: string;
  readonly text: string;
}

interface LookupTable {
  output: string;
  rowArgument: string;
  columnArgument: string;
  header: string[];
  rows: string[][];
}

function normalizeReferenceLabel(label: string): string {
  return label.trim().replace(/\s+/g, " ").toLowerCase();
}

function hasRichMarkup(cell: string, referenceLabels: ReadonlySet<string>): boolean {
  if (RICH_CELL.test(cell)) return true;

  for (const match of cell.matchAll(SHORTCUT_REFERENCE)) {
    if (referenceLabels.has(normalizeReferenceLabel(match[1]))) return true;
  }
  return false;
}

function parsePlainPipeRow(line: string, referenceLabels: ReadonlySet<string>): string[] | undefined {
  const trimmed = line.trim();
  if (!trimmed.startsWith("|") || !trimmed.endsWith("|") || trimmed.includes("\\|")) return undefined;

  const cells = trimmed
    .slice(1, -1)
    .split("|")
    .map((cell) => cell.trim());
  return cells.some((cell) => !cell || hasRichMarkup(cell, referenceLabels)) ? undefined : cells;
}

function isCandidateTableRow(line: string): boolean {
  const trimmed = line.trim();
  return trimmed.length > 0 && (trimmed.startsWith("|") || trimmed.endsWith("|"));
}

function parseLookupTable(
  lines: string[],
  start: number,
  referenceLabels: ReadonlySet<string>,
): { table: LookupTable; end: number } | undefined {
  const title = lines[start].trim().match(LOOKUP_TITLE);
  if (!title || hasRichMarkup(title[1], referenceLabels) || title[1].includes("|")) return undefined;

  const header = parsePlainPipeRow(lines[start + 1] ?? "", referenceLabels);
  const delimiter = parsePlainPipeRow(lines[start + 2] ?? "", referenceLabels);
  if (!header || !delimiter || header.length !== delimiter.length) return undefined;
  if (!delimiter.every((cell) => DELIMITER_CELL.test(cell))) return undefined;

  let end = start + 3;
  while (end < lines.length && isCandidateTableRow(lines[end])) end += 1;

  const rows = lines.slice(start + 3, end).map((line) => parsePlainPipeRow(line, referenceLabels));
  if (rows.length === 0 || rows.some((row) => !row || row.length !== header.length)) return undefined;

  return {
    table: {
      output: title[1].trim(),
      rowArgument: title[2],
      columnArgument: title[3],
      header,
      rows: rows as string[][],
    },
    end,
  };
}

function exactDropdown(fields: readonly ParsedField[], label: string): ParsedDropdownField | undefined {
  const matches = fields.filter((field) => field.label === label);
  return matches.length === 1 && matches[0].kind === "dropdown" ? matches[0] : undefined;
}

function isCompleteOptionSet(values: readonly string[], options: readonly string[]): boolean {
  return (
    values.length === options.length &&
    new Set(values).size === values.length &&
    new Set(options).size === options.length &&
    options.every((value) => values.includes(value))
  );
}

function bindLookup(table: LookupTable, fields: readonly ParsedField[]): BoundArgumentHelpLookup | undefined {
  const rowField = exactDropdown(fields, table.rowArgument);
  const columnField = exactDropdown(fields, table.columnArgument);
  if (!rowField || !columnField || rowField.id === columnField.id) return undefined;
  if (table.header[0] !== table.rowArgument) return undefined;

  const columns = table.header.slice(1);
  if (!isCompleteOptionSet(columns, columnField.options)) return undefined;

  const rows = new Map<string, LookupRow>();
  for (const cells of table.rows) {
    const separator = cells[0].indexOf(" — ");
    if (separator <= 0 || separator === cells[0].length - 3) return undefined;

    const value = cells[0].slice(0, separator);
    const descriptor = cells[0].slice(separator + 3);
    if (rows.has(value)) return undefined;

    rows.set(value, {
      descriptor,
      cells: new Map(columns.map((column, index) => [column, cells[index + 1]])),
    });
  }

  if (!isCompleteOptionSet(Array.from(rows.keys()), rowField.options)) return undefined;

  return {
    output: table.output,
    rowArgument: table.rowArgument,
    rowFieldId: rowField.id,
    columnArgument: table.columnArgument,
    columnFieldId: columnField.id,
    rows,
  };
}

export function parseArgumentHelp(
  argumentHelp: string | undefined,
  fields: readonly ParsedField[],
): ParsedArgumentHelp {
  if (!argumentHelp) return { lookups: [] };

  const lines = argumentHelp.split("\n");
  const referenceLabels = new Set(
    lines.flatMap((line) => {
      const match = line.match(REFERENCE_DEFINITION);
      return match ? [normalizeReferenceLabel(match[1])] : [];
    }),
  );
  const proseLines: string[] = [];
  const lookups: BoundArgumentHelpLookup[] = [];

  for (let index = 0; index < lines.length; ) {
    const parsed = parseLookupTable(lines, index, referenceLabels);
    if (!parsed) {
      proseLines.push(lines[index]);
      index += 1;
      continue;
    }

    const lookup = bindLookup(parsed.table, fields);
    if (lookup) lookups.push(lookup);
    index = parsed.end;
    if (lines[index]?.trim() === "") index += 1;
  }

  const signatures = new Map<string, number>();
  for (const lookup of lookups) {
    const signature = `${lookup.output}\0${lookup.rowFieldId}\0${lookup.columnFieldId}`;
    signatures.set(signature, (signatures.get(signature) ?? 0) + 1);
  }

  const prose = proseLines.join("\n");
  return {
    lookups: lookups.filter(
      (lookup) => signatures.get(`${lookup.output}\0${lookup.rowFieldId}\0${lookup.columnFieldId}`) === 1,
    ),
    ...(prose ? { prose } : {}),
  };
}

export function resolveArgumentHelp(
  lookups: readonly BoundArgumentHelpLookup[],
  values: Readonly<Record<string, string | undefined>>,
): ResolvedArgumentHelp[] {
  return lookups.flatMap((lookup) => {
    const rowValue = values[lookup.rowFieldId];
    const columnValue = values[lookup.columnFieldId];
    if (rowValue === undefined || columnValue === undefined) return [];

    const row = lookup.rows.get(rowValue);
    const cell = row?.cells.get(columnValue);
    if (!row || !cell) return [];

    return [
      {
        fieldId: lookup.rowFieldId,
        text: `${row.descriptor} — ${lookup.output}: ${cell}`,
      },
    ];
  });
}
