/**
 * public/js/dashboard.js — Student dashboard logic.
 *
 * Responsibilities:
 *  1. Auth guard — redirect to login if token missing or role is not student.
 *  2. Render navbar.
 *  3. Handle "Create Group" form submission.
 *  4. Fetch and render ALL groups as cards with Join/Open buttons.
 *  5. Client-side subject filter.
 *  6. Fetch and render "My Groups" section.
 *
 * XSS: All user-generated text is set via textContent, never innerHTML.
 */

document.addEventListener('DOMContentLoaded', async () => {
  // ── 1. Auth guard ──────────────────────────────────────────────────────────
  if (redirectIfNoAuth()) return;
  if (redirectIfWrongRole('student')) return;

  // ── 2. Navbar ──────────────────────────────────────────────────────────────
  renderNavbar('navbar');

  // ── 3. Load page data ──────────────────────────────────────────────────────
  await loadAllGroups();
  await loadMyGroups();
  setupCreateForm();
  setupSearch();
});

// ── All groups ─────────────────────────────────────────────────────────────

let allGroupsCache = []; // Cache for client-side filtering

async function loadAllGroups() {
  const container = document.getElementById('all-groups-grid');
  container.innerHTML = '<div class="loading"><div class="spinner"></div> Loading groups…</div>';

  const result = await api('/groups');
  if (!result.ok) {
    container.innerHTML = '<p class="text-danger">Failed to load groups.</p>';
    return;
  }

  allGroupsCache = result.data || [];
  renderGroups(allGroupsCache);
}

function renderGroups(groups) {
  const container = document.getElementById('all-groups-grid');
  container.innerHTML = '';

  if (!groups.length) {
    container.innerHTML = `
      <div class="empty-state" style="grid-column:1/-1">
        <div class="empty-icon">📚</div>
        <p>No groups yet — create the first one!</p>
      </div>`;
    return;
  }

  groups.forEach((g) => {
    const card = buildGroupCard(g);
    container.appendChild(card);
  });
}

function buildGroupCard(g) {
  const card = document.createElement('div');
  card.className = 'card group-card';
  card.dataset.groupId = g._id;

  // Header row: name + subject badge
  const header = document.createElement('div');
  header.className = 'group-card-header';

  const name = document.createElement('div');
  name.className = 'group-card-name';
  name.textContent = g.name; // safe

  const subject = document.createElement('span');
  subject.className = 'group-card-subject';
  subject.textContent = g.subject; // safe

  header.appendChild(name);
  header.appendChild(subject);

  // Meta info
  const meta = document.createElement('div');
  meta.className = 'group-card-meta';

  const creator = document.createElement('span');
  creator.textContent = `Created by: ${g.createdBy?.name || 'Unknown'}`;

  const members = document.createElement('span');
  members.textContent = `👥 ${g.memberCount} member${g.memberCount !== 1 ? 's' : ''}`;

  meta.appendChild(creator);
  meta.appendChild(members);

  // Footer: join/open button
  const footer = document.createElement('div');
  footer.className = 'group-card-footer';

  const btn = document.createElement('button');
  btn.dataset.id = g._id;

  if (g.isMember) {
    btn.className = 'btn btn-success btn-sm';
    btn.textContent = 'Open';
    btn.onclick = () => { window.location.href = `/group.html?id=${g._id}`; };
  } else {
    btn.className = 'btn btn-primary btn-sm';
    btn.textContent = 'Join';
    btn.onclick = () => joinGroup(g._id, btn, g.name);
  }

  footer.appendChild(btn);

  card.appendChild(header);
  card.appendChild(meta);
  card.appendChild(footer);

  return card;
}

async function joinGroup(id, btn, groupName) {
  btn.disabled   = true;
  btn.textContent = 'Joining…';

  const result = await api(`/groups/${id}/join`, { method: 'POST' });

  if (!result.ok) {
    btn.disabled   = false;
    btn.textContent = 'Join';
    showToast(result.message || 'Failed to join.', 'error');
    return;
  }

  showToast(`Joined "${groupName}"! Opening…`, 'success');
  setTimeout(() => { window.location.href = `/group.html?id=${id}`; }, 800);
}

// ── My groups ──────────────────────────────────────────────────────────────

async function loadMyGroups() {
  const container = document.getElementById('my-groups-list');
  container.innerHTML = '<div class="loading"><div class="spinner"></div></div>';

  const result = await api('/groups/mine');
  if (!result.ok) {
    container.innerHTML = '<p class="text-danger">Failed to load your groups.</p>';
    return;
  }

  const groups = result.data || [];
  container.innerHTML = '';

  if (!groups.length) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🔍</div>
        <p>You haven't joined any groups yet. Browse below and join one!</p>
      </div>`;
    return;
  }

  const ul = document.createElement('ul');
  ul.style.display = 'flex';
  ul.style.flexDirection = 'column';
  ul.style.gap = '0.5rem';

  groups.forEach((g) => {
    const li = document.createElement('li');
    li.style.cssText = 'display:flex;align-items:center;justify-content:space-between;padding:0.65rem 1rem;background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius-sm);';

    const info = document.createElement('div');
    const n = document.createElement('span');
    n.className = 'fw-600';
    n.textContent = g.name;
    const s = document.createElement('span');
    s.style.cssText = 'margin-left:0.5rem;font-size:0.8rem;color:var(--text-muted);';
    s.textContent = `• ${g.subject}`;
    info.appendChild(n);
    info.appendChild(s);

    const btn = document.createElement('button');
    btn.className = 'btn btn-primary btn-sm';
    btn.textContent = 'Open';
    btn.onclick = () => { window.location.href = `/group.html?id=${g._id}`; };

    li.appendChild(info);
    li.appendChild(btn);
    ul.appendChild(li);
  });

  container.appendChild(ul);
}

// ── Create group form ──────────────────────────────────────────────────────

function setupCreateForm() {
  const form = document.getElementById('create-group-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const name    = document.getElementById('group-name').value.trim();
    const subject = document.getElementById('group-subject').value.trim();
    const errEl   = document.getElementById('create-error');

    errEl.classList.add('hidden');

    if (!name || !subject) {
      errEl.textContent = 'Both group name and subject are required.';
      errEl.classList.remove('hidden');
      return;
    }

    const btn = form.querySelector('button[type="submit"]');
    btn.disabled   = true;
    btn.textContent = 'Creating…';

    const result = await api('/groups', {
      method: 'POST',
      body:   JSON.stringify({ name, subject }),
    });

    btn.disabled   = false;
    btn.textContent = 'Create Group';

    if (!result.ok) {
      errEl.textContent = result.message || 'Failed to create group.';
      errEl.classList.remove('hidden');
      return;
    }

    form.reset();
    showToast(`Group "${name}" created!`, 'success');

    // Reload both sections
    await loadAllGroups();
    await loadMyGroups();
  });
}

// ── Search / filter ─────────────────────────────────────────────────────────

function setupSearch() {
  const input = document.getElementById('search-subject');
  if (!input) return;

  input.addEventListener('input', () => {
    const q = input.value.trim().toLowerCase();
    if (!q) {
      renderGroups(allGroupsCache);
      return;
    }
    const filtered = allGroupsCache.filter(
      (g) => g.subject.toLowerCase().includes(q) || g.name.toLowerCase().includes(q)
    );
    renderGroups(filtered);
  });
}
