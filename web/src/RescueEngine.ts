// RescueEngine.ts - Detects player frustration and generates rescue rows (v3 sync)

interface Cell {
  v: number;
  m: boolean;
}

// Complement helper (same-value is easy, sum-10 is standard)
function comp(v: number): number {
  return v === 5 ? 5 : (10 - v);
}

// Returns true if player is in rescue state (2 or more dry presses)
function shouldRescue(dryPresses: number): boolean {
  return dryPresses >= 2;
}

// Generates a rescue row of 9 cells
// Obvious matches are created by placing two adjacent same-value pairs at the front of the row (V, V, W, W at positions 0-3)
// The remaining positions are filled with matchable helpers to avoid any pure decoys.
function generateRescueRow(board: Cell[], rng: any): number[] {
  var activeVals: number[] = [];
  for (var i = 0; i < board.length; i++) {
    if (!board[i].m) {
      activeVals.push(board[i].v);
    }
  }
  if (activeVals.length === 0) {
    activeVals = [1, 2, 3, 4, 5, 6, 7, 8, 9];
  }
  
  var v = activeVals[rng.int(activeVals.length)];
  var w = v;
  var attempts = 0;
  while (w === v && attempts < 20) {
    var potentialW = activeVals[rng.int(activeVals.length)];
    if (potentialW !== v) {
      w = potentialW;
      break;
    }
    attempts++;
  }
  
  var row: number[] = new Array(9);
  row[0] = v;
  row[1] = v;
  row[2] = w;
  row[3] = w;
  
  // Fill remaining cells 4-8 with helpers (no pure decoys)
  // 4 & 5 form a sum-to-10 or same-value pair
  var pVal = activeVals[rng.int(activeVals.length)];
  row[4] = pVal;
  row[5] = comp(pVal);
  
  // 6 & 7 form another pair
  var pVal2 = activeVals[rng.int(activeVals.length)];
  row[6] = pVal2;
  row[7] = comp(pVal2);
  
  // 8 is complement of another active cell
  var pVal3 = activeVals[rng.int(activeVals.length)];
  row[8] = comp(pVal3);
  
  return row;
}

// Global exports
(globalThis as any).comp = comp;
(globalThis as any).shouldRescue = shouldRescue;
(globalThis as any).generateRescueRow = generateRescueRow;
