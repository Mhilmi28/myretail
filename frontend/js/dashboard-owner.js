// ==========================================================================
// dashboard-owner.js
// Logic khusus halaman dashboard-owner.html.
// Bergantung pada js/config.js dan js/auth-guard.js (harus di-load dulu).
// ==========================================================================

document.addEventListener('DOMContentLoaded', async () => {
  // Hanya role 'owner' yang boleh membuka halaman ini.
  const user = await requireAuth(['owner']);
  if (!user) return; // requireAuth sudah redirect kalau tidak lolos.

  renderUserInfo(user);
  document.getElementById('dashboardRoot').hidden = false;

  document.getElementById('logoutBtn').addEventListener('click', logout);

  loadDashboardSummary();
});

/**
 * Tampilkan nama & inisial avatar di topbar.
 * @param {{name: string}} user
 */
function renderUserInfo(user) {
  document.getElementById('userName').textContent = user.name;
  document.getElementById('userAvatar').textContent = getInitials(user.name);
}

function getInitials(name) {
  return name
    .split(' ')
    .map((word) => word[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

/**
 * Ambil ringkasan dashboard dari GET /dashboard/summary dan render ke stat card.
 */
async function loadDashboardSummary() {
  const { result } = await authFetch('/dashboard/summary', { method: 'GET' });

  if (!result.success) {
    console.error('Gagal memuat ringkasan dashboard:', result.message);
    return;
  }

  const { today_revenue, today_transactions, low_stock_products } = result.data;

  document.getElementById('statRevenue').textContent = formatRupiah(today_revenue);
  document.getElementById('statTransactions').textContent = today_transactions;
  document.getElementById('statLowStock').textContent = low_stock_products.length;

  renderLowStockList(low_stock_products);
}

/**
 * Render daftar produk stok menipis, atau tampilkan empty state kalau kosong.
 * @param {Array<{id:number, name:string, stock:number}>} products
 */
function renderLowStockList(products) {
  const container = document.getElementById('lowStockEmptyState');

  if (!products || products.length === 0) {
    container.innerHTML = `
      <span class="empty-state__title">Aman, tidak ada stok menipis</span>
      <p>Semua produk masih dalam jumlah stok yang cukup.</p>
    `;
    return;
  }

  const list = document.createElement('ul');
  list.style.width = '100%';
  list.style.listStyle = 'none';

  products.forEach((product) => {
    const item = document.createElement('li');
    item.style.display = 'flex';
    item.style.justifyContent = 'space-between';
    item.style.padding = '0.5rem 0';
    item.style.borderBottom = '1px solid var(--color-border)';
    item.innerHTML = `<span>${product.name}</span><strong>${product.stock} pcs</strong>`;
    list.appendChild(item);
  });

  container.replaceWith(list);
}

/**
 * Format angka jadi format Rupiah (Rp xx.xxx), sesuai contract
 * yang mengirim harga sebagai integer tanpa desimal.
 * @param {number} amount
 */
function formatRupiah(amount) {
  return 'Rp ' + amount.toLocaleString('id-ID');
}
