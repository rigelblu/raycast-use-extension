import { useEffect, useState, useSyncExternalStore } from "react";
import {
  Action,
  ActionPanel,
  Clipboard,
  Detail,
  Icon,
  List,
  openCommandPreferences,
  popToRoot,
  showHUD,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { loadAllSkills } from "./lib/skill-discovery";
import type { Skill, Agent } from "./lib/types";
import { getPrefs, type CommandPreferences } from "./lib/preferences";
import { formatSkillInvocation, formatSkillPasteContent, formatSkillPastePreview } from "./lib/invocation";
import { detectPasteSurface, type PasteSurface } from "./lib/paste-target";
import { AGENTS, normalizeAgent, getSourceName } from "./lib/agent-config";
import { ArgumentForm } from "./argument-form";
import {
  clearTargetAgentOverride,
  getSelectedAgentFilterSnapshot,
  loadSelectedAgentFilter,
  loadTargetAgentOverride,
  saveSelectedAgentFilter,
  saveTargetAgentOverride,
  subscribeSelectedAgentFilter,
} from "./lib/target-agent";

function skillNameWithHint(skill: Skill): string {
  const hint = skill.argumentHint?.trim();
  return hint ? `${skill.name} ${hint}` : skill.name;
}

function skillPasteContent(
  skill: Skill,
  targetAgent: Agent,
  prefs: CommandPreferences,
  pasteSurface: PasteSurface,
): string {
  return formatSkillPastePreview(skill, targetAgent, prefs, pasteSurface);
}

async function pasteSkill(skill: Skill, targetAgent: Agent, prefs: CommandPreferences, args?: string[]) {
  const pasteSurface = await detectPasteSurface();
  await Clipboard.paste(formatSkillPasteContent(skill, targetAgent, prefs, pasteSurface, args));
}

async function pasteSkillPreview(skill: Skill, targetAgent: Agent, prefs: CommandPreferences) {
  const pasteSurface = await detectPasteSurface();
  await Clipboard.paste(skillPasteContent(skill, targetAgent, prefs, pasteSurface));
}

function directExecPrefix(): string {
  return getPrefs().directExecPrefix || "@!";
}

function skillSubtitle(skill: Skill): string {
  return skill.argumentHint || "";
}

function isDirectSkill(skill: Skill): boolean {
  return skill.disableModelInvocation === true;
}

function skillTitle(skill: Skill): string {
  return isDirectSkill(skill) ? `${directExecPrefix()} ${skill.name}` : skill.name;
}

function compareSkillsForList(a: Skill, b: Skill): number {
  const aDirect = isDirectSkill(a);
  const bDirect = isDirectSkill(b);
  if (aDirect !== bDirect) return aDirect ? -1 : 1;
  return a.name.localeCompare(b.name) || a.agent.localeCompare(b.agent);
}

export default function SearchSkills() {
  const { data, isLoading, error } = useCachedPromise(loadAllSkills);
  const defaultAgent = normalizeAgent(getPrefs().defaultAgent);
  const sharedSelectedAgent = useSyncExternalStore(
    subscribeSelectedAgentFilter,
    getSelectedAgentFilterSnapshot,
    getSelectedAgentFilterSnapshot,
  );
  const selectedAgent = sharedSelectedAgent ?? defaultAgent;
  const [targetAgentOverride, setTargetAgentOverride] = useState<Agent | undefined>();
  const [pasteSurface, setPasteSurface] = useState<PasteSurface>("default");
  // Bumped on pop-back to force AgentDropdown remount; Raycast's List.Dropdown ignores value prop changes.
  const [popCount, setPopCount] = useState(0);

  function refreshAgentState() {
    loadSelectedAgentFilter();
    loadTargetAgentOverride().then(setTargetAgentOverride);
  }

  useEffect(() => {
    refreshAgentState();
    detectPasteSurface().then(setPasteSurface);
  }, []);

  function handleAgentSelect(value: string) {
    saveSelectedAgentFilter(value === "all" ? "all" : (value as Agent));
    if (value !== "all") handleTargetAgentChange(value as Agent);
  }

  function handleTargetAgentChange(agent: Agent) {
    saveSelectedAgentFilter(agent);
    setTargetAgentOverride(agent);
    saveTargetAgentOverride(agent);
  }

  function handleTargetAgentReset() {
    setTargetAgentOverride(undefined);
    clearTargetAgentOverride();
  }

  function handlePop() {
    setPopCount((c) => c + 1);
  }

  if (error) {
    return (
      <List>
        <List.EmptyView title="Error loading skills" description={error.message} />
      </List>
    );
  }

  const allSkills = data?.skills ?? [];
  const allFailed = data?.errors.size && allSkills.length === 0;

  if (allFailed) {
    const errorMsgs = Array.from(data.errors.values()).join("; ");
    return (
      <List>
        <List.EmptyView title="No skill sources available" description={errorMsgs} />
      </List>
    );
  }

  const availableAgents = [...new Set(allSkills.flatMap((s) => s.agents ?? [s.agent]))].sort();
  const filteredSkills =
    selectedAgent === "all"
      ? allSkills
      : allSkills.filter((s) => (s.agents ?? [s.agent]).includes(selectedAgent as Agent));
  const skills = [...filteredSkills].sort(compareSkillsForList);

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search skills..."
      searchBarAccessory={
        <AgentDropdown
          key={`${selectedAgent}-${popCount}`}
          agents={availableAgents}
          selected={selectedAgent}
          onSelect={handleAgentSelect}
        />
      }
    >
      {skills.length === 0 && !isLoading ? (
        <List.EmptyView
          title="No skills found"
          description="No skill files found. Check your agent skill directories or enable more sources in preferences."
        />
      ) : (
        skills.map((skill) => (
          <SkillListItem
            key={`${skill.agent}:${skill.filePath}`}
            skill={skill}
            selectedAgent={selectedAgent}
            targetAgentOverride={targetAgentOverride}
            pasteSurface={pasteSurface}
            onTargetAgentChange={handleTargetAgentChange}
            onTargetAgentReset={handleTargetAgentReset}
            onPop={handlePop}
          />
        ))
      )}
    </List>
  );
}

