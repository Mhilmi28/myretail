// ==========================================================================
// transactions.js
// Logic halaman transactions.html — dipakai bareng owner & cashier.
// Keduanya bisa lihat SEMUA transaksi toko (bukan cuma miliknya sendiri),
// sesuai catatan di API_CONTRACT.md bagian GET /transactions.
// Filter kasir hanya ditampilkan untuk owner, karena datanya diambil dari
// GET /users yang berstatus (owner only) di contract.
// Bergantung pada js/config.js dan js/auth-guard.js (harus di-load dulu).
// ==========================================================================

let currentUser = null;
let currentPage = 1;
let totalPages = 1;
let filters = { start_date: '', end_date: '', cashier_id: '' };

const els = {};

document.addEventListener('DOMContentLoaded', async () => {
  currentUser = await requireAuth(['owner', 'cashier']);
  if (!currentUser) return;

  cacheElements();
  applyRoleUI(currentUser);
  bindEvents();

  document.getElementById('dashboardRoot').hidden = false;

  if (currentUser.role === 'owner') {
    await loadCashierFilterOptions();
  }

  await loadTransactions();
});

function cacheElements() {
  els.startDateInput = document.getElementById('startDateInput');
  els.endDateInput = document.getElementById('endDateInput');
  els.cashierFilter = document.getElementById('cashierFilter');
  els.resetFilterBtn = document.getElementById('resetFilterBtn');

  els.tableBody = document.getElementById('transactionTableBody');
  els.pagination = document.getElementById('pagination');
  els.paginationInfo = document.getElementById('paginationInfo');
  els.pageNumbers = document.getElementById('pageNumbers');
  els.prevPageBtn = document.getElementById('prevPageBtn');
  els.nextPageBtn = document.getElementById('nextPageBtn');

  els.detailModalOverlay = document.getElementById('detailModalOverlay');
  els.detailModalBody = document.getElementById('detailModalBody');
}

function applyRoleUI(user) {
  document.getElementById('userName').textContent = user.name;
  document.getElementById('userRole').textContent = user.role === 'owner' ? 'Owner' : 'Cashier';
  document.getElementById('userAvatar').textContent = getInitials(user.name);
  document.getElementById('logoutBtn').addEventListener('click', logout);
  document.getElementById('navHome').href = DASHBOARD_BY_ROLE[user.role] || 'login.html';

  document.querySelectorAll('[data-roles]').forEach((el) => {
    const allowed = el.dataset.roles.split(',');
    el.hidden = !allowed.includes(user.role);
  });

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
  els.startDateInput.addEventListener('change', () => {
    filters.start_date = els.startDateInput.value;
    currentPage = 1;
    loadTransactions();
  });

  els.endDateInput.addEventListener('change', () => {
    filters.end_date = els.endDateInput.value;
    currentPage = 1;
    loadTransactions();
  });

  els.cashierFilter.addEventListener('change', () => {
    filters.cashier_id = els.cashierFilter.value;
    currentPage = 1;
    loadTransactions();
  });

  els.resetFilterBtn.addEventListener('click', () => {
    filters = { start_date: '', end_date: '', cashier_id: '' };
    els.startDateInput.value = '';
    els.endDateInput.value = '';
    els.cashierFilter.value = '';
    currentPage = 1;
    loadTransactions();
  });

  els.prevPageBtn.addEventListener('click', () => {
    if (currentPage > 1) {
      currentPage -= 1;
      loadTransactions();
    }
  });

  els.nextPageBtn.addEventListener('click', () => {
    if (currentPage < totalPages) {
      currentPage += 1;
      loadTransactions();
    }
  });

  document.getElementById('closeDetailModalBtn').addEventListener('click', closeDetailModal);
  document.getElementById('closeDetailModalBtn2').addEventListener('click', closeDetailModal);
}

// ==========================================================================
// Load data
// ==========================================================================

/** Isi dropdown filter kasir dari GET /users (owner only). */
async function loadCashierFilterOptions() {
  const { result } = await authFetch('/users', { method: 'GET' });
  if (!result.success) return;

  result.data.forEach((user) => {
    els.cashierFilter.insertAdjacentHTML(
      'beforeend',
      `<option value="${user.id}">${escapeHtml(user.name)}</option>`
    );
  });
}

/** Ambil daftar transaksi sesuai filter & halaman aktif (GET /transactions). */
async function loadTransactions() {
  renderTableLoading();

  const params = new URLSearchParams({ page: currentPage });
  if (filters.start_date) params.set('start_date', filters.start_date);
  if (filters.end_date) params.set('end_date', filters.end_date);
  if (filters.cashier_id) params.set('cashier_id', filters.cashier_id);

  const { result } = await authFetch(`/transactions?${params.toString()}`, { method: 'GET' });

  if (!result.success) {
    renderTableError(result.message || 'Gagal memuat data transaksi.');
    return;
  }

  renderTransactionTable(result.data);
  renderPagination(result.meta);
}

// ==========================================================================
// Render: Tabel Transaksi
// ==========================================================================

function renderTableLoading() {
  els.tableBody.innerHTML = `
    <tr><td colspan="7">
      <div class="empty-state"><span class="empty-state__title">Memuat data...</span></div>
    </td></tr>
  `;
}

function renderTableError(message) {
  els.tableBody.innerHTML = `
    <tr><td colspan="7">
      <div class="empty-state">
        <span class="empty-state__title">Gagal memuat data</span>
        <p>${escapeHtml(message)}</p>
      </div>
    </td></tr>
  `;
}

