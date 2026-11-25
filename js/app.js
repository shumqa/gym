import { loadSession, renderToday, renderSchedule, showToast } from './features/training.js';
import { initProfile, renderProfile } from './features/profile.js';
import { initSetLog } from './features/set-log.js';
import { initCatalog, renderCatalog } from './features/catalog.js';
import { initProgressPage, renderProgressPage } from './features/progress.js';
import { initTheme, toggleTheme } from './features/theme.js';
import './features/clock.js';

const VIEWS = new Set(['today', 'schedule', 'catalog', 'progress', 'timer', 'profile']);
let currentView = 'today';

export function switchView(view) {
  if (!VIEWS.has(view)) return;
  currentView = view;

  document.querySelectorAll('.view').forEach(element => {
    const active = element.id === `view-${view}`;
    element.classList.toggle('active', active);
    element.style.display = active ? (view === 'timer' ? 'flex' : 'block') : 'none';
  });

  document.querySelectorAll('.nav-btn').forEach(element => {
    const active = element.id === `nav-${view}`;
    element.classList.toggle('active', active);
    element.setAttribute('aria-current', active ? 'page' : 'false');
  });
  const profileShortcut = document.querySelector('.profile-shortcut');
  if (profileShortcut) {
    profileShortcut.classList.toggle('active', view === 'profile');
    profileShortcut.setAttribute('aria-current', view === 'profile' ? 'page' : 'false');
  }

  if (view === 'today') renderToday();
  if (view === 'schedule') renderSchedule();
  if (view === 'catalog') renderCatalog();
  if (view === 'progress') renderProgressPage();
  if (view === 'profile') renderProfile();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Bridge only the functions used by the existing inline controls.
Object.assign(window, { switchView, toggleTheme, showToast });

function updateHeaderDate() {
  const now = new Date();
  const months = ['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря'];
  const days = ['Воскресенье','Понедельник','Вторник','Среда','Четверг','Пятница','Суббота'];
  const node = document.getElementById('topbar-date');
  if (node) node.innerHTML = `<div>${now.getDate()} ${months[now.getMonth()]}</div><div>${days[now.getDay()]}</div>`;
}

function initApp() {
  initTheme();
  loadSession();
  initProfile();
  initSetLog(document.getElementById('today-content'));
  initCatalog();
  initProgressPage();
  updateHeaderDate();
  renderToday();
  if (document.getElementById('view-today')) {
    document.getElementById('view-today').style.display = 'block';
    document.getElementById('view-profile').style.display = 'none';
  }
  if (currentView === 'today') {
    document.getElementById('nav-today')?.setAttribute('aria-current', 'page');
  }
}

initApp();
