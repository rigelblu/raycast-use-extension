import test from "node:test";
import assert from "node:assert/strict";
import { normalizeAgent } from "../src/lib/agent-config";

test("normalizeAgent returns 'all' for empty values", () => {
  assert.equal(normalizeAgent(undefined), "all");
  assert.equal(normalizeAgent(null), "all");
  assert.equal(normalizeAgent(""), "all");
});

test("normalizeAgent preserves the 'all' sentinel", () => {
  assert.equal(normalizeAgent("all"), "all");
});

test("normalizeAgent maps invalid custom agents/projects to 'all'", () => {
  assert.equal(normalizeAgent("custom"), "all");
  assert.equal(normalizeAgent("customAgent"), "all");
});

test("normalizeAgent preserves valid current agents", () => {
  assert.equal(normalizeAgent("warp"), "warp");
  assert.equal(normalizeAgent("claude-code"), "claude-code");
  assert.equal(normalizeAgent("customProject1"), "customProject1");
  assert.equal(normalizeAgent("customProject5"), "customProject5");
});

test("normalizeAgent falls back to 'all' for unknown agents", () => {
  assert.equal(normalizeAgent("future-agent-not-yet-added"), "all");
});
