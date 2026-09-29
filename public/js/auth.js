/**
 * public/js/auth.js — Handles register and login form submission.
 *
 * Used by both register.html and login.html.
 * Reads which form is present on the page and attaches the handler.
 *
 * On success: stores token + user in localStorage, redirects by role.
 * On error: shows the server's error message in the form's error box.
 */

document.addEventListener('DOMContentLoaded', () => {
  // ── Register form ──────────────────────────────────────────────────────────
  const registerForm = document.getElementById('register-form');
  if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      clearError('register-error');

      const name     = document.getElementById('reg-name').value.trim();
      const email    = document.getElementById('reg-email').value.trim();
      const password = document.getElementById('reg-password').value;
      const role     = document.getElementById('reg-role').value;

      // Client-side quick checks (server validates too)
      if (!name || !email || !password) {
        return showError('register-error', 'All fields are required.');
      }
      if (password.length < 6) {
        return showError('register-error', 'Password must be at least 6 characters.');
      }

      const btn = registerForm.querySelector('button[type="submit"]');
      setLoading(btn, true);

      const result = await api('/auth/register', {
        method: 'POST',
        body:   JSON.stringify({ name, email, password, role }),
      });

      setLoading(btn, false);

      if (!result.ok) {
        return showError('register-error', result.message || 'Registration failed.');
      }

      saveAuth(result.data);
      showToast('Account created! Redirecting…', 'success');
      setTimeout(() => redirectByRole(result.data.user.role), 800);
    });
  }

  // ── Login form ─────────────────────────────────────────────────────────────
  const loginForm = document.getElementById('login-form');
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      clearError('login-error');

      const email    = document.getElementById('login-email').value.trim();
      const password = document.getElementById('login-password').value;
      const role     = document.getElementById('login-role').value;

      if (!email || !password) {
        return showError('login-error', 'Email and password are required.');
      }

      const btn = loginForm.querySelector('button[type="submit"]');
      setLoading(btn, true);

      const result = await api('/auth/login', {
        method: 'POST',
        body:   JSON.stringify({ email, password, role }),
      });

      setLoading(btn, false);

      if (!result.ok) {
        return showError('login-error', result.message || 'Login failed.');
      }

      saveAuth(result.data);
      showToast('Welcome back!', 'success');
      setTimeout(() => redirectByRole(result.data.user.role), 600);
    });
  }
});

// ── Helpers ────────────────────────────────────────────────────────────────

function redirectByRole(role) {
  if (role === 'admin') {
    window.location.href = '/admin-dashboard.html';
  } else {
    window.location.href = '/student-dashboard.html';
  }
}

function showError(id, message) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = message; // textContent — safe, no XSS
  el.classList.remove('hidden');
}

function clearError(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = '';
  el.classList.add('hidden');
}

function setLoading(btn, isLoading) {
  if (!btn) return;
  btn.disabled   = isLoading;
  btn.textContent = isLoading ? 'Please wait…' : btn.dataset.label || btn.textContent;
}
