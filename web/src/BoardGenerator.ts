// BoardGenerator.ts - Deterministic Board Generation with Structural Difficulty (v4)
//
// Architecture:
//   Phase 1: Determine pair mix (immediate + buried + decoy count)
//   Phase 2: Place pairs strategically by distance target
//   Phase 3: Fill remaining with effective decoys (no accidental matches)
//   Phase 4: Validate with tight tolerance on multiple metrics
//
// Note: Cell interface, valuesMatch, canMatch, findAllMatches, hasAnyMatch
// are all declared in BoardAnalyzer.ts which compiles first.

interface BoardMetrics {
  solvable: boolean;
  immediateMatchRatio: number;   // fraction of active cells in an immediately reachable match
  avgMatchGap: number;           // mean index-distance between currently-matchable pairs
  buriedCount: number;           // pairs whose path is currently blocked
  accidentalDecoyMatches: number; // decoy cells that accidentally match each other
}

// ─── Pair Pools ───────────────────────────────────────────────────────────────
var SAME_VAL_PAIRS = [
  [1,1],[2,2],[3,3],[4,4],[5,5],[6,6],[7,7],[8,8],[9,9]
];
var SUM_TEN_PAIRS = [
  [1,9],[9,1],[2,8],[8,2],[3,7],[7,3],[4,6],[6,4]
];

// Complement helper (for decoy validation)
function complement(v: number): number {
  return v === 5 ? 5 : (10 - v);
}

// ─── Phase 1: Build pair pool ─────────────────────────────────────────────────
// Selects pairs according to frictionFactor (0 = all same-value, 1 = all sum-10)
function buildPairPool(pairCount: number, frictionFactor: number, rng: any): number[][] {
  var pairs: number[][] = [];
  // Always start with at least one guaranteed same-value pair so there's an obvious match
  pairs.push(SAME_VAL_PAIRS[rng.int(SAME_VAL_PAIRS.length)].slice());
  for (var p = 1; p < pairCount; p++) {
    var useSumTen = rng.bool(frictionFactor);
    if (useSumTen) {
      pairs.push(SUM_TEN_PAIRS[rng.int(SUM_TEN_PAIRS.length)].slice());
    } else {
      pairs.push(SAME_VAL_PAIRS[rng.int(SAME_VAL_PAIRS.length)].slice());
    }
  }
  return pairs;
}

// ─── Phase 2: Strategic pair placement ────────────────────────────────────────
// immediatePairs → short gap (minGap .. shortGapMax), clear path guaranteed
// buriedPairs    → long gap (longGapMin .. maxGap), at least one blocker slot between
function placePairsStrategically(
  immediatePairs: number[][],
  buriedPairs: number[][],
  minGap: number,
  maxGap: number,
  rng: any
): { slots: (number | null)[]; free: number[] } {
  var CELLS = 27;
  var slots: (number | null)[] = new Array(CELLS).fill(null);
  var free: number[] = [];
  for (var i = 0; i < CELLS; i++) free.push(i);

  function shuffleFree() { rng.shuffle(free); }

  // Helper: find two free slots with gap in [lo, hi]
  function placePairWithGap(pair: number[], gapLo: number, gapHi: number): boolean {
    shuffleFree();
    for (var ai = 0; ai < free.length; ai++) {
      var slotA = free[ai];
      for (var bi = 0; bi < free.length; bi++) {
        if (bi === ai) continue;
        var slotB = free[bi];
        var gap = Math.abs(slotA - slotB);
        if (gap >= gapLo && gap <= gapHi) {
          slots[slotA] = pair[0];
          slots[slotB] = pair[1];
          free.splice(free.indexOf(slotA), 1);
          free.splice(free.indexOf(slotB), 1);
          return true;
        }
      }
    }
    return false;
  }

  // Immediate pairs: short gap so the path between them is likely clear
  var shortGapMax = Math.max(minGap + 2, Math.floor(maxGap * 0.4));
  // First pair always at slots 0,1 to guarantee an initial match
  if (immediatePairs.length > 0) {
    var fp = immediatePairs[0];
    slots[0] = fp[0];
    slots[1] = fp[1];
    free.splice(free.indexOf(0), 1);
    free.splice(free.indexOf(1), 1);
    for (var p = 1; p < immediatePairs.length; p++) {
      if (!placePairWithGap(immediatePairs[p], minGap, shortGapMax)) {
        // fallback: any gap
        if (!placePairWithGap(immediatePairs[p], 1, maxGap)) {
          shuffleFree();
          if (free.length >= 2) {
            var fa = free.shift()!;
            var fb = free.shift()!;
            slots[fa] = immediatePairs[p][0];
            slots[fb] = immediatePairs[p][1];
          }
        }
      }
    }
  }

  // Buried pairs: long gap — harder to see and path is likely blocked by decoys
  var longGapMin = Math.max(minGap, Math.floor(maxGap * 0.5));
  for (var p = 0; p < buriedPairs.length; p++) {
    if (!placePairWithGap(buriedPairs[p], longGapMin, maxGap)) {
      // Fallback to any gap if long gap can't be satisfied
      if (!placePairWithGap(buriedPairs[p], minGap, maxGap)) {
        shuffleFree();
        if (free.length >= 2) {
          var fa2 = free.shift()!;
          var fb2 = free.shift()!;
          slots[fa2] = buriedPairs[p][0];
          slots[fb2] = buriedPairs[p][1];
        }
      }
    }
  }

  return { slots, free };
}

