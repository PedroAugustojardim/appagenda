import { store } from './store.js';
import { getDailyTasks } from './tasks.js';

export let notifEnabled = store.get('notif-enabled') || false;

export function scheduleEventNotif(ev) {
  if (Notification.permission !== 'granted') return;
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

export function scheduleAt(hour, minute, fn) {
  const now = new Date();
  const target = new Date();
  target.setHours(hour, minute, 0, 0);
  if (target <= now) target.setDate(target.getDate() + 1);
  setTimeout(() => { fn(); setInterval(fn, 24 * 60 * 60 * 1000); }, target - now);
}

export function updateNotifBtn() {
  const btn = document.getElementById('btn-notify');
  if (!btn) return;
  btn.classList.toggle('active', notifEnabled);
  btn.title = notifEnabled ? 'Notificações ativas' : 'Ativar notificações';
}

function scheduleDailyReminders() {
  scheduleAt(8, 0, () => {
    const p = getDailyTasks().filter(t => !t.done).length;
    if (p > 0) new Notification('Bom dia! Ghestror', {
      body: `Você tem ${p} tarefa${p > 1 ? 's' : ''} para hoje.`, icon: '/icons/icon.svg'
    });
  });
  scheduleAt(19, 0, () => {
    const p = getDailyTasks().filter(t => !t.done).length;
    if (p > 0) new Notification('Lembrete noturno — Ghestror', {
      body: `Ainda há ${p} tarefa${p > 1 ? 's' : ''} pendente${p > 1 ? 's' : ''} hoje.`, icon: '/icons/icon.svg'
    });
  });
}

// Call on every app load to restore timers lost when the page was closed.
export function restoreNotifications() {
  if (notifEnabled && Notification.permission === 'granted') {
    scheduleDailyReminders();
  }
}

export async function toggleNotifications() {
  if (!('Notification' in window)) { alert('Seu navegador não suporta notificações.'); return; }
  if (notifEnabled) {
    notifEnabled = false; store.set('notif-enabled', false); updateNotifBtn(); return;
  }
  const perm = await Notification.requestPermission();
  if (perm !== 'granted') { alert('Permissão negada. Ative nas configurações do navegador.'); return; }
  notifEnabled = true; store.set('notif-enabled', true);
  updateNotifBtn();
  scheduleDailyReminders();
  new Notification('Ghestror ativado!', { body: 'Receberá lembretes das suas tarefas.', icon: '/icons/icon.svg' });
}
