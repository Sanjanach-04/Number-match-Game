package com.numbermatch.puzzle.ui;

import android.content.Context;
import android.util.AttributeSet;
import android.view.View;
import android.view.ViewGroup;
import android.widget.TextView;
import android.graphics.Paint;

import com.numbermatch.puzzle.R;
import com.numbermatch.puzzle.engine.Board;
import com.numbermatch.puzzle.engine.Cell;

/**
 * GridView - Custom ViewGroup that renders the 9-column number grid.
 *
 * Uses a uniform cell size calculated from screen width.
 * Cells display their number, with matched cells shown as strikethrough/faded.
 */
public class GridView extends ViewGroup {

    private static final int COLS = Board.COLS;
    private static final int CELL_PADDING_DP = 2;

    private Board board;
    private int selectedIndex = -1;
    private CellTapListener tapListener;

    private int cellSize;
    private int cellPadding;

    public interface CellTapListener {
        void onCellTapped(int cellIndex);
    }

    public GridView(Context context) {
        super(context);
        init(context);
    }

    public GridView(Context context, AttributeSet attrs) {
        super(context, attrs);
        init(context);
    }

    public GridView(Context context, AttributeSet attrs, int defStyle) {
        super(context, attrs, defStyle);
        init(context);
    }

    private void init(Context context) {
        cellPadding = (int) (CELL_PADDING_DP * context.getResources().getDisplayMetrics().density);
    }

    public void setBoard(Board board) {
        this.board = board;
        rebuildViews();
    }

    public void setSelectedIndex(int index) {
        this.selectedIndex = index;
        updateCellStates();
    }

    public void setCellTapListener(CellTapListener listener) {
        this.tapListener = listener;
    }

    /**
     * Refreshes the visual state of all cells without rebuilding views.
     * Call this after a match or deselect.
     */
    public void refresh() {
        updateCellStates();
    }

    // ─────────────────────────────────────────────────────────────
    // View building
    // ─────────────────────────────────────────────────────────────

    private void rebuildViews() {
        removeAllViews();
        if (board == null) return;

        int total = board.getCellCount();
        for (int i = 0; i < total; i++) {
            final int idx = i;
            Cell cell = board.getCellByIndex(i);

            TextView tv = new TextView(getContext());
            tv.setText(cell.isMatched() ? "" : String.valueOf(cell.value));
            tv.setTextSize(16f);
            tv.setTextColor(0xFFE0E0E0);
            tv.setGravity(android.view.Gravity.CENTER);

            if (cell.isMatched()) {
                tv.setBackgroundResource(R.drawable.cell_matched);
                tv.setAlpha(0.2f);
                // Draw strikethrough
                tv.setPaintFlags(tv.getPaintFlags() | Paint.STRIKE_THRU_TEXT_FLAG);
            } else if (i == selectedIndex) {
                tv.setBackgroundResource(R.drawable.cell_selected);
                tv.setTextColor(0xFFFFFFFF);
                tv.setAlpha(1.0f);
            } else {
                tv.setBackgroundResource(R.drawable.cell_normal);
                tv.setAlpha(1.0f);
            }

            tv.setOnClickListener(v -> {
                if (tapListener != null) tapListener.onCellTapped(idx);
            });

            addView(tv);
        }
        requestLayout();
    }

    private void updateCellStates() {
        if (board == null) return;
        int childCount = getChildCount();
        int total = board.getCellCount();

        // If cell count changed (new row added), rebuild entirely
        if (childCount != total) {
            rebuildViews();
            return;
        }

        for (int i = 0; i < total; i++) {
            Cell cell = board.getCellByIndex(i);
            View v = getChildAt(i);
            if (!(v instanceof TextView)) continue;
            TextView tv = (TextView) v;

            if (cell.isMatched()) {
                tv.setText("");
                tv.setBackgroundResource(R.drawable.cell_matched);
                tv.setAlpha(0.15f);
                tv.setPaintFlags(tv.getPaintFlags() | Paint.STRIKE_THRU_TEXT_FLAG);
            } else if (i == selectedIndex) {
                tv.setText(String.valueOf(cell.value));
                tv.setBackgroundResource(R.drawable.cell_selected);
                tv.setTextColor(0xFFFFFFFF);
                tv.setAlpha(1.0f);
                tv.setPaintFlags(tv.getPaintFlags() & ~Paint.STRIKE_THRU_TEXT_FLAG);
            } else {
                tv.setText(String.valueOf(cell.value));
                tv.setBackgroundResource(R.drawable.cell_normal);
                tv.setTextColor(0xFFE0E0E0);
                tv.setAlpha(1.0f);
                tv.setPaintFlags(tv.getPaintFlags() & ~Paint.STRIKE_THRU_TEXT_FLAG);
            }
        }
    }

    // ─────────────────────────────────────────────────────────────
    // Layout
    // ─────────────────────────────────────────────────────────────

    @Override
    protected void onMeasure(int widthMeasureSpec, int heightMeasureSpec) {
        int width = MeasureSpec.getSize(widthMeasureSpec);
        cellSize = (width - getPaddingLeft() - getPaddingRight()) / COLS;

        int rows = (board != null) ? board.getRowCount() : 0;
        int height = rows * cellSize + getPaddingTop() + getPaddingBottom();

        setMeasuredDimension(width, Math.max(height, getSuggestedMinimumHeight()));
    }

    @Override
    protected void onLayout(boolean changed, int left, int top, int right, int bottom) {
        if (board == null) return;
        int total = board.getCellCount();
        for (int i = 0; i < Math.min(total, getChildCount()); i++) {
            int row = i / COLS;
            int col = i % COLS;
            View child = getChildAt(i);

            int l = getPaddingLeft() + col * cellSize + cellPadding;
            int t = getPaddingTop() + row * cellSize + cellPadding;
            int r2 = l + cellSize - cellPadding * 2;
            int b2 = t + cellSize - cellPadding * 2;

            child.layout(l, t, r2, b2);
        }
    }

    @Override
    protected void onSizeChanged(int w, int h, int oldw, int oldh) {
        super.onSizeChanged(w, h, oldw, oldh);
        if (w != oldw) requestLayout();
    }
}
