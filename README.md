# video-prep-skill

`video-prep-skill` is a local-first agent skill for turning a repository into a grounded short-form video preparation brief. It scans repo files, package scripts, and documentation cues, then produces hooks, scene beats, demo commands, proof points, risks, and a narration draft.

## Quickstart

```bash
npm install
npm run smoke
node bin/video-prep-skill.js ./fixtures/sample-repo --format json
```

Run against another repository:

```bash
node bin/video-prep-skill.js /path/to/repo --audience "agent builders" --outcome "try the CLI locally"
```

## What It Produces

- a positioning summary grounded in README and package metadata
- hook options for short video openings
- scene outline with proof points and demo beats
- likely smoke, test, and build commands
- risk notes and side-effect boundaries
- narration draft suitable for a first editing pass

## Safety Notes

The CLI only reads local files. It does not call external services, mutate the target repo, publish media, or write to social platforms. Treat generated copy as a draft and verify claims before publishing.

## Limitations

- The scanner intentionally focuses on common repo files rather than full semantic code analysis.
- Git history is not required and is not trusted as the only evidence source.
- The narration is deterministic template output, not model-generated prose.

## Verification

```bash
npm run check
npm test
npm run smoke
```
