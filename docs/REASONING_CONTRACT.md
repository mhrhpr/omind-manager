# OMIND Reasoning Contract

## Purpose
The reasoning layer converts observed evidence into a traceable priority, decision path and action. It is deterministic and provider-independent.

## 12 executable modules
1. Intake — establish question/context.
2. Observe — collect evidence and signals.
3. Decompose — convert signals into explicit problems.
4. Pattern — identify repeatable structure or change.
5. Hypothesis — formulate testable explanations.
6. Causality — distinguish evidence from causal claims.
7. Decision — rank alternatives using evidence and priority.
8. Scenarios — compare conservative/base/intervention paths.
9. Experiment — define a bounded validation step.
10. Action — assign the next executable move.
11. Feedback — compare expected and actual outcome.
12. Loop — return learning to the next decision cycle.

Every module emits input, output, confidence and trace. No module is allowed to claim causality from correlation alone.

## Ranking model
Production ranking uses a deterministic evidence score plus an explicit priority weight. Ranking is independent of input order and does not use arbitrary positional multipliers. This keeps the score interpretable and monotonic: stronger evidence or a higher priority cannot be penalized merely because of array position.

## Acceptance criteria
- Exactly 12 modules execute in order.
- Each execution has a typed contract and trace.
- Ranking is deterministic and independent of input order.
- Priority weighting is explicit and auditable.
- Causal uncertainty is explicitly surfaced.
- Actions include validation and feedback rather than pretending every signal is a conclusion.
