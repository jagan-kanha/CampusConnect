const TOKEN_KEY = 'campusconnect.token';
const EMAIL_KEY = 'campusconnect.email';
const ROLE_KEY = 'campusconnect.role';

const authScreen = document.querySelector('#auth-screen');
const dashboard = document.querySelector('#dashboard');
const authForm = document.querySelector('#auth-form');
const authMessage = document.querySelector('#auth-message');
const complaintMessage = document.querySelector('#complaint-message');
let authMode = 'login';
let complaintPage = 0;
let complaintPageSize = 10;
let complaintSort = 'createdAt,desc';
let complaintFilters = { status: '', priority: '', category: '' };

function setMessage(element, message, success = false) {
  element.textContent = message;
  element.classList.toggle('success', success);
}

async function api(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await fetch(path, { ...options, headers });
  const body = response.status === 204 ? null : await response.json().catch(() => null);
  if (!response.ok) {
    if (response.status === 401) logout(false);
    throw new Error(body?.message || body?.error || `Request failed (${response.status})`);
  }
  return body;
}

function setAuthMode(mode) {
  authMode = mode;
  const registering = mode === 'register';
  document.querySelector('#login-tab').classList.toggle('selected', !registering);
  document.querySelector('#register-tab').classList.toggle('selected', registering);
  document.querySelector('#login-tab').setAttribute('aria-selected', String(!registering));
  document.querySelector('#register-tab').setAttribute('aria-selected', String(registering));
  document.querySelector('#name-field').classList.toggle('hidden', !registering);
  document.querySelector('#name').required = registering;
  document.querySelector('#auth-title').textContent = registering ? 'Join your campus.' : 'Good to see you.';
  document.querySelector('#auth-subtitle').textContent = registering ? 'Create an account to make your campus better.' : 'Sign in with your campus account to continue.';
  document.querySelector('#auth-submit').innerHTML = registering ? 'Create account <span>→</span>' : 'Sign in <span>→</span>';
  document.querySelector('#password').autocomplete = registering ? 'new-password' : 'current-password';
  setMessage(authMessage, '');
}

document.querySelector('#login-tab').addEventListener('click', () => setAuthMode('login'));
document.querySelector('#register-tab').addEventListener('click', () => setAuthMode('register'));

authForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const submit = document.querySelector('#auth-submit');
  submit.disabled = true;
  setMessage(authMessage, authMode === 'register' ? 'Creating your account…' : 'Signing you in…');
  const payload = { email: document.querySelector('#email').value.trim(), password: document.querySelector('#password').value };
  if (authMode === 'register') payload.name = document.querySelector('#name').value.trim();
  try {
    const result = await api(`/api/auth/${authMode === 'register' ? 'register' : 'login'}`, { method: 'POST', body: JSON.stringify(payload) });
    if (authMode === 'register') {
      setAuthMode('login');
      document.querySelector('#email').value = payload.email;
      setMessage(authMessage, 'Account created. Sign in with your new credentials.', true);
      return;
    }
    localStorage.setItem(TOKEN_KEY, result.token);
    localStorage.setItem(EMAIL_KEY, result.email);
    localStorage.setItem(ROLE_KEY, result.role);
    await showDashboard();
  } catch (error) {
    setMessage(authMessage, error.message);
  } finally {
    submit.disabled = false;
  }
});

function showAuth() {
  document.querySelector('.app-shell').classList.add('logged-out');
  authScreen.classList.remove('hidden');
  dashboard.classList.add('hidden');
}

function showApp() {
  document.querySelector('.app-shell').classList.remove('logged-out');
  authScreen.classList.add('hidden');
  dashboard.classList.remove('hidden');
}

