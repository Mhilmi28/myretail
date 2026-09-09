// ==========================================================================
// categories.js
// Logic halaman categories.html — (owner only).
// API_CONTRACT.md cuma menyediakan GET /categories dan POST /categories,
// jadi halaman ini SENGAJA tidak punya fitur edit/hapus kategori.
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
  els.tableBody = document.getElementById('categoryTableBody');
  els.addCategoryBtn = document.getElementById('addCategoryBtn');
  els.categoryModalOverlay = document.getElementById('categoryModalOverlay');
  els.categoryForm = document.getElementById('categoryForm');
  els.categoryFormError = document.getElementById('categoryFormError');
  els.categoryNameInput = document.getElementById('categoryName');
  els.categoryNameError = document.getElementById('categoryNameError');
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

// ==========================================================================
// Load & render data (GET /categories)
// ==========================================================================

async function loadCategories() {
  els.tableBody.innerHTML = `
    <tr><td><div class="empty-state"><span class="empty-state__title">Memuat data...</span></div></td></tr>
  `;

  const { result } = await authFetch('/categories', { method: 'GET' });

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
          <p>Tambahkan kategori pertama untuk mulai mengelompokkan produk.</p>
        </div>
      </td></tr>
    `;
    return;
  }

  els.tableBody.innerHTML = categories
    .map((c) => `<tr><td>${escapeHtml(c.name)}</td></tr>`)
    .join('');
}

// ==========================================================================
// Modal: Tambah Kategori (POST /categories)
// ==========================================================================

function openCategoryModal() {
  els.categoryForm.reset();
  clearCategoryFormErrors();
  els.categoryModalOverlay.hidden = false;
}

function closeCategoryModal() {
  els.categoryModalOverlay.hidden = true;
}

async function handleCategoryFormSubmit(e) {
  e.preventDefault();
  clearCategoryFormErrors();

  const name = els.categoryNameInput.value.trim();
  if (!name) {
    els.categoryNameError.textContent = 'Nama kategori wajib diisi.';
    return;
  }

  const saveBtn = document.getElementById('saveCategoryBtn');
  saveBtn.disabled = true;
  saveBtn.textContent = 'Menyimpan...';

  try {
    const { result } = await authFetch('/categories', {
      method: 'POST',
      body: JSON.stringify({ name }),
    });

    if (!result.success) {
      if (result.errors?.name) {
        els.categoryNameError.textContent = result.errors.name[0];
      } else {
        showCategoryFormError(result.message || 'Gagal menyimpan kategori.');
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

function clearCategoryFormErrors() {
  els.categoryNameError.textContent = '';
  els.categoryFormError.style.display = 'none';
  els.categoryFormError.textContent = '';
}

function showCategoryFormError(message) {
  els.categoryFormError.textContent = message;
  els.categoryFormError.style.display = 'block';
}

// ==========================================================================
// Utils
// ==========================================================================

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str ?? '';
  return div.innerHTML;
}