// ─── Phase 3: Effective decoy selection ───────────────────────────────────────
// A "true" decoy is a value where neither it NOR its complement appears in any pair.
// This ensures decoys don't accidentally create new matches.
function buildDecoyPool(pairVals: Set<number>, rng: any): number[] {
  var trulyIsolated: number[] = [];
  for (var v = 1; v <= 9; v++) {
    var comp = complement(v);
    if (!pairVals.has(v) && !pairVals.has(comp)) {
      trulyIsolated.push(v);
    }
  }
  if (trulyIsolated.length > 0) return trulyIsolated;

  // Partial isolation: value not in pairs (complement might be)
  var partialIsolated: number[] = [];
  for (var v2 = 1; v2 <= 9; v2++) {
    if (!pairVals.has(v2)) {
      partialIsolated.push(v2);
    }
  }
  if (partialIsolated.length > 0) return partialIsolated;

  // Last resort: least common values in pair pool
  return [5]; // 5+5=10 and 5=5, always some match possible, but rare
}

function pickDecoy(decoyPool: number[], usedDecoys: number[], rng: any): number {
  // Prefer a decoy that hasn't been used too much (avoid repetition)
  var freq: { [v: number]: number } = {};
  for (var d of usedDecoys) freq[d] = (freq[d] || 0) + 1;

  var minFreq = Infinity;
  for (var v of decoyPool) minFreq = Math.min(minFreq, freq[v] || 0);

  var candidates = decoyPool.filter(v => (freq[v] || 0) === minFreq);
  return candidates[rng.int(candidates.length)];
}

// ─── Phase 4: Multi-dimensional board metrics ─────────────────────────────────
function computeBoardMetrics(board: Cell[]): BoardMetrics {
  if (!isBoardSolvable(board)) {
    return { solvable: false, immediateMatchRatio: 0, avgMatchGap: 0, buriedCount: 0, accidentalDecoyMatches: 0 };
  }

  var allMatches = findAllMatches(board);
  var cellInMatch = new Set<number>();
  var gapSum = 0;

  for (var pair of allMatches) {
    cellInMatch.add(pair[0]);
    cellInMatch.add(pair[1]);
    gapSum += (pair[1] - pair[0]);
  }

  var activeCount = 0;
  var matchedCount = 0;
  for (var i = 0; i < board.length; i++) {
    if (!board[i].m) {
      activeCount++;
      if (cellInMatch.has(i)) matchedCount++;
    }
  }

  var immediateMatchRatio = activeCount > 0 ? (matchedCount / activeCount) : 0;
  var avgMatchGap = allMatches.length > 0 ? (gapSum / allMatches.length) : 0;

  // Count buried pairs: pairs where the path is currently blocked
  var buriedCount = 0;
  // A simple heuristic: cells with no immediate match are candidates for buried pairs
  // We count how many active cells are NOT in any match
  var buriedCells = activeCount - matchedCount;
  buriedCount = Math.floor(buriedCells / 2); // each buried pair contributes 2 cells

  // Count accidental decoy matches (matches between cells that weren't intended as pairs)
  // Approximated as total immediate matches minus the intended pair count
  var accidentalDecoyMatches = Math.max(0, allMatches.length - matchedCount / 2);

  return {
    solvable: true,
    immediateMatchRatio,
    avgMatchGap,
    buriedCount,
    accidentalDecoyMatches
  };
}

