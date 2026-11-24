/** Small, defensive localStorage wrapper. All app data remains on this device/browser. */
export function readJSON(key, fallback = null) {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? fallback : JSON.parse(raw);
  } catch (error) {
    console.warn(`[GYM LOG] Не удалось прочитать ${key}`, error);
    return fallback;
  }
}

export function writeJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.error(`[GYM LOG] Не удалось сохранить ${key}`, error);
    return false;
  }
}

export function removeKey(key) {
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.warn(`[GYM LOG] Не удалось удалить ${key}`, error);
  }
}