function AgentDropdown({
  agents,
  selected,
  onSelect,
}: {
  agents: Agent[];
  selected: string;
  onSelect: (value: string) => void;
}) {
  const prefs = getPrefs();
  return (
    <List.Dropdown tooltip="Filter by Agent" value={selected} onChange={onSelect}>
      <List.Dropdown.Item title="All" value="all" />
      {agents.map((agent) => {
        const profile = AGENTS[agent];
        return (
          <List.Dropdown.Item
            key={agent}
            title={getSourceName(agent, prefs)}
            value={agent}
            icon={profile ? { source: profile.iconSource, tintColor: profile.color } : undefined}
          />
        );
      })}
    </List.Dropdown>
  );
}

function SkillListItem({
  skill,
  selectedAgent,
  targetAgentOverride,
  pasteSurface,
  onTargetAgentChange,
  onTargetAgentReset,
  onPop,
}: {
  skill: Skill;
  selectedAgent: string;
  targetAgentOverride?: Agent;
  pasteSurface: PasteSurface;
  onTargetAgentChange: (agent: Agent) => void;
  onTargetAgentReset: () => void;
  onPop?: () => void;
}) {
  const isDirect = skill.disableModelInvocation === true;
  const visibleAgentOverride = selectedAgent === "all" ? targetAgentOverride : (selectedAgent as Agent);
  const targetAgent = visibleAgentOverride ?? skill.agent;
  // Tag/icon reflect the agent the skill pastes as (active filter or override), not the arbitrary
  // primary chosen during realpath dedup — so filtering by Claude shows a Claude tag, not Amp.
  const profile = AGENTS[targetAgent];
  const color = profile?.color || "raycast-secondary-text";
  const iconSource = profile?.iconSource || Icon.CommandSymbol;
  const prefs = getPrefs();

  return (
    <List.Item
      title={skillTitle(skill)}
      subtitle={skillSubtitle(skill)}
      keywords={isDirect ? [skill.description, directExecPrefix(), "direct execution", "direct"] : [skill.description]}
      accessories={[
        {
          icon: { source: iconSource, tintColor: color },
          tag: {
            value: getSourceName(targetAgent, prefs),
            color,
          },
        },
      ]}
      actions={
        <ActionPanel>
          {skill.argumentHint ? (
            <Action.Push
              title="Fill & Paste"
              icon={Icon.TextInput}
              shortcut={{ modifiers: [], key: "tab" }}
              target={
                <ArgumentForm
                  skill={skill}
                  targetAgentOverride={visibleAgentOverride}
                  pasteSurface={pasteSurface}
                  onTargetAgentChange={onTargetAgentChange}
                  onTargetAgentReset={onTargetAgentReset}
                />
              }
              onPop={onPop}
            />
          ) : (
            <>
              <Action
                title="Paste to Active App"
                icon={Icon.Clipboard}
                shortcut={{ modifiers: [], key: "tab" }}
                onAction={async () => {
                  await pasteSkill(skill, targetAgent, prefs);
                }}
              />
              <Action
                title="Paste Without Prefix"
                icon={Icon.Text}
                shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
                onAction={async () => {
                  const surface = await detectPasteSurface();
                  await Clipboard.paste(
                    surface === "codex-desktop"
                      ? formatSkillPasteContent(skill, targetAgent, prefs, surface)
                      : formatSkillInvocation(targetAgent, skill.name, undefined, prefs),
                  );
                }}
              />
            </>
          )}
          <Action
            title="Paste Now"
            icon={Icon.Clipboard}
            shortcut={{ modifiers: ["cmd"], key: "return" }}
            onAction={async () => {
              await pasteSkillPreview(skill, targetAgent, prefs);
              await popToRoot();
            }}
          />
          {skill.argumentHint && (
            <Action
              title="Paste Arguments Only"
              icon={Icon.Text}
              shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
              onAction={async () => {
                await Clipboard.paste(skill.argumentHint ?? "");
              }}
            />
          )}
          {skill.body && (
            <Action
              title="Paste as Prompt"
              icon={Icon.Document}
              onAction={async () => {
                await Clipboard.paste(skill.body ?? "");
              }}
            />
          )}
          <Action.CopyToClipboard
            title="Copy Name"
            content={skill.name}
            shortcut={{ modifiers: ["cmd"], key: "c" }}
            onCopy={() => showHUD(`Copied: ${skill.name}`)}
          />
          {skill.argumentHint && (
            <Action.CopyToClipboard
              title="Copy with Arguments"
              content={skillNameWithHint(skill)}
              shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
              onCopy={() => showHUD(`Copied: ${skillNameWithHint(skill)}`)}
            />
          )}
          <Action.CopyToClipboard
            title="Copy as Slash Command"
            content={`/${skillNameWithHint(skill)}`}
            shortcut={{ modifiers: ["cmd"], key: "/" }}
            onCopy={() => showHUD(`Copied: /${skillNameWithHint(skill)}`)}
          />
          <Action.Push
            title="Show Detail"
            icon={Icon.Eye}
            shortcut={{ modifiers: ["cmd"], key: "d" }}
            target={
              <SkillDetailView
                skill={skill}
                targetAgentOverride={visibleAgentOverride}
                pasteSurface={pasteSurface}
                onTargetAgentChange={onTargetAgentChange}
                onTargetAgentReset={onTargetAgentReset}
                onPop={onPop}
              />
            }
            onPop={onPop}
          />
          {targetAgentOverride && <Action title="Reset Target Agent" onAction={onTargetAgentReset} />}
          <Action.Open title="Open Skill File" target={skill.filePath} shortcut={{ modifiers: ["cmd"], key: "o" }} />
          <Action
            title="Open Preferences"
            icon={Icon.Gear}
            shortcut={{ modifiers: ["cmd"], key: ";" }}
            onAction={openCommandPreferences}
          />
        </ActionPanel>
      }
    />
  );
}

