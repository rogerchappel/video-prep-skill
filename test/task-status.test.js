import assert from "node:assert/strict";
import { cp, mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const repoRoot = fileURLToPath(new URL("..", import.meta.url));
const checkerPath = path.join(repoRoot, "scripts", "check-task-status.mjs");
const committedTasks = await readFile(path.join(repoRoot, "docs", "TASKS.md"), "utf8");

function runChecker(root) {
  return execFileSync(process.execPath, [path.join(root, "scripts", "check-task-status.mjs")], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
}

async function sandbox(tasksContent) {
  const root = await mkdtemp(path.join(os.tmpdir(), "video-prep-task-status-"));
  await mkdir(path.join(root, "scripts"), { recursive: true });
  await mkdir(path.join(root, "docs"), { recursive: true });
  await cp(checkerPath, path.join(root, "scripts", "check-task-status.mjs"));
  await writeFile(path.join(root, "docs", "TASKS.md"), tasksContent, "utf8");
  return root;
}

test("committed docs/TASKS.md passes the task status checker", () => {
  const output = runChecker(repoRoot);
  assert.match(
    output,
    /Task status documentation matches implemented repository capabilities\./,
  );
});

test("checker fails when implemented confidence scoring returns to Next", async () => {
  const stale = committedTasks
    .replace(/\n- Add confidence scoring for weak claims[\s\S]*?\)\.\n/, "\n")
    .replace("## Next\n\n", "## Next\n\n- Add confidence scoring for weak claims.\n");
  assert.notEqual(stale, committedTasks, "fixture must exercise the stale pending claim");
  const root = await sandbox(stale);
  assert.throws(
    () => runChecker(root),
    /docs\/TASKS\.md describes implemented behavior as pending: confidence scoring/,
  );
});

test("checker fails when a Done evidence link is removed", async () => {
  const linkStart = committedTasks.indexOf(" ([src/core.js]");
  const linkEnd = committedTasks.indexOf(")).", linkStart);
  assert.ok(linkStart !== -1 && linkEnd !== -1, "committed docs contain the evidence links");
  const broken =
    committedTasks.slice(0, linkStart) + "." + committedTasks.slice(linkEnd + 3);
  assert.notEqual(broken, committedTasks, "fixture must strip the evidence links");
  const root = await sandbox(broken);
  assert.throws(
    () => runChecker(root),
    /docs\/TASKS\.md is missing required evidence link: \.\.\/src\/core\.js/,
  );
});

test("checker fails when a required section is dropped", async () => {
  const root = await sandbox("# Tasks\n\n## Done\n\n- Scaffold dependency-free Node package.\n");
  assert.throws(() => runChecker(root), /docs\/TASKS\.md is missing ## Next/);
});
