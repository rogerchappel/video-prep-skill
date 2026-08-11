import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { buildVideoBrief, inspectRepo, renderBrief } from "../src/core.js";

function withRepo(packageMetadata, callback, readme = "# README fallback\n\nGrounded description.") {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "video-prep-core-"));
  fs.writeFileSync(path.join(root, "package.json"), JSON.stringify(packageMetadata));
  fs.writeFileSync(path.join(root, "README.md"), readme);
  try {
    callback(root);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

test("inspects fixture repository metadata", () => {
  const facts = inspectRepo("fixtures/sample-repo");
  assert.equal(facts.name, "sample-agent-tool");
  assert.equal(facts.hasSkill, true);
  assert.equal(facts.scripts.smoke, "node cli.js");
});

test("builds a grounded brief", () => {
  const brief = buildVideoBrief("fixtures/sample-repo", {
    audience: "maintainers",
    outcome: "run the smoke command"
  });
  assert.equal(brief.audience, "maintainers");
  assert.ok(brief.hooks.some((hook) => hook.includes("sample-agent-tool")));
  assert.ok(brief.demoCommands.some((command) => command.command === "npm run smoke"));
  assert.ok(brief.evidence.some((item) => item.includes("SKILL.md")));
  assert.equal(brief.confidence, 100);
});

test("renders text and json formats", () => {
  const brief = buildVideoBrief("fixtures/sample-repo");
  assert.match(renderBrief(brief, "text"), /Video Prep Brief/);
  assert.equal(JSON.parse(renderBrief(brief, "json")).project, "sample-agent-tool");
});

test("uses only non-empty string package names and descriptions", () => {
  for (const value of [null, {}, [], ""]) {
    withRepo({ name: value, description: value }, (root) => {
      const facts = inspectRepo(root);
      assert.equal(facts.name, path.basename(root));
      assert.equal(facts.description, "README fallback");
    });
  }

  withRepo({ name: "valid-name", description: "Valid description" }, (root) => {
    const facts = inspectRepo(root);
    assert.equal(facts.name, "valid-name");
    assert.equal(facts.description, "Valid description");
  });
});

test("normalizes keywords to an array containing only strings", () => {
  for (const value of [null, "video", { topic: "video" }]) {
    withRepo({ keywords: value }, (root) => {
      assert.deepEqual(inspectRepo(root).packageKeywords, []);
    });
  }

  withRepo({ keywords: ["video", null, {}, "agents"] }, (root) => {
    const brief = buildVideoBrief(root);
    assert.deepEqual(inspectRepo(root).packageKeywords, ["video", "agents"]);
    assert.ok(brief.evidence.includes("Keywords: video, agents"));
    assert.doesNotMatch(JSON.stringify(brief), /\[object Object\]/);
  });
});

test("uses scripts only when they are a plain object", () => {
  for (const value of [null, "npm test", ["test"], 1]) {
    withRepo({ scripts: value }, (root) => {
      const facts = inspectRepo(root);
      assert.deepEqual(facts.scripts, {});
      assert.deepEqual(buildVideoBrief(root).demoCommands, []);
    });
  }

  withRepo({ scripts: { test: "node --test" } }, (root) => {
    assert.equal(inspectRepo(root).scripts.test, "node --test");
    assert.deepEqual(buildVideoBrief(root).demoCommands, [{ label: "test", command: "npm run test" }]);
  });
});
