import { loadTasks, renderDaily, renderWeekly, openSheet, closeSheet, confirmSheet, showModal, hideModal, confirmDelete } from './tasks.js';
import { loadEvents, openEventSheet, closeEventSheet, saveEvent, deleteEvent, getEvents } from './events.js';
import { renderCalendar, calPrev, calNext, calGoToday, setCalView } from './calendar.js';
import { updateNotifBtn, toggleNotifications } from './notifications.js';
import { exportToCSV } from './export.js';
import { formatDate, formatWeekRange } from './utils.js';
import { initAuth, signOut } from './auth.js';
import { renderProfile, updateProfileNotif, handleSignOut, handleDeleteAccount, handleLinkGoogle, handleExportEvents } from './profile.js';

function registerSW() {
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {});
}

let currentTab = 'daily';
function switchTab(name) {
  currentTab = name;
  document.querySelectorAll('.tab').forEach(t =>
    t.classList.toggle('active', t.dataset.tab === name));
  ['daily', 'weekly', 'agenda', 'profile'].forEach(p => {
    const el = document.getElementById(`panel-${p}`);
    el.classList.toggle('active', p === name);
    el.classList.toggle('hidden', p !== name);
  });
  if (name === 'agenda') renderCalendar();
  if (name === 'profile') renderProfile();
}

document.addEventListener('DOMContentLoaded', async () => {
  const user = await initAuth();
  if (!user) { window.location.href = 'login.html'; return; }

  loadTasks();
  loadEvents();
  registerSW();

  // Bridge: events.js dispatches 'calendar:refresh' to avoid circular import
  document.addEventListener('calendar:refresh', renderCalendar);

  document.getElementById('date-label').textContent = formatDate(new Date());
  document.getElementById('week-label').textContent  = formatWeekRange();

  renderDaily();
  renderWeekly();
  updateNotifBtn();

  // Tabs
  document.querySelectorAll('.tab').forEach(btn =>
    btn.addEventListener('click', () => switchTab(btn.dataset.tab)));

  // Task + buttons
  document.querySelectorAll('.add-panel-btn[data-panel]').forEach(btn =>
    btn.addEventListener('click', () => openSheet(btn.dataset.panel)));

  // Task sheet
  document.getElementById('sheet-confirm').addEventListener('click', confirmSheet);
  document.getElementById('sheet-cancel').addEventListener('click', closeSheet);
  document.getElementById('sheet-input').addEventListener('keydown', e => {
    if (e.key === 'Enter') confirmSheet();
    if (e.key === 'Escape') closeSheet();
  });
  document.getElementById('sheet-overlay').addEventListener('click', e => {
    if (e.target === e.currentTarget) closeSheet();
  });

  // Calendar export
  document.getElementById('cal-export-btn').addEventListener('click', () => exportToCSV(getEvents()));

  // Event sheet
  document.getElementById('cal-add-btn').addEventListener('click', () => openEventSheet());
  document.getElementById('ev-save').addEventListener('click', saveEvent);
  document.getElementById('ev-cancel').addEventListener('click', closeEventSheet);
  document.getElementById('ev-delete').addEventListener('click', deleteEvent);
  document.getElementById('ev-title').addEventListener('keydown', e => {
    if (e.key === 'Enter') saveEvent();
    if (e.key === 'Escape') closeEventSheet();
  });
  document.getElementById('event-sheet-overlay').addEventListener('click', e => {
    if (e.target === e.currentTarget) closeEventSheet();
  });

  // Calendar nav
  document.getElementById('cal-prev').addEventListener('click', calPrev);
  document.getElementById('cal-next').addEventListener('click', calNext);
  document.getElementById('cal-today').addEventListener('click', calGoToday);
  document.querySelectorAll('.cal-view-btn').forEach(btn =>
    btn.addEventListener('click', () => setCalView(btn.dataset.view)));

  // Profile panel
  document.getElementById('profile-signout-btn').addEventListener('click', handleSignOut);
  document.getElementById('profile-delete-btn').addEventListener('click', handleDeleteAccount);
  document.getElementById('profile-link-google-btn').addEventListener('click', handleLinkGoogle);
  document.getElementById('profile-export-btn').addEventListener('click', handleExportEvents);
  document.getElementById('profile-notif-row').addEventListener('click', async () => {
    await toggleNotifications();
    updateProfileNotif();
  });

  // Notifications (header quick-toggle)
  document.getElementById('btn-notify').addEventListener('click', toggleNotifications);

  // Delete modal
  document.getElementById('modal-cancel').addEventListener('click', hideModal);
  document.getElementById('modal-confirm').addEventListener('click', confirmDelete);
  document.getElementById('modal-overlay').addEventListener('click', e => {
    if (e.target === e.currentTarget) hideModal();
  });
});
