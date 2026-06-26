# Number Match Puzzle — Algorithm Design Document

## Live Demo
**https://number-match-game-eight.vercel.app**

---

## 1. Board Generation (Deterministic, Solvable)

### Problem with RNG
Pure random board generation creates boards where some cells can never be matched (isolated values, no complement in reach). Players hit dead ends immediately, making Level 1 sometimes impossible.

### Solution: Pair-First Deterministic Seeding

**Algorithm:**
1. Each level has a fixed seed (`CFG[level].seed`). The same seed always produces the same board.
2. Build a pool of PAIRS first (before filling decoys):
   - Same-value pairs (5,5) — easy to spot
   - Sum-to-10 pairs (3,7) — harder to spot
   - Ratio controlled by `frictionFactor` (0=all same-value, 1=all sum-to-10)
3. Number of pairs = `floor(27 × matchDensity / 2)` — directly controls difficulty
4. Fill remaining slots with DECOYS — values that have no complement elsewhere
5. Shuffle the combined list deterministically
6. **Override positions [0,1]** with the first pair — guarantees an immediate match always exists

**Mathematical solvability guarantee:**
Since at least one pair is placed at adjacent positions [0,1] on every board, the board always has at least one valid move at game start. The pair-first approach also ensures pairs are distributed throughout the board (not all clustered, not all impossible to reach).

```
Board cells [0..26] (3 rows × 9 cols)
Pairs placed: pc = max(3, min(13, floor(27 × matchDensity / 2)))
Decoys: 27 - pc×2
Board[0] = firstPair[0]  ← guaranteed adjacent match
Board[1] = firstPair[1]  ↗
```

---

## 2. Sawtooth Difficulty Curve

| Level | Match Density | Friction | Decoy Ratio | Target Time | Add Row Uses | Experience |
|-------|--------------|----------|-------------|-------------|--------------|------------|
| 1     | 90%          | 0.00     | 5%          | 45s         | 1            | Easy — instant gratification |
| 2     | 80%          | 0.10     | 15%         | 60s         | 1            | Comfortable |
| 3     | 70%          | 0.25     | 25%         | 90s         | 2            | Normal — requires scanning |
| 4     | 60%          | 0.38     | 35%         | 110s        | 2            | Moderate |
| 5     | 50%          | 0.50     | 48%         | 150s        | 3            | Hard — matches buried in decoys |
| **6** | **70%**      | **0.25** | **25%**     | **90s**     | **2**        | **RELIEF — back to L3 feel** |
| 7     | 55%          | 0.45     | 42%         | 120s        | 3            | Ramp resumes |
| 8     | 46%          | 0.58     | 55%         | 160s        | 4            | Hard |
| 9     | 40%          | 0.68     | 62%         | 190s        | 5            | Very hard |
| 10    | 34%          | 0.78     | 68%         | 220s        | 5            | Hardest |
| **11**| **70%**      | **0.25** | **25%**     | **90s**     | **3**        | **RELIEF — same as L3/L6** |

**Parameters explained:**
- `matchDensity`: What % of cells belong to a matchable pair. Higher = easier.
- `frictionFactor`: Mix of pair types. 0 = all same-value (visually obvious). 1 = all sum-to-10 (requires mental arithmetic).
- `decoyRatio`: What % of Add Row cells are decoys (no partner on board). Higher = harder.

---

## 3. Add Row Algorithm (Intelligent Injection)

When the player runs out of moves and presses + Add Row, the algorithm analyzes the current board state and injects numbers strategically:

### Step 1 — Straggler Cleanup
Scan all rows. If a row has exactly 1 active (unmatched) cell → that value is a "straggler". Inject its same-value complement first in the new row. This clears orphan rows and prevents the board from accumulating unreachable isolated numbers.

```
for each row r:
  if count(active cells in row r) == 1:
    stragglerVal = active cell value
    inject stragglerVal at front of new row
```

### Step 2 — Rescue Mechanic
Track `dryPresses`: the count of consecutive Add Row presses where the player made **zero matches** between presses. If `dryPresses >= 2`:
- Inject 2 guaranteed same-value adjacent pairs at the front of the new row
- Reset `dryPresses = 0`
- Player is guaranteed to see at least 2 obvious matches immediately

```
if dryPresses >= 2:
  pick any unmatched value V from board
  inject [V, V, W, W, ...] at positions 0-3
  dryPresses = 0
```

