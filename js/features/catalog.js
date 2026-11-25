import { getExerciseLibrary, EXERCISE_CATEGORIES } from '../data/exercise-library.js';
import { getActiveSessionContext } from './training.js';
import { renderSetLogger, initSetLog } from './set-log.js';

const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[char]));

let root = null;
let searchTerm = '';
let selectedCategory = 'all';
let cachedExercises = [];

function renderCards() {
  const list = cachedExercises.filter(item => {
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    const haystack = `${item.name} ${item.categoryLabel} ${item.equipment} ${item.muscles.join(' ')}`.toLocaleLowerCase('ru');
    return matchesCategory && haystack.includes(searchTerm.toLocaleLowerCase('ru'));
  });

  const target = root.querySelector('#catalog-results');
  if (!target) return;
  if (!list.length) {
    target.innerHTML = `<div class="catalog-empty"><strong>Ничего не найдено</strong><span>Измени запрос или выбери другую группу мышц.</span></div>`;
    return;
  }

  const session = getActiveSessionContext();
  target.innerHTML = list.map(item => `
    <article class="catalog-card">
      <div class="catalog-card-top"><span class="catalog-category">${escapeHTML(item.categoryLabel)}</span><span class="catalog-equipment">${escapeHTML(item.equipment)}</span></div>
      <h3>${escapeHTML(item.name)}</h3>
      <p class="catalog-note">${escapeHTML(item.note)}</p>
      <div class="catalog-muscles">${item.muscles.slice(0, 4).map(muscle => `<span>${escapeHTML(muscle)}</span>`).join('')}</div>
      <div class="catalog-links">
        <a href="${escapeHTML(item.guideUrl)}" target="_blank" rel="noopener noreferrer" title="${escapeHTML(item.guideSource)}">${escapeHTML(item.guideLabel)} ↗</a>
        <a href="${escapeHTML(item.videoUrl)}" target="_blank" rel="noopener noreferrer">${escapeHTML(item.videoLabel)} ↗</a>
      </div>
      <div class="catalog-source">Источник: ${escapeHTML(item.guideSource)}</div>
      ${session ? `<div class="catalog-extra-log">${renderSetLogger(item, session.sessionId, session.workoutId)}</div>` : ''}
    </article>
  `).join('');
  const count = root.querySelector('#catalog-count');
  if (count) count.textContent = `${list.length} упражнений`;
}

export function renderCatalog() {
  if (!root) return;
  cachedExercises = getExerciseLibrary();
  root.innerHTML = `
    <div class="catalog-heading"><div><div class="section-eyebrow">БИБЛИОТЕКА ДВИЖЕНИЙ</div><h1 class="profile-title">Каталог упражнений</h1><p class="profile-subtitle">Базовые и популярные движения для силовых тренировок. Во время активной сессии подходы можно записывать прямо здесь.</p></div><div class="catalog-total">${cachedExercises.length}<span>упражнений</span></div></div>
    <section class="catalog-toolbar">
      <label class="catalog-search"><span aria-hidden="true">⌕</span><input id="catalog-search" type="search" autocomplete="off" placeholder="Найти упражнение, мышцу или оборудование" value="${escapeHTML(searchTerm)}"></label>
      <label class="catalog-filter-label" for="catalog-category">Группа мышц</label>
      <select id="catalog-category" class="profile-input"><option value="all">Все группы мышц</option>${EXERCISE_CATEGORIES.map(item => `<option value="${item.id}" ${selectedCategory === item.id ? 'selected' : ''}>${item.label}</option>`).join('')}</select>
      <div class="catalog-results-count" id="catalog-count"></div>
    </section>
    <div class="catalog-grid" id="catalog-results"></div>
    <p class="catalog-disclaimer">Внешние материалы открываются в новой вкладке. Часть карточек ведёт на отдельное руководство с демонстрацией; для остальных доступен общий видео-справочник и поиск видео по точному названию упражнения. Смотри технику с учётом оборудования и своих ограничений.</p>
  `;
  root.querySelector('#catalog-search')?.addEventListener('input', event => {
    searchTerm = event.target.value;
    renderCards();
  });
  root.querySelector('#catalog-category')?.addEventListener('change', event => {
    selectedCategory = event.target.value;
    renderCards();
  });
  renderCards();
}

export function initCatalog() {
  root = document.getElementById('catalog-content');
  if (!root) return;
  initSetLog(root);
  renderCatalog();
}
