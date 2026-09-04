// ==========================================================================
// debts.js
// Logic halaman debts.html — (owner only) sesuai API_CONTRACT.md bagian 7.
// Bergantung pada js/config.js dan js/auth-guard.js (harus di-load dulu).
// ==========================================================================

let currentStatusFilter = '';

const els = {};

document.addEventListener('DOMContentLoaded', async () => {
  const user = await requireAuth(['owner']);
  if (!user) return;

  cacheElements();
  applyRoleUI(user);
  bindEvents();

  document.getElementById('dashboardRoot').hidden = false;

  await loadDebts();
});

function cacheElements() {
  els.statusFilter = document.getElementById('statusFilter');
  els.addDebtBtn = document.getElementById('addDebtBtn');
  els.tableBody = document.getElementById('debtTableBody');
  els.statUnpaidTotal = document.getElementById('statUnpaidTotal');
  els.statUnpaidCount = document.getElementById('statUnpaidCount');

  els.debtModalOverlay = document.getElementById('debtModalOverlay');
  els.debtForm = document.getElementById('debtForm');
  els.debtFormError = document.getElementById('debtFormError');
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

// ==========================================================================
// Event bindings
// ==========================================================================

function bindEvents() {
  els.statusFilter.addEventListener('change', () => {
    currentStatusFilter = els.statusFilter.value;
    loadDebts();
  });

  els.addDebtBtn.addEventListener('click', openDebtModal);
  document.getElementById('closeDebtModalBtn').addEventListener('click', closeDebtModal);
  document.getElementById('cancelDebtBtn').addEventListener('click', closeDebtModal);
  els.debtForm.addEventListener('submit', handleDebtFormSubmit);
}

// ==========================================================================
// Load & render data
// ==========================================================================

async function loadDebts() {
  els.tableBody.innerHTML = `
    <tr><td colspan="6"><div class="empty-state"><span class="empty-state__title">Memuat data...</span></div></td></tr>
  `;

  const params = currentStatusFilter ? `?status=${currentStatusFilter}` : '';
  const { result } = await authFetch(`/debts${params}`, { method: 'GET' });

  if (!result.success) {
    els.tableBody.innerHTML = `
      <tr><td colspan="6">
        <div class="empty-state">
          <span class="empty-state__title">Gagal memuat data</span>
          <p>${escapeHtml(result.message || '')}</p>
        </div>
      </td></tr>
    `;
    return;
  }

  renderStats(result.data);
  renderDebtTable(result.data);
}

function renderStats(debts) {
  const unpaid = debts.filter((d) => d.status === 'unpaid');
  const totalUnpaid = unpaid.reduce((sum, d) => sum + d.amount, 0);

  els.statUnpaidTotal.textContent = formatRupiah(totalUnpaid);
  els.statUnpaidCount.textContent = unpaid.length;
}

function renderDebtTable(debts) {
  if (debts.length === 0) {
    els.tableBody.innerHTML = `
      <tr><td colspan="6">
        <div class="empty-state">
          <span class="empty-state__title">Belum ada data piutang</span>
          <p>${currentStatusFilter ? 'Coba ubah filter status.' : 'Piutang yang dicatat akan muncul di sini.'}</p>
        </div>
      </td></tr>
    `;
    return;
  }

  els.tableBody.innerHTML = debts.map(renderDebtRow).join('');

  els.tableBody.querySelectorAll('[data-action="mark-paid"]').forEach((btn) => {
    btn.addEventListener('click', () => handleMarkPaid(btn.dataset.debtId, btn.dataset.customerName));
  });
}

function renderDebtRow(debt) {
  const isUnpaid = debt.status === 'unpaid';
  const statusBadge = isUnpaid
    ? `<span class="badge badge--warning">Belum Lunas</span>`
    : `<span class="badge badge--success">Lunas</span>`;

  const action = isUnpaid
    ? `<button type="button" class="btn btn--solid" style="padding:0.4rem 0.7rem; font-size:0.8rem;" data-action="mark-paid" data-debt-id="${debt.id}" data-customer-name="${escapeHtml(debt.customer_name)}">Tandai Lunas</button>`
    : `<span style="color:var(--color-text-muted); font-size:0.8rem;">-</span>`;

  return `
    <tr>
      <td>${escapeHtml(debt.customer_name)}</td>
      <td>${escapeHtml(debt.transaction_id)}</td>
      <td class="is-numeric">${formatRupiah(debt.amount)}</td>
      <td>${formatDate(debt.created_at)}</td>
      <td>${statusBadge}</td>
      <td>${action}</td>
    </tr>
  `;
}

// ==========================================================================
// Tandai Lunas (PATCH /debts/:id)
// ==========================================================================

async function handleMarkPaid(debtId, customerName) {
  const confirmed = confirm(`Tandai piutang atas nama "${customerName}" sebagai lunas?`);
  if (!confirmed) return;

  const { result } = await authFetch(`/debts/${debtId}`, {
    method: 'PATCH',
    body: JSON.stringify({ status: 'paid' }),
  });

  if (!result.success) {
    alert(result.message || 'Gagal memperbarui status piutang.');
    return;
  }

  await loadDebts();
}

// ==========================================================================
// Modal: Catat Piutang Manual (POST /debts)
// ==========================================================================

function openDebtModal() {
  clearDebtFormErrors();
  els.debtForm.reset();
  els.debtModalOverlay.hidden = false;
}

function closeDebtModal() {
  els.debtModalOverlay.hidden = true;
}

async function handleDebtFormSubmit(e) {
  e.preventDefault();
  clearDebtFormErrors();

  const payload = {
    customer_name: document.getElementById('debtCustomerName').value.trim(),
    transaction_id: document.getElementById('debtTransactionId').value.trim(),
    amount: Number(document.getElementById('debtAmount').value),
  };

  const saveBtn = document.getElementById('saveDebtBtn');
  saveBtn.disabled = true;
  saveBtn.textContent = 'Menyimpan...';

  try {
    const { result } = await authFetch('/debts', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    if (!result.success) {
      if (result.errors) {
        applyDebtFieldErrors(result.errors);
      } else {
        showDebtFormError(result.message || 'Gagal mencatat piutang.');
      }
      return;
    }

    closeDebtModal();
    await loadDebts();
  } catch (err) {
    console.error('Save debt error:', err);
    showDebtFormError('Tidak dapat terhubung ke server.');
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = 'Simpan';
  }
}

function applyDebtFieldErrors(errors) {
  const fieldMap = {
    customer_name: 'debtCustomerNameError',
    transaction_id: 'debtTransactionIdError',
    amount: 'debtAmountError',
  };
  Object.entries(errors).forEach(([field, messages]) => {
    const el = document.getElementById(fieldMap[field]);
    if (el) el.textContent = messages[0];
  });
}

function clearDebtFormErrors() {
  ['debtCustomerNameError', 'debtTransactionIdError', 'debtAmountError'].forEach((id) => {
    document.getElementById(id).textContent = '';
  });
  els.debtFormError.style.display = 'none';
  els.debtFormError.textContent = '';
}

function showDebtFormError(message) {
  els.debtFormError.textContent = message;
  els.debtFormError.style.display = 'block';
}

// ==========================================================================
// Utils
// ==========================================================================

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
