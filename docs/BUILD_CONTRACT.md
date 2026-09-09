# OMIND Build Contract — Production Foundation

## Product wedge
CSV/XLSX/XLS/JSON → profiling → data health → signals → questions → priorities → hypotheses → actions.

## Non-negotiables
- Persian RTL UX.
- Original user data is never silently destroyed.
- Deterministic analytical core is independent from any LLM provider.
- Explainability, confidence and trace are first-class outputs.
- Analysis is action-oriented, not dashboard-only.
- Architecture remains modular so storage, APIs, LLMs and connectors can be added later.
- Three free analyses are part of the product model.

## Current vertical slice
The Next.js application now has a functional browser-side path for XLSX/XLS/CSV/JSON ingestion, normalization, profiling, data-health scoring, signal detection, question suggestions, priorities, hypotheses, actions and an 8-step visible pipeline representing the 12-module reasoning trace.

## Acceptance criteria for foundation
1. User can select a supported data file.
2. Empty or invalid files produce a clear error instead of a fabricated analysis.
3. Persian/Arabic numerals are normalized before numeric profiling.
4. Missingness and duplicate rows affect the health score.
5. Numeric columns are inspected for simple statistical outliers.
6. Signals expose what happened, why it matters and a priority.
7. Suggested questions are generated from detected data roles.
8. Analysis exposes confidence and a reasoning trace.
9. No external LLM call is required for the core analysis.
10. The code is separated into UI and analytical engine modules.

## Next production layers
- Server API and job boundary.
- PostgreSQL persistence.
- Object storage for uploaded files.
- Immutable raw-file record + cleaning previews.
- Multi-file semantic model and join suggestions.
- 12 executable reasoning modules with typed contracts.
- Fibonacci scoring with documented rationale and sensitivity tests.
- Decision/action/feedback records.
- Authentication, quota and billing.
- Playwright/Vitest coverage and CI.
- Observability, security controls and deployment validation.
