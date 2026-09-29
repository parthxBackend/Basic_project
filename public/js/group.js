/**
 * public/js/group.js — Group message board logic.
 *
 * On load:
 *  1. Auth guard (student only).
 *  2. Reads ?id= from the URL query string.
 *  3. Fetches group details — if 403 (non-member) or 404, shows access-denied screen.
 *  4. Builds the group layout (members sidebar + message board) dynamically.
 *  5. Renders group header + members list.
 *  6. Fetches and renders messages; polls every 5 seconds for new ones.
 *  7. Handles message submission.
 *
 * XSS: All user content rendered via textContent (never innerHTML for user data).
 */

const POLL_INTERVAL_MS = 5000; // 5-second polling — no WebSockets needed

document.addEventListener('DOMContentLoaded', async () => {
  // ── 1. Auth guard ──────────────────────────────────────────────────────────
  if (redirectIfNoAuth()) return;
  if (redirectIfWrongRole('student')) return;

  renderNavbar('navbar');

  // ── 2. Read group ID from URL ──────────────────────────────────────────────
  const params  = new URLSearchParams(window.location.search);
  const groupId = params.get('id');

  if (!groupId) {
    window.location.href = '/student-dashboard.html';
    return;
  }

  // ── 3. Fetch group details (membership check happens on the server) ─────────
  const groupResult = await api(`/groups/${groupId}`);

  if (!groupResult.ok) {
    // 403 = not a member; 404 = group doesn't exist
    showAccessDenied(groupResult.message);
    return;
  }

  const group = groupResult.data;

  // ── 4. Build the group layout into #main-content ───────────────────────────
  buildLayout();

  // ── 5. Populate header and members ─────────────────────────────────────────
  renderGroupHeader(group);
  renderMembers(group.members);

  // ── 6. Initial message load ────────────────────────────────────────────────
  await loadMessages(groupId);

  // ── 7. Polling: refresh messages every 5 seconds ──────────────────────────
  setInterval(() => loadMessages(groupId), POLL_INTERVAL_MS);

  // ── 8. Message send form ───────────────────────────────────────────────────
  setupSendForm(groupId);
});

// ── Build Layout ────────────────────────────────────────────────────────────
/**
 * Inserts the members sidebar + message board HTML into #main-content.
 * Done in JS (not in HTML) so we can guard access before showing the UI.
 */
function buildLayout() {
  const main = document.getElementById('main-content');
  main.innerHTML = ''; // Clear the loading spinner

  // Outer grid wrapper
  const layout = document.createElement('div');
  layout.className = 'group-layout';

  // ── Members sidebar ──────────────────────────────────────────────────────
  const aside = document.createElement('aside');
  aside.className = 'members-panel';

  const membersTitle = document.createElement('h3');
  const memberCountSpan = document.createElement('span');
  memberCountSpan.id = 'member-count';
  memberCountSpan.textContent = '0';
  membersTitle.appendChild(document.createTextNode('👥 Members ('));
  membersTitle.appendChild(memberCountSpan);
  membersTitle.appendChild(document.createTextNode(')'));

  const membersList = document.createElement('div');
  membersList.id = 'members-list';

  aside.appendChild(membersTitle);
  aside.appendChild(membersList);

  // ── Message board ────────────────────────────────────────────────────────
  const board = document.createElement('div');
  board.className = 'message-board';

  // Message feed
  const feed = document.createElement('div');
  feed.id = 'message-feed';
  feed.className = 'message-feed';

  const feedLoading = document.createElement('div');
  feedLoading.className = 'loading';
  feedLoading.innerHTML = '<div class="spinner"></div> Loading messages…';
  feed.appendChild(feedLoading);

  // Send form
  const form = document.createElement('form');
  form.id = 'message-form';
  form.className = 'message-input-area';

  const textarea = document.createElement('textarea');
  textarea.id = 'message-input';
  textarea.placeholder = 'Type a message… (Ctrl+Enter to send)';
  textarea.maxLength = 2000;
  textarea.rows = 3;
  textarea.required = true;

  const sendBtn = document.createElement('button');
  sendBtn.type = 'submit';
  sendBtn.className = 'btn btn-primary';
  sendBtn.style.cssText = 'height:80px;min-width:80px;';
  sendBtn.textContent = 'Send';

  form.appendChild(textarea);
  form.appendChild(sendBtn);

  const hint = document.createElement('p');
  hint.className = 'text-muted';
  hint.style.cssText = 'font-size:0.78rem;text-align:center;';
  hint.textContent = 'Messages refresh automatically every 5 seconds.';

  board.appendChild(feed);
  board.appendChild(form);
  board.appendChild(hint);

  layout.appendChild(aside);
  layout.appendChild(board);
  main.appendChild(layout);
}

// ── Render group header ─────────────────────────────────────────────────────

function renderGroupHeader(group) {
  const headerEl = document.getElementById('group-header');
  headerEl.classList.remove('hidden');

  document.getElementById('group-name').textContent    = group.name;    // safe
  document.getElementById('group-subject').textContent = group.subject; // safe
  document.title = `${group.name} | StudyGroups`;
}

// ── Render members sidebar ──────────────────────────────────────────────────

