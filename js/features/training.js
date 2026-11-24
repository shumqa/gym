import { WORKOUT_DATA, DAY_TO_WORKOUT, DAY_NAMES, MONTH_NAMES } from '../data/workouts.js';
import { readJSON, writeJSON, removeKey } from '../core/storage.js';

// ============================================================
// STATE
// ============================================================

let activeSession = null; // { workoutId, started, checked: Set<id> }
let timerInterval = null;

export function loadSession() {
  activeSession = readJSON('gym_session', null);
  if (activeSession && activeSession.checked) {
    activeSession.checked = new Set(activeSession.checked);
  }
}

function saveSession() {
  if (!activeSession) { removeKey('gym_session'); return; }
  const s = { ...activeSession, checked: [...activeSession.checked] };
  writeJSON('gym_session', s);
}

function loadHistory() {
  const history = readJSON('gym_history', []);
  return Array.isArray(history) ? history : [];
}

function saveHistory(hist) {
  writeJSON('gym_history', hist);
}

// ============================================================
// TODAY VIEW
// ============================================================

export function renderToday() {
  const now = new Date();
  const dow = now.getDay();
  const todayWorkoutId = DAY_TO_WORKOUT[dow];
  const dateStr = `${now.getDate()} ${MONTH_NAMES[now.getMonth()]}`;
  const dayName = DAY_NAMES[dow];

  document.getElementById('topbar-date').innerHTML = `<div>${dateStr}</div><div>${dayName}</div>`;

  const c = document.getElementById('today-content');

  // If active session exists
  if (activeSession) {
    const w = WORKOUT_DATA[activeSession.workoutId];
    if (!w) { activeSession = null; saveSession(); return renderToday(); }
    const total = w.exercises.length;
    const done = activeSession.checked.size;
    const pct = Math.round(done / total * 100);

    let exHtml = w.exercises.map(ex => {
      const isDone = activeSession.checked.has(ex.id);
      return exerciseCard(ex, isDone, true);
    }).join('');

    c.innerHTML = `
      <div class="active-banner visible">
        <div>
          <div class="active-banner-text">Тренировка идёт</div>
          <div class="active-banner-sub">Отмечай выполненные упражнения</div>
        </div>
        <div class="timer" id="timer-val">${formatTimer(Date.now() - activeSession.started)}</div>
      </div>

      <div class="progress-wrap">
        <div class="progress-header">
          <span class="progress-label">Выполнено</span>
          <span class="progress-count">${done} / ${total}</span>
        </div>
        <div class="progress-bar-bg"><div class="progress-bar-fill" id="prog-fill" style="width:${pct}%"></div></div>
      </div>

      <div class="section-title">
        <span class="day-pill ${w.pillClass}">${w.type}</span> ${w.day}
      </div>

      <div id="ex-list">${exHtml}</div>

      <div style="margin-top:20px">
        <button class="btn btn-accent" onclick="openFinishModal()">Завершить тренировку</button>
        <button class="btn btn-danger" onclick="cancelSession()" style="margin-top:8px">Отменить без сохранения</button>
      </div>
    `;
    startTimer();
  } else {
    stopTimer();
    if (todayWorkoutId) {
      const w = WORKOUT_DATA[todayWorkoutId];
      c.innerHTML = `
        <div class="date-hero">
          <div class="date-line">Сегодня</div>
          <div class="date-big">${dateStr}</div>
          <div class="date-workout">
            <span class="day-pill ${w.pillClass}" style="margin-right:6px">${w.type}</span>
          </div>
          <div class="date-workout-sub">${w.label}</div>
        </div>

        <div class="section-title">Упражнения — ${w.exercises.length} шт</div>
        ${w.exercises.map(ex => exerciseCard(ex, false, false)).join('')}

        <div style="margin-top:20px">
          <button class="btn btn-accent" onclick="startSession('${w.id}')">Начать тренировку</button>
        </div>
      `;
    } else {
      // Rest day (Tue or Thu)
      c.innerHTML = `
        <div class="date-hero">
          <div class="date-line">Сегодня</div>
          <div class="date-big">${dateStr}</div>
        </div>

        <div class="rest-card">
          <div class="rest-icon">💤</div>
          <div class="rest-title">День отдыха</div>
          <div class="rest-text">Вторник и четверг — дни восстановления.<br>Можно прогуляться или сделать лёгкую растяжку.</div>
        </div>

        <div class="section-title" style="margin-top:24px">Начать тренировку досрочно?</div>
        <div class="choose-grid">
          ${Object.values(WORKOUT_DATA).map(w => `
            <div class="choose-card" onclick="startSession('${w.id}')">
              <div class="day-pill ${w.pillClass}">${w.type}</div>
              <div class="choose-card-type">${w.label}</div>
            </div>
          `).join('')}
        </div>
      `;
    }
  }
}

