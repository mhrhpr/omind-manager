# OMIND QA remediation

## Release blockers addressed
- Server-side analysis is authoritative.
- Workspace access uses a bearer credential rather than a public UUID alone.
- Alembic is the schema authority; startup does not mutate schema.
- Free quota is consumed in the same database transaction as analysis persistence.
- Decision outcome/lesson is persisted and workspace-scoped.
- Uploads are validated by extension/content parser and size limit.
- Regression tests cover server parsing, reasoning, quota and access control.

## Algorithm decision
Fibonacci position weighting was removed from production ranking because it made ranking depend on ordinal position rather than evidence. Priority + evidence score now determine ranking deterministically. Fibonacci sensitivity remains out of the decision path until a statistically justified weighting model exists.
