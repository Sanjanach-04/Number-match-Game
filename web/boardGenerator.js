"use strict";
// BoardGenerator.ts - Solvable initial board generation with difficulty targets
// Evaluate board for solvability, immediate match density, and average scan distance
function evaluateBoard(board, cfg) {
    var solvable = isBoardSolvable(board);
    if (!solvable) {
        return { solvable: false, matchDensity: 0, avgScanDist: 0 };
    }
    var startMatches = findAllMatches(board);
    var cellMatched = new Array(board.length).fill(false);
    var distSum = 0;
    for (var i = 0; i < startMatches.length; i++) {
        var pair = startMatches[i];
        cellMatched[pair[0]] = true;
        cellMatched[pair[1]] = true;
        distSum += (pair[1] - pair[0]);
    }
    var activeCount = 0;
    var matchedCount = 0;
    for (var i = 0; i < board.length; i++) {
        if (!board[i].m) {
            activeCount++;
            if (cellMatched[i])
                matchedCount++;
        }
    }
    var density = activeCount > 0 ? (matchedCount / activeCount) : 0;
    var avgScan = startMatches.length > 0 ? (distSum / startMatches.length) : 0;
    return {
        solvable: true,
        matchDensity: density,
        avgScanDist: avgScan
    };
}
// Main board generation function
function generateBoard(cfg, attempt) {
    var seed = (cfg.seed + (attempt || 0) * 7919) >>> 0;
    var rng = new RNG(seed);
    var SAME_VAL = [[1, 1], [2, 2], [3, 3], [4, 4], [5, 5], [6, 6], [7, 7], [8, 8], [9, 9]];
    var SUM_TEN = [[1, 9], [9, 1], [2, 8], [8, 2], [3, 7], [7, 3], [4, 6], [6, 4], [5, 5]];
    // Target ranges based on level difficulty
    var minScan = 1.0;
    var maxScan = 12.0;
    if (cfg.difficultyScore === 1) {
        maxScan = 3.0;
    }
    else if (cfg.difficultyScore <= 3) {
        minScan = 1.5;
        maxScan = 4.5;
    }
    else if (cfg.difficultyScore <= 6) {
        minScan = 3.5;
        maxScan = 7.0;
    }
    else {
        minScan = 4.5;
    }
    for (var searchAttempt = 0; searchAttempt < 100; searchAttempt++) {
        var searchSeed = (seed + searchAttempt * 997) >>> 0;
        var searchRng = new RNG(searchSeed);
        var vals = [];
        var firstPair = [];
        // Generate 13 pairs (26 cells)
        for (var p = 0; p < 13; p++) {
            var useHidden = searchRng.bool(cfg.chainLength / 10);
            var pool = useHidden ? SUM_TEN : SAME_VAL;
            var pair = pool[searchRng.int(pool.length)];
            if (p === 0)
                firstPair = pair.slice();
            vals.push(pair[0]);
            vals.push(pair[1]);
        }
        // Add 1 straggler cell to make 27
        vals.push(searchRng.range(1, 9));
        // Shuffle the layout
        searchRng.shuffle(vals);
        // Force firstPair to index 0 and 1
        var idxA = vals.indexOf(firstPair[0]);
        var idxB = vals.indexOf(firstPair[1], idxA === 0 ? 1 : 0);
        if (idxA >= 0 && idxB >= 0) {
            var tmp = vals[0];
            vals[0] = vals[idxA];
            vals[idxA] = tmp;
            var tmp2 = vals[1];
            vals[1] = vals[idxB];
            vals[idxB] = tmp2;
        }
        var board = vals.map(function (v) { return { v: v, m: false }; });
        var report = evaluateBoard(board, cfg);
        if (report.solvable) {
            var densityDiff = Math.abs(report.matchDensity - cfg.matchDensity);
            // Accept if density difference is within 12% and average scan distance meets guidelines
            if (densityDiff <= 0.12 && report.avgScanDist >= minScan && report.avgScanDist <= maxScan) {
                return board;
            }
        }
    }
    // Fallback: Generate simple solvable board
    var fallbackSeed = (seed + 12345) >>> 0;
    var fallbackRng = new RNG(fallbackSeed);
    var fallbackVals = [];
    var fallbackFirst = [];
    for (var p = 0; p < 13; p++) {
        var pair = SAME_VAL[fallbackRng.int(9)];
        if (p === 0)
            fallbackFirst = pair.slice();
        fallbackVals.push(pair[0]);
        fallbackVals.push(pair[1]);
    }
    fallbackVals.push(5);
    fallbackRng.shuffle(fallbackVals);
    if (fallbackFirst.length) {
        fallbackVals[0] = fallbackFirst[0];
        fallbackVals[1] = fallbackFirst[1];
    }
    return fallbackVals.map(function (v) { return { v: v, m: false }; });
}
// Hand-crafted Level 1 board
function generateLevel1Board() {
    var raw = [1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 1, 1, 2, 2, 3, 3, 4, 4, 5];
    return raw.map(function (v) { return { v: v, m: false }; });
}
// Helper used for legacy validation
function makeBoard(lvlIndex) {
    return getBoardWithValidation(lvlIndex);
}
// Global exports
globalThis.evaluateBoard = evaluateBoard;
globalThis.generateBoard = generateBoard;
globalThis.generateLevel1Board = generateLevel1Board;
globalThis.makeBoard = makeBoard;
