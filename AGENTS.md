# Agent Instructions

This repository is a clean, guided reimplementation of the VizAI multi-camera integration gateway. Preserve all working implementation and continue incrementally. Do not restart from the older `camera-integration-gateway` project, copy it wholesale, or redesign completed work merely because another implementation exists nearby.

## Collaboration protocol

- The user is implementing the project themselves with step-by-step guidance.
- Give one narrow, named step at a time, explain why it exists, and wait for the user to complete it.
- After the user reports completion, inspect the actual file and run proportionate tests/build checks before marking it complete.
- After verifying a completed substep, apply the Efficient Checkpoint and Validation Policy below. Record only the minimum persistent state needed for a small step, then immediately provide the next small substep when it remains inside the same parent step (for example, Step 1F.2 to Step 1F.3).
- At a parent-step boundary (for example, Step 1F to Step 1G), stop after the checkpoint summary and wait for the user to explicitly say `Start Step 1G`.
- Do not silently write implementation code unless the user explicitly asks the agent to implement it. Documentation/checkpoint work explicitly requested by the user is allowed.
- Explain central code with concrete runtime flow and distinguish simulated/software evidence from real-device evidence.
- Never expose or request real camera, HikCentral, ONVIF, database, API, tunnel, or deployment credentials. Keep secrets in local ignored environment files or a future secret provider.

## Critical project rules

- `cameraId` identifies an independent logical camera throughout gateway routing, normalized data, database rows, API queries, and dashboard selection.
- The same physical camera may be registered three times with different IDs and adapters: ISAPI, HikCentral, and ONVIF.
- Do not add `physicalCameraId`, source arbitration, authoritative/shadow roles, or source-series selection to this implementation.
- Do not merge, deduplicate, or silently compare the three logical cameras. Counts that happen to match remain separate records.
- Do not implicitly sum all three registrations in a global total; that would triple-count one physical scene. Any future aggregate requires an explicit product decision.
- Every provider must report only data obtained through its own integration. Never copy ISAPI values into HikCentral/ONVIF results or manufacture unsupported ONVIF analytics.
- Provider recipes are registered once. `provider.create(registration)` creates exactly one disconnected adapter for each logical registration; network work begins in `adapter.connect()`.
- New providers plug into `AdapterRegistry`; do not add a central vendor `if/else` chain.

## Context Compaction / Recovery Protocol

Conversation context is supplementary and must not be the sole source of project knowledge.

After context compaction, a usage-limit interruption, a new Codex session, or when another agent takes over:

1. Read AGENTS.md.
2. Read docs/implementation/HANDOFF.md.
3. Read docs/implementation/PROGRESS.md.
4. Read docs/REQUIREMENTS.md.
5. Read docs/ARCHITECTURE.md and docs/DECISIONS.md where relevant.
6. Read .project-state.json.
7. Inspect git status and git diff.
8. Inspect recent git commits.
9. Inspect the source files relevant to the current task.
10. Reconstruct the real implementation state before modifying code.
11. Verify documentation claims against code/tests/git.
12. Resume from the first genuinely incomplete task.
13. Never restart completed implementation merely because conversation context was lost.

Actual code, tests, git state, and explicit requirements take precedence over stale progress documentation.

If the directory is still not a Git repository, record that fact rather than inventing branch, diff, or commit information.

## Continuous Checkpoint Rule

Do not wait for context compaction before saving state.

Update PROGRESS.md, HANDOFF.md, and .project-state.json after meaningful implementation checkpoints, major decisions, phase transitions, or whenever substantial work would be difficult to reconstruct.

Before ending a work session or when context pressure appears high, create/update a recovery checkpoint.

Keep the three files synchronized. Planned work must not be described as implemented, and simulated tests must not be described as live-camera proof.

## Efficient Checkpoint and Validation Policy

Avoid excessive checkpoint/documentation work after very small implementation steps.

### Small step

For a small incremental step such as 1F.8, 1F.9, etc.:

1. Implement only the requested step.
2. Run the narrowest relevant validation/test.
3. Update only the minimum persistent state necessary to record progress.
4. Do not automatically update ARCHITECTURE.md, DECISIONS.md,
   ROADMAP.md, HANDOFF.md, and other documentation unless the step
   actually changes information represented by those files.
5. Do not automatically run the entire regression suite after every
   tiny step unless required by the step or there is meaningful
   regression risk.

### Meaningful checkpoint

After a meaningful group of related steps:

1. Run broader relevant tests.
2. Update PROGRESS.md.
3. Update HANDOFF.md.
4. Update .project-state.json.
5. Update other documentation only if its contents actually changed.

### Stage/phase boundary

At the completion of a stage or major phase:

1. Run the full appropriate validation suite.
2. Run build/typecheck/lint as applicable.
3. Update all affected persistent documentation.
4. Synchronize HANDOFF.md, PROGRESS.md, and .project-state.json.
5. Update ARCHITECTURE.md only for architecture changes.
6. Update DECISIONS.md only for actual decisions.
7. Update ROADMAP.md only when roadmap/status information changes.
8. Create/verify the Git checkpoint when Git is available.

### Important

Persistent project state must remain recoverable, but recoverability
does not require rewriting every tracking file after every tiny step.

Prefer incremental, targeted updates and validation.

If context remaining becomes low, a usage-limit boundary approaches,
the session is about to end, or an interruption appears likely,
perform a full recovery checkpoint regardless of the normal cadence.
