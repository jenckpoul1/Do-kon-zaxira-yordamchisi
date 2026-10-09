const DEFAULT_PRODUCTS = [
  { id: 1, name: "O'simlik yog'i 1L", stock: 4, minLimit: 10, unit: "dona", category: "Yog'-moy" },
  { id: 2, name: "Un 1-nav (kg)", stock: 20, minLimit: 8, unit: "kg", category: "Don va un" },
  { id: 3, name: "Shakar (kg)", stock: 25, minLimit: 10, unit: "kg", category: "Baqqollik" },
  { id: 4, name: "Sut 3.2% 1L", stock: 15, minLimit: 5, unit: "dona", category: "Sut mahsulotlari" },
  { id: 5, name: "Guruch \"Alanga\" (kg)", stock: 3, minLimit: 5, unit: "kg", category: "Don va un" },
  { id: 6, name: "Choy qora 100g", stock: 12, minLimit: 4, unit: "pachka", category: "Ichimliklar" }
];

let products = [];
let transactions = [];
let currentFilter = 'all';
let searchQuery = '';
let viewMode = 'grid';
let pendingConfirmAction = null;

window.addEventListener('DOMContentLoaded', () => {
  loadDataFromStorage();
  renderApp();
});

function loadDataFromStorage() {
  const savedProducts = localStorage.getItem('dokon_products');
  const savedTrans = localStorage.getItem('dokon_transactions');

  if (savedProducts) {
    try {
      products = JSON.parse(savedProducts);
    } catch(e) {
      products = JSON.parse(JSON.stringify(DEFAULT_PRODUCTS));
    }
  } else {
    products = JSON.parse(JSON.stringify(DEFAULT_PRODUCTS));
  }

  if (savedTrans) {
    try {
      transactions = JSON.parse(savedTrans);
    } catch(e) {
      transactions = [];
    }
  } else {
    const now = new Date();
    transactions = [
      {
        id: 1,
        timestamp: new Date(now.getTime() - 7200000).toLocaleString('uz-UZ'),
        productId: 1,
        productName: "O'simlik yog'i 1L",
        type: "kirim",
        quantity: 10,
        note: "Ta'minotchidan yangi partiya keldi",
        stockAfter: "14 dona"
      },
      {
        id: 2,
        timestamp: new Date(now.getTime() - 3600000).toLocaleString('uz-UZ'),
        productId: 5,
        productName: "Guruch \"Alanga\" (kg)",
        type: "chiqim",
        quantity: 2,
        note: "Mijoz xarid qildi",
        stockAfter: "3 kg"
      }
    ];
  }
}

function saveDataToStorage() {
  localStorage.setItem('dokon_products', JSON.stringify(products));
  localStorage.setItem('dokon_transactions', JSON.stringify(transactions));
}

function renderApp() {
  renderKPIs();
  renderWarningBanner();
  renderProducts();
  renderTransactionHistory();
}

function renderKPIs() {
  const totalProducts = products.length;
  const lowStockItems = products.filter(p => p.stock <= p.minLimit);
  const normalStockItems = products.filter(p => p.stock > p.minLimit);

  document.getElementById('statTotalProducts').innerText = totalProducts;
  document.getElementById('statNormalStockCount').innerText = normalStockItems.length;
  document.getElementById('statLowStockCount').innerText = lowStockItems.length;
  document.getElementById('statTotalOperations').innerText = transactions.length;

  const lowCard = document.getElementById('statLowStockCard');
  if (lowStockItems.length > 0) {
    lowCard.classList.add('border-rose-300', 'bg-rose-50/50', 'ring-2', 'ring-rose-100');
  } else {
    lowCard.classList.remove('border-rose-300', 'bg-rose-50/50', 'ring-2', 'ring-rose-100');
  }
}

function escapeHtml(text) {
  if (!text) return '';
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function renderWarningBanner() {
  const lowStockItems = products.filter(p => p.stock <= p.minLimit);
  const banner = document.getElementById('lowStockBanner');
  const text = document.getElementById('lowStockBannerText');

  if (lowStockItems.length > 0) {
    const names = lowStockItems.map(p => `"${p.name}" (${p.stock} ${p.unit})`).join(', ');
    text.innerHTML = `<strong>Diqqat!</strong> ${lowStockItems.length} ta mahsulot zaxirasi minimal chegaradan past: ${escapeHtml(names)}`;
    banner.classList.remove('hidden');
  } else {
    banner.classList.add('hidden');
  }
}

function getFilteredProducts() {
  return products.filter(p => {
    let matchesStatus = true;
    if (currentFilter === 'low') {
      matchesStatus = p.stock <= p.minLimit;
    } else if (currentFilter === 'normal') {
      matchesStatus = p.stock > p.minLimit;
    }

    let matchesSearch = true;
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      matchesSearch = p.name.toLowerCase().includes(q) || (p.category && p.category.toLowerCase().includes(q));
    }

    return matchesStatus && matchesSearch;
  });
}

