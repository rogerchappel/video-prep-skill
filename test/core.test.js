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

test("keeps only non-empty string script commands", () => {
  const facts = inspectRepo("fixtures/malformed-scripts-repo");
  const brief = buildVideoBrief("fixtures/malformed-scripts-repo");

  assert.deepEqual(facts.scripts, {
    test: "node --test",
    build: "node build.js"
  });
  assert.equal(facts.hasTests, true);
  assert.deepEqual(brief.demoCommands, [
    { label: "test", command: "npm run test" },
    { label: "build", command: "npm run build" }
  ]);
  assert.equal(brief.confidence, 70);
  assert.doesNotMatch(JSON.stringify({
    demoCommands: brief.demoCommands,
    scenes: brief.scenes,
    narration: brief.narration
  }), /npm run (smoke|check)/);
});

test("malformed script values do not create executable claims", () => {
  withRepo({ scripts: { smoke: true, test: ["node", "--test"], check: 42, build: "   ", lint: null } }, (root) => {
    const facts = inspectRepo(root);
    const brief = buildVideoBrief(root);

    assert.deepEqual(facts.scripts, {});
    assert.equal(facts.hasTests, false);
    assert.deepEqual(brief.demoCommands, []);
    assert.equal(brief.confidence, 55);
    assert.ok(brief.risks.includes("No package scripts were found, so demo commands may need manual selection."));
    assert.doesNotMatch(brief.narration, /npm run/);
    assert.doesNotMatch(JSON.stringify(brief.scenes), /npm run/);
  });
});

test("test detection ignores parent directory names outside the repository", () => {
  const parent = fs.mkdtempSync(path.join(os.tmpdir(), "video-prep-test-parent-"));
  const root = path.join(parent, "project-without-suite");
  fs.mkdirSync(path.join(root, "src"), { recursive: true });
  fs.writeFileSync(path.join(root, "src", "index.js"), "export const value = 1;\n");
  fs.writeFileSync(path.join(root, "package.json"), JSON.stringify({
    name: "project-without-suite",
    description: "A repository without automated checks.",
    scripts: { build: "node --check src/index.js" }
  }));

  try {
    const facts = inspectRepo(root);
    const brief = buildVideoBrief(root);

    assert.equal(facts.hasTests, false);
    assert.equal(brief.confidence, 65);
    assert.ok(brief.risks.includes("No clear test signal was found; avoid implying tested behavior."));
    assert.ok(!brief.evidence.includes("Contains test-related scripts or files."));
  } finally {
    fs.rmSync(parent, { recursive: true, force: true });
  }
});

test("test detection accepts repository-relative filenames and valid scripts", () => {
  withRepo({ scripts: { build: "node build.js" } }, (root) => {
    fs.mkdirSync(path.join(root, "spec"));
    fs.writeFileSync(path.join(root, "spec", "core.test.js"), "");
    assert.equal(inspectRepo(root).hasTests, true);
  });

  withRepo({ scripts: { "test:unit": "node --test" } }, (root) => {
    assert.equal(inspectRepo(root).hasTests, true);
  });
});
