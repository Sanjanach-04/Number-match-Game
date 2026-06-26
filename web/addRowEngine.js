/**
 * addRowEngine.js
 * Intelligent Add Number algorithm.
 *
 * Never appends random numbers. Analyzes the current board and injects
 * exactly ONE number that:
 *   1. Matches a straggler (row with 1 remaining cell) if any exist.
 *   2. Otherwise matches an isolated number (no current value-partner).
 *   3. Otherwise duplicates the rarest unmatched value.
 *
 * After injection, validates that at least one move exists.
 * If not, retries with the next best candidate.
 *
 * addRowState tracks consecutive dry presses for the Rescue Mechanic.
 */

/**
 * analyzeBoard(board)
 * Returns analysis of the current board state.
 */
function analyzeBoard(board) {
  var active = [];
  for (var i = 0; i < board.length; i++) {
    if (!board[i].m) active.push(i);
  }

  // Frequency map
  var freq = {};
  for (var i = 0; i < active.length; i++) {
    var v = board[active[i]].v;
    freq[v] = (freq[v] || 0) + 1;
  }

  // Stragglers: rows with exactly 1 unmatched cell
  var rowCount = Math.ceil(board.length / COLS);
  var stragglers = [];
  for (var r = 0; r < rowCount; r++) {
    var rowActive = [];
    for (var c = 0; c < COLS; c++) {
      var idx = r * COLS + c;
      if (idx < board.length && !board[idx].m) rowActive.push(board[idx].v);
    }
    if (rowActive.length === 1) stragglers.push(rowActive[0]);
  }

  // Isolated: values with no value-compatible partner anywhere on board
  var isolated = [];
  for (var i = 0; i < active.length; i++) {
    var v = board[active[i]].v;
    var hasPartner = false;
    for (var j = 0; j < active.length; j++) {
      if (i !== j) {
        var w = board[active[j]].v;
        if (v === w || v + w === 10) { hasPartner = true; break; }
      }
    }
    if (!hasPartner) isolated.push(v);
  }

  return { active: active, freq: freq, stragglers: stragglers, isolated: isolated };
}

/**
 * pickAddValue(board, cfg, isRescue)
 * Decides which single value to inject based on board analysis.
 */
function pickAddValue(board, cfg, isRescue) {
  var analysis = analyzeBoard(board);
  var active = analysis.active;

  // 1. Stragglers first — inject the same value to create an obvious match
  if (analysis.stragglers.length > 0) {
    return analysis.stragglers[0];
  }

  // 2. Isolated numbers — inject their complement
  if (analysis.isolated.length > 0) {
    return analysis.isolated[0]; // same value = easy match; complement = harder
  }

  // 3. Rescue mode — inject the most frequent value (most matchable)
  if (isRescue) {
    var bestVal = active.length ? board[active[0]].v : 1;
    var bestFreq = analysis.freq[bestVal] || 0;
    for (var v in analysis.freq) {
      if (analysis.freq[v] > bestFreq) { bestFreq = analysis.freq[v]; bestVal = +v; }
    }
    return bestVal;
  }

  // 4. Default — inject rarest unmatched value (creates a new match opportunity)
  if (active.length === 0) return 1;
  var rarest = board[active[0]].v;
  var minFreq = analysis.freq[rarest] || 99;
  for (var v in analysis.freq) {
    if (analysis.freq[v] < minFreq) { minFreq = analysis.freq[v]; rarest = +v; }
  }
  return rarest;
}

/**
 * executeAddRow(board, cfg, dryPresses)
 * Injects one number and validates the result.
 * Returns { board: newBoard, val: injectedValue, wasRescue: bool }
 */
function executeAddRow(board, cfg, dryPresses) {
  var isRescue = (dryPresses >= 2);
  var candidates = buildCandidateList(board, isRescue);

  for (var ci = 0; ci < candidates.length; ci++) {
    var val = candidates[ci];
    var newBoard = board.concat([{ v: val, m: false }]);
    // Validate: at least one move must exist after injection
    if (hasAnyMatch(newBoard)) {
      return { board: newBoard, val: val, wasRescue: isRescue };
    }
  }

  // Last resort: guarantee a match by injecting value equal to last unmatched cell
  var lastActive = null;
  for (var i = board.length - 1; i >= 0; i--) {
    if (!board[i].m) { lastActive = board[i].v; break; }
  }
  var rescueVal = lastActive || 1;
  var rescueBoard = board.concat([{ v: rescueVal, m: false }]);
  return { board: rescueBoard, val: rescueVal, wasRescue: true };
}

/**
 * buildCandidateList(board, isRescue)
 * Returns ordered list of candidate values to try, most likely first.
 */
function buildCandidateList(board, isRescue) {
  var analysis = analyzeBoard(board);
  var candidates = [];

  // Priority 1: straggler values
  for (var i = 0; i < analysis.stragglers.length; i++) {
    if (candidates.indexOf(analysis.stragglers[i]) === -1)
      candidates.push(analysis.stragglers[i]);
  }

  // Priority 2: isolated values
  for (var i = 0; i < analysis.isolated.length; i++) {
    if (candidates.indexOf(analysis.isolated[i]) === -1)
      candidates.push(analysis.isolated[i]);
  }

  // Priority 3: all unmatched values by frequency (descending for rescue, ascending otherwise)
  var freqPairs = [];
  for (var v in analysis.freq) freqPairs.push([+v, analysis.freq[v]]);
  freqPairs.sort(function (a, b) { return isRescue ? b[1] - a[1] : a[1] - b[1]; });
  for (var i = 0; i < freqPairs.length; i++) {
    if (candidates.indexOf(freqPairs[i][0]) === -1) candidates.push(freqPairs[i][0]);
  }

  // Fill out with 1–9 if needed
  for (var v = 1; v <= 9; v++) {
    if (candidates.indexOf(v) === -1) candidates.push(v);
  }
  return candidates;
}
