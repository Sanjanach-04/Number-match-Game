/**
 * tests.js — Automated tests for the Number Match engine.
 * Run in Node.js: node tests.js
 */
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

var passed = 0, failed = 0;
function assert(desc, condition) {
  if (condition) { console.log('  ✓ ' + desc); passed++; }
  else           { console.error('  ✗ FAIL: ' + desc); failed++; }
}

/* ── RNG tests ── */
console.log('\n[RNG]');
var r = new RNG(42);
var v1 = r.next(), v2 = r.next();
assert('next() returns positive integer', v1 > 0);
assert('two calls produce different values', v1 !== v2);
var r2 = new RNG(42); // same seed
assert('same seed produces same sequence', r2.next() === v1);

/* ── LevelConfig tests ── */
console.log('\n[LevelConfig]');
assert('11 levels defined', LEVEL_CONFIG.length === 11);
assert('L1 match density >= 0.85', LEVEL_CONFIG[0].matchDensity >= 0.85);
assert('L6 is relief (lower difficulty than L5)', LEVEL_CONFIG[5].difficultyScore < LEVEL_CONFIG[4].difficultyScore);
assert('L11 is relief (lower difficulty than L10)', LEVEL_CONFIG[10].difficultyScore < LEVEL_CONFIG[9].difficultyScore);

/* ── matchFinder tests ── */
console.log('\n[matchFinder]');
var b = [
  {v:5,m:false},{v:5,m:false},{v:3,m:true},{v:7,m:false},{v:7,m:false},
  {v:1,m:false},{v:9,m:false},{v:2,m:false},{v:2,m:false}
];
assert('horizontal 5&5 match found', canMatch(b,0,1));
assert('horizontal with gap skip: 5 and next 5 not same row as 7', !canMatch(b,0,3));
assert('sum-to-10: 3&7 but 3 is matched', !canMatch(b,2,3));
assert('sum-to-10: 1&9 in same row', canMatch(b,5,6));
assert('same value: 2&2', canMatch(b,7,8));
assert('hasAnyMatch returns true', hasAnyMatch(b));
var allPairs = findAllMatches(b);
assert('findAllMatches returns array', Array.isArray(allPairs));
assert('first pair is in reading order (i < j)', allPairs[0][0] < allPairs[0][1]);

/* ── boardGenerator tests ── */
console.log('\n[boardGenerator]');
var l1 = generateLevel1Board();
assert('L1 board has 27 cells', l1.length === 27);
assert('L1 board has match at [0,1]', canMatch(l1,0,1));
for (var lvl = 1; lvl < 11; lvl++) {
  var cfg = getLevelConfig(lvl);
  var board = generateBoard(cfg, 0);
  assert('L' + (lvl+1) + ' board has 27 cells', board.length === 27);
  assert('L' + (lvl+1) + ' board values in range', board.every(function(c){return c.v>=1&&c.v<=9;}));
}

/* ── boardValidator tests ── */
console.log('\n[boardValidator]');
for (var lvl = 0; lvl < 11; lvl++) {
  var vb = getBoardWithValidation(lvl);
  assert('L' + (lvl+1) + ' validated board is solvable', isBoardSolvable(vb));
  assert('L' + (lvl+1) + ' validated board has initial match', hasAnyMatch(vb));
}

/* ── solver tests ── */
console.log('\n[solver]');
var solvable = generateLevel1Board();
assert('L1 hand-crafted board is solvable', isBoardSolvable(solvable));
var unsolvable = Array.from({length:27}, function(_,i){ return {v: i%9+1, m:false}; });
// All different consecutive values — may or may not be solvable, just ensure it returns bool
assert('isBoardSolvable returns boolean', typeof isBoardSolvable(unsolvable) === 'boolean');

/* ── addRowEngine tests ── */
console.log('\n[addRowEngine]');
var testBoard = generateLevel1Board();
// Simulate: match all except last pair
var matches = findAllMatches(testBoard);
while (matches.length > 1) {
  testBoard[matches[0][0]].m = true;
  testBoard[matches[0][1]].m = true;
  matches = findAllMatches(testBoard);
}
var cfg1 = getLevelConfig(0);
var addResult = executeAddRow(testBoard, cfg1, 0);
assert('executeAddRow returns board', Array.isArray(addResult.board));
assert('board grows by 9 after add', addResult.board.length === testBoard.length + 9);
assert('injected value is 1–9', addResult.val >= 1 && addResult.val <= 9);
assert('board has match after add', hasAnyMatch(addResult.board));

/* ── Rescue mechanic test ── */
console.log('\n[Rescue Mechanic]');
var dryBoard = generateLevel1Board();
// Make board have no match by marking all as matched except one odd number
dryBoard.forEach(function(c){c.m=true;});
dryBoard[0].m = false; dryBoard[0].v = 7; // lone 7, no partner
var rescueResult = executeAddRow(dryBoard, getLevelConfig(0), 2); // dryPresses=2 → rescue
assert('rescue mode activates on dryPresses>=2', rescueResult.wasRescue === true);
assert('rescue result has a match', hasAnyMatch(rescueResult.board));

/* ── Straggler cleanup test ── */
console.log('\n[Straggler Cleanup]');
var stragglerBoard = generateLevel1Board();
// Mark all but one cell in row 0 as matched → straggler
for (var c = 1; c < 9; c++) stragglerBoard[c].m = true;
var analysis = analyzeBoard(stragglerBoard);
assert('straggler detected', analysis.stragglers.length > 0);
var sResult = executeAddRow(stragglerBoard, getLevelConfig(0), 0);
assert('straggler value is injected', sResult.val === analysis.stragglers[0]);

/* ── Summary ── */
console.log('\n════════════════════════════');
console.log('Tests: ' + (passed + failed) + ' | Passed: ' + passed + ' | Failed: ' + failed);
if (failed === 0) console.log('All tests passed ✓');
else process.exit(1);
