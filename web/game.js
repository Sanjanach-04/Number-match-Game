/* game.js — Number Match UI */

var G = {
  board: null, addE: null, level: 1,
  sel: -1, matches: 0, hints: 3,
  hintOn: false, hintIdxs: [],
  autoTid: null, toastTid: null
};
var AUTO_MS = 2600;

/* ── helpers ─────────────────────────────────────────────── */
function ge(id) { return document.getElementById(id); }

function showScr(id) {
  var ids = ['sLS', 'sG'];
  for (var i = 0; i < ids.length; i++) {
    var el = ge(ids[i]);
    if (el) { el.classList.remove('show'); }
  }
  var el = ge(id);
  if (el) el.classList.add('show');
}

function showOv(id) { var el = ge(id); if (el) el.style.display = 'flex'; }
function hideOv(id) { var el = ge(id); if (el) el.style.display = 'none'; }
function hideAllOv() { hideOv('oW'); hideOv('oO'); }

/* ── level select ────────────────────────────────────────── */
function buildLevels() {
  var g = ge('lgrid');
  if (!g) return;
  g.innerHTML = '';
  for (var lvl = 1; lvl <= 11; lvl++) {
    var btn = document.createElement('button');
    btn.className = 'lb' + (isRelief(lvl) ? ' relief' : '');
    btn.innerHTML = (isRelief(lvl) ? '<span class="le">EASY</span>' : '') +
                    '<span class="ln">' + lvl + '</span>';
    btn.setAttribute('data-l', lvl);
    btn.addEventListener('click', function () {
      startGame(parseInt(this.getAttribute('data-l'), 10));
    });
    g.appendChild(btn);
  }
}

/* ── game start ──────────────────────────────────────────── */
function startGame(lvl) {
  if (G.autoTid) { clearTimeout(G.autoTid); G.autoTid = null; }
  G.level = lvl; G.sel = -1; G.matches = 0;
  G.hints = 3; G.hintOn = false; G.hintIdxs = [];
  G.board = seedBoard(lvl);
  G.addE  = new AddEng(lvl);
  var el = ge('lLv'); if (el) el.textContent = 'Level ' + lvl;
  setHintLocked(true);
  updateBadges();
  hideToast();
  hideAllOv();
  renderGrid();
  showScr('sG');
  var sa = ge('sa'); if (sa) sa.scrollTop = 0;
}

function goMenu() {
  if (G.autoTid) { clearTimeout(G.autoTid); G.autoTid = null; }
  hideAllOv();
  showScr('sLS');
}
function restart() { startGame(G.level); }

/* ── hint lock ───────────────────────────────────────────── */
function setHintLocked(locked) {
  G.hintOn = !locked;
  var els = [ge('bH'), ge('bHf')];
  for (var i = 0; i < els.length; i++) {
    var el = els[i]; if (!el) continue;
    if (locked) { el.classList.add('hl'); el.classList.remove('hv'); }
    else        { el.classList.remove('hl'); el.classList.add('hv'); }
  }
}
function unlockHint() { if (!G.hintOn) setHintLocked(false); }

/* ── grid render ─────────────────────────────────────────── */
function renderGrid() {
  var g = ge('grid'); if (!g || !G.board) return;
  g.innerHTML = '';
  for (var i = 0; i < G.board.cells.length; i++) g.appendChild(makeCell(i));
}

function makeCell(i) {
  var cell = G.board.cells[i];
  var el = document.createElement('div');
  el.className = cell.m ? 'cell cm' : 'cell';
  el.dataset.i = i;
  el.textContent = cell.m ? '' : cell.v;
  el.addEventListener('click', (function (idx) { return function () { onTap(idx); }; })(i));
  return el;
}

function cEl(i) { var g = ge('grid'); return g ? g.querySelector('[data-i="' + i + '"]') : null; }

function refreshCell(i) {
  var el = cEl(i); if (!el) return;
  var c = G.board.cells[i];
  el.className = c.m ? 'cell cm' : 'cell';
  el.textContent = c.m ? '' : c.v;
}

function appendRow(ri) {
  var g = ge('grid'); if (!g) return;
  var start = ri * 9;
  for (var i = start; i < start + 9; i++) {
    var el = makeCell(i); el.classList.add('cn'); g.appendChild(el);
  }
}

/* ── tap ─────────────────────────────────────────────────── */
function onTap(i) {
  var cell = G.board.cells[i];
  if (!cell || cell.m) return;
  clearHints();

  if (G.sel < 0) {
    G.sel = i;
    var el = cEl(i); if (el) el.classList.add('cs');
    return;
  }
  if (G.sel === i) {
    var el = cEl(i); if (el) el.classList.remove('cs');
    G.sel = -1; return;
  }

  var a = G.board.cells[G.sel], b = cell;
  var iA = G.sel, iB = i; G.sel = -1;

  if (G.board.tryMatch(a, b)) {
    G.addE.notifyMatch(); G.matches++;
    updateBadges();
    var eA = cEl(iA), eB = cEl(iB);
    if (eA) { eA.classList.remove('cs'); eA.classList.add('cf'); }
    if (eB) { eB.classList.remove('cs'); eB.classList.add('cf'); }
    setTimeout(function () {
      refreshCell(iA); refreshCell(iB);
      if (G.board.cleared())                                   { showWin();  return; }
      if (!G.board.hasMatch() && G.addE.exh)                   { showOver(); return; }
      if (!G.board.hasMatch()) { showToast('No moves — tap + Add Row!', 3000); unlockHint(); }
    }, 400);
  } else {
    var eA = cEl(iA), eB = cEl(iB);
    if (eA) { eA.classList.remove('cs'); eA.classList.add('ck'); eA.addEventListener('animationend', function () { eA.classList.remove('ck'); }, { once: true }); }
    if (eB) { eB.classList.add('ck'); eB.addEventListener('animationend', function () { eB.classList.remove('ck'); }, { once: true }); }
    unlockHint();
  }
}

