/**
 * public/js/api.js — Centralized fetch helper for all API calls.
 *
 * Why a helper?  Every request needs the Authorization header with the JWT.
 * Rather than repeating that in every file, we wrap fetch() here.
 *
 * Functions exported (as globals since this is vanilla JS):
 *  - api(path, options) → fetch wrapper that auto-attaches the Bearer token
 *  - getToken()         → reads token from localStorage
 *  - getUser()          → parses stored user object
 *  - saveAuth(data)     → stores token + user after login/register
 *  - clearAuth()        → removes auth data (logout)
 *  - redirectIfNoAuth() → guard: sends to login if no token
 *  - redirectIfWrongRole(role) → guard: sends to login if role mismatch
 *  - showToast(msg, type) → shows a toast notification
 *  - escapeHtml(str)   → XSS protection: escapes special HTML characters
 */

// ── Auth helpers ────────────────────────────────────────────────────────────

function getToken() {
  return localStorage.getItem('token');
}

function getUser() {
  const raw = localStorage.getItem('user');
  try { return raw ? JSON.parse(raw) : null; } catch { return null; }
}

function saveAuth({ token, user }) {
  localStorage.setItem('token', token);
  localStorage.setItem('user', JSON.stringify(user));
}

function clearAuth() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
}

// ── Route guards ─────────────────────────────────────────────────────────────

function redirectIfNoAuth() {
  if (!getToken()) {
    window.location.href = '/login.html';
    return true; // Caller can return early
  }
  return false;
}

function redirectIfWrongRole(expectedRole) {
  const user = getUser();
  if (!user || user.role !== expectedRole) {
    clearAuth();
    window.location.href = '/login.html';
    return true;
  }
  return false;
}

// ── Fetch wrapper ─────────────────────────────────────────────────────────────

/**
 * api(path, options)
 * Wraps window.fetch with:
 *  - Base URL prefix '/api'
 *  - Automatic Authorization: Bearer <token> header
 *  - Automatic JSON parsing of the response
 *  - 401 handling → clears auth and redirects to login
 */
async function api(path, options = {}) {
  const token = getToken();

  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`/api${path}`, {
    ...options,
    headers,
  });

  // Try to parse JSON even for error responses (our API always returns JSON)
  let data;
  try {
    data = await response.json();
  } catch {
    data = { success: false, message: 'Server returned an unexpected response.' };
  }

  // 401 means token expired or invalid → force re-login
  if (response.status === 401) {
    clearAuth();
    window.location.href = '/login.html';
    return data;
  }

  return { ok: response.ok, status: response.status, ...data };
}

// ── Toast notifications ───────────────────────────────────────────────────────

/**
 * showToast(message, type)
 * Displays a floating notification.
 * type: 'success' | 'error' | 'info'
 * Auto-dismisses after 3.5 seconds.
 */
function showToast(message, type = 'info') {
  // Create container if it doesn't exist
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }

  const icons = { success: '✅', error: '❌', info: 'ℹ️' };

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;

  const icon = document.createElement('span');
  icon.textContent = icons[type] || 'ℹ️';

  const text = document.createElement('span');
  text.textContent = message; // textContent prevents XSS

  toast.appendChild(icon);
  toast.appendChild(text);
  container.appendChild(toast);

  // Auto-dismiss
  setTimeout(() => {
    toast.classList.add('hiding');
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// ── XSS protection ────────────────────────────────────────────────────────────

/**
 * escapeHtml(str) — NOT used for direct DOM injection (we use textContent).
 * Kept here as a utility for any edge cases where innerHTML is unavoidable.
 */
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ── Navbar renderer ───────────────────────────────────────────────────────────

/**
 * renderNavbar(containerId)
 * Injects a consistent navbar into any page.
 * The logout button clears auth and redirects to login.
 */
function renderNavbar(containerId = 'navbar') {
  const user = getUser();
  const el = document.getElementById(containerId);
  if (!el || !user) return;

  const navbar = document.createElement('nav');
  navbar.className = 'navbar';

  // Brand
  const brand = document.createElement('div');
  brand.className = 'navbar-brand';
  const icon = document.createElement('div');
  icon.className = 'logo-icon';
  icon.textContent = '📚';
  const brandText = document.createElement('span');
  brandText.textContent = 'StudyGroups';
  brand.appendChild(icon);
  brand.appendChild(brandText);

  // User section
  const userSection = document.createElement('div');
  userSection.className = 'navbar-user';

  const userInfo = document.createElement('div');
  userInfo.className = 'user-info';

  const userName = document.createElement('div');
  userName.className = 'user-name';
  userName.textContent = user.name; // textContent — no XSS

  const userRole = document.createElement('div');
  userRole.className = 'user-role';
  const badge = document.createElement('span');
  badge.className = `badge badge-${user.role}`;
  badge.textContent = user.role;
  userRole.appendChild(badge);

  userInfo.appendChild(userName);
  userInfo.appendChild(userRole);

  const logoutBtn = document.createElement('button');
  logoutBtn.className = 'btn btn-outline btn-sm';
  logoutBtn.textContent = 'Logout';
  logoutBtn.onclick = () => {
    clearAuth();
    window.location.href = '/login.html';
  };

  userSection.appendChild(userInfo);
  userSection.appendChild(logoutBtn);

  navbar.appendChild(brand);
  navbar.appendChild(userSection);
  el.appendChild(navbar);
}
