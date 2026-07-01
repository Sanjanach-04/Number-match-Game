# Number Match Puzzle — Algorithm Design Document (v3)

## 1. Board Generation (Layered, Gap-Enforced Seeding)

### Problem with Shuffle-First
Even at low match densities (e.g., Level 10), pure shuffling of pairs leaves many matched pairs adjacent to each other. This creates a board where high levels are trivially easy because the player spots adjacent pairs immediately.

### Solution: Layered Gap-Enforced Seeding
The board is generated in three distinct layers to control spatial scanning difficulty:

1. **Layer 1 — Immediate Pair (positions 0,1):**
   - Always 1 same-value pair is pinned at indices `[0, 1]` at board start.
   - Guarantees that at least one valid move is immediately playable to prevent frustration.

2. **Layer 2 — Accessible Pairs (within minGap & maxGap bounds):**
   - The remaining matchable pairs are placed into slots using a gap-enforced algorithm:
     - Each pair's cells must be separated by an index distance between `minGap` and `maxGap` (defined per level).
     - **Easy levels (L1–L2):** gaps of 1–3 cells (physically close).
     - **Medium levels (L3–L4, L6, L11):** gaps of 3–6 cells.
     - **Hard levels (L5, L7–L10):** gaps of 6–22 cells (buried across rows).

3. **Layer 3 — True Decoys:**
   - Remaining empty cells are filled with true decoys.
   - A **true decoy** is a value $V$ where neither $V$ nor its sum-to-10 complement exists in any pair on the board. These cells act as pure visual noise and can never be matched.

---

## 2. Sawtooth Difficulty Curve Config

| Level | Match Density | minGap | maxGap | True Decoys | Friction | Expected Add Row | Experience |
|-------|--------------|--------|--------|-------------|----------|------------------|------------|
| 1     | 90%          | 1      | 3      | 0%          | 0.00     | 1 (90% prob)     | Easy - instant gratification |
| 2     | 82%          | 2      | 4      | 5%          | 0.10     | 1–2              | Comfortable |
| 3     | 70%          | 3      | 6      | 15%         | 0.25     | 2–3              | Normal - requires scanning |
| 4     | 60%          | 4      | 9      | 25%         | 0.38     | 2–3              | Moderate |
| 5     | 48%          | 6      | 14     | 40%         | 0.50     | 2–3              | Hard - buried in decoys |
| **6** | **70%**      | **3**  | **6**  | **15%**     | **0.25** | **2–4**          | **RELIEF — back to L3 feel** |
| 7     | 54%          | 5      | 12     | 35%         | 0.45     | 3–4              | Harder ramp |
| 8     | 44%          | 7      | 16     | 46%         | 0.58     | 3–5              | Very hard |
| 9     | 40%          | 8      | 18     | 54%         | 0.68     | 4–5              | Intense |
| 10    | 35%          | 9      | 22     | 63%         | 0.78     | 5–6              | Peak difficulty |
| **11**| **70%**      | **3**  | **6**  | **15%**     | **0.25** | **3–4**          | **RELIEF — same as L3/L6** |

---

## 3. Add Row Algorithm (Tiered Injection)

When the player presses (+) Add Row, the algorithm analyzes the board and builds the new row:

* **Tier 0 — Rescue Mode (dryPresses ≥ 2):**
  - If the player clicked Add Row 2+ times with 0 matches in between, trigger rescue.
  - Injects two adjacent same-value pairs at the front: `[V, V, W, W]` at positions 0-3.
  - The remaining 5 cells are filled with helpers (complements of active cells) so there are **no pure decoys** in the rescue row.
  - Reset `dryPresses = 0`.

* **Tier 1 — Straggler Cleanup:**
  - Find all rows with exactly 1 active cell remaining.
  - For each straggler cell $S$, inject its complement `comp(S)` at the front of the new row.
  - Helps keep the board compact.

* **Tier 2 — Helper Fill:**
  - Remaining helper slots are filled with complements of random active board cells.

* **Tier 3 — Decoy Fill:**
  - Remaining decoy slots are filled with true decoys (no partner anywhere on the board) to add visual noise.

* **Position Shuffling by Level Difficulty:**
  - **Level 1:** preserves all straggler complements at front, and forces the rest of the cells to form adjacent pairs.
  - **Level 2:** light shuffle, preserving some helper adjacency.
  - **Level 3–6:** medium shuffle, straggler complements remain at front.
  - **Level 7–10:** full random shuffle of all 9 elements for maximum scan distance.

---

## 4. Human-Simulation Model

To validate the difficulty configuration realistically, `simulate_difficulty.js` runs a physically-grounded human play simulator:

- **Perception Probability:** The likelihood that a human spots a match decreases based on:
  - **Physical distance** on screen: $P(\text{notice}) \propto \text{distanceDecay}^{\text{distance}}$
  - **Friction penalty** (mental arithmetic): sum-to-10 matches are harder to spot than same-value.
  - **Alertness / level scaling**: base notice rates decrease at higher levels.
- **Search scans:** The human scans the board up to 4 times. If they still don't spot any match, they will use a Hint with high probability or decide to force an Add Row.
- **Solver path guidance:** To prevent the simulator from playing sub-optimally (which makes the board unsolvable by mistake), matches are selected from the solver's path (`solveBoard`). This keeps the board solvable throughout the simulation.
