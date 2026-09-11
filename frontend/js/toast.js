// ==========================================================================
// toast.js
// Utility notifikasi toast — dipakai bareng di semua halaman.
// Cara pakai: showToast('Pesan sukses', 'success') atau showToast('Pesan gagal', 'error')
// Muncul di pojok kanan atas, otomatis hilang setelah beberapa detik.
//
// WAJIB: tambahkan <div id="toastContainer" class="toast-container"></div>
// di HTML (sebelum </body>), dan <script src="js/toast.js"></script>
// SEBELUM script halaman lain (misal sebelum js/products.js).
// ==========================================================================

function showToast(message, type = 'success', duration = 3000) {
  let container = document.getElementById('toastContainer');

  // Jaga-jaga kalau elemen container lupa ditaruh di HTML -- toast tetap muncul.
  if (!container) {
    container = document.createElement('div');
    container.id = 'toastContainer';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast toast--${type}`;
  toast.textContent = message;

  container.appendChild(toast);

  // Trigger animasi masuk (delay 10ms supaya CSS transition kepicu dengan benar).
  setTimeout(() => toast.classList.add('toast--visible'), 10);

  // Hapus otomatis setelah durasi tertentu, dengan animasi keluar dulu.
  setTimeout(() => {
    toast.classList.remove('toast--visible');
    setTimeout(() => toast.remove(), 300);
  }, duration);
}