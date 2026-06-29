// boardValidator.ts - Validates board state and handles seeder retries

interface Cell {
  v: number;
  m: boolean;
}

function validateBoard(board: Cell[]): { valid: boolean; reason: string } {
  if (!board || board.length !== 27) {
    return { valid: false, reason: 'Board must have exactly 27 cells (3×9)' };
  }
  for (var i = 0; i < board.length; i++) {
    if (board[i].v < 1 || board[i].v > 9) {
      return { valid: false, reason: 'Cell value out of range at index ' + i };
    }
  }
  if (!hasAnyMatch(board)) {
    return { valid: false, reason: 'No initial valid match exists' };
  }
  if (!isBoardSolvable(board)) {
    return { valid: false, reason: 'Board is not solvable' };
  }
  return { valid: true, reason: 'OK' };
}

var MAX_BOARD_ATTEMPTS = 20;

function getBoardWithValidation(lvlIndex: number): Cell[] {
  if (lvlIndex === 0) {
    return generateLevel1Board();
  }
  var cfg = getLevelConfig(lvlIndex);
  for (var attempt = 0; attempt < MAX_BOARD_ATTEMPTS; attempt++) {
    var board = generateBoard(cfg, attempt);
    var result = validateBoard(board);
    if (result.valid) return board;
  }
  return generateLevel1Board(); // final fallback
}

// Wrapper class for legacy engine.js seeder
function seedBoard(lvlIndex: number): any {
  var b = new Board();
  var cells = getBoardWithValidation(lvlIndex - 1);
  var vals = cells.map(function(c) { return c.v; });
  b.addRow(vals.slice(0, 9));
  b.addRow(vals.slice(9, 18));
  b.addRow(vals.slice(18, 27));
  return b;
}

// Global exports
(globalThis as any).validateBoard = validateBoard;
(globalThis as any).getBoardWithValidation = getBoardWithValidation;
(globalThis as any).seedBoard = seedBoard;
