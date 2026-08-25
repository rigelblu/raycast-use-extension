import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { performance } from "node:perf_hooks";
import { resolve } from "node:path";
import { parseArgumentHint, warningForArgumentHint, type ParseResult } from "../src/lib/argument-hints";

// Captured from loadAllSkills() on 2026-08-25. Keep the strings explicit: changing this corpus should
// require reading the diff, not blindly re-blessing an opaque snapshot.
const CORPUS: ReadonlyArray<readonly [skill: string, hint: string]> = [
  ["about-me-you-us-update", "who:[all | me | you | us]"],
  ["about-me-you-us-recall", "who:[all | me | you | us] depth-of-understanding:[minimal | whole]"],
  ["agent-message", "type:[recap] <context>"],
  ["breadcrumbs-leave-notes", "mode:[new | append]"],
  [
    "call-friend-agent",
    "mode:[headless | team-agent | thread | interactive] friend:[claude | codex | gemini] how_deeply_capable:[1 | 5 | 8 | 13 | 20] how_thorough:[1 | 5 | 8 | 13 | 20] why_calling:[advise-me | delegate-task | dogfood-it | feedback | review | review-changes | second-take | talk-through | custom] <custom_instructions>",
  ],
  [
    "call-friend-review-post",
    "source:[path, URL, or pasted text — or empty to use what's already in context] ask:[full | logline]",
  ],
  ["call-friend-roget-thesaurus", "word:[word, phrase, or a meaning you're circling] show-thinking:[true | false]"],
  [
    "conduct-product-dimensions",
    "mode:[interactive | autonomous] product:<name; defaults via 01_foundation/01_metadata.md>",
  ],
  ["conduct-product-dimensions-check", "scope:[full | dimensions] <slice or change-id; inferred if omitted>"],
  ["convo-compare-responses", "response-a response-b"],
  [
    "culture-norms-use-external-tmp",
    "<subdir>  # optional subpath to create under the tmp root, e.g. zed-rbf-slice-binaries",
  ],
  ["deliver-feat", "env:[local | staging] <change-id>"],
  ["design-feat", "project:[false | true]"],
  ["design-feat-assign-rank", "incorporate:[yes | no] type:[file | context | paste] on:<file-path | pasted text>"],
  ["design-feat-comment-add", "target-brief:<feature-brief-path | #id> <comment>"],
  ["design-feat-decisions", "target-brief:<feature-brief-path | #id> <decision>"],
  ["design-feat-discover-with-me", "[brief-path | #id | foundation] <batch>"],
  ["design-feat-form-function-with-agents", "design-briefs-path <screen-view-name>"],
  ["design-feat-form-function-with-figma-agents", "<design-briefs-path> [screen-view-name]"],
  ["work-through-together", "file"],
  ["design-feat-grill-me", "[feature-brief-path | #id | ship-plan-path] <batch>"],
  ["design-feat-notes-to-briefs", "done-item:[remove | checked]"],
  ["design-feat-reconcile", "brief:<path; default inferred from context>"],
  ["design-feat-upstream", "[issue | pr | both]"],
  ["design-feat-warp-spec", "brief:<path> id:<GH issue number or feature slug; else from the brief>"],
  ["design-form-ephemeral", "where:[web | figma]"],
  ["design-q-from-blank-slate", "on:[technical system design | skill | code | brief | <custom>]"],
  ["design-q-regretable", "what"],
  ["do-next-draft", "who:[builder | generalist] on-what:<default: from workblock> on-where:<default: workblock dir>"],
  ["do-task", "task-description context"],
  ["docs-to-changelog", "scope:[session-context | branch | commit] changelog-path"],
  ["reduce-entropy-writing", "files"],
  ["eval-agent", "<agent-or-behavior>"],
  ["eval-results", "what to judge"],
  ["execute-autonomously-until", "[stop-condition]  # e.g. 'all tests pass', 'design complete'"],
  ["execute-until", "[completion-criteria]  # e.g. 'all tests pass', 'feature complete'"],
  ["feedback-dogfood-it", "<what> <where>"],
  ["find-my-bearings", "mode:[look | map] <location>"],
  ["follow-repo-metadata-guardrails", "product-name team-name"],
  ["founding-role", "role:[builder | generalist] name:<name> where:<path>"],
  [
    "how-capable-how-thorough",
    "how_deeply_capable:[1 | 5 | 8 | 13 | 20] how_thorough:[1 | 5 | 8 | 13 | 20] family:[claude | codex | gemini]",
  ],
  ["how-you-create-art-design", "on:[the brief | the piece | the idea | a practice rep]"],
  ["how-you-know", "on:[target]"],
  ["how-you-know-design", "on:[screen | flow | experience brief | product decision]"],
  [
    "how-you-know-eng",
    "lens:[core | all | reliability | api-design | behavior | concurrency | correctness | distributed | durability | functional | load-overload | observability | performance-methodology | security | security-and-hardening | ui-framework | abstraction | api-name | complexity | config-locality | data-architecture | data-structure | edge-cases | entropy | file-structure | fix-improve | scoping | theory-fit | type-safety] on:[target]",
  ],
  ["how-you-talk-design", "on:[design | screen | the intent you're putting into words]"],
  ["how-you-think-like", "who:[professional | data scientist | machine learning engineer]"],
  ["how-you-write", "what:[by-intent | default | brief | for_agents | log | question | recap | recommendation | scqa]"],
  ["learn", "type:[more | explain | teach | coach] topic [with-respect-to]"],
  ["learn-aristocratic-tutor", "on:[what-done | reference] <reference>"],
  ["manage-skills", "action:[create | update-readme] skill-name"],
  ["manage-skills-embody-into", "[skill-name or find] writing <wisdom>"],
  ["manage-skills-improve", "skill:[skill-name | path] depth:[simple | deep] <how>"],
  ["manage-skills-improve-skill-to-use", "[write | improve] context"],
  ["mindset-prioritization-lenses", "lens:[leverage | riskiest assumption | impact | roi | smallest | ruthless]"],
  ["norms-set-quality-bar", "bar:[1 | 2 | 3 | 4 | 5] function:[general | eng | skill]"],
  ["present", "type:[comparision | memory] what-to-present"],
  ["prj-product-ship-plan", "create | use | retrofit | archive-released"],
  ["prj-rb-drive", "<product-root>  # optional; defaults to the nearest ancestor holding metadata.toml or rb-drive"],
  [
    "prj-setup",
    "action:[scaffold | retrofit] type:[new venture | new product | new features | new capabilities | improvements | fixes | refactor] project:<name or path> <product-name> include:[fork | fork share-public]",
  ],
  ["prj-use", "do:[location | use]"],
  ["prj-wb-plan", "create | use"],
  ["reduce-entropy-code", "<files>"],
  ["reformat-md-table", "files type:[table | bullets]"],
  ["replace-with-pseudocode", "code-with-line-range"],
  ["review-adversarial", "on:<target>"],
  [
    "review-code-quality",
    "depth:[simple | fast | deep] on:[change-id | uncommitted | bookmark | file] where:<id or file-path> how_deeply_capable:[1 | 5 | 8 | 13 | 20] how_thorough:[1 | 5 | 8 | 13 | 20]",
  ],
  ["review-design-feat-brief", "<feature-file-path>"],
  ["role-communicator-writer", "[topic or context]"],
  ["role-how-zinsser-edits", "contentdo:[file | text]"],
  [
    "role-identify-who-ee",
    "who:[other | generalist | eng | pe | pde | de | te | sec | sre | devops | perf | marketer | storyteller] on:[topic | path]",
  ],
  ["session-block-break", "type:[take | resume]"],
  ["session-block-create", "<workblock-name> [yes | no]"],
  ["session-block-memories", "type:[create | read | update | dream] <memory>"],
  ["session-block-pick-up", "depth:[minimal | full] role:[generalist | builder] <workblock_name>"],
  ["session-block-start", "[minimal | full] [builder | generalist]"],
  ["session-block-start-fresh", "role:[builder | generalist]"],
  ["session-block-understanding", "action:[create | read | update | learn | archive] where:<dir>"],
  ["session-block-wrap-up", "type:[continue | close] <pick-up-next>"],
  ["situation-conductor", "<spawn>"],
  [
    "situation-delegate",
    "mode:[headless | interactive] friend:[claude | codex | gemini] how_deeply_capable:[1 | 5 | 8 | 13 | 20] how_thorough:[1 | 5 | 8 | 13 | 20] <situation>",
  ],
  ["state-machine", "action:[design-for | migrate-from | use] file-or-ref <state-machine-path>"],
  [
    "understand-eng-system-design",
    "mode:[interactive | autonomous] scope:<files | change-id | default:@src> motivation:[issue | new feat | improve feat | contribute]",
  ],
  ["vcs-change", "prepare [<rev>] | describe [<rev>] | update <rev> | add-product [<rev>] | commit | update-all"],
  ["vcs-change-summary", "type:[conventional | product] <feature-id>"],
  ["vcs-jj", "status | log [rev] | show [rev] | new | branch <name>"],
  ["vcs-pr", "title [bookmark] | create [bookmark] | stack"],
  [
    "vcs-pr-description",
    "mode:[content | submit] scope:<bookmark | revision> desc-review:[shallow | deep] <verify-from-docs>",
  ],
  ["vcs-rewrite", "commit <rev> | bookmark <name> | abandon-empty"],
  ["vcs-storyline-commit-history", "target:<id or range; defaults to @>"],
  [
    "verify-changes-yourself",
    "output:[show | save-to-test-results | save-to-feat-brief | show-and-save-to-test-results | show-and-save-to-feat-brief]",
  ],
  ["verify-scope-just-right", "station:[need | brief | build] <target path or change-id; inferred if omitted>"],
  [
    "what-would",
    "who:[other | gen | deng | eng | pe | pd | pde | de | te | sec | sre | sys-admin | devops | perf | marketer | devrel | storyteller | writer | editor | figma | <custom role>] on:[topic | <file-path>]",
  ],
  ["workblock", "[setup | location] <workblock-id-or-project-name>  # no mode → location"],
];

