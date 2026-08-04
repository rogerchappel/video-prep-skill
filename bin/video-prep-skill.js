#!/usr/bin/env node
import { buildVideoBrief, renderBrief } from "../src/core.js";

const args = process.argv.slice(2);
const usage = "Usage: video-prep-skill <repo-path> [--format text|json] [--audience value] [--outcome value]";

if (args.includes("--help") || args.length === 0) {
  console.log(usage);
  process.exit(args.length === 0 ? 1 : 0);
}

const repoPath = args[0];
let options;

try {
  options = parseOptions(args.slice(1));
} catch (error) {
  console.error(`video-prep-skill: ${error.message}`);
  console.error(usage);
  process.exit(1);
}

try {
  const brief = buildVideoBrief(repoPath, options);
  process.stdout.write(renderBrief(brief, options.format || "text"));
} catch (error) {
  console.error(`video-prep-skill: ${error.message}`);
  process.exit(1);
}

function parseOptions(tokens) {
  const options = {};
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (["--format", "--audience", "--outcome"].includes(token)) {
      const value = tokens[index + 1];
      if (value === undefined || value.startsWith("--")) {
        throw new Error(`${token} requires a value`);
      }
      options[token.slice(2)] = value;
      index += 1;
    }
    else throw new Error(`Unknown option: ${token}`);
  }
  if (options.format && !["text", "json"].includes(options.format)) {
    throw new Error("--format must be text or json");
  }
  return options;
}
