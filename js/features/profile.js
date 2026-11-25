import { readJSON, writeJSON } from '../core/storage.js';
import { calculateBodyMetrics } from '../core/metrics.js';
import { addBodyWeightEntry, localTodayISO } from '../core/training-log.js';

const PROFILE_KEY = 'gym_profile_v1';
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

export function renderProfile() {
  if (!root) return;
  const profile = loadProfile();
  const initials = profile.name ? safeText(profile.name.trim().slice(0, 1).toUpperCase()) : 'G';

  root.innerHTML = `<div class="profile-heading">
      <div><div class="section-eyebrow">ЛИЧНЫЙ КАБИНЕТ</div><h1 class="profile-title">Профиль</h1><p class="profile-subtitle">Личные параметры тела и расчёт ИМТ.</p></div>
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
    <p class="profile-privacy-note"><span>i</span> Личные параметры хранятся только в этом браузере. История силовых рекордов находится отдельно — во вкладке «Прогресс».</p>`;
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

export function initProfile() {
  root = document.getElementById('profile-content');
  if (!root || root.dataset.initialized === 'true') return;
  root.dataset.initialized = 'true';
  root.addEventListener('submit', event => {
    if (event.target.id === 'profile-form') saveProfile(event);
  });
  root.addEventListener('input', event => {
    if (['profile-weight', 'profile-height', 'profile-age', 'profile-goal'].includes(event.target.id)) updateBmiPreview();
  });
  renderProfile();
}
