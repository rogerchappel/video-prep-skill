import test from "node:test";
import assert from "node:assert/strict";
import { buildVideoBrief, inspectRepo, renderBrief } from "../src/core.js";

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
});

test("renders text and json formats", () => {
  const brief = buildVideoBrief("fixtures/sample-repo");
  assert.match(renderBrief(brief, "text"), /Video Prep Brief/);
  assert.equal(JSON.parse(renderBrief(brief, "json")).project, "sample-agent-tool");
});
