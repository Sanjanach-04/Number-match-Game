'use strict';

// ── SeededRandom (LCG matching java.util.Random constants) ──────────────────
class SeededRandom {
  constructor(seed) {
    const M = 0x5DEECE66Dn, MASK = (1n << 48n) - 1n;
    this._s = (BigInt(seed) ^ M) & MASK;
  }
  _next(bits) {
    const M = 0x5DEECE66Dn, A = 0xBn, MASK = (1n << 48n) - 1n;
    this._s = (this._s * M + A) & MASK;
    return Number(this._s >> BigInt(48 - bits));
  }
  nextInt(bound) {
    if (bound <= 1) return 0;
    if ((bound & -bound) === bound) return Math.floor((bound * this._next(31)) / 0x80000000);
    let bits, val;
    do { bits = this._next(31); val = bits % bound; } while (bits - val + bound - 1 < 0);
    return val;
  }
  nextFloat() { return this._next(24) / (1 << 24); }
  nextBool(p) { return this.nextFloat() < p; }
  nextIntRange(min, max) { return min + this.nextInt(max - min + 1); }
  shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = this.nextInt(i + 1);
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
  }
}

// ── DifficultyConfig (sawtooth table) ───────────────────────────────────────
class DifficultyConfig {
  constructor(level, seed, matchDensity, decoyRatio, frictionFactor, idealAddRow, targetSecs) {
    Object.assign(this, { level, seed, matchDensity, decoyRatio, frictionFactor, idealAddRow, targetSecs, maxAddRowUses: 6 });
  }
  static forLevel(level) {
    // seed | matchDensity | decoyRatio | frictionFactor | idealAddRow | targetSecs
    // matchDensity: how many cells are part of a valid pair (1.0 = all paired)
    // decoyRatio:   fraction of Add Row numbers that have no match (0 = all helpers)
    // frictionFactor: controls sum-to-10 ratio (0 = all same-value = easy, 1 = hard)
    //
    // SAWTOOTH CURVE:
    //  L1  = very easy (almost all same-value adjacent pairs, zero decoys)
    //  L2-5 = steadily harder
    //  L6  = RELIEF (drops back to ~L3 feel)
    //  L7-10 = ramps higher than L5 peak
    //  L11 = RELIEF again
    const T = {
       1:[1000003, 0.95, 0.00, 0.00, 1,  30],  // trivially easy: ~all cells paired, no decoys
       2:[1000033, 0.85, 0.10, 0.10, 1,  45],  // still easy, tiny friction
       3:[1000037, 0.72, 0.22, 0.25, 2,  75],  // noticeable scan needed
       4:[1000039, 0.62, 0.35, 0.38, 2, 110],  // moderate
       5:[1000081, 0.52, 0.48, 0.50, 3, 150],  // hard — half decoys
       6:[1000099, 0.72, 0.22, 0.25, 2,  75],  // RELIEF ✦ (same as L3)
       7:[1000117, 0.58, 0.42, 0.48, 3, 120],  // ramp restarts harder than L4
       8:[1000121, 0.48, 0.54, 0.60, 4, 160],  // very hard
       9:[1000133, 0.42, 0.62, 0.70, 5, 190],  // intense
      10:[1000151, 0.36, 0.70, 0.82, 5, 220],  // peak difficulty
      11:[1000159, 0.72, 0.22, 0.25, 2,  75],  // RELIEF ✦ (same as L3/L6)
    };
    const row = T[level] || T[((level - 1) % 5) + 1] || T[5];
    return new DifficultyConfig(level, ...row);
  }
  static isRelief(level) { return level === 6 || level === 11; }
}

// ── Cell ─────────────────────────────────────────────────────────────────────
class Cell {
  constructor(value, row, col) {
    this.value = value; this.row = row; this.col = col; this.matched = false;
  }
  isActive()  { return !this.matched; }
  isMatched() { return  this.matched; }
  markMatched() { this.matched = true; }
  static canMatch(a, b) {
    if (!a || !b || !a.isActive() || !b.isActive() || a === b) return false;
    return a.value === b.value || a.value + b.value === 10;
  }
}

// ── Board ─────────────────────────────────────────────────────────────────────
class Board {
  constructor() { this.cells = []; this.rowCount = 0; }
  static get COLS() { return 9; }

  addRow(values) {
    const r = this.rowCount++;
    for (let c = 0; c < 9; c++) this.cells.push(new Cell(values[c], r, c));
  }

