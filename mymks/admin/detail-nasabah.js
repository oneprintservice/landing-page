// ============================================================
// DETAIL NASABAH
// KSP MANAGER
// ============================================================

const loading = document.getElementById("loading");
const content = document.getElementById("content");
const errorBox = document.getElementById("error");
const riwayatAktivitas = document.getElementById("riwayatAktivitas");


// ============================================================
// HELPER
// ============================================================

function rupiah(value) {
    const n = Number(value);

    if (!Number.isFinite(n)) {
        return "Rp 0";
    }

    return "Rp " + n.toLocaleString("id-ID");
}


function tanggal(value) {

    if (!value) {
        return "-";
    }

    const d = new Date(value);

    if (Number.isNaN(d.getTime())) {
        return value;
    }

    return d.toLocaleDateString("id-ID");
}


function escapeHtml(value) {

    return String(value ?? "-")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}


function statusBadge(status) {

    const s = String(status || "-").toLowerCase().trim();

    let cls = "status-neutral";

    if (
        [
            "aktif",
            "disetujui",
            "disetujui",
            "lunas",
            "selesai",
            "dibayar"
        ].includes(s)
    ) {
        cls = "status-green";
    }

    else if (
        [
            "menunggu",
            "diproses",
            "pending",
            "belum_bayar",
            "belum bayar",
            "menunggu persetujuan"
        ].includes(s)
    ) {
        cls = "status-yellow";
    }

    else if (
        [
            "ditolak",
            "gagal",
            "macet",
            "red_flag",
            "red flag"
        ].includes(s)
    ) {
        cls = "status-red";
    }

    return `
        <span class="${cls}">
            ${escapeHtml(status || "-")}
        </span>
    `;
}


// ============================================================
// STYLE TAMBAHAN UNTUK RIWAYAT
// ============================================================

function injectStyles() {

    if (document.getElementById("detailNasabahExtraStyle")) {
        return;
    }

    const style = document.createElement("style");

    style.id = "detailNasabahExtraStyle";

    style.textContent = `

        .detail-history {
            margin-top: 25px;
        }

        .detail-history-section {
            margin-top: 20px;
        }

        .detail-history-section h3 {
            margin: 0 0 12px;
            color: #172554;
            font-size: 18px;
        }

        .detail-table-wrap {
            width: 100%;
            overflow-x: auto;
            border-radius: 10px;
        }

        .detail-table {
            width: 100%;
            min-width: 650px;
            border-collapse: collapse;
            background: #ffffff;
        }

        .detail-table th,
        .detail-table td {
            padding: 11px 12px;
            border-bottom: 1px solid #e5e7eb;
            text-align: left;
            white-space: nowrap;
        }

        .detail-table th {
            background: #f8fafc;
            color: #334155;
            font-size: 13px;
        }

        .detail-table td {
            color: #172554;
            font-size: 14px;
        }

        .detail-table tr:last-child td {
            border-bottom: none;
        }

        .detail-empty {
            padding: 18px;
            background: #f8fafc;
            border-radius: 10px;
            color: #64748b;
        }

        .detail-error {
            padding: 15px;
            background: #fef2f2;
            color: #991b1b;
            border-radius: 10px;
        }

        .status-green,
        .status-yellow,
        .status-red,
        .status-neutral {
            display: inline-block;
            padding: 5px 9px;
            border-radius: 999px;
            font-size: 12px;
            font-weight: 700;
        }

        .status-green {
            background: #dcfce7;
            color: #166534;
        }

        .status-yellow {
            background: #fef3c7;
            color: #92400e;
        }

        .status-red {
            background: #fee2e2;
            color: #991b1b;
        }

        .status-neutral {
            background: #e2e8f0;
            color: #475569;
        }

        .history-summary {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 12px;
            margin-bottom: 20px;
        }

        .history-summary-card {
            background: #f8fafc;
            border-radius: 10px;
            padding: 15px;
        }

        .history-summary-label {
            display: block;
            font-size: 12px;
            color: #64748b;
            margin-bottom: 5px;
        }

        .history-summary-value {
            font-size: 20px;
            font-weight: bold;
            color: #172554;
        }

        @media (max-width: 600px) {

            .history-summary {
                grid-template-columns: 1fr;
            }

        }
    `;

    document.head.appendChild(style);
}


// ============================================================
// RENDER RIWAYAT PENGAJUAN
// ============================================================

