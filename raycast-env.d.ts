/// <reference types="@raycast/api">

/* 🚧 🚧 🚧
 * This file is auto-generated from the extension's manifest.
 * Do not modify manually. Instead, update the `package.json` file.
 * 🚧 🚧 🚧 */

/* eslint-disable @typescript-eslint/ban-types */

type ExtensionPreferences = {}

/** Preferences accessible in all the extension's commands */
declare type Preferences = ExtensionPreferences

declare namespace Preferences {
  /** Preferences accessible in the `search-skills` command */
  export type SearchSkills = ExtensionPreferences & {
  /** Default Agent Filter - Agent source selected by default when opening the command */
  "defaultAgent": "all" | "amp" | "antigravity" | "claude-code" | "codex" | "copilot" | "droid" | "gemini" | "kilo" | "opencode" | "pi" | "warp" | "customProject1" | "customProject2" | "customProject3" | "customProject4" | "customProject5",
  /** Prefix Style - Choose between agent-native prefixes or a consistent general prefix */
  "prefixStyle": "native" | "general",
  /** General Prefix - The prefix to use when 'Consistent General Prefix' is selected */
  "generalPrefix": string,
  /** Advanced - Frontmatter property name used for argument hints (default: argument-hint) */
  "argumentHintKey"?: string,
  /** Direct Execution - Prefix shown before direct execution skills (default: @!) */
  "directExecPrefix"?: string,
  /** Direct Execution Property - Frontmatter property that identifies a direct execution skill (default: disable-model-invocation) */
  "directExecProperty"?: string,
  /** Project 1 Skills - Display name (shown in filter and tag). */
  "customProjectName1"?: string,
  /** Project 1 Path - Folder to scan for SKILL.md files. */
  "customProjectPath1"?: string,
  /** Project 2 Skills - Display name (shown in filter and tag). */
  "customProjectName2"?: string,
  /** Project 2 Path - Folder to scan for SKILL.md files. */
  "customProjectPath2"?: string,
  /** Project 3 Skills - Display name (shown in filter and tag). */
  "customProjectName3"?: string,
  /** Project 3 Path - Folder to scan for SKILL.md files. */
  "customProjectPath3"?: string,
  /** Project 4 Skills - Display name (shown in filter and tag). */
  "customProjectName4"?: string,
  /** Project 4 Path - Folder to scan for SKILL.md files. */
  "customProjectPath4"?: string,
  /** Project 5 Skills - Display name (shown in filter and tag). */
  "customProjectName5"?: string,
  /** Project 5 Path - Folder to scan for SKILL.md files. */
  "customProjectPath5"?: string
}
}

declare namespace Arguments {
  /** Arguments passed to the `search-skills` command */
  export type SearchSkills = {}
}

