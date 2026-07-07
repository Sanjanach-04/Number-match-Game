// AddRowPlanner.ts - Intelligent Deterministic Add Row Engine (v4)
//
// Algorithm (per user specification):
//   Step 1: Scan board — collect active numbers
//   Step 2: Analyse — identify stranded, orphan, and already-matched cells
//   Step 3: Generate minimal rescue row (only required complements, deduplicated)
//   Step 4: Validate — ensure at least one immediate legal move exists, board stays solvable
//   Step 5: Pad to grid width (9) using complement pairs of existing active cells
//
// No random number generation. All decisions are deterministic from board state.
//
// Note: Cell, LevelConfig interfaces declared in BoardAnalyzer.ts / DifficultyEngine.ts

// ─── Step 1 + 2: Board State Scan ─────────────────────────────────────────────

interface AddRowAnalysis {
  activeVals: number[];           // All unmatched cell values in board order
  strandedVals: number[];         // Cells currently with no reachable match path
  orphanVals: number[];           // Cells whose value AND complement are unique (no possible partner)
  matchCount: number;             // Number of currently available matches
  isSolvable: boolean;            // Can board be cleared using greedy solver?
  hasMatch: boolean;              // Is there at least one playable move right now?
}

function scanBoard(board: Cell[]): AddRowAnalysis {
  // Collect active values in reading order
  var activeVals: number[] = [];
  for (var i = 0; i < board.length; i++) {
    if (!board[i].m) activeVals.push(board[i].v);
  }

  // Find all immediately reachable matches
  var allMatches = findAllMatches(board);
  var inMatch: { [i: number]: boolean } = {};
  for (var i = 0; i < allMatches.length; i++) {
    inMatch[allMatches[i][0]] = true;
    inMatch[allMatches[i][1]] = true;
  }

  // Classify each active cell
  var strandedVals: number[] = [];
  for (var i = 0; i < board.length; i++) {
    if (!board[i].m && !inMatch[i]) {
      strandedVals.push(board[i].v);
    }
  }

  // Orphans: value where neither it NOR its complement exists anywhere else on the board
  var freq: { [v: number]: number } = {};
  for (var i = 0; i < activeVals.length; i++) {
    var v = activeVals[i];
    freq[v] = (freq[v] || 0) + 1;
  }
  var orphanVals: number[] = [];
  var seenOrphan: { [v: number]: boolean } = {};
  for (var i = 0; i < activeVals.length; i++) {
    var v = activeVals[i];
    if (seenOrphan[v]) continue;
    seenOrphan[v] = true;
    var c = comp(v);
    // Orphan if: only 1 of this value, and its complement doesn't exist at all
    var sameCount = freq[v] || 0;
    var compCount = (c === v) ? sameCount : (freq[c] || 0);
    if (sameCount <= 1 && compCount === 0) {
      orphanVals.push(v);
    }
  }

  var hasMatch = allMatches.length > 0;
  var isSolvable = hasMatch && isBoardSolvable(board);

  return {
    activeVals,
    strandedVals,
    orphanVals,
    matchCount: allMatches.length,
    isSolvable,
    hasMatch
  };
}

// ─── Step 3: Minimal Rescue Row Generation ─────────────────────────────────────
// Generates the SMALLEST possible row that gives the player at least one new move.
// Priority order:
//   1. Complements for stranded cells (cells with no current match path)
//   2. Complements for orphan cells (cells that can never match anyone)
//   3. Pair for last active cell (last resort)
// Deduplication: one complement per unique stranded value only.

