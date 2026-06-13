# Video Prep Skill

## When To Use

Use this skill when an agent needs to prepare a practical launch, demo, or walkthrough video from a software repository. It is best for short scripts, release teasers, demo prep, and repo-to-content workflows.

## Required Inputs

- A local repository path.
- Optional audience and desired viewer outcome.
- Optional format selection: `text` or `json`.

## Tools

- Local filesystem read access.
- Node.js 20 or newer.
- No network access is required.

## Side-Effect Boundaries

The skill is read-only. It must not publish video, post to social platforms, edit the target repository, create branches, or call external media APIs. Any external action requires a separate explicit approval step.

## Workflow

1. Run the smoke command on the fixture repo.
2. Run the CLI against the target repo.
3. Check that every claim in the brief maps to repository evidence.
4. Remove or rewrite weak claims before recording.
5. Run the target repo's listed verification commands before mentioning them in public copy.

## Examples

```bash
node bin/video-prep-skill.js fixtures/sample-repo --format text
node bin/video-prep-skill.js ../my-tool --audience "open source maintainers" --outcome "run the smoke test"
```

## Validation

Run:

```bash
npm run check
npm test
npm run smoke
```
