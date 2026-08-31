// ==========================================================================
// config.js
// Konfigurasi terpusat untuk komunikasi dengan backend Myretail.
// Sesuai API_CONTRACT.md — base URL, auth token, dan helper fetch.
// File ini dipakai bersama di semua halaman (login, dashboard, dll),
// jadi jangan taruh logic yang spesifik ke satu halaman di sini.
// ==========================================================================

// TODO: ganti sesuai environment (development / production).
const API_BASE_URL = 'http://localhost/myretail/backend/api';

const AUTH_TOKEN_KEY = 'myretail_token';
const AUTH_USER_KEY = 'myretail_user';

/**
 * Ambil token yang tersimpan di localStorage.
 * @returns {string|null}
 */
function getAuthToken() {
  return localStorage.getItem(AUTH_TOKEN_KEY);
}

/**
 * Ambil data user yang tersimpan (id, name, email, role).
 * @returns {{id:number,name:string,email:string,role:'owner'|'cashier'}|null}
 */
function getAuthUser() {
  const raw = localStorage.getItem(AUTH_USER_KEY);
  return raw ? JSON.parse(raw) : null;
}

/**
 * Simpan sesi login (dipanggil setelah login berhasil).
 */
function setAuthSession(token, user) {
  localStorage.setItem(AUTH_TOKEN_KEY, token);
  localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
}

/**
 * Hapus sesi login (dipanggil saat logout / token invalid).
 */
function clearAuthSession() {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(AUTH_USER_KEY);
}

/**
 * Wrapper fetch() yang otomatis:
 * - Menambahkan base URL
 * - Menambahkan header Authorization: Bearer <token> (jika ada token)
 * - Set Content-Type: application/json
 * - Redirect ke login.html kalau dapat 401 (token invalid/expired)
 *
 * Dipakai untuk SEMUA request ke endpoint yang butuh login
 * (products, transactions, categories, reports, dll).
 * Endpoint publik (mis. /auth/login) cukup pakai fetch() biasa.
 *
 * @param {string} endpoint - contoh: '/products', '/transactions/TRX-001'
 * @param {RequestInit} options - opsi fetch tambahan (method, body, dll)
 * @returns {Promise<{response: Response, result: any}>}
 */
async function authFetch(endpoint, options = {}) {
  const token = getAuthToken();

  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const result = await response.json();

  if (response.status === 401) {
    // Token invalid / expired -> paksa login ulang.
    clearAuthSession();
    window.location.href = 'login.html';
  }

  return { response, result };
}

/**
 * Mapping role -> halaman dashboard tujuan setelah login.
 * Sesuai API_CONTRACT.md: role yang valid hanya 'owner' dan 'cashier'.
 */
const DASHBOARD_BY_ROLE = {
  owner: 'dashboard-owner.html',
  cashier: 'dashboard-cashier.html',
};
