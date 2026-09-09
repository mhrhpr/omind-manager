# OMIND Four-Phase Execution Protocol

This repository follows a four-phase delivery loop designed to minimize human execution friction.

## Phase 1 — Contract

Before implementation, convert the requested change into an explicit contract:

- Goal: one measurable outcome.
- Scope: files/modules allowed to change.
- Invariants: existing contracts that must not change.
- Acceptance criteria: observable pass/fail checks.
- Risk: likely regressions and dependencies.

No implementation begins while a critical ambiguity can change the architecture or acceptance criteria.

## Phase 2 — Build

The AI owns implementation details unless the user explicitly requests manual work.

Rules:

1. Prefer the smallest production-capable change.
2. Preserve existing public names/contracts unless a migration is explicitly approved.
3. Keep analytical logic independent from UI and external LLM providers.
4. Never silently mutate original user data.
5. Add instrumentation/trace output where reasoning is involved.

## Phase 3 — Verify

Every change is verified against:

- type/build validity
- deterministic analytical behavior
- invalid/empty input behavior
- regression-sensitive existing behavior
- UI acceptance criteria when UI changed

A failed check is a build issue, not a user task: diagnose and fix before declaring the phase complete.

## Phase 4 — Regression + Release

Before release:

- re-run the full quality gate
- compare the implementation against the original contract
- record newly discovered bugs as regression cases
- verify deployment-facing configuration
- report exactly what is complete, partial, or blocked

## Human interaction rule

The user should primarily provide:

- product intent
- business decisions
- priority changes
- approval for irreversible decisions

The system should absorb specification, implementation, testing, debugging, regression analysis, and release preparation wherever tooling permits.

## Default command

Run the repository quality gate with:

```bash
npm run quality
```

For local development:

```bash
npm run dev
```

The protocol is the default operating model for serious OMIND work.
