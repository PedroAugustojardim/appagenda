import { store } from './store.js';
import { toDateStr, roundToNext30, timeStr } from './utils.js';
import { scheduleEventNotif } from './notifications.js';

let events = [];

export function getEvents() { return events; }

export function loadEvents() {
  events = store.get('agenda-events') || [];
  events.forEach(scheduleEventNotif);
}

export function saveEvents() { store.set('agenda-events', events); }

export function getEventsForDate(dateStr) {
  return events.filter(e => e.date === dateStr);
}

export function getMondayOf(d) {
  const day = d.getDay() || 7;
  const mon = new Date(d);
  mon.setHours(0, 0, 0, 0);
  mon.setDate(d.getDate() - day + 1);
  return mon;
}

export function getEventsForWeek(monday) {
  const days = Array.from({length: 7}, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return toDateStr(d);
  });
  return events.filter(e => days.includes(e.date));
}

// ── Event sheet ──────────────────────────────────────────────────

let editingEventId = null;

export function openEventSheet(ev = null, prefill = {}) {
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

export function closeEventSheet() {
  document.getElementById('event-sheet-overlay').classList.add('hidden');
  editingEventId = null;
}

export function saveEvent() {
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
  document.dispatchEvent(new CustomEvent('calendar:refresh'));
  closeEventSheet();
}

export function deleteEvent() {
  if (!editingEventId) return;
  events = events.filter(e => e.id !== editingEventId);
  saveEvents();
  document.dispatchEvent(new CustomEvent('calendar:refresh'));
  closeEventSheet();
}
