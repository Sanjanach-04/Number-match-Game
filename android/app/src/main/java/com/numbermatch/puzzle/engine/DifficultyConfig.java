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

    public DifficultyConfig(int level, long seed, float matchDensity, float decoyRatio,
                            float frictionFactor, int idealAddRowUses, int targetTimeSeconds) {
        this.level = level;
        this.seed = seed;
        this.matchDensity = matchDensity;
        this.decoyRatio = decoyRatio;
        this.frictionFactor = frictionFactor;
        this.idealAddRowUses = idealAddRowUses;
        this.targetTimeSeconds = targetTimeSeconds;
        this.initialRows = 3;
        this.maxAddRowUses = 6;
    }

    /**
     * SAWTOOTH CURVE TABLE
     *
     * Level | Target Time | Match Density | Decoy Ratio | Ideal AddRow | Experience
     * ------|-------------|---------------|-------------|--------------|------------
     *   1   |   45s       |   0.80        |   0.10      |     1        | Easy / instant gratification
     *   2   |   60s       |   0.72        |   0.20      |     1-2      | Slightly harder
     *   3   |   90s       |   0.65        |   0.30      |     2-3      | Normal, requires scanning
     *   4   |   120s      |   0.58        |   0.38      |     2-3      | Moderately hard
     *   5   |   150s      |   0.50        |   0.50      |     2-3      | Hard, buried matches
     *   6   |   90s       |   0.65        |   0.30      |     2-4      | RELIEF - back to L3 feel
     *   7   |   120s      |   0.55        |   0.45      |     3-4      | Harder ramp
     *   8   |   150s      |   0.48        |   0.55      |     3-5      | Very hard
     *   9   |   180s      |   0.42        |   0.62      |     4-5      | Intense
     *  10   |   210s      |   0.38        |   0.68      |     4-6      | Peak difficulty
     *  11   |   90s       |   0.65        |   0.30      |     2-4      | RELIEF - drops again
     */
    public static DifficultyConfig forLevel(int level) {
        // Seeds are fixed prime-based values to ensure determinism per level
        switch (level) {
            case 1:  return new DifficultyConfig(1,  1000003L, 0.80f, 0.10f, 0.10f, 1,  45);
            case 2:  return new DifficultyConfig(2,  1000033L, 0.72f, 0.20f, 0.25f, 2,  60);
            case 3:  return new DifficultyConfig(3,  1000037L, 0.65f, 0.30f, 0.35f, 2,  90);
            case 4:  return new DifficultyConfig(4,  1000039L, 0.58f, 0.38f, 0.45f, 3, 120);
            case 5:  return new DifficultyConfig(5,  1000081L, 0.50f, 0.50f, 0.55f, 3, 150);
            case 6:  return new DifficultyConfig(6,  1000099L, 0.65f, 0.30f, 0.35f, 3,  90); // RELIEF
            case 7:  return new DifficultyConfig(7,  1000117L, 0.55f, 0.45f, 0.50f, 4, 120);
            case 8:  return new DifficultyConfig(8,  1000121L, 0.48f, 0.55f, 0.62f, 4, 150);
            case 9:  return new DifficultyConfig(9,  1000133L, 0.42f, 0.62f, 0.72f, 5, 180);
            case 10: return new DifficultyConfig(10, 1000151L, 0.38f, 0.68f, 0.82f, 5, 210);
            case 11: return new DifficultyConfig(11, 1000159L, 0.65f, 0.30f, 0.35f, 3,  90); // RELIEF
            default:
                // For levels beyond 11: continue sawtooth, cap at L10 difficulty
                int cycle = ((level - 1) % 5) + 1; // repeat 5-level cycles
                return forLevel(cycle <= 3 ? 10 : 6);
        }
    }
}
