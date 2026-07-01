package com.numbermatch.puzzle.engine;

import java.util.ArrayList;
import java.util.List;

/**
 * Board - The 9-column dynamic grid.
 *
 * Storage: flat list of Cells. Row r, col c → index = r*9 + c.
 * Rows are virtual — the grid just grows downward.
 *
 * Match Logic (per spec):
 *   - Horizontal: same row, adjacent columns (col diff = 1), no active cell between them
 *   - Vertical:   same column, adjacent rows (row diff = 1), no active cell between them
 *   - Wrap-around: last cell of row r matches first cell of row r+1 if no active cell between
 *   - Skip matched: when checking adjacency, skip over already-matched cells
 */
public class Board {

    public static final int COLS = 9;

    // Flat storage: index = row * COLS + col
    private final List<Cell> cells;
    private int rowCount;

    public Board() {
        cells = new ArrayList<>();
        rowCount = 0;
    }

    // ─────────────────────────────────────────────────────────────
    // Board construction
    // ─────────────────────────────────────────────────────────────

    public void addRow(int[] values) {
        int r = rowCount;
        for (int c = 0; c < COLS; c++) {
            if (c < values.length) {
                cells.add(new Cell(values[c], r, c));
            } else {
                Cell cell = new Cell(1, r, c);
                cell.markMatched();
                cells.add(cell);
            }
        }
        rowCount++;
    }

    public int getRowCount() { return rowCount; }

    public int getTotalCells() { return cells.size(); }

    public Cell getCell(int row, int col) {
        int idx = row * COLS + col;
        if (idx < 0 || idx >= cells.size()) return null;
        return cells.get(idx);
    }

    public Cell getCellByIndex(int index) {
        if (index < 0 || index >= cells.size()) return null;
        return cells.get(index);
    }

    public int indexOfCell(Cell cell) {
        return cells.indexOf(cell);
    }

    public int getCellCount() { return cells.size(); }

    // ─────────────────────────────────────────────────────────────
    // Match adjacency rules
    // ─────────────────────────────────────────────────────────────

    /**
     * Returns true if cellA and cellB can be matched right now.
     * They must be adjacent (no active cell between them) in any direction:
     * horizontal, vertical, or wrap-around row boundary.
     */
    public boolean isValidMatch(Cell a, Cell b) {
        if (!Cell.canMatch(a, b)) return false;

        int idxA = indexOfCell(a);
        int idxB = indexOfCell(b);
        if (idxA < 0 || idxB < 0) return false;
        if (idxA == idxB) return false;

        // Ensure a comes before b for direction checks
        if (idxA > idxB) {
            Cell tmp = a; a = b; b = tmp;
            int t = idxA; idxA = idxB; idxB = t;
        }

        int rowA = a.row, colA = a.col;
        int rowB = b.row, colB = b.col;

        // ── Horizontal: same row ──────────────────────────────
        if (rowA == rowB) {
            // cols must be adjacent after skipping matched cells
            return noActivesBetweenLinear(idxA, idxB);
        }

        // ── Vertical: same column ─────────────────────────────
        if (colA == colB) {
            return noActivesInColumn(rowA, rowB, colA);
        }

        // ── Diagonal: 45 degree slope ─────────────────────────
        int dr = rowB - rowA;
        int dc = colB - colA;
        if (Math.abs(dr) == Math.abs(dc) && dr != 0) {
            if (noActivesInDiagonal(rowA, colA, rowB, colB)) return true;
        }

        // ── Wrap-around: end of row r → start of row r+1 ──────
        // idxA is last active in its row-group, idxB is first active in next
        return noActivesBetweenLinear(idxA, idxB);
    }

    private boolean noActivesInDiagonal(int rowA, int colA, int rowB, int colB) {
        int dr = rowB - rowA;
        int dc = colB - colA;
        int sr = dr > 0 ? 1 : -1;
        int sc = dc > 0 ? 1 : -1;
        int r = rowA + sr;
        int c = colA + sc;
        while (r != rowB || c != colB) {
            Cell cell = getCell(r, c);
            if (cell != null && cell.isActive()) return false;
            r += sr;
            c += sc;
        }
        return true;
    }

