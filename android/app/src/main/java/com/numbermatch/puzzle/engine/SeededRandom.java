package com.numbermatch.puzzle.engine;

/**
 * SeededRandom - Deterministic LCG (Linear Congruential Generator)
 *
 * Using Java's standard LCG constants (same as java.util.Random) so behavior
 * is predictable and reproducible given the same seed.
 *
 * This replaces Math.random() / new Random() throughout the game engine
 * to ensure every level always generates the same board.
 */
public class SeededRandom {

    private static final long MULTIPLIER = 0x5DEECE66DL;
    private static final long ADDEND = 0xBL;
    private static final long MASK = (1L << 48) - 1;

    private long seed;

    public SeededRandom(long seed) {
        this.seed = (seed ^ MULTIPLIER) & MASK;
    }

    private int next(int bits) {
        seed = (seed * MULTIPLIER + ADDEND) & MASK;
        return (int) (seed >>> (48 - bits));
    }

    /** Returns a random int in [0, bound) */
    public int nextInt(int bound) {
        if (bound <= 0) throw new IllegalArgumentException("bound must be positive");
        if ((bound & -bound) == bound) return (int) ((bound * (long) next(31)) >> 31);
        int bits, val;
        do {
            bits = next(31);
            val = bits % bound;
        } while (bits - val + (bound - 1) < 0);
        return val;
    }

    /** Returns a float in [0.0, 1.0) */
    public float nextFloat() {
        return next(24) / ((float) (1 << 24));
    }

    /** Returns true with the given probability (0.0 to 1.0) */
    public boolean nextBoolean(float probability) {
        return nextFloat() < probability;
    }

    /** Returns a random int in [min, max] inclusive */
    public int nextIntRange(int min, int max) {
        return min + nextInt(max - min + 1);
    }

    /** Shuffle an int array in-place using Fisher-Yates */
    public void shuffle(int[] array) {
        for (int i = array.length - 1; i > 0; i--) {
            int j = nextInt(i + 1);
            int tmp = array[i];
            array[i] = array[j];
            array[j] = tmp;
        }
    }

    /** Shuffle an Object array in-place using Fisher-Yates */
    public void shuffle(Object[] array) {
        for (int i = array.length - 1; i > 0; i--) {
            int j = nextInt(i + 1);
            Object tmp = array[i];
            array[i] = array[j];
            array[j] = tmp;
        }
    }
}
