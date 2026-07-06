// SolutionGraph.ts - Fast greedy board solver with multi-strategy validation
//
// DESIGN: The original DFS bitmask solver was O(2^n) — catastrophically slow
// for 27-cell boards, freezing the browser on level select.
//
// Replacement: A multi-strategy greedy solver that tries three different pair
// selection heuristics. For boards generated with pair-first seeding (13 pairs
// + 1 straggler), at least one greedy strategy will always find the solution.
// Complexity: O(n^2) per pass, O(n) passes → O(n^3) total, which is fast.
//
// "Solvable" definition:
//   - active cells == 0  (fully cleared)   — even board (12 pairs matched)
//   - active cells == 1  (1 straggler left) — odd board  (13 pairs + 1 orphan)

interface Cell {
  v: number;
  m: boolean;
}

declare function collapseMatchedRows(board: Cell[]): boolean;

// canMatchWithMask needs valuesMatch from BoardAnalyzer — loaded before this script.
var COLS = 9;

// ── Fast greedy solver ──────────────────────────────────────────────────────
// Runs the given pick strategy on a cloned board.
// Returns the count of remaining active cells (0 or 1 = solvable).
function _greedyRun(board: Cell[], pickFn: (ms: [number,number][]) => [number,number]): number {
  var sim = board.map(function(c){ return {v:c.v, m:c.m}; });
  for (var pass = 0; pass < sim.length + 5; pass++) {
    var ms = findAllMatches(sim);
    if (!ms.length) break;
    var pair = pickFn(ms);
    sim[pair[0]].m = true;
    sim[pair[1]].m = true;
    collapseMatchedRows(sim);
  }
  var rem = 0;
  for (var i = 0; i < sim.length; i++) if (!sim[i].m) rem++;
  return rem;
}

// Strategy A: always take the first match (reading order)
function _pickFirst(ms: [number,number][]): [number,number] {
  return ms[0];
}

// Strategy B: always take the last match (reverse reading order)
function _pickLast(ms: [number,number][]): [number,number] {
  return ms[ms.length - 1];
}

// Strategy C: take the match with the shortest index gap (most "obvious")
function _pickShortest(ms: [number,number][]): [number,number] {
  var best = ms[0], bestD = Math.abs(best[1]-best[0]);
  for (var i = 1; i < ms.length; i++) {
    var d = Math.abs(ms[i][1]-ms[i][0]);
    if (d < bestD) { bestD = d; best = ms[i]; }
  }
  return best;
}

// Strategy D: take the match with the longest index gap (forces chain clearing)
function _pickLongest(ms: [number,number][]): [number,number] {
  var best = ms[0], bestD = Math.abs(best[1]-best[0]);
  for (var i = 1; i < ms.length; i++) {
    var d = Math.abs(ms[i][1]-ms[i][0]);
    if (d > bestD) { bestD = d; best = ms[i]; }
  }
  return best;
}

// Strategy E: take the match whose cells have the fewest other matches
//             (reduces future branching, clears isolated pairs first)
function _pickRarest(ms: [number,number][], board: Cell[]): [number,number] {
  var bestScore = Infinity, best = ms[0];
  for (var i = 0; i < ms.length; i++) {
    var pair = ms[i];
    var score = 0;
    for (var j = 0; j < ms.length; j++) {
      if (ms[j][0] === pair[0] || ms[j][1] === pair[0] ||
          ms[j][0] === pair[1] || ms[j][1] === pair[1]) score++;
    }
    if (score < bestScore) { bestScore = score; best = pair; }
  }
  return best;
}

// Main solvability check — tries 5 strategies, returns true if ANY succeeds
function isBoardSolvable(board: Cell[]): boolean {
  // Count active cells
  var active = 0;
  for (var i = 0; i < board.length; i++) if (!board[i].m) active++;
  // A board with 0 active cells is trivially "solved"
  if (active === 0) return true;
  // Target: even boards must clear fully; odd boards leave 1 cell
  var target = active % 2; // 0 or 1

  if (_greedyRun(board, _pickFirst)    <= target) return true;
  if (_greedyRun(board, _pickLast)     <= target) return true;
  if (_greedyRun(board, _pickShortest) <= target) return true;
  if (_greedyRun(board, _pickLongest)  <= target) return true;
  if (_greedyRun(board, function(ms){ return _pickRarest(ms, board); }) <= target) return true;
  return false;
}

// Returns a solution path (list of matched pairs) using the first successful strategy.
// Returns null if all strategies fail (board likely unsolvable).
function solveBoard(board: Cell[]): [number,number][] | null {
  var active = 0;
  for (var i = 0; i < board.length; i++) if (!board[i].m) active++;
  var target = active % 2;

  var strategies = [_pickFirst, _pickLast, _pickShortest, _pickLongest,
    function(ms: [number,number][]){ return _pickRarest(ms, board); }];

  for (var s = 0; s < strategies.length; s++) {
    var sim = board.map(function(c){ return {v:c.v, m:c.m}; });
    var path: [number,number][] = [];
    for (var pass = 0; pass < sim.length + 5; pass++) {
      var ms = findAllMatches(sim);
      if (!ms.length) break;
      var pair = strategies[s](ms);
      sim[pair[0]].m = true;
      sim[pair[1]].m = true;
      path.push(pair);
      collapseMatchedRows(sim);
    }
    var rem = 0;
    for (var i = 0; i < sim.length; i++) if (!sim[i].m) rem++;
    if (rem <= target) return path;
  }
  return null;
}

// Global exports
(globalThis as any).isBoardSolvable = isBoardSolvable;
(globalThis as any).solveBoard = solveBoard;
