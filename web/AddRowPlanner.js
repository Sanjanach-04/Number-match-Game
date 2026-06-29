"use strict";
// AddRowPlanner.ts - Deterministic Add Row planning with health repair
// Generate next row values using difficulty settings and board analysis
function planNextRow(board, cfg, rng) {
    var stragglers = findStragglers(board);
    var weightedComplements = getWeightedActiveComplements(board);
    var row = new Array(9);
    var decoyRatio = cfg ? cfg.decoyRatio : 0.18;
    var decoyCount = Math.floor(9 * decoyRatio);
    var helperCount = 9 - decoyCount;
    var idx = 0;
    // 1. Prioritize straggler complements
    for (var i = 0; i < stragglers.length && idx < helperCount; i++) {
        row[idx++] = comp(stragglers[i]);
    }
    // 2. Fill helpers with weighted active complements
    while (idx < helperCount) {
        if (weightedComplements.length > 0) {
            row[idx++] = selectWeighted(weightedComplements, rng);
        }
        else {
            row[idx++] = rng.range(1, 9);
        }
    }
    // 3. Fill the remainder with decoys
    while (idx < 9) {
        var decoyVal = 1;
        var found = false;
        for (var tries = 0; tries < 20; tries++) {
            var candidate = rng.range(1, 9);
            var hasMatch = false;
            for (var k = 0; k < board.length; k++) {
                if (!board[k].m && (board[k].v === candidate || (board[k].v + candidate) === 10)) {
                    hasMatch = true;
                    break;
                }
            }
            if (!hasMatch) {
                decoyVal = candidate;
                found = true;
                break;
            }
        }
        if (!found)
            decoyVal = rng.range(1, 9);
        row[idx++] = decoyVal;
    }
    // 4. Position formatting based on help level / difficulty score
    var diff = cfg ? cfg.difficultyScore : 3;
    if (diff === 1) {
        // Level 1: Make adjacent matches in the row
        for (var i = 0; i < 8; i += 2) {
            row[i + 1] = comp(row[i]);
        }
    }
    else if (diff <= 3) {
        // Level 3: Small scanning distance
        rng.shuffle(row);
    }
    else {
        // Harder levels: Shuffle and let spacing distribute
        rng.shuffle(row);
    }
    return row;
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
    var isRescue = shouldRescue(dryPresses);
    var seed = boardSeed(board);
    var rng = new RNG(seed);
    var newRow = [];
    var newBoard = [];
    var wasRescue = isRescue;
    if (isRescue) {
        newRow = generateRescueRow(board, rng);
        newBoard = board.concat(newRow.map(function (v) { return { v: v, m: false }; }));
    }
    else {
        var success = false;
        for (var attempt = 0; attempt < 20; attempt++) {
            var attemptSeed = (seed + attempt * 7919) >>> 0;
            var attemptRng = new RNG(attemptSeed);
            newRow = planNextRow(board, cfg, attemptRng);
            newBoard = board.concat(newRow.map(function (v) { return { v: v, m: false }; }));
            if (isBoardSolvable(newBoard)) {
                success = true;
                break;
            }
        }
        if (!success) {
            // Fallback: force a rescue row to guarantee solvability
            newRow = generateRescueRow(board, rng);
            newBoard = board.concat(newRow.map(function (v) { return { v: v, m: false }; }));
            wasRescue = true;
        }
    }
    return {
        board: newBoard,
        val: newRow[0],
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
