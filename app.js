'use strict';

// ── Storage ──────────────────────────────────────────────────────
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
function toDateStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
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
function roundToNext30(d) {
  const m = d.getMinutes();
  const rounded = m < 30 ? 30 : 60;
  const r = new Date(d);
  r.setMinutes(rounded, 0, 0);
  if (rounded === 60) r.setHours(r.getHours() + 1);
  return r;
}
function pad(n) { return String(n).padStart(2, '0'); }
function timeStr(d) { return `${pad(d.getHours())}:${pad(d.getMinutes())}`; }

// ── Task data ────────────────────────────────────────────────────
let dailyTasks  = [];
let weeklyTasks = [];
function loadTasks() {
  dailyTasks  = store.get(todayKey()) || [];
  weeklyTasks = store.get(weekKey())  || [];
}
function saveDaily()  { store.set(todayKey(), dailyTasks); }
function saveWeekly() { store.set(weekKey(),  weeklyTasks); }
function addTask(list, text) {
  list.push({ id: Date.now(), text: text.trim(), done: false });
}

// ── Event data ───────────────────────────────────────────────────
let events = [];
function loadEvents() {
  events = store.get('agenda-events') || [];
  events.forEach(scheduleEventNotif);
}
function saveEvents() { store.set('agenda-events', events); }
function getEventsForDate(dateStr) {
  return events.filter(e => e.date === dateStr);
}
function getMondayOf(d) {
  const day = d.getDay() || 7;
  const mon = new Date(d);
  mon.setHours(0,0,0,0);
  mon.setDate(d.getDate() - day + 1);
  return mon;
}
function getEventsForWeek(monday) {
  const days = Array.from({length: 7}, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return toDateStr(d);
  });
  return events.filter(e => days.includes(e.date));
}

// ── Notifications ────────────────────────────────────────────────
let notifEnabled = store.get('notif-enabled') || false;

function scheduleEventNotif(ev) {
  if (Notification.permission !== 'granted') return;
  const [h, m] = ev.startTime.split(':').map(Number);
  const target = new Date(ev.date + 'T' + ev.startTime);
  target.setMinutes(target.getMinutes() - 10);
  const ms = target - Date.now();
  if (ms <= 0) return;
  setTimeout(() => {
    new Notification(`Em 10 min: ${ev.title}`, {
      body: `${ev.startTime} – ${ev.endTime}`,
      icon: '/icons/icon.svg',
    });
  }, ms);
}

function scheduleAt(hour, minute, fn) {
  const now = new Date();
  const target = new Date();
  target.setHours(hour, minute, 0, 0);
  if (target <= now) target.setDate(target.getDate() + 1);
  setTimeout(() => { fn(); setInterval(fn, 24 * 60 * 60 * 1000); }, target - now);
}

function updateNotifBtn() {
  const btn = document.getElementById('btn-notify');
  btn.classList.toggle('active', notifEnabled);
  btn.title = notifEnabled ? 'Notificações ativas' : 'Ativar notificações';
}

async function toggleNotifications() {
  if (!('Notification' in window)) { alert('Seu navegador não suporta notificações.'); return; }
  if (notifEnabled) {
    notifEnabled = false; store.set('notif-enabled', false); updateNotifBtn(); return;
  }
  const perm = await Notification.requestPermission();
  if (perm !== 'granted') { alert('Permissão negada. Ative nas configurações do navegador.'); return; }
  notifEnabled = true; store.set('notif-enabled', true);
  updateNotifBtn();
  scheduleAt(8, 0, () => {
    const p = dailyTasks.filter(t => !t.done).length;
    if (p > 0) new Notification('Bom dia! Ghestror', {
      body: `Você tem ${p} tarefa${p > 1 ? 's' : ''} para hoje.`, icon: '/icons/icon.svg'
    });
  });
  scheduleAt(19, 0, () => {
    const p = dailyTasks.filter(t => !t.done).length;
    if (p > 0) new Notification('Lembrete noturno — Ghestror', {
      body: `Ainda há ${p} tarefa${p > 1 ? 's' : ''} pendente${p > 1 ? 's' : ''} hoje.`, icon: '/icons/icon.svg'
    });
  });
  new Notification('Ghestror ativado!', { body: 'Receberá lembretes das suas tarefas.', icon: '/icons/icon.svg' });
}

