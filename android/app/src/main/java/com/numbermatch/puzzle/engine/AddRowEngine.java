package com.numbermatch.puzzle.engine;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * AddRowEngine - Part B: Smart "Add Row" Logic (v3 Sync)
 */
public class AddRowEngine {

    public static final int MAX_ADD_ROW_USES = 6;

    private final DifficultyConfig config;
    private SeededRandom rng;

    // Rescue tracking
    private int addRowPressesWithoutMatch = 0;
    private int totalAddRowUses = 0;

    // Seed advances deterministically with each Add Row press
    private long currentSeed;

    public AddRowEngine(DifficultyConfig config) {
        this.config = config;
        this.currentSeed = config.seed + 99991L;
        this.rng = new SeededRandom(currentSeed);
    }

    /**
     * Called when the player pressed (+) Add Row.
     * Returns the 9 values to append as a new row, or null if uses exhausted.
     */
    public int[] generateNextRow(Board board) {
        if (totalAddRowUses >= MAX_ADD_ROW_USES) return null;

        currentSeed += 31337L * (totalAddRowUses + 1);
        rng = new SeededRandom(currentSeed);

        totalAddRowUses++;

        boolean isRescue = (addRowPressesWithoutMatch >= 2);

        int[] row;
        if (isRescue) {
            row = buildRescueRow(board);
            addRowPressesWithoutMatch = 0; // Reset after rescue
        } else {
            boolean success = false;
            row = null;
            for (int attempt = 0; attempt < 20; attempt++) {
                long attemptSeed = currentSeed + (long) attempt * 7919L;
                SeededRandom attemptRng = new SeededRandom(attemptSeed);
                row = buildSmartRow(board, attemptRng);

                Board testBoard = copyBoard(board);
                testBoard.addRow(row);

                if (isSolvable(testBoard)) {
                    success = true;
                    rng = attemptRng;
                    break;
                }
            }
            if (!success) {
                row = buildRescueRow(board);
                addRowPressesWithoutMatch = 0;
            }
        }

        addRowPressesWithoutMatch++;
        return row;
    }

    public void notifyMatchMade() {
        addRowPressesWithoutMatch = 0;
    }

    public int getRemainingUses() {
        return MAX_ADD_ROW_USES - totalAddRowUses;
    }

    public boolean isExhausted() {
        return totalAddRowUses >= MAX_ADD_ROW_USES;
    }

    public boolean isInRescueMode() {
        return addRowPressesWithoutMatch >= 2;
    }

    // ─────────────────────────────────────────────────────────────
    // Row builders
    // ─────────────────────────────────────────────────────────────

    private int[] buildRescueRow(Board board) {
        int[] row = new int[Board.COLS];

        int[] activeValues = board.getActiveValues();
        if (activeValues.length == 0) {
            activeValues = new int[]{1, 2, 3, 4, 5, 6, 7, 8, 9};
        }

        int v = activeValues[rng.nextInt(activeValues.length)];
        int w = v;
        int attempts = 0;
        while (w == v && attempts < 20) {
            int potentialW = activeValues[rng.nextInt(activeValues.length)];
            if (potentialW != v) {
                w = potentialW;
                break;
            }
            attempts++;
        }

        row[0] = v;
        row[1] = v;
        row[2] = w;
        row[3] = w;

        // Fill remaining cells 4-8 with helpers (no pure decoys)
        // 4 & 5 form a sum-to-10 or same-value pair
        int pVal = activeValues[rng.nextInt(activeValues.length)];
        row[4] = pVal;
        row[5] = getComplement(pVal);

        // 6 & 7 form another pair
        int pVal2 = activeValues[rng.nextInt(activeValues.length)];
        row[6] = pVal2;
        row[7] = getComplement(pVal2);

        // 8 is complement of another active cell
        int pVal3 = activeValues[rng.nextInt(activeValues.length)];
        row[8] = getComplement(pVal3);

        return row;
    }

