// SolutionGraph.ts - Deterministic board solver and solvability verification

interface Cell {
  v: number;
  m: boolean;
}

var COLS = 9;

// Helper to check if a bit is set in a bitmask represented as Uint32Array
function isBitSet(mask: Uint32Array, i: number): boolean {
  return (mask[Math.floor(i / 32)] & (1 << (i % 32))) !== 0;
}

// Check matching rules under a specific bitmask state
function canMatchWithMask(board: Cell[], mask: Uint32Array, a: number, b: number): boolean {
  if (a === b || isBitSet(mask, a) || isBitSet(mask, b)) return false;
  if (!valuesMatch(board[a].v, board[b].v)) return false;

  var ra = Math.floor(a / COLS);
  var rb = Math.floor(b / COLS);

  // 1. Horizontal
  if (ra === rb) {
    var lo = Math.min(a, b);
    var hi = Math.max(a, b);
    var ok = true;
    for (var i = lo + 1; i < hi; i++) {
      if (!isBitSet(mask, i)) { ok = false; break; }
    }
    if (ok) return true;
  }

  // 2. Vertical
  var ca = a % COLS;
  var cb = b % COLS;
  if (ca === cb) {
    var loR = Math.min(ra, rb);
    var hiR = Math.max(ra, rb);
    var ok = true;
    for (var r = loR + 1; r < hiR; r++) {
      if (!isBitSet(mask, r * COLS + ca)) { ok = false; break; }
    }
    if (ok) return true;
  }

  // 3. Diagonal
  var dr = rb - ra;
  var dc = cb - ca;
  if (Math.abs(dr) === Math.abs(dc) && dr !== 0) {
    var sr = dr > 0 ? 1 : -1;
    var sc = dc > 0 ? 1 : -1;
    var r = ra + sr;
    var c = ca + sc;
    var ok = true;
    while (r !== rb || c !== cb) {
      var idx = r * COLS + c;
      if (idx >= 0 && idx < board.length && !isBitSet(mask, idx)) { ok = false; break; }
      r += sr;
      c += sc;
    }
    if (ok) return true;
  }

  // 4. Wrap-around (Reading order)
  var loW = Math.min(a, b);
  var hiW = Math.max(a, b);
  var okW = true;
  for (var i = loW + 1; i < hiW; i++) {
    if (!isBitSet(mask, i)) { okW = false; break; }
  }
  if (okW) return true;

  return false;
}

// Solves the board from its current state and returns the solution path (sequence of pairs)
// or null if unsolvable.
function solveBoard(board: Cell[]): [number, number][] | null {
  var len = board.length;
  var maskLen = Math.ceil(len / 32);
  var initialMask = new Uint32Array(maskLen);
  var initialActive = 0;

  for (var i = 0; i < len; i++) {
    if (board[i].m) {
      initialMask[Math.floor(i / 32)] |= (1 << (i % 32));
    } else {
      initialActive++;
    }
  }

  // Target count: if active cells are odd, we must leave exactly 1 cell.
  // If active cells are even, we must clear all (0 cells).
  var targetActive = initialActive % 2;

  var memo: { [key: string]: boolean } = {};
  var path: [number, number][] = [];

  function dfs(mask: Uint32Array, activeCount: number): boolean {
    if (activeCount === targetActive) {
      return true;
    }

    var key = mask.join(",");
    if (memo[key] === false) {
      return false;
    }

    // Find matches under mask
    var matches: [number, number][] = [];
    for (var i = 0; i < len; i++) {
      if ((mask[Math.floor(i / 32)] & (1 << (i % 32))) !== 0) continue;
      for (var j = i + 1; j < len; j++) {
        if ((mask[Math.floor(j / 32)] & (1 << (j % 32))) !== 0) continue;
        if (canMatchWithMask(board, mask, i, j)) {
          matches.push([i, j]);
        }
      }
    }

    // Heuristic: try pairs that are closer together in index space first to speed up search
    matches.sort(function (a, b) {
      return (a[1] - a[0]) - (b[1] - b[0]);
    });

    for (var k = 0; k < matches.length; k++) {
      var pair = matches[k];
      var nextMask = new Uint32Array(mask);
      nextMask[Math.floor(pair[0] / 32)] |= (1 << (pair[0] % 32));
      nextMask[Math.floor(pair[1] / 32)] |= (1 << (pair[1] % 32));

      path.push(pair);
      if (dfs(nextMask, activeCount - 2)) {
        return true;
      }
      path.pop(); // backtrack
    }

    memo[key] = false;
    return false;
  }

  if (dfs(initialMask, initialActive)) {
    return path;
  }
  return null;
}

// Wrapper for boardValidator/legacy checks
function isBoardSolvable(board: Cell[]): boolean {
  return solveBoard(board) !== null;
}

// Global exports
(globalThis as any).solveBoard = solveBoard;
(globalThis as any).isBoardSolvable = isBoardSolvable;