function buildMinimalRescueRow(analysis: AddRowAnalysis): number[] {
  // Board is empty → safe default
  if (analysis.activeVals.length === 0) {
    return [5, 5];
  }

  // Board already solvable → no row needed
  if (analysis.isSolvable) {
    return [];
  }

  // ── Key algorithm: REVERSED complement order ──────────────────────────────
  // Placing the complement of the LAST stranded cell FIRST means it sits
  // ADJACENT to the board's last cell → guaranteed immediate match.
  // After that match clears, the gap opens up so the next complement also
  // becomes reachable → deterministic cascade from last cell to first.
  //
  // Example: stranded=[3,4,5,7] → reversed=[7,5,4,3]
  //          → complements=[3,5,6,7]
  //   Board: [3,4,5,7,3,5,6,7]
  //   Step1: 7&3 adjacent (positions 3,4) → match
  //   Step2: 5&5 across cleared gap (positions 2,5) → match
  //   Step3: 4&6 (positions 1,6) → match
  //   Step4: 3&7 (positions 0,7) → match → fully cleared ✓

  var row: number[] = [];
  var addedComplements: { [c: number]: boolean } = {};

  // Reverse the stranded list so last cell's complement is placed first
  var reversedStranded = analysis.strandedVals.slice().reverse();

  for (var i = 0; i < reversedStranded.length; i++) {
    var v = reversedStranded[i];
    var c = comp(v);
    if (!addedComplements[c]) {
      addedComplements[c] = true;
      row.push(c);
    }
  }

  // If no stranded vals but still stuck: complement for orphan cells
  if (row.length === 0) {
    for (var i = 0; i < analysis.orphanVals.length; i++) {
      var v = analysis.orphanVals[i];
      var c = comp(v);
      if (!addedComplements[c]) {
        addedComplements[c] = true;
        row.push(c);
      }
    }
  }

  // Last-resort: complement of the last active cell + itself to form a pair
  if (row.length === 0 && analysis.activeVals.length > 0) {
    var last = analysis.activeVals[analysis.activeVals.length - 1];
    var c = comp(last);
    row.push(c);
    if (c !== last) row.push(last);
  }

  return row;
}

// ─── Step 4: Validation ────────────────────────────────────────────────────────
// Before applying the row, verify it gives at least one immediate legal move
// and doesn't create new orphans. Returns true if valid.

function validateRescueRow(board: Cell[], newRow: number[]): boolean {
  if (newRow.length === 0) return true; // empty = already solvable, valid

  var testBoard = board.concat(newRow.map(function(v) { return { v: v, m: false }; }));

  // Must have at least one immediate match
  if (!hasAnyMatch(testBoard)) return false;

  // Board must remain solvable
  if (!isBoardSolvable(testBoard)) return false;

  // Must not create new orphans that weren't already there
  var orphansBefore = getOrphanCells(board);
  var orphansAfter = getOrphanCells(testBoard);
  if (orphansAfter.length > orphansBefore.length) return false;

  return true;
}

// ─── Step 5: Grid-width Padding ────────────────────────────────────────────────
// Pads a rescue row to exactly 9 cells for boards with full 9-column rows.
// Padding uses complement pairs of active cells (deterministic, no RNG).
// Never creates orphan digits — all padding uses matched complement pairs.

function padRowToGridWidth(row: number[], board: Cell[]): number[] {
  if (row.length >= 9) return row.slice(0, 9);

  var padded = row.slice();
  var activeVals: number[] = [];
  for (var i = 0; i < board.length; i++) {
    if (!board[i].m) activeVals.push(board[i].v);
  }

  // Round-robin through active values to build complement pairs as padding
  var pivotIdx = 0;
  while (padded.length < 9) {
    if (activeVals.length === 0) {
      // Fallback: 5-5 pairs (always a valid match)
      padded.push(5);
      if (padded.length < 9) padded.push(5);
      continue;
    }

    var pivot = activeVals[pivotIdx % activeVals.length];
    var c = comp(pivot);
    pivotIdx++;

    if (padded.length <= 7) {
      // Room for a pair
      padded.push(pivot);
      if (padded.length < 9) padded.push(c);
    } else {
      // Only 1 slot left — add the complement so it can match the existing pivot on board
      padded.push(c);
    }
  }

  return padded.slice(0, 9);
}

// ─── Compute deterministic board seed (for legacy RNG compatibility) ──────────
function boardSeed(board: Cell[]): number {
  var h = board.length * 97;
  for (var i = 0; i < board.length; i++) {
    if (!board[i].m) {
      h = (h * 31 + board[i].v) >>> 0;
    }
  }
  return Math.max(1, h);
}

// ─── planNextRow: Intelligent next row for normal (non-rescue) Add Row ─────────
// Uses the same priority system as the rescue path but respects difficulty config.
// For difficulty score 1 (Level 1) → column-aware placement.
// For all other levels → complement-first rescue logic.

