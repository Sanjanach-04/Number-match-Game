"use strict";
// DifficultyEngine.ts - Sawtooth Difficulty Configuration (v4 - Structural Difficulty)
// ─── Level Configs ────────────────────────────────────────────────────────────
// Index 0 = Level 1, index 10 = Level 11 (relief)
// Difficulty progression:
//   L1-L5:  ramp up
//   L6:     relief (≈ L3 difficulty)
//   L7-L10: ramp up higher
//   L11:    relief (≈ L3 difficulty)
//
// The key structural knobs that ACTUALLY make boards harder:
//   targetImmediateRatio ↓  → fewer obvious first moves
//   targetAvgGap ↑          → pairs are farther apart (harder to spot)
//   buriedPairCount ↑       → more pairs blocked on initial board
//   effectiveDecoyRatio ↑   → more confusing dead-end numbers
//   frictionFactor ↑        → more sum-10 pairs (harder to recognise than same-value)
var LEVEL_CONFIG = [
    // ── Level 1 — Tutorial easy ──────────────────────────────────────────────
    {
        matchDensity: 0.95, frictionFactor: 0.00,
        targetImmediateRatio: 0.92, targetAvgGap: 1.5, buriedPairCount: 0,
        effectiveDecoyRatio: 0.05, strictMatchDensityTolerance: 0.12,
        minGap: 1, maxGap: 3,
        chainLength: 2, averageBranching: 1.2,
        scanDistance: "1-2", isolatedCells: 0,
        addRowDifficulty: 1, targetSolveTime: 45,
        expectedAddRow: 1, difficultyScore: 1,
        seed: 1000003,
        decoyRatio: 0.00, trueDecoyRatio: 0.00
    },
    // ── Level 2 — Easy ───────────────────────────────────────────────────────
    {
        matchDensity: 0.85, frictionFactor: 0.10,
        targetImmediateRatio: 0.75, targetAvgGap: 3.0, buriedPairCount: 0,
        effectiveDecoyRatio: 0.12, strictMatchDensityTolerance: 0.12,
        minGap: 2, maxGap: 5,
        chainLength: 3, averageBranching: 1.5,
        scanDistance: "2-4", isolatedCells: 1,
        addRowDifficulty: 2, targetSolveTime: 65,
        expectedAddRow: 1.5, difficultyScore: 2,
        seed: 1000033,
        decoyRatio: 0.10, trueDecoyRatio: 0.08
    },
    // ── Level 3 — Easy-Medium ────────────────────────────────────────────────
    {
        matchDensity: 0.72, frictionFactor: 0.25,
        targetImmediateRatio: 0.58, targetAvgGap: 5.0, buriedPairCount: 1,
        effectiveDecoyRatio: 0.22, strictMatchDensityTolerance: 0.12,
        minGap: 3, maxGap: 7,
        chainLength: 4, averageBranching: 1.8,
        scanDistance: "3-6", isolatedCells: 2,
        addRowDifficulty: 3, targetSolveTime: 90,
        expectedAddRow: 2.5, difficultyScore: 3,
        seed: 1000037,
        decoyRatio: 0.22, trueDecoyRatio: 0.18
    },
    // ── Level 4 — Medium ─────────────────────────────────────────────────────
    {
        matchDensity: 0.62, frictionFactor: 0.38,
        targetImmediateRatio: 0.45, targetAvgGap: 7.0, buriedPairCount: 2,
        effectiveDecoyRatio: 0.32, strictMatchDensityTolerance: 0.10,
        minGap: 4, maxGap: 10,
        chainLength: 5, averageBranching: 2.0,
        scanDistance: "4-10", isolatedCells: 3,
        addRowDifficulty: 4, targetSolveTime: 120,
        expectedAddRow: 2.5, difficultyScore: 4,
        seed: 1000039,
        decoyRatio: 0.32, trueDecoyRatio: 0.28
    },
    // ── Level 5 — Hard ───────────────────────────────────────────────────────
    {
        matchDensity: 0.52, frictionFactor: 0.50,
        targetImmediateRatio: 0.32, targetAvgGap: 9.0, buriedPairCount: 3,
        effectiveDecoyRatio: 0.42, strictMatchDensityTolerance: 0.10,
        minGap: 5, maxGap: 14,
        chainLength: 6, averageBranching: 2.2,
        scanDistance: "5-14", isolatedCells: 4,
        addRowDifficulty: 5, targetSolveTime: 150,
        expectedAddRow: 3, difficultyScore: 6,
        seed: 1000081,
        decoyRatio: 0.42, trueDecoyRatio: 0.38
    },
    // ── Level 6 — Relief (≈ L3) ──────────────────────────────────────────────
    {
        matchDensity: 0.72, frictionFactor: 0.25,
        targetImmediateRatio: 0.58, targetAvgGap: 5.0, buriedPairCount: 1,
        effectiveDecoyRatio: 0.22, strictMatchDensityTolerance: 0.12,
        minGap: 3, maxGap: 7,
        chainLength: 4, averageBranching: 1.8,
        scanDistance: "3-6", isolatedCells: 2,
        addRowDifficulty: 3, targetSolveTime: 90,
        expectedAddRow: 3, difficultyScore: 3,
        seed: 1000099,
        decoyRatio: 0.22, trueDecoyRatio: 0.18
    },
    // ── Level 7 — Harder ─────────────────────────────────────────────────────
    {
        matchDensity: 0.58, frictionFactor: 0.48,
        targetImmediateRatio: 0.40, targetAvgGap: 8.0, buriedPairCount: 2,
        effectiveDecoyRatio: 0.38, strictMatchDensityTolerance: 0.10,
        minGap: 4, maxGap: 12,
        chainLength: 5, averageBranching: 2.0,
        scanDistance: "4-12", isolatedCells: 3,
        addRowDifficulty: 6, targetSolveTime: 120,
        expectedAddRow: 3, difficultyScore: 6,
        seed: 1000117,
        decoyRatio: 0.38, trueDecoyRatio: 0.30
    },
    // ── Level 8 — Hard ───────────────────────────────────────────────────────
    {
        matchDensity: 0.48, frictionFactor: 0.60,
        targetImmediateRatio: 0.28, targetAvgGap: 10.0, buriedPairCount: 3,
        effectiveDecoyRatio: 0.48, strictMatchDensityTolerance: 0.10,
        minGap: 6, maxGap: 15,
        chainLength: 6, averageBranching: 2.2,
        scanDistance: "6-15", isolatedCells: 4,
        addRowDifficulty: 7, targetSolveTime: 150,
        expectedAddRow: 3.5, difficultyScore: 7,
        seed: 1000121,
        decoyRatio: 0.48, trueDecoyRatio: 0.44
    },
    // ── Level 9 — Very Hard ──────────────────────────────────────────────────
    {
        matchDensity: 0.42, frictionFactor: 0.70,
        targetImmediateRatio: 0.20, targetAvgGap: 12.0, buriedPairCount: 4,
        effectiveDecoyRatio: 0.55, strictMatchDensityTolerance: 0.10,
        minGap: 8, maxGap: 18,
        chainLength: 7, averageBranching: 2.4,
        scanDistance: "8-18", isolatedCells: 5,
        addRowDifficulty: 8, targetSolveTime: 180,
        expectedAddRow: 4, difficultyScore: 8,
        seed: 1000133,
        decoyRatio: 0.55, trueDecoyRatio: 0.50
    },
    // ── Level 10 — Highest Difficulty ────────────────────────────────────────
    {
        matchDensity: 0.36, frictionFactor: 0.82,
        targetImmediateRatio: 0.12, targetAvgGap: 15.0, buriedPairCount: 4,
        effectiveDecoyRatio: 0.65, strictMatchDensityTolerance: 0.10,
        minGap: 9, maxGap: 22,
        chainLength: 8, averageBranching: 2.6,
        scanDistance: "9-22", isolatedCells: 6,
        addRowDifficulty: 10, targetSolveTime: 210,
        expectedAddRow: 4.5, difficultyScore: 10,
        seed: 1000151,
        decoyRatio: 0.65, trueDecoyRatio: 0.60
    },
    // ── Level 11 — Relief (≈ L3) ─────────────────────────────────────────────
    {
        matchDensity: 0.72, frictionFactor: 0.25,
        targetImmediateRatio: 0.58, targetAvgGap: 5.0, buriedPairCount: 1,
        effectiveDecoyRatio: 0.22, strictMatchDensityTolerance: 0.12,
        minGap: 3, maxGap: 7,
        chainLength: 4, averageBranching: 1.8,
        scanDistance: "3-6", isolatedCells: 2,
        addRowDifficulty: 3, targetSolveTime: 90,
        expectedAddRow: 3, difficultyScore: 3,
        seed: 1000159,
        decoyRatio: 0.22, trueDecoyRatio: 0.18
    }
];
// ─── Config Accessors ─────────────────────────────────────────────────────────
function getLevelConfig(lvlIndex) {
    if (lvlIndex < LEVEL_CONFIG.length) {
        return LEVEL_CONFIG[lvlIndex];
    }
    // For levels beyond 11: repeat the sawtooth (indices 1-10)
    var idx = 1 + ((lvlIndex - 1) % (LEVEL_CONFIG.length - 1));
    var base = LEVEL_CONFIG[idx];
    return {
        matchDensity: base.matchDensity,
        decoyRatio: base.decoyRatio,
        frictionFactor: base.frictionFactor,
        targetImmediateRatio: base.targetImmediateRatio,
        targetAvgGap: base.targetAvgGap,
        buriedPairCount: base.buriedPairCount,
        effectiveDecoyRatio: base.effectiveDecoyRatio,
        strictMatchDensityTolerance: base.strictMatchDensityTolerance,
        chainLength: base.chainLength,
        averageBranching: base.averageBranching,
        scanDistance: base.scanDistance,
        isolatedCells: base.isolatedCells,
        addRowDifficulty: base.addRowDifficulty,
        targetSolveTime: base.targetSolveTime,
        expectedAddRow: base.expectedAddRow,
        difficultyScore: base.difficultyScore,
        seed: (base.seed + lvlIndex * 997) >>> 0, // dynamic unique seed per playthrough-level
        minGap: base.minGap,
        maxGap: base.maxGap,
        trueDecoyRatio: base.trueDecoyRatio,
    };
}
function isReliefLevel(lvlIndex) {
    if (lvlIndex < LEVEL_CONFIG.length) {
        return lvlIndex === 5 || lvlIndex === 10;
    }
    var idx = 1 + ((lvlIndex - 1) % (LEVEL_CONFIG.length - 1));
    return idx === 5 || idx === 10;
}
// Legacy compatibility alias
var LCFG = LEVEL_CONFIG.map(function (c) {
    return {
        md: c.matchDensity,
        dr: c.decoyRatio,
        sv: 1 - c.decoyRatio,
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
