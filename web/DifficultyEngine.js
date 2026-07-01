"use strict";
// DifficultyEngine.ts - Sawtooth Difficulty Configuration
var LEVEL_CONFIG = [
    {
        matchDensity: 0.90, frictionFactor: 0.00, trueDecoyRatio: 0.00,
        minGap: 1, maxGap: 3,
        chainLength: 2, averageBranching: 1.2,
        scanDistance: "1-3", isolatedCells: 0,
        addRowDifficulty: 1, targetSolveTime: 45,
        expectedAddRow: 1, difficultyScore: 1,
        seed: 1000003,
        decoyRatio: 0.00
    },
    {
        matchDensity: 0.82, frictionFactor: 0.10, trueDecoyRatio: 0.05,
        minGap: 2, maxGap: 4,
        chainLength: 3, averageBranching: 1.5,
        scanDistance: "2-4", isolatedCells: 1,
        addRowDifficulty: 2, targetSolveTime: 60,
        expectedAddRow: 1.5, difficultyScore: 2,
        seed: 1000033,
        decoyRatio: 0.08
    },
    {
        matchDensity: 0.70, frictionFactor: 0.25, trueDecoyRatio: 0.15,
        minGap: 3, maxGap: 6,
        chainLength: 4, averageBranching: 1.8,
        scanDistance: "3-6", isolatedCells: 2,
        addRowDifficulty: 3, targetSolveTime: 90,
        expectedAddRow: 2.5, difficultyScore: 3,
        seed: 1000037,
        decoyRatio: 0.18
    },
    {
        matchDensity: 0.60, frictionFactor: 0.38, trueDecoyRatio: 0.25,
        minGap: 4, maxGap: 9,
        chainLength: 5, averageBranching: 2.0,
        scanDistance: "4-9", isolatedCells: 3,
        addRowDifficulty: 4, targetSolveTime: 120,
        expectedAddRow: 2.5, difficultyScore: 4,
        seed: 1000039,
        decoyRatio: 0.28
    },
    {
        matchDensity: 0.48, frictionFactor: 0.50, trueDecoyRatio: 0.40,
        minGap: 6, maxGap: 14,
        chainLength: 6, averageBranching: 2.2,
        scanDistance: "6-14", isolatedCells: 4,
        addRowDifficulty: 5, targetSolveTime: 150,
        expectedAddRow: 2.5, difficultyScore: 6,
        seed: 1000081,
        decoyRatio: 0.42
    },
    {
        matchDensity: 0.70, frictionFactor: 0.25, trueDecoyRatio: 0.15,
        minGap: 3, maxGap: 6,
        chainLength: 4, averageBranching: 1.8,
        scanDistance: "3-6", isolatedCells: 2,
        addRowDifficulty: 3, targetSolveTime: 90,
        expectedAddRow: 3.0, difficultyScore: 3,
        seed: 1000099,
        decoyRatio: 0.18
    },
    {
        matchDensity: 0.54, frictionFactor: 0.45, trueDecoyRatio: 0.35,
        minGap: 5, maxGap: 12,
        chainLength: 5, averageBranching: 2.0,
        scanDistance: "5-12", isolatedCells: 3,
        addRowDifficulty: 6, targetSolveTime: 120,
        expectedAddRow: 3.5, difficultyScore: 6,
        seed: 1000117,
        decoyRatio: 0.36
    },
    {
        matchDensity: 0.44, frictionFactor: 0.58, trueDecoyRatio: 0.46,
        minGap: 7, maxGap: 16,
        chainLength: 6, averageBranching: 2.2,
        scanDistance: "7-16", isolatedCells: 4,
        addRowDifficulty: 7, targetSolveTime: 150,
        expectedAddRow: 4.0, difficultyScore: 7,
        seed: 1000121,
        decoyRatio: 0.48
    },
    {
        matchDensity: 0.40, frictionFactor: 0.68, trueDecoyRatio: 0.54,
        minGap: 8, maxGap: 18,
        chainLength: 7, averageBranching: 2.4,
        scanDistance: "8-18", isolatedCells: 5,
        addRowDifficulty: 8, targetSolveTime: 180,
        expectedAddRow: 4.5, difficultyScore: 8,
        seed: 1000133,
        decoyRatio: 0.58
    },
    {
        matchDensity: 0.35, frictionFactor: 0.78, trueDecoyRatio: 0.63,
        minGap: 9, maxGap: 22,
        chainLength: 8, averageBranching: 2.6,
        scanDistance: "9-22", isolatedCells: 6,
        addRowDifficulty: 10, targetSolveTime: 210,
        expectedAddRow: 5.5, difficultyScore: 10,
        seed: 1000151,
        decoyRatio: 0.68
    },
    {
        matchDensity: 0.70, frictionFactor: 0.25, trueDecoyRatio: 0.15,
        minGap: 3, maxGap: 6,
        chainLength: 4, averageBranching: 1.8,
        scanDistance: "3-6", isolatedCells: 2,
        addRowDifficulty: 3, targetSolveTime: 90,
        expectedAddRow: 3.0, difficultyScore: 3,
        seed: 1000159,
        decoyRatio: 0.18
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