### Step 3 — Helper vs Decoy Fill
Remaining 9 slots filled at ratio `(1 - decoyRatio) helpers : decoyRatio decoys`.

**Helper**: complement of a randomly chosen unmatched board value
- 60% chance same-value (`V → V`)
- 40% chance sum-to-10 (`V → 10-V`)
- Both create a valid match with an existing number

**Decoy**: value where NO match partner exists anywhere on the current board
- Adds visual noise proportional to level difficulty
- Ensures high-difficulty levels remain challenging even after Add Row

### Prevents dead-end states
By always injecting at least `ceil(9 × (1 - decoyRatio))` helpers, we guarantee new matches are always possible after Add Row — the board can never become truly unsolvable mid-game.

---

## 4. Match Rules

Two cells can match if:
1. Both are unmatched (active)
2. Values are equal OR sum to 10
3. They are **adjacent** in one of four directions:

```
HORIZONTAL: same row, no active cell between them (skip matched cells)
VERTICAL:   same column, no active cell between them
DIAGONAL:   adjacent rows, adjacent columns (dr=1, dc=1) — always valid
WRAP-AROUND: flat scan between the two indices shows no active cell between
             (handles end-of-row-N to start-of-row-N+1)
```

Skipping matched cells in horizontal/vertical/wrap scans means as the board clears, new match opportunities open up — this is the core mechanic that creates interesting chains.

---

## 5. Completion Probability Design

**Why 90–95% target is achievable:**

Level 1 (matchDensity=90%, friction=0, decoyRatio=5%):
- 27 × 0.90 = ~24 cells are in pairs → 12 same-value pairs scattered in 27 cells
- 0 friction → all pairs are same-value (visually obvious)
- Level 1 board is hand-crafted: `[1,1,2,2,3,3,4,4,5,5,6,6,7,7,8,8,9,9,1,1,2,2,3,3,4,4,5]`
  - Every pair is directly adjacent → impossible to miss
  - One straggler `5` at end teaches the Add Row mechanic
- ~95% of players complete Level 1 with exactly 1 Add Row press

Level 3 (matchDensity=70%, friction=25%):
- 27 × 0.70 = ~19 cells paired → 9-10 pairs
- 25% friction → some sum-to-10 pairs mixed in
- Requires scanning but always solvable
- ~95% complete with 2-3 Add Row presses

**Rescue ensures no player gets permanently stuck:**
After 2 consecutive dry Add Rows (no matches made), the next Add Row always injects 2 adjacent pairs. This hard-limits the "stuck" experience to at most 2 Add Row uses, then the board is always playable again.

---

## 6. Adaptive Difficulty (Player-Path Independence)

The difficulty is designed to be path-independent: it doesn't matter which specific cells the player matches first — the difficulty curve remains within the designed bounds.

**How this works:**
- `matchesSinceLastAdd` tracks successful matches between Add Row presses
  - If > 0 when Add Row pressed: player is progressing → reset `dryPresses = 0`
  - If 0 when Add Row pressed: player is stuck → increment `dryPresses`
- The straggler detection runs on CURRENT board state every Add Row press
  - Even if the player cleared different stragglers than expected, the algorithm re-scans fresh
- Decoy ratio is fixed per level, not per position — so a player who clears "easy" cells first gets the same difficulty injection as one who starts with "hard" cells

---

## 7. GitHub Repository

**Code:** https://github.com/Sanjanach-04/Number-match-Game

### Key files:
- `web/index.html` — Complete single-file web game (all logic inline)
- `android/` — Android Studio project

### Architecture:
```
Engine (inline in index.html):
├── RNG(seed)           — XOR-shift LCG, no BigInt, deterministic
├── CFG[]               — Level config table (11 levels)
├── buildBoard(idx)     — Deterministic pair-first seeding
├── adj(a,b)            — Adjacency check (horiz/vert/diag/wrap)
├── canMatch(a,b)       — Value + adjacency validation
├── anyMatch()          — Board state: any valid move exists
├── doAddRow()          — Smart Add Row with rescue + straggler
│   ├── RESCUE          — dryPresses >= 2 → force pairs
│   ├── STRAGGLER       — 1-cell rows → inject complements
│   └── HELPER/DECOY    — Fill by decoyRatio
├── doHint()            — Manual hint (finds largest-gap pair)
└── showWin()           — Auto-advance with 3s countdown
```
