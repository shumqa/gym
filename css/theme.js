/** Theme preference keeps the original plain-string storage format for compatibility. */
export function applyTheme(theme) {
  const html = document.documentElement;
  const moon = document.getElementById('icon-moon');
  const sun = document.getElementById('icon-sun');
  if (theme === 'light') {
    html.setAttribute('data-theme', 'light');
    if (moon) moon.style.display = 'none';
    if (sun) sun.style.display = '';
  } else {
    html.removeAttribute('data-theme');
    if (moon) moon.style.display = '';
    if (sun) sun.style.display = 'none';
  }
}

export function toggleTheme() {
  const next = document.documentElement.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
  applyTheme(next);
  try { localStorage.setItem('gym_theme', next); } catch (error) { console.warn('[GYM LOG] Не удалось сохранить тему', error); }
}

export function initTheme() {
  let saved = 'dark';
  try {
    // Supports both the original plain strings and a JSON-encoded value.
    const raw = localStorage.getItem('gym_theme');
    if (raw === 'light' || raw === 'dark') saved = raw;
    else if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed === 'light' || parsed === 'dark') saved = parsed;
    }
  } catch (error) {
    console.warn('[GYM LOG] Не удалось прочитать тему', error);
  }
  applyTheme(saved);
}