type ExpectedCorpusShape =
  | { mode: "fields"; fields: Array<["text", string] | ["dropdown", string, string[]]>; annotation?: string }
  | { mode: "choices"; choices: Array<[string] | [string, string]>; annotation?: string };

// These are deliberately reviewable expectations, not a generated snapshot blob. A parser change
// must preserve each mode, label, control kind, option list, and annotation or explain the diff.
const EXPECTED_CORPUS_SHAPES: Record<string, ExpectedCorpusShape> = {
  "about-me-you-us-update": { mode: "fields", fields: [["dropdown", "who", ["all", "me", "you", "us"]]] },
  "about-me-you-us-recall": {
    mode: "fields",
    fields: [
      ["dropdown", "who", ["all", "me", "you", "us"]],
      ["dropdown", "depth-of-understanding", ["minimal", "whole"]],
    ],
  },
  "agent-message": { mode: "fields", fields: [["text", "type"], ["text", "context"]] },
  "breadcrumbs-leave-notes": { mode: "fields", fields: [["dropdown", "mode", ["new", "append"]]] },
  "call-friend-agent": {
    mode: "fields",
    fields: [
      ["dropdown", "mode", ["headless", "team-agent", "thread", "interactive"]],
      ["dropdown", "friend", ["claude", "codex", "gemini"]],
      ["dropdown", "how_deeply_capable", ["1", "5", "8", "13", "20"]],
      ["dropdown", "how_thorough", ["1", "5", "8", "13", "20"]],
      [
        "dropdown",
        "why_calling",
        ["advise-me", "delegate-task", "dogfood-it", "feedback", "review", "review-changes", "second-take", "talk-through", "custom"],
      ],
      ["text", "custom_instructions"],
    ],
  },
  "call-friend-review-post": { mode: "fields", fields: [["text", "source"], ["dropdown", "ask", ["full", "logline"]]] },
  "call-friend-roget-thesaurus": { mode: "fields", fields: [["text", "word"], ["dropdown", "show-thinking", ["true", "false"]]] },
  "conduct-product-dimensions": { mode: "fields", fields: [["dropdown", "mode", ["interactive", "autonomous"]], ["text", "product"]] },
  "conduct-product-dimensions-check": { mode: "fields", fields: [["dropdown", "scope", ["full", "dimensions"]], ["text", "slice or change-id; inferred if omitted"]] },
  "convo-compare-responses": { mode: "fields", fields: [["text", "response-a"], ["text", "response-b"]] },
  "culture-norms-use-external-tmp": { mode: "fields", fields: [["text", "subdir"]], annotation: "optional subpath to create under the tmp root, e.g. zed-rbf-slice-binaries" },
  "deliver-feat": { mode: "fields", fields: [["dropdown", "env", ["local", "staging"]], ["text", "change-id"]] },
  "design-feat": { mode: "fields", fields: [["dropdown", "project", ["false", "true"]]] },
  "design-feat-assign-rank": { mode: "fields", fields: [["dropdown", "incorporate", ["yes", "no"]], ["dropdown", "type", ["file", "context", "paste"]], ["text", "on"]] },
  "design-feat-comment-add": { mode: "fields", fields: [["text", "target-brief"], ["text", "comment"]] },
  "design-feat-decisions": { mode: "fields", fields: [["text", "target-brief"], ["text", "decision"]] },
  "design-feat-discover-with-me": { mode: "fields", fields: [["dropdown", "brief-path", ["brief-path", "#id", "foundation"]], ["text", "batch"]] },
  "design-feat-form-function-with-agents": { mode: "fields", fields: [["text", "design-briefs-path"], ["text", "screen-view-name"]] },
  "design-feat-form-function-with-figma-agents": { mode: "fields", fields: [["text", "design-briefs-path"], ["text", "screen-view-name"]] },
  "work-through-together": { mode: "fields", fields: [["text", "file"]] },
  "design-feat-grill-me": { mode: "fields", fields: [["dropdown", "feature-brief-path", ["feature-brief-path", "#id", "ship-plan-path"]], ["text", "batch"]] },
  "design-feat-notes-to-briefs": { mode: "fields", fields: [["dropdown", "done-item", ["remove", "checked"]]] },
  "design-feat-reconcile": { mode: "fields", fields: [["text", "brief"]] },
  "design-feat-upstream": { mode: "fields", fields: [["dropdown", "issue", ["issue", "pr", "both"]]] },
  "design-feat-warp-spec": { mode: "fields", fields: [["text", "brief"], ["text", "id"]] },
  "design-form-ephemeral": { mode: "fields", fields: [["dropdown", "where", ["web", "figma"]]] },
  "design-q-from-blank-slate": { mode: "fields", fields: [["dropdown", "on", ["technical system design", "skill", "code", "brief", "<custom>"]]] },
  "design-q-regretable": { mode: "fields", fields: [["text", "what"]] },
  "do-next-draft": { mode: "fields", fields: [["dropdown", "who", ["builder", "generalist"]], ["text", "on-what"], ["text", "on-where"]] },
  "do-task": { mode: "fields", fields: [["text", "task-description"], ["text", "context"]] },
  "docs-to-changelog": { mode: "fields", fields: [["dropdown", "scope", ["session-context", "branch", "commit"]], ["text", "changelog-path"]] },
  "reduce-entropy-writing": { mode: "fields", fields: [["text", "files"]] },
  "eval-agent": { mode: "fields", fields: [["text", "agent-or-behavior"]] },
  "eval-results": { mode: "fields", fields: [["text", "what"], ["text", "to"], ["text", "judge"]] },
  "execute-autonomously-until": { mode: "fields", fields: [["text", "stop-condition"]], annotation: "e.g. 'all tests pass', 'design complete'" },
  "execute-until": { mode: "fields", fields: [["text", "completion-criteria"]], annotation: "e.g. 'all tests pass', 'feature complete'" },
  "feedback-dogfood-it": { mode: "fields", fields: [["text", "what"], ["text", "where"]] },
  "find-my-bearings": { mode: "fields", fields: [["dropdown", "mode", ["look", "map"]], ["text", "location"]] },
  "follow-repo-metadata-guardrails": { mode: "fields", fields: [["text", "product-name"], ["text", "team-name"]] },
  "founding-role": { mode: "fields", fields: [["dropdown", "role", ["builder", "generalist"]], ["text", "name"], ["text", "where"]] },
  "how-capable-how-thorough": { mode: "fields", fields: [["dropdown", "how_deeply_capable", ["1", "5", "8", "13", "20"]], ["dropdown", "how_thorough", ["1", "5", "8", "13", "20"]], ["dropdown", "family", ["claude", "codex", "gemini"]]] },
  "how-you-create-art-design": { mode: "fields", fields: [["dropdown", "on", ["the brief", "the piece", "the idea", "a practice rep"]]] },
  "how-you-know": { mode: "fields", fields: [["text", "on"]] },
  "how-you-know-design": { mode: "fields", fields: [["dropdown", "on", ["screen", "flow", "experience brief", "product decision"]]] },
  "how-you-know-eng": { mode: "fields", fields: [["dropdown", "lens", ["core", "all", "reliability", "api-design", "behavior", "concurrency", "correctness", "distributed", "durability", "functional", "load-overload", "observability", "performance-methodology", "security", "security-and-hardening", "ui-framework", "abstraction", "api-name", "complexity", "config-locality", "data-architecture", "data-structure", "edge-cases", "entropy", "file-structure", "fix-improve", "scoping", "theory-fit", "type-safety"]], ["text", "on"]] },
  "how-you-talk-design": { mode: "fields", fields: [["dropdown", "on", ["design", "screen", "the intent you're putting into words"]]] },
  "how-you-think-like": { mode: "fields", fields: [["dropdown", "who", ["professional", "data scientist", "machine learning engineer"]]] },
  "how-you-write": { mode: "fields", fields: [["dropdown", "what", ["by-intent", "default", "brief", "for_agents", "log", "question", "recap", "recommendation", "scqa"]]] },
  "learn": { mode: "fields", fields: [["dropdown", "type", ["more", "explain", "teach", "coach"]], ["text", "topic"], ["text", "with-respect-to"]] },
  "learn-aristocratic-tutor": { mode: "fields", fields: [["dropdown", "on", ["what-done", "reference"]], ["text", "reference"]] },
  "manage-skills": { mode: "fields", fields: [["dropdown", "action", ["create", "update-readme"]], ["text", "skill-name"]] },
  "manage-skills-embody-into": { mode: "fields", fields: [["text", "skill-name or find"], ["text", "writing"], ["text", "wisdom"]] },
  "manage-skills-improve": { mode: "fields", fields: [["dropdown", "skill", ["skill-name", "path"]], ["dropdown", "depth", ["simple", "deep"]], ["text", "how"]] },
  "manage-skills-improve-skill-to-use": { mode: "fields", fields: [["dropdown", "write", ["write", "improve"]], ["text", "context"]] },
  "mindset-prioritization-lenses": { mode: "fields", fields: [["dropdown", "lens", ["leverage", "riskiest assumption", "impact", "roi", "smallest", "ruthless"]]] },
  "norms-set-quality-bar": { mode: "fields", fields: [["dropdown", "bar", ["1", "2", "3", "4", "5"]], ["dropdown", "function", ["general", "eng", "skill"]]] },
  "present": { mode: "fields", fields: [["dropdown", "type", ["comparision", "memory"]], ["text", "what-to-present"]] },
  "prj-product-ship-plan": { mode: "choices", choices: [["create"], ["use"], ["retrofit"], ["archive-released"]] },
  "prj-rb-drive": { mode: "fields", fields: [["text", "product-root"]], annotation: "optional; defaults to the nearest ancestor holding metadata.toml or rb-drive" },
  "prj-setup": { mode: "fields", fields: [["dropdown", "action", ["scaffold", "retrofit"]], ["dropdown", "type", ["new venture", "new product", "new features", "new capabilities", "improvements", "fixes", "refactor"]], ["text", "project"], ["text", "product-name"], ["dropdown", "include", ["fork", "fork share-public"]]] },
  "prj-use": { mode: "fields", fields: [["dropdown", "do", ["location", "use"]]] },
  "prj-wb-plan": { mode: "choices", choices: [["create"], ["use"]] },
  "reduce-entropy-code": { mode: "fields", fields: [["text", "files"]] },
  "reformat-md-table": { mode: "fields", fields: [["text", "files"], ["dropdown", "type", ["table", "bullets"]]] },
  "replace-with-pseudocode": { mode: "fields", fields: [["text", "code-with-line-range"]] },
  "review-adversarial": { mode: "fields", fields: [["text", "on"]] },
  "review-code-quality": { mode: "fields", fields: [["dropdown", "depth", ["simple", "fast", "deep"]], ["dropdown", "on", ["change-id", "uncommitted", "bookmark", "file"]], ["text", "where"], ["dropdown", "how_deeply_capable", ["1", "5", "8", "13", "20"]], ["dropdown", "how_thorough", ["1", "5", "8", "13", "20"]]] },
  "review-design-feat-brief": { mode: "fields", fields: [["text", "feature-file-path"]] },
  "role-communicator-writer": { mode: "fields", fields: [["text", "topic or context"]] },
  "role-how-zinsser-edits": { mode: "fields", fields: [["dropdown", "contentdo", ["file", "text"]]] },
  "role-identify-who-ee": { mode: "fields", fields: [["dropdown", "who", ["other", "generalist", "eng", "pe", "pde", "de", "te", "sec", "sre", "devops", "perf", "marketer", "storyteller"]], ["dropdown", "on", ["topic", "path"]]] },
  "session-block-break": { mode: "fields", fields: [["dropdown", "type", ["take", "resume"]]] },
  "session-block-create": { mode: "fields", fields: [["text", "workblock-name"], ["dropdown", "yes", ["yes", "no"]]] },
  "session-block-memories": { mode: "fields", fields: [["dropdown", "type", ["create", "read", "update", "dream"]], ["text", "memory"]] },
  "session-block-pick-up": { mode: "fields", fields: [["dropdown", "depth", ["minimal", "full"]], ["dropdown", "role", ["generalist", "builder"]], ["text", "workblock_name"]] },
  "session-block-start": { mode: "fields", fields: [["dropdown", "minimal", ["minimal", "full"]], ["dropdown", "builder", ["builder", "generalist"]]] },
  "session-block-start-fresh": { mode: "fields", fields: [["dropdown", "role", ["builder", "generalist"]]] },
  "session-block-understanding": { mode: "fields", fields: [["dropdown", "action", ["create", "read", "update", "learn", "archive"]], ["text", "where"]] },
  "session-block-wrap-up": { mode: "fields", fields: [["dropdown", "type", ["continue", "close"]], ["text", "pick-up-next"]] },
  "situation-conductor": { mode: "fields", fields: [["text", "spawn"]] },
  "situation-delegate": { mode: "fields", fields: [["dropdown", "mode", ["headless", "interactive"]], ["dropdown", "friend", ["claude", "codex", "gemini"]], ["dropdown", "how_deeply_capable", ["1", "5", "8", "13", "20"]], ["dropdown", "how_thorough", ["1", "5", "8", "13", "20"]], ["text", "situation"]] },
  "state-machine": { mode: "fields", fields: [["dropdown", "action", ["design-for", "migrate-from", "use"]], ["text", "file-or-ref"], ["text", "state-machine-path"]] },
  "understand-eng-system-design": { mode: "fields", fields: [["dropdown", "mode", ["interactive", "autonomous"]], ["text", "scope"], ["dropdown", "motivation", ["issue", "new feat", "improve feat", "contribute"]]] },
  "vcs-change": { mode: "choices", choices: [["prepare", "rev"], ["describe", "rev"], ["update", "rev"], ["add-product", "rev"], ["commit"], ["update-all"]] },
  "vcs-change-summary": { mode: "fields", fields: [["dropdown", "type", ["conventional", "product"]], ["text", "feature-id"]] },
  "vcs-jj": { mode: "choices", choices: [["status"], ["log", "rev"], ["show", "rev"], ["new"], ["branch", "name"]] },
  "vcs-pr": { mode: "choices", choices: [["title", "bookmark"], ["create", "bookmark"], ["stack"]] },
  "vcs-pr-description": { mode: "fields", fields: [["dropdown", "mode", ["content", "submit"]], ["text", "scope"], ["dropdown", "desc-review", ["shallow", "deep"]], ["text", "verify-from-docs"]] },
  "vcs-rewrite": { mode: "choices", choices: [["commit", "rev"], ["bookmark", "name"], ["abandon-empty"]] },
  "vcs-storyline-commit-history": { mode: "fields", fields: [["text", "target"]] },
  "verify-changes-yourself": { mode: "fields", fields: [["dropdown", "output", ["show", "save-to-test-results", "save-to-feat-brief", "show-and-save-to-test-results", "show-and-save-to-feat-brief"]]] },
  "verify-scope-just-right": { mode: "fields", fields: [["dropdown", "station", ["need", "brief", "build"]], ["text", "target path or change-id; inferred if omitted"]] },
  "what-would": { mode: "fields", fields: [["dropdown", "who", ["other", "gen", "deng", "eng", "pe", "pd", "pde", "de", "te", "sec", "sre", "sys-admin", "devops", "perf", "marketer", "devrel", "storyteller", "writer", "editor", "figma", "<custom role>"]], ["dropdown", "on", ["topic", "<file-path>"]]] },
  "workblock": { mode: "fields", fields: [["dropdown", "setup", ["setup", "location"]], ["text", "workblock-id-or-project-name"]], annotation: "no mode → location" },
};

