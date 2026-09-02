// ==========================================================================
// products.js
// Logic halaman products.html — dipakai bareng oleh owner & cashier.
// Owner: full CRUD + update stok. Cashier: read-only (lihat & cari saja).
// Bergantung pada js/config.js dan js/auth-guard.js (harus di-load dulu).
// ==========================================================================

// ---------- State halaman ----------
let currentUser = null;
let currentPage = 1;
let currentSearch = '';
let currentCategoryId = '';
let totalPages = 1;
let editingProductId = null; // null = mode tambah, angka = mode edit
let stockEditingProductId = null;

// Elemen yang sering dipakai
const els = {};

document.addEventListener('DOMContentLoaded', async () => {
  currentUser = await requireAuth(['owner', 'cashier']);
  if (!currentUser) return; // requireAuth sudah redirect kalau gagal.

  cacheElements();
  applyRoleUI(currentUser);
  bindEvents();

  document.getElementById('dashboardRoot').hidden = false;

  await loadCategories();
  await loadProducts();
});

function cacheElements() {
  els.searchInput = document.getElementById('searchInput');
  els.categoryFilter = document.getElementById('categoryFilter');
  els.addProductBtn = document.getElementById('addProductBtn');
  els.tableBody = document.getElementById('productTableBody');
  els.pagination = document.getElementById('pagination');
  els.paginationInfo = document.getElementById('paginationInfo');
  els.pageNumbers = document.getElementById('pageNumbers');
  els.prevPageBtn = document.getElementById('prevPageBtn');
  els.nextPageBtn = document.getElementById('nextPageBtn');

  els.productModalOverlay = document.getElementById('productModalOverlay');
  els.productModalTitle = document.getElementById('productModalTitle');
  els.productForm = document.getElementById('productForm');
  els.productFormError = document.getElementById('productFormError');

  els.stockModalOverlay = document.getElementById('stockModalOverlay');
  els.stockForm = document.getElementById('stockForm');
  els.stockFormError = document.getElementById('stockFormError');
  els.stockProductLabel = document.getElementById('stockProductLabel');
  els.stockValue = document.getElementById('stockValue');
  els.stockValueError = document.getElementById('stockValueError');
}

// ==========================================================================
// Role-based UI
// ==========================================================================

/**
 * Tampilkan info user di topbar + toggle elemen yang butuh role tertentu.
 * Elemen yang menu-nya butuh role tertentu ditandai atribut `data-roles`
 * (di <li> sidebar), sedangkan elemen aksi/tombol owner-only ditandai
 * `data-owner-only`.
 */
function applyRoleUI(user) {
  document.getElementById('userName').textContent = user.name;
  document.getElementById('userRole').textContent =
    user.role === 'owner' ? 'Owner' : 'Cashier';
  document.getElementById('userAvatar').textContent = getInitials(user.name);
  document.getElementById('logoutBtn').addEventListener('click', logout);

  // Arahkan link "Dashboard" ke halaman sesuai role.
  document.getElementById('navHome').href = DASHBOARD_BY_ROLE[user.role] || 'login.html';

  // Sembunyikan menu sidebar yang tidak sesuai role.
  document.querySelectorAll('[data-roles]').forEach((el) => {
    const allowed = el.dataset.roles.split(',');
    el.hidden = !allowed.includes(user.role);
  });

  // Sembunyikan elemen aksi yang khusus owner (tombol tambah, kolom aksi, dll).
  const isOwner = user.role === 'owner';
  document.querySelectorAll('[data-owner-only]').forEach((el) => {
    el.hidden = !isOwner;
  });
}

function getInitials(name) {
  return name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
}

// ==========================================================================
// Event bindings
// ==========================================================================

