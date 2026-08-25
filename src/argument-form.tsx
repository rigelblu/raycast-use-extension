import { useEffect, useMemo, useState } from "react";
import { Action, ActionPanel, Form, Icon, popToRoot, showHUD, Clipboard } from "@raycast/api";
import type { Skill, Agent } from "./lib/types";
import { formatCodexDesktopInvocation, formatSkillInvocation, getPastePrefix, withPrefix } from "./lib/invocation";
import { detectPasteSurface, type PasteSurface } from "./lib/paste-target";
import { getPrefs } from "./lib/preferences";
import { fillPromptBody } from "./lib/prompt-template";
import { parseArgumentHint, warningForArgumentHint } from "./lib/argument-hints";
import { AGENTS, getSourceName } from "./lib/agent-config";
import {
  clearTargetAgentOverride,
  loadTargetAgentOverride,
  saveSelectedAgentFilter,
  saveTargetAgentOverride,
} from "./lib/target-agent";

export function ArgumentForm({
  skill,
  targetAgentOverride,
  pasteSurface: initialPasteSurface = "default",
  onTargetAgentChange,
  onTargetAgentReset,
}: {
  skill: Skill;
  targetAgentOverride?: Agent;
  pasteSurface?: PasteSurface;
  onTargetAgentChange?: (agent: Agent) => void;
  onTargetAgentReset?: () => void;
}) {
  const parsedArgumentHint = useMemo(() => parseArgumentHint(skill.argumentHint ?? ""), [skill.argumentHint]);
  const argumentHintWarning = useMemo(
    () => warningForArgumentHint(skill.argumentHint ?? "", parsedArgumentHint.assessment),
    [parsedArgumentHint.assessment, skill.argumentHint],
  );
  const [selectedAgent, setSelectedAgent] = useState<Agent>(targetAgentOverride ?? skill.agent);
  const [hasTargetAgentOverride, setHasTargetAgentOverride] = useState(Boolean(targetAgentOverride));
  const [pasteSurface, setPasteSurface] = useState<PasteSurface>(initialPasteSurface);
  const prefs = getPrefs();
  const prefix = getPastePrefix(selectedAgent, prefs);

  const [selectedChoice, setSelectedChoice] = useState(
    parsedArgumentHint.mode === "choices" ? (parsedArgumentHint.choices[0]?.name ?? "") : "",
  );
  const [argValue, setArgValue] = useState("");

  const [values, setValues] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    if (parsedArgumentHint.mode === "fields") {
      for (const field of parsedArgumentHint.fields) {
        init[field.id] = field.kind === "dropdown" ? field.options[0] : "";
      }
    }
    return init;
  });

  const activeChoice =
    parsedArgumentHint.mode === "choices"
      ? parsedArgumentHint.choices.find((choice) => choice.name === selectedChoice)
      : undefined;

  function collectArgParts(): string[] {
    if (parsedArgumentHint.mode === "choices") {
      return argValue ? [selectedChoice, argValue] : [selectedChoice];
    }
    return parsedArgumentHint.fields.map((field) => values[field.id] || "");
  }

  function collectPromptParts(): string[] {
    if (parsedArgumentHint.mode === "choices") {
      if (!activeChoice?.arg) return [selectedChoice];
      return [selectedChoice, argValue || placeholderFor(activeChoice.arg.label)];
    }
    return parsedArgumentHint.fields.map((field) => values[field.id] || placeholderFor(field.label));
  }

  function buildArgsText(): string {
    return collectArgParts().join(" ");
  }

  function buildCodexDesktopPasteText(): string {
    const invocationArgs = collectArgParts();
    return formatCodexDesktopInvocation(
      skill.name,
      skill.filePath,
      invocationArgs.length > 0 ? invocationArgs : undefined,
    );
  }

  function buildAgentPasteText(): string {
    if (parsedArgumentHint.mode === "choices") {
      // Choice is a keyword — include unquoted as part of the name. Only quote user-supplied args.
      const userArgs = argValue ? [argValue] : undefined;
      return formatSkillInvocation(selectedAgent, `${skill.name} ${selectedChoice}`, userArgs, prefs);
    }
    const parts = collectArgParts();
    return formatSkillInvocation(selectedAgent, skill.name, parts.length > 0 ? parts : undefined, prefs);
  }

  function buildPasteTextForSurface(surface: PasteSurface): string {
    return surface === "codex-desktop" ? buildCodexDesktopPasteText() : buildAgentPasteText();
  }

  function buildPasteContentForSurface(surface: PasteSurface): string {
    const text = buildPasteTextForSurface(surface);
    return surface === "codex-desktop" ? text : withPrefix(text, prefix);
  }

  const pastePreview = useMemo(
    () => buildPasteTextForSurface(pasteSurface),
    [parsedArgumentHint, selectedChoice, argValue, values, selectedAgent, skill.name, skill.filePath, pasteSurface],
  );

  const pasteContent = useMemo(() => buildPasteContentForSurface(pasteSurface), [pastePreview, pasteSurface, prefix]);

  const argsText = useMemo(() => buildArgsText(), [parsedArgumentHint, selectedChoice, argValue, values]);

  const promptPreview = useMemo(
    () => (skill.body ? fillPromptBody(skill.body, collectPromptParts()) : ""),
    [parsedArgumentHint, selectedChoice, argValue, values, skill.body],
  );

  const availableAgents = Object.keys(AGENTS) as Agent[];

  useEffect(() => {
    let cancelled = false;

    detectPasteSurface().then((surface) => {
      if (!cancelled) setPasteSurface(surface);
    });

    if (targetAgentOverride) {
      setSelectedAgent(targetAgentOverride);
      setHasTargetAgentOverride(true);
    } else {
      loadTargetAgentOverride().then((agent) => {
        if (cancelled) return;
        setSelectedAgent(agent ?? skill.agent);
        setHasTargetAgentOverride(Boolean(agent));
      });
    }

    return () => {
      cancelled = true;
    };
  }, [targetAgentOverride, skill.agent]);

  function handleAgentChange(value: string) {
    const agent = value as Agent;
    setSelectedAgent(agent);
    setHasTargetAgentOverride(true);
    saveSelectedAgentFilter(agent);
    saveTargetAgentOverride(agent);
    onTargetAgentChange?.(agent);
  }

  function handleTargetAgentReset() {
    setSelectedAgent(skill.agent);
    setHasTargetAgentOverride(false);
    clearTargetAgentOverride();
    onTargetAgentReset?.();
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Paste"
            icon={Icon.Clipboard}
            onSubmit={async () => {
              const surface = await detectPasteSurface();
              await Clipboard.paste(buildPasteContentForSurface(surface));
              await popToRoot();
            }}
          />
          <Action
            title="Paste Without Prefix"
            icon={Icon.Text}
            shortcut={{ modifiers: ["cmd", "opt"], key: "p" }}
            onAction={async () => {
              const surface = await detectPasteSurface();
              await Clipboard.paste(buildPasteTextForSurface(surface));
              await popToRoot();
            }}
          />
          {argsText ? (
            <Action.Paste
              title="Paste Arguments Only"
              icon={Icon.Text}
              shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
              content={argsText}
              onPaste={() => popToRoot()}
            />
          ) : (
            <Action
              title="Paste Arguments Only"
              icon={Icon.Text}
              shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
              onAction={() => showHUD("No arguments to paste")}
            />
          )}
          {skill.body && (
            <Action.Paste
              title="Paste Filled Prompt"
              icon={Icon.Document}
              shortcut={{ modifiers: ["cmd", "shift"], key: "v" }}
              content={promptPreview}
              onPaste={() => popToRoot()}
            />
          )}
          {skill.body && (
            <Action.Paste
              title="Paste as Prompt"
              icon={Icon.Document}
              content={skill.body}
              onPaste={() => popToRoot()}
            />
          )}
          <Action.CopyToClipboard
            title="Copy Invocation"
            content={pastePreview}
            shortcut={{ modifiers: ["cmd"], key: "c" }}
            onCopy={() => showHUD(`Copied: ${pastePreview}`)}
          />
          {hasTargetAgentOverride && <Action title="Reset Target Agent" onAction={handleTargetAgentReset} />}
        </ActionPanel>
      }
    >
      <Form.Description title="Skill" text={skill.name} />
      <Form.Dropdown id="agent" title="Agent" value={selectedAgent} onChange={handleAgentChange}>
        {availableAgents.map((agent) => (
          <Form.Dropdown.Item
            key={agent}
            value={agent}
            title={getSourceName(agent, prefs)}
            icon={{ source: AGENTS[agent].iconSource, tintColor: AGENTS[agent].color }}
          />
        ))}
      </Form.Dropdown>
      {skill.description && <Form.Description title="Description" text={skill.description} />}
      {skill.extraProperties &&
        Object.entries(skill.extraProperties).map(([key, value]) => (
          <Form.Description
            key={key}
            title={key}
            text={typeof value === "object" && value !== null ? JSON.stringify(value) : String(value)}
          />
        ))}
      <Form.Separator />

      {parsedArgumentHint.mode === "choices" ? (
        <>
          <Form.Dropdown
            id="choice"
            title="Choice"
            autoFocus
            value={selectedChoice}
            onChange={(val) => {
              setSelectedChoice(val);
              setArgValue("");
            }}
          >
            {parsedArgumentHint.choices.map((choice) => (
              <Form.Dropdown.Item key={choice.name} value={choice.name} title={choice.name} />
            ))}
          </Form.Dropdown>
          {activeChoice?.arg && (
            <Form.TextField
              key={`arg-${selectedChoice}`}
              id="choice-arg"
              title={activeChoice.arg.label}
              placeholder={activeChoice.arg.raw}
              value={argValue}
              onChange={setArgValue}
            />
          )}
        </>
      ) : (
        parsedArgumentHint.fields.map((field, index) =>
          field.kind === "dropdown" ? (
            <Form.Dropdown
              key={field.id}
              id={field.id}
              title={field.label}
              autoFocus={index === 0}
              value={values[field.id]}
              onChange={(newVal) => setValues((prev) => ({ ...prev, [field.id]: newVal }))}
            >
              {field.options.map((opt) => (
                <Form.Dropdown.Item key={opt} value={opt} title={opt} />
              ))}
            </Form.Dropdown>
          ) : (
            <Form.TextField
              key={field.id}
              id={field.id}
              title={field.label}
              placeholder={field.raw}
              autoFocus={index === 0}
              value={values[field.id]}
              onChange={(newVal) => setValues((prev) => ({ ...prev, [field.id]: newVal }))}
            />
          ),
        )
      )}

      {/* Parser confidence qualifies the fields, so it stays closest to them; the author's note follows.
          A hint can carry both rows, so neither hides the other. */}
      {argumentHintWarning && <Form.Description title={argumentHintWarning.title} text={argumentHintWarning.text} />}
      {parsedArgumentHint.annotation && <Form.Description title="Hint" text={parsedArgumentHint.annotation} />}
      <Form.Separator />
      <Form.Description title="Paste into agent" text={pasteContent} />
    </Form>
  );
}

function placeholderFor(label: string): string {
  return `<${label}>`;
}
