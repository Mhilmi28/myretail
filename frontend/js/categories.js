// ==========================================================================
// categories.js
// Logic halaman categories.html — (owner only).
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

  await loadCategories();
});

function cacheElements() {
  els.addCategoryBtn = document.getElementById('addCategoryBtn');
  els.tableBody = document.getElementById('categoryTableBody');

  els.categoryModalOverlay = document.getElementById('categoryModalOverlay');
  els.categoryForm = document.getElementById('categoryForm');
  els.categoryFormError = document.getElementById('categoryFormError');
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
  els.addCategoryBtn.addEventListener('click', openCategoryModal);
  document.getElementById('closeCategoryModalBtn').addEventListener('click', closeCategoryModal);
  document.getElementById('cancelCategoryBtn').addEventListener('click', closeCategoryModal);
  els.categoryForm.addEventListener('submit', handleCategoryFormSubmit);
}

async function loadCategories() {
  els.tableBody.innerHTML = `
    <tr><td><div class="empty-state"><span class="empty-state__title">Memuat data...</span></div></td></tr>
  `;

  const { result } = await authFetch('/categories/get_categories.php', { method: 'GET' });

  if (!result.success) {
    els.tableBody.innerHTML = `
      <tr><td>
        <div class="empty-state">
          <span class="empty-state__title">Gagal memuat data</span>
          <p>${escapeHtml(result.message || '')}</p>
        </div>
      </td></tr>
    `;
    return;
  }

  renderCategoryTable(result.data);
}

function renderCategoryTable(categories) {
  if (categories.length === 0) {
    els.tableBody.innerHTML = `
      <tr><td>
        <div class="empty-state">
          <span class="empty-state__title">Belum ada kategori</span>
          <p>Kategori yang ditambahkan akan muncul di sini.</p>
        </div>
      </td></tr>
    `;
    return;
  }

  els.tableBody.innerHTML = categories.map((c) => `
    <tr><td>${escapeHtml(c.name)}</td></tr>
  `).join('');
}

function openCategoryModal() {
  clearCategoryFormErrors();
  els.categoryForm.reset();
  els.categoryModalOverlay.hidden = false;
}

function closeCategoryModal() {
  els.categoryModalOverlay.hidden = true;
}

async function handleCategoryFormSubmit(e) {
  e.preventDefault();
  clearCategoryFormErrors();

  const payload = {
    name: document.getElementById('categoryName').value.trim(),
  };

  const saveBtn = document.getElementById('saveCategoryBtn');
  saveBtn.disabled = true;
  saveBtn.textContent = 'Menyimpan...';

  try {
    const { result } = await authFetch('/categories/add_category.php', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    if (!result.success) {
      if (result.errors) {
        applyCategoryFieldErrors(result.errors);
      } else {
        showCategoryFormError(result.message || 'Gagal menambahkan kategori.');
      }
      return;
    }

    closeCategoryModal();
    await loadCategories();
  } catch (err) {
    console.error('Save category error:', err);
    showCategoryFormError('Tidak dapat terhubung ke server.');
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = 'Simpan';
  }
}

function applyCategoryFieldErrors(errors) {
  const fieldMap = { name: 'categoryNameError' };
  Object.entries(errors).forEach(([field, messages]) => {
    const el = document.getElementById(fieldMap[field]);
    if (el) el.textContent = messages[0];
  });
}

function clearCategoryFormErrors() {
  document.getElementById('categoryNameError').textContent = '';
  els.categoryFormError.style.display = 'none';
  els.categoryFormError.textContent = '';
}

function showCategoryFormError(message) {
  els.categoryFormError.textContent = message;
  els.categoryFormError.style.display = 'block';
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str ?? '';
  return div.innerHTML;
}