function bindEvents() {
  // Search dengan debounce biar gak nembak API tiap ketikan.
  let searchTimeout;
  els.searchInput.addEventListener('input', () => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      currentSearch = els.searchInput.value.trim();
      currentPage = 1;
      loadProducts();
    }, 400);
  });

  els.categoryFilter.addEventListener('change', () => {
    currentCategoryId = els.categoryFilter.value;
    currentPage = 1;
    loadProducts();
  });

  els.prevPageBtn.addEventListener('click', () => {
    if (currentPage > 1) {
      currentPage -= 1;
      loadProducts();
    }
  });

  els.nextPageBtn.addEventListener('click', () => {
    if (currentPage < totalPages) {
      currentPage += 1;
      loadProducts();
    }
  });

  // Modal Tambah/Edit Produk
  els.addProductBtn.addEventListener('click', () => openProductModal('create'));
  document.getElementById('closeProductModalBtn').addEventListener('click', closeProductModal);
  document.getElementById('cancelProductBtn').addEventListener('click', closeProductModal);
  els.productForm.addEventListener('submit', handleProductFormSubmit);

  // Modal Update Stok
  document.getElementById('closeStockModalBtn').addEventListener('click', closeStockModal);
  document.getElementById('cancelStockBtn').addEventListener('click', closeStockModal);
  els.stockForm.addEventListener('submit', handleStockFormSubmit);
}

// ==========================================================================
// Load data
// ==========================================================================

/** Ambil daftar kategori buat filter & dropdown form (GET /categories). */
async function loadCategories() {
  const { result } = await authFetch('/categories', { method: 'GET' });
  if (!result.success) return;

  const categorySelect = document.getElementById('productCategory');

  result.data.forEach((category) => {
    els.categoryFilter.insertAdjacentHTML(
      'beforeend',
      `<option value="${category.id}">${escapeHtml(category.name)}</option>`
    );
    categorySelect.insertAdjacentHTML(
      'beforeend',
      `<option value="${category.id}">${escapeHtml(category.name)}</option>`
    );
  });
}

/** Ambil daftar produk sesuai filter & halaman aktif (GET /products). */
async function loadProducts() {
  renderTableLoading();

  const params = new URLSearchParams({ page: currentPage, limit: 10 });
  if (currentSearch) params.set('search', currentSearch);
  if (currentCategoryId) params.set('category_id', currentCategoryId);

  const { result } = await authFetch(`/products?${params.toString()}`, { method: 'GET' });

  if (!result.success) {
    renderTableError(result.message || 'Gagal memuat data produk.');
    return;
  }

  renderProductTable(result.data);
  renderPagination(result.meta);
}

// ==========================================================================
// Render: Tabel Produk
// ==========================================================================

function renderTableLoading() {
  const colspan = currentUser.role === 'owner' ? 6 : 5;
  els.tableBody.innerHTML = `
    <tr><td colspan="${colspan}">
      <div class="empty-state"><span class="empty-state__title">Memuat data...</span></div>
    </td></tr>
  `;
}

function renderTableError(message) {
  const colspan = currentUser.role === 'owner' ? 6 : 5;
  els.tableBody.innerHTML = `
    <tr><td colspan="${colspan}">
      <div class="empty-state">
        <span class="empty-state__title">Gagal memuat data</span>
        <p>${escapeHtml(message)}</p>
      </div>
    </td></tr>
  `;
}

function renderProductTable(products) {
  const isOwner = currentUser.role === 'owner';

  if (products.length === 0) {
    const colspan = isOwner ? 6 : 5;
    els.tableBody.innerHTML = `
      <tr><td colspan="${colspan}">
        <div class="empty-state">
          <span class="empty-state__title">Belum ada produk</span>
          <p>${currentSearch || currentCategoryId ? 'Coba ubah kata kunci atau filter kategori.' : 'Produk yang ditambahkan akan muncul di sini.'}</p>
        </div>
      </td></tr>
    `;
    return;
  }

  els.tableBody.innerHTML = products.map((product) => renderProductRow(product, isOwner)).join('');

  // Bind aksi per baris (delegasi lewat query setelah render, karena innerHTML baru dibuat).
  if (isOwner) {
    els.tableBody.querySelectorAll('[data-action="edit"]').forEach((btn) => {
      btn.addEventListener('click', () => openProductModal('edit', findProductFromRow(btn)));
    });
    els.tableBody.querySelectorAll('[data-action="stock"]').forEach((btn) => {
      btn.addEventListener('click', () => openStockModal(findProductFromRow(btn)));
    });
    els.tableBody.querySelectorAll('[data-action="delete"]').forEach((btn) => {
      btn.addEventListener('click', () => handleDeleteProduct(findProductFromRow(btn)));
    });
  }

  // Simpan data produk saat ini di memori (dipakai buat isi modal tanpa fetch ulang).
  window.__currentProducts = products;
}

