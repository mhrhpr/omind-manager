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

## Fibonacci weighting
The sequence `1,1,2,3,5,8,13,21,34,55,89` is used as an explicit weighting mechanism for ranked evidence. The implementation exposes sensitivity testing so weighting effects can be measured rather than treated as decoration.

## Acceptance criteria
- Exactly 12 modules execute in order.
- Each execution has a typed contract and trace.
- Ranking is deterministic for identical input.
- Fibonacci weighting changes the ranking score in a measurable way.
- Causal uncertainty is explicitly surfaced.
- Actions include validation and feedback rather than pretending every signal is a conclusion.
