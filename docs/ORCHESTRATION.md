# Orchestration

## Agent Flow

1. Verify the target repo path is local and expected.
2. Run `npm run smoke` in this project.
3. Run `node bin/video-prep-skill.js <target-repo> --format text`.
4. Compare generated claims with the target repository.
5. Use the brief as recording prep only after verification.

## Approval Boundaries

The skill may read local files and print a brief. It may not edit the target repo, upload media, create issues, post to social channels, or call external services without explicit approval.

## Failure Modes

- Sparse repository metadata can produce generic scenes.
- Missing scripts reduce command confidence.
- README marketing language may overstate capability; verify before publishing.
