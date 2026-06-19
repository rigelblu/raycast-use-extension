import { getPreferenceValues } from "@raycast/api";

export interface CommandPreferences {
  defaultAgent?: string;
  prefixStyle?: "native" | "general";
  generalPrefix?: string;
  argumentHintKey?: string;
  directExecPrefix?: string;
  directExecProperty?: string;
  customProjectName1?: string;
  customProjectPath1?: string;
  customProjectName2?: string;
  customProjectPath2?: string;
  customProjectName3?: string;
  customProjectPath3?: string;
  customProjectName4?: string;
  customProjectPath4?: string;
  customProjectName5?: string;
  customProjectPath5?: string;
}

export function getPrefs(): CommandPreferences {
  return getPreferenceValues<CommandPreferences>();
}
