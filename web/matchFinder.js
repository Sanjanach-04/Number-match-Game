/**
 * matchFinder.js
 * Implements the canonical 4-check match algorithm in reading order.
 *
 * Reading Order Scan: i=0→n, j=i+1→n
 * Value Check: same value OR sum-to-10
 * Path Checks (priority order):
 *   1. Horizontal  — same row, all between are matched
 *   2. Vertical    — same column, all between are matched
 *   3. Diagonal    — |rowDiff|===|colDiff|, all diagonal cells matched
 *   4. Wrap/Zipper — flat reading-order path, all cells between matched
 */

var COLS = 9; // board width (constant)

/** Step 2: Value check */
function valuesMatch(va, vb) {
  return va === vb || va + vb === 10;
}

/** Step 3a: Horizontal — same row, no active cell between */
function checkHorizontal(board, a, b) {
  var ra = Math.floor(a / COLS), rb = Math.floor(b / COLS);
  if (ra !== rb) return false;
  var lo = Math.min(a, b), hi = Math.max(a, b);
  for (var i = lo + 1; i < hi; i++) if (!board[i].m) return false;
  return true;
}

/** Step 3b: Vertical — same column, no active cell in column between */
function checkVertical(board, a, b) {
  var ca = a % COLS, cb = b % COLS;
  if (ca !== cb) return false;
  var ra = Math.floor(a / COLS), rb = Math.floor(b / COLS);
  var rLo = Math.min(ra, rb), rHi = Math.max(ra, rb);
  for (var r = rLo + 1; r < rHi; r++) {
    var cell = board[r * COLS + ca];
    if (cell && !cell.m) return false;
  }
  return true;
}

/** Step 3c: Diagonal — |rowDiff|===|colDiff|, all diagonal cells matched */
function checkDiagonal(board, a, b) {
  var ra = Math.floor(a / COLS), ca = a % COLS;
  var rb = Math.floor(b / COLS), cb = b % COLS;
  var dr = rb - ra, dc = cb - ca;
  if (Math.abs(dr) !== Math.abs(dc) || dr === 0) return false;
  var sr = dr > 0 ? 1 : -1, sc = dc > 0 ? 1 : -1;
  var r = ra + sr, c = ca + sc;
  while (r !== rb || c !== cb) {
    var idx = r * COLS + c;
    if (idx >= 0 && idx < board.length && board[idx] && !board[idx].m) return false;
    r += sr; c += sc;
  }
  return true;
}

/** Step 3d: Wrap/Zipper — all cells in flat reading path between lo and hi matched */
function checkWrap(board, a, b) {
  var lo = Math.min(a, b), hi = Math.max(a, b);
  for (var i = lo + 1; i < hi; i++) if (!board[i].m) return false;
  return true;
}

/**
 * canMatch(board, a, b)
 * Full pipeline: value check then 4 path checks in priority order.
 */
function canMatch(board, a, b) {
  if (a === b || board[a].m || board[b].m) return false;
  if (!valuesMatch(board[a].v, board[b].v)) return false;
  return checkHorizontal(board, a, b) ||
         checkVertical(board, a, b)   ||
         checkDiagonal(board, a, b)   ||
         checkWrap(board, a, b);
}

/**
 * findAllMatches(board)
 * Returns all valid [i,j] pairs in reading order.
 */
function findAllMatches(board) {
  var pairs = [];
  for (var i = 0; i < board.length; i++) {
    if (board[i].m) continue;
    for (var j = i + 1; j < board.length; j++) {
      if (board[j].m) continue;
      if (canMatch(board, i, j)) pairs.push([i, j]);
    }
  }
  return pairs;
}

/** Returns true if any valid match exists */
function hasAnyMatch(board) {
  for (var i = 0; i < board.length; i++) {
    if (board[i].m) continue;
    for (var j = i + 1; j < board.length; j++) {
      if (board[j].m) continue;
      if (canMatch(board, i, j)) return true;
    }
  }
  return false;
}

/** Returns true if all cells are matched */
function isBoardCleared(board) {
  for (var i = 0; i < board.length; i++) if (!board[i].m) return false;
  return true;
}
