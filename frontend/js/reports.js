// ==========================================================================
// reports.js
// Logic halaman reports.html — (owner only).
// Bergantung pada js/config.js dan js/auth-guard.js (harus di-load dulu).
// ==========================================================================

let currentPeriod = 'monthly';
let currentMonth = String(new Date().getMonth() + 1);
let currentYear = String(new Date().getFullYear());

const els = {};

document.addEventListener('DOMContentLoaded', async () => {
  const user = await requireAuth(['owner']);
  if (!user) return;

  cacheElements();
  applyRoleUI(user);
  populateYearFilter();
  setInitialFilterValues();
  bindEvents();

  document.getElementById('dashboardRoot').hidden = false;

  await loadReports();
});

function cacheElements() {
  els.periodFilter = document.getElementById('periodFilter');
  els.monthFilter = document.getElementById('monthFilter');
  els.yearFilter = document.getElementById('yearFilter');
  els.reportPeriodLabel = document.getElementById('reportPeriodLabel');

  els.statTotalTransactions = document.getElementById('statTotalTransactions');
  els.statTotalRevenue = document.getElementById('statTotalRevenue');
  els.topProductsBody = document.getElementById('topProductsBody');

  els.statGrossProfit = document.getElementById('statGrossProfit');
  els.statTotalExpenses = document.getElementById('statTotalExpenses');
  els.statNetProfit = document.getElementById('statNetProfit');
  els.statTotalDiscount = document.getElementById('statTotalDiscount');
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
    els.yearFilter.insertAdjacentHTML('beforeend', `<option value="${y}">${y}</option>`);
  }
}

function setInitialFilterValues() {
  els.periodFilter.value = currentPeriod;
  els.monthFilter.value = currentMonth;
  els.yearFilter.value = currentYear;
  toggleMonthFilterVisibility();
}

function toggleMonthFilterVisibility() {
  els.monthFilter.hidden = currentPeriod !== 'monthly';
}

function bindEvents() {
  els.periodFilter.addEventListener('change', () => {
    currentPeriod = els.periodFilter.value;
    toggleMonthFilterVisibility();
    loadReports();
  });

  els.monthFilter.addEventListener('change', () => {
    currentMonth = els.monthFilter.value;
    loadReports();
  });

  els.yearFilter.addEventListener('change', () => {
    currentYear = els.yearFilter.value;
    loadReports();
  });
}

async function loadReports() {
  renderLoadingState();

  const query = new URLSearchParams({ period: currentPeriod, year: currentYear });
  if (currentPeriod === 'monthly') query.set('month', currentMonth);

  const [salesResponse, profitResponse] = await Promise.all([
    authFetch(`/reports/sales_report.php?${query.toString()}`, { method: 'GET' }),
    authFetch(`/reports/profit_report.php?${query.toString()}`, { method: 'GET' }),
  ]);

  if (!salesResponse.result.success || !profitResponse.result.success) {
    const message = salesResponse.result.message || profitResponse.result.message || 'Gagal memuat laporan.';
    renderErrorState(message);
    return;
  }

  renderSalesReport(salesResponse.result.data);
  renderProfitReport(profitResponse.result.data);
}

function renderLoadingState() {
  els.reportPeriodLabel.textContent = 'Memuat laporan...';
  els.topProductsBody.innerHTML = `
    <tr><td colspan="2"><div class="empty-state"><span class="empty-state__title">Memuat data...</span></div></td></tr>
  `;
}

function renderErrorState(message) {
  els.reportPeriodLabel.textContent = '';
  els.topProductsBody.innerHTML = `
    <tr><td colspan="2">
      <div class="empty-state">
        <span class="empty-state__title">Gagal memuat laporan</span>
        <p>${escapeHtml(message)}</p>
      </div>
    </td></tr>
  `;
  els.statTotalTransactions.textContent = '-';
  els.statTotalRevenue.textContent = '-';
  els.statGrossProfit.textContent = '-';
  els.statTotalExpenses.textContent = '-';
  els.statNetProfit.textContent = '-';
  els.statTotalDiscount.textContent = '-';
}

function renderSalesReport(data) {
  els.reportPeriodLabel.textContent = `Menampilkan laporan untuk periode: ${data.period}`;

  els.statTotalTransactions.textContent = data.total_transactions;
  els.statTotalRevenue.textContent = formatRupiah(data.total_revenue);

  if (!data.top_products || data.top_products.length === 0) {
    els.topProductsBody.innerHTML = `
      <tr><td colspan="2">
        <div class="empty-state">
          <span class="empty-state__title">Belum ada penjualan di periode ini</span>
        </div>
      </td></tr>
    `;
    return;
  }

  els.topProductsBody.innerHTML = data.top_products.map((p) => `
    <tr>
      <td>${escapeHtml(p.name)}</td>
      <td class="is-numeric">${p.qty_sold}</td>
    </tr>
  `).join('');
}

function renderProfitReport(data) {
  els.statGrossProfit.textContent = formatRupiah(data.gross_profit);
  els.statTotalExpenses.textContent = formatRupiah(data.total_expenses);
  els.statNetProfit.textContent = formatRupiah(data.net_profit);
  els.statTotalDiscount.textContent = formatRupiah(data.total_discount_given);
}

function formatRupiah(amount) {
  return 'Rp ' + Number(amount).toLocaleString('id-ID');
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str ?? '';
  return div.innerHTML;
}