const TOKEN_KEY = 'campusconnect.token';
const EMAIL_KEY = 'campusconnect.email';
const NAME_KEY = 'campusconnect.name';
const ROLE_KEY = 'campusconnect.role';

const authScreen = document.querySelector('#auth-screen');
const dashboard = document.querySelector('#dashboard');
const authForm = document.querySelector('#auth-form');
const authMessage = document.querySelector('#auth-message');
const complaintMessage = document.querySelector('#complaint-message');
let authMode = 'login';
let pendingRegistrationEmail = '';
let complaintPage = 0;
let complaintPageSize = 10;
let complaintSort = 'createdAt,desc';
let complaintFilters = { status: '', priority: '', category: '' };
const hostelsByGender = {
  MALE: ['DBA Hall', 'GDB Hall', 'MSS Hall', 'MV Hall', 'SD Hall', 'VS Hall'],
  FEMALE: ['HB Hall', 'KMS Hall', 'CVR Hall'],
};

function setMessage(element, message, success = false) {
  element.textContent = message;
  element.classList.toggle('success', success);
}

async function api(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) headers.Authorization = `Bearer ${token}`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);
  let response;
  try {
    response = await fetch(path, { ...options, headers, signal: options.signal || controller.signal });
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error('The server took too long to respond. Please try again; if verifying, try signing in before requesting another code.');
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
  const body = response.status === 204 ? null : await response.json().catch(() => null);
  if (!response.ok) {
    if (response.status === 401) logout(false);
    const error = new Error(body?.message || body?.error || `Request failed (${response.status})`);
    error.status = response.status;
    throw error;
  }
  return body;
}

function setAuthMode(mode) {
  authMode = mode;
  const registering = mode === 'register';
  populateHostels(document.querySelector('#hostel'), document.querySelector('#gender').value);
  const email = document.querySelector('#email');
  if (registering) {
    email.setAttribute('pattern', '[A-Za-z0-9._%+-]+@nitrkl\\.ac\\.in');
  } else {
    email.removeAttribute('pattern');
  }
  syncRegistrationEmailRule();
  document.querySelector('#registration-otp-panel').classList.add('hidden');
  document.querySelector('#forgot-password-panel').classList.add('hidden');
  authForm.classList.remove('hidden');
  document.querySelector('#auth-tabs').classList.remove('hidden');
  document.querySelector('#forgot-password-link').classList.toggle('hidden', registering);
  document.querySelector('#login-tab').classList.toggle('selected', !registering);
  document.querySelector('#register-tab').classList.toggle('selected', registering);
  document.querySelector('#login-tab').setAttribute('aria-selected', String(!registering));
  document.querySelector('#register-tab').setAttribute('aria-selected', String(registering));
  document.querySelector('#name-field').classList.toggle('hidden', !registering);
  document.querySelector('#name').required = registering;
  document.querySelectorAll('.registration-field').forEach((field) => {
    field.classList.toggle('hidden', !registering);
    field.querySelector('input, select').required = registering;
  });
  document.querySelector('#auth-title').textContent = registering ? 'Join your campus.' : 'Good to see you.';
  document.querySelector('#auth-subtitle').textContent = registering ? 'Create an account to make your campus better.' : 'Sign in with your campus account to continue.';
  document.querySelector('#auth-submit').innerHTML = registering ? 'Create account <span>→</span>' : 'Sign in <span>→</span>';
  document.querySelector('#password').autocomplete = registering ? 'new-password' : 'current-password';
  setMessage(authMessage, '');
}

document.querySelector('#login-tab').addEventListener('click', () => setAuthMode('login'));
document.querySelector('#register-tab').addEventListener('click', () => setAuthMode('register'));
document.querySelector('#roll-number').addEventListener('input', syncRegistrationEmailRule);
document.querySelector('#email').addEventListener('input', syncRegistrationEmailRule);
document.querySelector('#gender').addEventListener('change', (event) => {
  populateHostels(document.querySelector('#hostel'), event.target.value);
});
document.querySelector('#profile-gender').addEventListener('change', (event) => {
  populateHostels(document.querySelector('#profile-hostel'), event.target.value);
});