function renderMembers(members) {
  const list = document.getElementById('members-list');
  if (!list) return;
  list.innerHTML = '';

  const countEl = document.getElementById('member-count');
  if (countEl) countEl.textContent = members.length;

  members.forEach((m) => {
    const item = document.createElement('div');
    item.className = 'member-item';

    const avatar = document.createElement('div');
    avatar.className = 'member-avatar';
    avatar.textContent = (m.name || '?').charAt(0).toUpperCase(); // First initial

    const name = document.createElement('span');
    name.textContent = m.name; // safe — textContent

    item.appendChild(avatar);
    item.appendChild(name);
    list.appendChild(item);
  });
}

// ── Load messages ───────────────────────────────────────────────────────────

let lastMessageCount = -1; // Track to avoid unnecessary re-renders

async function loadMessages(groupId) {
  const result = await api(`/groups/${groupId}/messages`);
  if (!result.ok) return; // Silently ignore polling errors

  const feed     = document.getElementById('message-feed');
  const messages = result.data || [];

  // Skip re-render if nothing changed
  if (messages.length === lastMessageCount) return;
  lastMessageCount = messages.length;

  feed.innerHTML = '';

  if (!messages.length) {
    const empty = document.createElement('div');
    empty.className = 'empty-state';

    const icon = document.createElement('div');
    icon.className = 'empty-icon';
    icon.textContent = '💬';

    const txt = document.createElement('p');
    txt.textContent = 'No messages yet. Be the first to say something!';

    empty.appendChild(icon);
    empty.appendChild(txt);
    feed.appendChild(empty);
    return;
  }

  const currentUser = getUser();

  messages.forEach((msg) => {
    const bubble = document.createElement('div');
    bubble.className = 'message-bubble';

    // Avatar
    const avatar = document.createElement('div');
    avatar.className = 'msg-avatar';
    avatar.textContent = (msg.sender?.name || '?').charAt(0).toUpperCase();

    // Content wrapper
    const content = document.createElement('div');
    content.className = 'msg-content';

    // Meta (sender name + time)
    const meta = document.createElement('div');
    meta.className = 'msg-meta';

    const senderName = document.createElement('span');
    senderName.className = 'msg-sender';
    senderName.textContent = msg.sender?.name || 'Unknown'; // safe

    // Highlight the current user's own messages
    if (msg.sender?._id === currentUser?.id) {
      senderName.style.color = 'var(--primary-light)';
    }

    const time = document.createElement('span');
    time.className = 'msg-time';
    time.textContent = formatTime(msg.createdAt);

    meta.appendChild(senderName);
    meta.appendChild(time);

    // Message text
    const text = document.createElement('p');
    text.className = 'msg-text';
    text.textContent = msg.text; // textContent — XSS safe

    content.appendChild(meta);
    content.appendChild(text);

    bubble.appendChild(avatar);
    bubble.appendChild(content);
    feed.appendChild(bubble);
  });

  // Auto-scroll to latest message
  feed.scrollTop = feed.scrollHeight;
}

// ── Send message form ───────────────────────────────────────────────────────

function setupSendForm(groupId) {
  const form     = document.getElementById('message-form');
  const textarea = document.getElementById('message-input');
  if (!form || !textarea) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const text = textarea.value.trim();
    if (!text) {
      showToast('Message cannot be empty.', 'error');
      return;
    }

    const btn = form.querySelector('button[type="submit"]');
    btn.disabled    = true;
    btn.textContent = 'Sending…';

    const result = await api(`/groups/${groupId}/messages`, {
      method: 'POST',
      body:   JSON.stringify({ text }),
    });

    btn.disabled    = false;
    btn.textContent = 'Send';

    if (!result.ok) {
      showToast(result.message || 'Failed to send message.', 'error');
      return;
    }

    textarea.value = '';
    lastMessageCount = -1; // Force a re-render on next poll/load
    await loadMessages(groupId);
  });

  // Ctrl/Cmd + Enter shortcut to submit
  textarea.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      form.dispatchEvent(new Event('submit'));
    }
  });
}

// ── Access denied screen ────────────────────────────────────────────────────

function showAccessDenied(message) {
  // Hide the group header (stays hidden)
  const header = document.getElementById('group-header');
  if (header) header.classList.add('hidden');

  const main = document.getElementById('main-content');
  if (!main) return;

  main.innerHTML = ''; // Clear loading spinner

  const div = document.createElement('div');
  div.className = 'access-denied';

  const icon = document.createElement('div');
  icon.className = 'lock-icon';
  icon.textContent = '🔒';

  const title = document.createElement('h2');
  title.textContent = 'Access Restricted';

  const msg = document.createElement('p');
  // safe — textContent
  msg.textContent = message || 'You must join this group to view the message board.';

  const btn = document.createElement('a');
  btn.href      = '/student-dashboard.html';
  btn.className = 'btn btn-primary';
  btn.textContent = '← Back to Dashboard';

  div.appendChild(icon);
  div.appendChild(title);
  div.appendChild(msg);
  div.appendChild(btn);
  main.appendChild(div);
}

// ── Utilities ────────────────────────────────────────────────────────────────

function formatTime(iso) {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    month:  'short',
    day:    'numeric',
    hour:   '2-digit',
    minute: '2-digit',
  });
}
