// ==========================================================================
// auth-guard.js
// Proteksi halaman: pastikan user sudah login & role-nya sesuai.
// Bergantung pada js/config.js (harus di-load lebih dulu).
//
// Cara pakai di tiap halaman dashboard (taruh SEBELUM script halaman lain,
// karena script lain biasanya butuh data user yang divalidasi di sini):
//
//   <script src="js/config.js"></script>
//   <script src="js/auth-guard.js"></script>
//   <script>
//     requireAuth(['owner']).then((user) => {
//       // user sudah valid & rolenya 'owner', aman lanjut render halaman
//     });
//   </script>
// ==========================================================================

/**
 * Pastikan user sudah login dan rolenya termasuk dalam allowedRoles.
 * - Kalau belum ada token sama sekali -> langsung redirect ke login.html.
 * - Kalau token ada tapi invalid/expired -> authFetch otomatis redirect
 *   ke login.html saat menerima response 401.
 * - Kalau token valid tapi role tidak diizinkan di halaman ini -> redirect
 *   ke dashboard yang sesuai role user (bukan ke login, karena dia
 *   sebenarnya sudah login, cuma salah halaman).
 *
 * @param {Array<'owner'|'cashier'>} allowedRoles - role yang boleh akses halaman ini.
 * @returns {Promise<{id:number,name:string,email:string,role:string}|null>}
 *          Data user terbaru dari server jika lolos, atau null jika di-redirect.
 */
async function requireAuth(allowedRoles) {
  if (!getAuthToken()) {
    window.location.href = 'login.html';
    return null;
  }

  const { response, result } = await authFetch('/auth/me', { method: 'GET' });

  // authFetch sudah handle redirect untuk status 401 (token invalid/expired).
  if (response.status === 401) return null;

  if (!result.success) {
    // Gagal mengambil data user karena alasan lain (mis. 500) -> aman
    // untuk anggap sesi tidak valid dan minta login ulang.
    clearAuthSession();
    window.location.href = 'login.html';
    return null;
  }

  const user = result.data;

  // Sinkronkan data user terbaru dari server ke localStorage
  // (jaga-jaga kalau ada perubahan nama/role sejak login terakhir).
  localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));

  if (!allowedRoles.includes(user.role)) {
    // User login sah, tapi tidak berhak buka halaman ini.
    const ownDashboard = DASHBOARD_BY_ROLE[user.role] || 'login.html';
    window.location.href = ownDashboard;
    return null;
  }

  return user;
}

/**
 * Logout: panggil endpoint backend, bersihkan sesi lokal, lalu redirect.
 * Dipanggil dari tombol logout di setiap dashboard.
 */
async function logout() {
  try {
    await authFetch('/auth/logout', { method: 'POST' });
  } catch (err) {
    // Tetap lanjut hapus sesi lokal & redirect walau request logout gagal
    // (mis. koneksi terputus) -- tidak ada gunanya menahan user di halaman.
    console.error('Logout request error:', err);
  } finally {
    clearAuthSession();
    window.location.href = 'login.html';
  }
}