async function showDashboard() {
  showApp();
  const email = localStorage.getItem(EMAIL_KEY) || 'Student';
  const isAdmin = localStorage.getItem(ROLE_KEY) === 'ADMIN';
  const name = email.split('@')[0].replace(/[._-]+/g, ' ');
  document.querySelector('#profile-name').textContent = name;
  document.querySelector('#profile-role').textContent = isAdmin ? 'Administrator' : 'Student account';
  document.querySelector('#welcome-name').textContent = name.split(' ')[0];
  document.querySelector('#avatar').textContent = name.trim().charAt(0).toUpperCase() || 'S';
  document.querySelector('#nav-label').textContent = isAdmin ? 'All complaints' : 'My complaints';
  document.querySelector('#portal-label').textContent = isAdmin ? 'ADMIN PORTAL' : 'STUDENT PORTAL';
  document.querySelector('#welcome-subtitle').textContent = isAdmin ? 'Review reports and keep students informed.' : 'Here’s what’s happening around your campus.';
  document.querySelector('#list-kicker').textContent = isAdmin ? 'CAMPUS INBOX' : 'YOUR CAMPUS VOICE';
  document.querySelector('#list-title').textContent = isAdmin ? 'All complaints' : 'My complaints';
  document.querySelector('#new-complaint-button').classList.toggle('hidden', isAdmin);
  document.querySelector('#create-card').classList.add('hidden');
  document.querySelector('#total-label').textContent = isAdmin ? 'TOTAL COMPLAINTS' : 'TOTAL REPORTED';
  document.querySelector('#total-caption').textContent = isAdmin ? 'Across your campus' : 'Your voice on campus';
  document.querySelector('#admin-filters').classList.toggle('hidden', !isAdmin);
  document.querySelector('#filter-status').value = complaintFilters.status;
  document.querySelector('#filter-priority').value = complaintFilters.priority;
  document.querySelector('#filter-category').value = complaintFilters.category;
  document.querySelector('#sort-select').value = complaintSort;
  document.querySelector('#page-size').value = String(complaintPageSize);
  complaintPage = 0;
  await loadComplaints();
}

function logout(showMessage = true) {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(EMAIL_KEY);
  localStorage.removeItem(ROLE_KEY);
  closeCreateForm();
  showAuth();
  if (showMessage) setMessage(authMessage, 'You have been signed out.', true);
}

