export type ArgumentFormTailRow = { kind: "description"; title: string; text: string } | { kind: "separator" };

export function buildArgumentFormTailRows({
  warning,
  hint,
  argumentHelp,
  pasteContent,
}: {
  warning?: { title: string; text: string };
  hint?: string;
  argumentHelp?: string;
  pasteContent: string;
}): ArgumentFormTailRow[] {
  return [
    ...(warning ? [{ kind: "description" as const, title: warning.title, text: warning.text }] : []),
    ...(hint ? [{ kind: "description" as const, title: "Hint", text: hint }] : []),
    ...(argumentHelp ? [{ kind: "description" as const, title: "Argument help", text: argumentHelp }] : []),
    { kind: "separator" },
    { kind: "description", title: "Paste into agent", text: pasteContent },
  ];
}
