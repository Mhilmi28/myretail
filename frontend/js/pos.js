// ==========================================================================
// pos.js
// Logic halaman pos.html — kasir & owner sama-sama bisa transaksi.
//
// CATATAN PENTING soal metode "Hutang":
// API_CONTRACT.md hanya mendefinisikan payment_method: cash | qris | transfer | debit.
// Tidak ada nilai "hutang" di enum tersebut. Piutang dicatat lewat endpoint
// terpisah (POST /debts) yang butuh transaction_id dari transaksi yang sudah jadi.
//
// Supaya tetap sesuai contract yang ADA SEKARANG, alur "Hutang" di sini bekerja
// dengan cara:
//   1. Transaksi tetap dikirim ke POST /transactions dengan payment_method: "cash"
//      dan cash_received: 0 (asumsi: belum ada uang masuk sama sekali).
//   2. Begitu transaksi sukses, otomatis panggil POST /debts dengan customer_name,
//      transaction_id, dan amount = total transaksi.
//
// Ini ASUMSI FRONTEND, bukan keputusan final. Perlu dikonfirmasi ke tim backend
// dan di-update di API_CONTRACT.md (idealnya backend nambah nilai enum khusus,
// misal "credit", supaya transaksi hutang lebih eksplisit tercatat di data
// transaksi itu sendiri, bukan "menyamar" sebagai cash Rp 0).
// ==========================================================================

// ---------- State halaman ----------
let currentUser = null;
let cart = []; // { product_id, name, price, stock, qty, discount_amount }
let paymentMethod = 'cash'; // 'cash' | 'qris' | 'transfer' | 'debit' | 'hutang'
let discountTotal = 0;
let cashReceived = 0;
let customerName = '';
let isSubmitting = false;

const els = {};

document.addEventListener('DOMContentLoaded', async () => {
  currentUser = await requireAuth(['owner', 'cashier']);
  if (!currentUser) return;

  cacheElements();
  applyRoleUI(currentUser);
  bindEvents();

  document.getElementById('dashboardRoot').hidden = false;

  await loadProductPicker();
  renderCart();
});

function cacheElements() {
  els.productSearchInput = document.getElementById('productSearchInput');
  els.productGrid = document.getElementById('productGrid');

  els.errorBanner = document.getElementById('posErrorBanner');
  els.cartList = document.getElementById('cartList');

  els.summarySubtotal = document.getElementById('summarySubtotal');
  els.discountTotalInput = document.getElementById('discountTotalInput');
  els.summaryTotal = document.getElementById('summaryTotal');

  els.paymentMethods = document.getElementById('paymentMethods');
  els.hutangHint = document.getElementById('hutangHint');

  els.cashField = document.getElementById('cashField');
  els.cashReceivedInput = document.getElementById('cashReceivedInput');
  els.changeRow = document.getElementById('changeRow');
  els.summaryChange = document.getElementById('summaryChange');

  els.customerNameField = document.getElementById('customerNameField');
  els.customerNameInput = document.getElementById('customerNameInput');

  els.payBtn = document.getElementById('payBtn');

  els.receiptModalOverlay = document.getElementById('receiptModalOverlay');
  els.debtWarningBanner = document.getElementById('debtWarningBanner');
}

function applyRoleUI(user) {
  document.getElementById('userName').textContent = user.name;
  document.getElementById('userRole').textContent = user.role === 'owner' ? 'Owner' : 'Cashier';
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

// ==========================================================================
// Event bindings
// ==========================================================================

function bindEvents() {
  let searchTimeout;
  els.productSearchInput.addEventListener('input', () => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      loadProductPicker(els.productSearchInput.value.trim());
    }, 350);
  });

  els.discountTotalInput.addEventListener('input', () => {
    discountTotal = Math.max(0, Number(els.discountTotalInput.value) || 0);
    recalcSummary();
  });

  els.cashReceivedInput.addEventListener('input', () => {
    cashReceived = Math.max(0, Number(els.cashReceivedInput.value) || 0);
    recalcSummary();
  });

  els.customerNameInput.addEventListener('input', () => {
    customerName = els.customerNameInput.value;
    recalcSummary();
  });

  els.paymentMethods.querySelectorAll('.payment-method-btn').forEach((btn) => {
    btn.addEventListener('click', () => setPaymentMethod(btn.dataset.value));
  });

  els.payBtn.addEventListener('click', handlePayment);

  document.getElementById('closeReceiptModalBtn').addEventListener('click', closeReceiptModal);
  document.getElementById('newTransactionBtn').addEventListener('click', () => {
    closeReceiptModal();
    resetTransaction();
  });
}

