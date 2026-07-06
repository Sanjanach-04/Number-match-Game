"use strict";
// boardValidator.ts - Validates board state and handles seeder retries
function validateBoard(board) {
    if (!board || board.length !== 27) {
        return { valid: false, reason: 'Board must have exactly 27 cells (3×9)' };
    }
    for (var i = 0; i < board.length; i++) {
        if (board[i].v < 1 || board[i].v > 9) {
            return { valid: false, reason: 'Cell value out of range at index ' + i };
        }
    }
    if (!hasAnyMatch(board)) {
        return { valid: false, reason: 'No initial valid match exists' };
    }
    if (!isBoardSolvable(board)) {
        return { valid: false, reason: 'Board is not solvable' };
    }
    return { valid: true, reason: 'OK' };
}
var MAX_BOARD_ATTEMPTS = 10;
function getBoardWithValidation(lvlIndex) {
    var sessionSeed = Math.floor(Math.random() * 1000000);
    if (lvlIndex === 0) {
        return generateLevel1Board(sessionSeed);
    }
    var cfg = getLevelConfig(lvlIndex);
    for (var attempt = 0; attempt < MAX_BOARD_ATTEMPTS; attempt++) {
        var seedOffset = (sessionSeed + attempt * 7919) >>> 0;
        var board = generateBoard(cfg, seedOffset);
        var transformRng = new RNG((sessionSeed + attempt * 9999) >>> 0);
        var transformedBoard = transformBoardValues(board, transformRng);
        transformedBoard = transformBoardSpatial(transformedBoard, transformRng);
        var result = validateBoard(transformedBoard);
        if (result.valid)
            return transformedBoard;
    }
    return generateLevel1Board(sessionSeed); // final fallback
}
// Wrapper class for legacy engine.js seeder
function seedBoard(lvlIndex) {
    var b = new Board();
    var cells = getBoardWithValidation(lvlIndex - 1);
    var vals = cells.map(function (c) { return c.v; });
    b.addRow(vals.slice(0, 9));
    b.addRow(vals.slice(9, 18));
    b.addRow(vals.slice(18, 27));
    return b;
}
// Global exports
globalThis.validateBoard = validateBoard;
globalThis.getBoardWithValidation = getBoardWithValidation;
globalThis.seedBoard = seedBoard;
