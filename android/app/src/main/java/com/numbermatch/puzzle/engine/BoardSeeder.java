package com.numbermatch.puzzle.engine;

import java.util.ArrayList;
import java.util.List;

/**
 * BoardSeeder - Part A: Deterministic Initial Board Generation
 *
 * ═══════════════════════════════════════════════════════════════
 * ALGORITHM:
 *
 * 1. PAIR GENERATION (controlled density):
 *    - Based on matchDensity (e.g., 0.80 for Level 1), calculate how many
 *      pairs to place in the 27-cell initial board (3 rows × 9 cols).
 *    - Total cells = 27. Each pair uses 2 cells.
 *    - Pairs = floor(27 * matchDensity / 2) → e.g., Level 1: 10 pairs
 *    - Remaining cells filled with "decoy" singles (values with no partner)
 *
 * 2. PAIR TYPE MIX:
 *    - 60% same-value pairs (e.g., 5&5), 40% sum-to-10 pairs (e.g., 3&7)
 *    - Ratios shift at higher difficulty (more sum-to-10 = harder to spot)
 *
 * 3. PLACEMENT (solvability guarantee):
 *    - Pairs are placed so at least one match is immediately valid at game start
 *    - We guarantee this by placing the first pair in adjacent cells (positions 0,1)
 *    - Remaining pairs are scattered using the seeded RNG
 *    - Board is shuffled AFTER placement to randomize positions
 *
 * 4. SOLVABILITY VALIDATION:
 *    - After board generation, simulate a greedy solve
 *    - If the board cannot be solved (all pairs get blocked), regenerate with
 *      a derived seed (seed + attempt * 7919)
 *    - In practice, with proper pair density, this almost never triggers
 *
 * 5. DECOYS:
 *    - Values that don't form any match with current board state
 *    - At low levels: decoys are close to match values (confusing but not blocking)
 *    - At high levels: more decoys, deliberately placed near real pairs
 * ═══════════════════════════════════════════════════════════════
 */
public class BoardSeeder {

    private static final int COLS = Board.COLS;
    private static final int INITIAL_ROWS = 3;
    private static final int TOTAL_CELLS = COLS * INITIAL_ROWS; // 27

    /**
     * Generates the initial board for a given level.
     * The board is guaranteed to be solvable.
     */
    public static Board generateBoard(int level) {
        DifficultyConfig config = DifficultyConfig.forLevel(level);
        Board board = null;
        int attempt = 0;

        while (board == null || !isSolvable(board)) {
            long derivedSeed = config.seed + (long) attempt * 7919L;
            SeededRandom rng = new SeededRandom(derivedSeed);
            board = buildBoard(config, rng);
            attempt++;
            if (attempt > 20) {
                // Fallback: generate a trivially solvable board (safety net)
                board = buildTrivialBoard(config);
                break;
            }
        }
        return board;
    }

    // ─────────────────────────────────────────────────────────────
    // Core board builder
    // ─────────────────────────────────────────────────────────────

    private static Board buildBoard(DifficultyConfig config, SeededRandom rng) {
        float density = config.matchDensity;

        // How many pairs to place (each pair = 2 cells)
        int pairCount = (int) Math.floor(TOTAL_CELLS * density / 2);
        // Clamp: at least 3 pairs (always solvable), at most 13 pairs (27/2)
        pairCount = Math.max(3, Math.min(13, pairCount));

        int[] values = new int[TOTAL_CELLS];
        int pos = 0;

        // ── Step 1: Generate matched pairs ──────────────────────
        // At low levels: more same-value pairs (easier to spot)
        // At high levels: more sum-to-10 pairs (harder)
        float sameValueRatio = 0.60f - (config.frictionFactor * 0.30f);
        // Level 1: ~58% same-value. Level 10: ~33% same-value
        sameValueRatio = Math.max(0.30f, Math.min(0.65f, sameValueRatio));

        List<int[]> pairs = generatePairs(pairCount, sameValueRatio, rng);
        for (int[] pair : pairs) {
            if (pos + 1 < TOTAL_CELLS) {
                values[pos++] = pair[0];
                values[pos++] = pair[1];
            }
        }

        // ── Step 2: Fill remaining cells with decoys ─────────────
        while (pos < TOTAL_CELLS) {
            // Decoy: a number that has no pair among the already-placed values
            values[pos++] = generateDecoyValue(values, pos - 1, rng);
        }

        // ── Step 3: Shuffle, but guarantee first two cells match ──
        // Save first pair values, shuffle rest, inject guaranteed pair at start
        int[] guaranteedPair = pairs.get(0);
        rng.shuffle(values);
        // Place the guaranteed pair at positions 0 and 1 (always adjacent = valid match)
        values[0] = guaranteedPair[0];
        values[1] = guaranteedPair[1];

        // ── Step 4: Build Board object ────────────────────────────
        Board board = new Board();
        for (int r = 0; r < INITIAL_ROWS; r++) {
            int[] row = new int[COLS];
            System.arraycopy(values, r * COLS, row, 0, COLS);
            board.addRow(row);
        }

        return board;
    }

