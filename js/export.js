import { toDateStr } from './utils.js';

export function exportToCSV(events) {
  if (!events.length) { alert('Nenhum evento para exportar.'); return; }

  const escape = v => `"${String(v).replace(/"/g, '""')}"`;
  const header = ['Título', 'Data', 'Hora Início', 'Hora Fim'].map(escape).join(',');
  const rows = events
    .slice()
    .sort((a, b) => (a.date + a.startTime).localeCompare(b.date + b.startTime))
    .map(ev => [ev.title, ev.date, ev.startTime, ev.endTime].map(escape).join(','));

  const csv = '﻿' + [header, ...rows].join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `ghestror-agenda-${toDateStr(new Date())}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
