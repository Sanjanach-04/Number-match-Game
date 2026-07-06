package com.numbermatch.puzzle.engine;

/**
 * GameEngine - Top-level controller connecting all components.
 *
 * Manages level state, delegates board generation, match validation,
 * and Add Row logic. The Activity/Fragment only talks to this class.
 */
public class GameEngine {

    public enum GameState {
        PLAYING,
        LEVEL_COMPLETE,
        GAME_OVER  // All Add Row uses exhausted, no more valid matches
    }

    private Board board;
    private DifficultyConfig config;
    private AddRowEngine addRowEngine;
    private GameState state;
    private int level;

    // Selected cell for match (first tap)
    private Cell selectedCell = null;

    // Listeners
    private GameEventListener listener;

    public GameEngine(int level) {
        this.level = level;
        this.config = DifficultyConfig.forLevel(level);
        this.board = BoardSeeder.generateBoard(level);
        this.addRowEngine = new AddRowEngine(config);
        this.state = GameState.PLAYING;
    }

    public void setListener(GameEventListener listener) {
        this.listener = listener;
    }

    // ─────────────────────────────────────────────────────────────
    // Player actions
    // ─────────────────────────────────────────────────────────────

    /**
     * Called when the player taps a cell.
     * Returns a MatchResult describing what happened.
     */
    public MatchResult onCellTapped(int cellIndex) {
        if (state != GameState.PLAYING) return MatchResult.invalid("Game not in PLAYING state");

        Cell tapped = board.getCellByIndex(cellIndex);
        if (tapped == null || !tapped.isActive()) return MatchResult.invalid("Cell not active");

        if (selectedCell == null) {
            // First tap: select the cell
            selectedCell = tapped;
            return MatchResult.selected(cellIndex);
        }

        if (selectedCell == tapped) {
            // Tapped same cell: deselect
            selectedCell = null;
            return MatchResult.deselected(cellIndex);
        }

        // Second tap: attempt match
        Cell a = selectedCell;
        Cell b = tapped;
        selectedCell = null;

        if (board.tryMatch(a, b)) {
            addRowEngine.notifyMatchMade();
            if (listener != null) listener.onMatchSuccess(board.indexOfCell(a), board.indexOfCell(b));

            // Check win condition
            if (board.isCleared()) {
                state = GameState.LEVEL_COMPLETE;
                if (listener != null) listener.onLevelComplete(level);
                return MatchResult.matched(board.indexOfCell(a), board.indexOfCell(b), true);
            }
            return MatchResult.matched(board.indexOfCell(a), board.indexOfCell(b), false);
        } else {
            if (listener != null) listener.onMatchFailed(board.indexOfCell(a), board.indexOfCell(b));
            return MatchResult.failed(board.indexOfCell(a), board.indexOfCell(b));
        }
    }

    /**
     * Called when the player taps the (+) Add Row button.
     */
    public AddRowResult onAddRow() {
        if (state != GameState.PLAYING) return AddRowResult.failed("Game not in PLAYING state");
        if (addRowEngine.isExhausted()) return AddRowResult.failed("No Add Row uses remaining");
        if (board.hasAnyValidMatch()) {
            return AddRowResult.failed("Valid matches still exist. Clear existing moves first.");
        }

        boolean wasRescue = addRowEngine.isInRescueMode();
        int[] newRowValues = addRowEngine.generateNextRow(board);

        if (newRowValues == null) return AddRowResult.failed("No Add Row uses remaining");

        board.addRow(newRowValues);

        int remaining = addRowEngine.getRemainingUses();
        if (listener != null) listener.onRowAdded(board.getRowCount() - 1, newRowValues, remaining);

        // Check if game is now over (no uses AND no valid matches — shouldn't happen with our engine)
        if (addRowEngine.isExhausted() && !board.hasAnyValidMatch()) {
            state = GameState.GAME_OVER;
            if (listener != null) listener.onGameOver();
            return AddRowResult.exhausted(newRowValues, wasRescue);
        }

        return AddRowResult.success(newRowValues, remaining, wasRescue);
    }

    /**
     * Clears the selected cell (e.g., when player taps empty space).
     */
    public void clearSelection() {
        selectedCell = null;
    }

    // ─────────────────────────────────────────────────────────────
    // State accessors
    // ─────────────────────────────────────────────────────────────

    public Board getBoard() { return board; }
    public DifficultyConfig getConfig() { return config; }
    public GameState getState() { return state; }
    public int getLevel() { return level; }
    public int getRemainingAddRows() { return addRowEngine.getRemainingUses(); }
    public Cell getSelectedCell() { return selectedCell; }
    public boolean isGameOver() { return state == GameState.GAME_OVER; }
    public boolean isAddRowInRescueMode() { return addRowEngine.isInRescueMode(); }
    public AddRowEngine getAddRowEngine() { return addRowEngine; }
    public int getSelectedCellIndex() {
        return selectedCell != null ? board.indexOfCell(selectedCell) : -1;
    }

    // ─────────────────────────────────────────────────────────────
    // Result value objects
    // ─────────────────────────────────────────────────────────────

    public static class MatchResult {
        public enum Type { SELECTED, DESELECTED, MATCHED, FAILED, INVALID }
        public final Type type;
        public final int indexA;
        public final int indexB;
        public final boolean levelComplete;
        public final String message;

        private MatchResult(Type type, int a, int b, boolean lc, String msg) {
            this.type = type; this.indexA = a; this.indexB = b;
            this.levelComplete = lc; this.message = msg;
        }
        static MatchResult selected(int idx)             { return new MatchResult(Type.SELECTED,   idx, -1, false, null); }
        static MatchResult deselected(int idx)           { return new MatchResult(Type.DESELECTED, idx, -1, false, null); }
        static MatchResult matched(int a, int b, boolean lc) { return new MatchResult(Type.MATCHED, a, b, lc, null); }
        static MatchResult failed(int a, int b)          { return new MatchResult(Type.FAILED,     a, b, false, null); }
        static MatchResult invalid(String msg)           { return new MatchResult(Type.INVALID,    -1, -1, false, msg); }
    }

    public static class AddRowResult {
        public final boolean success;
        public final int[] rowValues;
        public final int remainingUses;
        public final boolean wasRescue;
        public final String errorMessage;

        private AddRowResult(boolean success, int[] values, int remaining, boolean rescue, String err) {
            this.success = success; this.rowValues = values;
            this.remainingUses = remaining; this.wasRescue = rescue; this.errorMessage = err;
        }
        static AddRowResult success(int[] v, int r, boolean rescue) { return new AddRowResult(true,  v, r, rescue, null); }
        static AddRowResult exhausted(int[] v, boolean rescue)      { return new AddRowResult(true,  v, 0, rescue, null); }
        static AddRowResult failed(String msg)                      { return new AddRowResult(false, null, 0, false, msg); }
    }

    // ─────────────────────────────────────────────────────────────
    // Event listener interface
    // ─────────────────────────────────────────────────────────────

    public interface GameEventListener {
        void onMatchSuccess(int indexA, int indexB);
        void onMatchFailed(int indexA, int indexB);
        void onRowAdded(int rowIndex, int[] values, int remainingAddRows);
        void onLevelComplete(int level);
        void onGameOver();
    }
}
