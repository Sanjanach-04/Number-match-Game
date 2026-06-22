package com.numbermatch.puzzle.engine;

import org.junit.Test;
import static org.junit.Assert.*;

/**
 * Validates that all 11 levels generate solvable boards and that
 * the sawtooth difficulty curve is correctly implemented.
 */
public class BoardSolvabilityTest {

    @Test
    public void allLevelsGenerateSolvableBoards() {
        for (int level = 1; level <= 11; level++) {
            Board board = BoardSeeder.generateBoard(level);
            assertNotNull("Board should not be null for level " + level, board);
            assertEquals("Initial board must have 3 rows", 3, board.getRowCount());
            assertEquals("Initial board must have 27 cells", 27, board.getCellCount());
            assertTrue("Board must have at least one valid match for level " + level,
                    board.hasAnyValidMatch());
        }
    }

    @Test
    public void sawtoothCurveIsCorrect() {
        // Level 6 should be easier (higher matchDensity) than Level 5
        DifficultyConfig l5 = DifficultyConfig.forLevel(5);
        DifficultyConfig l6 = DifficultyConfig.forLevel(6);
        assertTrue("Level 6 (relief) should have higher match density than Level 5",
                l6.matchDensity > l5.matchDensity);

        // Level 11 should be easier than Level 10
        DifficultyConfig l10 = DifficultyConfig.forLevel(10);
        DifficultyConfig l11 = DifficultyConfig.forLevel(11);
        assertTrue("Level 11 (relief) should have higher match density than Level 10",
                l11.matchDensity > l10.matchDensity);

        // Level 1 should be easiest
        DifficultyConfig l1 = DifficultyConfig.forLevel(1);
        assertTrue("Level 1 should have highest match density",
                l1.matchDensity >= l5.matchDensity);
    }

    @Test
    public void addRowRescueMechanicTriggers() {
        DifficultyConfig config = DifficultyConfig.forLevel(1);
        AddRowEngine engine = new AddRowEngine(config);
        Board board = BoardSeeder.generateBoard(1);

        // Press Add Row twice WITHOUT making any matches (no notifyMatchMade calls)
        int[] row1 = engine.generateNextRow(board);
        assertNotNull(row1);
        board.addRow(row1);

        int[] row2 = engine.generateNextRow(board);
        assertNotNull(row2);
        board.addRow(row2);

        // After 2 presses without match: rescue mode should be active
        assertTrue("Rescue mode should trigger after 2 add-rows with no matches",
                engine.isInRescueMode());
    }

    @Test
    public void cellMatchRules() {
        // Same value matches
        Cell a = new Cell(5, 0, 0);
        Cell b = new Cell(5, 0, 1);
        assertTrue("Same value should match", Cell.canMatch(a, b));

        // Sum-to-10 matches
        Cell c = new Cell(3, 0, 0);
        Cell d = new Cell(7, 0, 1);
        assertTrue("3+7=10 should match", Cell.canMatch(c, d));

        // Non-matching
        Cell e = new Cell(2, 0, 0);
        Cell f = new Cell(6, 0, 1);
        assertFalse("2+6=8 should not match", Cell.canMatch(e, f));

        // Matched cell cannot be re-matched
        a.markMatched();
        assertFalse("Matched cell cannot be re-matched", Cell.canMatch(a, b));
    }

    @Test
    public void boardAdjacencyRules() {
        Board board = new Board();
        board.addRow(new int[]{1, 2, 3, 4, 5, 6, 7, 8, 9});
        board.addRow(new int[]{9, 8, 7, 6, 5, 4, 3, 2, 1});

        // Adjacent horizontal (0,1) should match: 1 and 2 → no (don't match)
        Cell c00 = board.getCell(0, 0); // 1
        Cell c01 = board.getCell(0, 1); // 2
        assertFalse("1 and 2 are not a valid number match", board.isValidMatch(c00, c01));

        // (0,0) and (0,8) = 1 and 9 → sum to 10, but not adjacent (gap between)
        Cell c08 = board.getCell(0, 8); // 9
        assertFalse("1 and 9 at ends of same row are NOT adjacent (gap exists)",
                board.isValidMatch(c00, c08));

        // (0,8) and (1,0) = 9 and 9 → same value, wrap-around
        Cell c10 = board.getCell(1, 0); // 9
        assertTrue("Wrap-around: last of row 0 and first of row 1 should match if same value",
                board.isValidMatch(c08, c10));
    }

    @Test
    public void addRowLimitIsEnforced() {
        DifficultyConfig config = DifficultyConfig.forLevel(1);
        AddRowEngine engine = new AddRowEngine(config);
        Board board = BoardSeeder.generateBoard(1);

        for (int i = 0; i < 6; i++) {
            assertNotNull("Should return row for use " + (i + 1),
                    engine.generateNextRow(board));
        }
        assertNull("7th press should return null (exhausted)", engine.generateNextRow(board));
    }

    @Test
    public void stragglerDetection() {
        Board board = new Board();
        board.addRow(new int[]{1, 2, 3, 4, 5, 6, 7, 8, 9});

        // Match all cells in row 0 except cell (0,4) which is 5
        for (int c = 0; c < 9; c++) {
            if (c != 4) board.getCell(0, c).markMatched();
        }

        java.util.List<Cell> stragglers = board.getStragglerCells();
        assertEquals("Should find exactly 1 straggler", 1, stragglers.size());
        assertEquals("Straggler should be value 5", 5, stragglers.get(0).value);
    }
}
