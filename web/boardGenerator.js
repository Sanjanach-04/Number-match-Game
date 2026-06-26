/**
 * boardGenerator.js
 * Deterministic board generation.
 *
 * Algorithm:
 * 1. Calculate pair count from matchDensity.
 * 2. Generate pairs (same-value or sum-to-10) deterministically from seed.
 * 3. Spread pairs by pairDistance — higher distance = harder to spot.
 * 4. Fill remaining slots with decoys (values with no board partner).
 * 5. Shuffle deterministically; guarantee positions [0,1] hold a valid pair.
 * 6. Board validated by boardValidator before use.
 */

/**
 * Build a flat 27-element board array for the given level config.
 * @param {Object} cfg  - levelConfig entry
 * @param {number} attempt - used to derive a variant seed if first attempt fails
 * @returns {Array} board cells [{v, m:false}]
 */
function generateBoard(cfg, attempt) {
  var seed = (cfg.seed + (attempt || 0) * 7919) >>> 0;
  var rng  = new RNG(seed);
  var TOTAL = 27; // 3 rows × 9 cols

  // Number of value-pairs to place
  var pairCount = Math.max(3, Math.min(13, Math.floor(TOTAL * cfg.matchDensity / 2)));

  // Pair catalogs
  var SAME_VAL = [[1,1],[2,2],[3,3],[4,4],[5,5],[6,6],[7,7],[8,8],[9,9]];
  var SUM_TEN  = [[1,9],[2,8],[3,7],[4,6],[5,5],[6,4],[7,3],[8,2],[9,1]];

  // hiddenMatches fraction → more sum-to-10 pairs (harder to spot)
  var hiddenRatio = Math.min(cfg.hiddenMatches || 0, 0.9);

  var vals = [], firstPair = null;
  for (var p = 0; p < pairCount && vals.length + 1 < TOTAL; p++) {
    var useHidden = rng.bool(hiddenRatio);
    var catalog   = useHidden ? SUM_TEN : SAME_VAL;
    var pair      = catalog[rng.int(catalog.length)];
    if (!firstPair) firstPair = pair.slice();
    vals.push(pair[0]); vals.push(pair[1]);
  }

  // Fill remaining with decoys — values that have no complement in current set
  var attempts = 0;
  while (vals.length < TOTAL) {
    var v = rng.range(1, 9), isDecoy = true;
    for (var k = 0; k < vals.length; k++) {
      if (vals[k] === v || vals[k] + v === 10) { isDecoy = false; break; }
    }
    vals.push((isDecoy || attempts > 8) ? v : rng.range(1, 9));
    attempts = isDecoy ? 0 : attempts + 1;
  }

  // Shuffle, then pin first pair to positions 0,1 (guaranteed immediate match)
  rng.shuffle(vals);
  if (firstPair) { vals[0] = firstPair[0]; vals[1] = firstPair[1]; }

  return vals.map(function (v) { return { v: v, m: false }; });
}

/** Level-1 hand-crafted board — all pairs adjacent, impossible to fail */
function generateLevel1Board() {
  var raw = [1,1,2,2,3,3,4,4,5, 5,6,6,7,7,8,8,9,9, 1,1,2,2,3,3,4,4,5];
  return raw.map(function (v) { return { v: v, m: false }; });
}
