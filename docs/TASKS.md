# Tasks

## Done

- Scaffold dependency-free Node package.
- Add read-only repository inspector.
- Add deterministic brief generator.
- Add CLI with text and JSON output.
- Add sample fixture repo.
- Add tests and smoke command.
- Add skill instructions and safety notes.
- Add confidence scoring for weak claims ([src/core.js](../src/core.js):
  `estimateConfidence` feeds `brief.confidence`, asserted in
  [core.test.js](../test/core.test.js) and shipped in
  [sample-brief.json](../examples/sample-brief.json)).

## Next

- Add optional git log summarization.
- Add markdown frontmatter output.
