// ==========================================================================
// expenses.js
// Logic halaman expenses.html — (owner only).
// Bergantung pada js/config.js dan js/auth-guard.js (harus di-load dulu).
// ==========================================================================

let currentMonth = '';
let currentYear = String(new Date().getFullYear());

const els = {};

document.addEventListener('DOMContentLoaded', async () => {
  const user = await requireAuth(['owner']);
  if (!user) return;

  cacheElements();
  applyRoleUI(user);
  populateYearFilter();
  bindEvents();

  document.getElementById('dashboardRoot').hidden = false;

  await loadExpenses();
});

function cacheElements() {
  els.monthFilter = document.getElementById('monthFilter');
  els.yearFilter = document.getElementById('yearFilter');
  els.resetFilterBtn = document.getElementById('resetFilterBtn');
  els.addExpenseBtn = document.getElementById('addExpenseBtn');
  els.tableBody = document.getElementById('expenseTableBody');
  els.statTotalExpense = document.getElementById('statTotalExpense');

  els.expenseModalOverlay = document.getElementById('expenseModalOverlay');
  els.expenseForm = document.getElementById('expenseForm');
  els.expenseFormError = document.getElementById('expenseFormError');
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

/** Isi dropdown tahun: dari tahun sekarang mundur 4 tahun. */
function populateYearFilter() {
  const thisYear = new Date().getFullYear();
  for (let y = thisYear; y >= thisYear - 4; y--) {
    const selected = String(y) === currentYear ? 'selected' : '';
    els.yearFilter.insertAdjacentHTML('beforeend', `<option value="${y}" ${selected}>${y}</option>`);
  }
}

function bindEvents() {
  els.monthFilter.addEventListener('change', () => {
    currentMonth = els.monthFilter.value;
    loadExpenses();
  });

  els.yearFilter.addEventListener('change', () => {
    currentYear = els.yearFilter.value;
    loadExpenses();
  });

  els.resetFilterBtn.addEventListener('click', () => {
    currentMonth = '';
    currentYear = String(new Date().getFullYear());
    els.monthFilter.value = '';
    els.yearFilter.value = currentYear;
    loadExpenses();
  });

  els.addExpenseBtn.addEventListener('click', openExpenseModal);
  document.getElementById('closeExpenseModalBtn').addEventListener('click', closeExpenseModal);
  document.getElementById('cancelExpenseBtn').addEventListener('click', closeExpenseModal);
  els.expenseForm.addEventListener('submit', handleExpenseFormSubmit);
}

async function loadExpenses() {
  els.tableBody.innerHTML = `
    <tr><td colspan="4"><div class="empty-state"><span class="empty-state__title">Memuat data...</span></div></td></tr>
  `;

  const query = new URLSearchParams();
  if (currentMonth) query.set('month', currentMonth);
  if (currentYear) query.set('year', currentYear);
  const params = query.toString() ? `?${query.toString()}` : '';

  const { result } = await authFetch(`/expenses/get_expenses.php${params}`, { method: 'GET' });

  if (!result.success) {
    els.tableBody.innerHTML = `
      <tr><td colspan="4">
        <div class="empty-state">
          <span class="empty-state__title">Gagal memuat data</span>
          <p>${escapeHtml(result.message || '')}</p>
        </div>
      </td></tr>
    `;
    return;
  }

  renderStats(result.data);
  renderExpenseTable(result.data);
}

function renderStats(expenses) {
  const total = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
  els.statTotalExpense.textContent = formatRupiah(total);
}

function renderExpenseTable(expenses) {
  if (expenses.length === 0) {
    els.tableBody.innerHTML = `
      <tr><td colspan="4">
        <div class="empty-state">
          <span class="empty-state__title">Belum ada biaya tercatat</span>
          <p>Coba ubah filter bulan/tahun, atau catat biaya baru.</p>
        </div>
      </td></tr>
    `;
    return;
  }

  els.tableBody.innerHTML = expenses.map(renderExpenseRow).join('');

  els.tableBody.querySelectorAll('[data-action="delete"]').forEach((btn) => {
    btn.addEventListener('click', () => handleDeleteExpense(btn.dataset.expenseId, btn.dataset.expenseName));
  });
}

function renderExpenseRow(expense) {
  return `
    <tr>
      <td>${escapeHtml(expense.name)}</td>
      <td class="is-numeric">${formatRupiah(expense.amount)}</td>
      <td>${formatDate(expense.date)}</td>
      <td>
        <button type="button" class="icon-btn icon-btn--danger" data-action="delete" data-expense-id="${expense.id}" data-expense-name="${escapeHtml(expense.name)}" title="Hapus">🗑️</button>
      </td>
    </tr>
  `;
}

async function handleDeleteExpense(expenseId, expenseName) {
  const confirmed = confirm(`Hapus biaya "${expenseName}"? Tindakan ini tidak bisa dibatalkan.`);
  if (!confirmed) return;

  const { result } = await authFetch(`/expenses/delete_expense.php?id=${expenseId}`, { method: 'DELETE' });

  if (!result.success) {
    alert(result.message || 'Gagal menghapus biaya.');
    return;
  }

  showToast('Biaya berhasil dihapus');
  await loadExpenses();
}

function openExpenseModal() {
  clearExpenseFormErrors();
  els.expenseForm.reset();
  els.expenseModalOverlay.hidden = false;
}

function closeExpenseModal() {
  els.expenseModalOverlay.hidden = true;
}

async function handleExpenseFormSubmit(e) {
  e.preventDefault();
  clearExpenseFormErrors();

  const payload = {
    name: document.getElementById('expenseName').value.trim(),
    amount: Number(document.getElementById('expenseAmount').value),
    date: document.getElementById('expenseDate').value,
  };

  const saveBtn = document.getElementById('saveExpenseBtn');
  saveBtn.disabled = true;
  saveBtn.textContent = 'Menyimpan...';

  try {
    const { result } = await authFetch('/expenses/add_expense.php', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    if (!result.success) {
      if (result.errors) {
        applyExpenseFieldErrors(result.errors);
      } else {
        showExpenseFormError(result.message || 'Gagal mencatat biaya.');
      }
      return;
    }

    closeExpenseModal();
    showToast('Biaya berhasil dicatat');
    await loadExpenses();
  } catch (err) {
    console.error('Save expense error:', err);
    showExpenseFormError('Tidak dapat terhubung ke server.');
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = 'Simpan';
  }
}

function applyExpenseFieldErrors(errors) {
  const fieldMap = { name: 'expenseNameError', amount: 'expenseAmountError', date: 'expenseDateError' };
  Object.entries(errors).forEach(([field, messages]) => {
    const el = document.getElementById(fieldMap[field]);
    if (el) el.textContent = messages[0];
  });
}

function clearExpenseFormErrors() {
  ['expenseNameError', 'expenseAmountError', 'expenseDateError'].forEach((id) => {
    document.getElementById(id).textContent = '';
  });
  els.expenseFormError.style.display = 'none';
  els.expenseFormError.textContent = '';
}

function showExpenseFormError(message) {
  els.expenseFormError.textContent = message;
  els.expenseFormError.style.display = 'block';
}

function formatRupiah(amount) {
  return 'Rp ' + Number(amount).toLocaleString('id-ID');
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str ?? '';
  return div.innerHTML;
}