interface ConformanceCase {
  rule: string;
  hint: string;
  expected: unknown;
}

const EXPECTED_DOCUMENTED_RULES = [
  "`<value>` cues a required value and draws one text field.",
  "`[value]` cues an optional value and draws one text field.",
  "`[one | two]` draws one dropdown. Its options are preserved as written, including spaces and escape-hatch values such as `<custom>` or `#id`.",
  "`name:<value>` and `name:[one | two]` use `name` as the field label.",
  "Bare words draw text fields in source order.",
  "A `|` outside every bracket group draws a command-choice dropdown. A choice may carry one conditional argument, such as `prepare [rev]`.",
  "Repeated command choices merge by name; the version carrying an argument wins.",
  "A top-level `# note` is an annotation when the `#` begins the hint or follows whitespace and is itself followed by whitespace. A `#` inside brackets is a value, not an annotation.",
  "Empty and malformed hints never throw. If syntax leaks into a rendered label the parse is `suspect`; if structural text could not be matched it is `unreadable`; otherwise it is `clean`. Dropdown options are values and are never assessed as leaked syntax.",
];

function conformanceShape(result: ParseResult): unknown {
  const shared = {
    assessment: result.assessment,
    ...(result.annotation ? { annotation: result.annotation } : {}),
  };
  if (result.mode === "choices") {
    return {
      mode: result.mode,
      choices: result.choices.map((choice) => ({
        name: choice.name,
        ...(choice.arg ? { argLabel: choice.arg.label } : {}),
      })),
      ...shared,
    };
  }
  return {
    mode: result.mode,
    fields: result.fields.map((field) => ({
      kind: field.kind,
      label: field.label,
      ...(field.kind === "dropdown" ? { options: field.options } : {}),
    })),
    ...shared,
  };
}

