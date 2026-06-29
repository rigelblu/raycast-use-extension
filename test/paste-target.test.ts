import test from "node:test";
import assert from "node:assert/strict";
import { isCodexDesktopApplication } from "../src/lib/paste-target";

test("detects Codex Desktop App from application identity", () => {
  assert.equal(
    isCodexDesktopApplication({
      name: "Codex",
      path: "/Applications/Codex.app",
      bundleId: "com.openai.codex",
    }),
    true,
  );
});

test("does not treat terminal-like apps as Codex Desktop App", () => {
  assert.equal(
    isCodexDesktopApplication({
      name: "Warp",
      path: "/Applications/Warp.app",
      bundleId: "dev.warp.Warp-Stable",
    }),
    false,
  );
});
