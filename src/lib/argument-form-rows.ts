import type { ParsedField } from "./argument-hints";
import type { ResolvedArgumentHelp } from "./argument-help";

export type ArgumentFormRow =
  | { kind: "field"; field: ParsedField; fieldIndex: number }
  | { kind: "contextual-help"; fieldId: string; helpIndex: number; text: string };

export function buildArgumentFormRows(
  fields: readonly ParsedField[],
  contextualHelp: readonly ResolvedArgumentHelp[],
): ArgumentFormRow[] {
  return fields.flatMap((field, fieldIndex) => [
    { kind: "field" as const, field, fieldIndex },
    ...contextualHelp
      .filter((help) => help.fieldId === field.id)
      .map((help, helpIndex) => ({
        kind: "contextual-help" as const,
        fieldId: field.id,
        helpIndex,
        text: help.text,
      })),
  ]);
}
