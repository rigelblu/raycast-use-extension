import { LocalStorage } from "@raycast/api";
import { normalizeAgent } from "./agent-config";
import type { Agent } from "./types";

const TARGET_AGENT_OVERRIDE_KEY = "targetAgentOverride";

export async function loadTargetAgentOverride(): Promise<Agent | undefined> {
  const stored = await LocalStorage.getItem<string>(TARGET_AGENT_OVERRIDE_KEY);
  const normalized = normalizeAgent(stored);
  return normalized === "all" ? undefined : (normalized as Agent);
}

export function saveTargetAgentOverride(agent: Agent): Promise<void> {
  return LocalStorage.setItem(TARGET_AGENT_OVERRIDE_KEY, agent);
}

export function clearTargetAgentOverride(): Promise<void> {
  return LocalStorage.removeItem(TARGET_AGENT_OVERRIDE_KEY);
}

const AGENT_FILTER_KEY = "selectedAgent";
export type SelectedAgentFilter = Agent | "all";

let selectedAgentFilterSnapshot: SelectedAgentFilter | undefined;
const selectedAgentFilterListeners = new Set<() => void>();

function setSelectedAgentFilterSnapshot(agent: SelectedAgentFilter | undefined) {
  if (selectedAgentFilterSnapshot === agent) return;
  selectedAgentFilterSnapshot = agent;
  for (const listener of selectedAgentFilterListeners) listener();
}

export function getSelectedAgentFilterSnapshot(): SelectedAgentFilter | undefined {
  return selectedAgentFilterSnapshot;
}

export function subscribeSelectedAgentFilter(listener: () => void): () => void {
  selectedAgentFilterListeners.add(listener);
  return () => selectedAgentFilterListeners.delete(listener);
}

export async function loadSelectedAgentFilter(): Promise<SelectedAgentFilter | undefined> {
  const stored = await LocalStorage.getItem<string>(AGENT_FILTER_KEY);
  const normalized = stored ? (normalizeAgent(stored) as SelectedAgentFilter) : undefined;
  if (selectedAgentFilterSnapshot === undefined) setSelectedAgentFilterSnapshot(normalized);
  return normalized;
}

export function saveSelectedAgentFilter(agent: SelectedAgentFilter): Promise<void> {
  setSelectedAgentFilterSnapshot(agent);
  return LocalStorage.setItem(AGENT_FILTER_KEY, agent);
}
