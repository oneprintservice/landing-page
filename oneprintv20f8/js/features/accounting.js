import { db, safeKey } from "../core/firebase.js";

const asNumber = value => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

const normalizeDate = value => {
  if (!value) return "";
  const raw = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw;

  const dmy = raw.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
  if (dmy) {
    const [, dd, mm, yyyy, hh = "12", mi = "00", ss = "00"] = dmy;
    const d = new Date(Number(yyyy), Number(mm) - 1, Number(dd), Number(hh), Number(mi), Number(ss));
    return Number.isNaN(d.getTime()) ? "" : d.toISOString();
  }

  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "" : d.toISOString();
};

export function normalizeLedgerRow(row = {}, key = "") {
  const tanggal = normalizeDate(row.tanggal ?? row.date ?? row.createdAt);
  return {
    key,
    tanggal,
    tipe: String(row.tipe ?? row.type ?? "PEMASUKAN").toUpperCase() === "PENGELUARAN"
      ? "PENGELUARAN"
      : "PEMASUKAN",
    kategori: String(row.kategori ?? row.category ?? "LAINNYA"),
    sumber: String(row.sumber ?? row.source ?? "MANUAL").toUpperCase(),
    referensi: String(row.referensi ?? row.reference ?? ""),
    keterangan: String(row.keterangan ?? row.keteranganTransaksi ?? row.note ?? row.description ?? ""),
    jumlah: Math.max(0, asNumber(row.jumlah ?? row.amount ?? row.total))
  };
}

export async function listLedger(limit = 500) {
  const snap = await db.ref("keuangan").once("value");
  if (!snap.exists()) return [];

  const rows = [];
  snap.forEach(child => {
    rows.push(normalizeLedgerRow(child.val(), child.key));
  });

  return rows
    .filter(row => row.jumlah >= 0)
    .sort((a, b) => new Date(b.tanggal || 0) - new Date(a.tanggal || 0))
    .slice(0, limit);
}

export async function saveLedger(data, key = null) {
  const id = key || `${Date.now()}_${safeKey(data.keterangan || "transaksi")}`;
  const dateValue = String(data.tanggal || "").trim();

  // Simpan tanggal dengan jam tengah hari agar pergantian zona waktu
  // tidak memindahkan transaksi ke hari/bulan yang berbeda.
  const tanggal = /^\d{4}-\d{2}-\d{2}$/.test(dateValue)
    ? `${dateValue}T12:00:00`
    : new Date(dateValue || Date.now()).toISOString();

  const payload = {
    tanggal: new Date(tanggal).toISOString(),
    tipe: String(data.tipe || "PEMASUKAN").toUpperCase() === "PENGELUARAN"
      ? "PENGELUARAN"
      : "PEMASUKAN",
    kategori: data.kategori || "LAINNYA",
    sumber: String(data.sumber || "MANUAL").toUpperCase(),
    referensi: data.referensi || "",
    keterangan: String(data.keterangan || "").trim(),
    jumlah: Math.max(0, asNumber(data.jumlah))
  };

  if (!payload.keterangan) throw new Error("Keterangan transaksi wajib diisi.");
  if (payload.jumlah <= 0) throw new Error("Jumlah transaksi harus lebih dari 0.");

  await db.ref(`keuangan/${id}`).set(payload);
  return { key: id, ...payload };
}

export async function removeLedger(key) {
  if (!key) throw new Error("ID transaksi tidak ditemukan.");
  await db.ref(`keuangan/${key}`).remove();
}
