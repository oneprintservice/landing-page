import { db, safeKey } from "../core/firebase.js";

export async function listLedger(limit = 150) {
  const snap = await db.ref("keuangan").once("value");
  if (!snap.exists()) return [];
  const rows = [];
  snap.forEach(child => rows.push({ key: child.key, ...child.val() }));
  return rows.sort((a,b) => new Date(b.tanggal || 0) - new Date(a.tanggal || 0)).slice(0, limit);
}

export async function saveLedger(data, key = null) {
  const id = key || `${Date.now()}_${safeKey(data.keterangan || "transaksi")}`;
  const payload = {
    tanggal: data.tanggal ? new Date(`${data.tanggal}T12:00:00`).toISOString() : new Date().toISOString(),
    tipe: data.tipe === "PENGELUARAN" ? "PENGELUARAN" : "PEMASUKAN",
    kategori: data.kategori || "LAINNYA",
    sumber: data.sumber || "MANUAL",
    referensi: data.referensi || "",
    keterangan: data.keterangan || "",
    jumlah: Math.max(0, Number(data.jumlah) || 0)
  };
  await db.ref(`keuangan/${id}`).set(payload);
  return { key: id, ...payload };
}

export async function removeLedger(key) {
  await db.ref(`keuangan/${key}`).remove();
}
