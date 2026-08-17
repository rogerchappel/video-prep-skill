import fs from "node:fs";
import path from "node:path";

const DEFAULT_AUDIENCE = "agent builders";
const DEFAULT_OUTCOME = "try the project locally";
const MAX_README_CHARS = 5000;

export function buildVideoBrief(repoPath, options = {}) {
  const root = path.resolve(repoPath);
  const facts = inspectRepo(root);
  const audience = options.audience || DEFAULT_AUDIENCE;
  const outcome = options.outcome || DEFAULT_OUTCOME;
  const proofPoints = collectProofPoints(facts);
  const commands = collectCommands(facts);

  return {
    project: facts.name,
    audience,
    desiredOutcome: outcome,
    confidence: estimateConfidence(facts, commands),
    summary: summarizeProject(facts),
    hooks: buildHooks(facts, audience),
    demoCommands: commands,
    scenes: buildScenes(facts, proofPoints, commands, audience, outcome),
    risks: buildRisks(facts, commands),
    narration: buildNarration(facts, proofPoints, commands, audience, outcome),
    evidence: proofPoints
  };
}

export function inspectRepo(root) {
  if (!fs.existsSync(root)) {
    throw new Error(`Repository path does not exist: ${root}`);
  }
  const stat = fs.statSync(root);
  if (!stat.isDirectory()) {
    throw new Error(`Repository path is not a directory: ${root}`);
  }

  const packageJson = readJson(path.join(root, "package.json"));
  const readme = readFirstExisting(root, ["README.md", "readme.md", "Readme.md"]);
  const docs = listFiles(path.join(root, "docs")).filter((file) => file.endsWith(".md"));
  const scripts = normalizeScripts(packageJson?.scripts);
  const packageName = nonEmptyString(packageJson?.name);
  const packageDescription = nonEmptyString(packageJson?.description);
  const packageKeywords = Array.isArray(packageJson?.keywords)
    ? packageJson.keywords.filter((keyword) => typeof keyword === "string")
    : [];

  return {
    root,
    name: packageName || path.basename(root),
    description: packageDescription || firstMeaningfulLine(readme) || "No description found.",
    readme: readme.slice(0, MAX_README_CHARS),
    docs: docs.map((file) => path.relative(root, file)),
    scripts,
    packageKeywords,
    hasSkill: fs.existsSync(path.join(root, "SKILL.md")),
    hasTests: Object.keys(scripts).some((name) => name.includes("test"))
      || listFiles(root).some((file) => path.relative(root, file).includes("test"))
  };
}

export function renderBrief(brief, format = "text") {
  if (format === "json") {
    return `${JSON.stringify(brief, null, 2)}\n`;
  }
  const lines = [
    `# Video Prep Brief: ${brief.project}`,
    "",
    `Audience: ${brief.audience}`,
    `Desired outcome: ${brief.desiredOutcome}`,
    "",
    "## Summary",
    brief.summary,
    "",
    "## Hooks",
    ...brief.hooks.map((hook) => `- ${hook}`),
    "",
    "## Demo Commands",
    ...brief.demoCommands.map((command) => `- ${command.label}: \`${command.command}\``),
    "",
    "## Scenes",
    ...brief.scenes.map((scene, index) => `${index + 1}. ${scene.title}: ${scene.beat}`),
    "",
    "## Risks",
    ...brief.risks.map((risk) => `- ${risk}`),
    "",
    "## Narration Draft",
    brief.narration,
    "",
    "## Evidence",
    ...brief.evidence.map((item) => `- ${item}`)
  ];
  return `${lines.join("\n")}\n`;
}

function collectProofPoints(facts) {
  const points = [];
  if (facts.description) points.push(`Description: ${facts.description}`);
  if (facts.packageKeywords.length) points.push(`Keywords: ${facts.packageKeywords.join(", ")}`);
  if (facts.hasSkill) points.push("Includes SKILL.md instructions for agent use.");
  if (facts.docs.length) points.push(`Docs present: ${facts.docs.slice(0, 5).join(", ")}`);
  if (facts.hasTests) points.push("Contains test-related scripts or files.");
  return points.length ? points : ["Repository exists but has sparse metadata; verify claims manually."];
}

