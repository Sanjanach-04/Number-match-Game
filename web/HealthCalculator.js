"use strict";
// HealthCalculator.ts - Calculates Board Health Score and metrics
// Find orphan cells (active cells with no matching values anywhere else on the board)
function getOrphanCells(board) {
    var activeIndices = [];
    for (var i = 0; i < board.length; i++) {
        if (!board[i].m)
            activeIndices.push(i);
    }
    var orphans = [];
    for (var i = 0; i < activeIndices.length; i++) {
        var idx = activeIndices[i];
        var v = board[idx].v;
        var hasPartner = false;
        for (var j = 0; j < activeIndices.length; j++) {
            if (i !== j) {
                var w = board[activeIndices[j]].v;
                if (v === w || (v + w) === 10) {
                    hasPartner = true;
                    break;
                }
            }
        }
        if (!hasPartner) {
            orphans.push(v);
        }
    }
    return orphans;
}
// Find count of rows with exactly 1 active cell
function getIsolatedRowsCount(board) {
    var rows = Math.ceil(board.length / COLS);
    var count = 0;
    for (var r = 0; r < rows; r++) {
        var activeInRow = 0;
        for (var c = 0; c < COLS; c++) {
            var idx = r * COLS + c;
            if (idx < board.length && !board[idx].m) {
                activeInRow++;
            }
        }
        if (activeInRow === 1) {
            count++;
        }
    }
    return count;
}
// Compute average scan distance of available matches
function getAverageScanDistance(board, matches) {
    if (matches.length === 0)
        return 0;
    var sum = 0;
    for (var i = 0; i < matches.length; i++) {
        sum += Math.abs(matches[i][1] - matches[i][0]);
    }
    return sum / matches.length;
}
// Compute chain potential: number of new matches opened up on average by making a match
function getFutureChainPotential(board, matches) {
    if (matches.length === 0)
        return 0;
    var newMatchesSum = 0;
    var origCount = matches.length;
    for (var i = 0; i < matches.length; i++) {
        var pair = matches[i];
        board[pair[0]].m = true;
        board[pair[1]].m = true;
        var newCount = findAllMatches(board).length;
        board[pair[0]].m = false;
        board[pair[1]].m = false;
        if (newCount > origCount - 1) {
            newMatchesSum += (newCount - (origCount - 1));
        }
    }
    return newMatchesSum / matches.length;
}
// Compute dead end risk: fraction of available moves that lead to an unsolvable board
function getDeadEndRisk(board, matches) {
    if (matches.length === 0)
        return 1.0;
    var deadEnds = 0;
    for (var i = 0; i < matches.length; i++) {
        var pair = matches[i];
        board[pair[0]].m = true;
        board[pair[1]].m = true;
        if (!isBoardSolvable(board)) {
            deadEnds++;
        }
        board[pair[0]].m = false;
        board[pair[1]].m = false;
    }
    return deadEnds / matches.length;
}
// Calculate the final Board Health Score
function calculateBoardHealth(board) {
    var matches = findAllMatches(board);
    var orphans = getOrphanCells(board);
    var isolatedRows = getIsolatedRowsCount(board);
    var avgScan = getAverageScanDistance(board, matches);
    var chainPot = getFutureChainPotential(board, matches);
    var deadRisk = getDeadEndRisk(board, matches);
    var solvable = isBoardSolvable(board);
    // Health score calculation logic:
    var score = 100;
    if (!solvable)
        score -= 80;
    score -= orphans.length * 20;
    score -= isolatedRows * 10;
    score -= deadRisk * 50;
    score += Math.min(matches.length, 5) * 5;
    score = Math.max(0, Math.min(100, score));
    // A board is unhealthy if its score falls below 40, or if it is unsolvable,
    // or contains orphans, or has zero moves.
    var isUnhealthy = score < 40 || !solvable || orphans.length > 0 || matches.length === 0;
    return {
        score: score,
        isUnhealthy: isUnhealthy,
        reachablePairs: matches.length,
        orphanCells: orphans,
        isolatedRows: isolatedRows,
        averageScanDistance: avgScan,
        futureChainPotential: chainPot,
        deadEndRisk: deadRisk
    };
}
// Global exports
globalThis.getOrphanCells = getOrphanCells;
globalThis.getIsolatedRowsCount = getIsolatedRowsCount;
globalThis.calculateBoardHealth = calculateBoardHealth;
