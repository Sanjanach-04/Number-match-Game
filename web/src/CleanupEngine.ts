// CleanupEngine.ts - Straggler cleanup and weighting system

interface Cell {
  v: number;
  m: boolean;
}

var COLS = 9;

// Finds all straggler cell values (rows with exactly 1 active cell)
function findStragglers(board: Cell[]): number[] {
  var rows = Math.ceil(board.length / COLS);
  var stragglers: number[] = [];
  for (var r = 0; r < rows; r++) {
    var activeVals: number[] = [];
    for (var c = 0; c < COLS; c++) {
      var idx = r * COLS + c;
      if (idx < board.length && !board[idx].m) {
        activeVals.push(board[idx].v);
      }
    }
    if (activeVals.length === 1) {
      stragglers.push(activeVals[0]);
    }
  }
  return stragglers;
}

// Computes weighted list of active cells, where straggler cells get 3x higher weight
function getWeightedActiveComplements(board: Cell[]): { val: number; weight: number }[] {
  var rows = Math.ceil(board.length / COLS);
  var rowActiveCounts: number[] = [];

  for (var r = 0; r < rows; r++) {
    var count = 0;
    for (var c = 0; c < COLS; c++) {
      var idx = r * COLS + c;
      if (idx < board.length && !board[idx].m) count++;
    }
    rowActiveCounts.push(count);
  }

  var candidates: { val: number; weight: number }[] = [];
  for (var i = 0; i < board.length; i++) {
    if (board[i].m) continue;
    var row = Math.floor(i / COLS);
    var isStraggler = rowActiveCounts[row] === 1;
    var complement = comp(board[i].v);
    candidates.push({
      val: complement,
      weight: isStraggler ? 3 : 1
    });
  }

  return candidates;
}

// Global exports
(globalThis as any).findStragglers = findStragglers;
(globalThis as any).getWeightedActiveComplements = getWeightedActiveComplements;
