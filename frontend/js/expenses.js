// ==========================================================================
// expenses.js
// Logic halaman expenses.html — (owner only) sesuai API_CONTRACT.md.
// Contract hanya menyediakan GET, POST, DELETE /expenses (tanpa edit),
// jadi halaman ini SENGAJA tidak punya fitur ubah biaya yang sudah dicatat.
// ==========================================================================

let currentMonth = '';
let currentYear = '';
const els = {};

document.addEventListener('DOMContentLoaded', async () => {
  const user = await requireAuth(['owner']);
  if (!user) return;

  cacheElements();
  applyRoleUI(user);
  setDefaultMonthFilter();
  bindEvents();

  document.getElementById('dashboardRoot').hidden = false;

  await loadExpenses();
});

function cacheElements() {
  els.monthFilter = document.getElementById('monthFilter');
  els.addExpenseBtn = document.getElementById('addExpenseBtn');
  els.tableBody = document.getElementById('expenseTableBody');
  els.statTotalExpense = document.getElementById('statTotalExpense');
  els.statExpenseCount = document.getElementById('statExpenseCount');
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

function getInitials(name) { return name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase(); }

/** Default filter ke bulan berjalan, sesuai contoh contract (?month=8&year=2026). */
function setDefaultMonthFilter() {
  const now = new Date();
  currentYear = String(now.getFullYear());
  currentMonth = String(now.getMonth() + 1).padStart(2, '0');
  els.monthFilter.value = `${currentYear}-${currentMonth}`;
}

function bindEvents() {
  els.monthFilter.addEventListener('change', () => {
    if (!els.monthFilter.value) return;
    const [year, month] = els.monthFilter.value.split('-');
    currentYear = year;
    currentMonth = month;
    loadExpenses();
  });

  els.addExpenseBtn.addEventListener('click', openExpenseModal);
  document.getElementById('closeExpenseModalBtn').addEventListener('click', closeExpenseModal);
  document.getElementById('cancelExpenseBtn').addEventListener('click', closeExpenseModal);
  els.expenseForm.addEventListener('submit', handleExpenseFormSubmit);
}

async function loadExpenses() {
  els.tableBody.innerHTML = `<tr><td colspan="4"><div class="empty-state"><span class="empty-state__title">Memuat data...</span></div></td></tr>`;

  const params = new URLSearchParams();
  if (currentMonth) params.set('month', Number(currentMonth));
  if (currentYear) params.set('year', currentYear);

  const { result } = await authFetch(`/expenses?${params.toString()}`, { method: 'GET' });

  if (!result.success) {
    els.tableBody.innerHTML = `<tr><td colspan="4"><div class="empty-state"><span class="empty-state__title">Gagal memuat data</span><p>${escapeHtml(result.message || '')}</p></div></td></tr>`;
    return;
  }

  renderStats(result.data);
  renderExpenseTable(result.data);
}

function renderStats(expenses) {
  const total = expenses.reduce((sum, e) => sum + e.amount, 0);
  els.statTotalExpense.textContent = formatRupiah(total);
  els.statExpenseCount.textContent = expenses.length;
}

function renderExpenseTable(expenses) {
  if (expenses.length === 0) {
    els.tableBody.innerHTML = `<tr><td colspan="4"><div class="empty-state"><span class="empty-state__title">Belum ada biaya di bulan ini</span><p>Klik "+ Tambah Biaya" untuk mencatat pengeluaran.</p></div></td></tr>`;
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
      <td>${formatDateOnly(expense.date)}</td>
      <td class="is-numeric">${formatRupiah(expense.amount)}</td>
      <td>
        <button type="button" class="icon-btn icon-btn--danger" data-action="delete" data-expense-id="${expense.id}" data-expense-name="${escapeHtml(expense.name)}" title="Hapus biaya">🗑️</button>
      </td>
    </tr>
  `;
}

async function handleDeleteExpense(expenseId, expenseName) {
  const confirmed = confirm(`Hapus biaya "${expenseName}"? Tindakan ini tidak bisa dibatalkan.`);
  if (!confirmed) return;

  const { result } = await authFetch(`/expenses/${expenseId}`, { method: 'DELETE' });

  if (!result.success) { alert(result.message || 'Gagal menghapus biaya.'); return; }

  await loadExpenses();
}

function openExpenseModal() {
  els.expenseForm.reset();
  clearExpenseFormErrors();
  // Default tanggal ke hari ini biar gak perlu isi manual tiap kali.
  document.getElementById('expenseDate').value = new Date().toISOString().slice(0, 10);
  els.expenseModalOverlay.hidden = false;
}

function closeExpenseModal() { els.expenseModalOverlay.hidden = true; }

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
    const { result } = await authFetch('/expenses', { method: 'POST', body: JSON.stringify(payload) });

    if (!result.success) {
      if (result.errors) { applyExpenseFieldErrors(result.errors); } else { showExpenseFormError(result.message || 'Gagal menyimpan biaya.'); }
      return;
    }

    closeExpenseModal();

    // Kalau biaya baru ini ada di bulan/tahun yang sedang difilter, refresh list.
    // Kalau beda bulan, pindahkan filter ke bulan biaya tsb biar user langsung lihat hasilnya.
    const [savedYear, savedMonth] = payload.date.split('-');
    if (savedYear !== currentYear || savedMonth !== currentMonth) {
      currentYear = savedYear;
      currentMonth = savedMonth;
      els.monthFilter.value = `${savedYear}-${savedMonth}`;
    }

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
  ['expenseNameError', 'expenseAmountError', 'expenseDateError'].forEach((id) => { document.getElementById(id).textContent = ''; });
  els.expenseFormError.style.display = 'none';
  els.expenseFormError.textContent = '';
}

function showExpenseFormError(message) { els.expenseFormError.textContent = message; els.expenseFormError.style.display = 'block'; }

function formatRupiah(amount) { return 'Rp ' + Number(amount).toLocaleString('id-ID'); }

function formatDateOnly(dateString) {
  return new Date(dateString).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str ?? '';
  return div.innerHTML;
}