/* ── hint ────────────────────────────────────────────────── */
function doHint() {
  if (!G.hintOn || G.hints <= 0) return;
  var ms = G.board.allMatches();
  if (!ms.length) { showToast('No matches — try Add Row', 2200); return; }
  var best = ms[0], bg = Math.abs(best[1] - best[0]);
  for (var i = 1; i < ms.length; i++) { var g = Math.abs(ms[i][1] - ms[i][0]); if (g > bg) { bg = g; best = ms[i]; } }
  G.hints--; updateBadges(); clearHints();
  G.hintIdxs = [best[0], best[1]];
  var eA = cEl(best[0]), eB = cEl(best[1]);
  if (eA) eA.classList.add('pha');
  if (eB) eB.classList.add('phb');
  setTimeout(clearHints, 2200);
  if (eA) eA.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}
function clearHints() {
  for (var i = 0; i < G.hintIdxs.length; i++) {
    var el = cEl(G.hintIdxs[i]);
    if (el) { el.classList.remove('pha'); el.classList.remove('phb'); }
  }
  G.hintIdxs = [];
}

/* ── add row ─────────────────────────────────────────────── */
function doAdd() {
  if (G.addE.exh) { showToast('No Add Row uses left!', 2500); return; }
  var res = G.addE.genRow(G.board);
  if (!res) { showToast('No Add Row uses left!', 2500); return; }
  G.board.addRow(res.vals);
  appendRow(G.board.rows - 1);
  updateBadges(); unlockHint();
  var sa = ge('sa'); setTimeout(function () { if (sa) sa.scrollTop = sa.scrollHeight; }, 60);
  if (G.addE.exh && !G.board.hasMatch()) setTimeout(showOver, 700);
}

/* ── badges ──────────────────────────────────────────────── */
function updateBadges() {
  var lRow = ge('lRow'), lMt = ge('lMt'), hC = ge('hC');
  var bAdd = ge('bAdd'), bH = ge('bH'), bHf = ge('bHf');
  if (lRow) lRow.innerHTML = '+Row <b>' + G.addE.rem + '</b>';
  if (lMt)  lMt.innerHTML  = '&#10003; <b>' + G.matches + '</b>';
  if (hC)   hC.textContent  = G.hints;
  if (bAdd) bAdd.disabled   = G.addE.exh;
  if (bH)   bH.disabled     = G.hints <= 0;
  if (bHf)  bHf.disabled    = G.hints <= 0;
}

/* ── toast ───────────────────────────────────────────────── */
function showToast(msg, ms) {
  if (G.toastTid) clearTimeout(G.toastTid);
  var t = ge('toast'); if (!t) return;
  t.textContent = msg; t.style.display = 'block';
  G.toastTid = setTimeout(hideToast, ms || 2500);
}
function hideToast() {
  if (G.toastTid) clearTimeout(G.toastTid);
  var t = ge('toast'); if (t) t.style.display = 'none';
}

/* ── win overlay ─────────────────────────────────────────── */
function showWin() {
  var next = G.level + 1, isLast = next > 11;
  var oWc = ge('oWc'); if (!oWc) return;
  oWc.innerHTML =
    '<div class="ws">&#11088;&#11088;&#11088;</div>' +
    '<h2>Level Complete!</h2>' +
    '<p>' + (isLast ? '&#127942; You beat all 11 levels!' : 'Next up: Level ' + next) + '</p>' +
    '<div class="cd"><div id="cdf" class="cdf"></div></div>' +
    (isLast ? '' : '<button class="bp" id="bNxt">Level ' + next + ' &#8594;</button>') +
    '<button class="bg" id="bWM">Menu</button>';
  showOv('oW');
  var bNxt = ge('bNxt');
  if (bNxt) bNxt.onclick = function () { hideOv('oW'); if (G.autoTid) { clearTimeout(G.autoTid); G.autoTid = null; } startGame(next); };
  var bWM = ge('bWM');
  if (bWM) bWM.onclick = function () { hideOv('oW'); if (G.autoTid) { clearTimeout(G.autoTid); G.autoTid = null; } goMenu(); };
  if (!isLast) {
    var cdf = ge('cdf');
    if (cdf) { cdf.style.animation = 'none'; void cdf.offsetWidth; cdf.style.animation = 'cds ' + AUTO_MS + 'ms linear forwards'; }
    G.autoTid = setTimeout(function () { hideOv('oW'); startGame(next); }, AUTO_MS);
  }
}

/* ── game over overlay ───────────────────────────────────── */
function showOver() {
  var oOc = ge('oOc'); if (!oOc) return;
  oOc.innerHTML =
    '<div class="oe">&#128531;</div>' +
    '<h2>Out of Moves</h2>' +
    '<p>All Add Row attempts used. Try again!</p>' +
    '<button class="bp" id="bRty">Try Again</button>' +
    '<button class="bg" id="bOM">Menu</button>';
  showOv('oO');
  var bRty = ge('bRty'); if (bRty) bRty.onclick = function () { hideOv('oO'); startGame(G.level); };
  var bOM  = ge('bOM');  if (bOM)  bOM.onclick  = function () { hideOv('oO'); goMenu(); };
}

/* ── boot ────────────────────────────────────────────────── */
buildLevels();
