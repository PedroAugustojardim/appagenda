import { firebaseConfig } from './firebase-config.js';

const CONFIGURED = firebaseConfig.apiKey !== 'YOUR_API_KEY';

let _auth = null;
let _GoogleProvider = null;

async function getFirebase() {
  if (_auth) return _auth;
  const { initializeApp }      = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js');
  const { getAuth, GoogleAuthProvider } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js');
  const app = initializeApp(firebaseConfig);
  _auth = getAuth(app);
  _GoogleProvider = new GoogleAuthProvider();
  return _auth;
}

export { CONFIGURED };

// Resolves with the current user (or null) after at most 3 s.
// When Firebase is not configured, resolves with a local anonymous user
// so the app remains accessible without credentials.
export function initAuth() {
  if (!CONFIGURED) return Promise.resolve({ uid: 'local', isAnonymous: true });
  return new Promise(resolve => {
    const timer = setTimeout(() => resolve(null), 3000);
    getFirebase().then(auth => {
      import('https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js').then(({ onAuthStateChanged }) => {
        const unsub = onAuthStateChanged(auth, user => {
          clearTimeout(timer);
          unsub();
          resolve(user);
        });
      });
    }).catch(() => { clearTimeout(timer); resolve(null); });
  });
}

export function getUser() { return _auth ? _auth.currentUser : null; }

export async function signInGoogle() {
  if (!CONFIGURED) throw Object.assign(new Error(), { code: 'not-configured' });
  const auth = await getFirebase();
  const { signInWithPopup } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js');
  return signInWithPopup(auth, _GoogleProvider);
}

export async function signInEmail(email, password) {
  if (!CONFIGURED) throw Object.assign(new Error(), { code: 'not-configured' });
  const auth = await getFirebase();
  const { signInWithEmailAndPassword } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js');
  return signInWithEmailAndPassword(auth, email, password);
}

export async function signUpEmail(email, password) {
  if (!CONFIGURED) throw Object.assign(new Error(), { code: 'not-configured' });
  const auth = await getFirebase();
  const { createUserWithEmailAndPassword } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js');
  return createUserWithEmailAndPassword(auth, email, password);
}

export async function signInAnon() {
  if (!CONFIGURED) return { user: { uid: 'local', isAnonymous: true } };
  const auth = await getFirebase();
  const { signInAnonymously } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js');
  return signInAnonymously(auth);
}

export async function signOut() {
  if (!_auth) return;
  const { signOut: fbSignOut } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js');
  return fbSignOut(_auth);
}
