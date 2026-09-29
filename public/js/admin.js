/**
 * public/js/admin.js — Admin dashboard logic.
 *
 * Responsibilities:
 *  1. Auth guard — admin role only.
 *  2. Render navbar.
 *  3. Fetch and display platform stats.
 *  4. Fetch and render users table with delete buttons.
 *  5. Fetch and render groups table with delete buttons.
 *  6. Handle delete confirmations.
 *
 * XSS: All user-generated text set via textContent.
 */

document.addEventListener('DOMContentLoaded', async () => {
  // ── Auth guard ─────────────────────────────────────────────────────────────
  if (redirectIfNoAuth()) return;
  if (redirectIfWrongRole('admin')) return;

  renderNavbar('navbar');

  // Load all data in parallel
  await Promise.all([loadStats(), loadUsers(), loadGroups()]);
});

// ── Stats ───────────────────────────────────────────────────────────────────

async function loadStats() {
  const result = await api('/admin/stats');
  if (!result.ok) return;

  const s = result.data;
  setText('stat-total-users',    s.totalUsers);
  setText('stat-total-students', s.totalStudents);
  setText('stat-total-groups',   s.totalGroups);
  setText('stat-total-messages', s.totalMessages);
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value ?? '—';
}

// ── Users table ─────────────────────────────────────────────────────────────

async function loadUsers() {
  const tbody = document.getElementById('users-tbody');
  tbody.innerHTML = '<tr><td colspan="5" class="loading"><div class="spinner"></div> Loading…</td></tr>';

  const result = await api('/admin/users');
  if (!result.ok) {
    tbody.innerHTML = '<tr><td colspan="5" class="text-danger">Failed to load users.</td></tr>';
    return;
  }

  const users = result.data || [];
  tbody.innerHTML = '';

  if (!users.length) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--text-muted)">No users found.</td></tr>';
    return;
  }

  const currentUser = getUser();

  users.forEach((u) => {
    const tr = document.createElement('tr');

    const tdName = document.createElement('td');
    tdName.textContent = u.name; // safe

    const tdEmail = document.createElement('td');
    tdEmail.textContent = u.email; // safe

    const tdRole = document.createElement('td');
    const badge = document.createElement('span');
    badge.className = `badge badge-${u.role}`;
    badge.textContent = u.role;
    tdRole.appendChild(badge);

    const tdDate = document.createElement('td');
    tdDate.textContent = new Date(u.createdAt).toLocaleDateString();

    const tdAction = document.createElement('td');
    if (u._id !== currentUser.id) {
      const btn = document.createElement('button');
      btn.className = 'btn btn-danger btn-sm';
      btn.textContent = 'Delete';
      btn.onclick = () => confirmDeleteUser(u._id, u.name, btn);
      tdAction.appendChild(btn);
    } else {
      // Can't delete self
      const self = document.createElement('span');
      self.className = 'text-muted';
      self.style.fontSize = '0.8rem';
      self.textContent = '(You)';
      tdAction.appendChild(self);
    }

    tr.appendChild(tdName);
    tr.appendChild(tdEmail);
    tr.appendChild(tdRole);
    tr.appendChild(tdDate);
    tr.appendChild(tdAction);
    tbody.appendChild(tr);
  });
}

async function confirmDeleteUser(id, name, btn) {
  // Simple browser confirm dialog
  if (!confirm(`Delete user "${name}"?\nThis will remove them from all groups.`)) return;

  btn.disabled   = true;
  btn.textContent = 'Deleting…';

  const result = await api(`/admin/users/${id}`, { method: 'DELETE' });

  if (!result.ok) {
    btn.disabled   = false;
    btn.textContent = 'Delete';
    showToast(result.message || 'Failed to delete user.', 'error');
    return;
  }

  showToast(`User "${name}" deleted.`, 'success');
  // Reload both users and stats
  await Promise.all([loadUsers(), loadStats()]);
}

// ── Groups table ────────────────────────────────────────────────────────────

async function loadGroups() {
  const tbody = document.getElementById('groups-tbody');
  tbody.innerHTML = '<tr><td colspan="5" class="loading"><div class="spinner"></div> Loading…</td></tr>';

  const result = await api('/admin/groups');
  if (!result.ok) {
    tbody.innerHTML = '<tr><td colspan="5" class="text-danger">Failed to load groups.</td></tr>';
    return;
  }

  const groups = result.data || [];
  tbody.innerHTML = '';

  if (!groups.length) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--text-muted)">No groups found.</td></tr>';
    return;
  }

  groups.forEach((g) => {
    const tr = document.createElement('tr');

    const tdName = document.createElement('td');
    tdName.className = 'fw-600';
    tdName.textContent = g.name; // safe

    const tdSubject = document.createElement('td');
    tdSubject.textContent = g.subject; // safe

    const tdCreator = document.createElement('td');
    tdCreator.textContent = g.createdBy?.name || '—'; // safe

    const tdMembers = document.createElement('td');
    tdMembers.textContent = g.memberCount;

    const tdAction = document.createElement('td');
    const btn = document.createElement('button');
    btn.className = 'btn btn-danger btn-sm';
    btn.textContent = 'Delete';
    btn.onclick = () => confirmDeleteGroup(g._id, g.name, btn);
    tdAction.appendChild(btn);

    tr.appendChild(tdName);
    tr.appendChild(tdSubject);
    tr.appendChild(tdCreator);
    tr.appendChild(tdMembers);
    tr.appendChild(tdAction);
    tbody.appendChild(tr);
  });
}

async function confirmDeleteGroup(id, name, btn) {
  if (!confirm(`Delete group "${name}"?\nAll messages in this group will also be deleted.`)) return;

  btn.disabled   = true;
  btn.textContent = 'Deleting…';

  const result = await api(`/admin/groups/${id}`, { method: 'DELETE' });

  if (!result.ok) {
    btn.disabled   = false;
    btn.textContent = 'Delete';
    showToast(result.message || 'Failed to delete group.', 'error');
    return;
  }

  showToast(`Group "${name}" deleted.`, 'success');
  await Promise.all([loadGroups(), loadStats()]);
}
