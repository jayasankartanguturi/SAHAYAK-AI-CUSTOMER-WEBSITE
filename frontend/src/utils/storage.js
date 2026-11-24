export function userKey(email, suffix) {
  const clean = (email || 'guest').trim().toLowerCase();
  return `sahayak_user_${clean}_${suffix}`;
}

export function loadUserList(email, suffix, fallback = []) {
  if (!email) return fallback;
  try {
    const raw = localStorage.getItem(userKey(email, suffix));
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore storage errors
  }
  return fallback;
}

export function saveUserList(email, suffix, data) {
  if (!email) return;
  try {
    localStorage.setItem(userKey(email, suffix), JSON.stringify(data));
  } catch {
    // ignore storage errors
  }
}

export function loadJson(key, fallback = null) {
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore storage errors
  }
  return fallback;
}

export function saveJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore storage errors
  }
}