// ─── Main Board Generator ─────────────────────────────────────────────────────
function generateBoard(cfg: LevelConfig, attempt?: number): Cell[] {
  var seed = (cfg.seed + (attempt || 0) * 7919) >>> 0;

  var minGap         = cfg.minGap         || 1;
  var maxGap         = cfg.maxGap         || 10;
  var frictionFactor = cfg.frictionFactor || 0;
  var targetImmediate = cfg.targetImmediateRatio || 0.70;
  var targetAvgGap   = cfg.targetAvgGap   || 4;
  var buriedPairCount = cfg.buriedPairCount || 0;
  var tolerance      = cfg.strictMatchDensityTolerance || 0.15;

  // Calculate target pair counts from 27 active cells
  var totalCells = 27;
  var immediateTargetCells = Math.round(totalCells * targetImmediate);
  var immediatePairCount = Math.max(1, Math.round(immediateTargetCells / 2));
  var buriedPairCountFinal = Math.min(buriedPairCount, 4); // cap at 4 for solvability
  var totalPairs = immediatePairCount + buriedPairCountFinal;
  totalPairs = Math.min(13, totalPairs); // 13 pairs × 2 = 26, + 1 decoy = 27

  for (var searchAttempt = 0; searchAttempt < 50; searchAttempt++) {
    var searchSeed = (seed + searchAttempt * 997) >>> 0;
    var searchRng = new RNG(searchSeed);

    // Build pair pools
    var allPairs = buildPairPool(totalPairs, frictionFactor, searchRng);
    var immediates = allPairs.slice(0, immediatePairCount);
    var burieds    = allPairs.slice(immediatePairCount, immediatePairCount + buriedPairCountFinal);

    // Strategic placement
    var placement = placePairsStrategically(immediates, burieds, minGap, maxGap, searchRng);
    var slots = placement.slots;
    var freeSlots = placement.free;

    // Build decoy pool from pair values
    var pairValSet = new Set<number>();
    for (var pair of allPairs) { pairValSet.add(pair[0]); pairValSet.add(pair[1]); }
    var decoyPool = buildDecoyPool(pairValSet, searchRng);
    var usedDecoys: number[] = [];

    // Fill free slots with effective decoys
    for (var fi = 0; fi < freeSlots.length; fi++) {
      var d = pickDecoy(decoyPool, usedDecoys, searchRng);
      slots[freeSlots[fi]] = d;
      usedDecoys.push(d);
    }

    // Assemble board
    var vals: number[] = [];
    for (var i = 0; i < 27; i++) {
      vals.push(slots[i] !== null ? slots[i]! : searchRng.range(1, 9));
    }
    var board = vals.map(function(v) { return { v: v, m: false }; });

    // Quick checks
    if (!hasAnyMatch(board)) continue;
    if (!isBoardSolvable(board)) continue;

    // Compute multi-dimensional metrics
    var metrics = computeBoardMetrics(board);
    if (!metrics.solvable) continue;

    // Validate against targets with tight tolerance
    var immediateOk = Math.abs(metrics.immediateMatchRatio - targetImmediate) <= tolerance;
    var gapOk       = targetAvgGap <= 3
      ? metrics.avgMatchGap <= targetAvgGap + 3      // easy levels: gap should be SHORT
      : metrics.avgMatchGap >= targetAvgGap * 0.4;   // hard levels: gap should be LONG enough

    if (immediateOk && gapOk) {
      return board;
    }

    // Progressive tolerance relaxation after 30 attempts
    if (searchAttempt >= 30) {
      var looseTolerance = tolerance + 0.08;
      var looseImmediateOk = Math.abs(metrics.immediateMatchRatio - targetImmediate) <= looseTolerance;
      if (looseImmediateOk && metrics.solvable) {
        return board;
      }
    }
  }

  return generateFallbackBoard(cfg, seed);
}

