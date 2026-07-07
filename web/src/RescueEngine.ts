// RescueEngine.ts - Deterministic complement-based rescue generation (v4)
// NO random number generation. All rescue rows are derived purely from board state.

// Note: Cell interface declared in BoardAnalyzer.ts

// Complement helper: returns the matching partner value under game rules
function comp(v: number): number {
  return v === 5 ? 5 : (10 - v);
}

// Returns true if player is stuck (2+ consecutive Add Row presses with no match in between)
function shouldRescue(dryPresses: number): boolean {
  return dryPresses >= 2;
}

// ─── Board State Analysis ──────────────────────────────────────────────────────

interface BoardAnalysis {
  activeVals: number[];           // All active (unmatched) values
  strandedVals: number[];         // Values with no reachable match partner (value or complement absent)
  matchedVals: number[];          // Values that already have at least one reachable match
  orphanVals: number[];           // Values whose complement doesn't exist anywhere on board
  alreadySolvable: boolean;       // True if board can be cleared with no add-row
  hasImmediateMatch: boolean;     // True if at least one match is currently playable
}

function analyzeRescueState(board: Cell[]): BoardAnalysis {
  // Collect all active values
  var activeVals: number[] = [];
  for (var i = 0; i < board.length; i++) {
    if (!board[i].m) activeVals.push(board[i].v);
  }

  // Count frequency of each value on board
  var freq: { [v: number]: number } = {};
  for (var i = 1; i <= 9; i++) freq[i] = 0;
  for (var i = 0; i < activeVals.length; i++) freq[activeVals[i]]++;

  // A value is "orphaned" if neither it nor its complement exists elsewhere on the board
  var orphanVals: number[] = [];
  var seen: { [v: number]: boolean } = {};
  for (var i = 0; i < activeVals.length; i++) {
    var v = activeVals[i];
    if (seen[v]) continue;
    seen[v] = true;
    var c = comp(v);
    // Check if this value has a partner (same value or complement)
    var partnerExists = false;
    for (var j = 0; j < activeVals.length; j++) {
      if (activeVals[j] === v && j !== activeVals.indexOf(v)) { partnerExists = true; break; }
      if (activeVals[j] === c) { partnerExists = true; break; }
    }
    if (!partnerExists) orphanVals.push(v);
  }

  // Find which active cells are in a currently reachable match
  var allMatches = findAllMatches(board);
  var matchedIndices: { [i: number]: boolean } = {};
  for (var i = 0; i < allMatches.length; i++) {
    matchedIndices[allMatches[i][0]] = true;
    matchedIndices[allMatches[i][1]] = true;
  }

  var matchedVals: number[] = [];
  var strandedVals: number[] = [];
  for (var i = 0; i < board.length; i++) {
    if (!board[i].m) {
      if (matchedIndices[i]) {
        matchedVals.push(board[i].v);
      } else {
        strandedVals.push(board[i].v);
      }
    }
  }

  var hasImmediateMatch = allMatches.length > 0;
  var alreadySolvable = hasImmediateMatch && isBoardSolvable(board);

  return {
    activeVals,
    strandedVals,
    matchedVals,
    orphanVals,
    alreadySolvable,
    hasImmediateMatch
  };
}

// ─── Deterministic Rescue Row Generation ─────────────────────────────────────
// Generates a MINIMAL rescue row based entirely on board state.
// Never uses random numbers — fully deterministic.
function generateRescueRow(board: Cell[], _rng?: any): number[] {
  var analysis = analyzeRescueState(board);

  // Case 1: Board is empty — use a safe [5, 5] pair
  if (analysis.activeVals.length === 0) {
    return [5, 5];
  }

  // Case 2: Board already solvable — no row needed
  if (analysis.alreadySolvable) {
    return [];
  }

  // Case 3: Generate complements for stranded cells
  // Deduplicate: only generate one complement per unique stranded value
  var seen: { [v: number]: boolean } = {};
  var rescueRow: number[] = [];

  for (var i = 0; i < analysis.strandedVals.length; i++) {
    var v = analysis.strandedVals[i];
    var c = comp(v);
    if (!seen[c]) {
      seen[c] = true;
      rescueRow.push(c);
    }
  }

  // Case 4: If no stranded vals but still not solvable, rescue the last active cell
  if (rescueRow.length === 0) {
    var last = analysis.activeVals[analysis.activeVals.length - 1];
    rescueRow.push(comp(last));
  }

  return rescueRow;
}

// Global exports
(globalThis as any).comp = comp;
(globalThis as any).shouldRescue = shouldRescue;
(globalThis as any).analyzeRescueState = analyzeRescueState;
(globalThis as any).generateRescueRow = generateRescueRow;
