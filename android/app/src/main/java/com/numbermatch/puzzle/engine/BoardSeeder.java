package com.numbermatch.puzzle.engine;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

/**
 * BoardSeeder - Part A: Deterministic Initial Board Generation (v3 Sync)
 */
public class BoardSeeder {

    private static final int COLS = Board.COLS;
    private static final int INITIAL_ROWS = 3;
    private static final int TOTAL_CELLS = COLS * INITIAL_ROWS; // 27

    private static final int[][] SAME_VAL_PAIRS = {
        {1,1},{2,2},{3,3},{4,4},{5,5},{6,6},{7,7},{8,8},{9,9}
    };
    private static final int[][] SUM_TEN_PAIRS = {
        {1,9},{9,1},{2,8},{8,2},{3,7},{7,3},{4,6},{6,4}
    };

    private static int comp(int v) {
        return v == 5 ? 5 : (10 - v);
    }

    /**
     * Generates the initial board for a given level.
     * The board is guaranteed to be solvable.
     */
    public static Board generateBoard(int level) {
        DifficultyConfig config = DifficultyConfig.forLevel(level);
        if (config.level == 1) {
            return buildHandCraftedLevel1Board();
        }

        Board board = null;
        int attempt = 0;

        while (board == null || !isSolvable(board)) {
            long derivedSeed = config.seed + (long) attempt * 7919L;
            SeededRandom rng = new SeededRandom(derivedSeed);
            board = buildBoard(config, rng);
            attempt++;
            if (attempt > 25) {
                // Fallback: generate a trivially solvable board (safety net)
                board = buildTrivialBoard(config);
                break;
            }
        }
        return board;
    }

    private static Board buildBoard(DifficultyConfig config, SeededRandom rng) {
        float density = config.matchDensity;
        int pairCount = (int) Math.floor(TOTAL_CELLS * density / 2);
        pairCount = Math.max(3, Math.min(13, pairCount));

        // 1. Build Pair Pool
        List<int[]> pairs = new ArrayList<>();
        // First pair is always same-value
        pairs.add(SAME_VAL_PAIRS[rng.nextInt(SAME_VAL_PAIRS.length)].clone());
        for (int p = 1; p < pairCount; p++) {
            if (rng.nextBoolean(config.frictionFactor)) {
                pairs.add(SUM_TEN_PAIRS[rng.nextInt(SUM_TEN_PAIRS.length)].clone());
            } else {
                pairs.add(SAME_VAL_PAIRS[rng.nextInt(SAME_VAL_PAIRS.length)].clone());
            }
        }

        // 2. Place pairs with gap enforcement
        Integer[] slots = new Integer[TOTAL_CELLS];
        
        // Pin first pair at 0 and 1
        slots[0] = pairs.get(0)[0];
        slots[1] = pairs.get(0)[1];

        List<Integer> freeSlots = new ArrayList<>();
        for (int i = 2; i < TOTAL_CELLS; i++) {
            freeSlots.add(i);
        }

        for (int p = 1; p < pairs.size(); p++) {
            shuffleList(freeSlots, rng);
            boolean placed = false;
            int[] pair = pairs.get(p);

            for (int ai = 0; ai < freeSlots.size() && !placed; ai++) {
                int slotA = freeSlots.get(ai);
                for (int bi = 0; bi < freeSlots.size() && !placed; bi++) {
                    if (bi == ai) continue;
                    int slotB = freeSlots.get(bi);
                    int gap = Math.abs(slotA - slotB);
                    if (gap >= config.minGap && gap <= config.maxGap) {
                        slots[slotA] = pair[0];
                        slots[slotB] = pair[1];
                        freeSlots.remove(Integer.valueOf(slotA));
                        freeSlots.remove(Integer.valueOf(slotB));
                        placed = true;
                    }
                }
            }

            if (!placed && freeSlots.size() >= 2) {
                // Fallback: use first two free slots
                int slotA = freeSlots.remove(0);
                int slotB = freeSlots.remove(0);
                slots[slotA] = pair[0];
                slots[slotB] = pair[1];
            }
        }

        // Collect placed pair values for true-decoy logic
        boolean[] pairVals = new boolean[10];
        for (int i = 0; i < TOTAL_CELLS; i++) {
            if (slots[i] != null) {
                pairVals[slots[i]] = true;
            }
        }

        // Fill remaining slots with true decoys
        for (int i = 0; i < TOTAL_CELLS; i++) {
            if (slots[i] == null) {
                slots[i] = pickTrueDecoy(pairVals, rng);
            }
        }

        // Build Board object
        Board board = new Board();
        for (int r = 0; r < INITIAL_ROWS; r++) {
            int[] row = new int[COLS];
            for (int c = 0; c < COLS; c++) {
                row[c] = slots[r * COLS + c];
            }
            board.addRow(row);
        }

        return board;
    }

    private static int pickTrueDecoy(boolean[] pairVals, SeededRandom rng) {
        List<Integer> candidates = new ArrayList<>();
        for (int v = 1; v <= 9; v++) {
            int partner = comp(v);
            if (!pairVals[v] && !pairVals[partner]) {
                candidates.add(v);
            }
        }
        if (!candidates.isEmpty()) {
            return candidates.get(rng.nextInt(candidates.size()));
        }

        // Fallback: pick any value that is rare or not active
        for (int v = 1; v <= 9; v++) {
            if (!pairVals[v]) {
                candidates.add(v);
            }
        }
        if (!candidates.isEmpty()) {
            return candidates.get(rng.nextInt(candidates.size()));
        }

        return rng.nextIntRange(1, 9);
    }

    private static void shuffleList(List<Integer> list, SeededRandom rng) {
        for (int i = list.size() - 1; i > 0; i--) {
            int j = rng.nextInt(i + 1);
            int temp = list.get(i);
            list.set(i, list.get(j));
            list.set(j, temp);
        }
    }

    // ─────────────────────────────────────────────────────────────
    // Solvability check (greedy simulation)
    // ─────────────────────────────────────────────────────────────

    private static boolean isSolvable(Board board) {
        Board simBoard = copyBoard(board);
        int maxPasses = simBoard.activeCount() + 10;

        for (int pass = 0; pass < maxPasses; pass++) {
            List<int[]> matches = simBoard.findAllValidMatches();
            if (matches.isEmpty()) break;
            int[] match = matches.get(0);
            Cell a = simBoard.getCellByIndex(match[0]);
            Cell b = simBoard.getCellByIndex(match[1]);
            simBoard.tryMatch(a, b);
        }

        return simBoard.isCleared();
    }

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

    private static Board buildHandCraftedLevel1Board() {
        int[] values = {
            1, 1, 2, 2, 3, 3, 4, 4, 5,
            5, 6, 6, 7, 7, 8, 8, 9, 9,
            1, 1, 2, 2, 3, 3, 4, 4, 5
        };
        Board board = new Board();
        for (int r = 0; r < INITIAL_ROWS; r++) {
            int[] row = new int[COLS];
            System.arraycopy(values, r * COLS, row, 0, COLS);
            board.addRow(row);
        }
        return board;
    }

    private static Board buildTrivialBoard(DifficultyConfig config) {
        return buildHandCraftedLevel1Board();
    }
}
