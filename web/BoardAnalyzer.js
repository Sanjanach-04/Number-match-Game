"use strict";
// BoardAnalyzer.ts - Canonical 4-check match detection and path validation
var COLS = 9;
function valuesMatch(va, vb) {
    return va === vb || (va + vb) === 10;
}
function checkHorizontal(board, a, b) {
    var ra = Math.floor(a / COLS);
    var rb = Math.floor(b / COLS);
    if (ra !== rb)
        return false;
    var lo = Math.min(a, b);
    var hi = Math.max(a, b);
    for (var i = lo + 1; i < hi; i++) {
        if (!board[i].m)
            return false;
    }
    return true;
}
function checkVertical(board, a, b) {
    var ca = a % COLS;
    var cb = b % COLS;
    if (ca !== cb)
        return false;
    var ra = Math.floor(a / COLS);
    var rb = Math.floor(b / COLS);
    var lo = Math.min(ra, rb);
    var hi = Math.max(ra, rb);
    for (var r = lo + 1; r < hi; r++) {
        var cell = board[r * COLS + ca];
        if (cell && !cell.m)
            return false;
    }
    return true;
}
function checkDiagonal(board, a, b) {
    var ra = Math.floor(a / COLS);
    var ca = a % COLS;
    var rb = Math.floor(b / COLS);
    var cb = b % COLS;
    var dr = rb - ra;
    var dc = cb - ca;
    if (Math.abs(dr) !== Math.abs(dc) || dr === 0)
        return false;
    var sr = dr > 0 ? 1 : -1;
    var sc = dc > 0 ? 1 : -1;
    var r = ra + sr;
    var c = ca + sc;
    while (r !== rb || c !== cb) {
        var idx = r * COLS + c;
        if (idx >= 0 && idx < board.length && board[idx] && !board[idx].m)
            return false;
        r += sr;
        c += sc;
    }
    return true;
}
function checkWrap(board, a, b) {
    var lo = Math.min(a, b);
    var hi = Math.max(a, b);
    for (var i = lo + 1; i < hi; i++) {
        if (!board[i].m)
            return false;
    }
    return true;
}
function canMatch(board, a, b) {
    if (a === b || !board[a] || !board[b] || board[a].m || board[b].m)
        return false;
    if (!valuesMatch(board[a].v, board[b].v))
        return false;
    return checkHorizontal(board, a, b) ||
        checkVertical(board, a, b) ||
        checkDiagonal(board, a, b) ||
        checkWrap(board, a, b);
}
function findAllMatches(board) {
    var pairs = [];
    for (var i = 0; i < board.length; i++) {
        if (board[i].m)
            continue;
        for (var j = i + 1; j < board.length; j++) {
            if (board[j].m)
                continue;
            if (canMatch(board, i, j)) {
                pairs.push([i, j]);
            }
        }
    }
    return pairs;
}
// Global matches function alias for legacy adapter
var allPairs = findAllMatches;
function hasAnyMatch(board) {
    for (var i = 0; i < board.length; i++) {
        if (board[i].m)
            continue;
        for (var j = i + 1; j < board.length; j++) {
            if (board[j].m)
                continue;
            if (canMatch(board, i, j))
                return true;
        }
    }
    return false;
}
function isBoardCleared(board) {
    for (var i = 0; i < board.length; i++) {
        if (!board[i].m)
            return false;
    }
    return true;
}
// For compatibility with tests.js that might use old names
var vM = valuesMatch;
var mH = checkHorizontal;
var mV = checkVertical;
var mD = checkDiagonal;
var mW = checkWrap;
var hasAnyMatchLegacy = hasAnyMatch;
function hasAnyMatch_compat(board) {
    return hasAnyMatch(board);
}
// Alias for test compatibility
var hasMatch = hasAnyMatch;
var isCleared = isBoardCleared;
function analyzeBoard(board) {
    var active = [];
    var freq = {};
    for (var i = 0; i < board.length; i++) {
        if (!board[i].m) {
            active.push(i);
            var v = board[i].v;
            freq[v] = (freq[v] || 0) + 1;
        }
    }
    // stragglers
    var rows = Math.ceil(board.length / COLS);
    var stragglers = [];
    for (var r = 0; r < rows; r++) {
        var rowActive = [];
        for (var c = 0; c < COLS; c++) {
            var idx = r * COLS + c;
            if (idx < board.length && !board[idx].m) {
                rowActive.push(board[idx].v);
            }
        }
        if (rowActive.length === 1) {
            stragglers.push(rowActive[0]);
        }
    }
    // isolated
    var isolated = [];
    for (var i = 0; i < active.length; i++) {
        var v = board[active[i]].v;
        var hasPartner = false;
        for (var j = 0; j < active.length; j++) {
            if (i !== j) {
                var w = board[active[j]].v;
                if (v === w || (v + w) === 10) {
                    hasPartner = true;
                    break;
                }
            }
        }
        if (!hasPartner) {
            isolated.push(v);
        }
    }
    return {
        active: active,
        freq: freq,
        stragglers: stragglers,
        isolated: isolated
    };
}
function collapseMatchedRows(board) {
    var rows = Math.floor(board.length / COLS);
    var collapsed = false;
    for (var r = rows - 1; r >= 0; r--) {
        var allMatched = true;
        for (var c = 0; c < COLS; c++) {
            var idx = r * COLS + c;
            if (!board[idx].m) {
                allMatched = false;
                break;
            }
        }
        if (allMatched) {
            board.splice(r * COLS, COLS);
            collapsed = true;
        }
    }
    return collapsed;
}
// Global exports
globalThis.COLS = COLS;
globalThis.valuesMatch = valuesMatch;
globalThis.vM = vM;
globalThis.mH = mH;
globalThis.mV = mV;
globalThis.mD = mD;
globalThis.mW = mW;
globalThis.canMatch = canMatch;
globalThis.findAllMatches = findAllMatches;
globalThis.allPairs = allPairs;
globalThis.hasAnyMatch = hasAnyMatch;
globalThis.hasMatch = hasMatch;
globalThis.isBoardCleared = isBoardCleared;
globalThis.isCleared = isCleared;
globalThis.analyzeBoard = analyzeBoard;
globalThis.hasAnyMatch_compat = hasAnyMatch_compat;
globalThis.collapseMatchedRows = collapseMatchedRows;