  getCell(row, col)      { return this.cells[row * 9 + col] || null; }
  getCellByIndex(i)      { return this.cells[i] || null; }
  indexOfCell(cell)      { return this.cells.indexOf(cell); }
  getCellCount()         { return this.cells.length; }
  getActiveCells()       { return this.cells.filter(c => c.isActive()); }
  getActiveValues()      { return this.getActiveCells().map(c => c.value); }
  isCleared()            { return this.cells.every(c => c.isMatched()); }
  activeCount()          { return this.cells.filter(c => c.isActive()).length; }

  _noActivesBetween(lo, hi) {
    for (let i = lo + 1; i < hi; i++) if (this.cells[i]?.isActive()) return false;
    return true;
  }
  _noActivesInCol(rA, rB, col) {
    for (let r = Math.min(rA,rB)+1; r < Math.max(rA,rB); r++)
      if (this.getCell(r, col)?.isActive()) return false;
    return true;
  }

  isValidMatch(a, b) {
    if (!Cell.canMatch(a, b)) return false;
    let iA = this.indexOfCell(a), iB = this.indexOfCell(b);
    if (iA < 0 || iB < 0 || iA === iB) return false;
    if (iA > iB) { [a,b]=[b,a]; [iA,iB]=[iB,iA]; }
    if (a.row === b.row) return this._noActivesBetween(iA, iB);
    if (a.col === b.col) return this._noActivesInCol(a.row, b.row, a.col);
    return this._noActivesBetween(iA, iB);  // wrap-around
  }

  tryMatch(a, b) {
    if (!this.isValidMatch(a, b)) return false;
    a.markMatched(); b.markMatched(); return true;
  }

  hasAnyValidMatch() {
    const ac = this.getActiveCells();
    for (let i = 0; i < ac.length; i++)
      for (let j = i+1; j < ac.length; j++)
        if (this.isValidMatch(ac[i], ac[j])) return true;
    return false;
  }

  findAllValidMatches() {
    const ac = this.getActiveCells(), res = [];
    for (let i = 0; i < ac.length; i++)
      for (let j = i+1; j < ac.length; j++)
        if (this.isValidMatch(ac[i], ac[j]))
          res.push([this.indexOfCell(ac[i]), this.indexOfCell(ac[j])]);
    return res;
  }

  getStragglerCells() {
    const res = [];
    for (let r = 0; r < this.rowCount; r++) {
      const active = [];
      for (let c = 0; c < 9; c++) { const cell = this.getCell(r,c); if (cell?.isActive()) active.push(cell); }
      if (active.length === 1) res.push(active[0]);
    }
    return res;
  }

  clone() {
    const copy = new Board();
    for (let r = 0; r < this.rowCount; r++) {
      copy.addRow(Array.from({length:9}, (_,c) => this.getCell(r,c).value));
    }
    for (let i = 0; i < this.cells.length; i++)
      if (this.cells[i].isMatched()) copy.cells[i].markMatched();
    return copy;
  }
}

// ── BoardSeeder (Part A) ─────────────────────────────────────────────────────
class BoardSeeder {
  static generate(level) {
    const cfg = DifficultyConfig.forLevel(level);
    // Level 1 gets a hand-crafted easy board
    if (level === 1) return BoardSeeder._easyBoard();

    let board, attempt = 0;
    do {
      board = BoardSeeder._build(cfg, new SeededRandom(cfg.seed + attempt * 7919));
      attempt++;
    } while (!BoardSeeder._isSolvable(board) && attempt <= 20);
    return BoardSeeder._isSolvable(board) ? board : BoardSeeder._trivial();
  }

  // Level 1: 9 same-value adjacent pairs + 9 singles that also form pairs
  // Every pair sits right next to each other — impossible to miss
  static _easyBoard() {
    // Row 0: pairs (1,1) (2,2) (3,3) (4,4) + one extra
    // Row 1: pairs (5,5) (6,6) (7,7) (8,8) + one extra
    // Row 2: pairs (9,9) (1,1) (2,2) (3,3) — last 3 wrap-aroundable
    const v = [
      1, 1, 2, 2, 3, 3, 4, 4, 5,
      5, 6, 6, 7, 7, 8, 8, 9, 9,
      1, 1, 2, 2, 3, 3, 4, 4, 5
    ];
    // Leave last value (5) as a straggler — teaches the player about Add Row
    const b = new Board();
    b.addRow(v.slice(0, 9));
    b.addRow(v.slice(9, 18));
    b.addRow(v.slice(18, 27));
    return b;
  }

