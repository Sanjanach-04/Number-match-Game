/* engine.js - Number Match Game Engine */
log('engine.js start');

/* ── RNG (simple, no BigInt) ─────────────────────────────── */
function RNG(seed) {
  this.s = (seed & 0x7FFFFFFF) || 1;
}
RNG.prototype.next = function() {
  var s = this.s;
  s ^= s << 13; s ^= s >> 17; s ^= s << 5;
  this.s = s & 0x7FFFFFFF;
  return this.s;
};
RNG.prototype.int = function(n) { return n <= 0 ? 0 : Math.abs(this.next()) % n; };
RNG.prototype.bool = function(p) { return (Math.abs(this.next()) / 0x7FFFFFFF) < p; };
RNG.prototype.range = function(a, b) { return a + this.int(b - a + 1); };
RNG.prototype.shuffle = function(a) {
  for (var i = a.length - 1; i > 0; i--) {
    var j = this.int(i + 1), t = a[i]; a[i] = a[j]; a[j] = t;
  }
};

/* ── Difficulty table ────────────────────────────────────── */
var LEVELS = {
  1:  {seed:1003, md:0.95, dr:0.00, fr:0.00},
  2:  {seed:1033, md:0.85, dr:0.10, fr:0.10},
  3:  {seed:1037, md:0.72, dr:0.22, fr:0.25},
  4:  {seed:1039, md:0.62, dr:0.35, fr:0.38},
  5:  {seed:1081, md:0.52, dr:0.48, fr:0.50},
  6:  {seed:1099, md:0.72, dr:0.22, fr:0.25},
  7:  {seed:1117, md:0.58, dr:0.42, fr:0.48},
  8:  {seed:1121, md:0.48, dr:0.54, fr:0.60},
  9:  {seed:1133, md:0.42, dr:0.62, fr:0.70},
  10: {seed:1151, md:0.36, dr:0.70, fr:0.82},
  11: {seed:1159, md:0.72, dr:0.22, fr:0.25}
};
function getCfg(lvl) {
  return LEVELS[lvl] || LEVELS[((lvl-1)%5)+1];
}

/* ── Board ───────────────────────────────────────────────── */
function Board() { this.cells = []; this.rows = 0; }
Board.prototype.addRow = function(vals) {
  var r = this.rows++;
  for (var c = 0; c < 9; c++) {
    this.cells.push({v: vals[c], r: r, c: c, m: false});
  }
};
Board.prototype.cell = function(r, c) { return this.cells[r*9+c] || null; };
Board.prototype.byIdx = function(i) { return this.cells[i] || null; };
Board.prototype.indexOf = function(cell) { return this.cells.indexOf(cell); };
Board.prototype.active = function() {
  var out = [];
  for (var i = 0; i < this.cells.length; i++) if (!this.cells[i].m) out.push(this.cells[i]);
  return out;
};
Board.prototype.cleared = function() {
  for (var i = 0; i < this.cells.length; i++) if (!this.cells[i].m) return false;
  return true;
};

Board.prototype._nab = function(lo, hi) {  // no active between lo..hi
  for (var i = lo+1; i < hi; i++) { var c = this.cells[i]; if (c && !c.m) return false; }
  return true;
};
Board.prototype._nac = function(rA, rB, col) {  // no active in column
  var mn = Math.min(rA,rB), mx = Math.max(rA,rB);
  for (var r = mn+1; r < mx; r++) { var c = this.cell(r,col); if (c && !c.m) return false; }
  return true;
};

Board.prototype.canMatch = function(a, b) {
  if (!a || !b || a.m || b.m || a === b) return false;
  if (a.v !== b.v && a.v + b.v !== 10) return false;
  var iA = this.indexOf(a), iB = this.indexOf(b);
  if (iA < 0 || iB < 0) return false;
  if (iA > iB) { var tmp=a; a=b; b=tmp; var ti=iA; iA=iB; iB=ti; }

  var dr = b.r - a.r;          // always >= 0 after swap
  var dcAbs = Math.abs(b.c - a.c);

  // 1. Horizontal: same row, no active cell between them
  if (dr === 0) return this._nab(iA, iB);

  // 2. Vertical: same column, no active cell between in column
  if (dcAbs === 0) return this._nac(a.r, b.r, a.c);

  // 3. True diagonal: adjacent rows (dr=1), adjacent cols (dcAbs=1)
  if (dr === 1 && dcAbs === 1) return true;

  // 4. Wrap-around: end of row N matches start of row N+1
  //    i.e. a is at col 8, b is at col 0 of next row,
  //    with nothing active between them in the flat array
  if (dr === 1 && a.c === 8 && b.c === 0) return this._nab(iA, iB);

  // 5. Extended wrap-around: last active of row N to first active of row N+1
  //    (when some cells in between are already matched)
  if (dr >= 1) return this._nab(iA, iB);

  return false;
};

Board.prototype.tryMatch = function(a, b) {
  if (!this.canMatch(a, b)) return false;
  a.m = true; b.m = true; return true;
};

Board.prototype.hasMatch = function() {
  var ac = this.active();
  for (var i = 0; i < ac.length; i++)
    for (var j = i+1; j < ac.length; j++)
      if (this.canMatch(ac[i], ac[j])) return true;
  return false;
};

