import { toDateStr, pad } from './utils.js';
import { getEventsForDate, getMondayOf, openEventSheet } from './events.js';

const MONTHS_PT  = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho',
                    'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const DAYS_SHORT = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
const TODAY_STR  = toDateStr(new Date());

let calView   = 'month';
let calCursor = new Date();

export function calPrev() {
  if (calView === 'month') { calCursor.setMonth(calCursor.getMonth() - 1); }
  else if (calView === 'week') { calCursor.setDate(calCursor.getDate() - 7); }
  else { calCursor.setDate(calCursor.getDate() - 1); }
  renderCalendar();
}

export function calNext() {
  if (calView === 'month') { calCursor.setMonth(calCursor.getMonth() + 1); }
  else if (calView === 'week') { calCursor.setDate(calCursor.getDate() + 7); }
  else { calCursor.setDate(calCursor.getDate() + 1); }
  renderCalendar();
}

export function calGoToday() { calCursor = new Date(); renderCalendar(); }

export function setCalView(view) {
  calView = view;
  document.querySelectorAll('.cal-view-btn').forEach(b =>
    b.classList.toggle('active', b.dataset.view === view));
  renderCalendar();
}

export function renderCalendar() {
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

  const hdrRow = document.createElement('div');
  hdrRow.className = 'cal-weekday-row';
  DAYS_SHORT.forEach(d => {
    const h = document.createElement('div');
    h.className = 'cal-weekday-hdr'; h.textContent = d;
    hdrRow.appendChild(h);
  });
  wrap.appendChild(hdrRow);

  const daysGrid = document.createElement('div');
  daysGrid.className = 'cal-days-grid';

  const year  = calCursor.getFullYear();
  const month = calCursor.getMonth();
  const first = new Date(year, month, 1);
  const startDow = first.getDay();
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
  const SLOT_H = 44;
  const colClass = numDays === 7 ? 'cols-8' : 'cols-2';

  const wrap = document.createElement('div');
  wrap.className = 'cal-week-wrap';

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

  const body = document.createElement('div');
  body.className = 'cal-week-body';

  const totalSlots = (HOUR_END - HOUR_START) * 2;

  const dayCols = dates.map(d => {
    const col = document.createElement('div');
    col.className = 'cal-day-col';
    col.style.height = `${totalSlots * SLOT_H}px`;
    col.style.position = 'relative';
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

  const innerWrap = document.createElement('div');
  innerWrap.style.cssText = `display:grid; grid-template-columns: 46px repeat(${numDays}, 1fr);`;

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

  requestAnimationFrame(() => {
    body.scrollTop = (8 - HOUR_START) * 2 * SLOT_H;
  });

  container.appendChild(wrap);
}
