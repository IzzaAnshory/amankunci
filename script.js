// Ganti dengan URL Web App Apps Script Anda setelah di-deploy
const API_URL = "https://script.google.com/macros/s/AKfycbxzTQeabetwiflBWirhZN4H8ZZexIixW1L_0J0R8u2YCECzKRWmhpN7Rz8tfwkatDqXIg/exec";

let accountsData = [];
let currentCategory = "Semua";
let sessionToken = localStorage.getItem("amankunci_token") || "";
let inactivityTimer;

// Inisialisasi Otomatis
window.addEventListener("DOMContentLoaded", () => {
    if (sessionToken) {
        showApp();
    }
    resetInactivityTimer();
});

// Deteksi Inaktivitas (Auto-lock 2 menit)
function resetInactivityTimer() {
    clearTimeout(inactivityTimer);
    if (sessionToken) {
        inactivityTimer = setTimeout(() => {
            lockApp();
            showToast("Aplikasi terkunci otomatis karena tidak aktif.");
        }, 120000); // 2 menit
    }
}
['mousemove', 'keydown', 'touchstart', 'click'].forEach(evt => {
    window.addEventListener(evt, resetInactivityTimer);
});

// Login Handler
async function handleLogin(e) {
    e.preventDefault();
    const pin = document.getElementById("masterPin").value;
    const errorEl = document.getElementById("loginError");
    errorEl.classList.add("hidden");

    try {
        const res = await fetch(API_URL, {
            method: "POST",
            body: JSON.stringify({ action: "login", pin: pin })
        });
        const json = await res.json();
        if (json.status === "success") {
            sessionToken = json.token;
            localStorage.setItem("amankunci_token", sessionToken);
            document.getElementById("masterPin").value = "";
            showApp();
        } else {
            errorEl.textContent = json.message;
            errorEl.classList.remove("hidden");
        }
    } catch (err) {
        errorEl.textContent = "Gagal terhubung ke server.";
        errorEl.classList.remove("hidden");
    }
}

function lockApp() {
    sessionToken = "";
    localStorage.removeItem("amankunci_token");
    document.getElementById("appPage").classList.add("hidden");
    document.getElementById("loginPage").classList.remove("hidden");
}

function showApp() {
    document.getElementById("loginPage").classList.add("hidden");
    document.getElementById("appPage").classList.remove("hidden");
    fetchAccounts();
}

// Ambil Data dari Google Sheets
async function fetchAccounts() {
    showToast("Memuat data...");
    try {
        const res = await fetch(API_URL, {
            method: "POST",
            body: JSON.stringify({ action: "getData", token: sessionToken })
        });
        const json = await res.json();
        if (json.status === "success") {
            accountsData = json.data;
            renderAccounts(accountsData);
        } else if (json.status === "unauthorized") {
            lockApp();
        } else {
            showToast(json.message);
        }
    } catch (err) {
        showToast("Gagal mengambil data.");
    }
}

// Render Kartu Akun
function renderAccounts(data) {
    const listEl = document.getElementById("accountList");
    listEl.innerHTML = "";

    const filtered = data.filter(acc => {
        const matchCat = currentCategory === "Semua" || acc.kategori === currentCategory;
        const query = document.getElementById("searchInput").value.toLowerCase();
        const matchQuery = acc.namaLayanan.toLowerCase().includes(query) || 
                           acc.username.toLowerCase().includes(query) || 
                           acc.kategori.toLowerCase().includes(query);
        return matchCat && matchQuery;
    });

    if (filtered.length === 0) {
        listEl.innerHTML = `<div class="text-center py-10 text-slate-500 text-xs">Tidak ada akun ditemukan.</div>`;
        return;
    }

    filtered.forEach(acc => {
        const card = document.createElement("div");
        card.className = "bg-slate-900 border border-slate-800/80 p-4 rounded-2xl shadow-sm space-y-3";
        card.innerHTML = `
            <div class="flex justify-between items-start">
                <div>
                    <span class="text-[10px] bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded-md font-medium">${acc.kategori}</span>
                    <h3 class="font-bold text-sm mt-1">${escapeHtml(acc.namaLayanan)}</h3>
                </div>
                <div class="flex gap-1">
                    <button onclick="editAccount('${acc.id}')" class="w-8 h-8 bg-slate-800 text-slate-300 rounded-lg flex items-center justify-center hover:bg-slate-700"><i class="fa-solid fa-pen text-xs"></i></button>
                    <button onclick="deleteAccount('${acc.id}')" class="w-8 h-8 bg-red-500/10 text-red-400 rounded-lg flex items-center justify-center hover:bg-red-500/20"><i class="fa-solid fa-trash text-xs"></i></button>
                </div>
            </div>
            <div class="space-y-1.5 text-xs">
                <div class="flex justify-between items-center bg-slate-950/40 p-2 rounded-xl">
                    <span class="text-slate-400 truncate max-w-[180px]">${escapeHtml(acc.username)}</span>
                    <button onclick="copyToClipboard('${escapeHtml(acc.username)}', 'Username')" class="text-blue-400 hover:text-blue-300 px-2 py-1"><i class="fa-regular fa-copy"></i></button>
                </div>
                <div class="flex justify-between items-center bg-slate-950/40 p-2 rounded-xl">
                    <span id="pass-${acc.id}" class="font-mono text-slate-400 tracking-wider">••••••••</span>
                    <div class="flex gap-1">
                        <button onclick="togglePassword('${acc.id}', '${escapeHtml(acc.password)}')" class="text-slate-400 hover:text-white px-2 py-1"><i id="eye-${acc.id}" class="fa-regular fa-eye"></i></button>
                        <button onclick="copyToClipboard('${escapeHtml(acc.password)}', 'Password')" class="text-blue-400 hover:text-blue-300 px-2 py-1"><i class="fa-regular fa-copy"></i></button>
                    </div>
                </div>
            </div>
            ${acc.url ? `<a href="${escapeHtml(acc.url)}" target="_blank" class="text-[11px] text-blue-400 hover:underline block truncate"><i class="fa-solid fa-link mr-1"></i>${escapeHtml(acc.url)}</a>` : ''}
        `;
        listEl.appendChild(card);
    });
}

