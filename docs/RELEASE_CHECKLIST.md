# Release Checklist

- `npm run check` passes.
- `npm test` passes.
- `npm run smoke` prints a complete fixture brief.
- `npm run package:smoke` asserts the CLI, library, docs, skill instructions,
  support files, and sample brief are present in the dry-run tarball.
- `npm run release:check` passes before the release PR is opened.
- README quickstart matches the CLI.
- `SKILL.md` includes side-effect boundaries.
- Release-candidate PR includes verification output.