// ==========================================================================
// Product Picker (kiri)
// ==========================================================================

async function loadProductPicker(search = '') {
  els.productGrid.innerHTML = `<div class="empty-state"><span class="empty-state__title">Memuat produk...</span></div>`;

  const params = new URLSearchParams({ limit: 12 });
  if (search) params.set('search', search);

  const { result } = await authFetch(`/products?${params.toString()}`, { method: 'GET' });

  if (!result.success) {
    els.productGrid.innerHTML = `<div class="empty-state"><span class="empty-state__title">Gagal memuat produk</span></div>`;
    return;
  }

  renderProductPicker(result.data);
}

function renderProductPicker(products) {
  if (products.length === 0) {
    els.productGrid.innerHTML = `<div class="empty-state"><span class="empty-state__title">Produk tidak ditemukan</span></div>`;
    return;
  }

  els.productGrid.innerHTML = products.map((p) => renderProductCard(p)).join('');

  els.productGrid.querySelectorAll('[data-product-id]').forEach((card) => {
    card.addEventListener('click', () => {
      const product = products.find((p) => p.id === Number(card.dataset.productId));
      addToCart(product);
    });
  });
}

function renderProductCard(product) {
  const outOfStock = product.stock <= 0;
  const thumb = product.image_url
    ? `<img src="${escapeHtml(product.image_url)}" alt="" class="product-card__thumb" onerror="this.outerHTML='<div class=\\'product-card__thumb\\'>📦</div>'">`
    : `<div class="product-card__thumb">📦</div>`;

  return `
    <button type="button" class="product-card" data-product-id="${product.id}" ${outOfStock ? 'disabled' : ''}>
      ${thumb}
      <span class="product-card__name">${escapeHtml(product.name)}</span>
      <span class="product-card__price">${formatRupiah(product.price)}</span>
      <span class="product-card__stock">${outOfStock ? 'Stok habis' : `Stok: ${product.stock}`}</span>
    </button>
  `;
}

// ==========================================================================
// Cart (kanan)
// ==========================================================================

function addToCart(product) {
  const existing = cart.find((item) => item.product_id === product.id);

  if (existing) {
    if (existing.qty < product.stock) {
      existing.qty += 1;
    } else {
      showError(`Stok "${product.name}" tidak mencukupi.`);
      return;
    }
  } else {
    cart.push({
      product_id: product.id,
      name: product.name,
      price: product.price,
      stock: product.stock,
      qty: 1,
      discount_amount: 0,
    });
  }

  clearError();
  renderCart();
}

function changeQty(productId, delta) {
  const item = cart.find((i) => i.product_id === productId);
  if (!item) return;

  const newQty = item.qty + delta;
  if (newQty < 1) return; // pakai tombol hapus untuk menghapus item
  if (newQty > item.stock) {
    showError(`Stok "${item.name}" tidak mencukupi.`);
    return;
  }

  item.qty = newQty;
  clearError();
  renderCart();
}

function updateDiscount(productId, value) {
  const item = cart.find((i) => i.product_id === productId);
  if (!item) return;

  const maxDiscount = item.price * item.qty;
  item.discount_amount = Math.min(Math.max(0, Number(value) || 0), maxDiscount);
  recalcSummary();
}

function removeFromCart(productId) {
  cart = cart.filter((i) => i.product_id !== productId);
  renderCart();
}

function renderCart() {
  if (cart.length === 0) {
    els.cartList.innerHTML = `
      <div class="cart-empty" id="cartEmptyState">
        Keranjang masih kosong.<br>Pilih produk di sebelah kiri untuk mulai.
      </div>
    `;
    recalcSummary();
    return;
  }

  els.cartList.innerHTML = cart.map((item) => renderCartRow(item)).join('');

  cart.forEach((item) => {
    const row = els.cartList.querySelector(`[data-cart-id="${item.product_id}"]`);
    row.querySelector('[data-action="dec"]').addEventListener('click', () => changeQty(item.product_id, -1));
    row.querySelector('[data-action="inc"]').addEventListener('click', () => changeQty(item.product_id, 1));
    row.querySelector('[data-action="remove"]').addEventListener('click', () => removeFromCart(item.product_id));
    row.querySelector('[data-action="discount"]').addEventListener('input', (e) => updateDiscount(item.product_id, e.target.value));
  });

  recalcSummary();
}

