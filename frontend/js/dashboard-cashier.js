// ==========================================================================
// dashboard-cashier.js
// Logic khusus halaman dashboard-cashier.html.
// Bergantung pada js/config.js dan js/auth-guard.js (harus di-load dulu).
// ==========================================================================

document.addEventListener('DOMContentLoaded', async () => {
  // 'owner' juga diizinkan buka halaman kasir (mis. owner merangkap jaga kasir),
  // tapi kalau mau dibatasi ketat hanya 'cashier', ubah jadi requireAuth(['cashier']).
  const user = await requireAuth(['owner', 'cashier']);
  if (!user) return; // requireAuth sudah redirect kalau tidak lolos.

  renderUserInfo(user);
  document.getElementById('dashboardRoot').hidden = false;

  document.getElementById('logoutBtn').addEventListener('click', logout);
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