function populateHostels(select, gender, selectedHostel = '') {
  const hostels = hostelsByGender[gender] || [];
  select.innerHTML = `<option value="">${hostels.length ? 'Select your current hostel' : 'Choose gender first'}</option>`;
  hostels.forEach((hostel) => {
    const option = document.createElement('option');
    option.value = hostel;
    option.textContent = hostel;
    select.append(option);
  });
  select.disabled = hostels.length === 0;
  select.value = hostels.includes(selectedHostel) ? selectedHostel : '';
}

function syncRegistrationEmailRule() {
  const email = document.querySelector('#email');
  if (authMode !== 'register') {
    email.setCustomValidity('');
    email.title = 'Use your @nitrkl.ac.in email address';
    email.placeholder = 'college email ID required';
    return;
  }
  const rollNumber = document.querySelector('#roll-number').value.trim();
  const requiredEmail = `${rollNumber.toLowerCase()}@nitrkl.ac.in`;
  email.placeholder = rollNumber ? requiredEmail : 'college email ID required';
  email.title = rollNumber
    ? `Email must match your roll number: ${requiredEmail}`
    : 'Enter your roll number first; your college email must match it';
  const enteredEmail = email.value.trim().toLowerCase();
  email.setCustomValidity(rollNumber && enteredEmail && enteredEmail !== requiredEmail
    ? `Use ${requiredEmail} for this roll number.`
    : '');
}

function describeAcademicRoll(rollNumber) {
  const match = /^\d(\d{2})([A-Za-z]{2})\d{4}$/.exec(String(rollNumber || ''));
  if (!match) return '';
  const admissionYear = 2000 + Number(match[1]);
  const currentYear = new Date().getFullYear();
  const year = currentYear - admissionYear + 1;
  if (year < 1) return `Incoming ${admissionYear} batch`;
  const suffix = year % 100 >= 11 && year % 100 <= 13 ? 'th' : ({ 1: 'st', 2: 'nd', 3: 'rd' }[year % 10] || 'th');
  const departments = {
    BM: 'Biomedical Engineering', BT: 'Biotechnology', CE: 'Civil Engineering',
    CH: 'Chemical Engineering', CR: 'Ceramic Engineering', CS: 'Computer Science and Engineering',
    EC: 'Electronics and Communication Engineering', EE: 'Electrical Engineering',
    EI: 'Electronics and Instrumentation Engineering', ID: 'Industrial Design',
    ME: 'Mechanical Engineering', MM: 'Metallurgical and Materials Engineering', MN: 'Mining Engineering',
  };
  return `${year}${suffix} Year · ${departments[match[2].toUpperCase()] || match[2].toUpperCase()}`;
}

function renderProfileSummary(profile) {
  document.querySelector('#summary-profile-name').textContent = profile.name || '—';
  document.querySelector('#summary-profile-email').textContent = profile.email || '—';
  document.querySelector('#summary-profile-roll').textContent = profile.rollNumber || '—';
  document.querySelector('#summary-profile-dob').textContent = profile.dateOfBirth || '—';
  document.querySelector('#summary-profile-mobile').textContent = profile.mobileNumber || '—';
  document.querySelector('#summary-profile-gender').textContent = readable(profile.gender) || '—';
  document.querySelector('#summary-profile-hostel').textContent = profile.hostel || '—';
  document.querySelector('#student-academic-tag').textContent = describeAcademicRoll(profile.rollNumber);
}

authForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const submit = document.querySelector('#auth-submit');
  submit.disabled = true;
  setMessage(authMessage, authMode === 'register' ? 'Sending a verification code…' : 'Signing you in…');
  const payload = { email: document.querySelector('#email').value.trim(), password: document.querySelector('#password').value };
  if (authMode === 'register') {
    payload.name = document.querySelector('#name').value.trim();
    payload.rollNumber = document.querySelector('#roll-number').value.trim();
    payload.dateOfBirth = document.querySelector('#date-of-birth').value;
    payload.mobileNumber = document.querySelector('#mobile-number').value.trim();
    payload.gender = document.querySelector('#gender').value;
    payload.hostel = document.querySelector('#hostel').value;
  }
  try {
    const result = await api(authMode === 'register' ? '/api/auth/register/request-otp' : '/api/auth/login', { method: 'POST', body: JSON.stringify(payload) });
    if (authMode === 'register') {
      pendingRegistrationEmail = payload.email;
      document.querySelector('#registration-otp-email').textContent = pendingRegistrationEmail;
      setMessage(authMessage, '');
      setMessage(document.querySelector('#registration-otp-message'), '');
      authForm.classList.add('hidden');
      document.querySelector('#auth-tabs').classList.add('hidden');
      document.querySelector('#forgot-password-link').classList.add('hidden');
      document.querySelector('#registration-otp-panel').classList.remove('hidden');
      document.querySelector('#auth-title').textContent = 'Check your email.';
      document.querySelector('#auth-subtitle').textContent = 'Your account will be created after verification.';
      return;
    }
    localStorage.setItem(TOKEN_KEY, result.token);
    localStorage.setItem(EMAIL_KEY, result.email);
    localStorage.setItem(NAME_KEY, result.name || '');
    localStorage.setItem(ROLE_KEY, result.role);
    location.hash = '#home';
    await showDashboard();
  } catch (error) {
    setMessage(authMessage, authMode === 'login' && error.status === 401
      ? 'Incorrect email or password. Please try again.'
      : error.message);
  } finally {
    submit.disabled = false;
  }
});

document.querySelector('#registration-otp-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const button = event.currentTarget.querySelector('button[type="submit"]');
  button.disabled = true;
  setMessage(document.querySelector('#registration-otp-message'), 'Verifying your email…');
  try {
    await api('/api/auth/register/verify-otp', { method: 'POST', body: JSON.stringify({ email: pendingRegistrationEmail, code: document.querySelector('#registration-otp-code').value.trim() }) });
    document.querySelector('#registration-otp-panel').classList.add('hidden');
    setMessage(document.querySelector('#registration-otp-message'), '');
    setAuthMode('login');
    document.querySelector('#email').value = pendingRegistrationEmail;
    setMessage(authMessage, 'Email verified. Sign in with your new account.', true);
    pendingRegistrationEmail = '';
  } catch (error) {
    setMessage(document.querySelector('#registration-otp-message'), error.message);
  } finally {
    button.disabled = false;
  }
});

document.querySelector('#registration-resend').addEventListener('click', async () => {
  setMessage(document.querySelector('#registration-otp-message'), 'Sending another code…');
  try {
    await api('/api/auth/register/resend-otp', { method: 'POST', body: JSON.stringify({ email: pendingRegistrationEmail }) });
    setMessage(document.querySelector('#registration-otp-message'), 'A new code was sent.', true);
  } catch (error) {
    setMessage(document.querySelector('#registration-otp-message'), error.message);
  }
});

document.querySelector('#forgot-password-link').addEventListener('click', () => {
  authForm.classList.add('hidden');
  document.querySelector('#auth-tabs').classList.add('hidden');
  document.querySelector('#forgot-password-link').classList.add('hidden');
  document.querySelector('#forgot-password-panel').classList.remove('hidden');
  document.querySelector('#auth-title').textContent = 'Reset your password.';
  document.querySelector('#auth-subtitle').textContent = 'Verify your email to choose a new password.';
  document.querySelector('#reset-email').value = document.querySelector('#email').value.trim();
});

document.querySelector('#back-to-signin').addEventListener('click', () => {
  setAuthMode('login');
  document.querySelector('#auth-title').textContent = 'Good to see you.';
  document.querySelector('#auth-subtitle').textContent = 'Sign in with your campus account to continue.';
});

document.querySelector('#forgot-password-request-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const button = event.currentTarget.querySelector('button[type="submit"]');
  button.disabled = true;
  setMessage(document.querySelector('#forgot-password-message'), 'Requesting a verification code…');
  try {
    await api('/api/auth/password-reset/request-otp', { method: 'POST', body: JSON.stringify({ email: document.querySelector('#reset-email').value.trim() }) });
    document.querySelector('#forgot-password-confirm-form').classList.remove('hidden');
    setMessage(document.querySelector('#forgot-password-message'), 'If an account exists for that address, a code has been sent.', true);
  } catch (error) {
    setMessage(document.querySelector('#forgot-password-message'), error.message);
  } finally {
    button.disabled = false;
  }
});