function corpusShape(result: ParseResult): ExpectedCorpusShape {
  if (result.mode === "choices") {
    return {
      mode: result.mode,
      choices: result.choices.map((choice) => (choice.arg ? [choice.name, choice.arg.label] : [choice.name])),
      ...(result.annotation ? { annotation: result.annotation } : {}),
    };
  }
  return {
    mode: result.mode,
    fields: result.fields.map((field) =>
      field.kind === "dropdown" ? [field.kind, field.label, field.options] : [field.kind, field.label],
    ),
    ...(result.annotation ? { annotation: result.annotation } : {}),
  };
}

function documentedGrammar(): { cases: ConformanceCase[]; rules: string[] } {
  const doc = readFileSync(resolve("docs/argument-hint-grammar.md"), "utf8");
  const rulesSection = doc.match(/## Rules\s*([\s\S]*?)\s*The required\/optional distinction/);
  assert.ok(rulesSection, "argument hint grammar must carry its rules section");
  const rules = rulesSection[1]
    .trim()
    .split(/\n(?=\d+\. )/)
    .map((rule) => rule.replace(/^\d+\.\s*/, "").replace(/\n\s+/g, " ").trim());
  const block = doc.match(
    /<!-- argument-hint-conformance:start -->\s*```json\s*([\s\S]*?)\s*```\s*<!-- argument-hint-conformance:end -->/,
  );
  assert.ok(block, "argument hint grammar must carry its conformance block");
  return { cases: JSON.parse(block[1]) as ConformanceCase[], rules };
}

test("every documented grammar case matches the parser", () => {
  const { cases, rules } = documentedGrammar();
  assert.deepEqual(rules, EXPECTED_DOCUMENTED_RULES, "documented rules changed without changing the bound contract");
  assert.ok(cases.length > 0);
  for (const grammarCase of cases) {
    assert.deepEqual(conformanceShape(parseArgumentHint(grammarCase.hint)), grammarCase.expected, grammarCase.rule);
  }
});

test("the installed-hint snapshot stays clean", () => {
  assert.equal(CORPUS.length, 94);
  assert.equal(new Set(CORPUS.map(([, hint]) => hint)).size, CORPUS.length);
  assert.equal(Object.keys(EXPECTED_CORPUS_SHAPES).length, CORPUS.length);

  for (const [skill, hint] of CORPUS) {
    const result = parseArgumentHint(hint);
    assert.equal(result.assessment, "clean", `${skill}: ${hint}`);
    assert.deepEqual(corpusShape(result), EXPECTED_CORPUS_SHAPES[skill], skill);
    assert.equal(warningForArgumentHint(hint, result.assessment), undefined, skill);
  }
});

test("every warning names the hint and includes the unread fragment", () => {
  for (const hint of ["[--effort <none|minimal|high>]", "<foo"]) {
    const result = parseArgumentHint(hint);
    assert.notEqual(result.assessment, "clean");
    const warning = warningForArgumentHint(hint, result.assessment);
    assert.ok(warning);
    const words = `${warning.title} ${warning.text}`;
    assert.match(words, /hint/i);
    assert.ok(words.includes(hint));
  }
});

test("the full installed-hint snapshot parses inside the regression ceiling", () => {
  const started = performance.now();
  for (const [, hint] of CORPUS) parseArgumentHint(hint);
  const elapsed = performance.now() - started;
  assert.ok(elapsed < 1_000, `94 hints took ${elapsed.toFixed(1)}ms`);
});

test("malformed, empty, and long hints always return a result", () => {
  const inputs = [...CORPUS.map(([, hint]) => hint), "<foo", "[bar", "||", "", "x".repeat(4_096)];
  for (const hint of inputs) {
    assert.doesNotThrow(() => parseArgumentHint(hint));
    assert.ok(parseArgumentHint(hint).assessment);
  }
});