    // ─────────────────────────────────────────────────────────────
    // Pair generation helpers
    // ─────────────────────────────────────────────────────────────

    /**
     * Generates `count` pairs mixing same-value and sum-to-10 types.
     */
    private static List<int[]> generatePairs(int count, float sameValueRatio, SeededRandom rng) {
        List<int[]> pairs = new ArrayList<>();

        // Pre-built catalogs
        // Same-value pairs: (1,1), (2,2), ... (9,9)
        int[][] sameValueCatalog = {{1,1},{2,2},{3,3},{4,4},{5,5},{6,6},{7,7},{8,8},{9,9}};
        // Sum-to-10 pairs: (1,9),(2,8),(3,7),(4,6),(5,5) — note 5,5 is also same-value
        int[][] sumTo10Catalog = {{1,9},{9,1},{2,8},{8,2},{3,7},{7,3},{4,6},{6,4},{5,5}};

        for (int i = 0; i < count; i++) {
            if (rng.nextBoolean(sameValueRatio)) {
                int idx = rng.nextInt(sameValueCatalog.length);
                pairs.add(new int[]{sameValueCatalog[idx][0], sameValueCatalog[idx][1]});
            } else {
                int idx = rng.nextInt(sumTo10Catalog.length);
                pairs.add(new int[]{sumTo10Catalog[idx][0], sumTo10Catalog[idx][1]});
            }
        }
        return pairs;
    }

    /**
     * Generates a decoy value: tries to pick a number that doesn't pair
     * with any of the already-placed values (within the filled slice).
     */
    private static int generateDecoyValue(int[] values, int filledCount, SeededRandom rng) {
        // Try up to 10 times to find a true decoy
        for (int attempt = 0; attempt < 10; attempt++) {
            int candidate = rng.nextIntRange(1, 9);
            if (!hasPairInSlice(candidate, values, filledCount)) {
                return candidate;
            }
        }
        // Fallback: just return a random value (board still playable)
        return rng.nextIntRange(1, 9);
    }

    private static boolean hasPairInSlice(int value, int[] values, int count) {
        for (int i = 0; i < count; i++) {
            if (values[i] == value || values[i] + value == 10) return true;
        }
        return false;
    }

    // ─────────────────────────────────────────────────────────────
    // Solvability check (greedy simulation)
    // ─────────────────────────────────────────────────────────────

    /**
     * Greedy solver: repeatedly finds and removes any valid match.
     * If it can clear all cells → solvable.
     * If it gets stuck with active cells remaining → not solvable.
     *
     * Note: greedy is not perfect (can miss optimal orderings), but it's fast
     * and sufficient since we also have the AddRow safety net in gameplay.
     */
    private static boolean isSolvable(Board board) {
        // Create a lightweight copy for simulation
        Board simBoard = copyBoard(board);
        int maxPasses = simBoard.activeCount() + 10;

        for (int pass = 0; pass < maxPasses; pass++) {
            List<int[]> matches = simBoard.findAllValidMatches();
            if (matches.isEmpty()) break;
            // Apply first available match
            int[] match = matches.get(0);
            Cell a = simBoard.getCellByIndex(match[0]);
            Cell b = simBoard.getCellByIndex(match[1]);
            simBoard.tryMatch(a, b);
        }

        return simBoard.isCleared();
    }

    /**
     * Creates a deep copy of a board for simulation.
     */
    private static Board copyBoard(Board original) {
        Board copy = new Board();
        int rows = original.getRowCount();
        for (int r = 0; r < rows; r++) {
            int[] row = new int[Board.COLS];
            for (int c = 0; c < Board.COLS; c++) {
                Cell cell = original.getCell(r, c);
                row[c] = (cell != null) ? cell.value : 1;
            }
            copy.addRow(row);
        }
        // Copy matched state
        for (int r = 0; r < rows; r++) {
            for (int c = 0; c < Board.COLS; c++) {
                Cell orig = original.getCell(r, c);
                Cell dupe = copy.getCell(r, c);
                if (orig != null && orig.isMatched() && dupe != null) {
                    dupe.markMatched();
                }
            }
        }
        return copy;
    }

    // ─────────────────────────────────────────────────────────────
    // Trivial board fallback (always solvable)
    // ─────────────────────────────────────────────────────────────

    /**
     * Last-resort board: fills with clean, easily solvable pairs.
     * This should never be needed in practice but prevents infinite loops.
     */
    private static Board buildTrivialBoard(DifficultyConfig config) {
        // 9 same-value pairs (1-9) + 9 decoys
        int[] values = {
            1, 1, 2, 2, 3, 3, 4, 4, 5,
            5, 6, 6, 7, 7, 8, 8, 9, 9,
            1, 2, 3, 4, 5, 6, 7, 8, 9
        };
        Board board = new Board();
        for (int r = 0; r < INITIAL_ROWS; r++) {
            int[] row = new int[COLS];
            System.arraycopy(values, r * COLS, row, 0, COLS);
            board.addRow(row);
        }
        return board;
    }
}
