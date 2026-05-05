export function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

export function weekKey() {
  const d = new Date();
  const day = d.getDay() || 7;
  const mon = new Date(d);
  mon.setDate(d.getDate() - day + 1);
  return `week-${mon.getFullYear()}-${mon.getMonth()}-${mon.getDate()}`;
}

export function toDateStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

export function formatDate(d) {
  return d.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
}

export function formatWeekRange() {
  const d = new Date();
  const day = d.getDay() || 7;
  const mon = new Date(d); mon.setDate(d.getDate() - day + 1);
  const sun = new Date(mon); sun.setDate(mon.getDate() + 6);
  const fmt = dt => dt.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' });
  return `${fmt(mon)} – ${fmt(sun)}`;
}

export function roundToNext30(d) {
  const m = d.getMinutes();
  const rounded = m < 30 ? 30 : 60;
  const r = new Date(d);
  r.setMinutes(rounded, 0, 0);
  if (rounded === 60) r.setHours(r.getHours() + 1);
  return r;
}

export function pad(n) { return String(n).padStart(2, '0'); }

export function timeStr(d) { return `${pad(d.getHours())}:${pad(d.getMinutes())}`; }
