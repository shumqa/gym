import { readJSON, writeJSON } from '../core/storage.js';
import {
  addBodyWeightEntry,
  getBodyWeightHistory,
  getExerciseLoadHistory,
  getLoggedExerciseIds,
  localTodayISO
} from '../core/training-log.js';
import { getExerciseLibrary } from '../data/exercise-library.js';
import { initAchievements, renderAchievementsSection } from './achievements.js';

const PROFILE_KEY = 'gym_profile_v1';
const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[char]));
const fmt = value => Number(value).toLocaleString('ru-RU', { maximumFractionDigits: 1 });

function dateLabel(date, year = false) {
  const parsed = new Date(`${date}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return date;
  return parsed.toLocaleDateString('ru-RU', year ? { day: '2-digit', month: '2-digit', year: '2-digit' } : { day: '2-digit', month: 'short' });
}

function renderLineChart(points, valueKey, unit, label) {
  if (!points.length) {
    return `<div class="chart-empty"><span class="chart-empty-mark">↗</span><strong>Пока недостаточно данных</strong><span>${escapeHTML(label)}</span></div>`;
  }
  const values = points.map(item => Number(item[valueKey])).filter(Number.isFinite);
  if (!values.length) return `<div class="chart-empty"><strong>Нет числовых данных</strong></div>`;
  let min = Math.min(...values);
  let max = Math.max(...values);
  const span = max - min || Math.max(1, max * 0.08);
  min = Math.max(0, min - span * 0.18);
  max += span * 0.18;
  const width = 720, height = 250;
  const left = 56, right = 22, top = 18, bottom = 46;
  const plotW = width - left - right, plotH = height - top - bottom;
  const xy = points.map((item, index) => {
    const x = points.length === 1 ? left + plotW / 2 : left + (index / (points.length - 1)) * plotW;
    const y = top + ((max - Number(item[valueKey])) / (max - min)) * plotH;
    return { x, y, item };
  });
  const polyline = xy.map(point => `${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(' ');
  const grid = [0, 1, 2, 3].map(index => {
    const y = top + (index / 3) * plotH;
    const value = max - (index / 3) * (max - min);
    return `<line x1="${left}" y1="${y}" x2="${width - right}" y2="${y}" class="chart-gridline"/><text x="${left - 10}" y="${y + 4}" text-anchor="end" class="chart-axis-label">${fmt(value)}</text>`;
  }).join('');
  const labelIndexes = [...new Set([0, Math.floor((points.length - 1) / 2), points.length - 1])];
  const dateLabels = labelIndexes.map(index => {
    const point = xy[index];
    return `<text x="${point.x}" y="${height - 14}" text-anchor="middle" class="chart-axis-label">${escapeHTML(dateLabel(point.item.date))}</text>`;
  }).join('');
  const circles = xy.map(point => `<circle cx="${point.x}" cy="${point.y}" r="4.5" class="chart-point"><title>${escapeHTML(dateLabel(point.item.date, true))}: ${fmt(point.item[valueKey])} ${unit}</title></circle>`).join('');
  const latest = points[points.length - 1];
  const first = points[0];
  const difference = Number(latest[valueKey]) - Number(first[valueKey]);
  const trend = points.length > 1
    ? `<div class="chart-trend"><span>${difference > 0 ? 'Изменение' : difference < 0 ? 'Изменение' : 'Без изменений'}</span><strong>${difference > 0 ? '+' : ''}${fmt(difference)} ${unit}</strong><span>с первой записи</span></div>`
    : `<div class="chart-trend"><span>Первая запись сохранена</span></div>`;
  return `<div class="chart-svg-wrap"><svg class="progress-chart-svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeHTML(label)}">${grid}<polyline points="${polyline}" class="chart-line"/>${circles}${dateLabels}</svg></div>${trend}`;
}

export function renderExerciseLoadChart(exerciseId) {
  if (!exerciseId) return `<div class="chart-empty"><strong>Нет упражнений с записанными подходами</strong><span>Добавь подходы во время тренировки, и здесь появится график рабочих весов.</span></div>`;
  const exercises = getExerciseLibrary();
  const exercise = exercises.find(item => item.id === exerciseId);
  const history = getExerciseLoadHistory(exerciseId);
  const subtitle = exercise ? `Максимальный записанный рабочий вес в упражнении «${exercise.name}» по тренировочным дням.` : 'Динамика рабочего веса.';
  return `${renderLineChart(history, 'weightKg', 'кг', subtitle)}<p class="chart-footnote">Для каждой даты отображается самый тяжёлый записанный подход. Это фактический рабочий вес, а не расчётный 1ПМ.</p>`;
}

export function renderProgressSection() {
  const profile = readJSON(PROFILE_KEY, {}) || {};
  const weightHistory = getBodyWeightHistory();
  const loggedIds = getLoggedExerciseIds();
  const library = getExerciseLibrary();
  const loggedExercises = loggedIds.map(id => library.find(item => item.id === id)).filter(Boolean);
  const selectedId = loggedExercises[0]?.id || '';
  return `<section class="progress-section">
    <div class="progress-section-heading"><div><div class="panel-eyebrow">ТРЕНИРОВОЧНАЯ АНАЛИТИКА</div><h2>Динамика нагрузки</h2><p class="panel-description">Отслеживай изменения веса тела и рабочих весов по датам.</p></div><span class="panel-mark">02</span></div>
    <div class="progress-chart-grid">
      <article class="progress-chart-card">
        <div class="progress-chart-heading"><div><h3>Вес тела</h3><p>Измерения по датам</p></div><strong>${weightHistory.length ? `${fmt(weightHistory.at(-1).weightKg)} кг` : '—'}</strong></div>
        ${renderLineChart(weightHistory, 'weightKg', 'кг', 'Изменение массы тела во времени.')}
        <form id="bodyweight-form" class="bodyweight-form">
          <label><span>Вес, кг</span><input class="profile-input" type="number" name="weightKg" min="20" max="350" step="0.1" required placeholder="75.0" value="${profile.weightKg ? escapeHTML(profile.weightKg) : ''}"></label>
          <label><span>Дата</span><input class="profile-input" type="date" name="date" required value="${localTodayISO()}"></label>
          <button class="btn btn-accent" type="submit">Добавить измерение</button>
        </form>
        <p class="chart-footnote">Новая запись за ту же дату заменяет предыдущую. Запись за сегодня обновляет текущий вес профиля; прошедшая дата дополняет график, не меняя текущий вес.</p>
      </article>
      <article class="progress-chart-card">
        <div class="progress-chart-heading"><div><h3>Рабочие веса</h3><p>Самый тяжёлый подход за день</p></div><strong>${loggedExercises.length} упр.</strong></div>
        <label class="chart-select-label" for="load-exercise-select">Упражнение</label>
        <select class="profile-input" id="load-exercise-select" ${loggedExercises.length ? '' : 'disabled'}>
          ${loggedExercises.length ? loggedExercises.map(item => `<option value="${escapeHTML(item.id)}">${escapeHTML(item.name)}</option>`).join('') : '<option value="">Нет записей</option>'}
        </select>
        <div id="load-progress-chart" class="load-progress-chart">${renderExerciseLoadChart(selectedId)}</div>
      </article>
    </div>
  </section>`;
}

export function initProgress(root, onChanged) {
  if (!root || root.dataset.progressInitialized === 'true') return;
  root.dataset.progressInitialized = 'true';

  // Carry forward the current profile weight as the first graph point for upgraded installs.
  const currentProfile = readJSON(PROFILE_KEY, {}) || {};
  if (Number(currentProfile.weightKg) > 0 && getBodyWeightHistory().length === 0) {
    addBodyWeightEntry(currentProfile.weightKg, localTodayISO());
  }

  root.addEventListener('submit', event => {
    if (event.target.id !== 'bodyweight-form') return;
    event.preventDefault();
    const data = new FormData(event.target);
    const weightKg = Number(data.get('weightKg'));
    const date = String(data.get('date') || '');
    if (!Number.isFinite(weightKg) || weightKg < 20 || weightKg > 350) {
      if (typeof window.showToast === 'function') window.showToast('Вес должен быть от 20 до 350 кг');
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      if (typeof window.showToast === 'function') window.showToast('Укажи корректную дату измерения');
      return;
    }
    if (!addBodyWeightEntry(weightKg, date)) {
      if (typeof window.showToast === 'function') window.showToast('Не удалось сохранить измерение');
      return;
    }
    // A backdated measurement belongs to the chart, not to the current profile value.
    // Only today's measurement should replace the current weight shown in the profile.
    if (date === localTodayISO()) {
      const profile = readJSON(PROFILE_KEY, {}) || {};
      profile.weightKg = weightKg;
      profile.updatedAt = new Date().toISOString();
      writeJSON(PROFILE_KEY, profile);
    }
    if (typeof window.showToast === 'function') window.showToast('Измерение веса сохранено');
    onChanged?.();
  });

  root.addEventListener('change', event => {
    if (event.target.id !== 'load-exercise-select') return;
    const output = root.querySelector('#load-progress-chart');
    if (output) output.innerHTML = renderExerciseLoadChart(event.target.value);
  });
}


// Dedicated progress screen. Profile data stays in the profile view; charts and
// dated weight measurements live here as an independent navigation destination.
let progressPageRoot = null;

export function renderProgressPage() {
  if (!progressPageRoot) return;
  progressPageRoot.innerHTML = `
    <div class="progress-page-intro">
      <div class="section-eyebrow">ЛИЧНЫЕ РЕЗУЛЬТАТЫ</div>
      <h1 class="profile-title">Прогресс</h1>
      <p class="profile-subtitle">Записывай личные рекорды и отслеживай, как меняются твои рабочие веса.</p>
    </div>
    ${renderAchievementsSection()}
    ${renderProgressSection()}
  `;
}

export function initProgressPage() {
  progressPageRoot = document.getElementById('progress-content');
  if (!progressPageRoot || progressPageRoot.dataset.pageInitialized === 'true') return;
  progressPageRoot.dataset.pageInitialized = 'true';
  const rerender = () => renderProgressPage();
  initProgress(progressPageRoot, rerender);
  initAchievements(progressPageRoot, rerender);
  renderProgressPage();
}
