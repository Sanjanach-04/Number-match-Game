"use strict";
// BoardGenerator.ts - Solvable initial board generation with difficulty targets (v3 sync)
// Pair pools
var SAME_VAL_PAIRS = [
    [1, 1], [2, 2], [3, 3], [4, 4], [5, 5], [6, 6], [7, 7], [8, 8], [9, 9]
];
var SUM_TEN_PAIRS = [
    [1, 9], [9, 1], [2, 8], [8, 2], [3, 7], [7, 3], [4, 6], [6, 4]
];
function buildPairPool(pairCount, frictionFactor, rng) {
    var pairs = [];
    pairs.push(SAME_VAL_PAIRS[rng.int(SAME_VAL_PAIRS.length)].slice());
    for (var p = 1; p < pairCount; p++) {
        var useSumTen = rng.bool(frictionFactor);
        if (useSumTen) {
            pairs.push(SUM_TEN_PAIRS[rng.int(SUM_TEN_PAIRS.length)].slice());
        }
        else {
            pairs.push(SAME_VAL_PAIRS[rng.int(SAME_VAL_PAIRS.length)].slice());
        }
    }
    return pairs;
}
function getPairValues(pairs) {
    var vals = {};
    for (var i = 0; i < pairs.length; i++) {
        vals[pairs[i][0]] = true;
        vals[pairs[i][1]] = true;
    }
    return vals;
}
function pickTrueDecoy(pairVals, rng) {
    var candidates = [];
    for (var v = 1; v <= 9; v++) {
        var complement = v === 5 ? 5 : (10 - v);
        if (!pairVals[v] && !pairVals[complement]) {
            candidates.push(v);
        }
    }
    if (candidates.length > 0) {
        return candidates[rng.int(candidates.length)];
    }
    // Fallback
    var freq = {};
    for (var v2 = 1; v2 <= 9; v2++)
        freq[v2] = 0;
    for (var k in pairVals) {
        if (pairVals.hasOwnProperty(k))
            freq[+k]++;
    }
    var rare = [];
    for (var v3 = 1; v3 <= 9; v3++) {
        if (freq[v3] <= 1)
            rare.push(v3);
    }
    if (rare.length > 0)
        return rare[rng.int(rare.length)];
    return rng.range(1, 9);
}
function placePairsWithGap(pairs, minGap, maxGap, rng) {
    var CELLS = 27;
    var slots = new Array(CELLS).fill(null);
    var free = [];
    for (var i = 0; i < CELLS; i++)
        free.push(i);
    function shuffleFree() { rng.shuffle(free); }
    slots[0] = pairs[0][0];
    slots[1] = pairs[0][1];
    free.splice(free.indexOf(0), 1);
    free.splice(free.indexOf(1), 1);
    for (var p = 1; p < pairs.length; p++) {
        shuffleFree();
        var placed = false;
        for (var ai = 0; ai < free.length && !placed; ai++) {
            var slotA = free[ai];
            for (var bi = 0; bi < free.length && !placed; bi++) {
                if (bi === ai)
                    continue;
                var slotB = free[bi];
                var gap = Math.abs(slotA - slotB);
                if (gap >= minGap && gap <= maxGap) {
                    slots[slotA] = pairs[p][0];
                    slots[slotB] = pairs[p][1];
                    free.splice(free.indexOf(slotA), 1);
                    free.splice(free.indexOf(slotB), 1);
                    placed = true;
                }
            }
        }
        if (!placed) {
            shuffleFree();
            if (free.length >= 2) {
                var fa = free.shift();
                var fb = free.shift();
                slots[fa] = pairs[p][0];
                slots[fb] = pairs[p][1];
            }
        }
    }
    return { slots: slots, free: free };
}
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
    var minGap = cfg.minGap || 1;
    var maxGap = cfg.maxGap || 10;
    var frictionFactor = cfg.frictionFactor || 0;
    var matchDensity = cfg.matchDensity || 0.70;
    var pairCount = Math.max(3, Math.min(13, Math.floor(27 * matchDensity / 2)));
    for (var searchAttempt = 0; searchAttempt < 25; searchAttempt++) {
        var searchSeed = (seed + searchAttempt * 997) >>> 0;
        var searchRng = new RNG(searchSeed);
        var pairs = buildPairPool(pairCount, frictionFactor, searchRng);
        var placement = placePairsWithGap(pairs, minGap, maxGap, searchRng);
        var slots = placement.slots;
        var freeSlots = placement.free;
        var pairVals = getPairValues(pairs);
        for (var fi = 0; fi < freeSlots.length; fi++) {
            slots[freeSlots[fi]] = pickTrueDecoy(pairVals, searchRng);
        }
        var vals = [];
        for (var i = 0; i < 27; i++) {
            vals.push(slots[i] !== null ? slots[i] : searchRng.range(1, 9));
        }
        var board = vals.map(function (v) { return { v: v, m: false }; });
        if (!hasAnyMatch(board))
            continue;
        if (!isBoardSolvable(board))
            continue;
        var report = evaluateBoard(board, cfg);
        if (Math.abs(report.matchDensity - matchDensity) <= 0.28) {
            return board;
        }
    }
    return generateFallbackBoard(cfg, seed);
}
function generateFallbackBoard(cfg, seed) {
    var fbRng = new RNG((seed + 12345) >>> 0);
    var vals = [];
    var first = 5;
    for (var p = 0; p < 13; p++) {
        var v = fbRng.range(1, 9);
        if (p === 0)
            first = v;
        vals.push(v);
        vals.push(v);
    }
    vals.push(first);
    fbRng.shuffle(vals);
    var idxA = vals.indexOf(first);
    var idxB = vals.indexOf(first, idxA + 1);
    if (idxA >= 0 && idxB >= 0) {
        var tmp = vals[0];
        vals[0] = vals[idxA];
        vals[idxA] = tmp;
        var tmp2 = vals[1];
        vals[1] = vals[idxB];
        vals[idxB] = tmp2;
    }
    return vals.map(function (v) { return { v: v, m: false }; });
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
