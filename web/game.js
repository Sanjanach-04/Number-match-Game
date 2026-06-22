'use strict';

// ── DOM refs ──────────────────────────────────────────────────────────────────
const $ = id => document.getElementById(id);
const screenLS       = $('screenLevelSelect');
const screenGame     = $('screenGame');
const levelGrid      = $('levelGrid');
const lblLevel       = $('lblLevel');
const lblAddRow      = $('lblAddRow');
const lblMatched     = $('lblMatched');
const statusBar      = $('statusBar');
const gridEl         = $('grid');
const scrollArea     = $('scrollArea');
const btnBack        = $('btnBack');
const btnAdd         = $('btnAddRowAction');
const btnRestart     = $('btnRestart');
const btnHint        = $('btnHint');
const btnHintFoot    = $('btnHintAction');
const hintCount      = $('hintCount');
const overlayWin     = $('overlayWin');
const overlayOver    = $('overlayOver');
const winMsg         = $('winMsg');
const winCountdownBar= $('winCountdownBar');
const btnNext        = $('btnNextLevel');
const btnWinMenu     = $('btnWinMenu');
const btnRetry       = $('btnRetry');
const btnOverMenu    = $('btnOverMenu');

// ── Game state ────────────────────────────────────────────────────────────────
let engine       = null;
let currentLevel = 1;
let statusTid    = null;
let hintUnlocked = false;
let hintIdxs     = [];
let autoAdvanceTid = null;   // timer for auto-advance to next level

// ── Screen switch ─────────────────────────────────────────────────────────────
function showScreen(s) {
  [screenLS, screenGame].forEach(el => el.classList.remove('active'));
  s.classList.add('active');
}

// ── Level select ──────────────────────────────────────────────────────────────
function buildLS() {
  levelGrid.innerHTML = '';
  for (let lvl = 1; lvl <= 11; lvl++) {
    const relief = DifficultyConfig.isRelief(lvl);
    const btn    = document.createElement('button');
    btn.className = 'level-btn' + (relief ? ' relief' : '');
    btn.innerHTML = `
      ${relief ? '<span class="lvl-badge">EASY</span>' : ''}
      <span class="lvl-num">${lvl}</span>`;
    btn.onclick = () => startGame(lvl);
    levelGrid.appendChild(btn);
  }
}

// ── Start / restart ───────────────────────────────────────────────────────────
function startGame(level) {
  currentLevel = level;
  engine       = new GameEngine(level);
  hintUnlocked = false;
  hintIdxs     = [];

  lblLevel.textContent = `Level ${level}`;
  hideOverlays();
  hideStatus();
  lockHint();
  updateBadges();
  renderGrid();
  showScreen(screenGame);
  scrollArea.scrollTop = 0;
}

// ── Hint lock / unlock ────────────────────────────────────────────────────────
function lockHint() {
  hintUnlocked = false;
  btnHint.classList.add('hint-locked');
  btnHint.classList.remove('hint-unlocked');
  btnHintFoot.classList.add('hint-locked');
  btnHintFoot.classList.remove('hint-unlocked');
}

function unlockHint() {
  if (hintUnlocked) return;
  hintUnlocked = true;
  btnHint.classList.remove('hint-locked');
  btnHint.classList.add('hint-unlocked');
  btnHintFoot.classList.remove('hint-locked');
  btnHintFoot.classList.add('hint-unlocked');
}

// ── Grid ──────────────────────────────────────────────────────────────────────
function renderGrid() {
  gridEl.innerHTML = '';
  for (let i = 0; i < engine.board.getCellCount(); i++) {
    gridEl.appendChild(makeCellEl(i));
  }
}

function makeCellEl(idx) {
  const cell = engine.board.getCellByIndex(idx);
  const el   = document.createElement('div');
  el.className   = 'cell';
  el.dataset.idx = idx;
  el.textContent = cell.isMatched() ? '' : cell.value;
  if (cell.isMatched()) el.classList.add('matched');
  el.addEventListener('click', () => onCellClick(idx));
  return el;
}

function cellEl(idx) { return gridEl.querySelector(`[data-idx="${idx}"]`); }

