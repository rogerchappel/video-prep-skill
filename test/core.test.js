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
  assert.ok(brief.hooks.includes("Open on npm run smoke, then reveal the scenes and proof points it generates."));
  assert.ok(brief.evidence.some((item) => item.includes("SKILL.md")));
  assert.equal(brief.confidence, 100);
});

test("uses meaningful README prose instead of title and navigation chrome", () => {
  const brief = buildVideoBrief("fixtures/readme-fallback-repo");

  assert.equal(brief.summary, "readme-fallback-repo: A grounded widget.");
  assert.ok(brief.evidence.includes("Description: A grounded widget."));
  assert.match(brief.narration, /Description: A grounded widget\./);
  assert.doesNotMatch(JSON.stringify(brief), /Description: Widget/);
});

test("renders text and json formats", () => {
  const brief = buildVideoBrief("fixtures/sample-repo");
  assert.match(renderBrief(brief, "text"), /Video Prep Brief/);
  assert.equal(JSON.parse(renderBrief(brief, "json")).project, "sample-agent-tool");
});

test("keeps the retained sample brief synchronized with the bundled fixture", () => {
  const retained = fs.readFileSync("examples/sample-brief.json", "utf8");
  const generated = renderBrief(buildVideoBrief("fixtures/sample-repo"), "json");

  assert.equal(retained, generated);
});

test("uses only non-empty string package names and descriptions", () => {
  for (const value of [null, {}, [], ""]) {
    withRepo({ name: value, description: value }, (root) => {
      const facts = inspectRepo(root);
      assert.equal(facts.name, path.basename(root));
      assert.equal(facts.description, "Grounded description.");
    });
  }

  withRepo({ name: "valid-name", description: "Valid description" }, (root) => {
    const facts = inspectRepo(root);
    assert.equal(facts.name, "valid-name");
    assert.equal(facts.description, "Valid description");
  });
});

test("retains a safe title fallback for sparse READMEs", () => {
  withRepo({}, (root) => {
    assert.equal(inspectRepo(root).description, "Sparse project");
  }, "# Sparse project\n\n[![CI](https://img.shields.io/badge/ci-passing-green)](https://example.test)\n");
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
    assert.ok(brief.risks.includes("No supported smoke, test, check, or build script was found, so use the CLI or select a demo command manually."));
    assert.doesNotMatch(brief.narration, /npm run/);
    assert.doesNotMatch(JSON.stringify(brief.scenes), /npm run/);
    assert.doesNotMatch(JSON.stringify(brief.hooks), /(?:smoke|test|check|build) command|npm run/);
    assert.match(brief.hooks.at(-1), /manual CLI run/);
  });
});

test("grounds hook commands in supported package scripts", () => {
  for (const name of ["test", "check", "build"]) {
    withRepo({ scripts: { lint: "eslint .", [name]: `node ${name}.js` } }, (root) => {
      const brief = buildVideoBrief(root);
      assert.deepEqual(brief.demoCommands, [{ label: name, command: `npm run ${name}` }]);
      assert.equal(brief.hooks.at(-1), `Open on npm run ${name}, then reveal the scenes and proof points it generates.`);
      assert.match(renderBrief(brief, "text"), new RegExp(`Open on npm run ${name}`));
      assert.match(JSON.parse(renderBrief(brief, "json")).hooks.at(-1), new RegExp(`Open on npm run ${name}`));
      assert.doesNotMatch(JSON.stringify(brief), /smoke command/);
    });
  }

  withRepo({ scripts: { lint: "eslint ." } }, (root) => {
    const brief = buildVideoBrief(root);
    assert.deepEqual(brief.demoCommands, []);
    assert.match(brief.hooks.at(-1), /manual CLI run/);
    for (const output of [renderBrief(brief, "text"), renderBrief(brief, "json")]) {
      assert.match(output, /manual CLI run/);
      assert.doesNotMatch(output, /(?:smoke|test|check|build) command|npm run/);
    }
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

test("test detection rejects unrelated test substrings", () => {
  withRepo({ scripts: { latest: "node latest.js", contest: "node contest.js" } }, (root) => {
    fs.writeFileSync(path.join(root, "latest.js"), "");
    fs.mkdirSync(path.join(root, "contest"));
    fs.writeFileSync(path.join(root, "contest", "helper.js"), "");

    const facts = inspectRepo(root);
    const brief = buildVideoBrief(root);

    assert.equal(facts.hasTests, false);
    assert.equal(brief.confidence, 55);
    assert.ok(brief.risks.includes("No clear test signal was found; avoid implying tested behavior."));
    assert.ok(!brief.evidence.includes("Contains test-related scripts or files."));
  });
});

test("test detection recognizes conventional test and spec paths", () => {
  for (const file of ["test.js", "core.test.js", "core.spec.mjs", "test/unit.js", "tests/unit.js", "spec/unit.js", "specs/unit.js", "__tests__/unit.js"]) {
    withRepo({}, (root) => {
      const target = path.join(root, file);
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, "");
      assert.equal(inspectRepo(root).hasTests, true, file);
    });
  }
});
