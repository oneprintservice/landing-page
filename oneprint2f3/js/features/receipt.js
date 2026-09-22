import { makeServiceNumber } from "./services.js";

const esc = value => String(value ?? "-")
  .replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;")
  .replaceAll('"',"&quot;");

export function buildReceipt(data, type = "nota") {
  const number = data.nomor || makeServiceNumber();
  const total = Number(data.total || 0);
  const rows = ["jasa","sparepart"].flatMap(cat => {
    const items = data[cat] || [];
    return [
      `<tr class="section-row"><td colspan="3">${cat === "jasa" ? "A. JASA SERVIS" : "B. SPAREPART / TINTA"}</td></tr>`,
      ...(items.length ? items.map((x,i) => `<tr><td>${i+1}</td><td>${esc(x.nama)}</td><td class="right">Rp ${Number(x.harga||0).toLocaleString("id-ID")}</td></tr>`) : [`<tr><td>-</td><td>-</td><td class="right">-</td></tr>`])
    ];
  }).join("");
  const body = type === "nota"
    ? `<table><thead><tr><th>No</th><th>Rincian</th><th>Subtotal</th></tr></thead><tbody>${rows}</tbody><tfoot><tr><td colspan="2" class="right"><b>TOTAL</b></td><td class="right"><b>Rp ${total.toLocaleString("id-ID")}</b></td></tr></tfoot></table>`
    : `<div class="complaint"><b>KELUHAN PERANGKAT</b><hr>${esc(data.keluhan).replaceAll("\n","<br>")}<hr><b>TRACKING</b><br>oneprintservice.web.id/tracking.html?tt=${encodeURIComponent(number)}<br><b>TT-${esc(number)}</b></div>`;
  return `<!doctype html><html><head><meta charset="utf-8"><title>${type === "nota" ? "Invoice" : "Tanda Terima"} ${esc(number)}</title>
  <style>
  *{box-sizing:border-box}body{font-family:Arial,sans-serif;color:#111;margin:0;background:#fff}
  .page{width:130mm;min-height:190mm;margin:auto;padding:7mm;display:flex;flex-direction:column}
  header{display:flex;justify-content:space-between;border-bottom:2px solid #111;padding-bottom:7px;margin-bottom:10px}
  .brand{display:flex;gap:10px}.logo{width:50px;height:50px;object-fit:contain}.company{font-weight:800;font-size:17px}.small{font-size:8px;line-height:1.35}
  .invoice{text-align:right;border:1px dashed #666;padding:5px;font-weight:800;font-size:10px}
  .client{display:grid;grid-template-columns:auto 1fr auto 1fr;gap:4px 7px;font-size:9px;border:1px solid #ddd;padding:7px;margin-bottom:10px}
  .client b{white-space:nowrap}.line{border-bottom:1px dotted #bbb;min-height:13px}
  table{width:100%;border-collapse:collapse;font-size:9px}th,td{border:1px solid #111;padding:4px}th{background:#eee}.right{text-align:right}.section-row{font-weight:800;background:#eee}
  .complaint{border:1px solid #111;padding:10px;font-size:10px;min-height:150px}.footer{margin-top:auto;display:flex;justify-content:space-between;gap:15px;font-size:9px}.sign{text-align:center;width:35mm}.signline{border-bottom:1px solid #111;margin-top:30px;padding-bottom:3px}
  @media print{body{background:#fff}.page{margin:0}@page{size:A5 portrait;margin:5mm}}
  </style></head><body><main class="page">
  <header><div class="brand"><img class="logo" src="../assets/logos.png"><div><div class="company">ONEPRINT SERVICE</div><div class="small">Melayani Perbaikan Printer, Laptop, dan Komputer</div><div class="small">Jl. Jula-Juli No.71 Tambakbayan, Ponorogo · 082-337-557-178</div></div></div><div class="invoice">${type==="nota"?"INVOICE":"TANDA TERIMA"}<br>#${type==="nota"?"INV":"TT"}-${esc(number)}</div></header>
  <section class="client"><b>Pelanggan</b><span class="line">${esc(data.pelanggan)}</span><b>Tanggal</b><span class="line">${new Date(data.tanggal||Date.now()).toLocaleDateString("id-ID")}</span><b>Telepon</b><span class="line">${esc(data.telp)}</span><b>Merk/Tipe</b><span class="line">${esc(data.merk)}</span><b>Serial</b><span class="line">${esc(data.serial)}</span><b>Kelengkapan</b><span class="line">${esc(data.kelengkapan)}</span></section>
  ${body}
  <footer class="footer"><div>Hormat Kami,<div class="signline">${esc(data.teknisi)}</div></div><div class="sign">Pelanggan<div class="signline">${esc(data.pelanggan)}</div></div></footer>
  </main><script>window.onload=()=>setTimeout(()=>window.print(),250)</script></body></html>`;
}

export function printReceipt(data, type="nota") {
  const w = window.open("", "_blank", "width=900,height=800");
  if (!w) return alert("Popup diblokir browser. Izinkan popup untuk mencetak.");
  w.document.write(buildReceipt(data, type));
  w.document.close();
}
