"use strict";
// AddRowPlanner.ts - Deterministic Add Row planning with health repair (v3 sync)
// Generate next row values using difficulty settings and board analysis.
function planNextRow(board, cfg, rng) {
    var stragglers = findStragglers(board);
    var diff = cfg ? cfg.difficultyScore : 3;
    var trueDecoyRatio = cfg ? (cfg.trueDecoyRatio !== undefined ? cfg.trueDecoyRatio : cfg.decoyRatio) : 0.18;
    // Count active values on the current board to know what has partners
    var activeFreq = {};
    for (var i = 0; i < board.length; i++) {
        if (!board[i].m) {
            var v = board[i].v;
            activeFreq[v] = (activeFreq[v] || 0) + 1;
        }
    }
    var row = [];
    var stragglerSlotsFilled = 0;
    // TIER 1: Straggler complements (each straggler gets 1 cell)
    for (var i = 0; i < stragglers.length && row.length < 9; i++) {
        var sv = stragglers[i];
        row.push(comp(sv)); // complement of straggler — matches it
        stragglerSlotsFilled++;
    }
    var slots = 9 - row.length;
    var helperSlots = Math.ceil(slots * (1 - trueDecoyRatio));
    var decoySlots = slots - helperSlots;
    // TIER 2: Helper Fill
    var activeVals = [];
    for (var v = 1; v <= 9; v++) {
        if (activeFreq[v])
            activeVals.push(v);
    }
    if (activeVals.length === 0)
        activeVals = [1, 2, 3, 4, 5];
    for (var h = 0; h < helperSlots; h++) {
        var val = activeVals[rng.int(activeVals.length)];
        row.push(comp(val)); // complement of an active cell
    }
    // TIER 3: Decoy Fill (true decoys: no partners on the board)
    var trueDecoys = [];
    for (var d = 1; d <= 9; d++) {
        var partner = comp(d);
        if (!activeFreq[d] && !activeFreq[partner]) {
            trueDecoys.push(d);
        }
    }
    if (trueDecoys.length === 0) {
        // Fallback decoys: not active on board
        for (var d = 1; d <= 9; d++) {
            if (!activeFreq[d]) {
                trueDecoys.push(d);
            }
        }
    }
    if (trueDecoys.length === 0) {
        trueDecoys = [1, 2, 3, 4, 5, 6, 7, 8, 9];
    }
    for (var d = 0; d < decoySlots; d++) {
        var decoy = trueDecoys[rng.int(trueDecoys.length)];
        row.push(decoy);
    }
    // POSITIONING / SHUFFLING:
    if (diff === 1) {
        // Level 1: keep straggler complements at front; shuffle and force adjacent pairs for the rest
        var front = row.slice(0, stragglerSlotsFilled);
        var rest = row.slice(stragglerSlotsFilled);
        rng.shuffle(rest);
        for (var i = 0; i < rest.length - 1; i += 2) {
            rest[i + 1] = comp(rest[i]);
        }
        row = front.concat(rest);
    }
    else if (diff === 2) {
        // Level 2: preserve some adjacency
        var front = row.slice(0, stragglerSlotsFilled);
        var rest = row.slice(stragglerSlotsFilled);
        rng.shuffle(rest);
        for (var i = 0; i < rest.length - 2; i += 3) {
            rest[i + 1] = comp(rest[i]);
        }
        row = front.concat(rest);
    }
    else if (diff <= 6) {
        // Level 3-6 (relief 6): light shuffle (straggler complements remain at front)
        var front = row.slice(0, stragglerSlotsFilled);
        var rest = row.slice(stragglerSlotsFilled);
        rng.shuffle(rest);
        row = front.concat(rest);
    }
    else {
        // Level 7-10: full shuffle (maximum scan distance)
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
    // Capture stragglers BEFORE generating the row (board state at call time)
    var stragglers = findStragglers(board);
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
    // val: if stragglers existed, return the straggler value so callers can
    // confirm which straggler was addressed. Otherwise return first injected cell.
    var reportVal = stragglers.length > 0 ? stragglers[0] : newRow[0];
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