    /**
     * Check that there are no active cells between index lo and hi (exclusive).
     */
    private boolean noActivesBetweenLinear(int lo, int hi) {
        for (int i = lo + 1; i < hi; i++) {
            Cell c = cells.get(i);
            if (c.isActive()) return false;
        }
        return true;
    }

    /**
     * Check that there are no active cells in the same column between rowA and rowB.
     */
    private boolean noActivesInColumn(int rowA, int rowB, int col) {
        int minRow = Math.min(rowA, rowB);
        int maxRow = Math.max(rowA, rowB);
        for (int r = minRow + 1; r < maxRow; r++) {
            Cell c = getCell(r, col);
            if (c != null && c.isActive()) return false;
        }
        return true;
    }

    // ─────────────────────────────────────────────────────────────
    // Match execution
    // ─────────────────────────────────────────────────────────────

    public boolean tryMatch(Cell a, Cell b) {
        if (!isValidMatch(a, b)) return false;
        a.markMatched();
        b.markMatched();
        return true;
    }

    // ─────────────────────────────────────────────────────────────
    // Board state queries
    // ─────────────────────────────────────────────────────────────

    /** True when all cells on the board are matched */
    public boolean isCleared() {
        for (Cell c : cells) {
            if (c.isActive()) return false;
        }
        return true;
    }

    /** Count of active (unmatched) cells */
    public int activeCount() {
        int count = 0;
        for (Cell c : cells) { if (c.isActive()) count++; }
        return count;
    }

    /** Returns all active cells */
    public List<Cell> getActiveCells() {
        List<Cell> active = new ArrayList<>();
        for (Cell c : cells) { if (c.isActive()) active.add(c); }
        return active;
    }

    /** Returns all currently valid match pairs */
    public List<int[]> findAllValidMatches() {
        List<Cell> active = getActiveCells();
        List<int[]> matches = new ArrayList<>();
        for (int i = 0; i < active.size(); i++) {
            for (int j = i + 1; j < active.size(); j++) {
                Cell a = active.get(i);
                Cell b = active.get(j);
                if (isValidMatch(a, b)) {
                    matches.add(new int[]{indexOfCell(a), indexOfCell(b)});
                }
            }
        }
        return matches;
    }

    /** True if at least one valid match exists on the board right now */
    public boolean hasAnyValidMatch() {
        List<Cell> active = getActiveCells();
        for (int i = 0; i < active.size(); i++) {
            for (int j = i + 1; j < active.size(); j++) {
                if (isValidMatch(active.get(i), active.get(j))) return true;
            }
        }
        return false;
    }

    /**
     * "Straggler" rows: rows where only 1 active cell remains.
     * Returns the list of (row index, cell) pairs.
     */
    public List<Cell> getStragglerCells() {
        List<Cell> stragglers = new ArrayList<>();
        for (int r = 0; r < rowCount; r++) {
            int activeInRow = 0;
            Cell lastActive = null;
            for (int c = 0; c < COLS; c++) {
                Cell cell = getCell(r, c);
                if (cell != null && cell.isActive()) {
                    activeInRow++;
                    lastActive = cell;
                }
            }
            if (activeInRow == 1) {
                stragglers.add(lastActive);
            }
        }
        return stragglers;
    }

    /**
     * Get active cell values for analysis (used by AddRow logic)
     */
    public int[] getActiveValues() {
        List<Cell> active = getActiveCells();
        int[] values = new int[active.size()];
        for (int i = 0; i < active.size(); i++) {
            values[i] = active.get(i).value;
        }
        return values;
    }

    @Override
    public String toString() {
        StringBuilder sb = new StringBuilder();
        for (int r = 0; r < rowCount; r++) {
            for (int c = 0; c < COLS; c++) {
                Cell cell = getCell(r, c);
                sb.append(cell != null ? cell.toString() : "?");
                if (c < COLS - 1) sb.append(" ");
            }
            sb.append("\n");
        }
        return sb.toString();
    }
}
