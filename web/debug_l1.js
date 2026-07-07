var fs = require('fs');

eval(fs.readFileSync(__dirname + '/rng.js', 'utf8'));
eval(fs.readFileSync(__dirname + '/DifficultyEngine.js', 'utf8'));
eval(fs.readFileSync(__dirname + '/BoardAnalyzer.js', 'utf8'));
eval(fs.readFileSync(__dirname + '/SolutionGraph.js', 'utf8'));
eval(fs.readFileSync(__dirname + '/HealthCalculator.js', 'utf8'));
eval(fs.readFileSync(__dirname + '/RescueEngine.js', 'utf8'));
eval(fs.readFileSync(__dirname + '/CleanupEngine.js', 'utf8'));
eval(fs.readFileSync(__dirname + '/AddRowPlanner.js', 'utf8'));
eval(fs.readFileSync(__dirname + '/BoardGenerator.js', 'utf8'));
eval(fs.readFileSync(__dirname + '/boardValidator.js', 'utf8'));
eval(fs.readFileSync(__dirname + '/simulate_difficulty.js', 'utf8'));

var cfg = getLevelConfig(0);
for (var g = 0; g < 30; g++) {
  var b = generateLevel1Board(g);
  var res = humanPlay(b, cfg, 6, g);
  if (res.addRowsUsed > 1) {
    console.log('Game', g, 'needed', res.addRowsUsed, 'add rows!');
    // Let's replay this game with verbose console logs
    console.log('--- REPLAY GAME', g, '---');
    var board = b.map(c => ({v: c.v, m: c.m}));
    var simRng = new RNG((cfg.seed + g * 12345) >>> 0);
    var addRowsUsed = 0;
    var dryPresses = 0;
    
    while (true) {
      var activeCount = board.filter(c => !c.m).length;
      if (activeCount === 0) {
        console.log('Cleared!');
        break;
      }
      var allMatches = findAllMatches(board);
      if (allMatches.length === 0) {
        var activeBefore = board.filter(c => !c.m).map(c => c.v);
        console.log('No matches. Active before Add Row:', activeBefore.join(','));
        var result = executeAddRow(board, cfg, dryPresses, addRowsUsed);
        var complements = result.board.slice(board.length).map(c => c.v);
        console.log('Complements generated:', complements.join(','));
        board = result.board;
        addRowsUsed++;
        dryPresses = 0;
        console.log('Board after Add Row:', board.filter(c => !c.m).map(c => c.v).join(','));
        continue;
      }
      
      // Shuffle and sort like humanPlay
      simRng.shuffle(allMatches);
      allMatches.sort(function(a, b) {
        var isSameA = (board[a[0]].v === board[a[1]].v);
        var isSameB = (board[b[0]].v === board[b[1]].v);
        if (isSameA && !isSameB) return -1;
        if (!isSameA && isSameB) return 1;
        return 0;
      });
      
      var pair = allMatches[0];
      console.log('Match:', pair, 'values:', board[pair[0]].v, board[pair[1]].v);
      board[pair[0]].m = true;
      board[pair[1]].m = true;
      collapseMatchedRows(board);
    }
  }
}
