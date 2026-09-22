import { auth } from "./core/firebase.js";
import { watchAuth, signOut, startIdleTimeout } from "./core/auth.js";
import { listInventory, saveInventory, removeInventory, changeStock } from "./features/inventory.js";
import { saveCustomer, findCustomer } from "./features/customers.js";
import {
  listServices, getService, findServiceByCode, saveService, removeService,
  makeServiceNumber, stats, filterOperationalServices
} from "./features/services.js";
import { printReceipt } from "./features/receipt.js";
import { createRestock, listRestocks } from "./features/restock.js";
import { listLedger, saveLedger, removeLedger } from "./features/accounting.js";

const $ = s => document.querySelector(s);
const money = n => `Rp ${Number(n || 0).toLocaleString("id-ID")}`;
let uiBound = false;
let scanner = null;
let idleCleanup = null;

const state = {
  tab: "jasa",
  items: { jasa: [], sparepart: [] },
  inventory: [],
  services: [],
  restocks: [],
  ledger: [],
  selectedInventory: null,
  editInventoryKey: null,
  editInventoryCategory: null,
  editServiceKey: null,
  editServiceOriginal: null,
  user: null
};

const view = {
  toast(message, type = "info") {
    const el = $("#toast");
    if (!el) return;
    el.textContent = message;
    el.dataset.type = type;
    el.classList.add("show");
    clearTimeout(el._timer);
    el._timer = setTimeout(() => el.classList.remove("show"), 2800);
  },
  stat(id, value) {
    const el = $(`#${id}`);
    if (el) el.textContent = value;
  },
  modal(title, html) {
    $("#modal-title").textContent = title;
    $("#modal-body").innerHTML = html;
    $("#modal").classList.add("open");
  },
  closeModal() {
    $("#modal").classList.remove("open");
  }
};

const statusOf = x => String(x?.status || "").trim().toUpperCase();
const dateInput = value => {
  const d = value ? new Date(value) : new Date();
  return Number.isNaN(d.getTime()) ? new Date().toISOString().slice(0, 10) : d.toISOString().slice(0, 10);
};

function currentForm() {
  return {
    pelanggan: $("#input-nama").value.trim(),
    telp: $("#input-telp").value.trim(),
    merk: $("#input-merk").value.trim(),
    serial: $("#barcode-input").value.trim(),
    kelengkapan: $("#input-kelengkapan").value.trim(),
    keluhan: $("#input-keluhan").value.trim(),
    status: $("#status-servis").value,
    keterangan: $("#keterangan-servis").value.trim()
  };
}

function total() {
  return [...state.items.jasa, ...state.items.sparepart].reduce((sum, item) => sum + Number(item.harga || 0), 0);
}