function renderTransactionTable(transactions) {
  if (transactions.length === 0) {
    els.tableBody.innerHTML = `
      <tr><td colspan="7">
        <div class="empty-state">
          <span class="empty-state__title">Belum ada transaksi</span>
          <p>Coba ubah rentang tanggal atau filter kasir.</p>
        </div>
      </td></tr>
    `;
    return;
  }

  els.tableBody.innerHTML = transactions.map(renderTransactionRow).join('');

  els.tableBody.querySelectorAll('[data-action="detail"]').forEach((btn) => {
    btn.addEventListener('click', () => openDetailModal(btn.dataset.transactionId));
  });
}

function renderTransactionRow(tx) {
  const statusBadge = tx.status === 'success'
    ? `<span class="badge badge--success">Sukses</span>`
    : `<span class="badge badge--danger">${escapeHtml(tx.status)}</span>`;

  return `
    <tr>
      <td><strong>${escapeHtml(tx.transaction_id)}</strong></td>
      <td>${formatDate(tx.created_at)}</td>
      <td>${escapeHtml(tx.cashier?.name || '-')}</td>
      <td>${paymentMethodLabel(tx.payment_method)}</td>
      <td class="is-numeric">${formatRupiah(tx.total)}</td>
      <td>${statusBadge}</td>
      <td>
        <button type="button" class="btn btn--ghost" style="padding:0.4rem 0.7rem; font-size:0.8rem;" data-action="detail" data-transaction-id="${escapeHtml(tx.transaction_id)}">
          Lihat Detail
        </button>
      </td>
    </tr>
  `;
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
  els.paginationInfo.textContent = `Halaman ${meta.current_page} dari ${meta.total_page} (${meta.total_data} transaksi)`;

  els.prevPageBtn.disabled = meta.current_page <= 1;
  els.nextPageBtn.disabled = meta.current_page >= meta.total_page;

  const pages = getPageRange(meta.current_page, meta.total_page);
  els.pageNumbers.innerHTML = pages
    .map((p) => `<button type="button" class="pagination__btn ${p === meta.current_page ? 'is-active' : ''}" data-page="${p}">${p}</button>`)
    .join('');

  els.pageNumbers.querySelectorAll('[data-page]').forEach((btn) => {
    btn.addEventListener('click', () => {
      currentPage = Number(btn.dataset.page);
      loadTransactions();
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
// Modal: Detail Transaksi (GET /transactions/:id)
// ==========================================================================

async function openDetailModal(transactionId) {
  els.detailModalOverlay.hidden = false;
  els.detailModalBody.innerHTML = `
    <div class="empty-state"><span class="empty-state__title">Memuat detail...</span></div>
  `;

  const { result } = await authFetch(`/transactions/${transactionId}`, { method: 'GET' });

  if (!result.success) {
    els.detailModalBody.innerHTML = `
      <div class="empty-state">
        <span class="empty-state__title">Gagal memuat detail</span>
        <p>${escapeHtml(result.message || '')}</p>
      </div>
    `;
    return;
  }

  renderDetail(result.data);
}

function renderDetail(data) {
  const itemsHtml = data.items.map((item) => `
    <div class="receipt__item">
      <span class="receipt__item-name">
        ${escapeHtml(item.name)}
        <div class="receipt__item-detail">${item.qty} × ${formatRupiah(item.price)}${item.discount_amount ? ` (diskon ${formatRupiah(item.discount_amount)})` : ''}</div>
      </span>
      <span>${formatRupiah(item.subtotal)}</span>
    </div>
  `).join('');

  const cashRows = data.payment_method === 'cash' ? `
    <div class="summary__row">
      <span>Uang Diterima</span>
      <span>${formatRupiah(data.cash_received)}</span>
    </div>
    <div class="summary__row summary__row--change">
      <span>Kembalian</span>
      <span>${formatRupiah(data.change)}</span>
    </div>
  ` : '';

  els.detailModalBody.innerHTML = `
    <div class="receipt__meta">
      <strong>${escapeHtml(data.transaction_id)}</strong><br>
      ${formatDate(data.created_at)} · Kasir: ${escapeHtml(data.cashier?.name || '-')}<br>
      Metode: ${paymentMethodLabel(data.payment_method)} · Status: ${escapeHtml(data.status)}
    </div>
    <div class="receipt__items">${itemsHtml}</div>
    <div class="summary__row">
      <span>Subtotal</span>
      <span>${formatRupiah(data.subtotal)}</span>
    </div>
    <div class="summary__row">
      <span>Diskon</span>
      <span>${formatRupiah(data.discount_total)}</span>
    </div>
    <div class="summary__row summary__row--total">
      <span>Total</span>
      <span>${formatRupiah(data.total)}</span>
    </div>
    ${cashRows}
  `;
}

function closeDetailModal() {
  els.detailModalOverlay.hidden = true;
}

// ==========================================================================
// Utils
// ==========================================================================

function paymentMethodLabel(method) {
  const map = { cash: 'Tunai', qris: 'QRIS', transfer: 'Transfer', debit: 'Debit' };
  return map[method] || method;
}

function formatRupiah(amount) {
  return 'Rp ' + Number(amount).toLocaleString('id-ID');
}

function formatDate(isoString) {
  return new Date(isoString).toLocaleString('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str ?? '';
  return div.innerHTML;
}
