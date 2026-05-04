'use strict';

// ── Storage helpers ──────────────────────────────────────────────
const store = {
  get: k => JSON.parse(localStorage.getItem(k) || 'null'),
  set: (k, v) => localStorage.setItem(k, JSON.stringify(v)),
};

// ── Date utilities ───────────────────────────────────────────────
function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function weekKey() {
  const d = new Date();
  const day = d.getDay() || 7;
  const mon = new Date(d);
  mon.setDate(d.getDate() - day + 1);
  return `week-${mon.getFullYear()}-${mon.getMonth()}-${mon.getDate()}`;
}

function formatDate(d) {
  return d.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
}

function formatWeekRange() {
  const d = new Date();
  const day = d.getDay() || 7;
  const mon = new Date(d); mon.setDate(d.getDate() - day + 1);
  const sun = new Date(mon); sun.setDate(mon.getDate() + 6);
  const fmt = dt => dt.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' });
  return `${fmt(mon)} – ${fmt(sun)}`;
}

// ── Data ─────────────────────────────────────────────────────────
let dailyTasks  = [];
let weeklyTasks = [];

function loadData() {
  dailyTasks  = store.get(todayKey()) || [];
  weeklyTasks = store.get(weekKey())  || [];
}

function saveDaily()  { store.set(todayKey(), dailyTasks); }
function saveWeekly() { store.set(weekKey(),  weeklyTasks); }

function addTask(list, text) {
  list.push({ id: Date.now(), text: text.trim(), done: false });
}