document.querySelector('#forgot-password-confirm-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const button = event.currentTarget.querySelector('button[type="submit"]');
  button.disabled = true;
  setMessage(document.querySelector('#forgot-password-message'), 'Updating your password…');
  try {
    await api('/api/auth/password-reset/confirm', { method: 'POST', body: JSON.stringify({ email: document.querySelector('#reset-email').value.trim(), code: document.querySelector('#reset-code').value.trim(), newPassword: document.querySelector('#reset-new-password').value }) });
    const resetEmail = document.querySelector('#reset-email').value.trim();
    setAuthMode('login');
    document.querySelector('#email').value = resetEmail;
    setMessage(authMessage, 'Password reset. Sign in with your new password.', true);
  } catch (error) {
    setMessage(document.querySelector('#forgot-password-message'), error.message);
  } finally {
    button.disabled = false;
  }
});

document.querySelector('#forgot-password-link').classList.remove('hidden');

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
  const name = localStorage.getItem(NAME_KEY) || email.split('@')[0].replace(/[._-]+/g, ' ');
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  document.querySelector('#greeting').textContent = greeting;
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
  document.querySelector('#campus-board-link').classList.toggle('hidden', isAdmin);
  document.querySelector('#student-profile-card').classList.toggle('hidden', isAdmin);
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
  if (!isAdmin) await loadProfile();
  updateDashboardRoute(false);
}

function updateDashboardRoute(reloadComplaints = true) {
  const route = location.hash;
  const complaintsPage = location.hash === '#my-complaints';
  const campusBoardPage = route === '#campus-board' && localStorage.getItem(ROLE_KEY) !== 'ADMIN';
  if (!complaintsPage && document.querySelector('#create-card').dataset.open === 'true') closeCreateForm();
  document.querySelector('#overview-panel').classList.toggle('hidden', complaintsPage || campusBoardPage);
  document.querySelector('#my-complaints').classList.toggle('hidden', !complaintsPage && !campusBoardPage);
  document.querySelector('#create-card').classList.toggle('hidden', !complaintsPage || document.querySelector('#create-card').dataset.open !== 'true');
  document.querySelector('#overview-link').classList.toggle('active', !complaintsPage && !campusBoardPage);
  document.querySelector('#complaints-link').classList.toggle('active', complaintsPage);
  document.querySelector('#campus-board-link').classList.toggle('active', campusBoardPage);
  if (campusBoardPage) {
    document.querySelector('#list-title').textContent = 'Campus board';
    document.querySelector('#list-kicker').textContent = 'ACTIVE CAMPUS ISSUES';
  } else {
    const isAdmin = localStorage.getItem(ROLE_KEY) === 'ADMIN';
    document.querySelector('#list-title').textContent = isAdmin ? 'All complaints' : 'My complaints';
    document.querySelector('#list-kicker').textContent = isAdmin ? 'CAMPUS INBOX' : 'YOUR CAMPUS VOICE';
  }
  document.querySelector('#breadcrumb-current').textContent = campusBoardPage
    ? 'Campus board'
    : complaintsPage ? document.querySelector('#list-title').textContent : 'Overview';
  if (reloadComplaints) loadComplaints();
}

async function loadProfile() {
  try {
    const profile = await api('/api/profile');
    localStorage.setItem(NAME_KEY, profile.name || '');
    document.querySelector('#profile-name').textContent = profile.name || 'Student';
    document.querySelector('#welcome-name').textContent = (profile.name || 'Student').split(' ')[0];
    document.querySelector('#avatar').textContent = (profile.name || 'S').trim().charAt(0).toUpperCase();
    document.querySelector('#profile-edit-name').value = profile.name || '';
    document.querySelector('#profile-email').value = profile.email || '';
    document.querySelector('#profile-roll-number').value = profile.rollNumber || '';
    document.querySelector('#profile-dob').value = profile.dateOfBirth || '';
    document.querySelector('#profile-mobile').value = profile.mobileNumber || '';
    document.querySelector('#profile-gender').value = profile.gender || '';
    populateHostels(document.querySelector('#profile-hostel'), profile.gender, profile.hostel);
    renderProfileSummary(profile);
    document.querySelector('#profile-total-complaints').textContent = profile.totalComplaints ?? 0;
  } catch (error) {
    setMessage(document.querySelector('#profile-message'), error.message);
  }
}