// ─── Fallback Board ────────────────────────────────────────────────────────────
function generateFallbackBoard(cfg: LevelConfig, seed: number): Cell[] {
  var fbRng = new RNG((seed + 12345) >>> 0);
  var vals: number[] = [];
  var first = 5;
  for (var p = 0; p < 13; p++) {
    var v = fbRng.range(1, 9);
    if (p === 0) first = v;
    vals.push(v);
    vals.push(v);
  }
  vals.push(first);
  fbRng.shuffle(vals);

  var idxA = vals.indexOf(first);
  var idxB = vals.indexOf(first, idxA + 1);
  if (idxA >= 0 && idxB >= 0) {
    var tmp = vals[0]; vals[0] = vals[idxA]; vals[idxA] = tmp;
    var tmp2 = vals[1]; vals[1] = vals[idxB]; vals[idxB] = tmp2;
  }
  return vals.map(function(v) { return { v: v, m: false }; });
}

// ─── Level 1 Hand-crafted Templates ──────────────────────────────────────────
// Level 1 uses curated templates for a perfectly gentle onboarding experience
var LEVEL_1_TEMPLATES: number[][] = [
  [1, 1, 2, 2, 3, 3, 4, 4, 5],
  [2, 2, 3, 3, 4, 4, 5, 5, 1],
  [3, 3, 4, 4, 5, 5, 1, 1, 2],
  [4, 4, 5, 5, 1, 1, 2, 2, 3],
  [5, 5, 1, 1, 2, 2, 3, 3, 4],
];

function transformBoardValues(board: Cell[], rng: any): Cell[] {
  var pairs = [[1, 9], [2, 8], [3, 7], [4, 6]];
  rng.shuffle(pairs);

  var mapping: { [key: number]: number } = {};
  mapping[5] = 5;

  var originalPairs = [[1, 9], [2, 8], [3, 7], [4, 6]];
  for (var i = 0; i < pairs.length; i++) {
    var orig = originalPairs[i];
    var target = pairs[i];
    var swap = rng.bool(0.5);
    if (swap) {
      mapping[orig[0]] = target[1];
      mapping[orig[1]] = target[0];
    } else {
      mapping[orig[0]] = target[0];
      mapping[orig[1]] = target[1];
    }
  }

  return board.map(function(c) {
    return { v: mapping[c.v] || c.v, m: c.m };
  });
}

function transformBoardSpatial(board: Cell[], rng: any): Cell[] {
  var reverse = rng.bool(0.5);
  if (reverse) {
    return board.slice().reverse();
  }
  return board;
}

// Hand-crafted Level 1 board — guaranteed ultra-easy with adjacent pairs
function generateLevel1Board(seed?: number): Cell[] {
  var s = seed !== undefined ? seed : Math.floor(Math.random() * 1000000);
  var rng = new RNG(s);
  var template = LEVEL_1_TEMPLATES[rng.int(LEVEL_1_TEMPLATES.length)];
  var board = template.map(function(v) { return { v: v, m: false }; });
  board = transformBoardValues(board, rng);
  board = transformBoardSpatial(board, rng);
  return board;
}

// Legacy helper
function makeBoard(lvlIndex: number): Cell[] {
  return getBoardWithValidation(lvlIndex);
}

// Compatibility: expose evaluateBoard using new metrics
function evaluateBoard(board: Cell[], cfg: LevelConfig): { solvable: boolean; matchDensity: number; avgScanDist: number } {
  var m = computeBoardMetrics(board);
  return {
    solvable: m.solvable,
    matchDensity: m.immediateMatchRatio,
    avgScanDist: m.avgMatchGap
  };
}

// Global exports
(globalThis as any).evaluateBoard = evaluateBoard;
(globalThis as any).generateBoard = generateBoard;
(globalThis as any).generateLevel1Board = generateLevel1Board;
(globalThis as any).makeBoard = makeBoard;
(globalThis as any).transformBoardValues = transformBoardValues;
(globalThis as any).transformBoardSpatial = transformBoardSpatial;
(globalThis as any).computeBoardMetrics = computeBoardMetrics;