function readable(value) {
  return String(value || '').toLowerCase().replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDate(value) {
  if (!value) return 'Recently';
  const date = Array.isArray(value) ? new Date(value[0], value[1] - 1, value[2], value[3] || 0, value[4] || 0) : new Date(value);
  if (Number.isNaN(date.getTime())) return 'Recently';
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(date);
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
}

function renderComplaint(item, isAdmin) {
  const complaintId = Number(item.id);
  const conversation = `<div class="conversation"><button class="text-button conversation-toggle" type="button" data-id="${complaintId}">＋ View conversation</button><div class="conversation-box hidden" id="conversation-${complaintId}"></div></div>`;
  const adminActions = `<div class="admin-actions"><form class="status-form" data-id="${complaintId}"><label class="field">Update status<select name="status"><option value="OPEN" ${item.status === 'OPEN' ? 'selected' : ''}>Open</option><option value="IN_PROGRESS" ${item.status === 'IN_PROGRESS' ? 'selected' : ''}>In progress</option><option value="RESOLVED" ${item.status === 'RESOLVED' ? 'selected' : ''}>Resolved</option><option value="REJECTED" ${item.status === 'REJECTED' ? 'selected' : ''}>Rejected</option></select></label><button class="button button-quiet" type="submit">Save status</button></form>${conversation}<form class="comment-form" data-id="${complaintId}"><label class="field">Send a response<textarea name="message" rows="2" maxlength="1000" placeholder="Write a helpful update for the student…" required></textarea></label><button class="button button-primary" type="submit">Post response <span>→</span></button></form><p class="form-message admin-message" role="status" aria-live="polite"></p></div>`;
  const studentConversation = `<div class="student-conversation">${conversation}</div>`;
  return `<article class="complaint-row"><div class="complaint-main"><div class="complaint-title">${escapeHtml(item.title)}</div><div class="complaint-description">${escapeHtml(item.description)}</div><div class="complaint-meta"><span class="meta-pill">${escapeHtml(readable(item.category))}</span><span class="meta-pill">${escapeHtml(readable(item.priority))} priority</span><span class="status-pill status-${escapeHtml(String(item.status).toLowerCase())}">${escapeHtml(readable(item.status))}</span>${isAdmin ? `<span class="meta-pill">Student #${escapeHtml(item.userId)}</span>` : ''}</div></div><time class="complaint-date">${escapeHtml(formatDate(item.createdAt))}</time>${isAdmin ? adminActions : studentConversation}</article>`;
}

function renderConversation(comments, complaintId, isAdmin) {
  const messages = comments.length ? comments.map((comment) => {
    const author = comment.userRole === 'ADMIN' ? 'Campus admin' : `Student account #${escapeHtml(comment.userId)}`;
    return `<div class="conversation-item"><span>${author} · ${escapeHtml(formatDate(comment.createdAt))}</span><p>${escapeHtml(comment.message)}</p></div>`;
  }).join('') : '<div class="conversation-empty">No messages on this complaint yet.</div>';
  const replyForm = isAdmin ? '' : `<form class="student-comment-form" data-id="${complaintId}"><label class="field">Add to the conversation<textarea name="message" rows="2" maxlength="1000" placeholder="Share an update or ask a question…" required></textarea></label><button class="button button-quiet" type="submit">Add comment</button><p class="form-message student-comment-message" role="status" aria-live="polite"></p></form>`;
  return `${messages}${replyForm}`;
}

async function showConversation(button) {
  const complaintId = Number(button.dataset.id);
  const box = document.querySelector(`#conversation-${complaintId}`);
  try {
    const comments = await api(`/api/complaints/${complaintId}/comments`);
    const isAdmin = localStorage.getItem(ROLE_KEY) === 'ADMIN';
    box.innerHTML = renderConversation(comments, complaintId, isAdmin);
    box.classList.remove('hidden');
    button.textContent = '− Hide conversation';
  } catch (error) {
    box.innerHTML = `<div class="conversation-empty">${escapeHtml(error.message)}</div>`;
    box.classList.remove('hidden');
  }
}

async function loadComplaints() {
  const list = document.querySelector('#complaints-list');
  list.innerHTML = '<div class="empty-state"><span class="empty-icon">◌</span><strong>Loading your campus updates…</strong></div>';
  try {
    const isAdmin = localStorage.getItem(ROLE_KEY) === 'ADMIN';
    const parameters = new URLSearchParams({
      page: String(complaintPage),
      size: String(complaintPageSize),
      sort: complaintSort,
    });
    if (isAdmin) {
      for (const [key, value] of Object.entries(complaintFilters)) {
        if (value) parameters.set(key, value);
      }
    }
    const endpoint = isAdmin ? '/api/admin/complaints' : '/api/complaints/my';
    const page = await api(`${endpoint}?${parameters.toString()}`);
    if (page.totalPages > 0 && complaintPage >= page.totalPages) {
      complaintPage = page.totalPages - 1;
      return loadComplaints();
    }
    if (page.totalPages === 0) complaintPage = 0;
    const complaints = page.content || [];
    document.querySelector('#total-count').textContent = page.totalElements ?? complaints.length;
    document.querySelector('#progress-count').textContent = complaints.filter((item) => item.status === 'IN_PROGRESS').length;
    document.querySelector('#resolved-count').textContent = complaints.filter((item) => item.status === 'RESOLVED').length;
    document.querySelector('#nav-count').textContent = page.totalElements ?? complaints.length;
    document.querySelector('#heading-count').textContent = page.totalElements ?? complaints.length;
    document.querySelector('#total-caption').textContent = isAdmin
      ? (Object.values(complaintFilters).some(Boolean) ? 'Matching filters' : 'Across your campus')
      : 'Your voice on campus';
    document.querySelector('#previous-page').disabled = page.first;
    document.querySelector('#next-page').disabled = page.last || page.totalPages === 0;
    document.querySelector('#page-indicator').textContent = `Page ${page.totalPages === 0 ? 0 : page.number + 1} of ${page.totalPages}`;
    const firstItem = page.totalElements === 0 ? 0 : page.number * page.size + 1;
    const lastItem = page.number * page.size + (page.numberOfElements || complaints.length);
    document.querySelector('#list-summary').textContent = page.totalElements === 0
      ? 'No complaints'
      : `Showing ${firstItem}–${lastItem} of ${page.totalElements}`;
    if (!complaints.length) {
      const noResults = isAdmin && Object.values(complaintFilters).some(Boolean)
        ? 'No complaints match these filters.'
        : 'No complaints yet. Your campus could use your voice.';
      list.innerHTML = `<div class="empty-state"><span class="empty-icon">▤</span><strong>${noResults}</strong></div>`;
      return;
    }
    list.innerHTML = complaints.map((item) => renderComplaint(item, isAdmin)).join('');
  } catch (error) {
    list.innerHTML = `<div class="empty-state"><span class="empty-icon">!</span><strong>${escapeHtml(error.message)}</strong></div>`;
    if (error.message.includes('Failed to fetch')) list.innerHTML = '<div class="empty-state"><span class="empty-icon">!</span><strong>Couldn’t reach the server. Start Spring Boot and refresh.</strong></div>';
  }
}

function openCreateForm() {
  const card = document.querySelector('#create-card');
  card.classList.remove('hidden');
  card.scrollIntoView({ behavior: 'smooth', block: 'start' });
  document.querySelector('#complaint-title').focus({ preventScroll: true });
}

function closeCreateForm() {
  document.querySelector('#create-card').classList.add('hidden');
  document.querySelector('#complaint-form').reset();
  setMessage(complaintMessage, '');
}

document.querySelector('#new-complaint-button').addEventListener('click', openCreateForm);
document.querySelector('#close-create').addEventListener('click', closeCreateForm);
document.querySelector('#cancel-create').addEventListener('click', closeCreateForm);
document.querySelector('#refresh-button').addEventListener('click', loadComplaints);
document.querySelector('#logout-button').addEventListener('click', () => logout());
document.querySelector('#apply-filters').addEventListener('click', () => {
  complaintFilters = {
    status: document.querySelector('#filter-status').value,
    priority: document.querySelector('#filter-priority').value,
    category: document.querySelector('#filter-category').value,
  };
  complaintPage = 0;
  loadComplaints();
});
document.querySelector('#clear-filters').addEventListener('click', () => {
  document.querySelector('#filter-status').value = '';
  document.querySelector('#filter-priority').value = '';
  document.querySelector('#filter-category').value = '';
  complaintFilters = { status: '', priority: '', category: '' };
  complaintPage = 0;
  loadComplaints();
});
document.querySelector('#sort-select').addEventListener('change', (event) => {
  complaintSort = event.target.value;
  complaintPage = 0;
  loadComplaints();
});
document.querySelector('#page-size').addEventListener('change', (event) => {
  complaintPageSize = Number(event.target.value);
  complaintPage = 0;
  loadComplaints();
});
document.querySelector('#previous-page').addEventListener('click', () => {
  if (complaintPage > 0) {
    complaintPage -= 1;
    loadComplaints();
  }
});
document.querySelector('#next-page').addEventListener('click', () => {
  complaintPage += 1;
  loadComplaints();
});

document.querySelector('#complaint-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const submit = document.querySelector('#complaint-submit');
  submit.disabled = true;
  setMessage(complaintMessage, 'Sending your complaint…');
  const payload = {
    title: document.querySelector('#complaint-title').value.trim(),
    description: document.querySelector('#description').value.trim(),
    category: document.querySelector('#category').value,
    priority: document.querySelector('#priority').value,
  };
  try {
    await api('/api/complaints', { method: 'POST', body: JSON.stringify(payload) });
    closeCreateForm();
    await loadComplaints();
    document.querySelector('#my-complaints').scrollIntoView({ behavior: 'smooth', block: 'start' });
  } catch (error) {
    setMessage(complaintMessage, error.message);
  } finally {
    submit.disabled = false;
  }
});