// ── Task render ──────────────────────────────────────────────────
function renderList(tasks, ulEl, emptyEl, barEl, labelEl, onToggle, onDelete) {
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
function renderDaily() {
  renderList(dailyTasks,
    document.getElementById('daily-list'), document.getElementById('daily-empty'),
    document.getElementById('daily-bar'), document.getElementById('daily-progress'),
    id => { const t = dailyTasks.find(t => t.id === id); if (t) { t.done = !t.done; saveDaily(); renderDaily(); } },
    id => { pendingDeleteId = id; pendingDeleteType = 'daily'; showModal(); });
}
function renderWeekly() {
  renderList(weeklyTasks,
    document.getElementById('weekly-list'), document.getElementById('weekly-empty'),
    document.getElementById('weekly-bar'), document.getElementById('weekly-progress'),
    id => { const t = weeklyTasks.find(t => t.id === id); if (t) { t.done = !t.done; saveWeekly(); renderWeekly(); } },
    id => { pendingDeleteId = id; pendingDeleteType = 'weekly'; showModal(); });
}

// ── Delete modal ─────────────────────────────────────────────────
let pendingDeleteId = null, pendingDeleteType = null;
function showModal() { document.getElementById('modal-overlay').classList.remove('hidden'); }
function hideModal() {
  document.getElementById('modal-overlay').classList.add('hidden');
  pendingDeleteId = null; pendingDeleteType = null;
}
function confirmDelete() {
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
function openSheet(panel) {
  sheetTarget = panel;
  document.getElementById('sheet-title').textContent = SHEET_TITLES[panel];
  document.getElementById('sheet-overlay').classList.remove('hidden');
  setTimeout(() => document.getElementById('sheet-input').focus(), 80);
}
function closeSheet() {
  document.getElementById('sheet-overlay').classList.add('hidden');
  document.getElementById('sheet-input').value = '';
}
function confirmSheet() {
  const text = document.getElementById('sheet-input').value.trim();
  if (!text) return;
  if (sheetTarget === 'daily') { addTask(dailyTasks, text); saveDaily(); renderDaily(); }
  else { addTask(weeklyTasks, text); saveWeekly(); renderWeekly(); }
  closeSheet();
}

// ── Event sheet ──────────────────────────────────────────────────
let editingEventId = null;

function openEventSheet(ev = null, prefill = {}) {
  editingEventId = ev ? ev.id : null;
  document.getElementById('event-sheet-title').textContent = ev ? 'Editar Evento' : 'Novo Evento';
  document.getElementById('ev-delete').classList.toggle('hidden', !ev);

  const now = roundToNext30(new Date());
  const end = new Date(now); end.setHours(end.getHours() + 1);

  document.getElementById('ev-title').value  = ev ? ev.title     : '';
  document.getElementById('ev-date').value   = ev ? ev.date      : (prefill.date  || toDateStr(new Date()));
  document.getElementById('ev-start').value  = ev ? ev.startTime : (prefill.start || timeStr(now));
  document.getElementById('ev-end').value    = ev ? ev.endTime   : (prefill.end   || timeStr(end));

  document.getElementById('event-sheet-overlay').classList.remove('hidden');
  setTimeout(() => document.getElementById('ev-title').focus(), 80);
}

function closeEventSheet() {
  document.getElementById('event-sheet-overlay').classList.add('hidden');
  editingEventId = null;
}

function saveEvent() {
  const title = document.getElementById('ev-title').value.trim();
  const date  = document.getElementById('ev-date').value;
  const start = document.getElementById('ev-start').value;
  const end   = document.getElementById('ev-end').value;
  if (!title) { document.getElementById('ev-title').focus(); return; }
  if (!date || !start || !end) return;
  if (start >= end) { alert('A hora de fim deve ser depois da hora de início.'); return; }

  if (editingEventId) {
    const idx = events.findIndex(e => e.id === editingEventId);
    if (idx !== -1) events[idx] = { id: editingEventId, title, date, startTime: start, endTime: end };
  } else {
    const ev = { id: Date.now(), title, date, startTime: start, endTime: end };
    events.push(ev);
    scheduleEventNotif(ev);
  }
  saveEvents();
  renderCalendar();
  closeEventSheet();
}

function deleteEvent() {
  if (!editingEventId) return;
  events = events.filter(e => e.id !== editingEventId);
  saveEvents();
  renderCalendar();
  closeEventSheet();
}

// ── Calendar state ───────────────────────────────────────────────
let calView   = 'month';
let calCursor = new Date();

function calPrev() {
  if (calView === 'month') { calCursor.setMonth(calCursor.getMonth() - 1); }
  else if (calView === 'week') { calCursor.setDate(calCursor.getDate() - 7); }
  else { calCursor.setDate(calCursor.getDate() - 1); }
  renderCalendar();
}
function calNext() {
  if (calView === 'month') { calCursor.setMonth(calCursor.getMonth() + 1); }
  else if (calView === 'week') { calCursor.setDate(calCursor.getDate() + 7); }
  else { calCursor.setDate(calCursor.getDate() + 1); }
  renderCalendar();
}
function calGoToday() { calCursor = new Date(); renderCalendar(); }

function setCalView(view) {
  calView = view;
  document.querySelectorAll('.cal-view-btn').forEach(b =>
    b.classList.toggle('active', b.dataset.view === view));
  renderCalendar();
}

// ── Calendar render ──────────────────────────────────────────────
const MONTHS_PT = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho',
                   'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const DAYS_SHORT = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
const TODAY_STR  = toDateStr(new Date());

function renderCalendar() {
  const label = document.getElementById('cal-period-label');
  const grid  = document.getElementById('cal-grid');
  grid.innerHTML = '';

  if (calView === 'month') {
    label.textContent = `${MONTHS_PT[calCursor.getMonth()]} ${calCursor.getFullYear()}`;
    renderMonthView(grid);
  } else if (calView === 'week') {
    const mon = getMondayOf(calCursor);
    const sun = new Date(mon); sun.setDate(mon.getDate() + 6);
    const fmt = d => d.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' });
    label.textContent = `${fmt(mon)} – ${fmt(sun)}`;
    renderWeekView(grid, mon);
  } else {
    label.textContent = calCursor.toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'long' });
    renderDayView(grid, calCursor);
  }
}

