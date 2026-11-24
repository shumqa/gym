// ============================================================
// TIMER & STOPWATCH
// ============================================================

function switchClockTab(tab) {
  document.querySelectorAll('.clk-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.clk-panel').forEach(p => p.classList.remove('active'));
  document.getElementById('tab-' + tab).classList.add('active');
  document.getElementById('panel-' + tab).classList.add('active');
}

// ---------- STOPWATCH ----------
let swRunning = false;
let swStartTime = 0;
let swElapsed = 0;
let swInterval_id = null;
let swLaps = [];
let swLapStart = 0;
const SW_CIRC = 766.5;

function swFmt(ms, big) {
  const totalCs = Math.floor(ms / 10);
  const cs = totalCs % 100;
  const totalS = Math.floor(ms / 1000);
  const s = totalS % 60, m = Math.floor(totalS / 60) % 60, h = Math.floor(totalS / 3600);
  const ms2 = `<span style="font-size:${big?'30':'14'}px;color:var(--text2)">.${String(cs).padStart(2,'0')}</span>`;
  if (h > 0) return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}${ms2}`;
  return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}${ms2}`;
}
function swFmtPlain(ms) {
  const cs = Math.floor(ms / 10) % 100;
  const totalS = Math.floor(ms / 1000);
  const s = totalS % 60, m = Math.floor(totalS / 60) % 60, h = Math.floor(totalS / 3600);
  if (h > 0) return `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}.${String(cs).padStart(2,'0')}`;
  return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}.${String(cs).padStart(2,'0')}`;
}
function swGetEl() { return swRunning ? swElapsed + (Date.now() - swStartTime) : swElapsed; }

function swTick() {
  const el = swGetEl();
  document.getElementById('sw-display').innerHTML = swFmt(el, true);
  const prog = (el % 60000) / 60000;
  document.getElementById('sw-ring').style.strokeDashoffset = SW_CIRC * (1 - prog);
  if (swLaps.length > 0) {
    const lapEl = el - swLapStart;
    document.getElementById('sw-lap-info').textContent = `Круг ${swLaps.length + 1}: ${swFmtPlain(lapEl)}`;
  }
}

function swRightAction() {
  if (!swRunning) {
    swRunning = true; swStartTime = Date.now();
    swInterval_id = setInterval(swTick, 30);
    document.getElementById('sw-right-btn').classList.add('running');
    document.getElementById('sw-right-label').textContent = 'Стоп';
    document.getElementById('sw-left-label').textContent = 'Круг';
    document.getElementById('sw-ring').classList.remove('paused');
  } else {
    swElapsed = swGetEl(); swRunning = false;
    clearInterval(swInterval_id);
    document.getElementById('sw-ring').classList.add('paused');
    document.getElementById('sw-right-btn').classList.remove('running');
    document.getElementById('sw-right-label').textContent = 'Старт';
    document.getElementById('sw-left-label').textContent = 'Сброс';
  }
}

function swLeftAction() {
  if (swRunning) {
    const el = swGetEl();
    const lapMs = el - swLapStart;
    swLaps.unshift({ lapMs, totalMs: el, num: swLaps.length + 1 });
    swLapStart = el;
    swRenderLaps();
    document.getElementById('sw-laps-wrap').style.display = 'block';
    document.getElementById('sw-lap-info').textContent = `Круг ${swLaps.length + 1}: 00:00.00`;
  } else {
    swElapsed = 0; swRunning = false; swLaps = []; swLapStart = 0;
    clearInterval(swInterval_id);
    document.getElementById('sw-display').innerHTML = `00:00<span style="font-size:30px;color:var(--text2)">.00</span>`;
    document.getElementById('sw-ring').style.strokeDashoffset = SW_CIRC;
    document.getElementById('sw-ring').classList.remove('paused');
    document.getElementById('sw-right-btn').classList.remove('running');
    document.getElementById('sw-right-label').textContent = 'Старт';
    document.getElementById('sw-left-label').textContent = 'Сброс';
    document.getElementById('sw-laps-wrap').style.display = 'none';
    document.getElementById('sw-laps-list').innerHTML = '';
    document.getElementById('sw-lap-info').textContent = '';
  }
}

function swRenderLaps() {
  if (!swLaps.length) return;
  const times = swLaps.slice(swRunning ? 1 : 0).map(l => l.lapMs);
  const fastest = times.length ? Math.min(...times) : -1;
  const slowest = times.length > 1 ? Math.max(...times) : -1;
  document.getElementById('sw-laps-list').innerHTML = swLaps.map((l, i) => {
    let cls = '';
    if (i === 0 && swRunning) cls = 'current';
    else if (l.lapMs === fastest && fastest !== -1) cls = 'fastest';
    else if (l.lapMs === slowest && slowest !== -1) cls = 'slowest';
    return `<div class="clk-lap-row ${cls}">
      <span class="clk-lap-num">Круг ${l.num}</span>
      <span class="clk-lap-time">${swFmtPlain(l.lapMs)}</span>
      <span style="font-size:13px;color:var(--text3)">${swFmtPlain(l.totalMs)}</span>
    </div>`;
  }).join('');
}

// ---------- TIMER ----------
let tmrRunning = false;
let tmrPaused = false;
let tmrTotalMs = 0;
let tmrRemaining = 0;
let tmrStartAt = 0;
let tmrInterval_id = null;
let tmrDone = false;
let pickerH = 0, pickerM = 0, pickerS = 0;
const TMR_CIRC = 766.5;

function buildPickerCol(id, maxVal, initial) {
  const col = document.getElementById('tmr-col-' + id);
  if (!col) return;
  col.innerHTML = '';
  for (let i = 0; i <= maxVal; i++) {
    const div = document.createElement('div');
    div.className = 'tmr-col-item';
    div.textContent = String(i).padStart(2, '0');
    col.appendChild(div);
  }
  requestAnimationFrame(() => { col.scrollTop = initial * 44; });
}

function onPickerScroll(id) {
  const col = document.getElementById('tmr-col-' + id);
  clearTimeout(col._snap);
  col._snap = setTimeout(() => {
    const idx = Math.round(col.scrollTop / 44);
    col.scrollTop = idx * 44;
    if (id === 'h') pickerH = idx;
    else if (id === 'm') pickerM = idx;
    else pickerS = idx;
    updateTmrBtn();
  }, 80);
}

function updateTmrBtn() {
  const total = pickerH * 3600 + pickerM * 60 + pickerS;
  const btn = document.getElementById('tmr-right-btn');
  if (btn) { btn.style.opacity = total > 0 ? '1' : '0.4'; btn.disabled = total === 0; }
}

// ─── TIMER FORMAT FIX ───────────────────────────────────────────
// Bug was: Math.ceil(totalMs/1000) overflows into the next minute
// e.g. Math.ceil(59500/1000)=60 → decomposed as 1min 0sec (wrong!)
// Fix: floor hours & minutes independently, ceil only remaining seconds
// within the current minute, capped at 59 to prevent overflow.
function tmrFmt(ms) {
  if (ms <= 0) return '00:00';
  const pad = n => String(n).padStart(2, '0');
  const h = Math.floor(ms / 3600000);
  const remH = ms % 3600000;
  const m = Math.floor(remH / 60000);
  const remM = remH % 60000;
  // ceil seconds within this minute, but cap at 59 so we never roll over
  const s = Math.min(59, Math.ceil(remM / 1000));
  if (h > 0) return pad(h) + ':' + pad(m) + ':' + pad(s);
  return pad(m) + ':' + pad(s);
}

function tmrRightAction() {
  if (tmrDone) { tmrReset(); return; }
  if (!tmrRunning && !tmrPaused) {
    tmrTotalMs = (pickerH * 3600 + pickerM * 60 + pickerS) * 1000;
    if (!tmrTotalMs) return;
    tmrRemaining = tmrTotalMs; tmrStartAt = Date.now();
    tmrRunning = true; tmrPaused = false;
    showTmrCd();
    clearInterval(tmrInterval_id);
    tmrInterval_id = setInterval(tmrTick, 100);
    document.getElementById('tmr-right-label').textContent = 'Пауза';
    document.getElementById('tmr-right-btn').classList.add('running');
    document.getElementById('tmr-left-label').textContent = 'Отмена';
  } else if (tmrRunning) {
    tmrRemaining = Math.max(0, tmrRemaining - (Date.now() - tmrStartAt));
    tmrRunning = false; tmrPaused = true;
    clearInterval(tmrInterval_id);
    document.getElementById('tmr-ring').classList.add('paused');
    document.getElementById('tmr-right-btn').classList.remove('running');
    document.getElementById('tmr-right-label').textContent = 'Продолжить';
  } else if (tmrPaused) {
    tmrStartAt = Date.now(); tmrRunning = true; tmrPaused = false;
    clearInterval(tmrInterval_id);
    tmrInterval_id = setInterval(tmrTick, 100);
    document.getElementById('tmr-ring').classList.remove('paused');
    document.getElementById('tmr-right-btn').classList.add('running');
    document.getElementById('tmr-right-label').textContent = 'Пауза';
  }
}

function tmrLeftAction() { tmrReset(); }

function tmrTick() {
  const elapsed = Date.now() - tmrStartAt;
  const rem = Math.max(0, tmrRemaining - elapsed);
  const disp = document.getElementById('tmr-display');
  if (disp) disp.textContent = tmrFmt(rem);
  const ring = document.getElementById('tmr-ring');
  if (ring) ring.style.strokeDashoffset = TMR_CIRC * (1 - rem / tmrTotalMs);
  if (rem <= 0) {
    clearInterval(tmrInterval_id);
    tmrRunning = false; tmrDone = true;
    if (disp) { disp.textContent = '00:00'; disp.classList.add('alerting'); }
    if (ring) { ring.style.strokeDashoffset = TMR_CIRC; ring.classList.add('alert'); }
    const done = document.getElementById('tmr-done');
    if (done) done.classList.add('show');
    document.getElementById('tmr-right-label').textContent = 'Готово';
    document.getElementById('tmr-right-btn').classList.remove('running');
    if (navigator.vibrate) navigator.vibrate([500, 200, 500, 200, 500]);
    window.showToast('⏰ Время вышло!');
  }
}

function showTmrCd() {
  document.getElementById('tmr-picker-section').style.display = 'none';
  document.getElementById('tmr-countdown-section').style.display = '';
  document.getElementById('tmr-display').textContent = tmrFmt(tmrRemaining);
  const ring = document.getElementById('tmr-ring');
  ring.classList.remove('paused','alert');
  ring.style.strokeDashoffset = '0';
}

function tmrReset() {
  clearInterval(tmrInterval_id);
  tmrRunning = false; tmrPaused = false; tmrDone = false;
  tmrRemaining = 0; tmrTotalMs = 0;
  document.getElementById('tmr-picker-section').style.display = '';
  document.getElementById('tmr-countdown-section').style.display = 'none';
  const done = document.getElementById('tmr-done');
  if (done) done.classList.remove('show');
  const disp = document.getElementById('tmr-display');
  if (disp) disp.classList.remove('alerting');
  const ring = document.getElementById('tmr-ring');
  if (ring) { ring.classList.remove('paused','alert'); ring.style.strokeDashoffset = '0'; }
  document.getElementById('tmr-right-btn').classList.remove('running');
  document.getElementById('tmr-right-label').textContent = 'Старт';
  document.getElementById('tmr-left-label').textContent = 'Отмена';
  document.getElementById('tmr-right-btn').style.cssText = '';
  updateTmrBtn();
}

// Init pickers after DOM is ready
setTimeout(() => {
  buildPickerCol('h', 23, pickerH);
  buildPickerCol('m', 59, pickerM);
  buildPickerCol('s', 59, pickerS);
  updateTmrBtn();
}, 300);



Object.assign(window, {
  switchClockTab, swRightAction, swLeftAction, tmrRightAction, tmrLeftAction, onPickerScroll
});
