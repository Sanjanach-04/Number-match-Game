'use strict';

// ── DOM ───────────────────────────────────────────────────────────────────────
const $ = id => document.getElementById(id);
const screenLS    = $('screenLS');
const screenGame  = $('screenGame');
const levelGrid   = $('levelGrid');
const lblLevel    = $('lblLevel');
const lblAddRow   = $('lblAddRow');
const lblMatched  = $('lblMatched');
const toast       = $('toast');
const gridEl      = $('grid');
const scrollArea  = $('scrollArea');
const btnBack     = $('btnBack');
const btnAdd      = $('btnAdd');
const btnRestart  = $('btnRestart');
const btnHint     = $('btnHint');
const btnHintFoot = $('btnHintFoot');
const hintCount   = $('hintCount');
const overlayWin  = $('overlayWin');
const overlayOver = $('overlayOver');
const winMsg      = $('winMsg');
const cbar        = $('cbar');
const btnNext     = $('btnNext');
const btnWinMenu  = $('btnWinMenu');
const btnRetry    = $('btnRetry');
const btnOverMenu = $('btnOverMenu');

// ── State ─────────────────────────────────────────────────────────────────────
let engine        = null;
let currentLevel  = 1;
let toastTid      = null;
let hintUnlocked  = false;
let hintIdxs      = [];
let autoTid       = null;

const AUTO_MS = 2600;

// ── Screen ────────────────────────────────────────────────────────────────────
function showScreen(s) {
  [screenLS, screenGame].forEach(el => el.classList.remove('active'));
  s.classList.add('active');
}

// ── Level select ──────────────────────────────────────────────────────────────
function buildLS() {
  levelGrid.innerHTML = '';
  for (let lvl = 1; lvl <= 11; lvl++) {
    const relief = DifficultyConfig.isRelief(lvl);
    const btn = document.createElement('button');
    btn.className = 'lvl-btn' + (relief ? ' relief' : '');
    btn.innerHTML = `${relief ? '<span class="lvl-easy">EASY</span>' : ''}<span class="lvl-n">${lvl}</span>`;
    btn.onclick = () => startGame(lvl);
    levelGrid.appendChild(btn);
  }
}

// ── Game init ─────────────────────────────────────────────────────────────────
function startGame(level) {
  currentLevel = level;
  engine = new GameEngine(level);
  hintUnlocked = false;
  hintIdxs = [];

  lblLevel.textContent = `Level ${level}`;
  hideOverlays();
  hideToast();
  lockHint();
  updateBadges();
  renderGrid();
  showScreen(screenGame);
  scrollArea.scrollTop = 0;
}

// ── Hint lock / unlock ────────────────────────────────────────────────────────
function lockHint() {
  hintUnlocked = false;
  [btnHint, btnHintFoot].forEach(b => {
    b.classList.add('hint-hidden');
    b.classList.remove('hint-visible');
  });
}
function unlockHint() {
  if (hintUnlocked) return;
  hintUnlocked = true;
  [btnHint, btnHintFoot].forEach(b => {
    b.classList.remove('hint-hidden');
    b.classList.add('hint-visible');
  });
}

// ── Grid ──────────────────────────────────────────────────────────────────────
function renderGrid() {
  gridEl.innerHTML = '';
  for (let i = 0; i < engine.board.getCellCount(); i++)
    gridEl.appendChild(makeCellEl(i));
}

function makeCellEl(idx) {
  const cell = engine.board.getCellByIndex(idx);
  const el = document.createElement('div');
  el.className = 'cell' + (cell.isMatched() ? ' matched' : '');
  el.dataset.idx = idx;
  el.textContent = cell.isMatched() ? '' : cell.value;
  el.addEventListener('click', () => onCellClick(idx));
  return el;
}

function cEl(idx) { return gridEl.querySelector(`[data-idx="${idx}"]`); }

function refreshCell(idx) {
  const el = cEl(idx); if (!el) return;
  const cell = engine.board.getCellByIndex(idx);
  el.className = 'cell' + (cell.isMatched() ? ' matched' : '');
  el.textContent = cell.isMatched() ? '' : cell.value;
}

function appendRow(rowIdx, animate) {
  const start = rowIdx * 9;
  for (let i = start; i < start + 9; i++) {
    const el = makeCellEl(i);
    if (animate) el.classList.add('new-row');
    gridEl.appendChild(el);
  }
}

// ── Hint highlight ────────────────────────────────────────────────────────────
function showHintHL(iA, iB) {
  clearHintHL();
  hintIdxs = [iA, iB];
  cEl(iA)?.classList.add('hint-a');
  cEl(iB)?.classList.add('hint-b');
  setTimeout(clearHintHL, 2200);
  cEl(iA)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}
function clearHintHL() {
  hintIdxs.forEach(i => { cEl(i)?.classList.remove('hint-a', 'hint-b'); });
  hintIdxs = [];
}