function escapeHtml(v) {
  return String(v ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

function renderCart() {
  const el = $("#cart");
  if (!el) return;
  el.innerHTML = "";
  for (const cat of ["jasa", "sparepart"]) {
    if (!state.items[cat].length) continue;
    const head = document.createElement("div");
    head.className = "cart-section";
    head.textContent = cat === "jasa" ? "JASA" : "SPAREPART / TINTA";
    el.append(head);
    state.items[cat].forEach((item, i) => {
      const row = document.createElement("div");
      row.className = "cart-row";
      row.innerHTML = `<div><strong>${escapeHtml(item.nama)}</strong>${item.dariInventori ? "<small> • inventory</small>" : ""}</div><div>${money(item.harga)} <button class="icon-btn danger" data-remove="${cat}:${i}" title="Hapus">×</button></div>`;
      el.append(row);
    });
  }
  $("#total").textContent = money(total());
}

async function loadAll() {
  const tasks = await Promise.allSettled([listInventory(), listServices(), listRestocks(), listLedger()]);
  state.inventory = tasks[0].status === "fulfilled" ? tasks[0].value : [];
  state.services = tasks[1].status === "fulfilled" ? tasks[1].value : [];
  state.restocks = tasks[2].status === "fulfilled" ? tasks[2].value : [];
  state.ledger = tasks[3].status === "fulfilled" ? tasks[3].value : [];

  if (tasks.some(x => x.status === "rejected")) {
    console.error("OnePrint: sebagian data gagal dimuat", tasks.filter(x => x.status === "rejected").map(x => x.reason));
    view.toast("Sebagian data gagal dimuat. Periksa koneksi Firebase.", "error");
  }

  console.info(`OnePrint: ${state.services.length} data servis, ${state.inventory.length} inventori`);
  renderInventory();
  renderStats();
  renderServiceTable();
  renderRestock();
  renderAccounting();
}

function renderStats() {
  const s = stats(state.services);
  view.stat("stat-total", s.total);
  view.stat("stat-aktif", s.aktif);
  view.stat("stat-sparepart", s.sparepart);
  view.stat("stat-selesai", s.selesai);
  const badge = $("#new-badge");
  if (badge) {
    badge.textContent = `${s.baru} baru`;
    badge.hidden = s.baru === 0;
  }
  const period = $("#dashboard-period");
  if (period) period.textContent = "Data aktif: bulan berjalan + 1 bulan sebelumnya. Servis lama yang belum DIAMBIL/CANCEL tetap dipertahankan.";
}

function renderInventory() {
  const q = ($("#inventory-search")?.value || "").toLowerCase();
  const rows = state.inventory.filter(x => String(x.nama || "").toLowerCase().includes(q));
  $("#inventory-count").textContent = `${rows.length} item`;
  $("#inventory-list").innerHTML = rows.map(x => `<tr>
    <td><strong>${escapeHtml(x.nama)}</strong><small>${escapeHtml(x.kategori)} · ${escapeHtml(x.satuan || "pcs")}</small></td>
    <td>${money(x.harga_jual)}</td><td>${x.stok ?? 0}</td><td>${money(x.harga_beli)}</td>
    <td><span class="stock ${Number(x.stok || 0) <= Number(x.minimum || 1) ? "low" : ""}">${Number(x.stok || 0) <= Number(x.minimum || 1) ? "Menipis" : "Aman"}</span></td>
    <td><button class="table-action" data-edit-inv="${x.kategori}:${x.key}">Edit</button><button class="table-action danger" data-del-inv="${x.kategori}:${x.key}">Hapus</button></td>
  </tr>`).join("") || `<tr><td colspan="6" class="empty">Belum ada inventori.</td></tr>`;
}

function renderSuggestions() {
  const q = $("#input-item-nama").value.trim().toLowerCase();
  const box = $("#suggestions");
  if (q.length < 2) { box.hidden = true; return; }
  const rows = state.inventory.filter(x => String(x.nama || "").toLowerCase().includes(q)).slice(0, 10);
  box.innerHTML = rows.map(x => `<button class="suggestion" data-pick="${x.kategori}:${x.key}"><b>${escapeHtml(x.nama)}</b><span>${money(x.harga_jual)} · stok ${x.stok ?? 0} ${escapeHtml(x.satuan || "")}</span></button>`).join("");
  box.hidden = !rows.length;
}

function renderServiceTable() {
  const q = ($("#service-search")?.value || "").toLowerCase();
  const selectedStatus = $("#service-status-filter")?.value || "";
  const rows = filterOperationalServices(state.services).filter(x =>
    (!selectedStatus || statusOf(x) === selectedStatus) &&
    [x.nomor, x.pelanggan, x.telp, x.merk, x.serial, x.status].some(v => String(v || "").toLowerCase().includes(q))
  ).slice(0, 120);

  const serviceCount = $("#service-count");
  if (serviceCount) serviceCount.textContent = `${rows.length} tampil`;

  let serviceList = $("#service-list") || $("#service-table-body") || document.querySelector("#page-services tbody");
  if (!serviceList) {
    const table = document.querySelector("#page-services table");
    if (table) {
      serviceList = document.createElement("tbody");
      serviceList.id = "service-list";
      table.appendChild(serviceList);
    }
  }
  if (!serviceList) {
    console.warn("OnePrint: tabel daftar servis tidak tersedia pada halaman ini.");
    return;
  }
  serviceList.innerHTML = rows.map(x => `<tr>
    <td><strong>${escapeHtml(x.nomor)}</strong><small>${new Date(x.tanggal || 0).toLocaleString("id-ID")}</small></td>
    <td>${escapeHtml(x.pelanggan)}<small>${escapeHtml(x.merk)}</small></td>
    <td><span class="status status-${statusOf(x).toLowerCase().replaceAll(" ", "-")}">${escapeHtml(x.status || "-")}</span></td>
    <td>${money(x.total)}</td><td><button class="table-action" data-open-service="${escapeHtml(x.key)}">Buka</button></td>
  </tr>`).join("") || `<tr><td colspan="5" class="empty">Tidak ada servis pada periode tampilan.</td></tr>`;
}

function renderRestock() {
  const select = $("#restock-item");
  if (select) {
    const current = select.value;
    select.innerHTML = `<option value="">Pilih barang...</option>` + state.inventory
      .filter(x => x.kategori !== "jasa")
      .map(x => `<option value="${escapeHtml(x.kategori)}|${escapeHtml(x.key)}">${escapeHtml(x.nama)} · stok ${x.stok ?? 0}</option>`).join("");
    if ([...select.options].some(o => o.value === current)) select.value = current;
  }
  const rows = state.restocks.slice(0, 30);
  $("#restock-list").innerHTML = rows.map(x => `<tr>
    <td>${new Date(x.tanggal || 0).toLocaleDateString("id-ID")}</td>
    <td><strong>${escapeHtml(x.nama)}</strong><small>${escapeHtml(x.supplier || "-")}</small></td>
    <td>${x.qty} ${escapeHtml(x.satuan || "")}</td><td>${money(x.total)}</td>
  </tr>`).join("") || `<tr><td colspan="4" class="empty">Belum ada riwayat restock.</td></tr>`;
}

function selectedAccountingMonth() {
  return $("#accounting-month")?.value || new Date().toISOString().slice(0, 7);
}

function renderAccounting() {
  const month = selectedAccountingMonth();
  const rows = state.ledger.filter(x => String(x.tanggal || "").slice(0, 7) === month);
  const income = rows.filter(x => x.tipe === "PEMASUKAN").reduce((s, x) => s + Number(x.jumlah || 0), 0);
  const expense = rows.filter(x => x.tipe === "PENGELUARAN").reduce((s, x) => s + Number(x.jumlah || 0), 0);
  view.stat("account-income", money(income));
  view.stat("account-expense", money(expense));
  view.stat("account-net", money(income - expense));
  const ml = $("#account-month-label"); if (ml) ml.textContent = month;
  $("#ledger-list").innerHTML = rows.slice(0, 100).map(x => `<tr>
    <td>${new Date(x.tanggal || 0).toLocaleDateString("id-ID")}</td>
    <td><span class="ledger-type ${x.tipe === "PEMASUKAN" ? "in" : "out"}">${x.tipe}</span></td>
    <td>${escapeHtml(x.keterangan)}<small>${escapeHtml(x.sumber || "")}</small></td>
    <td>${money(x.jumlah)}</td>
    <td>${x.sumber === "MANUAL" ? `<button class="table-action danger" data-del-ledger="${x.key}">Hapus</button>` : ""}</td>
  </tr>`).join("") || `<tr><td colspan="5" class="empty">Belum ada transaksi keuangan bulan ini.</td></tr>`;
}

function resetServiceForm() {
  ["input-nama","input-telp","input-merk","barcode-input","input-kelengkapan","input-keluhan","keterangan-servis"].forEach(id => { const el = $(`#${id}`); if (el) el.value = ""; });
  $("#status-servis").value = "MASUK";
  state.items = { jasa: [], sparepart: [] };
  state.editServiceKey = null;
  state.editServiceOriginal = null;
  $("#service-mode").textContent = "Transaksi Baru";
  $("#delete-service").hidden = true;
  renderCart();
}

function fillService(data) {
  $("#input-nama").value = data.pelanggan || "";
  $("#input-telp").value = data.telp || "";
  $("#input-merk").value = data.merk || "";
  $("#barcode-input").value = data.serial || "";
  $("#input-kelengkapan").value = data.kelengkapan || "";
  $("#input-keluhan").value = data.keluhan || "";
  $("#status-servis").value = data.status || "MASUK";
  $("#keterangan-servis").value = data.keterangan || "";
  state.items = { jasa: data.jasa || [], sparepart: data.sparepart || [] };
  state.editServiceKey = data.key;
  state.editServiceOriginal = { ...data };
  $("#service-mode").textContent = `Edit ${data.nomor || data.key}`;
  $("#delete-service").hidden = false;
  renderCart();
}

async function addCartItem() {
  const name = $("#input-item-nama").value.trim();
  const price = Number($("#input-item-harga").value) || 0;
  if (!name || price <= 0) return view.toast("Nama dan harga wajib diisi", "error");
  const item = { nama: name, harga: price };
  if (state.selectedInventory) {
    const inv = state.inventory.find(x => x.key === state.selectedInventory.key && x.kategori === state.selectedInventory.kategori);
    if (inv) {
      item.key = inv.key; item.kategori = inv.kategori; item.dariInventori = true;
      if (inv.kategori !== "jasa" && Number(inv.stok || 0) <= 0) return view.toast("Stok barang habis", "error");
    }
  }
  state.items[state.tab].push(item);
  state.selectedInventory = null;
  $("#input-item-nama").value = ""; $("#input-item-harga").value = ""; $("#suggestions").hidden = true;
  renderCart();
}

async function syncInventoryUsage(previousItems, nextItems) {
  const oldCounts = new Map();
  const newCounts = new Map();
  [...(previousItems || [])].forEach(i => { if (i.dariInventori && i.kategori !== "jasa") oldCounts.set(`${i.kategori}/${i.key}`, (oldCounts.get(`${i.kategori}/${i.key}`) || 0) + 1); });
  [...(nextItems || [])].forEach(i => { if (i.dariInventori && i.kategori !== "jasa") newCounts.set(`${i.kategori}/${i.key}`, (newCounts.get(`${i.kategori}/${i.key}`) || 0) + 1); });
  const keys = new Set([...oldCounts.keys(), ...newCounts.keys()]);
  for (const key of keys) {
    const [kategori, invKey] = key.split("/");
    const deltaUsed = (newCounts.get(key) || 0) - (oldCounts.get(key) || 0);
    if (!deltaUsed) continue;
    const inv = state.inventory.find(x => x.kategori === kategori && x.key === invKey);
    if (inv) await changeStock(inv, -deltaUsed);
  }
}

async function syncServicePayment(data, oldData) {
  if (statusOf(data) !== "DIAMBIL") return;
  const amount = Number(data.total || 0);
  const ledgerKey = `SERVIS_${String(data.nomor).replace(/[.#$[\]\/]/g, "_")}`;
  await saveLedger({
    tanggal: dateInput(data.tanggal),
    tipe: "PEMASUKAN",
    kategori: "SERVIS",
    sumber: "SERVIS",
    referensi: data.nomor,
    keterangan: `Pembayaran servis ${data.nomor} - ${data.pelanggan}`,
    jumlah: amount
  }, ledgerKey);
}

async function saveCurrentService(print = false, type = "nota") {
  const f = currentForm();
  if (!f.pelanggan || !f.merk) return view.toast("Nama pelanggan dan merk/tipe wajib diisi", "error");

  const old = state.editServiceOriginal || {};
  const number = state.editServiceKey ? (old.nomor || state.editServiceKey.split("/").pop()) : makeServiceNumber();
  const data = {
    ...f,
    nomor: number,
    tanggal: old.tanggal || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    jasa: state.items.jasa,
    sparepart: state.items.sparepart,
    total: total(),
    teknisi: state.user?.email?.split("@")[0]?.toUpperCase() || "TEKNISI"
  };

  await saveCustomer(f.serial, f);
  await syncInventoryUsage([...(old.jasa || []), ...(old.sparepart || [])], [...state.items.jasa, ...state.items.sparepart]);
  const savedKey = await saveService(state.editServiceKey, data);
  await syncServicePayment(data, old);
  await loadAll();
  state.editServiceKey = savedKey;

  const changedStatus = statusOf(old) && statusOf(old) !== statusOf(data);
  view.toast(changedStatus ? `Status berubah: ${statusOf(old)} → ${statusOf(data)}` : "Perubahan servis berhasil disimpan", "success");
  if (print) printReceipt(data, type);
}

async function openService(key) {
  const d = await getService(key);
  if (!d) return view.toast("Servis tidak ditemukan", "error");
  fillService(d);
  switchPage("kasir");
}

async function removeCurrentService() {
  if (!state.editServiceKey) return;
  if (!confirm("Hapus servis ini?")) return;
  const old = state.editServiceOriginal || await getService(state.editServiceKey);
  if (old) await syncInventoryUsage([...(old.jasa || []), ...(old.sparepart || [])], []);
  await removeService(state.editServiceKey);
  resetServiceForm();
  await loadAll();
  view.toast("Servis berhasil dihapus", "success");
}

async function startCodeScanner(mode = "service") {
  if (!window.Html5Qrcode) return view.toast("Scanner belum siap. Periksa koneksi internet.", "error");
  $("#scanner-modal").classList.add("open");
  $("#scanner-result").textContent = "Arahkan kamera ke barcode / QR...";
  const reader = $("#app-reader");
  reader.innerHTML = "";
  try {
    scanner = new Html5Qrcode("app-reader");
    await scanner.start(
      { facingMode: "environment" },
      {
        fps: 20,
        qrbox: { width: Math.min(300, Math.max(220, window.innerWidth - 90)), height: 120 },
        aspectRatio: 1.777,
        experimentalFeatures: { useBarCodeDetectorIfSupported: true },
        formatsToSupport: [
          Html5QrcodeSupportedFormats.CODE_128, Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.CODE_93, Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8, Html5QrcodeSupportedFormats.QR_CODE
        ]
      },
      async decodedText => {
        await stopCodeScanner();
        const code = decodedText.trim();
        if (mode === "serial") {
          $("#barcode-input").value = code;
          const customer = await findCustomer(code);
          if (customer) {
            $("#input-nama").value = customer.nama || "";
            $("#input-telp").value = customer.telp || "";
            $("#input-merk").value = customer.merk || "";
            $("#input-kelengkapan").value = customer.kelengkapan || "";
            view.toast("Barcode terbaca. Data pelanggan dimuat.", "success");
          } else {
            view.toast(`Barcode terbaca: ${code}`, "success");
          }
          return;
        }
        const service = await findServiceByCode(code);
        if (!service) return view.toast(`Kode ${code} tidak ditemukan`, "error");
        fillService(service);
        switchPage("kasir");
        view.toast(`Servis ${service.nomor} dibuka dari scanner`, "success");
      }
    );
  } catch (err) {
    console.error(err);
    view.toast("Kamera tidak dapat dibuka. Pastikan izin kamera diberikan.", "error");
    await stopCodeScanner();
  }
}

async function stopCodeScanner() {
  if (scanner) {
    try { await scanner.stop(); } catch {}
    try { await scanner.clear(); } catch {}
    scanner = null;
  }
  $("#scanner-modal").classList.remove("open");
}

function renderPage(name) {
  document.querySelectorAll(".page").forEach(p => p.classList.toggle("active", p.id === `page-${name}`));
  document.querySelectorAll("[data-page]").forEach(b => b.classList.toggle("active", b.dataset.page === name));
  $("#page-title").textContent = {
    dashboard: "Dashboard", kasir: "Kasir & Servis", services: "Data Servis",
    inventory: "Inventori", restock: "Restock", accounting: "Akuntansi"
  }[name] || "OnePrint";
  if (name === "accounting") renderAccounting();
  if (name === "restock") renderRestock();
}

function switchPage(name) {
  renderPage(name);
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function serviceCard(x) {
  return `<div class="result-card"><strong>${escapeHtml(x.nomor)}</strong><span>${escapeHtml(x.pelanggan)} · ${escapeHtml(x.merk)}</span><span>${escapeHtml(x.status || "-")} · ${money(x.total)}</span><button class="table-action" data-open-service="${escapeHtml(x.key)}">Buka</button></div>`;
}

function showMoreMenu() {
  view.modal("Menu Lainnya", `<div class="more-grid">
    <button data-page="tools"><b>Tools</b><span>Scanner QR, PLN, Internet, website publik</span></button>
    <a href="tracking.html"><b>Tracking Publik</b><span>Lihat halaman tracking pelanggan</span></a>
    <a href="scanner.html"><b>Generator QR</b><span>Tool QR lama tetap tersedia</span></a>
  </div>`);
}


function setMenu(open) {
  const drawer = document.querySelector(".sidebar");
  const toggle = $("#menu-toggle");
  const backdrop = $("#menu-backdrop");
  if (!drawer || !toggle || !backdrop) return;
  drawer.classList.toggle("menu-open", open);
  toggle.setAttribute("aria-expanded", String(open));
  toggle.setAttribute("aria-label", open ? "Tutup menu" : "Buka menu");
  backdrop.hidden = !open;
  document.body.classList.toggle("menu-lock", open);
}

function bind() {
  if (uiBound) return;
  uiBound = true;

  document.addEventListener("click", async e => {
    if (e.target.closest("#menu-toggle")) { setMenu(!document.querySelector(".sidebar")?.classList.contains("menu-open")); return; }
    if (e.target.closest("#menu-backdrop")) { setMenu(false); return; }
    const page = e.target.closest("[data-page]");
    if (page) { view.closeModal(); switchPage(page.dataset.page); setMenu(false); return; }

    if (e.target.closest("#logout")) {
      await stopCodeScanner();
      try { await signOut(); } finally { window.location.href = "login.html"; }
      return;
    }

    if (e.target.closest("#new-service") || e.target.closest("#new-service-3")) {
      resetServiceForm(); switchPage("kasir"); return;
    }

    if (e.target.closest("#more-menu")) { showMoreMenu(); return; }
    if (e.target.closest("#modal-close")) { view.closeModal(); return; }
    if (e.target.closest("#scanner-close")) { await stopCodeScanner(); return; }
    if (e.target.closest("#scan-service") || e.target.closest("#scan-service-form") || e.target.closest("#scan-service-list")) { startCodeScanner("service"); return; }
    if (e.target.closest("#scan-serial")) { startCodeScanner("serial"); return; }
    if (e.target.closest("#new-service-bottom")) { resetServiceForm(); switchPage("kasir"); return; }

    const pick = e.target.closest("[data-pick]");
    if (pick) {
      const [kategori, key] = pick.dataset.pick.split(":");
      const x = state.inventory.find(i => i.kategori === kategori && i.key === key);
      if (x) {
        state.selectedInventory = x;
        $("#input-item-nama").value = x.nama;
        $("#input-item-harga").value = x.harga_jual || 0;
        state.tab = x.kategori === "jasa" ? "jasa" : "sparepart";
        $("#tab-jasa").classList.toggle("active", state.tab === "jasa");
        $("#tab-sparepart").classList.toggle("active", state.tab === "sparepart");
        $("#suggestions").hidden = true;
      }
      return;
    }

    const rem = e.target.closest("[data-remove]");
    if (rem) {
      const [cat, i] = rem.dataset.remove.split(":");
      state.items[cat].splice(Number(i), 1);
      renderCart();
      return;
    }

    const open = e.target.closest("[data-open-service]");
    if (open) { await openService(open.dataset.openService); return; }

    const edit = e.target.closest("[data-edit-inv]");
    if (edit) {
      const [cat, key] = edit.dataset.editInv.split(":");
      const x = state.inventory.find(i => i.kategori === cat && i.key === key);
      if (x) {
        state.editInventoryKey = key; state.editInventoryCategory = cat;
        $("#inv-nama").value = x.nama; $("#inv-kategori").value = cat;
        $("#inv-beli").value = x.harga_beli || 0; $("#inv-jual").value = x.harga_jual || 0;
        $("#inv-stok").value = x.stok || 0; $("#inv-satuan").value = x.satuan || "pcs";
        switchPage("inventory");
      }
      return;
    }

    const delInv = e.target.closest("[data-del-inv]");
    if (delInv) {
      const [cat, key] = delInv.dataset.delInv.split(":");
      if (confirm("Hapus barang ini?")) {
        await removeInventory(cat, key); await loadAll(); view.toast("Barang inventori dihapus", "success");
      }
      return;
    }

    const delLedger = e.target.closest("[data-del-ledger]");
    if (delLedger) {
      if (confirm("Hapus transaksi manual ini?")) {
        await removeLedger(delLedger.dataset.delLedger); await loadAll(); view.toast("Transaksi keuangan dihapus", "success");
      }
      return;
    }

    if (e.target.closest("#dashboard-aktif")) {
      const rows = filterOperationalServices(state.services).filter(x => ["MASUK","DIAGNOSA","DIKERJAKAN"].includes(statusOf(x)));
      view.modal("Servis Aktif", rows.map(serviceCard).join("") || "Tidak ada data");
      return;
    }
    if (e.target.closest("#dashboard-sparepart")) {
      const rows = filterOperationalServices(state.services).filter(x => statusOf(x) === "MENUNGGU SPAREPART");
      view.modal("Menunggu Sparepart", rows.map(serviceCard).join("") || "Tidak ada data");
      return;
    }
    if (e.target.closest("#dashboard-selesai")) {
      const rows = filterOperationalServices(state.services).filter(x => statusOf(x) === "SELESAI");
      view.modal("Selesai / Siap Diambil", rows.map(serviceCard).join("") || "Tidak ada data");
      return;
    }

    if (e.target.closest("#scan-dashboard")) { startCodeScanner("service"); return; }
  });

  $("#input-item-nama").addEventListener("input", renderSuggestions);
  $("#add-item").addEventListener("click", addCartItem);
  $("#tab-jasa").addEventListener("click", () => { state.tab = "jasa"; $("#tab-jasa").classList.add("active"); $("#tab-sparepart").classList.remove("active"); renderSuggestions(); });
  $("#tab-sparepart").addEventListener("click", () => { state.tab = "sparepart"; $("#tab-sparepart").classList.add("active"); $("#tab-jasa").classList.remove("active"); renderSuggestions(); });
  $("#save-service").addEventListener("click", () => saveCurrentService(false));
  $("#save-print-note").addEventListener("click", () => saveCurrentService(true, "tanda-terima"));
  $("#save-print-invoice").addEventListener("click", () => saveCurrentService(true, "nota"));

  $("#reprint-note").addEventListener("click", async () => {
    if (!state.editServiceKey) return view.toast("Buka servis tersimpan terlebih dahulu", "error");
    const data = await getService(state.editServiceKey);
    if (!data) return view.toast("Data servis tidak ditemukan", "error");
    printReceipt(data, "tanda-terima");
  });

  $("#reprint-invoice").addEventListener("click", async () => {
    if (!state.editServiceKey) return view.toast("Buka servis tersimpan terlebih dahulu", "error");
    const data = await getService(state.editServiceKey);
    if (!data) return view.toast("Data servis tidak ditemukan", "error");
    printReceipt(data, "nota");
  });

  $("#delete-service").addEventListener("click", removeCurrentService);
  $("#service-search").addEventListener("input", renderServiceTable);
  $("#service-status-filter").addEventListener("change", renderServiceTable);
  $("#inventory-search").addEventListener("input", renderInventory);
  $("#accounting-month").addEventListener("change", renderAccounting);

  $("#find-service-code").addEventListener("click", async () => {
    const code = $("#service-code-input").value.trim();
    const d = await findServiceByCode(code);
    if (!d) return view.toast("Nomor servis tidak ditemukan", "error");
    fillService(d); switchPage("kasir"); view.toast(`Servis ${d.nomor} dibuka`, "success");
  });
  $("#service-code-input").addEventListener("keydown", e => { if (e.key === "Enter") $("#find-service-code").click(); });

  $("#lookup-serial").addEventListener("click", async () => {
    const d = await findCustomer($("#barcode-input").value);
    if (!d) return view.toast("Pelanggan/serial belum ditemukan", "info");
    $("#input-nama").value = d.nama || ""; $("#input-telp").value = d.telp || "";
    $("#input-merk").value = d.merk || ""; $("#input-kelengkapan").value = d.kelengkapan || "";
    view.toast("Data pelanggan dimuat", "success");
  });

  $("#save-inventory").addEventListener("click", async () => {
    const item = {
      nama: $("#inv-nama").value, kategori: $("#inv-kategori").value,
      harga_beli: $("#inv-beli").value, harga_jual: $("#inv-jual").value,
      stok: $("#inv-stok").value, satuan: $("#inv-satuan").value
    };
    if (!item.nama.trim()) return view.toast("Nama barang wajib diisi", "error");
    await saveInventory(item, state.editInventoryKey, state.editInventoryCategory);
    state.editInventoryKey = null; state.editInventoryCategory = null;
    ["inv-nama","inv-beli","inv-jual","inv-stok"].forEach(id => $(`#${id}`).value = "");
    await loadAll(); view.toast("Inventori berhasil disimpan", "success");
  });

  $("#clear-inventory").addEventListener("click", () => {
    state.editInventoryKey = null; state.editInventoryCategory = null;
    ["inv-nama","inv-beli","inv-jual","inv-stok"].forEach(id => $(`#${id}`).value = "");
  });

  $("#restock-item").addEventListener("change", () => {
    const [kategori, key] = $("#restock-item").value.split("|");
    const inv = state.inventory.find(x => x.kategori === kategori && x.key === key);
    if (inv) $("#restock-price").value = Number(inv.harga_beli || 0);
  });

  $("#save-restock").addEventListener("click", async () => {
    const inv = state.inventory.find(x => x.kategori === $("#restock-item").value.split("|")[0] && x.key === $("#restock-item").value.split("|")[1]);
    if (!inv) return view.toast("Pilih barang restock", "error");
    const result = await createRestock({
      item: inv, kategori: inv.kategori, qty: $("#restock-qty").value,
      hargaBeli: $("#restock-price").value, supplier: $("#restock-supplier").value.trim(),
      tanggal: $("#restock-date").value, catatan: $("#restock-note").value.trim()
    });
    $("#restock-qty").value = ""; $("#restock-price").value = ""; $("#restock-supplier").value = ""; $("#restock-note").value = "";
    await loadAll();
    view.toast(`Restock ${result.nama} berhasil. Stok sekarang ${result.stokBaru}.`, "success");
  });

  $("#save-manual-ledger").addEventListener("click", async () => {
    const amount = Number($("#ledger-amount").value) || 0;
    if (amount <= 0 || !$("#ledger-note").value.trim()) return view.toast("Keterangan dan jumlah wajib diisi", "error");
    await saveLedger({
      tanggal: $("#ledger-date").value, tipe: $("#ledger-type").value,
      kategori: $("#ledger-category").value, sumber: "MANUAL",
      keterangan: $("#ledger-note").value.trim(), jumlah: amount
    });
    $("#ledger-amount").value = ""; $("#ledger-note").value = "";
    await loadAll(); view.toast("Transaksi keuangan dicatat", "success");
  });
  document.addEventListener("keydown", e => { if (e.key === "Escape") setMenu(false); });
}

watchAuth({
  onUser: async user => {
    state.user = user;
    $("#user-name").textContent = (user.email || "user").split("@")[0].toUpperCase();
    $("#login-screen").hidden = true;
    $("#app-shell").hidden = false;
    if (idleCleanup) idleCleanup();
    idleCleanup = startIdleTimeout(30, async () => {
      view.toast("Sesi berakhir karena tidak aktif", "info");
      await signOut();
      window.location.href = "login.html";
    });
    bind();
    resetServiceForm();
    $("#accounting-month").value ||= new Date().toISOString().slice(0, 7);
    $("#restock-date").value ||= new Date().toISOString().slice(0, 10);
    $("#ledger-date").value ||= new Date().toISOString().slice(0, 10);
    await loadAll();
  },
  onSignedOut: () => {
    $("#login-screen").hidden = false;
    $("#app-shell").hidden = true;
    if (location.pathname.endsWith("/app.html") || location.pathname.endsWith("app.html")) {
      window.location.href = "login.html";
    }
  }
});
