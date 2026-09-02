// ==========================================================================
// login.js
// Validasi form + proses autentikasi ke backend Myretail.
// Endpoint & format response mengikuti API_CONTRACT.md.
// Bergantung pada js/config.js (harus di-load lebih dulu di HTML).
// ==========================================================================

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
    }

    return isValid;
  }

  /**
   * Kirim kredensial ke POST /auth/login dan proses hasilnya.
   * @param {{email: string, password: string}} credentials
   */
  async function handleLogin(credentials) {
    setLoadingState(true);
    clearFormError();

    try {
      const response = await fetch(`${API_BASE_URL}/auth/login.php`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });

      const result = await response.json();

      if (!result.success) {
        // Tampilkan error validasi per-field kalau ada (status 422),
        // selain itu tampilkan message umum (401: email/password salah, dll).
        if (result.errors) {
          applyFieldErrors(result.errors);
        } else {
          showFormError(result.message || 'Login gagal. Silakan coba lagi.');
        }
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
   * @param {{token: string, user: {id:number,name:string,email:string,role:'owner'|'cashier'}}} data
   */
  function onLoginSuccess(data) {
    setAuthSession(data.token, data.user);

    const destination = DASHBOARD_BY_ROLE[data.user.role] || 'login.html';
    window.location.href = destination;
  }

  /**
   * Tampilkan error validasi per-field dari response 422.
   * @param {Record<string, string[]>} errors
   */
  function applyFieldErrors(errors) {
    if (errors.email) emailError.textContent = errors.email[0];
    if (errors.password) passwordError.textContent = errors.password[0];
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
