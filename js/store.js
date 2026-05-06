export const store = {
  get: k => { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch { return null; } },
  set: (k, v) => localStorage.setItem(k, JSON.stringify(v)),
};
