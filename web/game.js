/* game.js */
log('game.js start');

var G = {
  board: null, addE: null, level: 1,
  sel: -1, matches: 0, hints: 3,
  hintOn: false, hintIdxs: [],
  autoTid: null, toastTid: null
};
var AUTO_MS = 2600;

function goMenu() {
  if (G.autoTid) { clearTimeout(G.autoTid); G.autoTid = null; }
  hide('oW'); hide('oO');
  showScr('sLS');
}

function restart() { startGame(G.level); }

/* ── screens ─────────────────────── */
function showScr(id) {
  var ids = ['sLS','sG'];
  for (var i=0; i<ids.length; i++) {
    var el = document.getElementById(ids[i]);
    if (el) el.classList.remove('show');
  }
  var el = document.getElementById(id);
  if (el) el.classList.add('show');
}
function show(id) { var el=document.getElementById(id); if(el) el.classList.add('show'); }
function hide(id) { var el=document.getElementById(id); if(el) el.classList.remove('show'); }

/* ── build level list ─────────────── */
function buildLevels() {
  var g = document.getElementById('lgrid');
  if (!g) { log('lgrid not found'); return; }
  g.innerHTML = '';
  var relief = {6:1, 11:1};
  for (var lvl = 1; lvl <= 11; lvl++) {
    var btn = document.createElement('button');
    btn.className = 'lb' + (relief[lvl] ? ' relief' : '');
    btn.innerHTML = (relief[lvl] ? '<span class="easy">EASY</span>' : '') + lvl;
    btn.setAttribute('data-l', lvl);
    btn.addEventListener('click', function() {
      startGame(parseInt(this.getAttribute('data-l'), 10));
    });
    g.appendChild(btn);
  }
  log('levels built');
}

/* ── start game ───────────────────── */
function startGame(lvl) {
  log('startGame ' + lvl);
  if (G.autoTid) { clearTimeout(G.autoTid); G.autoTid = null; }
  G.level = lvl; G.sel = -1; G.matches = 0;
  G.hints = 3; G.hintOn = false; G.hintIdxs = [];
  G.board = seedBoard(lvl);
  G.addE = new AddEng(lvl);
  document.getElementById('lLv').textContent = 'Level ' + lvl;
  setHintLock(true);
  updateBadges(); hideToast(); renderGrid();
  hide('oW'); hide('oO');
  showScr('sG');
  document.getElementById('sa').scrollTop = 0;
}

/* ── hint visibility ──────────────── */
function setHintLock(locked) {
  G.hintOn = !locked;
  var els = [document.getElementById('bH'), document.getElementById('bHf')];
  for (var i=0; i<els.length; i++) {
    if (!els[i]) continue;
    if (locked) { els[i].classList.add('hl'); els[i].classList.remove('hv'); }
    else        { els[i].classList.remove('hl'); els[i].classList.add('hv'); }
  }
}
function unlockHint() { if (!G.hintOn) setHintLock(false); }

/* ── render grid ──────────────────── */
function renderGrid() {
  var g = document.getElementById('grid');
  if (!g) return;
  g.innerHTML = '';
  for (var i = 0; i < G.board.cells.length; i++) {
    g.appendChild(makeCell(i));
  }
  log('grid rendered ' + G.board.cells.length + ' cells');
}
function makeCell(i) {
  var cell = G.board.cells[i];
  var el = document.createElement('div');
  el.className = cell.m ? 'cell cm' : 'cell';
  el.dataset.i = i;
  el.textContent = cell.m ? '' : cell.v;
  el.addEventListener('click', (function(idx){ return function(){ onTap(idx); }; })(i));
  return el;
}
function cEl(i) { var g=document.getElementById('grid'); return g ? g.querySelector('[data-i="'+i+'"]') : null; }
function refreshCell(i) {
  var el=cEl(i); if(!el) return;
  var c=G.board.cells[i];
  el.className = c.m ? 'cell cm' : 'cell';
  el.textContent = c.m ? '' : c.v;
}
function appendRow(ri) {
  var g=document.getElementById('grid'), start=ri*9;
  for (var i=start; i<start+9; i++) {
    var el=makeCell(i); el.classList.add('cn'); g.appendChild(el);
  }
}

/* ── tap handler ──────────────────── */
function onTap(i) {
  var cell = G.board.cells[i];
  if (!cell || cell.m) return;
  clearHints();

  if (G.sel < 0) {
    G.sel = i;
    var el=cEl(i); if(el) el.classList.add('cs');
    return;
  }
  if (G.sel === i) {
    var el=cEl(i); if(el) el.classList.remove('cs');
    G.sel = -1; return;
  }

  var a = G.board.cells[G.sel], b = cell;
  var iA = G.sel, iB = i; G.sel = -1;

  if (G.board.tryMatch(a, b)) {
    G.addE.notifyMatch(); G.matches++;
    updateBadges();
    var eA=cEl(iA), eB=cEl(iB);
    if(eA){eA.classList.remove('cs');eA.classList.add('cf');}
    if(eB){eB.classList.remove('cs');eB.classList.add('cf');}
    setTimeout(function() {
      refreshCell(iA); refreshCell(iB);
      if (G.board.cleared()) { showWin(); return; }
      if (!G.board.hasMatch() && G.addE.exh) { showOver(); return; }
      if (!G.board.hasMatch()) { showToast('No moves — tap + Add Row!', 3000); unlockHint(); }
    }, 400);
  } else {
    var eA=cEl(iA), eB=cEl(iB);
    if(eA){eA.classList.remove('cs');eA.classList.add('ck');eA.addEventListener('animationend',function(){eA.classList.remove('ck')},{once:true});}
    if(eB){eB.classList.add('ck');eB.addEventListener('animationend',function(){eB.classList.remove('ck')},{once:true});}
    unlockHint();
  }
}