function renderMonthView(container) {
  const wrap = document.createElement('div');
  wrap.className = 'cal-month-grid';

  // Weekday headers
  const hdrRow = document.createElement('div');
  hdrRow.className = 'cal-weekday-row';
  DAYS_SHORT.forEach(d => {
    const h = document.createElement('div');
    h.className = 'cal-weekday-hdr'; h.textContent = d;
    hdrRow.appendChild(h);
  });
  wrap.appendChild(hdrRow);

  // Days grid
  const daysGrid = document.createElement('div');
  daysGrid.className = 'cal-days-grid';

  const year  = calCursor.getFullYear();
  const month = calCursor.getMonth();
  const first = new Date(year, month, 1);
  const startDow = first.getDay(); // 0=Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();
  const totalCells = 42;

  for (let i = 0; i < totalCells; i++) {
    let dayNum, cellDate, isOther = false;
    if (i < startDow) {
      dayNum = daysInPrevMonth - startDow + 1 + i;
      cellDate = new Date(year, month - 1, dayNum);
      isOther = true;
    } else if (i < startDow + daysInMonth) {
      dayNum = i - startDow + 1;
      cellDate = new Date(year, month, dayNum);
    } else {
      dayNum = i - startDow - daysInMonth + 1;
      cellDate = new Date(year, month + 1, dayNum);
      isOther = true;
    }

    const dateStr  = toDateStr(cellDate);
    const isToday  = dateStr === TODAY_STR;
    const cell     = document.createElement('div');
    cell.className = 'cal-day-cell' + (isOther ? ' other-month' : '') + (isToday ? ' today' : '');
    cell.addEventListener('click', () => {
      calCursor = new Date(cellDate);
      setCalView('day');
    });

    const num = document.createElement('div');
    num.className = 'cal-day-num'; num.textContent = dayNum;
    cell.appendChild(num);

    const dayEvents = getEventsForDate(dateStr);
    dayEvents.slice(0, 3).forEach(ev => {
      const dot = document.createElement('div');
      dot.className = 'cal-event-dot' + (isToday ? ' today-ev' : '');
      dot.textContent = `${ev.startTime} ${ev.title}`;
      dot.addEventListener('click', e => { e.stopPropagation(); openEventSheet(ev); });
      cell.appendChild(dot);
    });
    if (dayEvents.length > 3) {
      const more = document.createElement('div');
      more.className = 'cal-more-label';
      more.textContent = `+${dayEvents.length - 3} mais`;
      cell.appendChild(more);
    }

    daysGrid.appendChild(cell);
  }
  wrap.appendChild(daysGrid);
  container.appendChild(wrap);
}

