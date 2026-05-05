import { store } from './store.js';
import { todayKey, weekKey } from './utils.js';

let dailyTasks  = [];
let weeklyTasks = [];

export function getDailyTasks()  { return dailyTasks; }
export function getWeeklyTasks() { return weeklyTasks; }

export function loadTasks() {
  dailyTasks  = store.get(todayKey()) || [];
  weeklyTasks = store.get(weekKey())  || [];
}

function saveDaily()  { store.set(todayKey(), dailyTasks); }
function saveWeekly() { store.set(weekKey(),  weeklyTasks); }

function addTask(list, text) {
  list.push({ id: Date.now(), text: text.trim(), done: false });
}

// ── Task render ──────────────────────────────────────────────────

export function renderList(tasks, ulEl, emptyEl, barEl, labelEl, onToggle, onDelete) {
  ulEl.innerHTML = '';
  const done = tasks.filter(t => t.done).length;
  barEl.style.width = (tasks.length ? Math.round((done / tasks.length) * 100) : 0) + '%';
  labelEl.textContent = tasks.length ? `${done}/${tasks.length}` : '';
  if (!tasks.length) { emptyEl.classList.remove('hidden'); return; }
  emptyEl.classList.add('hidden');
  tasks.forEach(task => {
    const li = document.createElement('li');
    li.className = 'task-item' + (task.done ? ' done' : '');
    const check = document.createElement('button');
    check.className = 'check-btn' + (task.done ? ' checked' : '');
    check.setAttribute('aria-label', task.done ? 'Desmarcar' : 'Concluir');
    check.addEventListener('click', () => onToggle(task.id));
    const span = document.createElement('span');
    span.className = 'task-text'; span.textContent = task.text;
    const del = document.createElement('button');
    del.className = 'delete-btn'; del.setAttribute('aria-label', 'Remover');
    del.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>`;
    del.addEventListener('click', () => onDelete(task.id));
    li.append(check, span, del);
    ulEl.appendChild(li);
  });
}

export function renderDaily() {
  renderList(dailyTasks,
    document.getElementById('daily-list'), document.getElementById('daily-empty'),
    document.getElementById('daily-bar'), document.getElementById('daily-progress'),
    id => { const t = dailyTasks.find(t => t.id === id); if (t) { t.done = !t.done; saveDaily(); renderDaily(); } },
    id => { pendingDeleteId = id; pendingDeleteType = 'daily'; showModal(); });
}

export function renderWeekly() {
  renderList(weeklyTasks,
    document.getElementById('weekly-list'), document.getElementById('weekly-empty'),
    document.getElementById('weekly-bar'), document.getElementById('weekly-progress'),
    id => { const t = weeklyTasks.find(t => t.id === id); if (t) { t.done = !t.done; saveWeekly(); renderWeekly(); } },
    id => { pendingDeleteId = id; pendingDeleteType = 'weekly'; showModal(); });
}

// ── Delete modal ─────────────────────────────────────────────────

let pendingDeleteId = null, pendingDeleteType = null;

export function showModal() { document.getElementById('modal-overlay').classList.remove('hidden'); }

export function hideModal() {
  document.getElementById('modal-overlay').classList.add('hidden');
  pendingDeleteId = null; pendingDeleteType = null;
}

export function confirmDelete() {
  if (pendingDeleteType === 'daily') {
    dailyTasks = dailyTasks.filter(t => t.id !== pendingDeleteId); saveDaily(); renderDaily();
  } else {
    weeklyTasks = weeklyTasks.filter(t => t.id !== pendingDeleteId); saveWeekly(); renderWeekly();
  }
  hideModal();
}

// ── Task sheet ───────────────────────────────────────────────────

let sheetTarget = 'daily';
const SHEET_TITLES = { daily: 'Nova tarefa do dia', weekly: 'Nova meta semanal' };

export function openSheet(panel) {
  sheetTarget = panel;
  document.getElementById('sheet-title').textContent = SHEET_TITLES[panel];
  document.getElementById('sheet-overlay').classList.remove('hidden');
  setTimeout(() => document.getElementById('sheet-input').focus(), 80);
}

export function closeSheet() {
  document.getElementById('sheet-overlay').classList.add('hidden');
  document.getElementById('sheet-input').value = '';
}

export function confirmSheet() {
  const text = document.getElementById('sheet-input').value.trim();
  if (!text) return;
  if (sheetTarget === 'daily') { addTask(dailyTasks, text); saveDaily(); renderDaily(); }
  else { addTask(weeklyTasks, text); saveWeekly(); renderWeekly(); }
  closeSheet();
}
