"use strict";
// boardValidator.ts - Validates board state and handles seeder retries
// Note: Cell interface declared in BoardAnalyzer.ts
function isBoardSolvableWithAddRowsLimit(board, cfg, maxAR) {
    var sim = board.map(function (c) { return { v: c.v, m: c.m }; });
    var arUsed = 0;
    var dryP = 0;
    var matchesSinceLastAdd = 0;
    var solver = globalThis.solveBoard || solveBoard;
    while (true) {
        var active = 0;
        for (var i = 0; i < sim.length; i++)
            if (!sim[i].m)
                active++;
        if (active === 0)
            return true;
        var path = solver(sim);
        if (path !== null && path.length > 0) {
            for (var i = 0; i < path.length; i++) {
                sim[path[i][0]].m = true;
                sim[path[i][1]].m = true;
                collapseMatchedRows(sim);
            }
            matchesSinceLastAdd += path.length;
            dryP = 0;
            continue;
        }
        if (arUsed >= maxAR) {
            return false;
        }
        var res = executeAddRow(sim, cfg, dryP, arUsed);
        sim = res.board;
        arUsed++;
        if (res.wasRescue) {
            dryP = 0;
        }
        else {
            if (matchesSinceLastAdd === 0) {
                dryP++;
            }
            else {
                dryP = 0;
            }
        }
        matchesSinceLastAdd = 0;
    }
}
// Returns how many add-row presses an optimal solver requires from the initial board.
// Returns -1 if board cannot be cleared even with maxAR add-rows.
function countRequiredAddRows(board, cfg, maxAR) {
    var sim = board.map(function (c) { return { v: c.v, m: c.m }; });
    var arUsed = 0;
    var dryP = 0;
    var matchesSinceLastAdd = 0;
    var solver = globalThis.solveBoard || solveBoard;
    while (true) {
        var active = 0;
        for (var i = 0; i < sim.length; i++)
            if (!sim[i].m)
                active++;
        if (active === 0)
            return arUsed; // board cleared, return AR count
        var path = solver(sim);
        if (path !== null && path.length > 0) {
            for (var i = 0; i < path.length; i++) {
                sim[path[i][0]].m = true;
                sim[path[i][1]].m = true;
                collapseMatchedRows(sim);
            }
            matchesSinceLastAdd += path.length;
            dryP = 0;
            continue;
        }
        if (arUsed >= maxAR) {
            return -1; // failed
        }
        var res = executeAddRow(sim, cfg, dryP, arUsed);
        sim = res.board;
        arUsed++;
        if (res.wasRescue) {
            dryP = 0;
        }
        else {
            if (matchesSinceLastAdd === 0) {
                dryP++;
            }
            else {
                dryP = 0;
            }
        }
        matchesSinceLastAdd = 0;
    }
}
// Minimum add-rows required per level index (0-based).
// For harder levels, the board must NOT be solvable without at least this many add-row presses.
// This enforces the sawtooth difficulty pattern structurally.
var MIN_REQUIRED_ADD_ROWS = [
    0, // L1: can solve with 0 add-rows (tutorial)
    0, // L2: can solve with 0 add-rows (easy)
    1, // L3: must need at least 1 add-row
    1, // L4: must need at least 1 add-row
    2, // L5: must need at least 2 add-rows
    1, // L6 (relief): must need at least 1 add-row
    1, // L7: must need at least 1 add-row
    2, // L8: must need at least 2 add-rows
    2, // L9: must need at least 2 add-rows
    3, // L10: must need at least 3 add-rows
    1, // L11 (relief): must need at least 1 add-row
];
function validateBoard(board, cfg, lvlIndex) {
    var expectedSize = (lvlIndex === 0) ? 9 : 27;
    if (!board || board.length !== expectedSize) {
        return { valid: false, reason: 'Board must have exactly ' + expectedSize + ' cells' };
    }
    for (var i = 0; i < board.length; i++) {
        if (board[i].v < 1 || board[i].v > 9) {
            return { valid: false, reason: 'Cell value out of range at index ' + i };
        }
    }
    if (!hasAnyMatch(board)) {
        return { valid: false, reason: 'No initial valid match exists' };
    }
    var limit = (lvlIndex === 0) ? 1 : 6;
    if (!isBoardSolvableWithAddRowsLimit(board, cfg, limit)) {
        return { valid: false, reason: 'Board is not solvable within Add Row limit of ' + limit };
    }
    // Enforce minimum add-rows for hard levels to ensure difficulty
    var minAR = lvlIndex < MIN_REQUIRED_ADD_ROWS.length
        ? MIN_REQUIRED_ADD_ROWS[lvlIndex]
        : MIN_REQUIRED_ADD_ROWS[1 + ((lvlIndex - 1) % (MIN_REQUIRED_ADD_ROWS.length - 1))];
    if (minAR > 0) {
        var required = countRequiredAddRows(board, cfg, limit);
        if (required >= 0 && required < minAR) {
            return {
                valid: false,
                reason: 'Board is too easy: requires only ' + required + ' add-rows, need at least ' + minAR
            };
        }
    }
    return { valid: true, reason: 'OK' };
}
var MAX_BOARD_ATTEMPTS = 30; // Increased from 10 to give harder boards more chances to find valid boards
function getBoardWithValidation(lvlIndex) {
    var sessionSeed = Math.floor(Math.random() * 1000000);
    if (lvlIndex === 0) {
        var cfg1 = getLevelConfig(0);
        for (var attempt = 0; attempt < MAX_BOARD_ATTEMPTS; attempt++) {
            var seedOffset = (sessionSeed + attempt * 7919) >>> 0;
            var board = generateLevel1Board(seedOffset);
            var result = validateBoard(board, cfg1, lvlIndex);
            if (result.valid)
                return board;
        }
        return generateLevel1Board(1);
    }
    var cfg = getLevelConfig(lvlIndex);
    for (var attempt = 0; attempt < MAX_BOARD_ATTEMPTS; attempt++) {
        var seedOffset = (sessionSeed + attempt * 7919) >>> 0;
        var board = generateBoard(cfg, seedOffset);
        var transformRng = new RNG((sessionSeed + attempt * 9999) >>> 0);
        var transformedBoard = transformBoardValues(board, transformRng);
        transformedBoard = transformBoardSpatial(transformedBoard, transformRng);
        var result = validateBoard(transformedBoard, cfg, lvlIndex);
        if (result.valid)
            return transformedBoard;
    }
    // Fallback: return any solvable board (ignoring min AR constraint)
    return generateFallbackBoard(cfg, sessionSeed);
}
// Wrapper class for legacy engine.js seeder
function seedBoard(lvlIndex) {
    var b = new Board();
    var cells = getBoardWithValidation(lvlIndex - 1);
    var vals = cells.map(function (c) { return c.v; });
    if (lvlIndex === 1) {
        b.addRow(vals);
    }
    else {
        b.addRow(vals.slice(0, 9));
        b.addRow(vals.slice(9, 18));
        b.addRow(vals.slice(18, 27));
    }
    return b;
}
// Global exports
globalThis.isBoardSolvableWithAddRowsLimit = isBoardSolvableWithAddRowsLimit;
globalThis.countRequiredAddRows = countRequiredAddRows;
globalThis.validateBoard = validateBoard;
globalThis.getBoardWithValidation = getBoardWithValidation;
globalThis.seedBoard = seedBoard;