  static _build(cfg, rng) {
    let pairCount = Math.max(3, Math.min(13, Math.floor(27 * cfg.matchDensity / 2)));
    // frictionFactor 0 → all same-value pairs (easy); 1 → all sum-to-10 (hard)
    let svr = Math.max(0.20, Math.min(0.95, 1.0 - cfg.frictionFactor * 0.80));

    const SAME  = [[1,1],[2,2],[3,3],[4,4],[5,5],[6,6],[7,7],[8,8],[9,9]];
    const SUM10 = [[1,9],[9,1],[2,8],[8,2],[3,7],[7,3],[4,6],[6,4],[5,5]];
    const pairs = Array.from({length: pairCount}, () => {
      const cat = rng.nextBool(svr) ? SAME : SUM10;
      return cat[rng.nextInt(cat.length)];
    });

    const values = [];
    for (const [a,b] of pairs) { if (values.length + 1 < 27) { values.push(a); values.push(b); } }
    while (values.length < 27) {
      let found = false;
      for (let t = 0; t < 10; t++) {
        const c = rng.nextIntRange(1, 9);
        if (!values.some(v => v === c || v + c === 10)) { values.push(c); found = true; break; }
      }
      if (!found) values.push(rng.nextIntRange(1, 9));
    }

    const [g0, g1] = pairs[0];
    rng.shuffle(values);
    values[0] = g0; values[1] = g1;

    const b = new Board();
    b.addRow(values.slice(0, 9)); b.addRow(values.slice(9, 18)); b.addRow(values.slice(18, 27));
    return b;
  }

  static _isSolvable(board) {
    const sim = board.clone();
    for (let pass = 0; pass < sim.activeCount() + 10; pass++) {
      const m = sim.findAllValidMatches();
      if (!m.length) break;
      sim.tryMatch(sim.getCellByIndex(m[0][0]), sim.getCellByIndex(m[0][1]));
    }
    return sim.isCleared();
  }

  static _trivial() {
    const v = [1,1,2,2,3,3,4,4,5,5,6,6,7,7,8,8,9,9,1,2,3,4,5,6,7,8,9];
    const b = new Board();
    b.addRow(v.slice(0,9)); b.addRow(v.slice(9,18)); b.addRow(v.slice(18,27));
    return b;
  }
}

// ── AddRowEngine (Part B) ────────────────────────────────────────────────────
class AddRowEngine {
  constructor(cfg) {
    this.cfg = cfg; this.maxUses = 6; this.uses = 0;
    this.dryPresses = 0; this._seed = cfg.seed + 99991;
  }
  get remainingUses() { return this.maxUses - this.uses; }
  get isExhausted()   { return this.uses >= this.maxUses; }
  get isRescueMode()  { return this.dryPresses >= 2; }
  notifyMatchMade()   { this.dryPresses = 0; }

  generateRow(board) {
    if (this.isExhausted) return null;
    this._seed += 31337 * (this.uses + 1);
    const rng = new SeededRandom(this._seed);
    this.uses++;
    const wasRescue = this.isRescueMode;
    const values = wasRescue ? this._rescue(board, rng) : this._smart(board, rng);
    if (wasRescue) this.dryPresses = 0;
    this.dryPresses++;
    return { values, wasRescue };
  }

  _complement(v) {
    if (this.cfg.frictionFactor > 0.5 && v !== 5) { const s = 10-v; if (s>=1&&s<=9) return s; }
    return v;
  }
  _helper(active, rng) {
    if (!active.length) return rng.nextIntRange(1,9);
    return this._complement(active[rng.nextInt(active.length)]);
  }
  _decoy(active, rng) {
    for (let t=0;t<10;t++) { const c=rng.nextIntRange(1,9); if (!active.some(v=>v===c||v+c===10)) return c; }
    return rng.nextIntRange(1,9);
  }

  _rescue(board, rng) {
    const row = new Array(9); let pos = 0;
    const av = board.getActiveValues();
    const freq = {}; for (const v of av) freq[v] = (freq[v]||0)+1;
    const pairs = [];
    for (const [v,c] of Object.entries(freq)) { if (c>=2 && pairs.length<2) pairs.push(Number(v)); }
    if (pairs.length < 2) pairs.push(...av.slice(0, 2-pairs.length).map(v=>v||1));
    for (const v of pairs.slice(0,2)) { if (pos+1<9) { row[pos++]=v; row[pos++]=this._complement(v); } }
    while (pos < 9) row[pos++] = rng.nextBool(0.70) ? this._helper(av, rng) : rng.nextIntRange(1,9);
    for (let i=8;i>4;i--) { const j=4+rng.nextInt(i-4+1); [row[i],row[j]]=[row[j],row[i]]; }
    return row;
  }