function exerciseCard(ex, isDone, interactive) {
  const doneClass = isDone ? 'done' : '';
  const onclick = interactive ? `onclick="toggleExercise('${ex.id}')"` : '';
  const expandId = `detail-${ex.id}`;
  const chevId = `chev-${ex.id}`;

  const primPills = ex.primary.map(p => `<span class="muscle-tag primary">${p}</span>`).join('');
  const secPills = ex.secondary.map(p => `<span class="muscle-tag">${p}</span>`).join('');

  return `
    <div class="ex-card ${doneClass}" id="card-${ex.id}">
      <div class="ex-card-main" ${onclick}>
        ${interactive ? `
        <div class="ex-checkbox">
          <svg viewBox="0 0 14 14" fill="none" stroke="currentColor"><polyline points="2,7 5.5,11 12,3"/></svg>
        </div>` : `<div style="width:22px;height:22px;flex-shrink:0;border:1.5px solid var(--border);border-radius:6px;"></div>`}
        <div class="ex-info">
          <div class="ex-name">${ex.name}</div>
          <div class="ex-sets">${ex.sets}</div>
          <div class="ex-muscles">${primPills}${secPills}</div>
        </div>
        <div class="ex-expand-btn" id="${chevId}" onclick="event.stopPropagation(); toggleDetail('${expandId}','${chevId}')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6,9 12,15 18,9"/></svg>
        </div>
      </div>
      <div class="ex-detail" id="${expandId}">${ex.note}</div>
    </div>
  `;
}

function toggleDetail(expandId, chevId) {
  const el = document.getElementById(expandId);
  const ch = document.getElementById(chevId);
  el.classList.toggle('open');
  ch.classList.toggle('open');
}

function toggleExercise(exId) {
  if (!activeSession) return;
  if (activeSession.checked.has(exId)) {
    activeSession.checked.delete(exId);
  } else {
    activeSession.checked.add(exId);
  }
  saveSession();

  const card = document.getElementById('card-' + exId);
  const w = WORKOUT_DATA[activeSession.workoutId];
  const total = w.exercises.length;
  const done = activeSession.checked.size;
  const pct = Math.round(done / total * 100);

  if (card) {
    card.classList.toggle('done', activeSession.checked.has(exId));
    card.classList.add('just-done');
    setTimeout(() => card.classList.remove('just-done'), 300);
    const nameEl = card.querySelector('.ex-name');
    if (nameEl) nameEl.style.textDecoration = activeSession.checked.has(exId) ? 'line-through' : '';
    if (nameEl) nameEl.style.color = activeSession.checked.has(exId) ? 'var(--text2)' : '';
    const checkEl = card.querySelector('.ex-checkbox');
    if (checkEl) {
      if (activeSession.checked.has(exId)) {
        checkEl.style.background = 'var(--accent)';
        checkEl.style.borderColor = 'var(--accent)';
        checkEl.querySelector('svg').style.opacity = '1';
      } else {
        checkEl.style.background = '';
        checkEl.style.borderColor = '';
        checkEl.querySelector('svg').style.opacity = '0';
      }
    }
  }

  const fill = document.getElementById('prog-fill');
  if (fill) fill.style.width = pct + '%';
  const countEl = document.querySelector('.progress-count');
  if (countEl) countEl.textContent = `${done} / ${total}`;

  if (done === total) showToast('🎯 Все упражнения выполнены!');
}

function startSession(workoutId) {
  activeSession = {
    workoutId,
    started: Date.now(),
    checked: new Set()
  };
  saveSession();
  window.switchView('today');
}

