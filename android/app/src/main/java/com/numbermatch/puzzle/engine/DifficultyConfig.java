package com.numbermatch.puzzle.engine;

/**
 * DifficultyConfig - Sawtooth Difficulty Curve Configuration
 *
 * ALGORITHM DESIGN:
 * Each level has a fixed seed, match density, decoy ratio, and friction factor.
 * The "sawtooth" pattern means difficulty rises then drops at relief levels (6, 11).
 *
 * matchDensity: probability that any given number has a pair on the initial board (0.0-1.0)
 * decoyRatio:   fraction of Add Row numbers that are decoys (no immediate match)
 * frictionFactor: overall difficulty feel (0=easy, 1=hard)
 * idealAddRowUses: expected number of Add Row presses to complete the level
 * targetTimeSeconds: median completion time across 100 players
 */
public class DifficultyConfig {

    public final int level;
    public final long seed;           // Deterministic seed for board generation
    public final float matchDensity;  // % of initial numbers that have a match partner
    public final float decoyRatio;    // % of added numbers that are decoys
    public final float frictionFactor;
    public final int idealAddRowUses; // Ideal Add Row presses (out of 6 max)
    public final int targetTimeSeconds;
    public final int initialRows;     // Always 3 per spec, kept for reference
    public final int maxAddRowUses;   // Always 6 per spec

    // New difficulty curve params (v3 sync)
    public final int minGap;
    public final int maxGap;
    public final float trueDecoyRatio;

    public DifficultyConfig(int level, long seed, float matchDensity, float decoyRatio,
                            float frictionFactor, int idealAddRowUses, int targetTimeSeconds,
                            int minGap, int maxGap, float trueDecoyRatio) {
        this.level = level;
        this.seed = seed;
        this.matchDensity = matchDensity;
        this.decoyRatio = decoyRatio;
        this.frictionFactor = frictionFactor;
        this.idealAddRowUses = idealAddRowUses;
        this.targetTimeSeconds = targetTimeSeconds;
        this.initialRows = 3;
        this.maxAddRowUses = 6;
        this.minGap = minGap;
        this.maxGap = maxGap;
        this.trueDecoyRatio = trueDecoyRatio;
    }

    /**
     * SAWTOOTH CURVE TABLE (Sync with JS)
     */
    public static DifficultyConfig forLevel(int level) {
        switch (level) {
            case 1:  return new DifficultyConfig(1,  1000003L, 0.90f, 0.00f, 0.00f, 1,  45,  1, 3,  0.00f);
            case 2:  return new DifficultyConfig(2,  1000033L, 0.82f, 0.08f, 0.10f, 2,  60,  2, 4,  0.05f);
            case 3:  return new DifficultyConfig(3,  1000037L, 0.70f, 0.18f, 0.25f, 2,  90,  3, 6,  0.15f);
            case 4:  return new DifficultyConfig(4,  1000039L, 0.60f, 0.28f, 0.38f, 3, 120,  4, 9,  0.25f);
            case 5:  return new DifficultyConfig(5,  1000081L, 0.48f, 0.42f, 0.50f, 3, 150,  6, 14, 0.40f);
            case 6:  return new DifficultyConfig(6,  1000099L, 0.70f, 0.18f, 0.25f, 3,  90,  3, 6,  0.15f); // RELIEF
            case 7:  return new DifficultyConfig(7,  1000117L, 0.54f, 0.36f, 0.45f, 4, 120,  5, 12, 0.35f);
            case 8:  return new DifficultyConfig(8,  1000121L, 0.44f, 0.48f, 0.58f, 4, 150,  7, 16, 0.46f);
            case 9:  return new DifficultyConfig(9,  1000133L, 0.40f, 0.58f, 0.68f, 5, 180,  8, 18, 0.54f);
            case 10: return new DifficultyConfig(10, 1000151L, 0.35f, 0.68f, 0.78f, 5, 210,  9, 22, 0.63f);
            case 11: return new DifficultyConfig(11, 1000159L, 0.70f, 0.18f, 0.25f, 3,  90,  3, 6,  0.15f); // RELIEF
            default:
                int baseLvl = 2 + ((level - 2) % 10);
                DifficultyConfig base = forLevel(baseLvl);
                long newSeed = (base.seed + (long)level * 997L) & 0xFFFFFFFFL;
                return new DifficultyConfig(level, newSeed, base.matchDensity, base.decoyRatio,
                                            base.frictionFactor, base.idealAddRowUses, base.targetTimeSeconds,
                                            base.minGap, base.maxGap, base.trueDecoyRatio);
        }
    }
}
