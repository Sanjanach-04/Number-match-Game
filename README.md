# Number Match Puzzle — Deterministic Engine

## Overview

A deterministic, always-solvable number match puzzle game.  
Match same numbers or pairs summing to 10. Cells must share a clear path
(horizontal, vertical, diagonal, or wrap-around). Match all cells to win.

---

## Algorithm Writeup

### Deterministic Board Generation

**Algorithm: Pair-First Placement + Solvability Validation**

```
Input:  level index (0-based)
Output: 3-row × 9-col board [{v, m:false}], guaranteed solvable, same result every time

1. Load levelConfig(index) — matchDensity, hiddenMatches, pairDistance, seed

2. pairCount = max(3, min(13, floor(27 × matchDensity / 2)))
   L1: 27 × 0.90 / 2 = 12 pairs   L10: 27 × 0.34 / 2 = 4 pairs

3. Build pairs using SeededRNG(seed):
   - hiddenMatches fraction → sum-to-10 pairs (3+7, harder to spot)
   - remaining → same-value pairs (3+3, easy to spot)
   - First pair saved as firstPair (guaranteed to be adjacent at positions [0,1])

4. Fill remaining 27 - pairCount×2 slots with decoys:
   - A decoy is a value with no complement already in the array
   - Graceful fallback after 8 tries: accept any value

5. Shuffle all 27 values with SeededRNG.shuffle()

6. Pin firstPair to positions [0,1] → always an immediate match at game start

7. Validation (boardValidator.js):
   - hasAnyMatch() must return true
   - isBoardSolvable() (greedy solver) must return true
   - On failure: retry up to 20 times with derived seed (seed + attempt × 7919)
   - Final fallback: hand-crafted Level-1 board
```

**Level-1 exception:** Hand-crafted board `[1,1,2,2,3,3,4,4,5,5,6,6,7,7,8,8,9,9,1,1,2,2,3,3,4,4,5]` — all pairs adjacent, impossible to fail.

---

### Sawtooth Difficulty Curve

The difficulty rises over 5 levels then drops to a "relief" level before rising again.
This prevents burnout while maintaining momentum.

| Level | matchDensity | decoyDensity | hiddenMatches | expectedAddRow | difficultyScore | Note        |
|-------|-------------|--------------|---------------|----------------|-----------------|-------------|
|  1    |    0.90     |    0.00      |     0.00      |       1        |        1        | Very easy   |
|  2    |    0.82     |    0.08      |     0.10      |       1        |        2        |             |
|  3    |    0.72     |    0.18      |     0.20      |       2        |        3        | Normal      |
|  4    |    0.62     |    0.28      |     0.30      |       2        |        4        |             |
|  5    |    0.50     |    0.40      |     0.45      |       3        |        6        | Hard        |
|  6    |    0.72     |    0.18      |     0.20      |       2        |        3        | **RELIEF** ✦|
|  7    |    0.55     |    0.35      |     0.40      |       3        |        6        | Ramp begins |
|  8    |    0.46     |    0.44      |     0.50      |       4        |        7        | Intense     |
|  9    |    0.40     |    0.52      |     0.60      |       4        |        8        | Very hard   |
| 10    |    0.34     |    0.60      |     0.70      |       5        |       10        | Hardest     |
| 11    |    0.72     |    0.18      |     0.20      |       2        |        3        | **RELIEF** ✦|

Relief levels (6, 11) reset to Level-3 feel — familiar enough to feel easy after the grind,
but not trivial enough to kill momentum.

---

### Add Row Algorithm

**`executeAddRow(board, cfg, dryPresses)`** in `addRowEngine.js`:

```
Input:  board state, levelConfig, consecutive dry presses (Add Row with 0 matches)
Output: { board: newBoard, val: injectedValue, wasRescue: bool }

1. RESCUE CHECK
   isRescue = (dryPresses >= 2)
   In rescue mode, candidate list is sorted by descending frequency
   (inject the most common value → most matchable).

2. BUILD CANDIDATE LIST (priority order):
   a. Straggler values — rows with exactly 1 active cell left.
      Injecting the same value creates an obvious match, clearing the orphan row.
   b. Isolated values — cells with no value-compatible partner anywhere on board.
      Injecting their value (duplicate) creates a new match opportunity.
   c. All unmatched values sorted by frequency
      (ascending = rarest first for normal mode; descending for rescue mode).
   d. Fill with 1–9 to guarantee at least 9 candidates.

3. TRY EACH CANDIDATE:
   - newBoard = board.concat([{v: candidate, m: false}])
   - if hasAnyMatch(newBoard): return {board: newBoard, val: candidate, wasRescue}

4. LAST RESORT (no candidate produced a match):
   - Inject value equal to the last unmatched cell on the board
   - Guarantees at least one matching pair exists
   - wasRescue = true
```

