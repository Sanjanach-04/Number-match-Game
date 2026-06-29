// RescueEngine.ts - Detects player frustration and generates rescue rows

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
// Obvious match is created by placing the complement of the last active cell at index 0
// and matching it with another cell in the row or wrapping around.
function generateRescueRow(board: Cell[], rng: any): number[] {
  var lastActiveVal: number | null = null;
  for (var i = board.length - 1; i >= 0; i--) {
    if (!board[i].m) {
      lastActiveVal = board[i].v;
      break;
    }
  }

  var val = lastActiveVal !== null ? lastActiveVal : 1;
  var partner = comp(val);

  var row: number[] = new Array(9);
  // Force two adjacent matchable cells at the front of the row
  row[0] = partner;
  row[1] = val;

  // Fill the rest with helpers or decoys deterministically
  for (var c = 2; c < 9; c++) {
    row[c] = rng.range(1, 9);
  }

  return row;
}

// Global exports
(globalThis as any).comp = comp;
(globalThis as any).shouldRescue = shouldRescue;
(globalThis as any).generateRescueRow = generateRescueRow;