function logout(showMessage = true) {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(EMAIL_KEY);
  localStorage.removeItem(NAME_KEY);
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

function renderComplaint(item, isAdmin, isCampusBoard = false) {
  const complaintId = Number(item.id);
  const priority = String(item.priority || '').toLowerCase();
  const conversation = `<div class="conversation"><button class="text-button conversation-toggle" type="button" data-id="${complaintId}">＋ View conversation</button><div class="conversation-box hidden" id="conversation-${complaintId}"></div></div>`;
  const adminActions = `<div class="admin-actions"><form class="status-form" data-id="${complaintId}"><label class="field">Update status<select name="status"><option value="OPEN" ${item.status === 'OPEN' ? 'selected' : ''}>Open</option><option value="IN_PROGRESS" ${item.status === 'IN_PROGRESS' ? 'selected' : ''}>In progress</option><option value="RESOLVED" ${item.status === 'RESOLVED' ? 'selected' : ''}>Resolved</option><option value="REJECTED" ${item.status === 'REJECTED' ? 'selected' : ''}>Rejected</option></select></label><button class="button button-quiet" type="submit">Save status</button></form>${conversation}<form class="comment-form" data-id="${complaintId}"><label class="field">Send a response<textarea name="message" rows="2" maxlength="1000" placeholder="Write a helpful update for the student…" required></textarea></label><button class="button button-primary" type="submit">Post response <span>→</span></button></form><p class="form-message admin-message" role="status" aria-live="polite"></p></div>`;
  const studentConversation = `<div class="student-conversation">${conversation}</div>`;
  const studentIdentity = isAdmin ? `<span class="meta-pill">${escapeHtml(item.studentName || 'Student')} · ${escapeHtml(item.studentEmail || `ID ${item.userId}`)}</span>` : '';
  const supportSummary = `<span class="meta-pill support-count-pill">${Number(item.supportCount || 0)} ${Number(item.supportCount || 0) === 1 ? 'supporter' : 'supporters'}</span>`;
  const supportAction = isCampusBoard
    ? item.ownComplaint
      ? '<span class="own-complaint-note">Your complaint</span>'
      : `<button class="support-toggle ${item.supportedByMe ? 'is-supporting' : ''}" type="button" data-id="${complaintId}" aria-pressed="${Boolean(item.supportedByMe)}">${item.supportedByMe ? '✓ Supporting' : '＋ I have this too'} <span>${Number(item.supportCount || 0)}</span></button><p class="form-message support-message" role="status" aria-live="polite"></p>`
    : '';
  return `<article class="complaint-row"><div class="complaint-main"><div class="complaint-title">${escapeHtml(item.title)}</div><div class="complaint-description">${escapeHtml(item.description)}</div><div class="complaint-meta"><span class="meta-pill">${escapeHtml(readable(item.category))}</span><span class="meta-pill priority-pill priority-${escapeHtml(priority)}">${escapeHtml(readable(item.priority))} priority</span><span class="status-pill status-${escapeHtml(String(item.status).toLowerCase())}">${escapeHtml(readable(item.status))}</span>${supportSummary}${studentIdentity}</div>${supportAction}</div><time class="complaint-date">${escapeHtml(formatDate(item.createdAt))}</time>${isAdmin ? adminActions : studentConversation}</article>`;
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
    const isCampusBoard = !isAdmin && location.hash === '#campus-board';
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
    const endpoint = isAdmin ? '/api/admin/complaints' : isCampusBoard ? '/api/complaints/campus' : '/api/complaints/my';
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
    if (isCampusBoard) document.querySelector('#campus-board-count').textContent = page.totalElements ?? complaints.length;
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
      const noResults = isCampusBoard
        ? 'No active campus complaints right now.'
        : isAdmin && Object.values(complaintFilters).some(Boolean)
        ? 'No complaints match these filters.'
        : 'No complaints yet. Your campus could use your voice.';
      list.innerHTML = `<div class="empty-state"><span class="empty-icon">▤</span><strong>${noResults}</strong></div>`;
      return;
    }
    list.innerHTML = complaints.map((item) => renderComplaint(item, isAdmin, isCampusBoard)).join('');
  } catch (error) {
    list.innerHTML = `<div class="empty-state"><span class="empty-icon">!</span><strong>${escapeHtml(error.message)}</strong></div>`;
    if (error.message.includes('Failed to fetch')) list.innerHTML = '<div class="empty-state"><span class="empty-icon">!</span><strong>Couldn’t reach the server. Start Spring Boot and refresh.</strong></div>';
  }
}