function cancelSession() {
  if (!confirm('Отменить тренировку? Прогресс не сохранится.')) return;
  activeSession = null;
  saveSession();
  stopTimer();
  renderToday();
}

// ============================================================
// TIMER
// ============================================================

function formatTimer(ms) {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  if (h > 0) return `${h}:${String(m % 60).padStart(2,'0')}:${String(s % 60).padStart(2,'0')}`;
  return `${String(m).padStart(2,'0')}:${String(s % 60).padStart(2,'0')}`;
}

function startTimer() {
  stopTimer();
  timerInterval = setInterval(() => {
    if (!activeSession) return;
    const el = document.getElementById('timer-val');
    if (el) el.textContent = formatTimer(Date.now() - activeSession.started);
  }, 1000);
}

function stopTimer() {
  if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
}

// ============================================================
// FINISH MODAL
// ============================================================

function openFinishModal() {
  if (!activeSession) return;
  const w = WORKOUT_DATA[activeSession.workoutId];
  const total = w.exercises.length;
  const done = activeSession.checked.size;
  const elapsed = formatTimer(Date.now() - activeSession.started);
  const pct = Math.round(done / total * 100);

  document.getElementById('finish-modal-stats').innerHTML = `
    <div class="finish-stat"><div class="finish-stat-val">${done}/${total}</div><div class="finish-stat-lbl">Упражнений</div></div>
    <div class="finish-stat"><div class="finish-stat-val">${pct}%</div><div class="finish-stat-lbl">Выполнено</div></div>
    <div class="finish-stat"><div class="finish-stat-val">${elapsed}</div><div class="finish-stat-lbl">Время</div></div>
    <div class="finish-stat"><div class="finish-stat-val">${w.type}</div><div class="finish-stat-lbl">Тренировка</div></div>
  `;
  document.getElementById('finish-modal').classList.add('open');
}

function closeModal() {
  document.getElementById('finish-modal').classList.remove('open');
}

function confirmFinish() {
  if (!activeSession) return;
  const w = WORKOUT_DATA[activeSession.workoutId];
  const total = w.exercises.length;
  const done = activeSession.checked.size;
  const elapsed = Date.now() - activeSession.started;

  const hist = loadHistory();
  hist.unshift({
    id: Date.now(),
    workoutId: activeSession.workoutId,
    workoutType: w.type,
    workoutLabel: w.label,
    iconClass: w.iconClass,
    iconText: w.iconText,
    date: new Date().toISOString(),
    doneCount: done,
    totalCount: total,
    elapsedMs: elapsed
  });
  saveHistory(hist);

  activeSession = null;
  saveSession();
  stopTimer();
  closeModal();
  window.switchView('history');
  showToast('✅ Тренировка сохранена!');
}

// ============================================================
// SCHEDULE VIEW
// ============================================================

export function renderSchedule() {
  const c = document.getElementById('schedule-content');
  const dow = new Date().getDay();

  const days = [
    { label: 'Понедельник', wid: 'mon',  today: dow === 1, optional: false },
    { label: 'Вторник',     wid: 'tue',  today: dow === 2, optional: false },
    { label: 'Среда',       wid: 'wed',  today: dow === 3, optional: false },
    { label: 'Четверг',     wid: 'thu',  today: dow === 4, optional: false },
    { label: 'Пятница',     wid: 'fri',  today: dow === 5, optional: false },
    { label: 'Выходной',    wid: 'wknd', today: dow === 0 || dow === 6, optional: true },
  ];

  c.innerHTML = `<div class="section-title">Программа тренировок</div>
    ${days.map(d => {
      const w = WORKOUT_DATA[d.wid];
      const exRows = w.exercises.map(ex => `
        <div class="sched-ex">
          <span class="sched-ex-name">${ex.name}</span>
          <span class="sched-ex-sets">${ex.sets.split(' ')[0]}</span>

        </div>`).join('');
      return `
        <div class="schedule-card">
          <div class="schedule-header" onclick="toggleSchedule('sc-${d.wid}', this)">
            <div>
              <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px">
                <span class="weekday-tag ${d.today ? 'today' : ''}">${d.today ? '📍 ' : ''}${d.label}</span>
                ${d.optional ? '<span style="font-size:10px;color:var(--text3);font-weight:500">по настроению</span>' : ''}
              </div>
              <div class="schedule-day"><span class="day-pill ${w.pillClass}">${w.type}</span></div>
              <div class="schedule-type">${w.label} · ${w.exercises.length} упр</div>
            </div>
            <div class="schedule-chevron">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6,9 12,15 18,9"/></svg>
            </div>
          </div>
          <div class="schedule-body" id="sc-${d.wid}">
            ${exRows}
            <div class="start-from-schedule">
              <button class="btn-sm" onclick="startSession('${d.wid}')">▶ Начать эту тренировку ↗</button>
            </div>
          </div>
        </div>`;
    }).join('')}`;
}