// ── Cell click ────────────────────────────────────────────────────────────────
function onCellClick(idx) {
  if (!engine || engine.state !== 'PLAYING') return;
  clearHintHL();

  const r = engine.onCellTapped(idx);

  switch (r.type) {
    case 'SELECTED':
      // Only highlight the tapped cell — no possible moves shown
      gridEl.querySelectorAll('.selected').forEach(e => e.classList.remove('selected'));
      cEl(idx)?.classList.add('selected');
      break;

    case 'DESELECTED':
      cEl(idx)?.classList.remove('selected');
      break;

    case 'MATCHED':
      updateBadges();
      [r.indexA, r.indexB].forEach(i => {
        const e = cEl(i); if (!e) return;
        e.classList.remove('selected');
        e.classList.add('flash-ok');
      });
      setTimeout(() => {
        refreshCell(r.indexA);
        refreshCell(r.indexB);
        if (r.levelComplete)   showWin();
        else if (r.gameOver)   showOver();
        else if (r.noMoves)  { showToast('No moves left — tap + Add Row!', 3000); unlockHint(); }
      }, 400);
      break;

    case 'FAILED':
      gridEl.querySelectorAll('.selected').forEach(e => e.classList.remove('selected'));
      [r.indexA, r.indexB].forEach(i => {
        const e = cEl(i); if (!e) return;
        e.classList.add('shake');
        e.addEventListener('animationend', () => e.classList.remove('shake'), { once: true });
      });
      unlockHint();
      break;
  }
}

// ── Hint ──────────────────────────────────────────────────────────────────────
function onHint() {
  if (!engine || engine.state !== 'PLAYING' || !hintUnlocked) return;
  const r = engine.onHint();
  if (!r.success) {
    showToast(r.reason === 'no hints left' ? 'No hints left!' : 'No matches — try Add Row', 2200);
    return;
  }
  updateBadges();
  showHintHL(r.indexA, r.indexB);
}
btnHint.addEventListener('click', onHint);
btnHintFoot.addEventListener('click', onHint);

// ── Add Row ───────────────────────────────────────────────────────────────────
btnAdd.addEventListener('click', () => {
  if (!engine || engine.state !== 'PLAYING') return;
  clearHintHL();
  const r = engine.onAddRow();
  if (!r.success) { showToast('No Add Row uses remaining!', 2500); return; }
  appendRow(engine.board.rowCount - 1, true);
  updateBadges();
  unlockHint();
  setTimeout(() => { scrollArea.scrollTop = scrollArea.scrollHeight; }, 60);
  if (r.gameOver) setTimeout(showOver, 700);
});

// ── Badges ────────────────────────────────────────────────────────────────────
function updateBadges() {
  const ar = engine.remainingAddRows;
  lblAddRow.innerHTML = `+Row <b>${ar}</b>`;
  btnAdd.disabled = ar <= 0 || engine.state !== 'PLAYING';
  lblMatched.innerHTML = `✓ <b>${engine.matchCount}</b>`;
  const hl = engine.hintsLeft;
  hintCount.textContent = hl;
  btnHint.disabled = btnHintFoot.disabled = hl <= 0;
}

// ── Toast ─────────────────────────────────────────────────────────────────────
function showToast(msg, ms) {
  if (toastTid) clearTimeout(toastTid);
  toast.textContent = msg;
  toast.classList.remove('hidden');
  toastTid = setTimeout(hideToast, ms || 2500);
}
function hideToast() {
  if (toastTid) clearTimeout(toastTid);
  toast.classList.add('hidden');
}

// ── Win / Over overlays ───────────────────────────────────────────────────────
function showWin() {
  const next = currentLevel + 1, isLast = next > 11;
  winMsg.textContent = isLast ? '🏆 You beat all 11 levels!' : `Next up: Level ${next}`;
  btnNext.style.display = isLast ? 'none' : '';
  btnNext.textContent   = `Level ${next} →`;
  overlayWin.classList.remove('hidden');

  if (!isLast) {
    cbar.style.animation = 'none';
    void cbar.offsetWidth;
    cbar.style.animation = `shrink ${AUTO_MS}ms linear forwards`;
    if (autoTid) clearTimeout(autoTid);
    autoTid = setTimeout(() => { hideOverlays(); startGame(next); }, AUTO_MS);
  }
}

function showOver() { overlayOver.classList.remove('hidden'); }

function hideOverlays() {
  overlayWin.classList.add('hidden');
  overlayOver.classList.add('hidden');
  if (autoTid) { clearTimeout(autoTid); autoTid = null; }
}

// ── Wiring ────────────────────────────────────────────────────────────────────
btnBack.onclick    = () => { hideOverlays(); showScreen(screenLS); };
btnRestart.onclick = () => { hideOverlays(); startGame(currentLevel); };
btnNext.onclick    = () => { hideOverlays(); startGame(currentLevel + 1); };
btnWinMenu.onclick = () => { hideOverlays(); showScreen(screenLS); };
btnRetry.onclick   = () => { hideOverlays(); startGame(currentLevel); };
btnOverMenu.onclick= () => { hideOverlays(); showScreen(screenLS); };

// ── Boot ──────────────────────────────────────────────────────────────────────
buildLS();
showScreen(screenLS);