function openCreateForm() {
  if (location.hash !== '#my-complaints') location.hash = '#my-complaints';
  const card = document.querySelector('#create-card');
  card.dataset.open = 'true';
  card.classList.remove('hidden');
  card.scrollIntoView({ behavior: 'smooth', block: 'start' });
  document.querySelector('#complaint-title').focus({ preventScroll: true });
}

function closeCreateForm() {
  const card = document.querySelector('#create-card');
  card.dataset.open = 'false';
  card.classList.add('hidden');
  document.querySelector('#complaint-form').reset();
  setMessage(complaintMessage, '');
}

document.querySelector('#profile-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const button = document.querySelector('#profile-save');
  button.disabled = true;
  setMessage(document.querySelector('#profile-message'), 'Saving profile…');
  const payload = {
    name: document.querySelector('#profile-edit-name').value.trim(),
    rollNumber: document.querySelector('#profile-roll-number').value.trim(),
    dateOfBirth: document.querySelector('#profile-dob').value || null,
    mobileNumber: document.querySelector('#profile-mobile').value.trim(),
    gender: document.querySelector('#profile-gender').value,
    hostel: document.querySelector('#profile-hostel').value,
  };
  try {
    const profile = await api('/api/profile', { method: 'PUT', body: JSON.stringify(payload) });
    localStorage.setItem(NAME_KEY, profile.name);
    document.querySelector('#profile-name').textContent = profile.name;
    document.querySelector('#welcome-name').textContent = profile.name.split(' ')[0];
    document.querySelector('#avatar').textContent = profile.name.trim().charAt(0).toUpperCase() || 'S';
    renderProfileSummary(profile);
    document.querySelector('#profile-form').classList.add('hidden');
    document.querySelector('#profile-summary').classList.remove('hidden');
    document.querySelector('#edit-profile-button').classList.remove('hidden');
    setMessage(document.querySelector('#profile-message'), 'Profile saved.', true);
  } catch (error) {
    setMessage(document.querySelector('#profile-message'), error.message);
  } finally {
    button.disabled = false;
  }
});

document.querySelector('#edit-profile-button').addEventListener('click', () => {
  document.querySelector('#profile-summary').classList.add('hidden');
  document.querySelector('#profile-form').classList.remove('hidden');
  document.querySelector('#edit-profile-button').classList.add('hidden');
  setMessage(document.querySelector('#profile-message'), '');
});

document.querySelector('#cancel-profile-edit').addEventListener('click', async () => {
  document.querySelector('#profile-form').classList.add('hidden');
  document.querySelector('#profile-summary').classList.remove('hidden');
  document.querySelector('#edit-profile-button').classList.remove('hidden');
  setMessage(document.querySelector('#profile-message'), '');
  await loadProfile();
});

window.addEventListener('hashchange', () => {
  if (localStorage.getItem(TOKEN_KEY)) updateDashboardRoute();
});

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
  const supportButton = event.target.closest('.support-toggle');
  if (supportButton) {
    const complaintId = Number(supportButton.dataset.id);
    const wasSupporting = supportButton.getAttribute('aria-pressed') === 'true';
    const message = supportButton.closest('.complaint-main').querySelector('.support-message');
    supportButton.disabled = true;
    setMessage(message, 'Updating support…');
    try {
      const result = await api(`/api/complaints/${complaintId}/support`, {
        method: wasSupporting ? 'DELETE' : 'POST',
      });
      supportButton.classList.toggle('is-supporting', result.supportedByMe);
      supportButton.setAttribute('aria-pressed', String(result.supportedByMe));
      supportButton.innerHTML = `${result.supportedByMe ? '✓ Supporting' : '＋ I have this too'} <span>${result.supportCount}</span>`;
      supportButton.closest('.complaint-row').querySelector('.support-count-pill').textContent = `${result.supportCount} ${result.supportCount === 1 ? 'supporter' : 'supporters'}`;
      setMessage(message, '');
    } catch (error) {
      setMessage(message, error.message);
    } finally {
      supportButton.disabled = false;
    }
    return;
  }
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
