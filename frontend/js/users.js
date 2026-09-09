// ==========================================================================
// users.js
// Logic halaman users.html — (owner only).
// Bergantung pada js/config.js dan js/auth-guard.js (harus di-load dulu).
// ==========================================================================

const els = {};

document.addEventListener('DOMContentLoaded', async () => {
  const user = await requireAuth(['owner']);
  if (!user) return;

  cacheElements();
  applyRoleUI(user);
  bindEvents();

  document.getElementById('dashboardRoot').hidden = false;

  await loadUsers();
});

function cacheElements() {
  els.addUserBtn = document.getElementById('addUserBtn');
  els.tableBody = document.getElementById('userTableBody');

  els.userModalOverlay = document.getElementById('userModalOverlay');
  els.userForm = document.getElementById('userForm');
  els.userFormError = document.getElementById('userFormError');
}

function applyRoleUI(user) {
  document.getElementById('userName').textContent = user.name;
  document.getElementById('userAvatar').textContent = getInitials(user.name);
  document.getElementById('logoutBtn').addEventListener('click', logout);
  document.getElementById('navHome').href = DASHBOARD_BY_ROLE[user.role] || 'login.html';

  document.querySelectorAll('[data-roles]').forEach((el) => {
    const allowed = el.dataset.roles.split(',');
    el.hidden = !allowed.includes(user.role);
  });
}

function getInitials(name) {
  return name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
}

function bindEvents() {
  els.addUserBtn.addEventListener('click', openUserModal);
  document.getElementById('closeUserModalBtn').addEventListener('click', closeUserModal);
  document.getElementById('cancelUserBtn').addEventListener('click', closeUserModal);
  els.userForm.addEventListener('submit', handleUserFormSubmit);
}

async function loadUsers() {
  els.tableBody.innerHTML = `
    <tr><td colspan="3"><div class="empty-state"><span class="empty-state__title">Memuat data...</span></div></td></tr>
  `;

  const { result } = await authFetch('/users/get_users.php', { method: 'GET' });

  if (!result.success) {
    els.tableBody.innerHTML = `
      <tr><td colspan="3">
        <div class="empty-state">
          <span class="empty-state__title">Gagal memuat data</span>
          <p>${escapeHtml(result.message || '')}</p>
        </div>
      </td></tr>
    `;
    return;
  }

  renderUserTable(result.data);
}

function renderUserTable(users) {
  if (users.length === 0) {
    els.tableBody.innerHTML = `
      <tr><td colspan="3">
        <div class="empty-state">
          <span class="empty-state__title">Belum ada user</span>
        </div>
      </td></tr>
    `;
    return;
  }

  els.tableBody.innerHTML = users.map((u) => `
    <tr>
      <td>${escapeHtml(u.name)}</td>
      <td>${escapeHtml(u.email)}</td>
      <td>${u.role === 'owner' ? 'Owner' : 'Cashier'}</td>
    </tr>
  `).join('');
}

function openUserModal() {
  clearUserFormErrors();
  els.userForm.reset();
  els.userModalOverlay.hidden = false;
}

function closeUserModal() {
  els.userModalOverlay.hidden = true;
}

async function handleUserFormSubmit(e) {
  e.preventDefault();
  clearUserFormErrors();

  const payload = {
    name: document.getElementById('newUserName').value.trim(),
    email: document.getElementById('newUserEmail').value.trim(),
    password: document.getElementById('newUserPassword').value,
    role: 'cashier',
  };

  const saveBtn = document.getElementById('saveUserBtn');
  saveBtn.disabled = true;
  saveBtn.textContent = 'Menyimpan...';

  try {
    const { result } = await authFetch('/auth/register.php', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    if (!result.success) {
      if (result.errors) {
        applyUserFieldErrors(result.errors);
      } else {
        showUserFormError(result.message || 'Gagal membuat akun.');
      }
      return;
    }

    closeUserModal();
    await loadUsers();
  } catch (err) {
    console.error('Register user error:', err);
    showUserFormError('Tidak dapat terhubung ke server.');
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = 'Simpan';
  }
}

function applyUserFieldErrors(errors) {
  const fieldMap = { name: 'newUserNameError', email: 'newUserEmailError', password: 'newUserPasswordError' };
  Object.entries(errors).forEach(([field, messages]) => {
    const el = document.getElementById(fieldMap[field]);
    if (el) el.textContent = messages[0];
  });
}

function clearUserFormErrors() {
  ['newUserNameError', 'newUserEmailError', 'newUserPasswordError'].forEach((id) => {
    document.getElementById(id).textContent = '';
  });
  els.userFormError.style.display = 'none';
  els.userFormError.textContent = '';
}

function showUserFormError(message) {
  els.userFormError.textContent = message;
  els.userFormError.style.display = 'block';
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str ?? '';
  return div.innerHTML;
}