function renderCartRow(item) {
  const subtotal = item.price * item.qty - item.discount_amount;

  return `
    <div class="cart-item" data-cart-id="${item.product_id}">
      <div class="cart-item__info">
        <div class="cart-item__name">${escapeHtml(item.name)}</div>
        <div class="cart-item__meta">${formatRupiah(item.price)} × ${item.qty} = ${formatRupiah(Math.max(0, subtotal))}</div>
        <div class="cart-item__discount">
          <label>Diskon</label>
          <input type="number" min="0" value="${item.discount_amount}" data-action="discount">
        </div>
      </div>
      <div class="qty-stepper">
        <button type="button" class="qty-stepper__btn" data-action="dec">−</button>
        <span class="qty-stepper__value">${item.qty}</span>
        <button type="button" class="qty-stepper__btn" data-action="inc" ${item.qty >= item.stock ? 'disabled' : ''}>+</button>
      </div>
      <button type="button" class="cart-item__remove" data-action="remove" title="Hapus">🗑️</button>
    </div>
  `;
}

// ==========================================================================
// Metode Pembayaran
// ==========================================================================

function setPaymentMethod(value) {
  paymentMethod = value;

  els.paymentMethods.querySelectorAll('.payment-method-btn').forEach((btn) => {
    btn.classList.toggle('is-active', btn.dataset.value === value);
  });

  els.cashField.hidden = value !== 'cash';
  els.customerNameField.hidden = value !== 'hutang';
  els.hutangHint.hidden = value !== 'hutang';

  recalcSummary();
}

// ==========================================================================
// Summary & validasi tombol Bayar
// ==========================================================================

function recalcSummary() {
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  const itemsDiscount = cart.reduce((sum, item) => sum + item.discount_amount, 0);
  const total = Math.max(0, subtotal - itemsDiscount - discountTotal);

  els.summarySubtotal.textContent = formatRupiah(subtotal);
  els.summaryTotal.textContent = formatRupiah(total);

  if (paymentMethod === 'cash') {
    const change = cashReceived - total;
    els.changeRow.hidden = false;
    els.summaryChange.textContent = formatRupiah(Math.max(0, change));
  } else {
    els.changeRow.hidden = true;
  }

  els.payBtn.disabled = !isReadyToPay(total);
}

function isReadyToPay(total) {
  if (isSubmitting) return false;
  if (cart.length === 0) return false;
  if (paymentMethod === 'cash' && cashReceived < total) return false;
  if (paymentMethod === 'hutang' && !customerName.trim()) return false;
  return true;
}

// ==========================================================================
// Submit Pembayaran (POST /transactions [+ POST /debts kalau Hutang])
// ==========================================================================

