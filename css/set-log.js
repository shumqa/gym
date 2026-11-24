import {
  addSetEntry,
  deleteSetEntry,
  getLastSet,
  getSetsForExercise
} from '../core/training-log.js';

const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[char]));

function fmt(value) {
  return Number(value).toLocaleString('ru-RU', { maximumFractionDigits: 2 });
}

export function renderSetLogger(exercise, sessionId, workoutId) {
  const sets = getSetsForExercise(exercise.id, sessionId);
  const previous = getLastSet(exercise.id, sessionId);
  const previousLine = previous
    ? `<p class="set-previous">Последний раз: <strong>${fmt(previous.weightKg)} кг × ${previous.reps}</strong> · ${new Date(previous.date).toLocaleDateString('ru-RU')}</p>`
    : '<p class="set-previous">Пока нет прошлых записей для этого упражнения.</p>';
  const rows = sets.length ? `<div class="set-table-wrap"><table class="set-table"><thead><tr><th>№</th><th>Вес</th><th>Повт.</th><th>Усилие</th><th></th></tr></thead><tbody>${sets.map(set => `
    <tr><td>${set.setNumber}</td><td>${fmt(set.weightKg)} кг</td><td>${set.reps}</td><td>${set.effortType.toUpperCase()} ${fmt(set.effortValue)}</td><td><button class="set-delete" type="button" data-action="delete-set" data-id="${escapeHTML(set.id)}" data-exercise-id="${escapeHTML(exercise.id)}" data-session-id="${escapeHTML(sessionId)}" data-workout-id="${escapeHTML(workoutId)}" aria-label="Удалить подход">×</button></td></tr>
  `).join('')}</tbody></table></div>` : '<p class="set-empty">Добавь первый подход, чтобы начать историю рабочих весов.</p>';

  return `<details class="set-log" data-set-log="${escapeHTML(exercise.id)}" data-session-id="${escapeHTML(sessionId)}" data-workout-id="${escapeHTML(workoutId)}" ${sets.length ? 'open' : ''}>
    <summary><span>Журнал подходов</span><span class="set-count">${sets.length} ${sets.length === 1 ? 'подход' : sets.length >= 2 && sets.length <= 4 ? 'подхода' : 'подходов'}</span></summary>
    <div class="set-log-content">
      ${previousLine}
      ${rows}
      <form class="set-log-form" data-set-form data-exercise-id="${escapeHTML(exercise.id)}" data-session-id="${escapeHTML(sessionId)}" data-workout-id="${escapeHTML(workoutId)}" data-exercise-name="${escapeHTML(exercise.name)}">
        <label><span>Вес, кг</span><input name="weightKg" type="number" min="0" max="1500" step="0.25" inputmode="decimal" required placeholder="Напр. 60" value="${previous ? escapeHTML(previous.weightKg) : ''}"></label>
        <label><span>Повторы</span><input name="reps" type="number" min="1" max="1000" step="1" inputmode="numeric" required placeholder="8" value="${previous ? escapeHTML(previous.reps) : ''}"></label>
        <label><span>Оценка</span><select name="effortType"><option value="rpe">RPE</option><option value="rir">RIR</option></select></label>
        <label><span>Значение</span><input name="effortValue" type="number" min="1" max="10" step="0.5" required value="8" aria-label="Значение RPE или RIR"></label>
        <button class="btn btn-accent set-add-btn" type="submit">＋ Подход</button>
      </form>
      <p class="set-help">RPE: субъективная тяжесть от 1 до 10. RIR: сколько повторений осталось в запасе (0–10). Выбери один формат для каждого подхода.</p>
    </div>
  </details>`;
}

function toast(message) {
  if (typeof window.showToast === 'function') window.showToast(message);
}

export function initSetLog(root) {
  if (!root || root.dataset.setLogInitialized === 'true') return;
  root.dataset.setLogInitialized = 'true';

  root.addEventListener('submit', event => {
    const form = event.target.closest('[data-set-form]');
    if (!form) return;
    event.preventDefault();
    const data = new FormData(form);
    const result = addSetEntry({
      sessionId: form.dataset.sessionId,
      workoutId: form.dataset.workoutId,
      exerciseId: form.dataset.exerciseId,
      exerciseName: form.dataset.exerciseName,
      weightKg: data.get('weightKg'),
      reps: data.get('reps'),
      effortType: data.get('effortType'),
      effortValue: data.get('effortValue')
    });
    if (!result.ok) return toast(result.error);
    const details = form.closest('[data-set-log]');
    const exercise = { id: form.dataset.exerciseId, name: form.dataset.exerciseName };
    details.outerHTML = renderSetLogger(exercise, form.dataset.sessionId, form.dataset.workoutId);
    toast('Подход добавлен в журнал');
  });

  root.addEventListener('change', event => {
    if (!event.target.matches('[name="effortType"]')) return;
    const form = event.target.closest('[data-set-form]');
    const value = form?.querySelector('[name="effortValue"]');
    if (!value) return;
    if (event.target.value === 'rir') {
      value.min = '0';
      value.step = '1';
      value.value = '2';
    } else {
      value.min = '1';
      value.step = '0.5';
      value.value = '8';
    }
  });

  root.addEventListener('click', event => {
    const button = event.target.closest('[data-action="delete-set"]');
    if (!button) return;
    if (!window.confirm('Удалить этот подход из журнала?')) return;
    const { id, exerciseId, sessionId, workoutId } = button.dataset;
    if (!deleteSetEntry(id)) return toast('Не удалось удалить подход');
    const details = button.closest('[data-set-log]');
    const exerciseName = details?.querySelector('[data-exercise-name]')?.dataset.exerciseName
      || button.closest('.ex-card')?.querySelector('.ex-name')?.textContent
      || 'Упражнение';
    const exercise = { id: exerciseId, name: exerciseName };
    if (details) details.outerHTML = renderSetLogger(exercise, sessionId, workoutId);
    toast('Подход удалён');
  });
}
