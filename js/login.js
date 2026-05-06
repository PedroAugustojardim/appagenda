import { initAuth, signInGoogle, signInEmail, signUpEmail, signInAnon, CONFIGURED } from './auth.js';

const loadingEl  = document.getElementById('auth-loading');
const cardEl     = document.getElementById('auth-card');
const errorEl    = document.getElementById('auth-error');
const emailEl    = document.getElementById('auth-email');
const passwordEl = document.getElementById('auth-password');
const submitBtn  = document.getElementById('btn-submit');
const toggleBtn  = document.getElementById('btn-toggle');

let isSignUp = false;

function showError(msg) {
  errorEl.textContent = msg;
  errorEl.classList.remove('hidden');
}

function clearError() {
  errorEl.textContent = '';
  errorEl.classList.add('hidden');
}

function setLoading(on) {
  submitBtn.disabled = on;
  submitBtn.textContent = on ? 'Aguarde...' : (isSignUp ? 'Criar conta' : 'Entrar');
}

function goToApp() {
  window.location.href = 'index.html';
}

// Resolve auth state on load — redirect straight to app if already signed in
initAuth().then(user => {
  loadingEl.classList.add('hidden');
  if (user) { goToApp(); return; }
  cardEl.classList.remove('hidden');

  if (!CONFIGURED) {
    showError('Firebase não configurado. Preencha js/firebase-config.js com as credenciais do seu projeto Firebase para ativar o login.');
    document.getElementById('btn-google').disabled = true;
    submitBtn.disabled = true;
  }
});

document.getElementById('btn-google').addEventListener('click', async () => {
  clearError();
  try {
    await signInGoogle();
    goToApp();
  } catch (e) {
    showError(friendlyError(e));
  }
});

submitBtn.addEventListener('click', async () => {
  clearError();
  const email    = emailEl.value.trim();
  const password = passwordEl.value;
  if (!email || !password) { showError('Preencha e-mail e palavra-passe.'); return; }
  setLoading(true);
  try {
    if (isSignUp) {
      await signUpEmail(email, password);
    } else {
      await signInEmail(email, password);
    }
    goToApp();
  } catch (e) {
    showError(friendlyError(e));
  } finally {
    setLoading(false);
  }
});

toggleBtn.addEventListener('click', () => {
  isSignUp = !isSignUp;
  clearError();
  submitBtn.textContent = isSignUp ? 'Criar conta' : 'Entrar';
  toggleBtn.textContent = isSignUp ? 'Já tenho conta' : 'Criar conta';
});

document.getElementById('btn-anon').addEventListener('click', async () => {
  clearError();
  try {
    await signInAnon();
    goToApp();
  } catch (e) {
    showError(friendlyError(e));
  }
});

function friendlyError(e) {
  const code = e?.code || '';
  if (code === 'not-configured')
    return 'Firebase não configurado. Preencha js/firebase-config.js com as credenciais do seu projeto Firebase.';
  if (code.includes('unauthorized-domain'))
    return 'Domínio não autorizado. Adicione-o em Firebase Console → Authentication → Settings → Authorized domains.';
  if (code.includes('user-not-found') || code.includes('wrong-password') || code.includes('invalid-credential'))
    return 'E-mail ou palavra-passe incorretos.';
  if (code.includes('email-already-in-use'))
    return 'Este e-mail já está registado.';
  if (code.includes('weak-password'))
    return 'A palavra-passe deve ter pelo menos 6 caracteres.';
  if (code.includes('invalid-email'))
    return 'E-mail inválido.';
  if (code.includes('popup-closed') || code.includes('cancelled-popup-request'))
    return 'Início de sessão cancelado.';
  if (code.includes('popup-blocked'))
    return 'Popup bloqueado pelo navegador. Permita popups para este site.';
  if (code.includes('network-request-failed'))
    return 'Sem ligação à internet.';
  return 'Ocorreu um erro. Tente novamente.';
}
