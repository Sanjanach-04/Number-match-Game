/**
 * simulate.js
 * Simulation script for automated testing.
 * Run in Node.js: node simulate.js
 *
 * Simulates N games per level and reports:
 *   - Success rate
 *   - Average Add Row usage
 *   - Difficulty consistency (std dev of Add Row usage)
 */

/* ── Load modules (Node.js require) ── */
if (typeof require !== 'undefined') {
  eval(require('fs').readFileSync(__dirname + '/rng.js', 'utf8'));
  eval(require('fs').readFileSync(__dirname + '/levelConfig.js', 'utf8'));
  eval(require('fs').readFileSync(__dirname + '/matchFinder.js', 'utf8'));
  eval(require('fs').readFileSync(__dirname + '/solver.js', 'utf8'));
  eval(require('fs').readFileSync(__dirname + '/boardGenerator.js', 'utf8'));
  eval(require('fs').readFileSync(__dirname + '/boardValidator.js', 'utf8'));
  eval(require('fs').readFileSync(__dirname + '/addRowEngine.js', 'utf8'));
}

var GAMES_PER_LEVEL = 1000;
var MAX_ADD_ROWS    = 6;

function stdDev(arr) {
  if (arr.length === 0) return 0;
  var mean = arr.reduce(function (a, b) { return a + b; }, 0) / arr.length;
  var variance = arr.reduce(function (acc, v) { return acc + Math.pow(v - mean, 2); }, 0) / arr.length;
  return Math.sqrt(variance).toFixed(2);
}

function simulateGame(lvlIndex) {
  var board    = getBoardWithValidation(lvlIndex);
  var cfg      = getLevelConfig(lvlIndex);
  var addUses  = 0;
  var dry      = 0;
  var matchesThisRound = 0;

  for (var move = 0; move < 500; move++) {
    if (isBoardCleared(board)) return { success: true, addUses: addUses };

    var matches = findAllMatches(board);
    if (matches.length > 0) {
      // Apply first available match (greedy)
      board[matches[0][0]].m = true;
      board[matches[0][1]].m = true;
      matchesThisRound++;
      dry = 0;
    } else {
      // No match — use Add Row
      if (addUses >= MAX_ADD_ROWS) return { success: false, addUses: addUses };
      var result = executeAddRow(board, cfg, dry);
      board = result.board;
      if (matchesThisRound === 0) dry++; else dry = 0;
      matchesThisRound = 0;
      addUses++;
    }
  }
  return { success: false, addUses: addUses };
}

function runSimulation() {
  console.log('Running ' + GAMES_PER_LEVEL + ' games per level...\n');
  console.log('Lvl | SuccessRate | AvgAddRow | StdDev | Difficulty');
  console.log('----+-------------+-----------+--------+-----------');

  for (var lvl = 0; lvl < LEVEL_CONFIG.length; lvl++) {
    var successes = 0, addRowUsages = [];
    for (var g = 0; g < GAMES_PER_LEVEL; g++) {
      var r = simulateGame(lvl);
      if (r.success) successes++;
      addRowUsages.push(r.addUses);
    }
    var avgAdd = (addRowUsages.reduce(function (a, b) { return a + b; }, 0) / GAMES_PER_LEVEL).toFixed(2);
    var sd     = stdDev(addRowUsages);
    var successRate = ((successes / GAMES_PER_LEVEL) * 100).toFixed(1) + '%';
    var diff   = LEVEL_CONFIG[lvl].difficultyScore;
    console.log('  ' + (lvl + 1) + ' | ' + successRate.padEnd(11) + ' | ' + avgAdd.padEnd(9) + ' | ' + sd.padEnd(6) + ' | ' + diff);
  }
  console.log('\nDone.');
}

if (typeof require !== 'undefined' && require.main === module) {
  runSimulation();
}
