package com.numbermatch.puzzle.ui;

import android.animation.ObjectAnimator;
import android.os.Bundle;
import android.view.View;
import android.widget.Button;
import android.widget.ScrollView;
import android.widget.TextView;

import androidx.appcompat.app.AlertDialog;
import androidx.appcompat.app.AppCompatActivity;

import com.numbermatch.puzzle.R;
import com.numbermatch.puzzle.engine.GameEngine;
import com.numbermatch.puzzle.engine.GameEngine.AddRowResult;
import com.numbermatch.puzzle.engine.GameEngine.MatchResult;

/**
 * GameActivity - Main game screen.
 *
 * Handles:
 *   - Rendering the board via GridView
 *   - Forwarding taps to GameEngine
 *   - Showing Add Row button state (uses remaining)
 *   - Rescue / status notifications
 *   - Level complete / game over dialogs
 */
public class GameActivity extends AppCompatActivity implements GameEngine.GameEventListener {

    public static final String EXTRA_LEVEL = "level";

    private GameEngine engine;
    private GridView gridView;
    private ScrollView scrollView;
    private TextView tvLevel, tvAddRowCount, tvMatches, tvStatus;
    private Button btnAddRow, btnNewGame;

    private int matchCount = 0;
    private boolean isScanning = false;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_game);

        int level = getIntent().getIntExtra(EXTRA_LEVEL, 1);

        // Views
        tvLevel      = findViewById(R.id.tvLevel);
        tvAddRowCount = findViewById(R.id.tvAddRowCount);
        tvMatches    = findViewById(R.id.tvMatches);
        tvStatus     = findViewById(R.id.tvStatus);
        gridView     = findViewById(R.id.gridView);
        scrollView   = findViewById(R.id.scrollView);
        btnAddRow    = findViewById(R.id.btnAddRow);
        btnNewGame   = findViewById(R.id.btnNewGame);

        startGame(level);

        btnAddRow.setOnClickListener(v -> onAddRowClicked());
        btnNewGame.setOnClickListener(v -> restartLevel());
    }

    // ─────────────────────────────────────────────────────────────
    // Game setup
    // ─────────────────────────────────────────────────────────────

    private void startGame(int level) {
        matchCount = 0;
        engine = new GameEngine(level);
        engine.setListener(this);

        tvLevel.setText("Level " + level);
        updateAddRowButton();
        updateMatchCount();
        hideStatus();

        // Bind tap listener
        gridView.setCellTapListener(this::onCellTapped);
        gridView.setBoard(engine.getBoard());
        gridView.setSelectedIndex(-1);
    }

    private void restartLevel() {
        startGame(engine.getLevel());
    }

    // ─────────────────────────────────────────────────────────────
    // Player input handlers
    // ─────────────────────────────────────────────────────────────

    private void onCellTapped(int cellIndex) {
        if (isScanning) return;
        MatchResult result = engine.onCellTapped(cellIndex);

        switch (result.type) {
            case SELECTED:
                gridView.setSelectedIndex(cellIndex);
                break;

            case DESELECTED:
                gridView.setSelectedIndex(-1);
                break;

            case MATCHED:
                gridView.setSelectedIndex(-1);
                gridView.refresh();
                matchCount++;
                updateMatchCount();
                // Auto-scroll to bottom so player can see the board
                scrollView.post(() -> scrollView.fullScroll(View.FOCUS_DOWN));
                if (result.levelComplete) {
                    showLevelCompleteDialog();
                }
                break;

            case FAILED:
                gridView.setSelectedIndex(-1);
                shakeView(gridView);
                break;

            case INVALID:
                // Do nothing
                break;
        }
    }

    private void onAddRowClicked() {
        if (engine.getState() != GameEngine.GameState.PLAYING || isScanning) return;

        isScanning = true;
        btnAddRow.setEnabled(false);
        btnAddRow.setText("Scanning...");
        showStatus("Scanning board for matches...", 500);

        btnAddRow.postDelayed(() -> {
            isScanning = false;
            updateAddRowButton();

            if (engine.getBoard().hasAnyValidMatch()) {
                new AlertDialog.Builder(GameActivity.this)
                        .setTitle("Matches Available!")
                        .setMessage("Valid matches still exist. Are you sure you want to add a new row?")
                        .setPositiveButton("Yes, Add Row", (dialog, which) -> performAddRow(true))
                        .setNegativeButton("No, Keep Looking", null)
                        .setCancelable(false)
                        .show();
            } else {
                performAddRow(false);
            }
        }, 500);
    }

    private void performAddRow(boolean force) {
        boolean wasRescue = engine.isAddRowInRescueMode();

        AddRowResult result = engine.onAddRow(force);
        if (!result.success) {
            showStatus("No Add Rows remaining!", 2000);
            return;
        }

        // Refresh grid to show new row
        gridView.setBoard(engine.getBoard());
        updateAddRowButton();

        if (result.wasRescue) {
            showStatus("Rescue! Easier matches added ✓", 2500);
        }

        // Scroll to bottom to show new row
        scrollView.post(() -> scrollView.fullScroll(View.FOCUS_DOWN));

        if (engine.getRemainingAddRows() == 0) {
            btnAddRow.setAlpha(0.4f);
            btnAddRow.setEnabled(false);
        }
    }

    // ─────────────────────────────────────────────────────────────
    // GameEventListener callbacks
    // ─────────────────────────────────────────────────────────────

    @Override
    public void onMatchSuccess(int indexA, int indexB) {
        // Handled in onCellTapped result
    }

    @Override
    public void onMatchFailed(int indexA, int indexB) {
        // Handled in onCellTapped result
    }

    @Override
    public void onRowAdded(int rowIndex, int[] values, int remainingAddRows) {
        // Handled in onAddRowClicked
    }

    @Override
    public void onLevelComplete(int level) {
        // Handled via MatchResult.levelComplete flag
    }

    @Override
    public void onGameOver() {
        showGameOverDialog();
    }

    // ─────────────────────────────────────────────────────────────
    // UI helpers
    // ─────────────────────────────────────────────────────────────

    private void updateAddRowButton() {
        int remaining = engine.getRemainingAddRows();
        tvAddRowCount.setText("+ Row: " + remaining);
        btnAddRow.setEnabled(remaining > 0 && engine.getState() == GameEngine.GameState.PLAYING);
        btnAddRow.setAlpha(remaining > 0 ? 1.0f : 0.4f);
        btnAddRow.setText("+ Add Row");
    }

    private void updateMatchCount() {
        tvMatches.setText("Matched: " + matchCount);
    }

    private void showStatus(String message, long durationMs) {
        tvStatus.setText(message);
        tvStatus.setVisibility(View.VISIBLE);
        tvStatus.postDelayed(this::hideStatus, durationMs);
    }

    private void hideStatus() {
        tvStatus.setVisibility(View.GONE);
    }

    private void shakeView(View view) {
        ObjectAnimator shaker = ObjectAnimator.ofFloat(view, "translationX",
                0f, 12f, -12f, 8f, -8f, 4f, -4f, 0f);
        shaker.setDuration(400);
        shaker.start();
    }

    private void showLevelCompleteDialog() {
        int nextLevel = engine.getLevel() + 1;
        new AlertDialog.Builder(this)
                .setTitle("Level Complete! 🎉")
                .setMessage("You matched all numbers!\n\nReady for Level " + nextLevel + "?")
                .setPositiveButton("Next Level", (d, w) -> startGame(nextLevel))
                .setNegativeButton("Menu", (d, w) -> {
                    setResult(RESULT_OK);
                    finish();
                })
                .setCancelable(false)
                .show();
    }

    private void showGameOverDialog() {
        new AlertDialog.Builder(this)
                .setTitle("No More Moves")
                .setMessage("You've used all Add Row attempts. Try again?")
                .setPositiveButton("Retry", (d, w) -> restartLevel())
                .setNegativeButton("Menu", (d, w) -> finish())
                .setCancelable(false)
                .show();
    }

}
