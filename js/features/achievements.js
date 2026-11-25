import { readJSON, writeJSON } from '../core/storage.js';
import { getExerciseLibrary } from '../data/exercise-library.js';

const RECORDS_KEY = 'gym_achievements_v1';
let root = null;
let onChanged = null;
let editingRecordId = null;
let isFormOpen = false;

const todayISO = () => {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return now.toISOString().slice(0, 10);
};
const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[char]));
const kg = value => `${Number(value).toLocaleString('ru-RU', { maximumFractionDigits: 1 })} кг`;
const notify = message => {
  if (typeof window.showToast === 'function') window.showToast(message);
};

function loadRecords() {
  const value = readJSON(RECORDS_KEY, []);
  return Array.isArray(value) ? value : [];
}

function isValidDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

function renderRecordForm(record = null) {
  if (!isFormOpen) return '';
  const editing = Boolean(record);
  const exercises = getExerciseLibrary();
  const options = exercises.map(item => `<option value="${escapeHTML(item.name)}"></option>`).join('');
  return `<form class="record-form" id="achievement-form">
    <div class="record-form-heading">${editing ? 'Изменить достижение' : 'Новое достижение'}</div>
    <label class="field-label" for="record-exercise">Упражнение или тренажёр</label>
    <input class="profile-input" id="record-exercise" name="exercise" list="achievement-exercises" maxlength="90" required autocomplete="off" placeholder="Например, жим лёжа" value="${escapeHTML(record?.exercise || '')}">
    <datalist id="achievement-exercises">${options}</datalist>
    <div class="form-grid-two">
      <div><label class="field-label" for="record-weight">Вес, кг</label><input class="profile-input" id="record-weight" name="weight" type="number" min="0.1" max="1000" step="0.1" required placeholder="80" value="${record ? escapeHTML(record.weight) : ''}"></div>
      <div><label class="field-label" for="record-reps">Повторения</label><input class="profile-input" id="record-reps" name="reps" type="number" min="1" max="1000" step="1" placeholder="8" value="${record?.reps ? escapeHTML(record.reps) : ''}"></div>
    </div>
    <label class="field-label" for="record-date">Дата результата</label>
    <input class="profile-input" id="record-date" name="date" type="date" required value="${escapeHTML(record?.date || todayISO())}">
    <label class="field-label" for="record-note">Комментарий <span class="field-optional">необязательно</span></label>
    <textarea class="profile-input profile-textarea" id="record-note" name="note" maxlength="240" rows="2" placeholder="Например, новый личный рекорд">${escapeHTML(record?.note || '')}</textarea>
    <div class="record-form-actions">
      <button class="btn btn-accent" type="submit">${editing ? 'Сохранить изменения' : 'Сохранить рекорд'}</button>
      <button class="btn btn-outline" type="button" data-achievement-action="cancel">Отмена</button>
    </div>
  </form>`;
}

function renderRecordList(records) {
  if (!records.length) {
    return `<div class="achievement-empty">
      <div class="achievement-empty-mark">PR</div>
      <strong>Пока нет записанных достижений</strong>
      <span>Добавь упражнение и вес лучшего результата. Здесь будет храниться история личных рекордов.</span>
    </div>`;
  }

  const bestByExercise = new Map();
  for (const record of records) {
    const key = String(record.exercise || '').trim().toLocaleLowerCase('ru');
    bestByExercise.set(key, Math.max(bestByExercise.get(key) || 0, Number(record.weight) || 0));
  }

  return `<div class="achievement-list">${records.slice()
    .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')) || String(b.createdAt || '').localeCompare(String(a.createdAt || '')))
    .map(record => {
      const key = String(record.exercise || '').trim().toLocaleLowerCase('ru');
      const isBest = Number(record.weight) >= bestByExercise.get(key);
      const parsedDate = record.date ? new Date(`${record.date}T00:00:00`) : null;
      const date = parsedDate && !Number.isNaN(parsedDate.getTime())
        ? parsedDate.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' })
        : 'Без даты';
      return `<article class="achievement-card">
        <div class="achievement-icon">${escapeHTML(String(record.exercise || 'PR').trim().slice(0, 2).toUpperCase())}</div>
        <div class="achievement-main">
          <div class="achievement-title-row"><strong>${escapeHTML(record.exercise)}</strong>${isBest ? '<span class="record-best">ЛИЧНЫЙ РЕКОРД</span>' : ''}</div>
          <div class="achievement-meta">${date}${record.reps ? ` · ${escapeHTML(record.reps)} повт.` : ''}</div>
          ${record.note ? `<div class="achievement-note">${escapeHTML(record.note)}</div>` : ''}
        </div>
        <div class="achievement-result"><strong>${kg(record.weight)}</strong><div>вес</div></div>
        <div class="achievement-actions">
          <button class="icon-action" type="button" data-achievement-action="edit" data-id="${escapeHTML(record.id)}" aria-label="Изменить рекорд" title="Изменить">✎</button>
          <button class="icon-action danger" type="button" data-achievement-action="delete" data-id="${escapeHTML(record.id)}" aria-label="Удалить рекорд" title="Удалить">×</button>
        </div>
      </article>`;
    }).join('')}</div>`;
}