**`analyzeBoard(board)`** returns: `{ active, freq, stragglers, isolated }`
- `active`: indices of unmatched cells
- `freq`: value frequency map
- `stragglers`: values from rows with exactly 1 remaining active cell
- `isolated`: values with no value-compatible partner anywhere on board

---

### Match Engine (4-Check Pipeline)

**`canMatch(board, a, b)`** in `matchFinder.js`:

```
Step 1: Guard — a === b, or either cell is matched → false
Step 2: Value check — board[a].v === board[b].v  OR  board[a].v + board[b].v === 10
Step 3: Path checks (first passing wins):
  a) HORIZONTAL  — same row (Math.floor(i/COLS) equal), all cells between are matched
  b) VERTICAL    — same column (i%COLS equal), all column-cells between rows are matched
  c) DIAGONAL    — |rowDiff| === |colDiff| and dr≠0; all diagonal-step cells are matched
  d) WRAP/ZIPPER — flat reading-order range [lo+1, hi-1] all matched
```

**`findAllMatches(board)`** — returns all valid `[i,j]` pairs in reading order (i < j).  
**`hasAnyMatch(board)`** — early-exit scan; returns `true` if any pair exists.  
**`isBoardCleared(board)`** — `true` if every cell has `.m === true`.

The constant `COLS = 9` must be defined before `matchFinder.js` loads.

---

### Board Validation

**`validateBoard(board)`** in `boardValidator.js` checks:
1. Board has exactly 27 cells (3 × 9)
2. All cell values are in range 1–9
3. `hasAnyMatch(board)` is true — at least one playable move exists
4. `isBoardSolvable(board)` is true — greedy solver can clear the entire board

**`isBoardSolvable(board)`** in `solver.js`:  
Deep-clones the board, then repeatedly applies `findAllMatches()[0]` until no moves remain.
Returns `true` only if `isBoardCleared` is true afterward.

**`getBoardWithValidation(lvlIndex)`** in `boardValidator.js`:  
- Level 0: returns `generateLevel1Board()` directly (hand-crafted, always valid).
- Levels 1–10: calls `generateBoard(cfg, attempt)` and `validateBoard()` in a loop,
  up to `MAX_BOARD_ATTEMPTS = 20` retries with different derived seeds.
  Falls back to `generateLevel1Board()` if all attempts fail.

---

## Module Architecture

All modules are loaded as `<script src="...">` tags in `index.html` in this order:

| File                 | Exports / Purpose                                                      |
|----------------------|------------------------------------------------------------------------|
| `rng.js`             | `RNG(seed)` — deterministic XOR-shift RNG (no `Math.random`)          |
| `levelConfig.js`     | `LEVEL_CONFIG[]`, `getLevelConfig(idx)`, `isReliefLevel(idx)`          |
| `matchFinder.js`     | `canMatch(board,a,b)`, `findAllMatches(board)`, `hasAnyMatch(board)`, `isBoardCleared(board)` |
| `solver.js`          | `isBoardSolvable(board)` — greedy solver for validation                |
| `boardGenerator.js`  | `generateBoard(cfg, attempt)`, `generateLevel1Board()`                 |
| `boardValidator.js`  | `validateBoard(board)`, `getBoardWithValidation(lvlIndex)`             |
| `addRowEngine.js`    | `executeAddRow(board, cfg, dryPresses)`, `analyzeBoard(board)`, `buildCandidateList(board, isRescue)` |

**Adapter block** (inline `<script>` in `index.html` after `addRowEngine.js`):  
Wraps the 3-argument `matchFinder.js` functions into 2-argument versions that
automatically use the global `board` variable:
```javascript
canMatch      = function(a,b){ return _mfCanMatch(board,a,b); };
findAllMatches= function(){ return _mfFindAll(board); };
hasAnyMatch   = function(){ return _mfHasAny(board); };
allDone       = function(){ return _mfIsCleared(board); };
```