function renderProducts() {
  const filtered = getFilteredProducts();
  document.getElementById('filteredCountBadge').innerText = `${filtered.length} ta mahsulot`;

  const gridContainer = document.getElementById('productsGrid');
  const tableBody = document.getElementById('productsTableBody');

  gridContainer.innerHTML = '';
  tableBody.innerHTML = '';

  if (filtered.length === 0) {
    gridContainer.innerHTML = `
      <div class="col-span-full py-12 text-center text-slate-400 bg-white rounded-xl border border-slate-200">
        <i class="fa-solid fa-box-open text-4xl mb-2"></i>
        <p class="text-base font-medium">Hech qanday mahsulot topilmadi</p>
        <p class="text-xs text-slate-400 mt-1">Qidiruv yoki filtrlash parametrlarini o'zgartiring</p>
      </div>
    `;
    tableBody.innerHTML = `
      <tr>
        <td colspan="6" class="py-8 text-center text-slate-400">Hech qanday mahsulot topilmadi</td>
      </tr>
    `;
    return;
  }

  filtered.forEach(p => {
    const isLow = p.stock <= p.minLimit;

    const card = document.createElement('div');
    card.className = `bg-white rounded-2xl shadow-sm border ${isLow ? 'border-rose-400 ring-2 ring-rose-100 bg-rose-50/10' : 'border-slate-200'} p-5 transition hover:shadow-md flex flex-col justify-between`;

    card.innerHTML = `
      <div>
        <div class="flex items-start justify-between gap-2 mb-3">
          <div>
            <span class="text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">${escapeHtml(p.category || 'Umumiy')}</span>
            <h3 class="text-base font-bold text-slate-800 mt-1">${escapeHtml(p.name)}</h3>
          </div>
          <div class="flex items-center space-x-1 shrink-0">
            <button onclick="openProductModal(${p.id})" title="Tahrirlash" class="p-1.5 text-slate-400 hover:text-indigo-600 rounded-md transition">
              <i class="fa-solid fa-pen-to-square text-sm"></i>
            </button>
            <button onclick="confirmDeleteProduct(${p.id})" title="O'chirish" class="p-1.5 text-slate-400 hover:text-rose-600 rounded-md transition">
              <i class="fa-solid fa-trash text-sm"></i>
            </button>
          </div>
        </div>

        <div class="mb-4">
          <div class="flex items-baseline justify-between mb-1">
            <span class="text-xs text-slate-500">Mavjud Zaxira:</span>
            <span class="text-2xl font-black ${isLow ? 'text-rose-600 animate-pulse' : 'text-slate-800'}">
              ${p.stock} <span class="text-xs font-semibold text-slate-400">${escapeHtml(p.unit)}</span>
            </span>
          </div>
          <div class="flex items-center justify-between text-[11px] text-slate-400">
            <span>Minimal chegara: ${p.minLimit} ${escapeHtml(p.unit)}</span>
            <span class="font-bold ${isLow ? 'text-rose-600' : 'text-emerald-600'}">
              ${isLow ? '⚠️ Zaxira oz qoldi!' : '✓ Yetarli'}
            </span>
          </div>
        </div>
      </div>

      <div class="pt-3 border-t border-slate-100 space-y-2">
        <div class="flex gap-2">
          <input type="number" id="quickQty-${p.id}" min="0.01" step="any" placeholder="Miqdor" class="w-1/2 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500">
          <input type="text" id="quickNote-${p.id}" placeholder="Izoh" class="w-1/2 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500">
        </div>
        <div class="grid grid-cols-2 gap-2">
          <button onclick="quickTransaction(${p.id}, 'kirim')" class="py-2 bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white rounded-lg text-xs font-bold transition flex items-center justify-center">
            <i class="fa-solid fa-plus mr-1"></i> Kirim
          </button>
          <button onclick="quickTransaction(${p.id}, 'chiqim')" class="py-2 bg-rose-500 hover:bg-rose-600 active:scale-95 text-white rounded-lg text-xs font-bold transition flex items-center justify-center">
            <i class="fa-solid fa-minus mr-1"></i> Chiqim
          </button>
        </div>
      </div>
    `;
    gridContainer.appendChild(card);

    const tr = document.createElement('tr');
    tr.className = 'hover:bg-slate-50/80 transition';
    tr.innerHTML = `
      <td class="py-3 px-4 font-bold text-slate-800">${escapeHtml(p.name)}</td>
      <td class="py-3 px-4 text-xs text-slate-500">${escapeHtml(p.category || 'Umumiy')} (${escapeHtml(p.unit)})</td>
      <td class="py-3 px-4 font-medium">${p.minLimit} ${escapeHtml(p.unit)}</td>
      <td class="py-3 px-4 font-extrabold ${isLow ? 'text-rose-600' : 'text-slate-800'}">${p.stock} ${escapeHtml(p.unit)}</td>
      <td class="py-3 px-4">
        <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${isLow ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}">
          ${isLow ? '⚠️ Zaxira kamaygan' : '✓ Yetarli'}
        </span>
      </td>
      <td class="py-3 px-4 text-right space-x-1">
        <button onclick="openTransactionModal(${p.id})" class="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded text-xs font-semibold transition">
          Kirim/Chiqim
        </button>
        <button onclick="openProductModal(${p.id})" class="p-1 text-slate-400 hover:text-indigo-600 rounded">
          <i class="fa-solid fa-pen-to-square"></i>
        </button>
        <button onclick="confirmDeleteProduct(${p.id})" class="p-1 text-slate-400 hover:text-rose-600 rounded">
          <i class="fa-solid fa-trash"></i>
        </button>
      </td>
    `;
    tableBody.appendChild(tr);
  });
}