// ── Render ───────────────────────────────────────────────────────
function renderList(tasks, ulEl, emptyEl, barEl, labelEl, onToggle, onDelete) {
  ulEl.innerHTML = '';
  const done = tasks.filter(t => t.done).length;
  const pct  = tasks.length ? Math.round((done / tasks.length) * 100) : 0;
  barEl.style.width = pct + '%';
  labelEl.textContent = tasks.length ? `${done}/${tasks.length}` : '';

  if (!tasks.length) { emptyEl.classList.remove('hidden'); return; }
  emptyEl.classList.add('hidden');

  tasks.forEach(task => {
    const li = document.createElement('li');
    li.className = 'task-item' + (task.done ? ' done' : '');
    li.dataset.id = task.id;

    const check = document.createElement('button');
    check.className = 'check-btn' + (task.done ? ' checked' : '');
    check.setAttribute('aria-label', task.done ? 'Desmarcar' : 'Concluir');
    check.addEventListener('click', () => onToggle(task.id));

    const span = document.createElement('span');
    span.className = 'task-text';
    span.textContent = task.text;

    const del = document.createElement('button');
    del.className = 'delete-btn';
    del.setAttribute('aria-label', 'Remover');
    del.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>`;
    del.addEventListener('click', () => onDelete(task.id));

    li.append(check, span, del);
    ulEl.appendChild(li);
  });
}

function renderDaily() {
  renderList(dailyTasks,
    document.getElementById('daily-list'),
    document.getElementById('daily-empty'),
    document.getElementById('daily-bar'),
    document.getElementById('daily-progress'),
    toggleDaily, deleteDaily);
}

function renderWeekly() {
  renderList(weeklyTasks,
    document.getElementById('weekly-list'),
    document.getElementById('weekly-empty'),
    document.getElementById('weekly-bar'),
    document.getElementById('weekly-progress'),
    toggleWeekly, deleteWeekly);
}

// ── Actions ──────────────────────────────────────────────────────
function toggleDaily(id) {
  const t = dailyTasks.find(t => t.id === id);
  if (t) { t.done = !t.done; saveDaily(); renderDaily(); }
}
function toggleWeekly(id) {
  const t = weeklyTasks.find(t => t.id === id);
  if (t) { t.done = !t.done; saveWeekly(); renderWeekly(); }
}

let pendingDeleteId   = null;
let pendingDeleteType = null;

function deleteDaily(id)  { pendingDeleteId = id; pendingDeleteType = 'daily';  showModal(); }
function deleteWeekly(id) { pendingDeleteId = id; pendingDeleteType = 'weekly'; showModal(); }

function confirmDelete() {
  if (pendingDeleteType === 'daily') {
    dailyTasks = dailyTasks.filter(t => t.id !== pendingDeleteId);
    saveDaily(); renderDaily();
  } else {
    weeklyTasks = weeklyTasks.filter(t => t.id !== pendingDeleteId);
    saveWeekly(); renderWeekly();
  }
  hideModal();
}

function showModal() { document.getElementById('modal-overlay').classList.remove('hidden'); }
function hideModal() {
  document.getElementById('modal-overlay').classList.add('hidden');
  pendingDeleteId = null; pendingDeleteType = null;
}

// ── Tabs ─────────────────────────────────────────────────────────
function switchTab(name) {
  document.querySelectorAll('.tab').forEach(t =>
    t.classList.toggle('active', t.dataset.tab === name));
  ['daily', 'weekly'].forEach(p => {
    const el = document.getElementById(`panel-${p}`);
    el.classList.toggle('active', p === name);
    el.classList.toggle('hidden', p !== name);
  });
}

// ── Notifications ────────────────────────────────────────────────
let notifEnabled = store.get('notif-enabled') || false;

function updateNotifBtn() {
  const btn = document.getElementById('btn-notify');
  btn.classList.toggle('active', notifEnabled);
  btn.title = notifEnabled ? 'Notificações ativas' : 'Ativar notificações';
}

async function toggleNotifications() {
  if (!('Notification' in window)) {
    alert('Seu navegador não suporta notificações.'); return;
  }
  if (notifEnabled) {
    notifEnabled = false; store.set('notif-enabled', false); updateNotifBtn(); return;
  }
  const perm = await Notification.requestPermission();
  if (perm !== 'granted') {
    alert('Permissão para notificações negada. Ative nas configurações do navegador.'); return;
  }
  notifEnabled = true; store.set('notif-enabled', true);
  updateNotifBtn(); scheduleReminders();
  new Notification('Ghestror ativado!', {
    body: 'Você receberá lembretes das suas tarefas.',
    icon: '/icons/icon.svg'
  });
}

function scheduleReminders() {
  if (!notifEnabled || Notification.permission !== 'granted') return;
  scheduleAt(8, 0, () => {
    const pending = dailyTasks.filter(t => !t.done).length;
    if (pending > 0) new Notification('Bom dia! Ghestror', {
      body: `Você tem ${pending} tarefa${pending > 1 ? 's' : ''} para hoje.`,
      icon: '/icons/icon.svg'
    });
  });
  scheduleAt(19, 0, () => {
    const pending = dailyTasks.filter(t => !t.done).length;
    if (pending > 0) new Notification('Lembrete noturno — Ghestror', {
      body: `Ainda há ${pending} tarefa${pending > 1 ? 's' : ''} pendente${pending > 1 ? 's' : ''} hoje.`,
      icon: '/icons/icon.svg'
    });
  });
}

function scheduleAt(hour, minute, fn) {
  const now = new Date();
  const target = new Date();
  target.setHours(hour, minute, 0, 0);
  if (target <= now) target.setDate(target.getDate() + 1);
  setTimeout(() => { fn(); setInterval(fn, 24 * 60 * 60 * 1000); }, target - now);
}

// ── Service Worker ───────────────────────────────────────────────
function registerSW() {
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {});
}

// ── Init ─────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  loadData();
  registerSW();

  const now = new Date();
  document.getElementById('date-label').textContent = formatDate(now);
  document.getElementById('week-label').textContent  = formatWeekRange();

  renderDaily(); renderWeekly();
  updateNotifBtn();
  if (notifEnabled) scheduleReminders();

  // Tabs
  document.querySelectorAll('.tab').forEach(btn =>
    btn.addEventListener('click', () => switchTab(btn.dataset.tab)));

  // Add daily
  const dailyInput = document.getElementById('daily-input');
  document.getElementById('daily-add').addEventListener('click', () => {
    const text = dailyInput.value.trim();
    if (!text) return;
    addTask(dailyTasks, text); saveDaily(); renderDaily();
    dailyInput.value = ''; dailyInput.focus();
  });
  dailyInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') document.getElementById('daily-add').click();
  });

  // Add weekly
  const weeklyInput = document.getElementById('weekly-input');
  document.getElementById('weekly-add').addEventListener('click', () => {
    const text = weeklyInput.value.trim();
    if (!text) return;
    addTask(weeklyTasks, text); saveWeekly(); renderWeekly();
    weeklyInput.value = ''; weeklyInput.focus();
  });
  weeklyInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') document.getElementById('weekly-add').click();
  });

  // Notifications
  document.getElementById('btn-notify').addEventListener('click', toggleNotifications);

  // Modal
  document.getElementById('modal-cancel').addEventListener('click', hideModal);
  document.getElementById('modal-confirm').addEventListener('click', confirmDelete);
  document.getElementById('modal-overlay').addEventListener('click', e => {
    if (e.target === e.currentTarget) hideModal();
  });
});