function renderPengajuan(rows) {

    if (!rows.length) {

        return `
            <div class="detail-history-section">

                <h3>Riwayat Pengajuan Kredit</h3>

                <div class="detail-empty">
                    Belum ada riwayat pengajuan kredit.
                </div>

            </div>
        `;
    }

    rows.sort((a, b) => {

        const dateA =
            new Date(
                a.created_at ||
                a.tanggal_pengajuan ||
                0
            ).getTime();

        const dateB =
            new Date(
                b.created_at ||
                b.tanggal_pengajuan ||
                0
            ).getTime();

        return dateB - dateA;
    });


    return `
        <div class="detail-history-section">

            <h3>Riwayat Pengajuan Kredit</h3>

            <div class="detail-table-wrap">

                <table class="detail-table">

                    <thead>

                        <tr>
                            <th>Tanggal</th>
                            <th>Jumlah Pengajuan</th>
                            <th>Tenor</th>
                            <th>Status</th>
                        </tr>

                    </thead>

                    <tbody>

                        ${rows.map(row => {

                            const jumlah =
                                row.jumlah_pinjaman ??
                                row.jumlah_pengajuan ??
                                row.nominal ??
                                row.jumlah ??
                                0;

                            const tanggalPengajuan =
                                row.created_at ||
                                row.tanggal_pengajuan;

                            return `

                                <tr>

                                    <td data-label="Tanggal">
                                        ${tanggal(tanggalPengajuan)}
                                    </td>

                                    <td data-label="Jumlah">
                                        ${rupiah(jumlah)}
                                    </td>

                                    <td data-label="Tenor">
                                        ${escapeHtml(row.tenor ?? "-")}
                                        ${row.tenor ? " bulan" : ""}
                                    </td>

                                    <td data-label="Status">
                                        ${statusBadge(row.status)}
                                    </td>

                                </tr>

                            `;

                        }).join("")}

                    </tbody>

                </table>

            </div>

        </div>
    `;
}


// ============================================================
// RENDER PINJAMAN
// ============================================================

function renderPinjaman(rows) {

    if (!rows.length) {

        return `
            <div class="detail-history-section">

                <h3>Riwayat Pinjaman</h3>

                <div class="detail-empty">
                    Belum ada pinjaman.
                </div>

            </div>
        `;
    }


    rows.sort((a, b) => {

        const dateA =
            new Date(
                a.created_at ||
                a.tanggal_mulai ||
                0
            ).getTime();

        const dateB =
            new Date(
                b.created_at ||
                b.tanggal_mulai ||
                0
            ).getTime();

        return dateB - dateA;
    });


    return `
        <div class="detail-history-section">

            <h3>Riwayat Pinjaman</h3>

            <div class="detail-table-wrap">

                <table class="detail-table">

                    <thead>

                        <tr>

                            <th>Tanggal Mulai</th>

                            <th>Jumlah Pinjaman</th>

                            <th>Tenor</th>

                            <th>Total Harus Dibayar</th>

                            <th>Status</th>

                        </tr>

                    </thead>

                    <tbody>

                        ${rows.map(row => `

                            <tr>

                                <td data-label="Tanggal Mulai">
                                    ${tanggal(row.tanggal_mulai)}
                                </td>

                                <td data-label="Jumlah Pinjaman">
                                    ${rupiah(row.jumlah_pinjaman)}
                                </td>

                                <td data-label="Tenor">
                                    ${escapeHtml(row.tenor ?? "-")}
                                    ${row.tenor ? " bulan" : ""}
                                </td>

                                <td data-label="Total Harus Dibayar">
                                    ${
                                        row.total_harus_dibayar == null
                                            ? "-"
                                            : rupiah(row.total_harus_dibayar)
                                    }
                                </td>

                                <td data-label="Status">
                                    ${statusBadge(row.status)}
                                </td>

                            </tr>

                        `).join("")}

                    </tbody>

                </table>

            </div>

        </div>
    `;
}


// ============================================================
// RENDER ANGSURAN
// ============================================================

function renderAngsuran(rows) {

    if (!rows.length) {

        return `
            <div class="detail-history-section">

                <h3>Jadwal Angsuran</h3>

                <div class="detail-empty">
                    Belum ada jadwal angsuran.
                </div>

            </div>
        `;
    }


    rows.sort((a, b) => {

        return (
            Number(a.angsuran_ke || 0) -
            Number(b.angsuran_ke || 0)
        );

    });


    return `
        <div class="detail-history-section">

            <h3>Jadwal Angsuran</h3>

            <div class="detail-table-wrap">

                <table class="detail-table">

                    <thead>

                        <tr>

                            <th>Ke</th>

                            <th>Jatuh Tempo</th>

                            <th>Tagihan</th>

                            <th>Dibayar</th>

                            <th>Status</th>

                            <th>Tanggal Bayar</th>

                        </tr>

                    </thead>

                    <tbody>

                        ${rows.map(row => `

                            <tr>

                                <td data-label="Ke">
                                    ${escapeHtml(row.angsuran_ke ?? "-")}
                                </td>

                                <td data-label="Jatuh Tempo">
                                    ${tanggal(row.tanggal_jatuh_tempo)}
                                </td>

                                <td data-label="Tagihan">
                                    ${rupiah(row.jumlah_tagihan)}
                                </td>

                                <td data-label="Dibayar">
                                    ${rupiah(row.jumlah_dibayar)}
                                </td>

                                <td data-label="Status">
                                    ${statusBadge(row.status)}
                                </td>

                                <td data-label="Tanggal Bayar">
                                    ${tanggal(row.tanggal_bayar)}
                                </td>

                            </tr>

                        `).join("")}

                    </tbody>

                </table>

            </div>

        </div>
    `;
}