function quickTransaction(productId, type) {
  const qtyInput = document.getElementById(`quickQty-${productId}`);
  const noteInput = document.getElementById(`quickNote-${productId}`);
  const qty = parseFloat(qtyInput.value);
  const note = noteInput ? noteInput.value.trim() : '';

  if (isNaN(qty) || qty <= 0) {
    showErrorModal("Iltimos, to'g'ri va noldan katta miqdor kiriting!");
    return;
  }

  executeTransaction(productId, type, qty, note);

  qtyInput.value = '';
  if (noteInput) noteInput.value = '';
}

function executeTransaction(productId, type, quantity, note) {
  const product = products.find(p => p.id === productId);
  if (!product) return;

  if (type === 'chiqim' && quantity > product.stock) {
    showErrorModal(`❌ Xatolik: Mavjud qoldiqdan (${product.stock} ${product.unit}) ortiqcha chiqim qilib bo'lmaydi!`);
    return;
  }

  if (type === 'kirim') {
    product.stock = parseFloat((product.stock + quantity).toFixed(2));
  } else {
    product.stock = parseFloat((product.stock - quantity).toFixed(2));
  }

  const newTrans = {
    id: Date.now(),
    timestamp: new Date().toLocaleString('uz-UZ'),
    productId: product.id,
    productName: product.name,
    type: type,
    quantity: quantity,
    note: note || '-',
    stockAfter: `${product.stock} ${product.unit}`
  };

  transactions.unshift(newTrans);
  saveDataToStorage();
  renderApp();

  showToast(`Muvaffaqiyatli: ${product.name} uchun ${type === 'kirim' ? '+' : '-'}${quantity} ${product.unit} ${type} qilindi.`);
}

function renderTransactionHistory() {
  const tbody = document.getElementById('transactionHistoryBody');
  const emptyState = document.getElementById('emptyHistoryState');

  tbody.innerHTML = '';

  if (transactions.length === 0) {
    emptyState.classList.remove('hidden');
    return;
  }

  emptyState.classList.add('hidden');

  transactions.forEach(t => {
    const isKirim = t.type === 'kirim';
    const tr = document.createElement('tr');
    tr.className = 'hover:bg-slate-50 transition border-b border-slate-100';

    tr.innerHTML = `
      <td class="py-3 px-4 text-xs text-slate-500 whitespace-nowrap">${escapeHtml(t.timestamp)}</td>
      <td class="py-3 px-4 font-bold text-slate-800">${escapeHtml(t.productName)}</td>
      <td class="py-3 px-4">
        <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold ${isKirim ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}">
          <i class="fa-solid ${isKirim ? 'fa-arrow-down-left' : 'fa-arrow-up-right'} mr-1"></i>
          ${isKirim ? 'Kirim' : 'Chiqim'}
        </span>
      </td>
      <td class="py-3 px-4 font-black ${isKirim ? 'text-emerald-600' : 'text-rose-600'}">
        ${isKirim ? '+' : '-'}${t.quantity}
      </td>
      <td class="py-3 px-4 font-semibold text-slate-700">${escapeHtml(t.stockAfter)}</td>
      <td class="py-3 px-4 text-xs text-slate-500 italic">${escapeHtml(t.note)}</td>
    `;
    tbody.appendChild(tr);
  });
}

