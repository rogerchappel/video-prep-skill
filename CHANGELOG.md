# Changelog

All notable changes to this project will be documented in this file.

## Unreleased

- Record the shipped confidence scoring under `Done` in `docs/TASKS.md` with
  evidence links and add a `tasks:status-check` documentation guard, wired into
  `npm run release:check`, that fails when implemented behavior is listed as
  pending or evidence links go stale, mirroring the sibling guards in typoscope
  and unuseddeps.
- Reject missing option values and unknown CLI options with concise usage
  diagnostics instead of silently falling back or printing a stack trace.
- Include the sample brief examples in the npm package allowlist.
- Replace raw package dry-run output with an assertion-backed package smoke
  check for the CLI, library, docs, skill instructions, support files, and
  sample brief.

## 0.1.0 - 2026-06-29

- Documented the initial local-first video preparation skill and CLI.
- Included fixture-backed release readiness checks for syntax, tests, smoke coverage, and package contents.
- Published safety and package metadata for release review.
