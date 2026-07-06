// boardValidator.ts - Validates board state and handles seeder retries

interface Cell {
  v: number;
  m: boolean;
}

function isBoardSolvableWithAddRows(board: Cell[], cfg: LevelConfig): boolean {
  var sim = board.map(function(c){ return {v: c.v, m: c.m}; });
  var arUsed = 0;
  var maxAR = 6;
  var dryP = 0;
  
  for (var pass = 0; pass < 200; pass++) {
    // 1. Clear all possible matches greedily
    for (var mPass = 0; mPass < sim.length; mPass++) {
      var ms = findAllMatches(sim);
      if (!ms.length) break;
      var pair = ms[0];
      sim[pair[0]].m = true;
      sim[pair[1]].m = true;
      collapseMatchedRows(sim);
    }
    
    // Check if board is cleared (0 active cells)
    var active = 0;
    for (var i = 0; i < sim.length; i++) if (!sim[i].m) active++;
    if (active === 0) return true;
    
    // 2. If no matches exist but we have active cells, we must add a row
    if (arUsed >= maxAR) {
      return false; // ran out of add rows
    }
    
    var res = executeAddRow(sim, cfg, dryP);
    sim = res.board;
    if (res.wasRescue) {
      dryP = 0;
    } else {
      dryP++;
    }
    arUsed++;
  }
  return false;
}

function validateBoard(board: Cell[], cfg: LevelConfig, lvlIndex: number): { valid: boolean; reason: string } {
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
  
  if (lvlIndex === 0) {
    if (!isBoardSolvable(board)) {
      return { valid: false, reason: 'Level 1 board is not solvable directly' };
    }
  } else {
    if (!isBoardSolvableWithAddRows(board, cfg)) {
      return { valid: false, reason: 'Board is not solvable with Add Row limit' };
    }
  }
  return { valid: true, reason: 'OK' };
}

var MAX_BOARD_ATTEMPTS = 10;

function getBoardWithValidation(lvlIndex: number): Cell[] {
  var sessionSeed = Math.floor(Math.random() * 1000000);
  if (lvlIndex === 0) {
    return generateLevel1Board(sessionSeed);
  }
  var cfg = getLevelConfig(lvlIndex);
  for (var attempt = 0; attempt < MAX_BOARD_ATTEMPTS; attempt++) {
    var seedOffset = (sessionSeed + attempt * 7919) >>> 0;
    var board = generateBoard(cfg, seedOffset);
    
    var transformRng = new RNG((sessionSeed + attempt * 9999) >>> 0);
    var transformedBoard = transformBoardValues(board, transformRng);
    transformedBoard = transformBoardSpatial(transformedBoard, transformRng);
    
    var result = validateBoard(transformedBoard, cfg, lvlIndex);
    if (result.valid) return transformedBoard;
  }
  return generateFallbackBoard(cfg, sessionSeed);
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
(globalThis as any).isBoardSolvableWithAddRows = isBoardSolvableWithAddRows;
(globalThis as any).validateBoard = validateBoard;
(globalThis as any).getBoardWithValidation = getBoardWithValidation;
(globalThis as any).seedBoard = seedBoard;