function openTransactionModal(productId = null) {
  const select = document.getElementById('transProductId');
  select.innerHTML = '';

  products.forEach(p => {
    const option = document.createElement('option');
    option.value = p.id;
    option.textContent = `${p.name} (Mavjud: ${p.stock} ${p.unit})`;
    select.appendChild(option);
  });

  if (productId) {
    select.value = productId;
  }

  updateModalStockPreview();
  document.getElementById('transQuantity').value = '';
  document.getElementById('transNote').value = '';

  const modal = document.getElementById('transactionModal');
  modal.classList.remove('hidden');
}

function closeTransactionModal() {
  document.getElementById('transactionModal').classList.add('hidden');
}

function updateModalStockPreview() {
  const productId = parseInt(document.getElementById('transProductId').value);
  const product = products.find(p => p.id === productId);
  const preview = document.getElementById('transStockPreview');

  if (product) {
    preview.textContent = `Mavjud qoldiq: ${product.stock} ${product.unit} (Minimal: ${product.minLimit} ${product.unit})`;
  } else {
    preview.textContent = 'Mavjud qoldiq: -';
  }
}

function handleTransactionSubmit(e) {
  e.preventDefault();
  const productId = parseInt(document.getElementById('transProductId').value);
  const type = document.querySelector('input[name="transType"]:checked').value;
  const quantity = parseFloat(document.getElementById('transQuantity').value);
  const note = document.getElementById('transNote').value.trim();

  if (isNaN(quantity) || quantity <= 0) {
    showErrorModal("Iltimos, to'g'ri va noldan katta miqdor kiriting!");
    return;
  }

  executeTransaction(productId, type, quantity, note);
  closeTransactionModal();
}

function openProductModal(productId = null) {
  const form = document.getElementById('productForm');
  form.reset();

  const title = document.getElementById('productModalTitle');
  const editIdInput = document.getElementById('editProductId');

  if (productId) {
    const product = products.find(p => p.id === productId);
    if (product) {
      title.innerHTML = `<i class="fa-solid fa-pen-to-square mr-2 text-indigo-400"></i> Mahsulotni Tahrirlash`;
      editIdInput.value = product.id;
      document.getElementById('prodName').value = product.name;
      document.getElementById('prodCategory').value = product.category || '';
      document.getElementById('prodUnit').value = product.unit || 'kg';
      document.getElementById('prodStock').value = product.stock;
      document.getElementById('prodMinLimit').value = product.minLimit;
    }
  } else {
    title.innerHTML = `<i class="fa-solid fa-box-archive mr-2 text-indigo-400"></i> Yangi Mahsulot Qo'shish`;
    editIdInput.value = '';
  }

  document.getElementById('productModal').classList.remove('hidden');
}

function closeProductModal() {
  document.getElementById('productModal').classList.add('hidden');
}

function handleProductSubmit(e) {
  e.preventDefault();
  const editId = document.getElementById('editProductId').value;
  const name = document.getElementById('prodName').value.trim();
  const category = document.getElementById('prodCategory').value.trim() || 'Umumiy';
  const unit = document.getElementById('prodUnit').value;
  const stock = parseFloat(document.getElementById('prodStock').value);
  const minLimit = parseFloat(document.getElementById('prodMinLimit').value);

  if (editId) {
    const product = products.find(p => p.id === parseInt(editId));
    if (product) {
      product.name = name;
      product.category = category;
      product.unit = unit;
      product.stock = stock;
      product.minLimit = minLimit;
      showToast(`"${name}" ma'lumotlari yangilandi.`);
    }
  } else {
    const newProduct = {
      id: Date.now(),
      name,
      category,
      unit,
      stock,
      minLimit
    };
    products.push(newProduct);
    showToast(`Yangi mahsulot "${name}" qo'shildi.`);
  }

  saveDataToStorage();
  renderApp();
  closeProductModal();
}

function confirmDeleteProduct(productId) {
  const product = products.find(p => p.id === productId);
  if (!product) return;

  openConfirmModal(
    "Mahsulotni o'chirish",
    `Rostdan ham "${product.name}" mahsulotini o'chirmoqchimisiz?`,
    () => {
      products = products.filter(p => p.id !== productId);
      saveDataToStorage();
      renderApp();
      showToast(`"${product.name}" o'chirildi.`);
    }
  );
}

