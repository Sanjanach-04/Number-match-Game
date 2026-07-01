/**
 * simulate_difficulty.js — Monte-Carlo difficulty validation
 *
 * Simulates N games per level using the greedy solver, measuring how many
 * Add Row presses are needed to complete each level.
 *
 * Validates:
 *   - Level 1:  90% of games complete with ≤ 1 add-row press
 *   - Level 6/11 (relief): easier than adjacent harder levels
 *   - Sawtooth pattern visible in median add-row counts
 *
 * Run: node simulate_difficulty.js
 */

// ── Load engine modules (mirrors tests.js pattern) ──────────────────────────
if (typeof require !== 'undefined') {
  eval(require('fs').readFileSync(__dirname + '/rng.js', 'utf8'));
  eval(require('fs').readFileSync(__dirname + '/DifficultyEngine.js', 'utf8'));
  eval(require('fs').readFileSync(__dirname + '/BoardAnalyzer.js', 'utf8'));
  eval(require('fs').readFileSync(__dirname + '/SolutionGraph.js', 'utf8'));
  eval(require('fs').readFileSync(__dirname + '/HealthCalculator.js', 'utf8'));
  eval(require('fs').readFileSync(__dirname + '/RescueEngine.js', 'utf8'));
  eval(require('fs').readFileSync(__dirname + '/CleanupEngine.js', 'utf8'));
  eval(require('fs').readFileSync(__dirname + '/AddRowPlanner.js', 'utf8'));
  eval(require('fs').readFileSync(__dirname + '/BoardGenerator.js', 'utf8'));
  eval(require('fs').readFileSync(__dirname + '/boardValidator.js', 'utf8'));
}

// ── Solver-based auto-player ──────────────────────────────────────────────────
// Uses solveBoard() (the gold-standard solver) to play each board state.
// When solveBoard() returns null, we add a row and try again.
// This accurately measures the minimum add-rows needed for any board.
function autoPlay(initialBoard, cfg, maxAddRows) {
  var board = initialBoard.map(function(c) { return { v: c.v, m: c.m }; });
  var addRowsUsed = 0;
  var dryPresses = 0;
  var matchesSinceLastAdd = 0;

  while (true) {
    // Check if fully cleared
    var activeCount = 0;
    for (var k = 0; k < board.length; k++) {
      if (!board[k].m) activeCount++;
    }
    if (activeCount === 0) {
      return { addRowsUsed: addRowsUsed, cleared: true };
    }

    var path = solveBoard(board);
    if (path !== null && path.length > 0) {
      for (var i = 0; i < path.length; i++) {
        board[path[i][0]].m = true;
        board[path[i][1]].m = true;
      }
      matchesSinceLastAdd += path.length;
      dryPresses = 0;
      continue;
    }

    // solveBoard returned null — board is stuck, need add-row
    if (addRowsUsed >= maxAddRows) {
      return { addRowsUsed: addRowsUsed, cleared: false };
    }
    var result = executeAddRow(board, cfg, dryPresses);
    board = result.board;
    addRowsUsed++;
    if (result.wasRescue) {
      dryPresses = 0;
    } else {
      if (matchesSinceLastAdd === 0) {
        dryPresses++;
      } else {
        dryPresses = 0;
      }
    }
    matchesSinceLastAdd = 0;
  }
}

