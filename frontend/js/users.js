// ==========================================================================
// users.js
// Logic halaman users.html — (owner only).
// Bergantung pada js/config.js dan js/auth-guard.js (harus di-load dulu).
// ==========================================================================

const els = {};
let resetPasswordUserId = null;
let currentUserId = null; // ID owner yang sedang login, dipakai buat cegah nonaktifkan diri sendiri.

document.addEventListener('DOMContentLoaded', async () => {
  const user = await requireAuth(['owner']);
  if (!user) return;

  currentUserId = user.id;

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

  els.resetPasswordModalOverlay = document.getElementById('resetPasswordModalOverlay');
  els.resetPasswordForm = document.getElementById('resetPasswordForm');
  els.resetPasswordFormError = document.getElementById('resetPasswordFormError');
  els.resetPasswordLabel = document.getElementById('resetPasswordLabel');
  els.resetPasswordValue = document.getElementById('resetPasswordValue');
  els.resetPasswordValueError = document.getElementById('resetPasswordValueError');
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

  document.getElementById('closeResetPasswordModalBtn').addEventListener('click', closeResetPasswordModal);
  document.getElementById('cancelResetPasswordBtn').addEventListener('click', closeResetPasswordModal);
  els.resetPasswordForm.addEventListener('submit', handleResetPasswordFormSubmit);
}

async function loadUsers() {
  els.tableBody.innerHTML = `
    <tr><td colspan="5"><div class="empty-state"><span class="empty-state__title">Memuat data...</span></div></td></tr>
  `;

  const { result } = await authFetch('/users/get_users.php', { method: 'GET' });

  if (!result.success) {
    els.tableBody.innerHTML = `
      <tr><td colspan="5">
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
      <tr><td colspan="5">
        <div class="empty-state">
          <span class="empty-state__title">Belum ada user</span>
        </div>
      </td></tr>
    `;
    return;
  }

  els.tableBody.innerHTML = users.map(renderUserRow).join('');

  els.tableBody.querySelectorAll('[data-action="reset-password"]').forEach((btn) => {
    btn.addEventListener('click', () => openResetPasswordModal(btn.dataset.userId, btn.dataset.userName));
  });

  els.tableBody.querySelectorAll('[data-action="toggle-status"]').forEach((btn) => {
    btn.addEventListener('click', () => handleToggleStatus(btn.dataset.userId, btn.dataset.userName, btn.dataset.isActive === '1'));
  });
}

function renderUserRow(u) {
  const isSelf = u.id === currentUserId;
  const isActive = u.is_active === 1;

  const statusBadge = isActive
    ? `<span class="badge badge--success">Aktif</span>`
    : `<span class="badge badge--danger">Nonaktif</span>`;

  // Owner tidak boleh nonaktifkan diri sendiri -- tombol toggle disembunyikan untuk baris sendiri.
  const toggleBtn = isSelf
    ? `<span style="color:var(--color-text-muted); font-size:0.8rem;">-</span>`
    : `<button type="button" class="btn btn--ghost" style="padding:0.4rem 0.7rem; font-size:0.8rem;" data-action="toggle-status" data-user-id="${u.id}" data-user-name="${escapeHtml(u.name)}" data-is-active="${u.is_active}">
        ${isActive ? 'Nonaktifkan' : 'Aktifkan'}
      </button>`;

  return `
    <tr>
      <td>${escapeHtml(u.name)}</td>
      <td>${escapeHtml(u.email)}</td>
      <td>${u.role === 'owner' ? 'Owner' : 'Cashier'}</td>
      <td>${statusBadge}</td>
      <td style="display:flex; gap:0.5rem;">
        <button type="button" class="btn btn--ghost" style="padding:0.4rem 0.7rem; font-size:0.8rem;" data-action="reset-password" data-user-id="${u.id}" data-user-name="${escapeHtml(u.name)}">
          Reset Password
        </button>
        ${toggleBtn}
      </td>
    </tr>
  `;
}

// ==========================================================================
// Toggle Status Aktif/Nonaktif (PATCH /users/toggle_status.php)
// ==========================================================================

async function handleToggleStatus(userId, userName, isCurrentlyActive) {
  const actionLabel = isCurrentlyActive ? 'nonaktifkan' : 'aktifkan';
  const confirmed = confirm(`Yakin ingin ${actionLabel} akun "${userName}"?`);
  if (!confirmed) return;

  const { result } = await authFetch(`/users/toggle_status.php?id=${userId}`, { method: 'PATCH' });

  if (!result.success) {
    alert(result.message || 'Gagal mengubah status akun.');
    return;
  }

  showToast(`Akun "${userName}" berhasil ${isCurrentlyActive ? 'dinonaktifkan' : 'diaktifkan'}`);
  await loadUsers();
}

// ==========================================================================
// Modal: Tambah Akun Kasir (POST /auth/register)
// ==========================================================================

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
    showToast('Akun kasir berhasil dibuat');
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

// ==========================================================================
// Modal: Reset Password (PATCH /users/reset_password.php)
// ==========================================================================

function openResetPasswordModal(userId, userName) {
  resetPasswordUserId = userId;
  els.resetPasswordLabel.textContent = `Password baru untuk "${userName}"`;
  els.resetPasswordValue.value = '';
  els.resetPasswordValueError.textContent = '';
  els.resetPasswordFormError.style.display = 'none';
  els.resetPasswordModalOverlay.hidden = false;
}

function closeResetPasswordModal() {
  els.resetPasswordModalOverlay.hidden = true;
  resetPasswordUserId = null;
}

async function handleResetPasswordFormSubmit(e) {
  e.preventDefault();
  els.resetPasswordValueError.textContent = '';
  els.resetPasswordFormError.style.display = 'none';

  const saveBtn = document.getElementById('saveResetPasswordBtn');
  saveBtn.disabled = true;
  saveBtn.textContent = 'Memproses...';

  try {
    const { result } = await authFetch(`/users/reset_password.php?id=${resetPasswordUserId}`, {
      method: 'PATCH',
      body: JSON.stringify({ new_password: els.resetPasswordValue.value }),
    });

    if (!result.success) {
      if (result.errors?.new_password) {
        els.resetPasswordValueError.textContent = result.errors.new_password[0];
      } else {
        els.resetPasswordFormError.textContent = result.message || 'Gagal mereset password.';
        els.resetPasswordFormError.style.display = 'block';
      }
      return;
    }

    closeResetPasswordModal();
    alert('Password berhasil direset.');
  } catch (err) {
    console.error('Reset password error:', err);
    els.resetPasswordFormError.textContent = 'Tidak dapat terhubung ke server.';
    els.resetPasswordFormError.style.display = 'block';
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = 'Reset Password';
  }
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str ?? '';
  return div.innerHTML;
}