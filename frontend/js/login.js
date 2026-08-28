// ==========================================================================
// login.js
// Validasi form + proses autentikasi ke backend Myretail.
// ==========================================================================

// ---------- Config ----------
// TODO: sesuaikan base URL/endpoint dengan struktur routing backend project.
const API_LOGIN_URL = '/backend/api/auth/login.php';

// Key yang dipakai untuk menyimpan sesi login di localStorage.
const AUTH_TOKEN_KEY = 'myretail_token';
const AUTH_USER_KEY = 'myretail_user';

// Mapping role -> halaman dashboard tujuan.
const DASHBOARD_BY_ROLE = {
  admin: 'dashboard-admin.html',
  cashier: 'dashboard-cashier.html',
};

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('loginForm');
  const emailInput = document.getElementById('email');
  const passwordInput = document.getElementById('password');
  const emailError = document.getElementById('emailError');
  const passwordError = document.getElementById('passwordError');
  const formError = document.getElementById('formError');
  const submitBtn = form.querySelector('.login-form__submit');
  const forgotBtn = document.getElementById('forgotBtn');

  form.addEventListener('submit', (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    handleLogin({
      email: emailInput.value.trim(),
      password: passwordInput.value,
    });
  });

  forgotBtn.addEventListener('click', () => {
    alert('Fitur lupa password akan segera hadir.');
  });

  /**
   * Validasi input email & password di sisi client.
   * @returns {boolean} true jika semua input valid.
   */
  function validateForm() {
    let isValid = true;

    emailError.textContent = '';
    passwordError.textContent = '';
    clearFormError();

    if (!emailInput.value.trim()) {
      emailError.textContent = 'Email wajib diisi.';
      isValid = false;
    } else if (!emailInput.checkValidity()) {
      emailError.textContent = 'Format email tidak valid.';
      isValid = false;
    }

    if (!passwordInput.value.trim()) {
      passwordError.textContent = 'Password wajib diisi.';
      isValid = false;
    } else if (passwordInput.value.length < 6) {
      passwordError.textContent = 'Password minimal 6 karakter.';
      isValid = false;
    }

    return isValid;
  }

  /**
   * Kirim kredensial ke backend dan proses hasilnya.
   * @param {{email: string, password: string}} credentials
   */
  async function handleLogin(credentials) {
    setLoadingState(true);
    clearFormError();

    try {
      const response = await fetch(API_LOGIN_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });

      // Response tetap di-parse walau status bukan 2xx,
      // karena backend selalu mengirim JSON (sendSuccess/sendError).
      const result = await response.json();

      if (!response.ok || !result.success) {
        showFormError(result.message || 'Login gagal. Silakan coba lagi.');
        return;
      }

      onLoginSuccess(result.data);
    } catch (err) {
      // Error jaringan / server tidak bisa dihubungi / response bukan JSON.
      console.error('Login request error:', err);
      showFormError('Tidak dapat terhubung ke server. Periksa koneksi Anda.');
    } finally {
      setLoadingState(false);
    }
  }

  /**
   * Simpan sesi & redirect sesuai role setelah login berhasil.
   * @param {{token: string, user: {id:number,name:string,email:string,role:string}}} data
   */
  function onLoginSuccess(data) {
    const { token, user } = data;

    localStorage.setItem(AUTH_TOKEN_KEY, token);
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));

    const destination = DASHBOARD_BY_ROLE[user.role] || 'dashboard-cashier.html';
    window.location.href = destination;
  }

  function setLoadingState(isLoading) {
    submitBtn.disabled = isLoading;
    submitBtn.textContent = isLoading ? 'Memproses...' : 'Log in';
  }

  function showFormError(message) {
    if (formError) {
      formError.textContent = message;
      formError.hidden = false;
    } else {
      // Fallback jika elemen #formError belum ada di HTML.
      alert(message);
    }
  }

  function clearFormError() {
    if (formError) {
      formError.textContent = '';
      formError.hidden = true;
    }
  }
});