// ── Human-simulation auto-player ──────────────────────────────────────────────
// Simulates a human player with scanning radius, miss rates, and decoy confusion.
// When the human cannot find a match, they press Add Row.
function humanPlay(initialBoard, cfg, maxAddRows, gameIndex) {
  var board = initialBoard.map(function(c) { return { v: c.v, m: c.m }; });
  var addRowsUsed = 0;
  var dryPresses = 0;
  var matchesSinceLastAdd = 0;

  // Set up deterministic RNG for human decisions
  var simRng = new RNG((cfg.seed + gameIndex * 12345) >>> 0);

  // Difficulty scaling parameters
  var diff = cfg.difficultyScore || 3;
  var baseNoticeRate = 0.95;
  var frictionPenalty = 0.90;
  var distanceDecay = 0.96;
  var forceAddRowProb = 0.35;

  if (diff === 1) {
    baseNoticeRate = 0.99;
    frictionPenalty = 1.0;
    distanceDecay = 0.99;
    forceAddRowProb = 0.02;
  } else if (diff === 2) {
    baseNoticeRate = 0.97;
    frictionPenalty = 0.95;
    distanceDecay = 0.97;
    forceAddRowProb = 0.15;
  } else if (diff === 3) {
    baseNoticeRate = 0.94;
    frictionPenalty = 0.90;
    distanceDecay = 0.95;
    forceAddRowProb = 0.35;
  } else if (diff === 4) {
    baseNoticeRate = 0.90;
    frictionPenalty = 0.85;
    distanceDecay = 0.93;
    forceAddRowProb = 0.50;
  } else if (diff === 6) {
    baseNoticeRate = 0.85;
    frictionPenalty = 0.80;
    distanceDecay = 0.90;
    forceAddRowProb = 0.65;
  } else if (diff === 7) {
    baseNoticeRate = 0.80;
    frictionPenalty = 0.75;
    distanceDecay = 0.88;
    forceAddRowProb = 0.70;
  } else if (diff === 8) {
    baseNoticeRate = 0.75;
    frictionPenalty = 0.70;
    distanceDecay = 0.86;
    forceAddRowProb = 0.75;
  } else if (diff === 10) {
    baseNoticeRate = 0.70;
    frictionPenalty = 0.65;
    distanceDecay = 0.84;
    forceAddRowProb = 0.80;
  }

  while (true) {
    // Check if fully cleared
    var activeCount = 0;
    for (var k = 0; k < board.length; k++) {
      if (!board[k].m) activeCount++;
    }
    if (activeCount === 0) {
      return { addRowsUsed: addRowsUsed, cleared: true };
    }

    var allMatches = findAllMatches(board);

    if (allMatches.length === 0) {
      // No matches exist, must add row
      if (addRowsUsed >= maxAddRows) {
        return { addRowsUsed: addRowsUsed, cleared: false };
      }
      var result = executeAddRow(board, cfg, dryPresses);
      board = result.board;
      addRowsUsed++;
      if (result.wasRescue) {
        dryPresses = 0;
      } else {
        if (matchesSinceLastAdd === 0) {
          dryPresses++;
        } else {
          dryPresses = 0;
        }
      }
      matchesSinceLastAdd = 0;
      continue;
    }

    var path = solveBoard(board);
    var candidatePairs = (path !== null && path.length > 0) ? path : allMatches;

    // Human scans the board up to 4 times
    var foundPair = null;
    for (var scan = 0; scan < 4 && foundPair === null; scan++) {
      simRng.shuffle(candidatePairs);
      for (var i = 0; i < candidatePairs.length; i++) {
        var pair = candidatePairs[i];
        var a = pair[0], b = pair[1];
        var isSame = (board[a].v === board[b].v);
        var rA = Math.floor(a / 9), rB = Math.floor(b / 9);
        var cA = a % 9, cB = b % 9;
        var dist = Math.sqrt((rA - rB)*(rA - rB) + (cA - cB)*(cA - cB));
        
        var pNotice = baseNoticeRate;
        if (!isSame) pNotice *= frictionPenalty;
        pNotice *= Math.pow(distanceDecay, dist);
        
        if (simRng.bool(pNotice)) {
          foundPair = pair;
          break;
        }
      }
    }

    if (foundPair === null) {
      // Human didn't see any matches. They think about adding a row.
      var forceAdd = simRng.bool(forceAddRowProb);
      if (!forceAdd) {
        // Use Hint! They clear the hint match
        var best = candidatePairs[0], bg = Math.abs(best[1] - best[0]);
        for (var m = 1; m < candidatePairs.length; m++) {
          var g = Math.abs(candidatePairs[m][1] - candidatePairs[m][0]);
          if (g > bg) { bg = g; best = candidatePairs[m]; }
        }
        foundPair = best;
      }
    }

    if (foundPair !== null) {
      // Match found and cleared
      board[foundPair[0]].m = true;
      board[foundPair[1]].m = true;
      matchesSinceLastAdd++;
    } else {
      // Didn't see any match and decided to force Add Row
      if (addRowsUsed >= maxAddRows) {
        return { addRowsUsed: addRowsUsed, cleared: false };
      }
      var result = executeAddRow(board, cfg, dryPresses);
      board = result.board;
      addRowsUsed++;
      if (result.wasRescue) {
        dryPresses = 0;
      } else {
        if (matchesSinceLastAdd === 0) {
          dryPresses++;
        } else {
          dryPresses = 0;
        }
      }
      matchesSinceLastAdd = 0;
    }
  }
}



// ── Percentile helper ─────────────────────────────────────────────────────────
function percentile(arr, p) {
  var sorted = arr.slice().sort(function(a, b) { return a - b; });
  var idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
}

// ── Run simulation ────────────────────────────────────────────────────────────
var N_GAMES = 30; // games per level (fast enough for dev validation)
var MAX_ADD_ROWS = 6;

console.log('\n════════════════════════════════════════════════════════════════');
console.log(' Number Match — Difficulty Simulation (' + N_GAMES + ' games per level)');
console.log('════════════════════════════════════════════════════════════════');
console.log(
  ' Level │ Target │ Median │ p90 AR │ p95 AR │ Cleared% │ Spec            '
);
console.log('───────┼────────┼────────┼────────┼────────┼──────────┼─────────────────');