function confirmResetData() {
  openConfirmModal(
    "Boshlang'ich holatga qaytarish",
    "Barcha ma'lumotlar va tarix tozalanib, boshlang'ich demo holatiga qaytariladi. Davom etasizmi?",
    () => {
      localStorage.removeItem('dokon_products');
      localStorage.removeItem('dokon_transactions');
      loadDataFromStorage();
      renderApp();
      showToast("Dastur boshlang'ich holatga qaytarildi.");
    }
  );
}

function confirmClearHistory() {
  openConfirmModal(
    "Tarixni tozalash",
    "Barcha kirim va chiqim harakatlari jurnali o'chirib tashlanadi. Qoldiqlar o'zgarmaydi.",
    () => {
      transactions = [];
      saveDataToStorage();
      renderTransactionHistory();
      renderKPIs();
      showToast("Harakatlar tarixi tozalandi.");
    }
  );
}

function openConfirmModal(title, text, action) {
  document.getElementById('confirmModalTitle').textContent = title;
  document.getElementById('confirmModalText').textContent = text;
  pendingConfirmAction = action;

  const modal = document.getElementById('confirmModal');
  modal.classList.remove('hidden');

  const btn = document.getElementById('confirmModalBtn');
  btn.onclick = () => {
    if (pendingConfirmAction) pendingConfirmAction();
    closeConfirmModal();
  };
}

function closeConfirmModal() {
  document.getElementById('confirmModal').classList.add('hidden');
  pendingConfirmAction = null;
}

function showErrorModal(message) {
  document.getElementById('errorMessageText').textContent = message;
  document.getElementById('errorModal').classList.remove('hidden');
}

function closeErrorModal() {
  document.getElementById('errorModal').classList.add('hidden');
}

function setFilter(filter) {
  currentFilter = filter;

  document.getElementById('tabAll').className = `px-3 py-1.5 text-xs font-semibold rounded-md transition ${filter === 'all' ? 'shadow-sm bg-white text-indigo-700' : 'text-slate-600 hover:text-slate-900'}`;
  document.getElementById('tabLow').className = `px-3 py-1.5 text-xs font-semibold rounded-md transition ${filter === 'low' ? 'shadow-sm bg-white text-indigo-700' : 'text-slate-600 hover:text-slate-900'} flex items-center`;
  document.getElementById('tabNormal').className = `px-3 py-1.5 text-xs font-semibold rounded-md transition ${filter === 'normal' ? 'shadow-sm bg-white text-indigo-700' : 'text-slate-600 hover:text-slate-900'}`;

  renderProducts();
}

function filterLowStockOnly() {
  setFilter('low');
}

function handleSearch() {
  searchQuery = document.getElementById('searchInput').value;
  renderProducts();
}

function setViewMode(mode) {
  viewMode = mode;
  const grid = document.getElementById('productsGrid');
  const table = document.getElementById('productsTableWrapper');
  const gridBtn = document.getElementById('viewGridBtn');
  const tableBtn = document.getElementById('viewTableBtn');

  if (mode === 'grid') {
    grid.classList.remove('hidden');
    table.classList.add('hidden');
    gridBtn.className = 'p-2 text-indigo-600 bg-indigo-50 rounded-lg';
    tableBtn.className = 'p-2 text-slate-400 hover:text-slate-600 rounded-lg';
  } else {
    grid.classList.add('hidden');
    table.classList.remove('hidden');
    gridBtn.className = 'p-2 text-slate-400 hover:text-slate-600 rounded-lg';
    tableBtn.className = 'p-2 text-indigo-600 bg-indigo-50 rounded-lg';
  }
}

function exportHistoryCSV() {
  if (transactions.length === 0) {
    showErrorModal("Yuklab olish uchun tarix mavjud emas!");
    return;
  }

  let csvContent = "\uFEFFSana va Vaqt,Mahsulot Nomi,Amal Turi,Miqdor,Qoldiq (Keyin),Izoh\n";

  transactions.forEach(t => {
    const row = [
      `"${t.timestamp}"`,
      `"${t.productName}"`,
      `"${t.type === 'kirim' ? 'Kirim' : 'Chiqim'}"`,
      `"${t.quantity}"`,
      `"${t.stockAfter}"`,
      `"${t.note}"`
    ];
    csvContent += row.join(",") + "\n";
  });

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `zaxira_tarixi_${Date.now()}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function showToast(message) {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = 'bg-slate-800 text-white px-4 py-3 rounded-xl shadow-lg text-xs font-medium flex items-center space-x-2 animate-fade-in border border-slate-700 pointer-events-auto';
  toast.innerHTML = `<i class="fa-solid fa-circle-check text-emerald-400"></i> <span>${escapeHtml(message)}</span>`;

  container.appendChild(toast);

  setTimeout(() => {
    toast.remove();
  }, 3500);
}