function toggleSchedule(id, header) {
  const body = document.getElementById(id);
  const chev = header.querySelector('.schedule-chevron');
  body.classList.toggle('open');
  chev.classList.toggle('open');
  header.classList.toggle('open');
}

// ============================================================
// HISTORY VIEW
// ============================================================

export function renderHistory() {
  const c = document.getElementById('history-content');
  const hist = loadHistory();

  const totalWorkouts = hist.length;
  const totalExercises = hist.reduce((s, h) => s + h.doneCount, 0);
  const fullCompletes = hist.filter(h => h.doneCount === h.totalCount).length;

  if (hist.length === 0) {
    c.innerHTML = `
      <div class="section-title">Статистика</div>
      <div class="stats-row">
        <div class="stat-card"><div class="stat-val">0</div><div class="stat-lbl">Тренировок</div></div>
        <div class="stat-card"><div class="stat-val">0</div><div class="stat-lbl">Упражнений</div></div>
        <div class="stat-card"><div class="stat-val">0</div><div class="stat-lbl">100% сессий</div></div>
      </div>
      <div class="hist-empty">
        <div class="hist-empty-icon">📋</div>
        История пока пуста.<br>Завершите первую тренировку,<br>и она появится здесь.
      </div>`;
    return;
  }

  const histItems = hist.map(h => {
    const d = new Date(h.date);
    const dateStr = `${d.getDate()} ${MONTH_NAMES[d.getMonth()]} · ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
    const pct = Math.round(h.doneCount / h.totalCount * 100);
    const pctClass = pct === 100 ? 'full' : 'partial';
    const elapsed = h.elapsedMs ? formatTimer(h.elapsedMs) : '—';
    return `
      <div class="hist-item">
        <div class="hist-icon ${h.iconClass}">${h.iconText}</div>
        <div class="hist-info">
          <div class="hist-name">${h.workoutType}</div>
          <div class="hist-date">${dateStr} · ${elapsed}</div>
        </div>
        <div class="hist-right">
          <div class="hist-pct ${pctClass}">${pct}%</div>
          <div class="hist-exercises">${h.doneCount}/${h.totalCount} упр</div>
        </div>
      </div>`;
  }).join('');

  c.innerHTML = `
    <div class="section-title">Статистика</div>
    <div class="stats-row">
      <div class="stat-card"><div class="stat-val">${totalWorkouts}</div><div class="stat-lbl">Тренировок</div></div>
      <div class="stat-card"><div class="stat-val">${totalExercises}</div><div class="stat-lbl">Упражнений</div></div>
      <div class="stat-card"><div class="stat-val">${fullCompletes}</div><div class="stat-lbl">100% сессий</div></div>
    </div>
    <div class="section-title">История</div>
    ${histItems}
    <button class="clear-btn" onclick="document.getElementById('clear-modal').classList.add('open')">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3,6 5,6 21,6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
      Очистить историю
    </button>
  `;
}

function confirmClear() {
  saveHistory([]);
  document.getElementById('clear-modal').classList.remove('open');
  renderHistory();
  showToast('История очищена');
}

// ============================================================
// TOAST
// ============================================================

export function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2800);
}



// Inline handlers in the legacy training UI are bridged explicitly from this module.
Object.assign(window, {
  toggleDetail, toggleExercise, startSession, cancelSession, openFinishModal,
  closeModal, confirmFinish, toggleSchedule, confirmClear
});