/* ── hint ─────────────────────────── */
function doHint() {
  if (!G.hintOn || G.hints <= 0) return;
  var ms = G.board.allMatches();
  if (!ms.length) { showToast('No matches — add a row', 2200); return; }
  var best=ms[0], bg=Math.abs(best[1]-best[0]);
  for(var i=1;i<ms.length;i++){var g=Math.abs(ms[i][1]-ms[i][0]);if(g>bg){bg=g;best=ms[i];}}
  G.hints--; updateBadges(); clearHints();
  G.hintIdxs=[best[0],best[1]];
  var eA=cEl(best[0]),eB=cEl(best[1]);
  if(eA) eA.classList.add('pha');
  if(eB) eB.classList.add('phb');
  setTimeout(clearHints, 2200);
  if(eA) eA.scrollIntoView({behavior:'smooth',block:'nearest'});
}
function clearHints() {
  for(var i=0;i<G.hintIdxs.length;i++){
    var el=cEl(G.hintIdxs[i]);
    if(el){el.classList.remove('pha');el.classList.remove('phb');}
  }
  G.hintIdxs=[];
}

/* ── add row ──────────────────────── */
function doAdd() {
  if (G.addE.exh) { showToast('No Add Row uses left!', 2500); return; }
  var res = G.addE.genRow(G.board);
  if (!res) { showToast('No Add Row uses left!', 2500); return; }
  G.board.addRow(res.vals);
  appendRow(G.board.rows - 1);
  updateBadges(); unlockHint();
  var sa=document.getElementById('sa');
  setTimeout(function(){if(sa)sa.scrollTop=sa.scrollHeight;},60);
  if (G.addE.exh && !G.board.hasMatch()) setTimeout(showOver, 700);
}

/* ── badges ───────────────────────── */
function updateBadges() {
  var bAdd=document.getElementById('bAdd');
  document.getElementById('lRow').textContent = '+Row ' + G.addE.rem;
  document.getElementById('lMt').textContent  = '\u2713 ' + G.matches;
  document.getElementById('hC').textContent   = G.hints;
  if(bAdd) bAdd.disabled = G.addE.exh;
  var bH=document.getElementById('bH'), bHf=document.getElementById('bHf');
  if(bH) bH.disabled = G.hints<=0;
  if(bHf) bHf.disabled = G.hints<=0;
}

/* ── toast ────────────────────────── */
function showToast(msg, ms) {
  if(G.toastTid) clearTimeout(G.toastTid);
  var t=document.getElementById('toast');
  if(t){t.textContent=msg;t.style.display='block';}
  G.toastTid=setTimeout(hideToast, ms||2500);
}
function hideToast() {
  if(G.toastTid) clearTimeout(G.toastTid);
  var t=document.getElementById('toast'); if(t) t.style.display='none';
}

/* ── win / over ───────────────────── */
function showWin() {
  var next=G.level+1, isLast=next>11;
  var html = '<div class="ws">&#11088;&#11088;&#11088;</div><h2>Level Complete!</h2>'+
    '<p>'+(isLast?'&#127942; You beat all 11 levels!':'Next up: Level '+next)+'</p>'+
    '<div class="cd"><div id="cdf" class="cdf"></div></div>'+
    (isLast?'':'<button class="bp" onclick="hideWin();startGame('+next+')">Level '+next+' &#8594;</button>')+
    '<button class="bg" onclick="hideWin();goMenu()">Menu</button>';
  document.getElementById('oWc').innerHTML = html;
  show('oW');
  if (!isLast) {
    var cb=document.getElementById('cdf');
    if(cb){cb.style.animation='none';void cb.offsetWidth;cb.style.animation='cds '+AUTO_MS+'ms linear forwards';}
    G.autoTid=setTimeout(function(){hideWin();startGame(next);},AUTO_MS);
  }
}
function hideWin(){hide('oW');if(G.autoTid){clearTimeout(G.autoTid);G.autoTid=null;}}

function showOver() {
  document.getElementById('oOc').innerHTML =
    '<div style="font-size:2.5rem">&#128531;</div><h2>Out of Moves</h2>'+
    '<p>All Add Row attempts used. Try again!</p>'+
    '<button class="bp" onclick="hide(\'oO\');startGame(G.level)">Try Again</button>'+
    '<button class="bg" onclick="hide(\'oO\');goMenu()">Menu</button>';
  show('oO');
}

/* ── boot ─────────────────────────── */
buildLevels();
log('game.js OK - ready');

// Show app, hide debug log
document.getElementById('app').style.display = 'block';
document.getElementById('log').style.display = 'none';