Board.prototype.allMatches = function() {
  var ac = this.active(), res = [];
  for (var i = 0; i < ac.length; i++)
    for (var j = i+1; j < ac.length; j++)
      if (this.canMatch(ac[i], ac[j]))
        res.push([this.indexOf(ac[i]), this.indexOf(ac[j])]);
  return res;
};

Board.prototype.stragglers = function() {
  var res = [];
  for (var r = 0; r < this.rows; r++) {
    var a = [];
    for (var c = 0; c < 9; c++) { var cell = this.cell(r,c); if (cell && !cell.m) a.push(cell); }
    if (a.length === 1) res.push(a[0]);
  }
  return res;
};

/* ── Board seeder ────────────────────────────────────────── */
function seedBoard(lvl) {
  var b = new Board();
  if (lvl === 1) {
    b.addRow([1,1,2,2,3,3,4,4,5]);
    b.addRow([5,6,6,7,7,8,8,9,9]);
    b.addRow([1,1,2,2,3,3,4,4,5]);
    return b;
  }
  var cfg = getCfg(lvl), rng = new RNG(cfg.seed);
  var SAME  = [[1,1],[2,2],[3,3],[4,4],[5,5],[6,6],[7,7],[8,8],[9,9]];
  var SUM10 = [[1,9],[9,1],[2,8],[8,2],[3,7],[7,3],[4,6],[6,4],[5,5]];
  var pairCount = Math.max(3, Math.min(13, Math.floor(27 * cfg.md / 2)));
  var svr = Math.max(0.2, Math.min(0.95, 1.0 - cfg.fr * 0.8));
  var vals = [];
  for (var p = 0; p < pairCount && vals.length + 1 < 27; p++) {
    var pair = rng.bool(svr) ? SAME[rng.int(9)] : SUM10[rng.int(9)];
    vals.push(pair[0]); vals.push(pair[1]);
  }
  while (vals.length < 27) {
    var v = rng.range(1,9), ok = true;
    for (var k = 0; k < vals.length; k++) if (vals[k]===v || vals[k]+v===10) { ok=false; break; }
    vals.push(ok ? v : rng.range(1,9));
  }
  var g0=vals[0], g1=vals[1];
  rng.shuffle(vals); vals[0]=g0; vals[1]=g1;
  b.addRow(vals.slice(0,9)); b.addRow(vals.slice(9,18)); b.addRow(vals.slice(18,27));
  return b;
}

/* ── Add Row engine ──────────────────────────────────────── */
function AddEng(lvl) {
  var cfg = getCfg(lvl);
  this.cfg = cfg; this.maxU = 6; this.uses = 0; this.dry = 0;
  this.seed = cfg.seed + 99991;
}
Object.defineProperties(AddEng.prototype, {
  rem: {get: function(){return this.maxU - this.uses}},
  exh: {get: function(){return this.uses >= this.maxU}},
  rescue: {get: function(){return this.dry >= 2}}
});
AddEng.prototype.notifyMatch = function() { this.dry = 0; };
AddEng.prototype.genRow = function(board) {
  if (this.exh) return null;
  this.seed = Math.abs((this.seed * 1664525 + 1013904223)|0);
  var rng = new RNG(this.seed), cfg = this.cfg;
  this.uses++;
  var wasR = this.rescue;
  var av = board.active().map(function(c){return c.v;});

  function comp(v) {
    if (cfg.fr > 0.5 && v !== 5) { var s=10-v; if(s>=1&&s<=9) return s; }
    return v;
  }
  function helper() { return av.length ? comp(av[rng.int(av.length)]) : rng.range(1,9); }
  function decoy() {
    for (var t=0; t<10; t++) {
      var v=rng.range(1,9), ok=true;
      for (var k=0;k<av.length;k++) if(av[k]===v||av[k]+v===10){ok=false;break;}
      if(ok) return v;
    }
    return rng.range(1,9);
  }

  var row = [];
  if (wasR) {
    var freq={}, pairs=[];
    for(var i=0;i<av.length;i++) freq[av[i]]=(freq[av[i]]||0)+1;
    for(var v in freq) if(freq[v]>=2&&pairs.length<2) pairs.push(+v);
    if(!pairs.length) pairs.push(av[0]||1);
    if(pairs.length<2) pairs.push(pairs[0]);
    for(var pi=0;pi<2&&row.length+1<9;pi++){row.push(pairs[pi]);row.push(comp(pairs[pi]));}
    while(row.length<9) row.push(rng.bool(0.7)?helper():rng.range(1,9));
    for(var i=8;i>4;i--){var j=4+rng.int(i-3);var t=row[i];row[i]=row[j];row[j]=t;}
    this.dry = 0;
  } else {
    var sg = board.stragglers(), maxS = Math.max(1,Math.floor(3*(1-cfg.fr)));
    for(var i=0;i<Math.min(sg.length,maxS)&&row.length<9;i++) row.push(comp(sg[i].v));
    var hT = Math.floor(9*(1-cfg.dr));
    while(row.length<hT&&row.length<9) row.push(helper());
    while(row.length<9) row.push(decoy());
    var ss = sg.length>0?1:0;
    for(var i=8;i>ss;i--){var j=ss+rng.int(i-ss+1);var t=row[i];row[i]=row[j];row[j]=t;}
  }
  this.dry++;
  return {vals: row, wasRescue: wasR};
};

log('engine.js OK');