export function renderAchievementsSection() {
  if (!root) return '';
  const records = loadRecords();
  const current = editingRecordId ? records.find(item => item.id === editingRecordId) : null;
  const exerciseCount = new Set(records.map(item => String(item.exercise || '').trim().toLocaleLowerCase('ru')).filter(Boolean)).size;
  const bestRecord = records.reduce((best, item) => !best || Number(item.weight) > Number(best.weight) ? item : best, null);
  return `<section class="progress-achievements-card">
    <div class="achievements-header">
      <div class="panel-heading"><div><div class="panel-eyebrow">ЛИЧНЫЕ РЕКОРДЫ</div><h2>Достижения</h2><p class="panel-description">Записывай лучшие веса по упражнениям и смотри, как растут результаты.</p></div><span class="panel-mark">PR</span></div>
      <button class="btn btn-accent add-record-btn" type="button" data-achievement-action="add"><span aria-hidden="true">＋</span> Добавить рекорд</button>
    </div>
    <div class="achievement-summary">
      <div><span>Записей</span><strong>${records.length}</strong></div>
      <div><span>Упражнений</span><strong>${exerciseCount}</strong></div>
      <div><span>Самый большой вес в журнале</span><strong>${bestRecord ? kg(bestRecord.weight) : '—'}</strong></div>
    </div>
    ${renderRecordForm(current)}
    <div id="achievement-list">${renderRecordList(records)}</div>
    <p class="chart-footnote">Записи сохраняются в этом браузере. Рекорды можно добавлять вручную независимо от текущей тренировки.</p>
  </section>`;
}

function saveRecord(event) {
  event.preventDefault();
  const data = new FormData(event.target);
  const exercise = String(data.get('exercise') || '').trim();
  const weight = Number.parseFloat(data.get('weight'));
  const repsRaw = String(data.get('reps') || '').trim();
  const reps = repsRaw ? Number.parseInt(repsRaw, 10) : null;
  const date = String(data.get('date') || '');
  const note = String(data.get('note') || '').trim();

  if (!exercise || exercise.length > 90) return notify('Укажи упражнение или тренажёр');
  if (!Number.isFinite(weight) || weight <= 0 || weight > 1000) return notify('Укажи корректный вес от 0,1 до 1000 кг');
  if (reps !== null && (!Number.isInteger(reps) || reps < 1 || reps > 1000)) return notify('Количество повторений должно быть от 1 до 1000');
  if (!isValidDate(date)) return notify('Укажи корректную дату достижения');

  const records = loadRecords();
  const existing = editingRecordId ? records.find(item => item.id === editingRecordId) : null;
  const key = exercise.toLocaleLowerCase('ru');
  const previousBest = records
    .filter(item => item.id !== editingRecordId && String(item.exercise || '').trim().toLocaleLowerCase('ru') === key)
    .reduce((max, item) => Math.max(max, Number(item.weight) || 0), 0);
  const record = {
    id: existing?.id || (globalThis.crypto?.randomUUID?.() || `record-${Date.now()}`),
    exercise, weight, reps, date, note,
    createdAt: existing?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  const next = existing ? records.map(item => item.id === editingRecordId ? record : item) : [...records, record];
  if (!writeJSON(RECORDS_KEY, next)) return notify('Не удалось сохранить рекорд');

  editingRecordId = null;
  isFormOpen = false;
  onChanged?.();
  notify(weight > previousBest ? 'Новый личный рекорд сохранён!' : 'Достижение сохранено');
}

function handleClick(event) {
  const button = event.target.closest('[data-achievement-action]');
  if (!button || !root?.contains(button)) return;
  const action = button.dataset.achievementAction;
  const id = button.dataset.id;

  if (action === 'add') {
    editingRecordId = null;
    isFormOpen = true;
    onChanged?.();
    root.querySelector('#record-exercise')?.focus();
  } else if (action === 'cancel') {
    editingRecordId = null;
    isFormOpen = false;
    onChanged?.();
  } else if (action === 'edit') {
    editingRecordId = id;
    isFormOpen = true;
    onChanged?.();
    root.querySelector('#record-exercise')?.focus();
  } else if (action === 'delete') {
    const record = loadRecords().find(item => item.id === id);
    if (!record || !window.confirm(`Удалить рекорд «${record.exercise}»?`)) return;
    if (writeJSON(RECORDS_KEY, loadRecords().filter(item => item.id !== id))) {
      onChanged?.();
      notify('Рекорд удалён');
    } else {
      notify('Не удалось удалить рекорд');
    }
  }
}

export function initAchievements(targetRoot, rerender) {
  if (!targetRoot || targetRoot.dataset.achievementsInitialized === 'true') return;
  root = targetRoot;
  onChanged = rerender;
  root.dataset.achievementsInitialized = 'true';
  root.addEventListener('submit', event => {
    if (event.target.id === 'achievement-form') saveRecord(event);
  });
  root.addEventListener('click', handleClick);
}
