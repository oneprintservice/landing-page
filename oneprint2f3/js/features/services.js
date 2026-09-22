import { db } from "../core/firebase.js";

export async function listServices() {
  const snap = await db.ref("servis").once("value");
  const rows = [];
  snap.forEach(child => rows.push({ key: child.key, ...child.val() }));
  return rows.sort((a, b) => new Date(b.tanggal || 0) - new Date(a.tanggal || 0));
}

export async function getService(key) {
  const snap = await db.ref(`servis/${key}`).once("value");
  return snap.exists() ? { key, ...snap.val() } : null;
}

export async function saveService(key, data) {
  if (key) await db.ref(`servis/${key}`).update(data);
  else await db.ref(`servis/${data.nomor}`).set(data);
  return key || data.nomor;
}

export async function removeService(key) {
  await db.ref(`servis/${key}`).remove();
}

export function makeServiceNumber(date = new Date()) {
  return `${String(date.getFullYear()).slice(-2)}${String(date.getMonth()+1).padStart(2,"0")}${String(date.getDate()).padStart(2,"0")}${String(date.getHours()).padStart(2,"0")}${String(date.getMinutes()).padStart(2,"0")}${String(date.getSeconds()).padStart(2,"0")}`;
}

export function stats(services) {
  return services.reduce((s, x) => {
    const status = String(x.status || "").toUpperCase();
    s.total++;
    if (["MASUK","DIAGNOSA","DIKERJAKAN"].includes(status)) s.aktif++;
    if (status === "MASUK") s.baru++;
    if (status === "MENUNGGU SPAREPART") s.sparepart++;
    if (status === "SELESAI") s.selesai++;
    return s;
  }, { total: 0, aktif: 0, baru: 0, sparepart: 0, selesai: 0 });
}
