const esc = value => String(value ?? "-")
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&#39;");

const moneyRaw = n => Number(n || 0).toLocaleString("id-ID");
const logoPath = "assets/logos.png";

function buildReceipt(data, tipe = "nota") {
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
        <img src="${logoPath}" class="logo-image" onerror="this.outerHTML='<div style="width:55px;height:55px;border:1px solid #000;margin-right:12px;display:flex;align-items:center;justify-content:center;font-size:8px;">LOGO</div>'">
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

  return `
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
    </div>`;
}

export function printReceipt(data, tipe = "nota") {
  const root = document.getElementById("print-container");
  if (!root) {
    console.error("OnePrint: #print-container tidak ditemukan");
    alert("Area cetak tidak tersedia. Muat ulang aplikasi.");
    return;
  }

  // Penting: ini top-level print seperti versi awal.
  // Tidak window.open(), tidak iframe print, sehingga Chrome Android
  // tidak mengarah ke about:blank dan tidak mencetak UI aplikasi.
  root.innerHTML = buildReceipt(data, tipe);

  const qrEl = root.querySelector("#qr-print");
  if (qrEl && window.QRCode) {
    try {
      new window.QRCode(qrEl, {
        text: `https://oneprintservice.web.id/tracking.html?tt=${encodeURIComponent(data.nomor || "")}`,
        width: 110,
        height: 110
      });
    } catch (e) {
      console.warn("OnePrint: QR gagal dibuat", e);
    }
  }

  // Beri browser waktu menyelesaikan layout/QR sebelum print preview.
  setTimeout(() => {
    try {
      window.print();
    } finally {
      // Jangan menghapus terlalu cepat sebelum Android selesai membaca print tree.
      setTimeout(() => { root.innerHTML = ""; }, 1200);
    }
  }, 250);
}
