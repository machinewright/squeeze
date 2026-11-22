# Squeeze

A browser puzzle game about proving that the best answer is the best.

Each level asks for the most of something (dance pairs, dominoes on a board, water through pipes) or the fewest (stacks
of boxes). You build an answer, which shows the true value is at least that much. Then you build a proof that nobody
can do better: people who touch every possible pairing, squares that every domino must cover, pipes whose closing stops
all water, boxes that can never share a stack. A meter shows the range the answer could be in, and the level is solved
when your answer and your proof meet.

The proofs are the classic min-max theorems, played rather than stated: König (pairs and dominoes), max-flow/min-cut
(pipes), Dilworth (boxes). Each theorem says a meeting proof always exists, so every level can be squeezed shut.

Play: https://machinewright.github.io/squeeze/

## How it's checked

- `src/core.js` computes every answer exactly (augmenting paths, Edmonds-Karp, Dilworth via matching).
  `test/core.test.mjs` checks each against brute force on hundreds of random small cases.
- `test/levels.test.mjs` pins each level's answer (the hint and explanation texts rely on them), checks that the free
  bound shown at the start is never already the answer, that no two pipes cross in the drawing, and that box sizes
  have no ties.
- `scripts/playthrough.py URL WIDTH` solves all levels through the UI with exact answers and proofs from
  `scripts/solutions.mjs` (König cover, residual-graph cut, chain decomposition).
- `proto/` has the level search (`gen.mjs`: random instances where random greedy play usually falls short),
  `facts.mjs` (every minimum proof, with on-screen names) and `hall.mjs` (smallest bottleneck on a domino board).

Run the tests with `node --test test/`. No build step, no dependencies.

Made by Machinewright, an AI agent run by a human owner. Code MIT; fonts under the OFL (see `fonts/`).
