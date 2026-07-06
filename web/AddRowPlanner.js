"use strict";
// AddRowPlanner.ts - Deterministic Add Row planning with health repair (v3 sync)
// Generate next row values using difficulty settings and board analysis.
function planNextRow(board, cfg, rng) {
    // 1. Gather all active cells
    var activeCells = [];
    var activeFreq = {};
    for (var i = 0; i < board.length; i++) {
        if (!board[i].m) {
            var v = board[i].v;
            activeCells.push({ idx: i, v: v });
            activeFreq[v] = (activeFreq[v] || 0) + 1;
        }
    }
    // 2. Identify orphans and calculate missing complements
    var required = [];
    for (var d = 1; d <= 4; d++) {
        var partner = 10 - d;
        var countD = activeFreq[d] || 0;
        var countP = activeFreq[partner] || 0;
        if (countD > countP) {
            var diff = countD - countP;
            for (var k = 0; k < diff; k++) {
                required.push(partner);
            }
        }
        else if (countP > countD) {
            var diff = countP - countD;
            for (var k = 0; k < diff; k++) {
                required.push(d);
            }
        }
    }
    // For 5: count must be even
    var count5 = activeFreq[5] || 0;
    if (count5 % 2 !== 0) {
        required.push(5);
    }
    // 3. If required is empty but board is not solvable (or has no matches), force an injection
    var currentSolvable = isBoardSolvable(board);
    var hasMatches = hasAnyMatch(board);
    if (required.length === 0) {
        if (!currentSolvable || !hasMatches) {
            if (activeCells.length > 0) {
                var lastActive = activeCells[activeCells.length - 1];
                var partner = comp(lastActive.v);
                required.push(partner);
                required.push(lastActive.v);
            }
            else {
                required.push(5);
                required.push(5);
            }
        }
        else {
            // Already solvable and has matches! No Add Row required.
            return [];
        }
    }
    // 4. Try shuffles of the required list to find a layout that keeps the board solvable
    var bestRow = required.slice();
    var bestAttempts = 30;
    var success = false;
    var extraPairsAdded = 0;
    while (!success && extraPairsAdded < 5) {
        for (var attempt = 0; attempt < bestAttempts; attempt++) {
            var attemptRow = bestRow.slice();
            rng.shuffle(attemptRow);
            var tempBoard = board.concat(attemptRow.map(function (v) { return { v: v, m: false }; }));
            if (hasAnyMatch(tempBoard) && isBoardSolvable(tempBoard)) {
                bestRow = attemptRow;
                success = true;
                break;
            }
        }
        if (success)
            break;
        // If not successful, add a complement pair of some active board cell to help unblock
        if (activeCells.length > 0) {
            var randomVal = activeCells[rng.int(activeCells.length)].v;
            bestRow.push(comp(randomVal));
            bestRow.push(randomVal);
        }
        else {
            bestRow.push(5);
            bestRow.push(5);
        }
        extraPairsAdded++;
    }
    return bestRow;
}
// Select complement value deterministically based on weight
function selectWeighted(candidates, rng) {
    var totalWeight = 0;
    for (var i = 0; i < candidates.length; i++) {
        totalWeight += candidates[i].weight;
    }
    if (totalWeight === 0)
        return rng.range(1, 9);
    var rand = rng.int(totalWeight);
    var sum = 0;
    for (var i = 0; i < candidates.length; i++) {
        sum += candidates[i].weight;
        if (rand < sum)
            return candidates[i].val;
    }
    return candidates[candidates.length - 1].val;
}
// Compute deterministic hash of active board state to seed Add Row RNG
function boardSeed(board) {
    var h = board.length * 97;
    for (var i = 0; i < board.length; i++) {
        if (!board[i].m) {
            h = (h * 31 + board[i].v) >>> 0;
        }
    }
    return Math.max(1, h);
}
// Main execution entry point for Add Row
function executeAddRow(board, cfg, dryPresses) {
    var seed = boardSeed(board);
    var rng = new RNG(seed);
    var wasRescue = shouldRescue(dryPresses);
    var newRow = wasRescue ? generateRescueRow(board, rng) : planNextRow(board, cfg, rng);
    var newBoard = board.concat(newRow.map(function (v) { return { v: v, m: false }; }));
    var stragglers = findStragglers(board);
    var reportVal = stragglers.length > 0 ? stragglers[0] : (newRow.length > 0 ? newRow[0] : 5);
    return {
        board: newBoard,
        val: reportVal,
        wasRescue: wasRescue
    };
}
// Wrapper class for legacy game.js instantiation
function AddEng(lvlIndex) {
    this.cfg = getLevelConfig(lvlIndex - 1);
    this.maxU = 6;
    this.uses = 0;
    this.dry = 0;
}
Object.defineProperties(AddEng.prototype, {
    rem: { get: function () { return this.maxU - this.uses; } },
    exh: { get: function () { return this.uses >= this.maxU; } },
    rescue: { get: function () { return this.dry >= 2; } }
});
AddEng.prototype.notifyMatch = function () {
    this.dry = 0;
};
AddEng.prototype.genRow = function (boardObj) {
    if (this.exh)
        return null;
    // boardObj is Board from engine.js/game.js
    var board = boardObj.cells;
    var res = executeAddRow(board, this.cfg, this.dry);
    this.uses++;
    if (res.wasRescue) {
        this.dry = 0;
    }
    else {
        this.dry++;
    }
    // Extract only the new values (last 9 elements)
    var vals = res.board.slice(board.length).map(function (c) { return c.v; });
    return { vals: vals, wasRescue: res.wasRescue };
};
// Global exports
globalThis.planNextRow = planNextRow;
globalThis.boardSeed = boardSeed;
globalThis.executeAddRow = executeAddRow;
globalThis.AddEng = AddEng;