// ============================================================
// LOAD DETAIL NASABAH
// ============================================================

async function loadDetailNasabah() {

    injectStyles();

    const params =
        new URLSearchParams(
            window.location.search
        );

    const id = params.get("id");


    // --------------------------------------------------------
    // CEK ID
    // --------------------------------------------------------

    if (!id) {

        loading.style.display = "none";

        errorBox.style.display = "block";

        errorBox.textContent =
            "ID nasabah tidak ditemukan.";

        return;
    }


    // --------------------------------------------------------
    // AMBIL DATA NASABAH
    // --------------------------------------------------------

    const {
        data: nasabah,
        error: errorNasabah
    } = await supabaseClient

        .from("nasabah")

        .select("*")

        .eq("id", id)

        .single();


    if (errorNasabah) {

        console.error(
            "Gagal mengambil detail nasabah:",
            errorNasabah
        );

        loading.style.display = "none";

        errorBox.style.display = "block";

        errorBox.textContent =
            "Gagal mengambil data nasabah.";

        return;
    }


    // --------------------------------------------------------
    // TAMPILKAN DATA NASABAH
    // --------------------------------------------------------

    document.getElementById(
        "namaNasabah"
    ).textContent =
        nasabah.nama_lengkap ?? "-";


    document.getElementById(
        "nikNasabah"
    ).textContent =
        nasabah.nik ?? "-";


    document.getElementById(
        "hpNasabah"
    ).textContent =
        nasabah.no_hp ?? "-";


    document.getElementById(
        "alamatNasabah"
    ).textContent =
        nasabah.alamat ?? "-";


    document.getElementById(
        "statusNasabah"
    ).textContent =
        nasabah.status ?? "aktif";


    loading.style.display = "none";

    content.style.display = "block";


    // --------------------------------------------------------
    // AMBIL PENGAJUAN + PINJAMAN
    // --------------------------------------------------------

    const [
        pengajuanResult,
        pinjamanResult
    ] = await Promise.all([

        supabaseClient
            .from("pengajuan_kredit")
            .select("*")
            .eq("nasabah_id", id),

        supabaseClient
            .from("pinjaman")
            .select("*")
            .eq("nasabah_id", id)

    ]);


    // --------------------------------------------------------
    // ERROR PENGAJUAN
    // --------------------------------------------------------

    if (pengajuanResult.error) {

        console.error(
            "Gagal mengambil riwayat pengajuan:",
            pengajuanResult.error
        );

    }


    // --------------------------------------------------------
    // ERROR PINJAMAN
    // --------------------------------------------------------

    if (pinjamanResult.error) {

        console.error(
            "Gagal mengambil riwayat pinjaman:",
            pinjamanResult.error
        );

    }


    const pengajuan =
        pengajuanResult.data || [];


    const pinjaman =
        pinjamanResult.data || [];


    // --------------------------------------------------------
    // AMBIL ANGSURAN BERDASARKAN ID PINJAMAN
    // --------------------------------------------------------

    let angsuran = [];


    const pinjamanIds =
        pinjaman
            .map(p => p.id)
            .filter(Boolean);


    if (pinjamanIds.length > 0) {

        const {
            data: angsuranData,
            error: errorAngsuran
        } = await supabaseClient

            .from("angsuran")

            .select("*")

            .in(
                "pinjaman_id",
                pinjamanIds
            );


        if (errorAngsuran) {

            console.error(
                "Gagal mengambil jadwal angsuran:",
                errorAngsuran
            );

        } else {

            angsuran =
                angsuranData || [];

        }

    }


    // --------------------------------------------------------
    // HITUNG RINGKASAN
    // --------------------------------------------------------

    const totalPengajuan =
        pengajuan.length;


    const totalPinjaman =
        pinjaman.length;


    const totalAngsuran =
        angsuran.length;


    // --------------------------------------------------------
    // RENDER KE HTML
    // --------------------------------------------------------

    if (riwayatAktivitas) {

        riwayatAktivitas.innerHTML = `

            <div class="detail-history">

                <div class="history-summary">

                    <div class="history-summary-card">

                        <span class="history-summary-label">
                            Total Pengajuan
                        </span>

                        <span class="history-summary-value">
                            ${totalPengajuan}
                        </span>

                    </div>


                    <div class="history-summary-card">

                        <span class="history-summary-label">
                            Total Pinjaman
                        </span>

                        <span class="history-summary-value">
                            ${totalPinjaman}
                        </span>

                    </div>


                    <div class="history-summary-card">

                        <span class="history-summary-label">
                            Total Angsuran
                        </span>

                        <span class="history-summary-value">
                            ${totalAngsuran}
                        </span>

                    </div>

                </div>


                ${renderPengajuan(pengajuan)}


                ${renderPinjaman(pinjaman)}


                ${renderAngsuran(angsuran)}

            </div>

        `;

    }

}


// ============================================================
// JALANKAN
// ============================================================

loadDetailNasabah();