import { getUser, signOut, CONFIGURED } from './auth.js';
import { getDailyTasks, getWeeklyTasks } from './tasks.js';
import { getEvents } from './events.js';
import { exportToCSV } from './export.js';
import { notifEnabled } from './notifications.js';

export function renderProfile() {
  const user = getUser();

  const avatarEl   = document.getElementById('profile-avatar');
  const nameEl     = document.getElementById('profile-name');
  const emailEl    = document.getElementById('profile-email');
  const badgeEl    = document.getElementById('profile-badge');
  const anonBanner = document.getElementById('profile-anon-banner');
  const deleteBtn  = document.getElementById('profile-delete-btn');

  if (user) {
    const initial = (user.displayName?.[0] || user.email?.[0] || '?').toUpperCase();
    if (user.photoURL) {
      avatarEl.innerHTML = `<img src="${user.photoURL}" alt="avatar" class="profile-avatar-img">`;
    } else {
      avatarEl.textContent = initial;
    }

    nameEl.textContent  = user.displayName || user.email || 'Utilizador';
    emailEl.textContent = user.email || '';
    emailEl.classList.toggle('hidden', !user.email);

    const pid = user.providerData?.[0]?.providerId;
    if (user.isAnonymous) {
      badgeEl.textContent = '● Conta temporária';
      badgeEl.className   = 'profile-badge profile-badge-anon';
    } else if (pid === 'google.com') {
      badgeEl.textContent = '● Google';
      badgeEl.className   = 'profile-badge profile-badge-google';
    } else {
      badgeEl.textContent = '● E-mail';
      badgeEl.className   = 'profile-badge profile-badge-email';
    }

    anonBanner?.classList.toggle('hidden', !user.isAnonymous);
    deleteBtn?.classList.toggle('hidden', !!user.isAnonymous);
  }

  const daily  = getDailyTasks();
  const weekly = getWeeklyTasks();
  const evs    = getEvents();

  document.getElementById('stat-daily').textContent  = `${daily.filter(t => t.done).length}/${daily.length}`;
  document.getElementById('stat-weekly').textContent = `${weekly.filter(t => t.done).length}/${weekly.length}`;
  document.getElementById('stat-events').textContent = evs.length;

  updateProfileNotif();
}

export function updateProfileNotif() {
  const btn = document.getElementById('profile-notif-btn');
  if (!btn) return;
  btn.textContent = notifEnabled ? 'Ativo' : 'Inativo';
  btn.classList.toggle('active', notifEnabled);
}

export async function handleSignOut() {
  await signOut();
  window.location.href = 'login.html';
}

export async function handleDeleteAccount() {
  const user = getUser();
  if (!user) return;
  if (!confirm('Tem a certeza? Esta ação é irreversível e eliminará permanentemente a sua conta.')) return;
  try {
    await user.delete();
    window.location.href = 'login.html';
  } catch (e) {
    if (e?.code === 'auth/requires-recent-login') {
      alert('Por segurança, faça login novamente antes de eliminar a conta.');
      await signOut();
      window.location.href = 'login.html';
    } else {
      alert('Erro ao eliminar conta. Tente novamente.');
    }
  }
}

export async function handleLinkGoogle() {
  if (!CONFIGURED) { alert('Firebase não configurado.'); return; }
  const user = getUser();
  if (!user) return;
  try {
    const { GoogleAuthProvider, linkWithPopup } =
      await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js');
    await linkWithPopup(user, new GoogleAuthProvider());
    renderProfile();
    alert('Conta Google associada com sucesso!');
  } catch (e) {
    if (!e?.code?.includes('popup-closed') && !e?.code?.includes('cancelled')) {
      alert('Erro ao associar conta Google. Tente novamente.');
    }
  }
}

export function handleExportEvents() {
  exportToCSV(getEvents());
}