var specTargets = [
  { targetTime: 45,  expectedP90AddRows: 1, label: '90% ≤ 1 add-row' },  // L1
  { targetTime: 60,  expectedP90AddRows: 2, label: '90% ≤ 2 add-rows' }, // L2
  { targetTime: 90,  expectedP90AddRows: 3, label: '90% ≤ 3 add-rows' }, // L3
  { targetTime: 120, expectedP90AddRows: 3, label: '90% ≤ 3 add-rows' }, // L4
  { targetTime: 150, expectedP90AddRows: 3, label: '90% ≤ 3 add-rows' }, // L5
  { targetTime: 90,  expectedP90AddRows: 4, label: 'RELIEF ≤ 4 add-rows' }, // L6
  { targetTime: 120, expectedP90AddRows: 4, label: '90% ≤ 4 add-rows' }, // L7
  { targetTime: 150, expectedP90AddRows: 5, label: '90% ≤ 5 add-rows' }, // L8
  { targetTime: 180, expectedP90AddRows: 5, label: '90% ≤ 5 add-rows' }, // L9
  { targetTime: 210, expectedP90AddRows: 6, label: '90% ≤ 6 add-rows' }, // L10
  { targetTime: 90,  expectedP90AddRows: 4, label: 'RELIEF ≤ 4 add-rows' }, // L11
];

var levelResults = [];

for (var lvl = 0; lvl < LEVEL_CONFIG.length; lvl++) {
  var cfg = getLevelConfig(lvl);
  var addRowCounts = [];
  var clearedCount = 0;

  for (var game = 0; game < N_GAMES; game++) {
    // Always use getBoardWithValidation — same as the real game.
    // This ensures boards are genuinely solvable before play starts.
    var board = getBoardWithValidation(lvl);
    var result = humanPlay(board, cfg, MAX_ADD_ROWS, game);
    addRowCounts.push(result.addRowsUsed);
    if (result.cleared) clearedCount++;
  }

  var medianAR = percentile(addRowCounts, 50);
  var p90AR    = percentile(addRowCounts, 90);
  var p95AR    = percentile(addRowCounts, 95);
  var clearedPct = ((clearedCount / N_GAMES) * 100).toFixed(0) + '%';
  var spec     = specTargets[lvl];
  var pass     = p90AR <= spec.expectedP90AddRows && clearedCount >= N_GAMES * 0.95;
  var passIcon = pass ? '✓' : '✗';

  levelResults.push({ lvl: lvl, medianAR: medianAR, p90AR: p90AR, p95AR: p95AR, clearedPct: clearedPct, pass: pass });

  console.log(
    '   ' + (lvl+1).toString().padEnd(3) +
    ' │ ' + (cfg.targetSolveTime + 's').padEnd(6) +
    ' │ ' + medianAR.toString().padEnd(6) +
    ' │ ' + p90AR.toString().padEnd(6) +
    ' │ ' + p95AR.toString().padEnd(6) +
    ' │ ' + clearedPct.padEnd(9) +
    ' │ ' + passIcon + ' ' + spec.label
  );
}

// ── Sawtooth validation ───────────────────────────────────────────────────────
console.log('\n════════════════════════════════════════════════════════════════');
console.log(' Sawtooth Pattern Validation');
console.log('────────────────────────────────────────────────────────────────');

var sawtoothOK = true;

// Levels 1-5 should increase
for (var i = 1; i < 5; i++) {
  var ok = levelResults[i].medianAR >= levelResults[i-1].medianAR;
  console.log('  L' + (i+1) + ' harder than L' + i + ': ' + (ok ? '✓' : '✗') +
    ' (median AR: ' + levelResults[i-1].medianAR + ' → ' + levelResults[i].medianAR + ')');
  if (!ok) sawtoothOK = false;
}

// Level 6 should be easier than Level 5
var L6easierL5 = levelResults[5].medianAR < levelResults[4].medianAR ||
                 levelResults[5].p90AR <= levelResults[4].p90AR;
console.log('  L6 (relief) easier than L5: ' + (L6easierL5 ? '✓' : '✗') +
  ' (median AR: ' + levelResults[4].medianAR + ' → ' + levelResults[5].medianAR + ')');
if (!L6easierL5) sawtoothOK = false;

// Levels 7-10 should trend harder than L6
var L7hardL6 = levelResults[6].p90AR >= levelResults[5].p90AR;
console.log('  L7 harder than L6: ' + (L7hardL6 ? '✓' : '✗') +
  ' (p90 AR: ' + levelResults[5].p90AR + ' → ' + levelResults[6].p90AR + ')');
if (!L7hardL6) sawtoothOK = false;

// Level 11 should be easier than Level 10
var L11easierL10 = levelResults[10].medianAR < levelResults[9].medianAR ||
                   levelResults[10].p90AR <= levelResults[9].p90AR;
console.log('  L11 (relief) easier than L10: ' + (L11easierL10 ? '✓' : '✗') +
  ' (median AR: ' + levelResults[9].medianAR + ' → ' + levelResults[10].medianAR + ')');
if (!L11easierL10) sawtoothOK = false;

// ── Final summary ─────────────────────────────────────────────────────────────
console.log('\n════════════════════════════════════════════════════════════════');
var totalPass = levelResults.filter(function(r) { return r.pass; }).length;
console.log(' Level spec compliance: ' + totalPass + '/' + LEVEL_CONFIG.length + ' levels passing');
console.log(' Sawtooth pattern: ' + (sawtoothOK ? '✓ Correct' : '✗ Check levels above'));
console.log('════════════════════════════════════════════════════════════════\n');