async function handlePayment() {
  clearError();
  isSubmitting = true;
  els.payBtn.disabled = true;
  els.payBtn.textContent = 'Memproses...';

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  const itemsDiscount = cart.reduce((sum, item) => sum + item.discount_amount, 0);
  const total = Math.max(0, subtotal - itemsDiscount - discountTotal);

  const isHutang = paymentMethod === 'hutang';
  // Lihat catatan di atas file: hutang dikirim sebagai cash Rp 0 karena
  // enum payment_method backend belum punya nilai khusus untuk ini.
  const actualPaymentMethod = isHutang ? 'cash' : paymentMethod;
  const actualCashReceived = isHutang ? 0 : (paymentMethod === 'cash' ? cashReceived : undefined);

  const payload = {
    items: cart.map((item) => ({
      product_id: item.product_id,
      qty: item.qty,
      discount_amount: item.discount_amount,
    })),
    discount_total: discountTotal,
    payment_method: actualPaymentMethod,
    ...(actualCashReceived !== undefined ? { cash_received: actualCashReceived } : {}),
  };

  try {
    const { response, result } = await authFetch('/transactions', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    if (!result.success) {
      handlePaymentError(response.status, result);
      return;
    }

    let debtWarning = null;

    if (isHutang) {
      debtWarning = await recordDebt(result.data, total);
    }

    // Refresh stok di product picker karena stok sudah berkurang di server.
    await loadProductPicker(els.productSearchInput.value.trim());

    showReceiptModal(result.data, { isHutang, customerName, debtWarning });
  } catch (err) {
    console.error('Payment request error:', err);
    showError('Tidak dapat terhubung ke server. Silakan coba lagi.');
  } finally {
    isSubmitting = false;
    els.payBtn.textContent = 'Bayar';
    recalcSummary();
  }
}

/**
 * Tangani response gagal dari POST /transactions sesuai kode status di contract.
 */
function handlePaymentError(status, result) {
  if (status === 400) {
    // Stok tidak mencukupi.
    showError(result.message || 'Stok produk tidak mencukupi.');
  } else if (status === 402) {
    // Pembayaran non-cash gagal — keranjang sengaja TIDAK direset,
    // supaya kasir tinggal klik "Bayar" lagi untuk retry.
    showError((result.message || 'Pembayaran gagal.') + ' Silakan klik Bayar lagi untuk mencoba ulang.');
  } else if (result.errors) {
    const firstError = Object.values(result.errors)[0]?.[0];
    showError(firstError || result.message || 'Data transaksi tidak valid.');
  } else {
    showError(result.message || 'Transaksi gagal. Silakan coba lagi.');
  }
}

/**
 * Catat piutang otomatis setelah transaksi "Hutang" berhasil (POST /debts).
 * @returns {string|null} pesan warning kalau gagal, null kalau sukses.
 */
async function recordDebt(transactionData, amount) {
  try {
    const { result } = await authFetch('/debts', {
      method: 'POST',
      body: JSON.stringify({
        customer_name: customerName.trim(),
        transaction_id: transactionData.transaction_id,
        amount,
      }),
    });

    if (!result.success) {
      return `Transaksi berhasil, tapi gagal mencatat piutang otomatis (${result.message || 'error tidak diketahui'}). Catat manual di halaman Piutang.`;
    }
    return null;
  } catch (err) {
    console.error('Record debt error:', err);
    return 'Transaksi berhasil, tapi gagal mencatat piutang otomatis karena koneksi. Catat manual di halaman Piutang.';
  }
}

// ==========================================================================
// Receipt Modal
// ==========================================================================

function showReceiptModal(data, extra) {
  const paymentLabel = extra.isHutang ? 'Hutang (Piutang)' : paymentMethodLabel(data.payment_method);

  document.getElementById('receiptMeta').innerHTML = `
    <strong>${escapeHtml(data.transaction_id)}</strong><br>
    ${formatDate(data.created_at)} · Kasir: ${escapeHtml(data.cashier?.name || '-')}<br>
    Metode: ${paymentLabel}${extra.isHutang ? ` · Pelanggan: ${escapeHtml(extra.customerName)}` : ''}
  `;

  document.getElementById('receiptItems').innerHTML = data.items.map((item) => `
    <div class="receipt__item">
      <span class="receipt__item-name">
        ${escapeHtml(item.name)}
        <div class="receipt__item-detail">${item.qty} × ${formatRupiah(item.price)}${item.discount_amount ? ` (diskon ${formatRupiah(item.discount_amount)})` : ''}</div>
      </span>
      <span>${formatRupiah(item.subtotal)}</span>
    </div>
  `).join('');

  document.getElementById('receiptSubtotal').textContent = formatRupiah(data.subtotal);
  document.getElementById('receiptDiscount').textContent = formatRupiah(data.discount_total);
  document.getElementById('receiptTotal').textContent = formatRupiah(data.total);

  const cashRow = document.getElementById('receiptCashRow');
  const changeRow = document.getElementById('receiptChangeRow');

  if (!extra.isHutang && data.payment_method === 'cash') {
    cashRow.hidden = false;
    changeRow.hidden = false;
    document.getElementById('receiptCash').textContent = formatRupiah(data.cash_received);
    document.getElementById('receiptChange').textContent = formatRupiah(data.change);
  } else {
    cashRow.hidden = true;
    changeRow.hidden = true;
  }

  if (extra.debtWarning) {
    els.debtWarningBanner.textContent = extra.debtWarning;
    els.debtWarningBanner.hidden = false;
  } else {
    els.debtWarningBanner.hidden = true;
  }

  els.receiptModalOverlay.hidden = false;
}

function closeReceiptModal() {
  els.receiptModalOverlay.hidden = true;
}

function resetTransaction() {
  cart = [];
  discountTotal = 0;
  cashReceived = 0;
  customerName = '';

  els.discountTotalInput.value = 0;
  els.cashReceivedInput.value = 0;
  els.customerNameInput.value = '';

  setPaymentMethod('cash');
  renderCart();
  clearError();
}

// ==========================================================================
// Utils
// ==========================================================================

function paymentMethodLabel(method) {
  const map = { cash: 'Tunai', qris: 'QRIS', transfer: 'Transfer', debit: 'Debit' };
  return map[method] || method;
}

function formatRupiah(amount) {
  return 'Rp ' + Number(amount).toLocaleString('id-ID');
}

function formatDate(isoString) {
  return new Date(isoString).toLocaleString('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function showError(message) {
  els.errorBanner.textContent = message;
  els.errorBanner.hidden = false;
}

function clearError() {
  els.errorBanner.hidden = true;
  els.errorBanner.textContent = '';
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str ?? '';
  return div.innerHTML;
}