    private int[] buildSmartRow(Board board, SeededRandom activeRng) {
        List<Cell> stragglers = board.getStragglerCells();
        int[] activeValues = board.getActiveValues();

        int diff = 3;
        switch (config.level) {
            case 1: diff = 1; break;
            case 2: diff = 2; break;
            case 3: diff = 3; break;
            case 4: diff = 4; break;
            case 5: diff = 6; break;
            case 6: diff = 3; break;
            case 7: diff = 6; break;
            case 8: diff = 7; break;
            case 9: diff = 8; break;
            case 10: diff = 10; break;
            case 11: diff = 3; break;
        }

        Map<Integer, Integer> activeFreq = new HashMap<>();
        for (int v : activeValues) {
            activeFreq.put(v, activeFreq.getOrDefault(v, 0) + 1);
        }

        List<Integer> rowList = new ArrayList<>();
        int stragglerSlotsFilled = 0;

        // TIER 1: Straggler complements (each straggler gets 1 cell)
        for (Cell straggler : stragglers) {
            if (rowList.size() >= Board.COLS) break;
            rowList.add(getComplement(straggler.value));
            stragglerSlotsFilled++;
        }

        int slots = Board.COLS - rowList.size();
        int helperSlots = (int) Math.ceil(slots * (1.0f - config.trueDecoyRatio));
        int decoySlots = slots - helperSlots;

        // TIER 2: Helper Fill
        List<Integer> activeVals = new ArrayList<>();
        for (int v = 1; v <= 9; v++) {
            if (activeFreq.containsKey(v)) {
                activeVals.add(v);
            }
        }
        if (activeVals.isEmpty()) {
            for (int i = 1; i <= 5; i++) activeVals.add(i);
        }

        for (int h = 0; h < helperSlots; h++) {
            int val = activeVals.get(activeRng.nextInt(activeVals.size()));
            rowList.add(getComplement(val));
        }

        // TIER 3: Decoy Fill (true decoys: no partners on the board)
        List<Integer> trueDecoys = new ArrayList<>();
        for (int d = 1; d <= 9; d++) {
            int partner = getComplement(d);
            if (!activeFreq.containsKey(d) && !activeFreq.containsKey(partner)) {
                trueDecoys.add(d);
            }
        }
        if (trueDecoys.isEmpty()) {
            for (int d = 1; d <= 9; d++) {
                if (!activeFreq.containsKey(d)) {
                    trueDecoys.add(d);
                }
            }
        }
        if (trueDecoys.isEmpty()) {
            for (int i = 1; i <= 9; i++) trueDecoys.add(i);
        }

        for (int d = 0; d < decoySlots; d++) {
            rowList.add(trueDecoys.get(activeRng.nextInt(trueDecoys.size())));
        }

        int[] row = new int[Board.COLS];
        for (int i = 0; i < Board.COLS; i++) {
            row[i] = rowList.get(i);
        }

        // POSITIONING / SHUFFLING:
        if (diff == 1) {
            shuffleSlice(row, stragglerSlotsFilled, Board.COLS - 1, activeRng);
            for (int i = stragglerSlotsFilled; i < Board.COLS - 1; i += 2) {
                row[i + 1] = getComplement(row[i]);
            }
        } else if (diff == 2) {
            shuffleSlice(row, stragglerSlotsFilled, Board.COLS - 1, activeRng);
            for (int i = stragglerSlotsFilled; i < Board.COLS - 2; i += 3) {
                row[i + 1] = getComplement(row[i]);
            }
        } else if (diff <= 6) {
            shuffleSlice(row, stragglerSlotsFilled, Board.COLS - 1, activeRng);
        } else {
            shuffleSlice(row, 0, Board.COLS - 1, activeRng);
        }

        return row;
    }

    private int getComplement(int value) {
        if (config.frictionFactor > 0.5f && value != 5) {
            int sumComplement = 10 - value;
            if (sumComplement >= 1 && sumComplement <= 9) {
                return sumComplement;
            }
        }
        return value;
    }

    // ─────────────────────────────────────────────────────────────
    // Solvability simulation for Android
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

    private void shuffleSlice(int[] arr, int from, int to, SeededRandom activeRng) {
        for (int i = to; i > from; i--) {
            int j = from + activeRng.nextInt(i - from + 1);
            int tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
        }
    }
}
