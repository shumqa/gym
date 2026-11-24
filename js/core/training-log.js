import { readJSON, writeJSON } from './storage.js';

export const SETS_KEY = 'gym_sets_v1';
export const BODY_WEIGHT_KEY = 'gym_body_weight_history_v1';

function makeId(prefix) {
  return globalThis.crypto?.randomUUID?.() || `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function localDateISO(date = new Date()) {
  const copy = new Date(date);
  copy.setMinutes(copy.getMinutes() - copy.getTimezoneOffset());
  return copy.toISOString().slice(0, 10);
}

export function loadSetEntries() {
  const entries = readJSON(SETS_KEY, []);
  return Array.isArray(entries) ? entries.filter(item => item && typeof item === 'object') : [];
}

function saveSetEntries(entries) {
  return writeJSON(SETS_KEY, entries);
}

export function addSetEntry(input) {
  const weightKg = Number(input.weightKg);
  const reps = Number(input.reps);
  const effortType = input.effortType === 'rir' ? 'rir' : 'rpe';
  const effortValue = Number(input.effortValue);
  const effortMax = effortType === 'rpe' ? 10 : 10;
  const effortMin = effortType === 'rpe' ? 1 : 0;

  if (!Number.isFinite(weightKg) || weightKg < 0 || weightKg > 1500) return { ok: false, error: 'Укажите вес от 0 до 1500 кг' };
  if (!Number.isInteger(reps) || reps < 1 || reps > 1000) return { ok: false, error: 'Повторения должны быть целым числом от 1 до 1000' };
  if (!Number.isFinite(effortValue) || effortValue < effortMin || effortValue > effortMax || (effortType === 'rir' && !Number.isInteger(effortValue))) {
    return { ok: false, error: effortType === 'rpe' ? 'RPE должен быть от 1 до 10' : 'RIR должен быть от 0 до 10' };
  }
  if (!input.exerciseId || !input.exerciseName || !input.sessionId) return { ok: false, error: 'Не удалось определить упражнение или тренировку' };

  const entries = loadSetEntries();
  const sessionSets = entries.filter(item => item.sessionId === input.sessionId && item.exerciseId === input.exerciseId);
  const nextNumber = sessionSets.reduce((max, item) => Math.max(max, Number(item.setNumber) || 0), 0) + 1;
  const record = {
    id: makeId('set'),
    sessionId: String(input.sessionId),
    workoutId: String(input.workoutId || ''),
    exerciseId: String(input.exerciseId),
    exerciseName: String(input.exerciseName),
    setNumber: nextNumber,
    weightKg,
    reps,
    effortType,
    effortValue,
    date: input.date || new Date().toISOString(),
    day: localDateISO(new Date(input.date || Date.now()))
  };
  const ok = saveSetEntries([...entries, record]);
  return ok ? { ok: true, record } : { ok: false, error: 'Не удалось сохранить подход в браузере' };
}

export function deleteSetEntry(id) {
  const entries = loadSetEntries();
  return saveSetEntries(entries.filter(item => item.id !== id));
}

export function clearSessionSets(sessionId) {
  if (!sessionId) return true;
  const entries = loadSetEntries();
  return saveSetEntries(entries.filter(item => item.sessionId !== sessionId));
}

export function getSetsForExercise(exerciseId, sessionId = null) {
  return loadSetEntries()
    .filter(item => item.exerciseId === exerciseId && (!sessionId || item.sessionId === sessionId))
    .sort((a, b) => String(a.date).localeCompare(String(b.date)) || Number(a.setNumber) - Number(b.setNumber));
}

export function getLastSet(exerciseId, excludeSessionId = null) {
  return loadSetEntries()
    .filter(item => item.exerciseId === exerciseId && (!excludeSessionId || item.sessionId !== excludeSessionId))
    .sort((a, b) => String(b.date).localeCompare(String(a.date)))[0] || null;
}

export function getLoggedExerciseIds() {
  return [...new Set(loadSetEntries().map(item => item.exerciseId))];
}

export function getExerciseLoadHistory(exerciseId) {
  const grouped = new Map();
  for (const item of loadSetEntries().filter(set => set.exerciseId === exerciseId)) {
    const date = item.day || localDateISO(new Date(item.date));
    const current = grouped.get(date);
    if (!current || Number(item.weightKg) > current.weightKg) {
      grouped.set(date, { date, weightKg: Number(item.weightKg), reps: Number(item.reps) || null });
    }
  }
  return [...grouped.values()].sort((a, b) => a.date.localeCompare(b.date));
}

export function getBodyWeightHistory() {
  const entries = readJSON(BODY_WEIGHT_KEY, []);
  return Array.isArray(entries)
    ? entries.filter(item => item && /^\d{4}-\d{2}-\d{2}$/.test(item.date) && Number(item.weightKg) > 0).sort((a, b) => a.date.localeCompare(b.date))
    : [];
}

export function addBodyWeightEntry(weightKg, date = localDateISO()) {
  const weight = Number(weightKg);
  if (!Number.isFinite(weight) || weight < 20 || weight > 350 || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const entries = getBodyWeightHistory();
  const next = entries.filter(item => item.date !== date);
  next.push({ id: makeId('weight'), date, weightKg: weight, createdAt: new Date().toISOString() });
  next.sort((a, b) => a.date.localeCompare(b.date));
  return writeJSON(BODY_WEIGHT_KEY, next);
}

export function localTodayISO() {
  return localDateISO();
}