function refreshCellEl(idx) {
  const el   = cellEl(idx); if (!el) return;
  const cell = engine.board.getCellByIndex(idx);
  el.className   = 'cell';
  el.textContent = cell.isMatched() ? '' : cell.value;
  if (cell.isMatched()) el.classList.add('matched');
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
function showHintHighlight(iA, iB) {
  clearHintHighlights();
  hintIdxs = [iA, iB];
  const eA = cellEl(iA), eB = cellEl(iB);
  if (eA) eA.classList.add('hint-a');
  if (eB) eB.classList.add('hint-b');
  setTimeout(clearHintHighlights, 2100);
  if (eA) eA.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function clearHintHighlights() {
  hintIdxs.forEach(i => {
    const el = cellEl(i); if (!el) return;
    el.classList.remove('hint-a', 'hint-b');
  });
  hintIdxs = [];
}

// ── Cell click ────────────────────────────────────────────────────────────────
function onCellClick(idx) {
  if (!engine || engine.state !== 'PLAYING') return;
  clearHintHighlights();

  const r = engine.onCellTapped(idx);

  switch (r.type) {
    case 'SELECTED':
      // Just highlight the selected cell — no partner hints shown
      gridEl.querySelectorAll('.selected').forEach(e => e.classList.remove('selected'));
      cellEl(idx)?.classList.add('selected');
      break;

    case 'DESELECTED':
      cellEl(idx)?.classList.remove('selected');
      break;

    case 'MATCHED':
      updateBadges();
      [r.indexA, r.indexB].forEach(i => {
        const e = cellEl(i); if (!e) return;
        e.classList.remove('selected');
        e.classList.add('flash-match');
      });
      setTimeout(() => {
        refreshCellEl(r.indexA);
        refreshCellEl(r.indexB);
        if (r.levelComplete) {
          showWin();
        } else if (r.gameOver) {
          showOver();
        } else if (r.noMoves) {
          // Board frozen — Add Rows still available, nudge the player
          showStatus('No moves left — tap + Add Row!', 3000);
          unlockHint();
        }
      }, 380);
      break;

    case 'FAILED':
      gridEl.querySelectorAll('.selected').forEach(e => e.classList.remove('selected'));
      [r.indexA, r.indexB].forEach(i => {
        const e = cellEl(i); if (!e) return;
        e.classList.add('shake');
        e.addEventListener('animationend', () => e.classList.remove('shake'), { once: true });
      });
      unlockHint(); // reveal hint after first wrong attempt
      break;
  }
}

// ── Hint ──────────────────────────────────────────────────────────────────────
function onHintPressed() {
  if (!engine || engine.state !== 'PLAYING' || !hintUnlocked) return;

  const r = engine.onHint();

  if (!r.success) {
    if (r.reason === 'no hints left') {
      showStatus('No hints remaining!', 2000);
    } else {
      showStatus('No matches found — try Add Row', 2500);
    }
    btnHintFoot.style.animation = 'none';
    requestAnimationFrame(() => {
      btnHintFoot.style.animation = 'shake 0.38s ease-out';
      btnHintFoot.addEventListener('animationend', () => { btnHintFoot.style.animation = ''; }, { once: true });
    });
    return;
  }

  updateBadges();
  showHintHighlight(r.indexA, r.indexB);
}

btnHint.addEventListener('click', onHintPressed);
btnHintFoot.addEventListener('click', onHintPressed);

// ── Add Row ───────────────────────────────────────────────────────────────────
btnAdd.addEventListener('click', () => {
  if (!engine || engine.state !== 'PLAYING') return;
  clearHintHighlights();

  const r = engine.onAddRow();
  if (!r.success) { showStatus('No Add Row uses remaining!', 2500); return; }

  appendRow(engine.board.rowCount - 1, true);
  updateBadges();

  if (r.wasRescue) {
    showStatus('Numbers added!', 1500);
  }

  setTimeout(() => { scrollArea.scrollTop = scrollArea.scrollHeight; }, 60);
  unlockHint(); // also unlock hint when Add Row is pressed
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
  btnHint.disabled     = hl <= 0;
  btnHintFoot.disabled = hl <= 0;
}

// ── Status toast ──────────────────────────────────────────────────────────────
function showStatus(msg, ms) {
  if (statusTid) clearTimeout(statusTid);
  statusBar.textContent = msg;
  statusBar.classList.remove('hidden');
  statusTid = setTimeout(hideStatus, ms || 2500);
}
function hideStatus() {
  if (statusTid) clearTimeout(statusTid);
  statusBar.classList.add('hidden');
}

// ── Overlays ──────────────────────────────────────────────────────────────────
const AUTO_ADVANCE_MS = 2500; // ms before auto-advancing to next level

function showWin() {
  const next = currentLevel + 1;
  const isLast = next > 11;

  winMsg.textContent = isLast
    ? '🏆 You beat all 11 levels!'
    : `Next up: Level ${next}`;

  btnNext.style.display  = isLast ? 'none' : '';
  btnNext.textContent    = `Level ${next} →`;
  overlayWin.classList.remove('hidden');

  if (!isLast) {
    // Restart countdown bar animation
    winCountdownBar.style.animation = 'none';
    // Force reflow so the animation restarts cleanly
    void winCountdownBar.offsetWidth;
    winCountdownBar.style.animation = `countdownShrink ${AUTO_ADVANCE_MS}ms linear forwards`;

    // Auto-advance after countdown
    if (autoAdvanceTid) clearTimeout(autoAdvanceTid);
    autoAdvanceTid = setTimeout(() => {
      hideOverlays();
      startGame(next);
    }, AUTO_ADVANCE_MS);
  }
}

function showOver() { overlayOver.classList.remove('hidden'); }

function hideOverlays() {
  overlayWin.classList.add('hidden');
  overlayOver.classList.add('hidden');
  if (autoAdvanceTid) { clearTimeout(autoAdvanceTid); autoAdvanceTid = null; }
}

// ── Wiring ────────────────────────────────────────────────────────────────────
btnBack.onclick    = () => { hideOverlays(); showScreen(screenLS); };
btnRestart.onclick = () => { hideOverlays(); startGame(currentLevel); };
btnNext.onclick    = () => { hideOverlays(); startGame(currentLevel + 1); };
btnWinMenu.onclick = () => { hideOverlays(); showScreen(screenLS); };
btnRetry.onclick   = () => { hideOverlays(); startGame(currentLevel); };
btnOverMenu.onclick= () => { hideOverlays(); showScreen(screenLS); };

// ── Init ──────────────────────────────────────────────────────────────────────
buildLS();
showScreen(screenLS);