function collectCommands(facts) {
  const preferred = ["smoke", "test", "check", "build"];
  return preferred
    .filter((name) => facts.scripts[name])
    .map((name) => ({ label: name, command: `npm run ${name}` }));
}

function summarizeProject(facts) {
  const docs = facts.docs.length ? ` It includes docs such as ${facts.docs.slice(0, 3).join(", ")}.` : "";
  return `${facts.name}: ${facts.description}${docs}`;
}

function buildHooks(facts, audience) {
  return [
    `Show ${audience} how ${facts.name} moves from repo evidence to a usable video brief.`,
    `Start with the problem: demo videos fail when the script is not grounded in the repository.`,
    `Open on the smoke command, then reveal the scenes and proof points it generates.`
  ];
}

function buildScenes(facts, proofPoints, commands, audience, outcome) {
  return [
    { title: "Problem", beat: `Frame why ${audience} need grounded video prep instead of generic launch copy.` },
    { title: "Evidence", beat: `Show the repo files that support the claim: ${proofPoints[0]}` },
    { title: "Demo", beat: commands[0] ? `Run ${commands[0].command} and show the generated brief.` : "Run the CLI and inspect the generated brief." },
    { title: "Workflow", beat: "Point out hooks, scene beats, risks, and verification notes." },
    { title: "Close", beat: `Ask viewers to ${outcome} and verify claims before publishing.` }
  ];
}

function buildRisks(facts, commands) {
  const risks = ["Generated copy is a draft; verify every public claim against repo evidence."];
  if (!commands.length) risks.push("No package scripts were found, so demo commands may need manual selection.");
  if (!facts.hasTests) risks.push("No clear test signal was found; avoid implying tested behavior.");
  return risks;
}

function estimateConfidence(facts, commands) {
  let score = 40;
  if (facts.description && facts.description !== "No description found.") score += 15;
  if (facts.docs.length) score += 15;
  if (facts.hasSkill) score += 15;
  if (commands.length) score += 10;
  if (facts.hasTests) score += 5;
  return Math.min(score, 100);
}

function buildNarration(facts, proofPoints, commands, audience, outcome) {
  const commandLine = commands[0] ? `I can run ${commands[0].command} to prove the workflow locally.` : "I can run the CLI locally and inspect the output.";
  return `This is ${facts.name}, a project for ${audience}. The useful thing is not just the script it writes, but the evidence it keeps attached: ${proofPoints[0]} ${commandLine} The final pass is a practical checklist: hook, scenes, demo proof, risks, and the next action, which is to ${outcome}.`;
}

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return null;
  }
}

function nonEmptyString(value) {
  return typeof value === "string" && value.trim() ? value : null;
}

function normalizeScripts(value) {
  if (!isPlainObject(value)) return {};
  return Object.fromEntries(
    Object.entries(value).filter(([, command]) => nonEmptyString(command))
  );
}

function isPlainObject(value) {
  if (value === null || typeof value !== "object") return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function readFirstExisting(root, names) {
  for (const name of names) {
    const file = path.join(root, name);
    if (fs.existsSync(file)) return fs.readFileSync(file, "utf8");
  }
  return "";
}

function firstMeaningfulLine(text) {
  return text.split(/\r?\n/).map((line) => line.replace(/^#+\s*/, "").trim()).find(Boolean);
}

function listFiles(root) {
  if (!fs.existsSync(root)) return [];
  const entries = fs.readdirSync(root, { withFileTypes: true });
  return entries.flatMap((entry) => {
    if (entry.name === "node_modules" || entry.name === ".git") return [];
    const fullPath = path.join(root, entry.name);
    if (entry.isDirectory()) return listFiles(fullPath);
    return [fullPath];
  });
}
