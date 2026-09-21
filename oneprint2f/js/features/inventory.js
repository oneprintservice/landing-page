import { db } from "../core/firebase.js";

const CATEGORIES = ["sparepart", "tinta", "lisensi", "jasa"];

export async function listInventory() {
  const all = [];
  await Promise.all(CATEGORIES.map(async kategori => {
    const snap = await db.ref(`inventori/${kategori}`).once("value");
    snap.forEach(child => all.push({ kategori, key: child.key, ...child.val() }));
  }));
  return all.sort((a, b) => (a.nama || "").localeCompare(b.nama || ""));
}

export async function saveInventory(item, editingKey = null, editingCategory = null) {
  const kategori = item.kategori;
  const key = editingKey || item.nama.trim().toUpperCase().replace(/\s+/g, "_");
  const data = {
    nama: item.nama.trim(),
    harga_beli: Number(item.harga_beli) || 0,
    harga_jual: Number(item.harga_jual) || 0,
    stok: Number(item.stok) || 0,
    satuan: item.satuan || "pcs",
    minimum: kategori === "tinta" ? 100 : 1
  };
  const targetCategory = editingCategory || kategori;
  await db.ref(`inventori/${targetCategory}/${key}`).set(data);
  if (editingCategory && editingCategory !== kategori) {
    await db.ref(`inventori/${editingCategory}/${editingKey}`).remove();
  }
  return { kategori: targetCategory, key, ...data };
}

export async function removeInventory(kategori, key) {
  await db.ref(`inventori/${kategori}/${key}`).remove();
}

export async function changeStock(item, delta) {
  const unit = (item.satuan || "").toLowerCase();
  const amount = unit === "ml" || unit === "gram" ? 100 : 1;
  const next = Math.max(0, Number(item.stok || 0) + delta * amount);
  await db.ref(`inventori/${item.kategori}/${item.key}/stok`).set(next);
  item.stok = next;
  return next;
}