function findProductFromRow(btn) {
  const id = Number(btn.closest('tr').dataset.productId);
  return window.__currentProducts.find((p) => p.id === id);
}

function renderProductRow(product, isOwner) {
  const thumb = product.image_url
    ? `<img src="${escapeHtml(product.image_url)}" alt="" class="product-thumb" onerror="this.replaceWith(placeholderThumb())">`
    : placeholderThumbHtml();

  const stockBadge = product.stock <= 5
    ? `<span class="badge badge--warning">${product.stock}</span>`
    : product.stock;

  const actionsCell = isOwner
    ? `
      <td>
        <div class="row-actions">
          <button type="button" class="icon-btn" data-action="edit" title="Edit produk">✏️</button>
          <button type="button" class="icon-btn" data-action="stock" title="Update stok">🔄</button>
          <button type="button" class="icon-btn icon-btn--danger" data-action="delete" title="Hapus produk">🗑️</button>
        </div>
      </td>`
    : '';

  return `
    <tr data-product-id="${product.id}">
      <td>${thumb}</td>
      <td>
        <div class="product-name-cell">
          <span>${escapeHtml(product.name)}</span>
          <span class="product-name-cell__sku">${escapeHtml(product.sku)}</span>
        </div>
      </td>
      <td>${escapeHtml(product.category?.name || '-')}</td>
      <td class="is-numeric">${formatRupiah(product.price)}</td>
      <td class="is-numeric">${stockBadge}</td>
      ${actionsCell}
    </tr>
  `;
}

// Placeholder ikon untuk produk tanpa gambar / gambar gagal dimuat.
function placeholderThumbHtml() {
  return `<div class="product-thumb product-thumb--placeholder">📦</div>`;
}
function placeholderThumb() {
  const div = document.createElement('div');
  div.className = 'product-thumb product-thumb--placeholder';
  div.textContent = '📦';
  return div;
}

// ==========================================================================
// Render: Pagination
// ==========================================================================

function renderPagination(meta) {
  if (!meta || meta.total_page <= 1) {
    els.pagination.hidden = true;
    return;
  }

  totalPages = meta.total_page;
  els.pagination.hidden = false;
  els.paginationInfo.textContent = `Halaman ${meta.current_page} dari ${meta.total_page} (${meta.total_data} produk)`;

  els.prevPageBtn.disabled = meta.current_page <= 1;
  els.nextPageBtn.disabled = meta.current_page >= meta.total_page;

  // Nomor halaman ringkas (maks 5 tombol di sekitar halaman aktif).
  const pages = getPageRange(meta.current_page, meta.total_page);
  els.pageNumbers.innerHTML = pages
    .map((p) => `<button type="button" class="pagination__btn ${p === meta.current_page ? 'is-active' : ''}" data-page="${p}">${p}</button>`)
    .join('');

  els.pageNumbers.querySelectorAll('[data-page]').forEach((btn) => {
    btn.addEventListener('click', () => {
      currentPage = Number(btn.dataset.page);
      loadProducts();
    });
  });
}

function getPageRange(current, total) {
  const range = [];
  const start = Math.max(1, current - 2);
  const end = Math.min(total, start + 4);
  for (let i = start; i <= end; i += 1) range.push(i);
  return range;
}

// ==========================================================================
// Modal: Tambah / Edit Produk (owner only, POST/PUT /products)
// ==========================================================================

function openProductModal(mode, product = null) {
  editingProductId = mode === 'edit' ? product.id : null;
  els.productModalTitle.textContent = mode === 'edit' ? 'Edit Produk' : 'Tambah Produk';

  clearProductFormErrors();
  els.productForm.reset();

  if (mode === 'edit' && product) {
    document.getElementById('productName').value = product.name;
    document.getElementById('productSku').value = product.sku;
    document.getElementById('productCategory').value = product.category?.id || '';
    document.getElementById('productPrice').value = product.price;
    document.getElementById('productStock').value = product.stock;
    document.getElementById('productImageUrl').value = product.image_url || '';
  }

  els.productModalOverlay.hidden = false;
}

function closeProductModal() {
  els.productModalOverlay.hidden = true;
  editingProductId = null;
}

