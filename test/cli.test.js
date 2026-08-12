import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const cli = "bin/video-prep-skill.js";
const fixture = "fixtures/sample-repo";
const usage = "Usage: video-prep-skill <repo-path> [--format text|json] [--audience value] [--outcome value]";

function runCli(args) {
  return spawnSync(process.execPath, [cli, ...args], {
    cwd: process.cwd(),
    encoding: "utf8"
  });
}

for (const option of ["--format", "--audience", "--outcome"]) {
  test(`rejects a missing ${option} value`, () => {
    const result = runCli([fixture, option]);

    assert.equal(result.status, 1);
    assert.equal(result.stdout, "");
    assert.equal(
      result.stderr,
      `video-prep-skill: ${option} requires a value\n${usage}\n`
    );
  });
}

test("rejects unknown options without a stack trace", () => {
  const result = runCli([fixture, "--bogus"]);

  assert.equal(result.status, 1);
  assert.equal(result.stdout, "");
  assert.equal(
    result.stderr,
    `video-prep-skill: Unknown option: --bogus\n${usage}\n`
  );
  assert.doesNotMatch(result.stderr, /\n\s+at /);
});

test("rejects invalid output formats", () => {
  const result = runCli([fixture, "--format", "yaml"]);

  assert.equal(result.status, 1);
  assert.equal(result.stdout, "");
  assert.equal(
    result.stderr,
    `video-prep-skill: --format must be text or json\n${usage}\n`
  );
});

test("prints help successfully", () => {
  const result = runCli(["--help"]);

  assert.equal(result.status, 0);
  assert.equal(result.stdout, `${usage}\n`);
  assert.equal(result.stderr, "");
});

test("renders representative text and JSON commands", () => {
  const textResult = runCli([
    fixture,
    "--format",
    "text",
    "--audience",
    "maintainers",
    "--outcome",
    "run the smoke command"
  ]);
  assert.equal(textResult.status, 0);
  assert.match(textResult.stdout, /Video Prep Brief/);
  assert.match(textResult.stdout, /Audience: maintainers/);
  assert.equal(textResult.stderr, "");

  const jsonResult = runCli([fixture, "--format", "json"]);
  assert.equal(jsonResult.status, 0);
  assert.equal(JSON.parse(jsonResult.stdout).project, "sample-agent-tool");
  assert.equal(jsonResult.stderr, "");
});

test("renders a grounded brief when package metadata has malformed field types", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "video-prep-cli-"));
  fs.writeFileSync(path.join(root, "package.json"), JSON.stringify({
    name: { invalid: true },
    description: ["invalid"],
    keywords: "video",
    scripts: null
  }));
  fs.writeFileSync(path.join(root, "README.md"), "# Readable repository\n\nRepository details.\n");

  try {
    const result = runCli([root, "--format", "json"]);
    assert.equal(result.status, 0);
    assert.equal(result.stderr, "");
    const brief = JSON.parse(result.stdout);
    assert.equal(brief.project, path.basename(root));
    assert.equal(brief.summary, `${path.basename(root)}: Readable repository`);
    assert.deepEqual(brief.demoCommands, []);
    assert.doesNotMatch(result.stdout, /\[object Object\]/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("omits malformed script values from CLI output", () => {
  const result = runCli(["fixtures/malformed-scripts-repo", "--format", "json"]);

  assert.equal(result.status, 0);
  assert.equal(result.stderr, "");
  const brief = JSON.parse(result.stdout);
  assert.deepEqual(brief.demoCommands, [
    { label: "test", command: "npm run test" },
    { label: "build", command: "npm run build" }
  ]);
  assert.doesNotMatch(result.stdout, /npm run (smoke|check)/);
});