**Constants shared between modules and inline script:**
- `COLS = 9` — defined inline before `matchFinder.js` loads; used by `matchFinder.js`
- `C = 9`, `MAXAR = 6` — defined in inline game script; used by `addRowEngine.js`

---

## How to Run Tests

```bash
cd "web"
node tests.js
```

Tests cover: RNG determinism, board generation, match detection, solver correctness,
board validation, and add row candidate selection.

---

## How to Run Simulation

```bash
cd "web"
node simulate.js
```

Simulates all 11 levels, playing greedily (always takes the first available match,
uses Add Row when stuck). Reports completion rate, average Add Row uses, and
rescue mechanic trigger counts.

---

## Game Rules

- **Grid**: 9 columns, rows grow downward as cells are matched
- **Match Types**: Same number (5+5) OR pairs summing to 10 (3+7)
- **Match Directions**: Horizontal, Vertical, Diagonal, Wrap-around (reading-order zipper)
- **Adjacency**: Skips matched (crossed-out) cells when checking path
- **Win Condition**: All cells matched (board cleared)
- **Add Row**: Up to 6 uses per level. Smart injection — never random.
- **Hint**: Highlights first valid pair in reading order (auto-clears after 2.5s)
- **Confirmation**: If matches exist when Add Row is pressed, player is asked to confirm

---

## Project Structure

```
web/
├── index.html          — Single-page game UI + inline game logic
├── style.css           — (legacy, styles are inlined in index.html)
├── rng.js              — Deterministic RNG
├── levelConfig.js      — Sawtooth difficulty curve configuration
├── matchFinder.js      — 4-check match algorithm
├── solver.js           — Greedy solvability validator
├── boardGenerator.js   — Deterministic pair-first board builder
├── boardValidator.js   — Board validation + getBoardWithValidation()
├── addRowEngine.js     — Smart Add Row: straggler, rescue, rarest
├── engine.js           — (legacy engine, superseded by modules above)
├── game.js             — (legacy)
├── tests.js            — Node.js test suite
├── simulate.js         — Node.js level simulation
├── server.js           — Local dev server
└── vercel.json         — Vercel deployment config

android/
└── app/src/main/java/com/numbermatch/puzzle/
    ├── engine/
    │   ├── Cell.java, Board.java
    │   ├── SeededRandom.java
    │   ├── DifficultyConfig.java
    │   ├── BoardSeeder.java
    │   ├── AddRowEngine.java
    │   └── GameEngine.java
    └── ui/
        ├── GameActivity.java
        ├── GridView.java
        └── LevelSelectActivity.java
```

---

## Build / Run

### Web (play instantly)
Open `web/index.html` in any modern browser. No build step required.

### Local dev server
```bash
cd web
node server.js
# Open http://localhost:3000
```

### Deploy to Vercel
```bash
cd "E:\Desktop\Puzzle number game"
vercel --prod --yes --name number-match-puzzle
```

### Android
1. Open Android Studio → File → Open → select the `android/` folder
2. Wait for Gradle sync
3. Run on emulator or device

```bash
# Build APK
cd android
./gradlew assembleDebug
```

---

## Deliverables Checklist
- [x] Deterministic board generation (no `Math.random()`)
- [x] Sawtooth difficulty curve (11 levels with 2 relief levels)
- [x] Smart Add Row (straggler cleanup, rescue mechanic, rarest-value fallback)
- [x] Rescue mechanic (dryPresses ≥ 2 → most-frequent value injection)
- [x] Straggler cleanup (orphan rows cleared first)
- [x] 4-check match algorithm (horizontal, vertical, diagonal, wrap)
- [x] Board validation (solvability check before gameplay)
- [x] Modular JS engine (7 module files + adapter pattern)
- [x] 6 Add Row uses per level max
- [x] Hint system (reading-order first match)
- [x] Add Row confirmation dialog (when matches still exist)
- [x] Unit tests (`node tests.js`)
- [x] Level simulation (`node simulate.js`)
- [x] Android port (Java engine mirroring web logic)
