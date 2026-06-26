/**
 * levelConfig.js
 * Centralized level configuration for the Sawtooth Difficulty Curve.
 *
 * matchDensity   : fraction of cells that form valid pairs (0–1)
 * decoyDensity   : fraction of added-row cells that are decoys (0–1)
 * pairDistance   : max index gap allowed between seeded pairs (1=adjacent, 9=spread)
 * hiddenMatches  : fraction of pairs where the path is non-obvious (diagonal/wrap)
 * expectedAddRow : typical Add Row presses needed to finish
 * difficultyScore: 1(easy)–10(hardest), used by difficultyEngine
 * seed           : fixed RNG seed for deterministic generation
 */
var LEVEL_CONFIG = [
  // L1 — very easy, all pairs adjacent, zero decoys
  { matchDensity:0.90, decoyDensity:0.00, pairDistance:2, hiddenMatches:0.00,
    expectedAddRow:1, difficultyScore:1, seed:1000003 },
  // L2
  { matchDensity:0.82, decoyDensity:0.08, pairDistance:3, hiddenMatches:0.10,
    expectedAddRow:1, difficultyScore:2, seed:1000033 },
  // L3 — normal, 2–3 Add Rows
  { matchDensity:0.72, decoyDensity:0.18, pairDistance:5, hiddenMatches:0.20,
    expectedAddRow:2, difficultyScore:3, seed:1000037 },
  // L4
  { matchDensity:0.62, decoyDensity:0.28, pairDistance:6, hiddenMatches:0.30,
    expectedAddRow:2, difficultyScore:4, seed:1000039 },
  // L5 — hard, buried matches
  { matchDensity:0.50, decoyDensity:0.40, pairDistance:8, hiddenMatches:0.45,
    expectedAddRow:3, difficultyScore:6, seed:1000081 },
  // L6 — RELIEF (easier than L5, similar to L3)
  { matchDensity:0.72, decoyDensity:0.18, pairDistance:4, hiddenMatches:0.20,
    expectedAddRow:2, difficultyScore:3, seed:1000099 },
  // L7 — harder ramp
  { matchDensity:0.55, decoyDensity:0.35, pairDistance:7, hiddenMatches:0.40,
    expectedAddRow:3, difficultyScore:6, seed:1000117 },
  // L8
  { matchDensity:0.46, decoyDensity:0.44, pairDistance:8, hiddenMatches:0.50,
    expectedAddRow:4, difficultyScore:7, seed:1000121 },
  // L9
  { matchDensity:0.40, decoyDensity:0.52, pairDistance:9, hiddenMatches:0.60,
    expectedAddRow:4, difficultyScore:8, seed:1000133 },
  // L10 — hardest
  { matchDensity:0.34, decoyDensity:0.60, pairDistance:9, hiddenMatches:0.70,
    expectedAddRow:5, difficultyScore:10, seed:1000151 },
  // L11 — RELIEF
  { matchDensity:0.72, decoyDensity:0.18, pairDistance:4, hiddenMatches:0.20,
    expectedAddRow:2, difficultyScore:3, seed:1000159 }
];

/** Returns the config for a given 0-indexed level */
function getLevelConfig(lvlIndex) {
  return LEVEL_CONFIG[Math.min(lvlIndex, LEVEL_CONFIG.length - 1)];
}
/** Relief levels (0-indexed) */
var RELIEF_LEVELS = { 5: true, 10: true };
function isReliefLevel(lvlIndex) { return !!RELIEF_LEVELS[lvlIndex]; }
