import { db } from "../core/firebase.js";

const SERVICE_ROOTS = ["servis", "services", "service"];

function looksLikeService(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  return Boolean(
    value.nomor || value.pelanggan || value.status ||
    value.merk || value.keluhan || value.telp || value.serial
  );
}

function collectServices(node, path = "", out = []) {
  if (!node || typeof node !== "object") return out;
  if (looksLikeService(node)) {
    out.push({ key: path, ...node });
    return out;
  }
  Object.entries(node).forEach(([key, value]) => {
    collectServices(value, path ? `${path}/${key}` : key, out);
  });
  return out;
}

async function readServiceRoot(root) {
  const snap = await db.ref(root).once("value");
  if (!snap.exists()) return [];
  return collectServices(snap.val(), root);
}

export async function listServices() {
  const canonical = await readServiceRoot("servis");
  if (canonical.length) return dedupe(canonical);

  const fallback = [];
  for (const root of SERVICE_ROOTS.slice(1)) {
    fallback.push(...await readServiceRoot(root));
  }
  return dedupe(fallback);
}

function dedupe(rows) {
  const map = new Map();
  rows.forEach(row => {
    const identity = row.key || row.nomor || `${row.pelanggan || ""}-${row.tanggal || ""}`;
    if (!map.has(identity)) map.set(identity, row);
  });
  return [...map.values()].sort((a, b) => parseDate(b.tanggal) - parseDate(a.tanggal));
}

function parseDate(value) {
  if (!value) return 0;
  const direct = new Date(value).getTime();
  if (!Number.isNaN(direct)) return direct;
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export async function getService(key) {
  if (!key) return null;

  const target = key.startsWith("servis/") ? key : `servis/${key}`;
  const direct = await db.ref(target).once("value");
  if (direct.exists() && looksLikeService(direct.val())) {
    return { key: target, ...direct.val() };
  }

  const rows = await listServices();
  return rows.find(row => row.key === key || row.key === target || row.nomor === key) || null;
}

export async function saveService(key, data) {
  const target = key
    ? (key.startsWith("servis/") ? key : `servis/${key}`)
    : `servis/${data.nomor}`;
  await db.ref(target).set(data);
  return target;
}

export async function removeService(key) {
  const target = key.startsWith("servis/") ? key : `servis/${key}`;
  await db.ref(target).remove();
}

export function makeServiceNumber(date = new Date()) {
  return `${String(date.getFullYear()).slice(-2)}${String(date.getMonth()+1).padStart(2,"0")}${String(date.getDate()).padStart(2,"0")}${String(date.getHours()).padStart(2,"0")}${String(date.getMinutes()).padStart(2,"0")}${String(date.getSeconds()).padStart(2,"0")}`;
}

export function stats(services) {
  return services.reduce((s, x) => {
    const status = String(x.status || "").trim().toUpperCase();
    s.total++;
    if (["MASUK","DIAGNOSA","DIKERJAKAN"].includes(status)) s.aktif++;
    if (status === "MASUK") s.baru++;
    if (status === "MENUNGGU SPAREPART") s.sparepart++;
    if (status === "SELESAI") s.selesai++;
    return s;
  }, { total: 0, aktif: 0, baru: 0, sparepart: 0, selesai: 0 });
}
