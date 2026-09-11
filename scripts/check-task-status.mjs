#!/usr/bin/env node
// Fail when docs/TASKS.md describes implemented behaviour as pending or drops
// the evidence links for shipped capabilities, mirroring the task status
// guards in typoscope and unuseddeps.

import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = fileURLToPath(new URL("..", import.meta.url));
const taskPath = path.join(repoRoot, "docs", "TASKS.md");
const taskStatus = await readFile(taskPath, "utf8");

const requiredSections = ["## Done", "## Next"];
for (const section of requiredSections) {
  if (!taskStatus.includes(section)) {
    throw new Error(`docs/TASKS.md is missing ${section}`);
  }
}

const nextHeading = "## Next";
const nextStart = taskStatus.indexOf(nextHeading) + nextHeading.length;
const nextEnd = taskStatus.indexOf("\n## ", nextStart);
const pendingSection = taskStatus
  .slice(nextStart, nextEnd === -1 ? undefined : nextEnd)
  .toLowerCase();

const staleClaims = ["confidence scoring"];

for (const claim of staleClaims) {
  if (pendingSection.includes(claim)) {
    throw new Error(`docs/TASKS.md describes implemented behavior as pending: ${claim}`);
  }
}

const requiredReferences = [
  "../src/core.js",
  "../test/core.test.js",
  "../examples/sample-brief.json",
];

for (const reference of requiredReferences) {
  if (!taskStatus.includes(`](${reference})`)) {
    throw new Error(`docs/TASKS.md is missing required evidence link: ${reference}`);
  }
  await access(path.resolve(path.dirname(taskPath), reference));
}

console.log("Task status documentation matches implemented repository capabilities.");