function buildDetailMarkdown(
  skill: Skill,
  targetAgent: Agent,
  prefs: CommandPreferences,
  pasteSurface: PasteSurface,
): string {
  const isDirect = skill.disableModelInvocation === true;
  const lines: string[] = [];

  lines.push(skill.description);

  lines.push("", "---", "", `**Source:** ${getSourceName(skill.agent, prefs)}`);
  if (targetAgent !== skill.agent) lines.push(`**Target agent:** ${getSourceName(targetAgent, prefs)}`);

  const props: string[] = [];
  const directProp = prefs.directExecProperty || "disable-model-invocation";
  if (isDirect) {
    props.push(`- **${directProp}:** true *(short-form:* **\`${directExecPrefix()}\`** *direct execution)*`);
  }
  if (skill.extraProperties) {
    for (const [key, value] of Object.entries(skill.extraProperties)) {
      const val = typeof value === "object" && value !== null ? JSON.stringify(value) : String(value);
      props.push(`- **${key}:** ${val}`);
    }
  }

  if (props.length > 0) {
    lines.push("", "---", "", "### Properties", "", ...props);
  }

  if (skill.argumentHint) {
    lines.push("", "---", "", `**Argument hint:** \`${skill.argumentHint}\``);
  }

  lines.push("", "---", "", `**Paste into agent:** ${skillPasteContent(skill, targetAgent, prefs, pasteSurface)}`);

  if (skill.body) {
    const verbatimBody = skill.body.split("\n").map((line) => `    ${line}`);
    lines.push("", "---", "", "### Skill text", "", ...verbatimBody);
  }

  return lines.join("\n");
}

