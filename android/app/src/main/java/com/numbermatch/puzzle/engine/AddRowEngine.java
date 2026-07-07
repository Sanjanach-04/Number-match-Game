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
     * Returns the values to append as a new row, or null if uses exhausted.
     */
    public int[] generateNextRow(Board board) {
        if (totalAddRowUses >= MAX_ADD_ROW_USES) return null;

        currentSeed += 31337L * (totalAddRowUses + 1);
        rng = new SeededRandom(currentSeed);

        totalAddRowUses++;

        boolean wasRescue = (addRowPressesWithoutMatch >= 2);
        int[] row = wasRescue ? generateRescueRow(board, rng) : planNextRow(board, rng);

        if (wasRescue) {
            addRowPressesWithoutMatch = 0; // Reset after rescue
        } else {
            addRowPressesWithoutMatch++;
        }

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
    // Intelligent Minimal Rescue Row Planner
    // ─────────────────────────────────────────────────────────────

    private int[] planNextRow(Board board, SeededRandom activeRng) {
        // 1. Gather all active cells and identify stranded ones (no current match partner)
        List<Cell> activeCells = board.getActiveCells();
        List<int[]> matches = board.findAllValidMatches();
        boolean[] matchedIndex = new boolean[board.getTotalCells()];
        for (int[] match : matches) {
            matchedIndex[match[0]] = true;
            matchedIndex[match[1]] = true;
        }

        List<Integer> strandedVals = new ArrayList<>();
        for (int i = 0; i < board.getTotalCells(); i++) {
            Cell cell = board.getCellByIndex(i);
            if (cell != null && !cell.isMatched()) {
                if (!matchedIndex[i]) {
                    strandedVals.add(cell.value);
                }
            }
        }

        // 2. Generate complements for all stranded cells
        List<Integer> required = new ArrayList<>();
        for (int val : strandedVals) {
            required.add(getCompVal(val));
        }

        // 3. If required is empty but board is not solvable or has no matches, force an injection
        boolean currentSolvable = isSolvable(board);
        boolean hasMatches = !board.findAllValidMatches().isEmpty();

        if (required.isEmpty()) {
            if (!currentSolvable || !hasMatches) {
                if (!activeCells.isEmpty()) {
                    Cell lastActive = activeCells.get(activeCells.size() - 1);
                    int partner = getCompVal(lastActive.value);
                    required.add(partner);
                    required.add(lastActive.value);
                } else {
                    required.add(5);
                    required.add(5);
                }
            } else {
                // Already solvable and has matches! No Add Row required.
                return new int[0];
            }
        }

        // 4. Try shuffles of the required list to find a layout that keeps the board solvable
        List<Integer> bestRow = new ArrayList<>(required);
        int bestAttempts = 30;
        boolean success = false;

        int extraPairsAdded = 0;
        while (!success && extraPairsAdded < 5) {
            for (int attempt = 0; attempt < bestAttempts; attempt++) {
                List<Integer> attemptRow = new ArrayList<>(bestRow);
                shuffleList(attemptRow, activeRng);

                int[] attemptArr = toIntArray(attemptRow);
                Board tempBoard = copyBoard(board);
                tempBoard.addRow(attemptArr);

                if (!tempBoard.findAllValidMatches().isEmpty() && isSolvable(tempBoard)) {
                    bestRow = attemptRow;
                    success = true;
                    break;
                }
            }

            if (success) break;

            // If not successful, add a complement pair of some active board cell
            if (!activeCells.isEmpty()) {
                int randomVal = activeCells.get(activeRng.nextInt(activeCells.size())).value;
                bestRow.add(getCompVal(randomVal));
                bestRow.add(randomVal);
            } else {
                bestRow.add(5);
                bestRow.add(5);
            }
            extraPairsAdded++;
        }

        return toIntArray(bestRow);
    }

    private int[] generateRescueRow(Board board, SeededRandom activeRng) {
        List<Cell> activeCells = board.getActiveCells();
        List<Integer> activeVals = new ArrayList<>();
        for (Cell cell : activeCells) {
            activeVals.add(cell.value);
        }
        if (activeVals.isEmpty()) {
            for (int i = 1; i <= 9; i++) {
                activeVals.add(i);
            }
        }

        int v = activeVals.get(activeRng.nextInt(activeVals.size()));
        int w = v;
        int attempts = 0;
        while (w == v && attempts < 20) {
            int potentialW = activeVals.get(activeRng.nextInt(activeVals.size()));
            if (potentialW != v) {
                w = potentialW;
                break;
            }
            attempts++;
        }

        int[] row = new int[9];
        row[0] = v;
        row[1] = v;
        row[2] = w;
        row[3] = w;

        int pVal = activeVals.get(activeRng.nextInt(activeVals.size()));
        row[4] = pVal;
        row[5] = getCompVal(pVal);

        int pVal2 = activeVals.get(activeRng.nextInt(activeVals.size()));
        row[6] = pVal2;
        row[7] = getCompVal(pVal2);

        int pVal3 = activeVals.get(activeRng.nextInt(activeVals.size()));
        row[8] = getCompVal(pVal3);

        return row;
    }

    private int getCompVal(int val) {
        return val == 5 ? 5 : 10 - val;
    }

    private int[] toIntArray(List<Integer> list) {
        int[] arr = new int[list.size()];
        for (int i = 0; i < list.size(); i++) {
            arr[i] = list.get(i);
        }
        return arr;
    }

    private void shuffleList(List<Integer> list, SeededRandom activeRng) {
        for (int i = list.size() - 1; i > 0; i--) {
            int j = activeRng.nextInt(i + 1);
            int tmp = list.get(i);
            list.set(i, list.get(j));
            list.set(j, tmp);
        }
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
