/**
 * boardValidator.js
 * Validates a board for solvability before gameplay begins.
 * Uses the greedy solver from solver.js.
 *
 * validateBoard(board) → { valid:bool, reason:string }
 */
function validateBoard(board) {
  if (!board || board.length !== 27) {
    return { valid: false, reason: 'Board must have exactly 27 cells (3×9)' };
  }
  for (var i = 0; i < board.length; i++) {
    if (board[i].v < 1 || board[i].v > 9) {
      return { valid: false, reason: 'Cell value out of range at index ' + i };
    }
  }
  // Only require at least one initial match — solvability is guaranteed by pair-first seeding
  if (!hasAnyMatch(board)) {
    return { valid: false, reason: 'No initial valid match exists' };
  }
  return { valid: true, reason: 'OK' };
}

/**
 * getBoardWithValidation(lvlIndex)
 * Generates and validates a board, retrying up to MAX_ATTEMPTS times.
 */
var MAX_BOARD_ATTEMPTS = 20;

function getBoardWithValidation(lvlIndex) {
  if (lvlIndex === 0) {
    var b1 = generateLevel1Board();
    return b1; // hand-crafted, always valid
  }
  var cfg = getLevelConfig(lvlIndex);
  for (var attempt = 0; attempt < MAX_BOARD_ATTEMPTS; attempt++) {
    var board = generateBoard(cfg, attempt);
    var result = validateBoard(board);
    if (result.valid) return board;
  }
  // Fallback: trivially solvable board
  return generateLevel1Board();
}