function SkillDetailView({
  skill,
  targetAgentOverride,
  pasteSurface,
  onTargetAgentChange,
  onTargetAgentReset,
  onPop,
}: {
  skill: Skill;
  targetAgentOverride?: Agent;
  pasteSurface: PasteSurface;
  onTargetAgentChange: (agent: Agent) => void;
  onTargetAgentReset: () => void;
  onPop?: () => void;
}) {
  const targetAgent = targetAgentOverride ?? skill.agent;
  const prefs = getPrefs();
  const markdown = buildDetailMarkdown(skill, targetAgent, prefs, pasteSurface);

  return (
    <Detail
      navigationTitle={skill.name}
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action
            title="Paste to Active App"
            icon={Icon.Clipboard}
            onAction={async () => {
              await pasteSkillPreview(skill, targetAgent, prefs);
              await popToRoot();
            }}
          />
          {skill.argumentHint && (
            <Action.Push
              title="Fill & Paste"
              icon={Icon.TextInput}
              target={
                <ArgumentForm
                  skill={skill}
                  targetAgentOverride={targetAgentOverride}
                  pasteSurface={pasteSurface}
                  onTargetAgentChange={onTargetAgentChange}
                  onTargetAgentReset={onTargetAgentReset}
                />
              }
              onPop={onPop}
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
            title="Copy Name"
            content={skill.name}
            shortcut={{ modifiers: ["cmd"], key: "c" }}
            onCopy={() => showHUD(`Copied: ${skill.name}`)}
          />
          {targetAgentOverride && <Action title="Reset Target Agent" onAction={onTargetAgentReset} />}
          <Action.Open title="Open Skill File" target={skill.filePath} shortcut={{ modifiers: ["cmd"], key: "o" }} />
        </ActionPanel>
      }
    />
  );
}
