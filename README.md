# Number Match Puzzle — Deterministic Engine

## Algorithm Writeup

### The Core Problem
Classic RNG-based number match games produce wildly varying experiences:
some Level 1 boards are unsolvable, some Level 10 boards clear in 10 seconds.
This codebase replaces all random number generation with a **Deterministic Logic System**.

---

### Part A: Seeding Logic (Board Generation)

**Algorithm: Pair-First Deterministic Placement**

```
Input:  level number
Output: 3-row × 9-col board, guaranteed solvable, same result every time

1. Load DifficultyConfig(level)
   → matchDensity, decoyRatio, frictionFactor, seed

2. Compute pairCount = floor(27 × matchDensity / 2)
   Level 1: 27 × 0.80 / 2 = 10 pairs
   Level 5: 27 × 0.50 / 2 =  6 pairs

3. Generate pairCount pairs:
   - sameValueRatio = 0.60 − frictionFactor × 0.30
     (L1: ~58% same-value pairs like 5&5; L10: ~33% — harder to spot)
   - Each pair is either same-value (3&3) or sum-to-10 (3&7)
   - Source: fixed catalogs, selected via SeededRandom(level.seed)

4. Fill remaining 27 − pairCount×2 slots with "decoys"
   - Decoy: a value with no existing pair in the already-placed numbers
   - If no true decoy found in 10 tries, accept any value (graceful fallback)

5. Shuffle all 27 values using SeededRandom.shuffle()

6. Override positions [0,1] with the first guaranteed pair
   → Player always has at least one immediate match at game start

7. Solvability Check (greedy simulation):
   - Simulate: repeatedly find+remove any valid match
   - If board clears completely → accept
   - If stuck → re-generate with derived seed (seed + attempt × 7919)
   - Fallback after 20 attempts: trivially solvable board (safety net)
```

**Why this works:** By placing pairs first and validating solvability, we guarantee
the 95% completion probability requirement while still feeling "discovered" to the player.

---

### Part B: Add Row Logic

**Algorithm: Analyze → Prioritize → Mix**

```
Input:  current board state, level, press count, match history
Output: 9 values to append as new row

1. RESCUE CHECK
   Track addRowPressesWithoutMatch counter.
   If counter ≥ 2 → RESCUE MODE:
     - Force 2 adjacent guaranteed pairs (values matching something on board)
     - Fill rest with 70% helpers, 30% random
     - Reset counter to 0 after rescue injection
     - Show "Rescue!" banner to player

2. STRAGGLER PRIORITY
   Find rows with exactly 1 active cell remaining.
   For each straggler (up to max = 3 × (1 - frictionFactor)):
     - Inject complement of straggler's value at front of new row
     Level 1: inject up to 2 straggler helpers
     Level 10: inject up to 0 (player must figure it out)

3. HELPER FILL
   Remaining slots up to floor(9 × (1 - decoyRatio)):
     - Pick random active board value → inject its complement
     Level 1: 9 × 0.90 = ~8 helpers
     Level 5: 9 × 0.50 = ~4-5 helpers

4. DECOY FILL
   Remaining slots:
     - Values that match NOTHING on the current board
     - If no true decoy found in 10 tries: use any value

5. SHUFFLE positions [shuffleStart..8]
   Keep straggler helpers at predictable front position for visual clarity.
```

---

### The Sawtooth Difficulty Curve

```
Level | Match Density | Decoy Ratio | Target Time | Ideal AddRow | Experience
------+---------------+-------------+-------------+--------------+------------
  1   |     80%       |     10%     |    45s      |      1       | Easy / instant
  2   |     72%       |     20%     |    60s      |      2       | Comfortable
  3   |     65%       |     30%     |    90s      |      2-3     | Normal
  4   |     58%       |     38%     |   120s      |      3       | Moderate
  5   |     50%       |     50%     |   150s      |      3       | Hard
  6   |     65%       |     30%     |    90s      |      3       | RELIEF ✦
  7   |     55%       |     45%     |   120s      |      4       | Ramp begins
  8   |     48%       |     55%     |   150s      |      4-5     | Intense
  9   |     42%       |     62%     |   180s      |      5       | Very hard
 10   |     38%       |     68%     |   210s      |      5-6     | Peak
 11   |     65%       |     30%     |    90s      |      3       | RELIEF ✦
```

The key insight: Relief levels (6, 11) don't reset to Level 1 difficulty.
They reset to Level 3 feel — familiar enough to be "easy" after the grind,
but not so trivial that momentum is lost.

---

### Why 95% Probability is Achieved

Three guarantees stack on top of each other:

1. **Initial board** always has ≥1 immediate match (by design)
2. **Add Row** always injects ≥ (1 - decoyRatio) × 9 helpers pointing at real board values
3. **Rescue** fires after 2 dry Add Rows — ensures forward progress is always possible

The only way to fail is to use all 6 Add Row buttons without making progress,
which requires ignoring 2 rescue events AND all helpers. This is statistically very rare.

---

## Project Structure

```
android/
├── app/
│   └── src/
│       ├── main/
│       │   ├── java/com/numbermatch/puzzle/
│       │   │   ├── engine/
│       │   │   │   ├── Cell.java           — Single grid cell
│       │   │   │   ├── Board.java          — 9-col grid with match logic
│       │   │   │   ├── SeededRandom.java   — Deterministic LCG (no java.util.Random)
│       │   │   │   ├── DifficultyConfig.java — Sawtooth curve table
│       │   │   │   ├── BoardSeeder.java    — Part A: board generation
│       │   │   │   ├── AddRowEngine.java   — Part B: smart add row
│       │   │   │   └── GameEngine.java     — Top-level controller
│       │   │   └── ui/
│       │   │       ├── GridView.java       — Custom 9-col ViewGroup
│       │   │       ├── GameActivity.java   — Main game screen
│       │   │       └── LevelSelectActivity.java
│       │   └── res/                        — Layouts, drawables, themes
│       └── test/
│           └── BoardSolvabilityTest.java   — Engine unit tests
└── build.gradle
```

---

## Build Instructions

### Prerequisites
- Android Studio Hedgehog (2023.1.1) or newer
- JDK 17+
- Android SDK with API 34

### Steps

1. Open Android Studio
2. File → Open → select the `android/` folder
3. Wait for Gradle sync
4. Run → Run 'app' on an emulator or device

### Build APK
```
./gradlew assembleDebug
# APK at: app/build/outputs/apk/debug/app-debug.apk
```

### Run Unit Tests
```
./gradlew testDebugUnitTest
# Report at: app/build/reports/tests/testDebugUnitTest/index.html
```

---

## Game Rules

- **Grid**: 9 columns, rows grow downward
- **Match Types**: Same number (5+5) OR sum to 10 (3+7)
- **Match Directions**: Horizontal, Vertical, Wrap-around (end of row N → start of row N+1)
- **Adjacency Rule**: Skips matched (crossed-out) cells when checking if two cells are adjacent
- **Win Condition**: All cells matched
- **Add Row**: Up to 6 uses per level. Smart injection based on board state.

---

## Deliverables Checklist
- [x] Deterministic seeding (no RNG)
- [x] Sawtooth difficulty curve (11 levels)
- [x] Add Row smart logic (helpers + decoys)
- [x] Rescue mechanic (2 dry presses → forced pairs)
- [x] Straggler cleanup (orphan rows prioritized)
- [x] 6 Add Row limit per level
- [x] Initial board: always 3 rows
- [x] Unit tests for engine
- [x] Algorithm writeup
