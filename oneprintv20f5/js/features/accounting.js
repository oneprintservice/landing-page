import { db, safeKey } from "../core/firebase.js";

export async function listLedger(limit = 300) {
  const snap = await db.ref("keuangan").once("value");
  if (!snap.exists()) return [];
  const rows = [];
  snap.forEach(child => rows.push({ key: child.key, ...child.val() }));
  return rows
    .sort((a, b) => new Date(b.tanggal || 0) - new Date(a.tanggal || 0))
    .slice(0, limit);
}

function normalizeDate(value) {
  if (!value) return new Date().toISOString();
  // Keep a manual accounting date stable in the user's selected calendar day.
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value))
    ? `${value}T12:00:00.000Z`
    : new Date(value).toISOString();
}

export async function saveLedger(data, key = null) {
  const keterangan = String(data.keterangan || "").trim();
  const jumlah = Math.max(0, Number(data.jumlah) || 0);
  if (!keterangan) throw new Error("Keterangan transaksi wajib diisi.");
  if (jumlah <= 0) throw new Error("Jumlah transaksi harus lebih dari 0.");

  const id = key || `${Date.now()}_${safeKey(keterangan).slice(0, 60)}`;
  const payload = {
    tanggal: normalizeDate(data.tanggal),
    tipe: data.tipe === "PENGELUARAN" ? "PENGELUARAN" : "PEMASUKAN",
    kategori: String(data.kategori || "LAINNYA").trim() || "LAINNYA",
    sumber: data.sumber || "MANUAL",
    referensi: data.referensi || "",
    keterangan,
    jumlah
  };

  await db.ref(`keuangan/${id}`).set(payload);
  return { key: id, ...payload };
}

export async function removeLedger(key) {
  if (!key) throw new Error("Transaksi tidak memiliki ID.");
  await db.ref(`keuangan/${key}`).remove();
}
