"use strict";
// RescueEngine.ts - Deterministic complement-based rescue generation (v4)
// NO random number generation. All rescue rows are derived purely from board state.
// Note: Cell interface declared in BoardAnalyzer.ts
// Complement helper: returns the matching partner value under game rules
function comp(v) {
    return v === 5 ? 5 : (10 - v);
}
// Returns true if player is stuck (2+ consecutive Add Row presses with no match in between)
function shouldRescue(dryPresses) {
    return dryPresses >= 2;
}
function analyzeRescueState(board) {
    // Collect all active values
    var activeVals = [];
    for (var i = 0; i < board.length; i++) {
        if (!board[i].m)
            activeVals.push(board[i].v);
    }
    // Count frequency of each value on board
    var freq = {};
    for (var i = 1; i <= 9; i++)
        freq[i] = 0;
    for (var i = 0; i < activeVals.length; i++)
        freq[activeVals[i]]++;
    // A value is "orphaned" if neither it nor its complement exists elsewhere on the board
    var orphanVals = [];
    var seen = {};
    for (var i = 0; i < activeVals.length; i++) {
        var v = activeVals[i];
        if (seen[v])
            continue;
        seen[v] = true;
        var c = comp(v);
        // Check if this value has a partner (same value or complement)
        var partnerExists = false;
        for (var j = 0; j < activeVals.length; j++) {
            if (activeVals[j] === v && j !== activeVals.indexOf(v)) {
                partnerExists = true;
                break;
            }
            if (activeVals[j] === c) {
                partnerExists = true;
                break;
            }
        }
        if (!partnerExists)
            orphanVals.push(v);
    }
    // Find which active cells are in a currently reachable match
    var allMatches = findAllMatches(board);
    var matchedIndices = {};
    for (var i = 0; i < allMatches.length; i++) {
        matchedIndices[allMatches[i][0]] = true;
        matchedIndices[allMatches[i][1]] = true;
    }
    var matchedVals = [];
    var strandedVals = [];
    for (var i = 0; i < board.length; i++) {
        if (!board[i].m) {
            if (matchedIndices[i]) {
                matchedVals.push(board[i].v);
            }
            else {
                strandedVals.push(board[i].v);
            }
        }
    }
    var hasImmediateMatch = allMatches.length > 0;
    var alreadySolvable = hasImmediateMatch && isBoardSolvable(board);
    return {
        activeVals: activeVals,
        strandedVals: strandedVals,
        matchedVals: matchedVals,
        orphanVals: orphanVals,
        alreadySolvable: alreadySolvable,
        hasImmediateMatch: hasImmediateMatch
    };
}
// ─── Deterministic Rescue Row Generation ─────────────────────────────────────
// Generates a MINIMAL rescue row based entirely on board state.
// Never uses random numbers — fully deterministic.
function generateRescueRow(board, _rng) {
    var analysis = analyzeRescueState(board);
    // Case 1: Board is empty — use a safe [5, 5] pair
    if (analysis.activeVals.length === 0) {
        return [5, 5];
    }
    // Case 2: Board already solvable — no row needed
    if (analysis.alreadySolvable) {
        return [];
    }
    // Case 3: Generate complements for stranded cells
    // Deduplicate: only generate one complement per unique stranded value
    var seen = {};
    var rescueRow = [];
    for (var i = 0; i < analysis.strandedVals.length; i++) {
        var v = analysis.strandedVals[i];
        var c = comp(v);
        if (!seen[c]) {
            seen[c] = true;
            rescueRow.push(c);
        }
    }
    // Case 4: If no stranded vals but still not solvable, rescue the last active cell
    if (rescueRow.length === 0) {
        var last = analysis.activeVals[analysis.activeVals.length - 1];
        rescueRow.push(comp(last));
    }
    return rescueRow;
}
// Global exports
globalThis.comp = comp;
globalThis.shouldRescue = shouldRescue;
globalThis.analyzeRescueState = analyzeRescueState;
globalThis.generateRescueRow = generateRescueRow;
