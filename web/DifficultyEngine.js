"use strict";
// DifficultyEngine.ts - Sawtooth Difficulty Configuration
var LEVEL_CONFIG = [
    // Level 1: Easy, target time 45s, 1 add (90% prob)
    {
        matchDensity: 0.70, decoyRatio: 0.00, chainLength: 2, averageBranching: 1.2,
        scanDistance: "1-3", isolatedCells: 0, addRowDifficulty: 1, targetSolveTime: 45,
        expectedAddRow: 1, difficultyScore: 1, seed: 1000003
    },
    // Level 2: Medium Easy, target 60s, 1-2 adds
    {
        matchDensity: 0.65, decoyRatio: 0.08, chainLength: 3, averageBranching: 1.5,
        scanDistance: "2-4", isolatedCells: 1, addRowDifficulty: 2, targetSolveTime: 60,
        expectedAddRow: 1.5, difficultyScore: 2, seed: 1000033
    },
    // Level 3: Medium, target 90s, 2-3 adds
    {
        matchDensity: 0.60, decoyRatio: 0.18, chainLength: 4, averageBranching: 1.8,
        scanDistance: "3-5", isolatedCells: 2, addRowDifficulty: 3, targetSolveTime: 90,
        expectedAddRow: 2.5, difficultyScore: 3, seed: 1000037
    },
    // Level 4: Medium Hard, target 120s, 2-3 adds
    {
        matchDensity: 0.55, decoyRatio: 0.28, chainLength: 5, averageBranching: 2.0,
        scanDistance: "4-6", isolatedCells: 3, addRowDifficulty: 4, targetSolveTime: 120,
        expectedAddRow: 2.5, difficultyScore: 4, seed: 1000039
    },
    // Level 5: Hard, target 150s, 2-3 adds
    {
        matchDensity: 0.45, decoyRatio: 0.42, chainLength: 6, averageBranching: 2.2,
        scanDistance: "5-8", isolatedCells: 4, addRowDifficulty: 5, targetSolveTime: 150,
        expectedAddRow: 2.5, difficultyScore: 6, seed: 1000081
    },
    // Level 6: Relief (Medium), target 90s, 2-4 adds
    {
        matchDensity: 0.60, decoyRatio: 0.18, chainLength: 4, averageBranching: 1.8,
        scanDistance: "3-5", isolatedCells: 2, addRowDifficulty: 3, targetSolveTime: 90,
        expectedAddRow: 3.0, difficultyScore: 3, seed: 1000099
    },
    // Level 7: Hard, target 120s, 3-4 adds
    {
        matchDensity: 0.50, decoyRatio: 0.36, chainLength: 5, averageBranching: 2.0,
        scanDistance: "4-7", isolatedCells: 3, addRowDifficulty: 6, targetSolveTime: 120,
        expectedAddRow: 3.5, difficultyScore: 6, seed: 1000117
    },
    // Level 8: Hard+, target 150s, 3-5 adds
    {
        matchDensity: 0.42, decoyRatio: 0.48, chainLength: 6, averageBranching: 2.2,
        scanDistance: "5-8", isolatedCells: 4, addRowDifficulty: 7, targetSolveTime: 150,
        expectedAddRow: 4.0, difficultyScore: 7, seed: 1000121
    },
    // Level 9: Very Hard, target 180s, 4-5 adds
    {
        matchDensity: 0.38, decoyRatio: 0.58, chainLength: 7, averageBranching: 2.4,
        scanDistance: "6-9", isolatedCells: 5, addRowDifficulty: 8, targetSolveTime: 180,
        expectedAddRow: 4.5, difficultyScore: 8, seed: 1000133
    },
    // Level 10: Peak, target 210s, 5-6 adds
    {
        matchDensity: 0.35, decoyRatio: 0.68, chainLength: 8, averageBranching: 2.6,
        scanDistance: "large", isolatedCells: 6, addRowDifficulty: 10, targetSolveTime: 210,
        expectedAddRow: 5.5, difficultyScore: 10, seed: 1000151
    },
    // Level 11: Relief (Medium), target 90s, 2-4 adds
    {
        matchDensity: 0.60, decoyRatio: 0.18, chainLength: 4, averageBranching: 1.8,
        scanDistance: "3-5", isolatedCells: 2, addRowDifficulty: 3, targetSolveTime: 90,
        expectedAddRow: 3.0, difficultyScore: 3, seed: 1000159
    }
];
function getLevelConfig(lvlIndex) {
    return LEVEL_CONFIG[Math.min(lvlIndex, LEVEL_CONFIG.length - 1)];
}
var RELIEF_LEVELS = { 5: true, 10: true };
function isReliefLevel(lvlIndex) {
    return !!RELIEF_LEVELS[lvlIndex];
}
// For compatibility with legacy config naming
var LCFG = LEVEL_CONFIG.map(function (c) {
    return {
        md: c.matchDensity,
        dr: c.decoyRatio,
        sv: 1 - c.decoyRatio, // SV compatibility
        seed: c.seed
    };
});
var RELIEF_IDX = { 5: 1, 10: 1 };
// Global exports
globalThis.LEVEL_CONFIG = LEVEL_CONFIG;
globalThis.getLevelConfig = getLevelConfig;
globalThis.isReliefLevel = isReliefLevel;
globalThis.LCFG = LCFG;
globalThis.RELIEF_IDX = RELIEF_IDX;
