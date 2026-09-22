import { makeServiceNumber } from "./services.js";

const esc = value => String(value ?? "-")
  .replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;")
  .replaceAll('"',"&quot;").replaceAll("'","&#39;");

const moneyRaw = n => Number(n || 0).toLocaleString("id-ID");
const logoPath = new URL("../assets/logos.png", import.meta.url).href;

export function buildReceipt(data, type = "nota") {
  const number = data.nomor || makeServiceNumber();
  const total = Number(data.total || 0);
  const jasa = Array.isArray(data.jasa) ? data.jasa : [];
  const sparepart = Array.isArray(data.sparepart) ? data.sparepart : [];
  const rows = ["jasa","sparepart"].map(cat => {
    const items = cat === "jasa" ? jasa : sparepart;
    const title = cat === "jasa" ? "A. JASA SERVIS" : "B. SPAREPART / TINTA";
    return `<tr class="category-header"><td style="text-align:center">-</td><td colspan="2">${title}</td></tr>` +
      (items.length ? items.map((x,i) =>
        `<tr><td style="text-align:center">${i+1}</td><td class="uppercase">${esc(x.nama)}</td><td style="text-align:right">Rp ${moneyRaw(x.harga)}</td></tr>`
      ).join("") : `<tr><td style="text-align:center">-</td><td>-</td><td style="text-align:right">-</td></tr>`);
  }).join("");

  const trackingUrl = `https://oneprintservice.web.id/tracking.html?tt=${encodeURIComponent(number)}`;
  const mainContent = type === "nota"
    ? `<table class="service-table"><thead><tr><th width="5%">No</th><th width="70%">Rincian</th><th width="25%">Subtotal</th></tr></thead><tbody>${rows}</tbody><tfoot><tr class="font-bold"><td colspan="2" style="text-align:right">TOTAL :</td><td style="text-align:right;background:#eee">Rp ${moneyRaw(total)}</td></tr></tfoot></table>`
    : `<div class="receipt-box"><div class="box-title">KELUHAN PERANGKAT:</div><div class="uppercase">${esc(data.keluhan).replaceAll("\n","<br>")}</div><hr><div class="tracking-row"><div><b>TRACKING SERVIS ONLINE</b><br>oneprintservice.web.id/tracking<br>Masukkan nomor tanda terima:<br><b>TT-${esc(number)}</b><br><span>atau scan QR di samping.</span></div><div id="qr-print"></div></div></div>`;

  const noteContent = type === "nota"
    ? `<div class="note-box"><span class="note-title">PERHATIAN:</span><ol><li>Simpan nota / invoice sebagai bukti garansi.</li><li>Garansi tidak berlaku jika segel rusak atau cacat fisik karena pemakaian.</li></ol></div>`
    : `<div class="note-box"><span class="note-title">SYARAT PENGAMBILAN:</span><ol><li>WAJIB bawa tanda terima ini saat pengambilan.</li><li>Barang tidak diambil &gt;2 bulan setelah konfirmasi bukan tanggung jawab kami.</li></ol></div>`;

  return `<!doctype html><html><head><meta charset="utf-8"><title>${type==="nota"?"Invoice":"Tanda Terima"} ${esc(number)}</title>
<style>
*{box-sizing:border-box}body{font-family:Arial,sans-serif;color:#111;margin:0;background:#fff}
.invoice-page{width:148mm;min-height:210mm;margin:auto;padding:7mm;display:flex;flex-direction:column}
.header{display:flex;justify-content:space-between;gap:10px;border-bottom:2px solid #111;padding-bottom:7px;margin-bottom:10px}
.header-left{display:flex;align-items:flex-start}.logo-image{width:55px;height:55px;object-fit:contain;margin-right:12px}
.company-name{font-size:17px;font-weight:800}.tagline{font-size:9px;margin:2px 0}.address-info{font-size:8px;margin:1px 0}
.header-right{text-align:right;min-width:37mm}.invoice-title{font-size:14px;font-weight:800;border:1px solid #111;padding:5px}.invoice-number{font-size:9px;display:block;margin-top:3px}
.client-data{display:grid;grid-template-columns:28mm 1fr;gap:3px 5px;font-size:9px;margin-bottom:10px}.client-data label{font-weight:700}.display-data{border-bottom:1px dotted #aaa;min-height:12px}
.service-table{width:100%;border-collapse:collapse;font-size:9px}.service-table th,.service-table td{border:1px solid #111;padding:4px}.service-table th{background:#eee}.category-header{font-weight:800;background:#eee}.uppercase{text-transform:uppercase}
.receipt-box{border:1px solid #111;padding:10px;min-height:160px;font-size:10px}.box-title{font-weight:800;border-bottom:1px solid #ccc;margin-bottom:8px;padding-bottom:4px}
.tracking-row{display:flex;justify-content:space-between;align-items:center;gap:15px;line-height:1.5;font-size:9px}.tracking-row>div:first-child{flex:1}.tracking-row span{color:#555}.tracking-row #qr-print{width:110px;min-width:110px;height:110px}
.note-box{border:1px solid #aaa;padding:7px;margin-top:10px;font-size:8px;line-height:1.35}.note-title{font-weight:800}.note-box ol{margin:3px 0 0;padding-left:17px}
.footer-area{margin-top:auto}.signature-wrapper{display:flex;justify-content:flex-end;gap:28mm;margin-top:16mm;font-size:9px}.signature-box{width:35mm;text-align:center}.signature-line{display:block;border-bottom:1px solid #111;margin-top:18mm;padding-bottom:3px}
@media print{body{background:#fff}.invoice-page{margin:0}@page{size:A5 portrait;margin:5mm}}
</style></head><body><main class="invoice-page">
<header class="header"><div class="header-left"><img src="${logoPath}" class="logo-image"><div><div class="company-name">OnePrint Service</div><p class="tagline">Melayani Perbaikan Printer, Laptop, dan Komputer</p><p class="address-info">Jl. Jula-Juli No.71 Tambakbayan, Ponorogo</p><p class="address-info"><b>HP / WA: 082-337-557-178</b></p></div></div><div class="header-right"><div class="invoice-title">${type==="nota"?"INVOICE":"TANDA TERIMA"}</div><span class="invoice-number"># ${type==="nota"?"INV":"TT"}-${esc(number)}</span></div></header>
<section class="client-data"><label>Pelanggan</label><span class="display-data">: ${esc(data.pelanggan)}</span><label>Tanggal</label><span class="display-data">: ${new Date(data.tanggal||Date.now()).toLocaleDateString("id-ID")}</span><label>Telepon</label><span class="display-data">: ${esc(data.telp)}</span><label>Merk/Tipe</label><span class="display-data">: ${esc(data.merk)}</span><label>Serial No.</label><span class="display-data">: ${esc(data.serial)}</span><label>Kelengkapan</label><span class="display-data">: ${esc(data.kelengkapan)}</span></section>
${mainContent}${noteContent}
<footer class="footer-area"><div class="signature-wrapper"><div class="signature-box"><span>Hormat Kami,</span><span class="signature-line">${esc(data.teknisi)}</span></div><div class="signature-box"><span>Pelanggan,</span><span class="signature-line">(${esc(data.pelanggan)})</span></div></div></footer>
</main>
<script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"></script>
<script>
window.onload=()=>{try{const q=document.getElementById('qr-print');if(q&&window.QRCode)new QRCode(q,{text:${JSON.stringify(trackingUrl)},width:110,height:110})}catch(e){}setTimeout(()=>window.print(),350)}
</script></body></html>`;
}

export function printReceipt(data, type="nota") {
  const w = window.open("", "_blank", "width=900,height=800");
  if (!w) return alert("Popup diblokir browser. Izinkan popup untuk mencetak.");
  w.document.write(buildReceipt(data, type));
  w.document.close();
}
