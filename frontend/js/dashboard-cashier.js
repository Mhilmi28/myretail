// ==========================================================================
// dashboard-cashier.js
// Logic khusus halaman dashboard-cashier.html.
// Bergantung pada js/config.js dan js/auth-guard.js (harus di-load dulu).
// ==========================================================================

document.addEventListener('DOMContentLoaded', async () => {
  const user = await requireAuth(['owner', 'cashier']);
  if (!user) return;

  renderUserInfo(user);
  document.getElementById('dashboardRoot').hidden = false;
  document.getElementById('logoutBtn').addEventListener('click', logout);

  await loadTodaySummary();
});

function renderUserInfo(user) {
  document.getElementById('userName').textContent = user.name;
  document.getElementById('userAvatar').textContent = getInitials(user.name);
}

function getInitials(name) {
  return name.split(' ').map((word) => word[0]).slice(0, 2).join('').toUpperCase();
}

function getTodayLocalDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Hitung ringkasan transaksi hari ini dari GET /transactions?date=...
 * (bukan /dashboard/summary, karena endpoint itu owner only sesuai kontrak).
 */
async function loadTodaySummary() {
  const today = getTodayLocalDate();

  const { result } = await authFetch(
    `/transactions/get_transactions.php?date=${today}&limit=1000`,
    { method: 'GET' }
  );

  if (!result.success) {
    document.getElementById('statTodayCount').textContent = '-';
    document.getElementById('statTodayRevenue').textContent = '-';
    return;
  }

  const transactions = result.data;
  const totalRevenue = transactions.reduce((sum, t) => sum + t.total, 0);

  document.getElementById('statTodayCount').textContent = transactions.length;
  document.getElementById('statTodayRevenue').textContent = formatRupiah(totalRevenue);
}

function formatRupiah(amount) {
  return 'Rp ' + Number(amount).toLocaleString('id-ID');
}