  _smart(board, rng) {
    const row = new Array(9); let pos = 0;
    const av = board.getActiveValues();
    const maxS = Math.max(1, Math.floor(3*(1-this.cfg.frictionFactor)));
    const stragglers = board.getStragglerCells();
    for (let i=0; i<Math.min(stragglers.length, maxS) && pos<9; i++) row[pos++] = this._complement(stragglers[i].value);
    const hTarget = Math.floor(9*(1-this.cfg.decoyRatio));
    while (pos < hTarget && pos < 9) row[pos++] = this._helper(av, rng);
    while (pos < 9) row[pos++] = this._decoy(av, rng);
    const ss = Math.min(stragglers.length > 0 ? 1 : 0, 8);
    for (let i=8;i>ss;i--) { const j=ss+rng.nextInt(i-ss+1); [row[i],row[j]]=[row[j],row[i]]; }
    return row;
  }
}

// ── GameEngine ───────────────────────────────────────────────────────────────
class GameEngine {
  constructor(level) {
    this.level        = level;
    this.config       = DifficultyConfig.forLevel(level);
    this.board        = BoardSeeder.generate(level);
    this.addRowEngine = new AddRowEngine(this.config);
    this.state        = 'PLAYING';
    this.selectedCell = null;
    this.matchCount   = 0;
    this.hintsLeft    = 3;  // 3 hints per level
  }

  onCellTapped(cellIndex) {
    if (this.state !== 'PLAYING') return { type: 'INVALID' };
    const tapped = this.board.getCellByIndex(cellIndex);
    if (!tapped?.isActive()) return { type: 'INVALID' };

    if (!this.selectedCell) {
      this.selectedCell = tapped;
      return { type: 'SELECTED', index: cellIndex };
    }
    if (this.selectedCell === tapped) {
      this.selectedCell = null;
      return { type: 'DESELECTED', index: cellIndex };
    }

    const a = this.selectedCell, b = tapped;
    const iA = this.board.indexOfCell(a), iB = this.board.indexOfCell(b);
    this.selectedCell = null;

    if (this.board.tryMatch(a, b)) {
      this.addRowEngine.notifyMatchMade();
      this.matchCount++;

      // Win condition
      if (this.board.isCleared()) {
        this.state = 'LEVEL_COMPLETE';
        return { type: 'MATCHED', indexA: iA, indexB: iB, levelComplete: true };
      }

      // No moves left after this match and no Add Rows remaining → game over
      if (!this.board.hasAnyValidMatch() && this.addRowEngine.isExhausted) {
        this.state = 'GAME_OVER';
        return { type: 'MATCHED', indexA: iA, indexB: iB, levelComplete: false, gameOver: true };
      }

      // No moves left but Add Rows still available → signal UI to nudge player
      if (!this.board.hasAnyValidMatch()) {
        return { type: 'MATCHED', indexA: iA, indexB: iB, levelComplete: false, noMoves: true };
      }

      return { type: 'MATCHED', indexA: iA, indexB: iB, levelComplete: false };
    }
    return { type: 'FAILED', indexA: iA, indexB: iB };
  }

  onAddRow() {
    if (this.state !== 'PLAYING' || this.addRowEngine.isExhausted)
      return { success: false };
    const res = this.addRowEngine.generateRow(this.board);
    if (!res) return { success: false };
    this.board.addRow(res.values);

    // Game over: used last Add Row and still no valid matches
    if (this.addRowEngine.isExhausted && !this.board.hasAnyValidMatch()) {
      this.state = 'GAME_OVER';
      return { success: true, values: res.values, wasRescue: res.wasRescue,
               remaining: 0, gameOver: true };
    }

    return { success: true, values: res.values, wasRescue: res.wasRescue,
             remaining: this.addRowEngine.remainingUses, gameOver: false };
  }

  /**
   * Hint: finds the hardest-to-spot valid match pair (largest index gap).
   */
  onHint() {
    if (this.hintsLeft <= 0) return { success: false, reason: 'no hints left' };
    if (this.state !== 'PLAYING') return { success: false, reason: 'not playing' };

    const matches = this.board.findAllValidMatches();
    if (!matches.length) return { success: false, reason: 'no valid matches' };

    let best = matches[0];
    let bestGap = Math.abs(best[1] - best[0]);
    for (const m of matches) {
      const gap = Math.abs(m[1] - m[0]);
      if (gap > bestGap) { bestGap = gap; best = m; }
    }

    this.hintsLeft--;
    return { success: true, indexA: best[0], indexB: best[1] };
  }

  get remainingAddRows() { return this.addRowEngine.remainingUses; }
  get isRescueMode()     { return this.addRowEngine.isRescueMode; }
}
