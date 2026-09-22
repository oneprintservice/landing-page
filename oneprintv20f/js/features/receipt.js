const esc = value => String(value ?? "-")
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&#39;");

const moneyRaw = n => Number(n || 0).toLocaleString("id-ID");
const logoPath = new URL("../../assets/logos.png", import.meta.url).href;

/*
 * Template cetak dipertahankan mengikuti POS lama:
 * - TANDA TERIMA
 * - INVOICE / NOTA
 *
 * Perubahan hanya pada mekanisme print: menggunakan hidden iframe agar
 * browser HP tidak membuat about:blank / tab kosong.
 */
const print_css = `
@media print {
  #app-ui, .no-print { display: none !important; }
  body { background-color: white !important; margin: 0 !important; padding: 0 !important; }
  @page { size: A5 portrait; margin: 5mm; }
  #print-container { display: block !important; width: 100%; background: white; }

  .invoice-page {
    width: 130mm; margin: 0 auto; padding-top: 5mm; box-sizing: border-box;
    position: relative; display: flex; flex-direction: column;
    font-family: Arial, sans-serif; color: black; min-height: 190mm;
  }

  .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #000; padding-bottom: 8px; margin-bottom: 12px; }
  .header-left { display: flex; align-items: flex-start; }
  .logo-image { width: 55px; height: 55px; margin-right: 12px; object-fit: contain; }
  .company-name { font-size: 18px; font-weight: bold; margin-bottom: 2px; text-transform: uppercase; }
  .tagline, .address-info { font-size: 8.5px; margin: 0; line-height: 1.2; }

  .header-right { text-align: right; border: 1px dashed #666; padding: 5px 10px; min-width: 40mm; }
  .invoice-title { font-size: 16px; font-weight: 900; color: #333; margin-bottom: 2px; }
  .invoice-number { font-size: 11px; font-weight: bold; font-family: "Courier New", monospace; }

  .client-data {
    display: grid;
    grid-template-columns: auto 1fr auto 1fr;
    gap: 5px 8px;
    font-size: 10px;
    margin-bottom: 15px;
    border: 1px solid #eee;
    padding: 8px;
  }
  .client-data label { font-weight: bold; white-space: nowrap; }
  .display-data { border-bottom: 1px dotted #ccc; min-height: 15px; text-transform: uppercase; padding-left: 2px; }

  .service-table { width: 100%; border-collapse: collapse; font-size: 10px; margin-bottom: 15px; }
  .service-table th, .service-table td { border: 1px solid #000; padding: 5px; }
  .service-table th { background-color: #f0f0f0 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .category-header { background-color: #e5e5e5 !important; font-weight: bold; -webkit-print-color-adjust: exact; print-color-adjust: exact; }

  .footer-area { display: flex; justify-content: space-between; align-items: flex-end; margin-top: auto; padding-bottom: 10px; }
  .note-box { width: 4.5cm; background-color: #f9f9f9 !important; border: 1px solid #ccc; padding: 6px; font-size: 7.5px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .note-title { font-weight: bold; text-decoration: underline; display: block; margin-bottom: 4px; font-size: 8px; }
  .note-box ol { margin: 0; padding-left: 12px; }

  .signature-wrapper { display: flex; gap: 20px; font-size: 10px; }
  .signature-box { text-align: center; width: 3.5cm; }
  .signature-line { display: block; margin-top: 35px; border-bottom: 1px solid #000; font-weight: bold; min-height: 15px; text-transform: uppercase; }

  #qr-print { display: flex; align-items: center; justify-content: center; }
  #qr-print img, #qr-print canvas { width: 110px !important; height: 110px !important; }
}

html, body { margin: 0; padding: 0; background: white; }
`;

