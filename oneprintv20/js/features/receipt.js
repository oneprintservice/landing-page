const esc = value => String(value ?? "-")
  .replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;")
  .replaceAll('"',"&quot;").replaceAll("'","&#39;");

const moneyRaw = n => Number(n || 0).toLocaleString("id-ID");
const logoPath = new URL("../assets/logos.png", import.meta.url).href;

const print_css = '\n*{box-sizing:border-box}\n@page{size:A5 portrait;margin:8mm}\nhtml,body{margin:0;padding:0;background:#fff;color:#111;font-family:Arial,Helvetica,sans-serif}\nbody{font-size:10px;line-height:1.35}\n.invoice-page{width:148mm;min-height:210mm;margin:0 auto;padding:6mm}\n.header{display:flex;justify-content:space-between;align-items:flex-start;gap:8mm;border-bottom:2px solid #111;padding-bottom:4mm;margin-bottom:4mm}\n.header-left{display:flex;align-items:flex-start;gap:3mm}\n.logo-image{width:22mm;height:22mm;object-fit:contain;border:1px solid #ddd}\n.company-info{padding-top:1mm}\n.company-name{font-size:18px;font-weight:800;text-transform:uppercase}\n.tagline{margin:1mm 0;font-size:9px}\n.italic{font-style:italic}\n.address-info{margin:1px 0;font-size:8.5px}\n.font-bold{font-weight:700}\n.header-right{text-align:right}\n.invoice-title{font-size:15px;font-weight:800;letter-spacing:.6px}\n.invoice-number{display:inline-block;margin-top:2mm;font-size:10px;font-weight:700}\n.client-data{display:grid;grid-template-columns:25mm 1fr;gap:1.4mm 2mm;margin-bottom:4mm}\n.client-data label{font-weight:700}\n.display-data{min-width:0}\n.service-table{width:100%;border-collapse:collapse;margin-top:3mm;font-size:9px}\n.service-table th,.service-table td{border:1px solid #111;padding:2.2mm 2mm;vertical-align:top}\n.service-table th{font-weight:800;background:#f3f3f3}\n.service-table .category-header td{font-weight:800;background:#f7f7f7}\n.service-table tfoot td{font-weight:800}\n.uppercase{text-transform:uppercase}\n.note-box{border:1px solid #111;padding:3mm;margin-top:4mm;font-size:8.5px}\n.note-title{font-weight:800}\n.note-box ol{margin:1.5mm 0 0;padding-left:5mm}\n.note-box li{margin:1mm 0}\n.footer-area{margin-top:4mm}\n.signature-wrapper{display:flex;justify-content:space-between;gap:12mm;margin-top:10mm}\n.signature-box{width:42%;text-align:center;min-height:22mm;display:flex;flex-direction:column;justify-content:space-between}\n.signature-line{display:block;margin-top:15mm;border-top:1px solid #111;padding-top:1.5mm;font-weight:700}\n#qr-print{width:110px;height:110px;display:flex;align-items:center;justify-content:center}\n#qr-print img,#qr-print canvas{max-width:110px;max-height:110px}\nhr{border:0;border-top:1px solid #bbb}\n@media screen{\n  body{background:#fff}\n  .invoice-page{margin:0 auto}\n}\n';