document.querySelector('#complaints-list').addEventListener('submit', async (event) => {
  const form = event.target;
  if (!form.matches('.status-form, .comment-form, .student-comment-form')) return;
  event.preventDefault();
  const complaintId = Number(form.dataset.id);
  const message = form.closest('.complaint-row').querySelector('.admin-message, .student-comment-message');
  const button = form.querySelector('button[type="submit"]');
  button.disabled = true;
  try {
    if (form.matches('.status-form')) {
      await api(`/api/admin/complaints/${complaintId}/status`, { method: 'PUT', body: JSON.stringify({ status: form.elements.status.value }) });
    } else if (form.matches('.student-comment-form')) {
      await api(`/api/complaints/${complaintId}/comments`, { method: 'POST', body: JSON.stringify({ message: form.elements.message.value.trim() }) });
      await showConversation(document.querySelector(`.conversation-toggle[data-id="${complaintId}"]`));
      return;
    } else {
      await api(`/api/complaints/${complaintId}/comments`, { method: 'POST', body: JSON.stringify({ message: form.elements.message.value.trim() }) });
      form.reset();
    }
    if (message) setMessage(message, form.matches('.status-form') ? 'Status updated.' : 'Response posted.', true);
    await loadComplaints();
  } catch (error) {
    setMessage(message, error.message);
  } finally {
    button.disabled = false;
  }
});

document.querySelector('#complaints-list').addEventListener('click', async (event) => {
  const button = event.target.closest('.conversation-toggle');
  if (!button) return;
  const box = document.querySelector(`#conversation-${Number(button.dataset.id)}`);
  if (!box.classList.contains('hidden')) {
    box.classList.add('hidden');
    button.textContent = '＋ View conversation';
    return;
  }
  button.disabled = true;
  await showConversation(button);
  button.disabled = false;
});

document.querySelector('#today-date').textContent = new Intl.DateTimeFormat(undefined, { weekday: 'short', month: 'short', day: 'numeric' }).format(new Date());
document.querySelector('#footer-year').textContent = new Date().getFullYear();
if (localStorage.getItem(TOKEN_KEY) && !localStorage.getItem(ROLE_KEY)) logout(false);
if (localStorage.getItem(TOKEN_KEY)) showDashboard(); else showAuth();
