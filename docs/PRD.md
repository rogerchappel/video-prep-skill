# Product Requirements: video-prep-skill

## Goal

Give agents a repeatable local workflow for turning repository evidence into a practical short-form video preparation brief.

## Users

- Agent builders preparing launch material.
- Maintainers recording demo videos.
- Content agents transforming repos into scripts.

## MVP Requirements

- Scan local repository files without network access.
- Extract package scripts, README description, docs, and skill cues.
- Produce hooks, scenes, demo commands, risks, narration, and evidence.
- Offer text and JSON output.
- Include fixture-backed tests and smoke command.

## Non-Goals

- No video rendering.
- No social posting.
- No claims that cannot be traced to local repo evidence.

## Success Metrics

- The fixture smoke output gives a complete brief in under one second.
- Another agent can run the CLI against a repo without additional setup.
