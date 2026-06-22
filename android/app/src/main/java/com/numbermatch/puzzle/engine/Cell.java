package com.numbermatch.puzzle.engine;

/**
 * Cell - Represents a single cell on the 9-column grid.
 */
public class Cell {

    public static final int STATE_ACTIVE   = 0;  // Visible, not yet matched
    public static final int STATE_MATCHED  = 1;  // Has been matched / crossed out
    public static final int STATE_EMPTY    = 2;  // Was a decoy slot or cleared

    public int value;       // 1-9
    public int state;       // STATE_ACTIVE | STATE_MATCHED
    public int row;
    public int col;

    public Cell(int value, int row, int col) {
        this.value = value;
        this.row = row;
        this.col = col;
        this.state = STATE_ACTIVE;
    }

    public boolean isActive() {
        return state == STATE_ACTIVE;
    }

    public boolean isMatched() {
        return state == STATE_MATCHED;
    }

    public void markMatched() {
        this.state = STATE_MATCHED;
    }

    /** Two cells match if same value OR values sum to 10 */
    public static boolean canMatch(Cell a, Cell b) {
        if (a == null || b == null) return false;
        if (!a.isActive() || !b.isActive()) return false;
        if (a == b) return false;
        return (a.value == b.value) || (a.value + b.value == 10);
    }

    @Override
    public String toString() {
        return isMatched() ? "X" : String.valueOf(value);
    }
}