// Fitur Sembunyikan/Tampilkan Sandi
function togglePassword(id, password) {
    const passEl = document.getElementById(`pass-${id}`);
    const eyeEl = document.getElementById(`eye-${id}`);
    if (passEl.textContent === "••••••••") {
        passEl.textContent = password;
        passEl.classList.remove("font-mono");
        eyeEl.className = "fa-regular fa-eye-slash";
    } else {
        passEl.textContent = "••••••••";
        passEl.classList.add("font-mono");
        eyeEl.className = "fa-regular fa-eye";
    }
}

// Copy to Clipboard dengan Auto-Clear 30 detik
function copyToClipboard(text, label) {
    navigator.clipboard.writeText(text).then(() => {
        showToast(`${label} disalin! Clipboard dibersihkan dalam 30 detik.`);
        setTimeout(() => {
            navigator.clipboard.writeText("").catch(() => {});
        }, 30000);
    });
}

// Filter Kategori
function setCategoryFilter(cat) {
    currentCategory = cat;
    document.querySelectorAll(".cat-btn").forEach(btn => {
        if (btn.textContent.trim() === cat) {
            btn.className = "cat-btn bg-blue-600 text-white px-3 py-1.5 rounded-lg whitespace-nowrap transition";
        } else {
            btn.className = "cat-btn bg-slate-900 border border-slate-800 text-slate-400 px-3 py-1.5 rounded-lg whitespace-nowrap transition";
        }
    });
    renderAccounts(accountsData);
}

function filterAccounts() {
    renderAccounts(accountsData);
}

// Modal Kontrol
function openModal(account = null) {
    document.getElementById("accountModal").classList.remove("hidden");
    if (account) {
        document.getElementById("modalTitle").textContent = "Edit Akun";
        document.getElementById("accId").value = account.id;
        document.getElementById("accLayanan").value = account.namaLayanan;
        document.getElementById("accUsername").value = account.username;
        document.getElementById("accPassword").value = account.password;
        document.getElementById("accKategori").value = account.kategori;
        document.getElementById("accUrl").value = account.url || "";
        document.getElementById("accCatatan").value = account.catatan || "";
    } else {
        document.getElementById("modalTitle").textContent = "Tambah Akun Baru";
        document.getElementById("accountForm").reset();
        document.getElementById("accId").value = "";
    }
}

function closeModal() {
    document.getElementById("accountModal").classList.add("hidden");
}

function editAccount(id) {
    const acc = accountsData.find(item => item.id === id);
    if (acc) openModal(acc);
}

// Simpan / Tambah Akun
async function saveAccount(e) {
    e.preventDefault();
    const item = {
        id: document.getElementById("accId").value,
        namaLayanan: document.getElementById("accLayanan").value,
        username: document.getElementById("accUsername").value,
        password: document.getElementById("accPassword").value,
        kategori: document.getElementById("accKategori").value,
        url: document.getElementById("accUrl").value,
        catatan: document.getElementById("accCatatan").value
    };

    showToast("Menyimpan...");
    try {
        const res = await fetch(API_URL, {
            method: "POST",
            body: JSON.stringify({ action: "saveAccount", token: sessionToken, item: item })
        });
        const json = await res.json();
        if (json.status === "success") {
            closeModal();
            fetchAccounts();
            showToast("Berhasil disimpan!");
        } else {
            showToast(json.message);
        }
    } catch (err) {
        showToast("Gagal menyimpan data.");
    }
}

// Hapus Akun
async function deleteAccount(id) {
    if (!confirm("Hapus akun ini dari brankas?")) return;
    showToast("Menghapus...");
    try {
        const res = await fetch(API_URL, {
            method: "POST",
            body: JSON.stringify({ action: "deleteAccount", token: sessionToken, id: id })
        });
        const json = await res.json();
        if (json.status === "success") {
            fetchAccounts();
            showToast("Berhasil dihapus.");
        } else {
            showToast(json.message);
        }
    } catch (err) {
        showToast("Gagal menghapus.");
    }
}

// Password Generator Acak Kuat
function generatePassword() {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#$&=!*%";
    let pass = "";
    for (let i = 0; i < 16; i++) {
        pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    document.getElementById("accPassword").value = pass;
}

// Toast Utility
function showToast(msg) {
    const toast = document.getElementById("toast");
    toast.textContent = msg;
    toast.classList.remove("opacity-0", "pointer-events-none");
    toast.classList.add("opacity-100");
    setTimeout(() => {
        toast.classList.remove("opacity-100");
        toast.classList.add("opacity-0", "pointer-events-none");
    }, 3000);
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}