function planNextRow(board: Cell[], cfg: LevelConfig, _rng?: any): number[] {
  var analysis = scanBoard(board);

  // Level 1 column-aware mode (keeps game friendly for tutorial level)
  if (cfg.difficultyScore === 1 && board.length >= 9) {
    var cols: { [c: number]: { idx: number; v: number }[] } = {};
    for (var c = 0; c < 9; c++) cols[c] = [];
    var activeCells: { idx: number; v: number }[] = [];
    for (var i = 0; i < board.length; i++) {
      if (!board[i].m) {
        var cell = { idx: i, v: board[i].v };
        activeCells.push(cell);
        cols[i % 9].push(cell);
      }
    }

    var row: number[] = [5, 5, 5, 5, 5, 5, 5, 5, 5];
    var emptyCols: number[] = [];
    var extraComps: number[] = [];

    for (var c = 0; c < 9; c++) {
      var list = cols[c];
      if (list.length === 0) {
        emptyCols.push(c);
      } else if (list.length === 1) {
        row[c] = comp(list[0].v); // place complement of the single active cell in column
      } else if (list.length >= 2) {
        row[c] = comp(list[list.length - 1].v);
        extraComps.push(comp(list[0].v));
      }
    }
    for (var i = 0; i < extraComps.length && i < emptyCols.length; i++) {
      row[emptyCols[i]] = extraComps[i];
    }
    return row;
  }

  // Standard mode: build minimal rescue row, then pad
  return buildMinimalRescueRow(analysis);
}

// ─── executeAddRow: Main Entry Point ──────────────────────────────────────────
// Called by game.js and boardValidator.js for every Add Row press.

function executeAddRow(board: Cell[], cfg: LevelConfig, dryPresses: number, totalUses?: number): { board: Cell[]; val: number; wasRescue: boolean } {
  var wasRescue = shouldRescue(dryPresses);

  // Step 1+2: Scan board state
  var analysis = scanBoard(board);

  // Step 3: Generate minimal rescue row
  var newRow: number[];

  if (wasRescue) {
    // Rescue path: always give a clear rescue, ignoring difficulty
    newRow = generateRescueRow(board);
  } else {
    // Normal path: intelligent complement-based row
    newRow = planNextRow(board, cfg);
  }

  // Step 4: Validate. If invalid, fallback to a direct rescue
  if (!validateRescueRow(board, newRow)) {
    // Recalculate: force complement for every stranded cell
    newRow = [];
    var seen: { [c: number]: boolean } = {};
    for (var i = 0; i < analysis.strandedVals.length; i++) {
      var c = comp(analysis.strandedVals[i]);
      if (!seen[c]) { seen[c] = true; newRow.push(c); }
    }
    if (newRow.length === 0 && analysis.activeVals.length > 0) {
      var last = analysis.activeVals[analysis.activeVals.length - 1];
      newRow.push(comp(last));
      newRow.push(last);
    }
    if (newRow.length === 0) {
      newRow = [5, 5];
    }
  }

  // Step 5: Pad to 9 cells for full-grid boards (keeps UI consistent)
  if (board.length >= 9) {
    newRow = padRowToGridWidth(newRow, board);
  }

  // Build final board
  var newBoard = board.concat(newRow.map(function(v) { return { v: v, m: false }; }));

  // Report value: prefer first straggler value (single-cell-row), else first new value
  var stragglers = findStragglers(board);
  var reportVal = stragglers.length > 0 ? stragglers[0] : (newRow.length > 0 ? newRow[0] : 5);

  return {
    board: newBoard,
    val: reportVal,
    wasRescue: wasRescue
  };
}

// ─── Legacy AddEng wrapper (used by game.js) ───────────────────────────────────
function AddEng(lvlIndex: number) {
  this.cfg = getLevelConfig(lvlIndex - 1);
  this.maxU = 6;
  this.uses = 0;
  this.dry = 0;
}

Object.defineProperties(AddEng.prototype, {
  rem:    { get: function() { return this.maxU - this.uses; } },
  exh:    { get: function() { return this.uses >= this.maxU; } },
  rescue: { get: function() { return this.dry >= 2; } }
});

AddEng.prototype.notifyMatch = function() {
  this.dry = 0;
};

AddEng.prototype.genRow = function(boardObj: any) {
  if (this.exh) return null;
  var board = boardObj.cells;
  var res = executeAddRow(board, this.cfg, this.dry, this.uses);
  this.uses++;
  if (res.wasRescue) {
    this.dry = 0;
  } else {
    this.dry++;
  }
  var vals = res.board.slice(board.length).map(function(c) { return c.v; });
  return { vals: vals, wasRescue: res.wasRescue };
};

// Global exports
(globalThis as any).planNextRow = planNextRow;
(globalThis as any).boardSeed = boardSeed;
(globalThis as any).scanBoard = scanBoard;
(globalThis as any).buildMinimalRescueRow = buildMinimalRescueRow;
(globalThis as any).validateRescueRow = validateRescueRow;
(globalThis as any).padRowToGridWidth = padRowToGridWidth;
(globalThis as any).executeAddRow = executeAddRow;
(globalThis as any).AddEng = AddEng;