export function buildReceipt(data, tipe = "nota") {
  const noNota = data.nomor || "-";
  const nama = data.pelanggan || "-";
  const telp = data.telp || "-";
  const merk = data.merk || "-";
  const kelengkapan = data.kelengkapan || "-";
  const keluhan = data.keluhan || "-";
  const sn = data.serial || data.printerId || "-";
  const total = Number(data.total || 0);
  const teknisi = data.teknisi || "-";
  const jasa = Array.isArray(data.jasa) ? data.jasa : [];
  const sparepart = Array.isArray(data.sparepart) ? data.sparepart : [];
  const tgl = new Date(data.tanggal || Date.now()).toLocaleDateString("id-ID");
  const trackingUrl = `https://oneprintservice.web.id/tracking.html?tt=${encodeURIComponent(noNota)}`;

  const kopHeader = `
    <div class="header">
      <div class="header-left">
        <img src="${logoPath}" class="logo-image" alt="OnePrint">
        <div class="company-info">
          <div class="company-name">OnePrint Service</div>
          <p class="tagline">Melayani Perbaikan Printer, Laptop, dan Komputer</p>
          <p class="address-info">Jl. Jula-Juli No.71 Tambakbayan, Ponorogo</p>
          <p class="address-info">HP / WA: 082-337-557-178</p>
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
    [["jasa", "A. JASA SERVIS"], ["sparepart", "B. SPAREPART / TINTA"]].forEach(([cat, title]) => {
      const items = cat === "jasa" ? jasa : sparepart;
      rows += `<tr class="category-header"><td style="text-align:center">-</td><td colspan="2">${title}</td></tr>`;
      if (!items.length) {
        rows += `<tr><td style="text-align:center">-</td><td>-</td><td style="text-align:right">-</td></tr>`;
      }
      items.forEach((item, i) => {
        rows += `<tr><td style="text-align:center">${i + 1}</td><td class="uppercase">${esc(item.nama)}</td><td style="text-align:right">Rp ${moneyRaw(item.harga)}</td></tr>`;
      });
    });

    mainContent = `
      <table class="service-table">
        <thead><tr><th width="5%">No</th><th width="70%">Rincian</th><th width="25%">Subtotal</th></tr></thead>
        <tbody>${rows}</tbody>
        <tfoot><tr class="font-bold"><td colspan="2" style="text-align:right">TOTAL :</td><td style="text-align:right; background:#eee;">Rp ${moneyRaw(total)}</td></tr></tfoot>
      </table>`;

    noteContent = `
      <div class="note-box">
        <span class="note-title">PERHATIAN:</span>
        <ol>
          <li>1. Simpan nota / invoice sebagai bukti garansi.</li>
          <li>2. Garansi tidak berlaku jika segel rusak atau cacat fisik karena pemakaian.</li>
        </ol>
      </div>`;
  } else {
    mainContent = `
      <div style="border:1px solid #000; padding:10px; min-height:160px; font-size:10px;">
        <div style="font-weight:bold; border-bottom:1px solid #ccc; margin-bottom:8px;">KELUHAN PERANGKAT:</div>
        <div class="uppercase">${esc(keluhan).replaceAll("\\n", "<br>")}</div>
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
        </div>
      </div>`;

    noteContent = `
      <div class="note-box">
        <span class="note-title">SYARAT PENGAMBILAN:</span>
        <ol>
          <li>WAJIB bawa tanda terima ini saat pengambilan.</li>
          <li>Barang tidak diambil &gt;2 bulan setelah konfirmasi bukan tanggung jawab kami.</li>
        </ol>
      </div>`;
  }

  return `<!doctype html>
<html lang="id">
<head>
<meta charset="utf-8">
<title>${tipe === "nota" ? "Invoice" : "Tanda Terima"} ${esc(noNota)}</title>
<style>${print_css}</style>
</head>
<body>
<div id="print-container">
  <div class="invoice-page">
    ${kopHeader}
    ${clientGrid}
    ${mainContent}
    <div class="footer-area">
      ${noteContent}
      <div class="signature-wrapper">
        <div class="signature-box">
          <span>Hormat Kami,</span>
          <span class="signature-line">${esc(teknisi)}</span>
        </div>
        <div class="signature-box">
          <span>Pelanggan,</span>
          <span class="signature-line">(${esc(nama)})</span>
        </div>
      </div>
    </div>
  </div>
</div>
<script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"></script>
<script>
window.addEventListener("load", function () {
  try {
    var q = document.getElementById("qr-print");
    if (q && window.QRCode) {
      new QRCode(q, { text: ${JSON.stringify(trackingUrl)}, width: 110, height: 110 });
    }
  } catch (e) {}
  window.setTimeout(function () {
    window.__oneprintReady = true;
    window.parent && window.parent.postMessage({ type: "oneprint-print-ready" }, "*");
  }, 80);
});
</script>
</body>
</html>`;
}

export function printReceipt(data, tipe = "nota") {
  const existing = document.getElementById("oneprint-print-frame");
  if (existing) existing.remove();

  const frame = document.createElement("iframe");
  frame.id = "oneprint-print-frame";
  frame.title = "OnePrint Print";
  frame.setAttribute("aria-hidden", "true");
  Object.assign(frame.style, {
    position: "fixed",
    width: "1px",
    height: "1px",
    right: "0",
    bottom: "0",
    border: "0",
    opacity: "0",
    pointerEvents: "none",
    zIndex: "-1"
  });

  let printed = false;
  let timeoutId = null;

  const cleanup = () => {
    if (timeoutId) clearTimeout(timeoutId);
    setTimeout(() => frame.remove(), 1500);
  };

  const doPrint = () => {
    if (printed) return;
    printed = true;
    try {
      frame.contentWindow.focus();
      frame.contentWindow.print();
    } catch (error) {
      console.error("OnePrint print error:", error);
      viewPrintFallback(data, tipe);
    } finally {
      cleanup();
    }
  };

  const viewPrintFallback = (payload, kind) => {
    const win = window.open("", "_blank");
    if (!win) {
      alert("Browser memblokir jendela cetak. Izinkan pop-up untuk OnePrint.");
      return;
    }
    win.document.open();
    win.document.write(buildReceipt(payload, kind));
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 350);
  };

  frame.onload = () => {
    timeoutId = setTimeout(doPrint, 800);
  };

  window.addEventListener("message", function readyListener(event) {
    if (event.source === frame.contentWindow && event.data?.type === "oneprint-print-ready") {
      window.removeEventListener("message", readyListener);
      doPrint();
    }
  });

  document.body.appendChild(frame);

  try {
    const doc = frame.contentDocument || frame.contentWindow.document;
    doc.open();
    doc.write(buildReceipt(data, tipe));
    doc.close();
  } catch (error) {
    frame.remove();
    console.error("OnePrint print error:", error);
    viewPrintFallback(data, tipe);
  }
}