function renderWeekView(container, monday) {
  renderTimeGrid(container, 7, monday);
}

function renderDayView(container, date) {
  renderTimeGrid(container, 1, date);
}

function renderTimeGrid(container, numDays, startDate) {
  const HOUR_START = 7, HOUR_END = 22;
  const SLOT_H = 44; // px per 30-min slot
  const colClass = numDays === 7 ? 'cols-8' : 'cols-2';

  const wrap = document.createElement('div');
  wrap.className = 'cal-week-wrap';

  // Header row
  const header = document.createElement('div');
  header.className = `cal-week-header ${colClass}`;
  const spacer = document.createElement('div');
  spacer.className = 'cal-week-time-spacer';
  header.appendChild(spacer);

  const dates = Array.from({length: numDays}, (_, i) => {
    const d = new Date(startDate); d.setDate(startDate.getDate() + i); return d;
  });
  dates.forEach(d => {
    const hdr = document.createElement('div');
    hdr.className = 'cal-week-day-hdr' + (toDateStr(d) === TODAY_STR ? ' today' : '');
    hdr.textContent = numDays === 1
      ? d.toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric' })
      : DAYS_SHORT[d.getDay()] + ' ' + d.getDate();
    header.appendChild(hdr);
  });
  wrap.appendChild(header);

  // Scrollable body
  const body = document.createElement('div');
  body.className = 'cal-week-body';

  // Build slot rows + day columns
  const totalSlots = (HOUR_END - HOUR_START) * 2;

  // Create day column elements first (for absolute positioning of events)
  const dayCols = dates.map(d => {
    const col = document.createElement('div');
    col.className = 'cal-day-col';
    col.style.height = `${totalSlots * SLOT_H}px`;
    col.style.position = 'relative';
    // Click on empty slot → open event sheet with date+time
    col.addEventListener('click', e => {
      if (e.target !== col && !e.target.classList.contains('cal-slot')) return;
      const rect = col.getBoundingClientRect();
      const relY = e.clientY - rect.top;
      const slotIndex = Math.floor(relY / SLOT_H);
      const totalMins = HOUR_START * 60 + slotIndex * 30;
      const h = Math.floor(totalMins / 60), m = totalMins % 60;
      const start = `${pad(h)}:${pad(m)}`;
      const endH = m === 30 ? h + 1 : h, endM = m === 0 ? 30 : 0;
      const end = `${pad(endH)}:${pad(endM)}`;
      openEventSheet(null, { date: toDateStr(d), start, end });
    });
    return col;
  });

  // Place events into columns
  dates.forEach((d, i) => {
    const dateStr = toDateStr(d);
    getEventsForDate(dateStr).forEach(ev => {
      const [sh, sm] = ev.startTime.split(':').map(Number);
      const [eh, em] = ev.endTime.split(':').map(Number);
      const startMin = sh * 60 + sm;
      const endMin   = eh * 60 + em;
      const topMin   = startMin - HOUR_START * 60;
      const durMin   = endMin - startMin;
      if (topMin < 0 || durMin <= 0) return;

      const block = document.createElement('div');
      block.className = 'cal-event-block';
      block.style.top    = `${topMin / 30 * SLOT_H}px`;
      block.style.height = `${Math.max(durMin / 30 * SLOT_H, 20)}px`;
      block.textContent  = `${ev.startTime} ${ev.title}`;
      block.addEventListener('click', e => { e.stopPropagation(); openEventSheet(ev); });
      dayCols[i].appendChild(block);
    });
  });

  // Build rows (time labels + day columns per row)
  for (let s = 0; s < totalSlots; s++) {
    const row = document.createElement('div');
    row.className = `cal-week-row ${colClass}`;

    const timeLabel = document.createElement('div');
    timeLabel.className = 'cal-time-label';
    if (s % 2 === 0) {
      const h = HOUR_START + s / 2;
      timeLabel.textContent = `${pad(h)}:00`;
    }
    row.appendChild(timeLabel);

    dayCols.forEach(col => {
      const slot = document.createElement('div');
      slot.className = 'cal-slot';
      col.appendChild(slot);
      row.appendChild(col.cloneNode(false)); // append empty placeholder for grid
    });

    body.appendChild(row);
  }

  // Append actual day columns on top of grid (positioned absolutely within wrap)
  // Use a relative container for the day columns
  const colsWrap = document.createElement('div');
  colsWrap.style.cssText = `display:grid; grid-template-columns: 46px repeat(${numDays}, 1fr); position:relative;`;

  const timeLabelCol = document.createElement('div');
  colsWrap.appendChild(timeLabelCol);
  dayCols.forEach(col => colsWrap.appendChild(col));

  // Replace body rows with simpler approach: time label column + absolute columns
  body.innerHTML = '';

  const innerWrap = document.createElement('div');
  innerWrap.style.cssText = `display:grid; grid-template-columns: 46px repeat(${numDays}, 1fr);`;

  // Time labels column
  const timeCol = document.createElement('div');
  timeCol.style.cssText = 'display:flex; flex-direction:column;';
  for (let s = 0; s < totalSlots; s++) {
    const lbl = document.createElement('div');
    lbl.className = 'cal-time-label';
    lbl.style.height = SLOT_H + 'px';
    lbl.style.display = 'flex';
    lbl.style.alignItems = 'flex-start';
    lbl.style.paddingTop = '2px';
    if (s % 2 === 0) {
      const h = HOUR_START + s / 2;
      lbl.textContent = `${pad(h)}:00`;
    }
    timeCol.appendChild(lbl);
  }
  innerWrap.appendChild(timeCol);

  dayCols.forEach(col => innerWrap.appendChild(col));
  body.appendChild(innerWrap);
  wrap.appendChild(body);

  // Auto-scroll to 8 AM
  requestAnimationFrame(() => {
    body.scrollTop = (8 - HOUR_START) * 2 * SLOT_H;
  });

  container.appendChild(wrap);
}

// ── Tabs ─────────────────────────────────────────────────────────
let currentTab = 'daily';
function switchTab(name) {
  currentTab = name;
  document.querySelectorAll('.tab').forEach(t =>
    t.classList.toggle('active', t.dataset.tab === name));
  ['daily', 'weekly', 'agenda'].forEach(p => {
    const el = document.getElementById(`panel-${p}`);
    el.classList.toggle('active', p === name);
    el.classList.toggle('hidden', p !== name);
  });
  if (name === 'agenda') renderCalendar();
}

// ── Service Worker ───────────────────────────────────────────────
function registerSW() {
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {});
}

// ── Init ─────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  loadTasks();
  loadEvents();
  registerSW();

  document.getElementById('date-label').textContent = formatDate(new Date());
  document.getElementById('week-label').textContent  = formatWeekRange();

  renderDaily(); renderWeekly();
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

  // Notifications
  document.getElementById('btn-notify').addEventListener('click', toggleNotifications);

  // Delete modal
  document.getElementById('modal-cancel').addEventListener('click', hideModal);
  document.getElementById('modal-confirm').addEventListener('click', confirmDelete);
  document.getElementById('modal-overlay').addEventListener('click', e => {
    if (e.target === e.currentTarget) hideModal();
  });
});
