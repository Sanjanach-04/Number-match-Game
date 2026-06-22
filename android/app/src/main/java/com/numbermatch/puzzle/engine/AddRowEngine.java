package com.numbermatch.puzzle.engine;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * AddRowEngine - Part B: Smart "Add Row" Logic
 *
 * ═══════════════════════════════════════════════════════════════
 * ALGORITHM:
 *
 * When the player hits (+) Add Row, we don't just dump random numbers.
 * We analyze the board state and inject numbers strategically:
 *
 * STEP 1 — STRAGGLER PRIORITY
 *   Find all "straggler" cells (rows with only 1 active cell left).
 *   For each straggler, generate its complement (same value OR 10-complement).
 *   These are injected first in the new row to help the player clear orphan rows.
 *
 * STEP 2 — RESCUE DETECTION
 *   Track: how many Add Row presses happened since the last successful match.
 *   If ≥ 2 Add Row presses with 0 matches in between → RESCUE MODE.
 *   In Rescue Mode: the new row is forced to contain at least 2 immediately
 *   matchable pairs (adjacent cells with matching values).
 *
 * STEP 3 — FRICTION INJECTION (based on level)
 *   After placing helpers and stragglers, fill remaining slots with:
 *   - "Soft helpers": values that match something on the board but not immediately adjacent
 *   - "Decoys": values that match nothing currently on the board
 *   The mix ratio is controlled by decoyRatio from DifficultyConfig.
 *
 * STEP 4 — LAYOUT STRATEGY
 *   The 9 slots in the new row are arranged as:
 *   [STRAGGLER HELPERS | RESCUE PAIRS | SOFT HELPERS | DECOYS]
 *   Then the non-critical portion is shuffled to prevent predictability.
 *
 * RESCUE TRIGGER:
 *   addRowPressesWithoutMatch >= 2 → inject at least 2 adjacent matching pairs
 *   After injection, rescueMode resets.
 * ═══════════════════════════════════════════════════════════════
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
        // Add Row seed is offset from board seed to avoid overlap
        this.currentSeed = config.seed + 99991L;
        this.rng = new SeededRandom(currentSeed);
    }

    // ─────────────────────────────────────────────────────────────
    // Public API
    // ─────────────────────────────────────────────────────────────

    /**
     * Called when the player pressed (+) Add Row.
     * Returns the 9 values to append as a new row, or null if uses exhausted.
     */
    public int[] generateNextRow(Board board) {
        if (totalAddRowUses >= MAX_ADD_ROW_USES) return null;

        // Advance seed for this press (deterministic per press number)
        currentSeed += 31337L * (totalAddRowUses + 1);
        rng = new SeededRandom(currentSeed);

        totalAddRowUses++;

        boolean isRescue = (addRowPressesWithoutMatch >= 2);

        int[] row;
        if (isRescue) {
            row = buildRescueRow(board);
            addRowPressesWithoutMatch = 0; // Reset after rescue
        } else {
            row = buildSmartRow(board);
        }

        addRowPressesWithoutMatch++; // Will reset if player makes a match (see notifyMatchMade)
        return row;
    }

    /**
     * Must be called whenever the player successfully matches two cells.
     * Resets the frustration counter.
     */
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

    /**
     * RESCUE ROW: Forces at least 2 immediately matchable adjacent pairs.
     * Used when player is stuck (2+ Add Row presses with no matches).
     */
    private int[] buildRescueRow(Board board) {
        int[] row = new int[Board.COLS];
        int pos = 0;

        // ── Place 2 guaranteed adjacent pairs ────────────────────
        // Pick pairs from current board's active values so they match existing numbers
        int[] activeValues = board.getActiveValues();
        List<Integer> pairValues = findPairableValues(activeValues, 2);

        for (int v : pairValues) {
            if (pos + 1 < Board.COLS) {
                int complement = getComplement(v);
                row[pos++] = v;
                row[pos++] = complement;
            }
        }

        // ── Fill rest with soft helpers (some matches, fewer decoys) ─
        while (pos < Board.COLS) {
            if (rng.nextBoolean(0.70f)) {
                // Helper: pairs with something on the board
                row[pos++] = pickHelperValue(board.getActiveValues());
            } else {
                row[pos++] = rng.nextIntRange(1, 9);
            }
        }

        // Shuffle only positions 4..8 (keep the two rescue pairs at front)
        shuffleSlice(row, 4, Board.COLS - 1, rng);
        return row;
    }

    /**
     * SMART ROW: Normal Add Row with difficulty-appropriate helper/decoy mix.
     */
    private int[] buildSmartRow(Board board) {
        int[] row = new int[Board.COLS];
        int pos = 0;

        // ── STEP 1: Straggler helpers ─────────────────────────────
        List<Cell> stragglers = board.getStragglerCells();
        // Limit straggler fills based on level (easy levels help more)
        int maxStragglerHelpers = Math.max(1, (int) (3 * (1.0f - config.frictionFactor)));

        for (int i = 0; i < Math.min(stragglers.size(), maxStragglerHelpers) && pos < Board.COLS; i++) {
            Cell straggler = stragglers.get(i);
            // Inject the complement of the straggler's value
            row[pos++] = getComplement(straggler.value);
        }

        // ── STEP 2: General helpers ───────────────────────────────
        float helperRatio = 1.0f - config.decoyRatio;
        int helperTarget = (int) Math.floor(Board.COLS * helperRatio);
        int[] activeValues = board.getActiveValues();

        while (pos < helperTarget && pos < Board.COLS) {
            row[pos++] = pickHelperValue(activeValues);
        }

        // ── STEP 3: Fill remaining with decoys ────────────────────
        while (pos < Board.COLS) {
            row[pos++] = pickDecoyValue(activeValues, rng);
        }

        // ── STEP 4: Shuffle positions 2..8 (keep first straggler helper) ─
        int shuffleStart = Math.min(stragglers.isEmpty() ? 0 : 1, Board.COLS - 1);
        shuffleSlice(row, shuffleStart, Board.COLS - 1, rng);
        return row;
    }

    // ─────────────────────────────────────────────────────────────
    // Value selection helpers
    // ─────────────────────────────────────────────────────────────

    /**
     * Returns the "best" complement for a value:
     * - Prefers same-value match at low difficulty
     * - Prefers sum-to-10 at high difficulty (harder to spot)
     */
    private int getComplement(int value) {
        // At high friction, prefer sum-to-10 complement
        if (config.frictionFactor > 0.5f && value != 5) {
            int sumComplement = 10 - value;
            if (sumComplement >= 1 && sumComplement <= 9) {
                return sumComplement;
            }
        }
        return value; // same-value match (easier to see)
    }

    /**
     * Picks a value that pairs with something currently on the board.
     */
    private int pickHelperValue(int[] activeValues) {
        if (activeValues.length == 0) return rng.nextIntRange(1, 9);

        // Pick a random active value and return its complement
        int target = activeValues[rng.nextInt(activeValues.length)];
        return getComplement(target);
    }

    /**
     * Picks a value that has NO match with any currently active board value.
     * Falls back to a random value if no true decoy found after 10 tries.
     */
    private int pickDecoyValue(int[] activeValues, SeededRandom rng) {
        for (int attempt = 0; attempt < 10; attempt++) {
            int candidate = rng.nextIntRange(1, 9);
            if (!hasPairInArray(candidate, activeValues)) return candidate;
        }
        return rng.nextIntRange(1, 9);
    }

    private boolean hasPairInArray(int value, int[] arr) {
        for (int v : arr) {
            if (v == value || v + value == 10) return true;
        }
        return false;
    }

    /**
     * Finds values from the active board that can be paired with their complements.
     * Returns up to `maxCount` values.
     */
    private List<Integer> findPairableValues(int[] activeValues, int maxCount) {
        List<Integer> result = new ArrayList<>();
        if (activeValues.length == 0) {
            // No active values: default to (1,1) and (2,8) pairs
            result.add(1);
            result.add(2);
            return result;
        }

        // Count each value's frequency on the board
        Map<Integer, Integer> freq = new HashMap<>();
        for (int v : activeValues) {
            freq.put(v, freq.getOrDefault(v, 0) + 1);
        }

        // Prefer values that appear multiple times (same-value match easier)
        for (Map.Entry<Integer, Integer> entry : freq.entrySet()) {
            if (entry.getValue() >= 2 && result.size() < maxCount) {
                result.add(entry.getKey());
            }
        }

        // If not enough, add sum-to-10 pairs
        for (int v : activeValues) {
            if (result.size() >= maxCount) break;
            int complement = 10 - v;
            if (complement >= 1 && complement <= 9 && complement != v) {
                if (!result.contains(v)) result.add(v);
            }
        }

        // Pad with random pairables if needed
        while (result.size() < maxCount) {
            result.add(rng.nextIntRange(1, 9));
        }

        return result;
    }

    // ─────────────────────────────────────────────────────────────
    // Utility
    // ─────────────────────────────────────────────────────────────

    private void shuffleSlice(int[] arr, int from, int to, SeededRandom rng) {
        for (int i = to; i > from; i--) {
            int j = from + rng.nextInt(i - from + 1);
            int tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
        }
    }
}