async function handleProductFormSubmit(e) {
  e.preventDefault();
  clearProductFormErrors();

  const payload = {
    name: document.getElementById('productName').value.trim(),
    sku: document.getElementById('productSku').value.trim(),
    category_id: Number(document.getElementById('productCategory').value),
    price: Number(document.getElementById('productPrice').value),
    stock: Number(document.getElementById('productStock').value),
    image_url: document.getElementById('productImageUrl').value.trim() || undefined,
  };

  const saveBtn = document.getElementById('saveProductBtn');
  saveBtn.disabled = true;
  saveBtn.textContent = 'Menyimpan...';

  const isEdit = editingProductId !== null;
  const endpoint = isEdit ? `/products/${editingProductId}` : '/products';
  const method = isEdit ? 'PUT' : 'POST';

  try {
    const { result } = await authFetch(endpoint, {
      method,
      body: JSON.stringify(payload),
    });

    if (!result.success) {
      if (result.errors) {
        applyProductFieldErrors(result.errors);
      } else {
        showProductFormError(result.message || 'Gagal menyimpan produk.');
      }
      return;
    }

    closeProductModal();
    await loadProducts();
  } catch (err) {
    console.error('Save product error:', err);
    showProductFormError('Tidak dapat terhubung ke server.');
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = 'Simpan';
  }
}

function applyProductFieldErrors(errors) {
  const fieldMap = {
    name: 'productNameError',
    sku: 'productSkuError',
    category_id: 'productCategoryError',
    price: 'productPriceError',
    stock: 'productStockError',
    image_url: 'productImageUrlError',
  };
  Object.entries(errors).forEach(([field, messages]) => {
    const el = document.getElementById(fieldMap[field]);
    if (el) el.textContent = messages[0];
  });
}

function clearProductFormErrors() {
  ['productNameError', 'productSkuError', 'productCategoryError', 'productPriceError', 'productStockError', 'productImageUrlError']
    .forEach((id) => { document.getElementById(id).textContent = ''; });
  els.productFormError.style.display = 'none';
  els.productFormError.textContent = '';
}

function showProductFormError(message) {
  els.productFormError.textContent = message;
  els.productFormError.style.display = 'block';
}

// ==========================================================================
// Modal: Update Stok cepat (owner only, PATCH /products/:id/stock)
// ==========================================================================

function openStockModal(product) {
  stockEditingProductId = product.id;
  els.stockProductLabel.textContent = `Stok baru untuk "${product.name}"`;
  els.stockValue.value = product.stock;
  els.stockValueError.textContent = '';
  els.stockFormError.style.display = 'none';
  els.stockModalOverlay.hidden = false;
}

function closeStockModal() {
  els.stockModalOverlay.hidden = true;
  stockEditingProductId = null;
}

async function handleStockFormSubmit(e) {
  e.preventDefault();
  els.stockValueError.textContent = '';
  els.stockFormError.style.display = 'none';

  const saveBtn = document.getElementById('saveStockBtn');
  saveBtn.disabled = true;
  saveBtn.textContent = 'Menyimpan...';

  try {
    const { result } = await authFetch(`/products/${stockEditingProductId}/stock`, {
      method: 'PATCH',
      body: JSON.stringify({ stock: Number(els.stockValue.value) }),
    });

    if (!result.success) {
      if (result.errors?.stock) {
        els.stockValueError.textContent = result.errors.stock[0];
      } else {
        els.stockFormError.textContent = result.message || 'Gagal memperbarui stok.';
        els.stockFormError.style.display = 'block';
      }
      return;
    }

    closeStockModal();
    await loadProducts();
  } catch (err) {
    console.error('Update stock error:', err);
    els.stockFormError.textContent = 'Tidak dapat terhubung ke server.';
    els.stockFormError.style.display = 'block';
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = 'Simpan';
  }
}

// ==========================================================================
// Delete Produk (owner only, DELETE /products/:id)
// ==========================================================================

async function handleDeleteProduct(product) {
  const confirmed = confirm(`Hapus produk "${product.name}"? Tindakan ini tidak bisa dibatalkan.`);
  if (!confirmed) return;

  const { result } = await authFetch(`/products/${product.id}`, { method: 'DELETE' });

  if (!result.success) {
    alert(result.message || 'Gagal menghapus produk.');
    return;
  }

  await loadProducts();
}

// ==========================================================================
// Utils
// ==========================================================================

function formatRupiah(amount) {
  return 'Rp ' + Number(amount).toLocaleString('id-ID');
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str ?? '';
  return div.innerHTML;
}
