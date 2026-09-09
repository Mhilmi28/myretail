// ==========================================================================
// categories.js
// Logic halaman categories.html — (owner only).
<<<<<<< HEAD
// API_CONTRACT.md cuma menyediakan GET /categories dan POST /categories,
// jadi halaman ini SENGAJA tidak punya fitur edit/hapus kategori.
=======
>>>>>>> 0ac1a24 (tambah fitur categories, expenses, users)
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
<<<<<<< HEAD
  els.tableBody = document.getElementById('categoryTableBody');
  els.addCategoryBtn = document.getElementById('addCategoryBtn');
  els.categoryModalOverlay = document.getElementById('categoryModalOverlay');
  els.categoryForm = document.getElementById('categoryForm');
  els.categoryFormError = document.getElementById('categoryFormError');
  els.categoryNameInput = document.getElementById('categoryName');
  els.categoryNameError = document.getElementById('categoryNameError');
=======
  els.addCategoryBtn = document.getElementById('addCategoryBtn');
  els.tableBody = document.getElementById('categoryTableBody');

  els.categoryModalOverlay = document.getElementById('categoryModalOverlay');
  els.categoryForm = document.getElementById('categoryForm');
  els.categoryFormError = document.getElementById('categoryFormError');
>>>>>>> 0ac1a24 (tambah fitur categories, expenses, users)
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

<<<<<<< HEAD
// ==========================================================================
// Load & render data (GET /categories)
// ==========================================================================

=======
>>>>>>> 0ac1a24 (tambah fitur categories, expenses, users)
async function loadCategories() {
  els.tableBody.innerHTML = `
    <tr><td><div class="empty-state"><span class="empty-state__title">Memuat data...</span></div></td></tr>
  `;

<<<<<<< HEAD
  const { result } = await authFetch('/categories', { method: 'GET' });
=======
  const { result } = await authFetch('/categories/get_categories.php', { method: 'GET' });
>>>>>>> 0ac1a24 (tambah fitur categories, expenses, users)

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
<<<<<<< HEAD
          <p>Tambahkan kategori pertama untuk mulai mengelompokkan produk.</p>
=======
          <p>Kategori yang ditambahkan akan muncul di sini.</p>
>>>>>>> 0ac1a24 (tambah fitur categories, expenses, users)
        </div>
      </td></tr>
    `;
    return;
  }

<<<<<<< HEAD
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
=======
  els.tableBody.innerHTML = categories.map((c) => `
    <tr><td>${escapeHtml(c.name)}</td></tr>
  `).join('');
}

function openCategoryModal() {
  clearCategoryFormErrors();
  els.categoryForm.reset();
>>>>>>> 0ac1a24 (tambah fitur categories, expenses, users)
  els.categoryModalOverlay.hidden = false;
}

function closeCategoryModal() {
  els.categoryModalOverlay.hidden = true;
}

async function handleCategoryFormSubmit(e) {
  e.preventDefault();
  clearCategoryFormErrors();

<<<<<<< HEAD
  const name = els.categoryNameInput.value.trim();
  if (!name) {
    els.categoryNameError.textContent = 'Nama kategori wajib diisi.';
    return;
  }
=======
  const payload = {
    name: document.getElementById('categoryName').value.trim(),
  };
>>>>>>> 0ac1a24 (tambah fitur categories, expenses, users)

  const saveBtn = document.getElementById('saveCategoryBtn');
  saveBtn.disabled = true;
  saveBtn.textContent = 'Menyimpan...';

  try {
<<<<<<< HEAD
    const { result } = await authFetch('/categories', {
      method: 'POST',
      body: JSON.stringify({ name }),
    });

    if (!result.success) {
      if (result.errors?.name) {
        els.categoryNameError.textContent = result.errors.name[0];
      } else {
        showCategoryFormError(result.message || 'Gagal menyimpan kategori.');
=======
    const { result } = await authFetch('/categories/add_category.php', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    if (!result.success) {
      if (result.errors) {
        applyCategoryFieldErrors(result.errors);
      } else {
        showCategoryFormError(result.message || 'Gagal menambahkan kategori.');
>>>>>>> 0ac1a24 (tambah fitur categories, expenses, users)
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

<<<<<<< HEAD
function clearCategoryFormErrors() {
  els.categoryNameError.textContent = '';
=======
function applyCategoryFieldErrors(errors) {
  const fieldMap = { name: 'categoryNameError' };
  Object.entries(errors).forEach(([field, messages]) => {
    const el = document.getElementById(fieldMap[field]);
    if (el) el.textContent = messages[0];
  });
}

function clearCategoryFormErrors() {
  document.getElementById('categoryNameError').textContent = '';
>>>>>>> 0ac1a24 (tambah fitur categories, expenses, users)
  els.categoryFormError.style.display = 'none';
  els.categoryFormError.textContent = '';
}

function showCategoryFormError(message) {
  els.categoryFormError.textContent = message;
  els.categoryFormError.style.display = 'block';
}

<<<<<<< HEAD
// ==========================================================================
// Utils
// ==========================================================================

=======
>>>>>>> 0ac1a24 (tambah fitur categories, expenses, users)
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str ?? '';
  return div.innerHTML;
<<<<<<< HEAD
}
=======
}
>>>>>>> 0ac1a24 (tambah fitur categories, expenses, users)
