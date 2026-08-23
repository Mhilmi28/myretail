/* 
  ==========================================================================
    login.js
    Validasi front-end sederhana untuk halaman login Myretail.
    NOTE: Proses autentikasi (fetch/AJAX ke backend) belum diimplementasikan
    di sini karena bagian ini akan terhubung dengan tim back-end.
  ==========================================================================
*/  

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('loginForm');
  const emailInput = document.getElementById('email');
  const passwordInput = document.getElementById('password');
  const emailError = document.getElementById('emailError');
  const passwordError = document.getElementById('passwordError');
  const forgotBtn = document.getElementById('forgotBtn');

  form.addEventListener('submit', (e) => {
    e.preventDefault();

    let isValid = true;

    // Reset error messages
    emailError.textContent = '';
    passwordError.textContent = '';

    // Validasi email
    if (!emailInput.value.trim()) {
      emailError.textContent = 'Email wajib diisi.';
      isValid = false;
    } else if (!emailInput.checkValidity()) {
      emailError.textContent = 'Format email tidak valid.';
      isValid = false;
    }

    // Validasi password
    if (!passwordInput.value.trim()) {
      passwordError.textContent = 'Password wajib diisi.';
      isValid = false;
    } else if (passwordInput.value.length < 6) {
      passwordError.textContent = 'Password minimal 6 karakter.';
      isValid = false;
    }

    if (!isValid) return;

    /*
        TODO: integrasikan dengan endpoint login backend (fetch/AJAX)
      Contoh struktur pemanggilan:
      
      fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: emailInput.value.trim(),
          password: passwordInput.value,
        }),
      })
        .then((res) => res.json())
        .then((data) => {
          // redirect ke dashboard sesuai role (admin/kasir)
        })
        .catch((err) => console.error(err));
    */

    console.log('Form valid, siap dikirim ke backend:', {
      email: emailInput.value.trim(),
      password: passwordInput.value,
    });
  });

  // Placeholder aksi tombol "Forgot Password"
  forgotBtn.addEventListener('click', () => {
    alert('Fitur lupa password akan segera hadir.');
  });
});
