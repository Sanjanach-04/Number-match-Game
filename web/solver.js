/**
 * solver.js
 * Greedy board solver used for solvability validation.
 * Repeatedly applies the first available match until no moves remain.
 * Returns true if the board can be completely cleared.
 */
function isBoardSolvable(board) {
  // Deep clone the board (only need v and m)
  var sim = board.map(function (c) { return { v: c.v, m: c.m }; });
  var maxPasses = sim.length + 10;
  for (var pass = 0; pass < maxPasses; pass++) {
    var matches = findAllMatches(sim);
    if (!matches.length) break;
    // Apply the first available match
    sim[matches[0][0]].m = true;
    sim[matches[0][1]].m = true;
  }
  return isBoardCleared(sim);
}
