package com.numbermatch.puzzle.ui;

import android.content.Intent;
import android.os.Bundle;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.TextView;

import androidx.annotation.NonNull;
import androidx.appcompat.app.AppCompatActivity;
import androidx.recyclerview.widget.GridLayoutManager;
import androidx.recyclerview.widget.RecyclerView;

import com.numbermatch.puzzle.R;
import com.numbermatch.puzzle.engine.DifficultyConfig;

public class LevelSelectActivity extends AppCompatActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_level_select);

        RecyclerView rv = findViewById(R.id.rvLevels);
        rv.setLayoutManager(new GridLayoutManager(this, 3));
        rv.setAdapter(new LevelAdapter(11, level -> {
            Intent intent = new Intent(this, GameActivity.class);
            intent.putExtra(GameActivity.EXTRA_LEVEL, level);
            startActivity(intent);
        }));
    }

    // ─────────────────────────────────────────────────────────────
    // Level grid adapter
    // ─────────────────────────────────────────────────────────────

    private static class LevelAdapter extends RecyclerView.Adapter<LevelAdapter.VH> {

        interface OnLevelClick { void onClick(int level); }

        private final int levelCount;
        private final OnLevelClick clickListener;

        LevelAdapter(int levelCount, OnLevelClick clickListener) {
            this.levelCount = levelCount;
            this.clickListener = clickListener;
        }

        @NonNull
        @Override
        public VH onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
            View v = LayoutInflater.from(parent.getContext())
                    .inflate(R.layout.item_level, parent, false);
            return new VH(v);
        }

        @Override
        public void onBindViewHolder(@NonNull VH holder, int position) {
            int level = position + 1;
            DifficultyConfig config = DifficultyConfig.forLevel(level);
            boolean isRelief = (level == 6 || level == 11);

            String label = "Level " + level;
            if (isRelief) label += " ✦";

            holder.tv.setText(label);
            // Tint: relief levels are gold, others are default
            holder.tv.setTextColor(isRelief ? 0xFFFFD700 : 0xFFE0E0E0);

            holder.itemView.setOnClickListener(v -> clickListener.onClick(level));
        }

        @Override
        public int getItemCount() { return levelCount; }

        static class VH extends RecyclerView.ViewHolder {
            TextView tv;
            VH(View v) { super(v); tv = v.findViewById(R.id.tvLevelItem); }
        }
    }
}
