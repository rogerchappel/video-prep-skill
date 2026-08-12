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

Every option requires the value shown in the usage text. Missing values,
unsupported formats, and unknown options exit with status 1 and print a
concise `video-prep-skill:` error followed by usage; they do not emit a stack
trace. Run `video-prep-skill --help` to print usage and exit successfully.

Package metadata is treated as optional evidence. The scanner uses `name` and
`description` only when they are non-empty strings, `keywords` only when it is
an array (discarding non-string entries), and `scripts` only when it is an
object map containing non-empty string commands. Boolean, numeric, array,
object, null, and whitespace-only script values are ignored. Malformed values
fall back to the repository directory name, README heading, or empty metadata
defaults instead of stopping the CLI.

## What It Produces

- a positioning summary grounded in README and package metadata
- a confidence score based on available local evidence
- hook options for short video openings
- scene outline with proof points and demo beats
- likely smoke, test, check, and build commands backed by valid package scripts
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
npm run package:smoke
npm run release:check
```

Use `npm run package:smoke` to assert the npm tarball contains the CLI,
library, docs, skill instructions, support files, and sample brief before
publishing.
Use `npm run release:check` before opening a release PR.
