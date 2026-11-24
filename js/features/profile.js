import { readJSON, writeJSON } from '../core/storage.js';
import { calculateBodyMetrics } from '../core/metrics.js';
import { addBodyWeightEntry, localTodayISO } from '../core/training-log.js';
import { initProgress, renderProgressSection } from './progress.js';

const PROFILE_KEY = 'gym_profile_v1';
const RECORDS_KEY = 'gym_achievements_v1';
let editingRecordId = null;
let isRecordFormOpen = false;
let root = null;

const todayISO = () => { const now = new Date(); now.setMinutes(now.getMinutes() - now.getTimezoneOffset()); return now.toISOString().slice(0, 10); };
const number = value => Number.parseFloat(value);
const kg = value => `${Number(value).toLocaleString('ru-RU', { maximumFractionDigits: 1 })} кг`;
const safeText = value => String(value ?? '').replace(/[&<>"']/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[char]));

function loadProfile() {
  const value = readJSON(PROFILE_KEY, {});
  return value && typeof value === 'object' ? value : {};
}

function loadRecords() {
  const value = readJSON(RECORDS_KEY, []);
  return Array.isArray(value) ? value : [];
}

function showMessage(message) {
  if (typeof window.showToast === 'function') window.showToast(message);
}

function profileValues() {
  const form = root?.querySelector('#profile-form');
  if (!form) return null;
  const data = new FormData(form);
  return {
    weightKg: number(data.get('weightKg')),
    heightCm: number(data.get('heightCm')),
    age: data.get('age') ? number(data.get('age')) : null,
    targetWeightKg: data.get('targetWeightKg') ? number(data.get('targetWeightKg')) : null
  };
}

function renderMetricCard(profile) {
  const hasData = Number(profile.weightKg) > 0 && Number(profile.heightCm) > 0;
  if (!hasData) {
    return `<div class="bmi-empty">
      <div class="bmi-empty-icon">◎</div>
      <strong>Добавьте рост и вес</strong>
      <span>Здесь появится расчёт ИМТ и ориентиры по диапазону веса.</span>
    </div>`;
  }

  const result = calculateBodyMetrics(profile.weightKg, profile.heightCm, profile.age);
  const needsAdultScale = result.isUnder18 || result.needsAge;
  const bmiColor = needsAdultScale ? 'neutral' : result.bmi > 24.9 ? 'warning' : result.bmi < 18.5 ? 'info' : 'positive';
  const goalLine = !needsAdultScale && Number(profile.targetWeightKg) > 0
    ? `<div class="bmi-detail-row"><span>Разница до указанной цели</span><strong>${kg(Math.abs(Number(profile.weightKg) - Number(profile.targetWeightKg)))}</strong></div>`
    : '';
  const boundaryLine = needsAdultScale ? '' : result.differenceLabel
    ? `<div class="bmi-target"><span>${safeText(result.differenceLabel)}</span><strong>${kg(result.difference)}</strong></div>`
    : `<div class="bmi-target"><span>Диапазон веса при текущем росте</span><strong>${kg(result.lowerWeight)} – ${kg(result.upperWeight)}</strong></div>`;

  return `<div class="bmi-result">
    <div class="bmi-score-row">
      <div>
        <div class="bmi-kicker">Индекс массы тела</div>
        <div class="bmi-score">${result.bmi.toFixed(1)}</div>
      </div>
      <span class="bmi-status ${bmiColor}">${safeText(result.category)}</span>
    </div>
    ${needsAdultScale ? '' : `<div class="bmi-meter" aria-hidden="true"><span class="bmi-meter-marker" style="left:${Math.max(2, Math.min(98, ((result.bmi - 12) / 28) * 100))}%"></span></div><div class="bmi-scale"><span>Ниже</span><span>Стандартный диапазон</span><span>Выше</span></div>`}
    <p class="bmi-message">${safeText(result.message)}</p>
    ${boundaryLine}
    ${goalLine}
    <p class="bmi-footnote">ИМТ — приблизительный скрининговый показатель для взрослых 18+; для его интерпретации укажите возраст. Он не учитывает долю мышц, телосложение и распределение жира. Разница до границы диапазона не является рекомендацией или обязательной целью снижения веса. Для возраста до 18 лет нужна отдельная оценка.</p>
  </div>`;
}

function renderRecordForm(record = null) {
  if (!isRecordFormOpen) return '';
  const isEditing = Boolean(record);
  return `<form class="record-form" id="achievement-form">
    <div class="record-form-heading">${isEditing ? 'Изменить достижение' : 'Новое достижение'}</div>
    <label class="field-label" for="record-exercise">Тренажёр или упражнение</label>
    <input class="profile-input" id="record-exercise" name="exercise" maxlength="90" required placeholder="Например, жим лёжа" value="${safeText(record?.exercise || '')}">
    <div class="form-grid-two">
      <div>
        <label class="field-label" for="record-weight">Максимальный вес, кг</label>
        <input class="profile-input" id="record-weight" name="weight" type="number" min="0.1" max="1000" step="0.1" required placeholder="80" value="${record ? safeText(record.weight) : ''}">
      </div>
      <div>
        <label class="field-label" for="record-reps">Повторения</label>
        <input class="profile-input" id="record-reps" name="reps" type="number" min="1" max="1000" step="1" placeholder="8" value="${record?.reps ? safeText(record.reps) : ''}">
      </div>
    </div>
    <label class="field-label" for="record-date">Дата результата</label>
    <input class="profile-input" id="record-date" name="date" type="date" required value="${safeText(record?.date || todayISO())}">
    <label class="field-label" for="record-note">Комментарий <span class="field-optional">необязательно</span></label>
    <textarea class="profile-input profile-textarea" id="record-note" name="note" maxlength="240" rows="2" placeholder="Например, новый личный рекорд">${safeText(record?.note || '')}</textarea>
    <div class="record-form-actions">
      <button class="btn btn-accent" type="submit">${isEditing ? 'Сохранить изменения' : 'Сохранить достижение'}</button>
      <button class="btn btn-outline" type="button" data-action="cancel-record">Отмена</button>
    </div>
  </form>`;
}

function renderRecords(records) {
  if (!records.length) {
    return `<div class="achievement-empty">
      <div class="achievement-empty-mark">PR</div>
      <strong>Пока нет личных рекордов</strong>
      <span>Добавьте упражнение и вес, с которым вы выполнили лучший подход.</span>
    </div>`;
  }

  const bestByExercise = new Map();
  for (const record of records) {
    const key = String(record.exercise || '').trim().toLocaleLowerCase('ru');
    bestByExercise.set(key, Math.max(bestByExercise.get(key) || 0, Number(record.weight) || 0));
  }

  return `<div class="achievement-list">${records
    .slice()
    .sort((a, b) => String(b.date).localeCompare(String(a.date)))
    .map(record => {
      const key = String(record.exercise || '').trim().toLocaleLowerCase('ru');
      const isBest = Number(record.weight) >= bestByExercise.get(key);
      const date = record.date ? new Date(`${record.date}T00:00:00`).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Без даты';
      return `<article class="achievement-card">
        <div class="achievement-icon">${safeText(String(record.exercise || 'PR').trim().slice(0, 2).toUpperCase())}</div>
        <div class="achievement-main">
          <div class="achievement-title-row"><strong>${safeText(record.exercise)}</strong>${isBest ? '<span class="record-best">ЛУЧШИЙ</span>' : ''}</div>
          <div class="achievement-meta">${date}${record.reps ? ` · ${safeText(record.reps)} повт.` : ''}</div>
          ${record.note ? `<div class="achievement-note">${safeText(record.note)}</div>` : ''}
        </div>
        <div class="achievement-result"><strong>${kg(record.weight)}</strong><div>вес</div></div>
        <div class="achievement-actions">
          <button class="icon-action" type="button" data-action="edit-record" data-id="${safeText(record.id)}" aria-label="Изменить достижение" title="Изменить">✎</button>
          <button class="icon-action danger" type="button" data-action="delete-record" data-id="${safeText(record.id)}" aria-label="Удалить достижение" title="Удалить">×</button>
        </div>
      </article>`;
    }).join('')}
  </div>`;
}

export function renderProfile() {
  if (!root) return;
  const profile = loadProfile();
  const records = loadRecords();
  const currentEdit = editingRecordId ? records.find(item => item.id === editingRecordId) : null;
  const form = renderRecordForm(currentEdit);
  const initials = profile.name ? safeText(profile.name.trim().slice(0, 1).toUpperCase()) : 'G';

  root.innerHTML = `<div class="profile-heading">
      <div><div class="section-eyebrow">ЛИЧНЫЙ КАБИНЕТ</div><h1 class="profile-title">Профиль</h1><p class="profile-subtitle">Показатели тела и личные рекорды в одном месте.</p></div>
      <div class="profile-avatar">${initials}</div>
    </div>
    <div class="profile-grid">
      <section class="profile-panel profile-data-panel">
        <div class="panel-heading"><div><div class="panel-eyebrow">МОИ ДАННЫЕ</div><h2>Параметры тела</h2></div><span class="panel-mark">01</span></div>
        <form id="profile-form">
          <div class="profile-form-grid">
            <div><label class="field-label" for="profile-name">Имя <span class="field-optional">необязательно</span></label><input class="profile-input" id="profile-name" name="name" maxlength="40" autocomplete="name" placeholder="Как к вам обращаться" value="${safeText(profile.name || '')}"></div>
            <div><label class="field-label" for="profile-age">Возраст, лет <span class="field-optional">необязательно</span></label><input class="profile-input" id="profile-age" name="age" type="number" min="1" max="100" step="1" placeholder="Например, 25" value="${profile.age ? safeText(profile.age) : ''}"></div>
            <div><label class="field-label" for="profile-weight">Текущий вес, кг</label><input class="profile-input" id="profile-weight" name="weightKg" type="number" min="20" max="350" step="0.1" required placeholder="75.0" value="${profile.weightKg ? safeText(profile.weightKg) : ''}"></div>
            <div><label class="field-label" for="profile-height">Рост, см</label><input class="profile-input" id="profile-height" name="heightCm" type="number" min="100" max="250" step="0.1" required placeholder="180" value="${profile.heightCm ? safeText(profile.heightCm) : ''}"></div>
            <div class="profile-field-wide"><label class="field-label" for="profile-goal">Желаемый вес, кг <span class="field-optional">необязательно</span></label><input class="profile-input" id="profile-goal" name="targetWeightKg" type="number" min="20" max="350" step="0.1" placeholder="Укажите личную цель" value="${profile.targetWeightKg ? safeText(profile.targetWeightKg) : ''}"></div>
          </div>
          <button class="btn btn-accent profile-save" type="submit">Сохранить параметры</button>
          <div class="profile-save-hint">Данные сохраняются в локальном хранилище этого браузера.</div>
        </form>
      </section>
      <section class="profile-panel bmi-panel">
        <div class="panel-heading"><div><div class="panel-eyebrow">АНАЛИЗ ПОКАЗАТЕЛЕЙ</div><h2>Индекс массы тела</h2></div><span class="panel-mark">02</span></div>
        <div id="bmi-output">${renderMetricCard(profile)}</div>
      </section>
    </div>
    ${renderProgressSection()}
    <section class="profile-panel achievements-panel">
      <div class="achievements-header">
        <div class="panel-heading"><div><div class="panel-eyebrow">ПРОГРЕСС В ЗАЛЕ</div><h2>Достижения</h2><p class="panel-description">История максимальных весов по упражнениям и тренажёрам.</p></div><span class="panel-mark">03</span></div>
        <button class="btn btn-accent add-record-btn" type="button" data-action="add-record"><span aria-hidden="true">＋</span> Добавить рекорд</button>
      </div>
      ${form}
      <div id="achievement-list">${renderRecords(records)}</div>
    </section>
    <p class="profile-privacy-note"><span>i</span> Профиль и достижения хранятся только в этом браузере. При очистке данных сайта или смене устройства записи не синхронизируются автоматически.</p>`;
}

function updateBmiPreview() {
  const values = profileValues();
  if (!values) return;
  const target = root.querySelector('#bmi-output');
  if (!target) return;
  target.innerHTML = renderMetricCard(values);
}

function saveProfile(event) {
  event.preventDefault();
  const values = profileValues();
  const formData = new FormData(event.target);
  const name = String(formData.get('name') || '').trim();
  if (!Number.isFinite(values.weightKg) || values.weightKg < 20 || values.weightKg > 350) {
    showMessage('Укажите вес от 20 до 350 кг');
    root.querySelector('#profile-weight')?.focus();
    return;
  }
  if (!Number.isFinite(values.heightCm) || values.heightCm < 100 || values.heightCm > 250) {
    showMessage('Укажите рост от 100 до 250 см');
    root.querySelector('#profile-height')?.focus();
    return;
  }
  if (values.age !== null && (!Number.isInteger(values.age) || values.age < 1 || values.age > 100)) {
    showMessage('Возраст должен быть от 1 до 100 лет');
    return;
  }
  if (values.targetWeightKg !== null && (values.targetWeightKg < 20 || values.targetWeightKg > 350)) {
    showMessage('Целевой вес должен быть от 20 до 350 кг');
    return;
  }

  const previousProfile = loadProfile();
  const saved = writeJSON(PROFILE_KEY, { ...values, name, updatedAt: new Date().toISOString() });
  if (saved) {
    if (Number(previousProfile.weightKg) !== Number(values.weightKg)) addBodyWeightEntry(values.weightKg, localTodayISO());
    renderProfile();
    showMessage('Параметры профиля сохранены');
  } else {
    showMessage('Не удалось сохранить данные браузера');
  }
}

function saveRecord(event) {
  event.preventDefault();
  const data = new FormData(event.target);
  const exercise = String(data.get('exercise') || '').trim();
  const weight = number(data.get('weight'));
  const repsRaw = String(data.get('reps') || '').trim();
  const reps = repsRaw ? Number.parseInt(repsRaw, 10) : null;
  const date = String(data.get('date') || '');
  const note = String(data.get('note') || '').trim();

  if (!exercise || exercise.length > 90) return showMessage('Укажите упражнение или тренажёр');
  if (!Number.isFinite(weight) || weight <= 0 || weight > 1000) return showMessage('Укажите корректный вес от 0,1 до 1000 кг');
  if (reps !== null && (!Number.isInteger(reps) || reps < 1 || reps > 1000)) return showMessage('Количество повторений должно быть от 1 до 1000');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return showMessage('Укажите дату достижения');

  const records = loadRecords();
  const existing = editingRecordId ? records.find(item => item.id === editingRecordId) : null;
  const key = exercise.toLocaleLowerCase('ru');
  const previousBest = records
    .filter(item => item.id !== editingRecordId && String(item.exercise).trim().toLocaleLowerCase('ru') === key)
    .reduce((max, item) => Math.max(max, Number(item.weight) || 0), 0);
  const record = {
    id: existing?.id || (globalThis.crypto?.randomUUID?.() || `record-${Date.now()}`),
    exercise,
    weight,
    reps,
    date,
    note,
    createdAt: existing?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  const next = existing ? records.map(item => item.id === editingRecordId ? record : item) : [...records, record];
  if (writeJSON(RECORDS_KEY, next)) {
    editingRecordId = null;
    isRecordFormOpen = false;
    renderProfile();
    showMessage(weight > previousBest ? 'Новый личный рекорд сохранён!' : 'Достижение сохранено');
  } else {
    showMessage('Не удалось сохранить достижение');
  }
}

function handleClick(event) {
  const button = event.target.closest('[data-action]');
  if (!button) return;
  const action = button.dataset.action;
  const id = button.dataset.id;

  if (action === 'add-record') {
    editingRecordId = null;
    isRecordFormOpen = true;
    renderProfile();
    root.querySelector('#record-exercise')?.focus();
  } else if (action === 'cancel-record') {
    editingRecordId = null;
    isRecordFormOpen = false;
    renderProfile();
  } else if (action === 'edit-record') {
    editingRecordId = id;
    isRecordFormOpen = true;
    renderProfile();
    root.querySelector('#record-exercise')?.focus();
  } else if (action === 'delete-record') {
    const record = loadRecords().find(item => item.id === id);
    if (!record || !window.confirm(`Удалить достижение «${record.exercise}»?`)) return;
    const next = loadRecords().filter(item => item.id !== id);
    if (writeJSON(RECORDS_KEY, next)) {
      renderProfile();
      showMessage('Достижение удалено');
    }
  }
}

export function initProfile() {
  root = document.getElementById('profile-content');
  if (!root || root.dataset.initialized === 'true') return;
  root.dataset.initialized = 'true';
  initProgress(root, () => renderProfile());
  root.addEventListener('submit', event => {
    if (event.target.id === 'profile-form') saveProfile(event);
    if (event.target.id === 'achievement-form') saveRecord(event);
  });
  root.addEventListener('click', handleClick);
  root.addEventListener('input', event => {
    if (['profile-weight', 'profile-height', 'profile-age', 'profile-goal'].includes(event.target.id)) updateBmiPreview();
  });
  renderProfile();
}