export function buildReceipt(data, tipe = "nota") {
  const noNota = data.nomor || "-";
  const nama = data.pelanggan || "-";
  const telp = data.telp || "-";
  const merk = data.merk || "-";
  const kelengkapan = data.kelengkapan || "-";
  const keluhan = data.keluhan || "-";
  const sn = data.serial || "-";
  const total = Number(data.total || 0);
  const teknisi = data.teknisi || "-";
  const jasa = Array.isArray(data.jasa) ? data.jasa : [];
  const sparepart = Array.isArray(data.sparepart) ? data.sparepart : [];
  const tgl = new Date(data.tanggal || Date.now()).toLocaleDateString("id-ID");
  const trackingUrl = `https://oneprintservice.web.id/tracking.html?tt=${encodeURIComponent(noNota)}`;

  const kopHeader = `
    <div class="header">
      <div class="header-left">
        <img src="${logoPath}" class="logo-image">
        <div class="company-info">
          <div class="company-name">OnePrint Service</div>
          <p class="tagline italic">Melayani Perbaikan Printer, Laptop, dan Komputer</p>
          <p class="address-info">Jl. Jula-Juli No.71 Tambakbayan, Ponorogo</p>
          <p class="address-info font-bold">HP / WA: 082-337-557-178</p>
        </div>
      </div>
      <div class="header-right">
        <div class="invoice-title">${tipe === "nota" ? "INVOICE" : "TANDA TERIMA"}</div>
        <span class="invoice-number"># ${tipe === "nota" ? "INV" : "TT"}-${esc(noNota)}</span>
      </div>
    </div>`;

  const clientGrid = `
    <div class="client-data">
      <label>Pelanggan</label><span class="display-data">: ${esc(nama)}</span>
      <label>Tanggal</label><span class="display-data">: ${esc(tgl)}</span>
      <label>Telepon</label><span class="display-data">: ${esc(telp)}</span>
      <label>Merk/Tipe</label><span class="display-data">: ${esc(merk)}</span>
      <label>Serial No.</label><span class="display-data">: ${esc(sn)}</span>
      <label>Kelengkapan</label><span class="display-data">: ${esc(kelengkapan)}</span>
    </div>`;

  let mainContent = "";
  let noteContent = "";

  if (tipe === "nota") {
    let rows = "";
    [["jasa","A. JASA SERVIS"],["sparepart","B. SPAREPART / TINTA"]].forEach(([cat,title]) => {
      const items = cat === "jasa" ? jasa : sparepart;
      rows += `<tr class="category-header"><td style="text-align:center">-</td><td colspan="2">${title}</td></tr>`;
      if (!items.length) rows += `<tr><td style="text-align:center">-</td><td>-</td><td style="text-align:right">-</td></tr>`;
      items.forEach((item,i) => {
        rows += `<tr><td style="text-align:center">${i+1}</td><td class="uppercase">${esc(item.nama)}</td><td style="text-align:right">Rp ${moneyRaw(item.harga)}</td></tr>`;
      });
    });
    mainContent = `<table class="service-table"><thead><tr><th width="5%">No</th><th width="70%">Rincian</th><th width="25%">Subtotal</th></tr></thead><tbody>${rows}</tbody><tfoot><tr class="font-bold"><td colspan="2" style="text-align:right">TOTAL :</td><td style="text-align:right; background:#eee;">Rp ${moneyRaw(total)}</td></tr></tfoot></table>`;
    noteContent = `<div class="note-box"><span class="note-title">PERHATIAN:</span><ol><li>1. Simpan nota / invoice sebagai bukti garansi.</li><li>2. Garansi tidak berlaku jika segel rusak atau cacat fisik karena pemakaian.</li></ol></div>`;
  } else {
    mainContent = `<div style="border:1px solid #000; padding:10px; min-height:160px; font-size:10px;"><div style="font-weight:bold; border-bottom:1px solid #ccc; margin-bottom:8px;">KELUHAN PERANGKAT:</div><div class="uppercase">${esc(keluhan).replaceAll("\\n","<br>")}</div>
<hr style="margin:10px 0">
<div style="display:flex;justify-content:space-between;align-items:center;gap:15px;">
<div style="font-size:9px;line-height:1.5;flex:1;">
<b>TRACKING SERVIS ONLINE</b><br>
oneprintservice.web.id/tracking<br>
Masukkan nomor tanda terima:<br>
<b>TT-${esc(noNota)}</b><br>
atau scan QR di samping.
</div>
<div id="qr-print"></div>
</div></div>`;
    noteContent = `<div class="note-box"><span class="note-title">SYARAT PENGAMBILAN:</span><ol><li>WAJIB bawa tanda terima ini saat pengambilan.</li><li>Barang tidak diambil &gt;2 bulan setelah konfirmasi bukan tanggung jawab kami.</li></ol></div>`;
  }

  return `<!doctype html><html lang="id"><head><meta charset="utf-8"><title>${tipe==="nota"?"Invoice":"Tanda Terima"} ${esc(noNota)}</title>
<style>
${print_css}
</style></head><body>
<div id="print-container">
<div class="invoice-page">
${kopHeader}
${clientGrid}
${mainContent}
<div class="footer-area">
${noteContent}
<div class="signature-wrapper">
<div class="signature-box"><span>Hormat Kami,</span><span class="signature-line">${esc(teknisi)}</span></div>
<div class="signature-box"><span>Pelanggan,</span><span class="signature-line">(${esc(nama)})</span></div>
</div>
</div>
</div>
</div>
<script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"></script>
<script>
window.onload=()=>{
  try {
    const q=document.getElementById("qr-print");
    if(q && window.QRCode) new QRCode(q,{text:${JSON.stringify(trackingUrl)},width:110,height:110});
  } catch(e) {}
  
};
</script></body></html>`;
}

export function printReceipt(data, tipe="nota") {
  const existing = document.getElementById("oneprint-print-frame");
  if (existing) existing.remove();

  const frame = document.createElement("iframe");
  frame.id = "oneprint-print-frame";
  frame.title = "OnePrint Print";
  frame.setAttribute("aria-hidden", "true");
  frame.style.position = "fixed";
  frame.style.width = "1px";
  frame.style.height = "1px";
  frame.style.right = "0";
  frame.style.bottom = "0";
  frame.style.border = "0";
  frame.style.opacity = "0";
  frame.style.pointerEvents = "none";
  frame.style.zIndex = "-1";

  const cleanup = () => {
    setTimeout(() => frame.remove(), 2000);
  };

  frame.onload = () => {
    setTimeout(() => {
      try {
        frame.contentWindow.focus();
        frame.contentWindow.print();
      } finally {
        cleanup();
      }
    }, 350);
  };

  document.body.appendChild(frame);

  try {
    const doc = frame.contentDocument || frame.contentWindow.document;
    doc.open();
    doc.write(buildReceipt(data, tipe));
    doc.close();
  } catch (error) {
    frame.remove();
    console.error("OnePrint print error:", error);
    alert("Dokumen cetak gagal dibuat. Silakan coba lagi.");
  }
}
