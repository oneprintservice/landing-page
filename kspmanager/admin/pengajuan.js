const hasil = document.getElementById("hasil");

const formCard = document.getElementById("formCard");
const btnTampilkanForm =
    document.getElementById("btnTampilkanForm");

const btnCariNasabah =
    document.getElementById("btnCariNasabah");

const btnSimpan =
    document.getElementById("btnSimpan");

const inputNik =
    document.getElementById("inputNik");

const jumlahPinjaman =
    document.getElementById("jumlahPinjaman");

const tenor =
    document.getElementById("tenor");

const tujuan =
    document.getElementById("tujuan");

const catatan =
    document.getElementById("catatan");

const nasabahInfo =
    document.getElementById("nasabahInfo");

const message =
    document.getElementById("message");


let nasabahTerpilih = null;


// =====================================
// FORMAT RUPIAH
// =====================================

function rupiah(value) {

    const n = Number(value || 0);

    return "Rp " + n.toLocaleString("id-ID");
}


// =====================================
// FORMAT TANGGAL
// =====================================

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


// =====================================
// ESCAPE HTML
// =====================================

function escapeHtml(value) {

    return String(value ?? "-")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}


// =====================================
// STATUS BADGE
// =====================================

function statusBadge(status) {

    const s =
        String(status || "")
            .toLowerCase();

    let cls = "badge-yellow";

    if (
        ["disetujui", "diterima", "selesai"]
            .includes(s)
    ) {
        cls = "badge-green";
    }

    if (
        ["ditolak", "gagal"]
            .includes(s)
    ) {
        cls = "badge-red";
    }

    return `
        <span class="badge ${cls}">
            ${escapeHtml(status || "-")}
        </span>
    `;
}


// =====================================
// MESSAGE
// =====================================

function showMessage(text, type) {

    message.textContent = text;

    message.className =
        "message " + type;

    message.style.display = "block";
}


function hideMessage() {

    message.style.display = "none";
}


// =====================================
// TAMPILKAN FORM
// =====================================

btnTampilkanForm.addEventListener(
    "click",
    function () {

        formCard.style.display = "block";

        inputNik.focus();

        window.scrollTo({
            top: formCard.offsetTop - 20,
            behavior: "smooth"
        });

    }
);


// =====================================
// CARI NASABAH
// =====================================

btnCariNasabah.addEventListener(
    "click",
    cariNasabah
);


async function cariNasabah() {

    hideMessage();

    const nik =
        inputNik.value.trim();

    if (!nik) {

        showMessage(
            "Masukkan NIK nasabah terlebih dahulu.",
            "error"
        );

        return;
    }


    nasabahInfo.style.display = "block";

    nasabahInfo.innerHTML =
        "Mencari data nasabah...";

    nasabahTerpilih = null;


    const { data, error } =
        await supabaseClient
            .from("nasabah")
            .select("*")
            .eq("nik", nik)
            .maybeSingle();


    if (error) {

        console.error(
            "Gagal mencari nasabah:",
            error
        );

        nasabahInfo.innerHTML =
            "Gagal mengambil data nasabah.";

        return;
    }


    if (!data) {

        nasabahInfo.innerHTML =
            "❌ Nasabah tidak ditemukan.";

        return;
    }


    nasabahTerpilih = data;


    nasabahInfo.innerHTML = `

        <strong>
            ✅ Nasabah ditemukan
        </strong>

        <br><br>

        <strong>Nama:</strong>
        ${escapeHtml(data.nama_lengkap)}

        <br>

        <strong>NIK:</strong>
        ${escapeHtml(data.nik)}

        <br>

        <strong>No. HP:</strong>
        ${escapeHtml(data.no_hp)}

        <br>

        <strong>Status:</strong>
        ${escapeHtml(data.status || "aktif")}

    `;
}


// =====================================
// SIMPAN PENGAJUAN
// =====================================

btnSimpan.addEventListener(
    "click",
    simpanPengajuan
);


async function simpanPengajuan() {

    hideMessage();


    if (!nasabahTerpilih) {

        showMessage(
            "Cari dan pilih nasabah terlebih dahulu.",
            "error"
        );

        return;
    }


    const jumlah =
        Number(jumlahPinjaman.value);

    const tenorValue =
        Number(tenor.value);


    if (!jumlah || jumlah <= 0) {

        showMessage(
            "Jumlah pinjaman harus diisi.",
            "error"
        );

        jumlahPinjaman.focus();

        return;
    }


    if (!tenorValue || tenorValue <= 0) {

        showMessage(
            "Silakan pilih tenor.",
            "error"
        );

        tenor.focus();

        return;
    }


    btnSimpan.disabled = true;

    btnSimpan.textContent =
        "Menyimpan...";


    try {

        /*
         * Untuk tahap ini kita hanya membuat
         * pengajuan kredit.
         *
         * Bunga, potongan pencairan,
         * total pembayaran dan jadwal angsuran
         * BELUM dihitung di sini.
         *
         * Itu akan kita masukkan pada tahap
         * aturan kredit berikutnya.
         */

        const { data, error } =
            await supabaseClient
                .from("pengajuan_kredit")
                .insert([
                    {
                        nasabah_id: nasabahTerpilih.id,
                        jumlah_pengajuan: jumlah,
                        tenor: tenorValue,
                        tujuan: tujuan.value.trim(),
                        catatan: catatan.value.trim(),
                        status: "pending"
                    }
                ])
                .select()
                .single();


        if (error) {

            console.error(
                "Gagal menyimpan pengajuan:",
                error
            );

            showMessage(
                "Gagal menyimpan pengajuan: " +
                error.message,
                "error"
            );

            return;
        }


        showMessage(
            "✅ Pengajuan berhasil dibuat.",
            "success"
        );


        // reset form

        inputNik.value = "";
        jumlahPinjaman.value = "";
        tenor.value = "";
        tujuan.value = "";
        catatan.value = "";

        nasabahInfo.innerHTML = "";
        nasabahInfo.style.display = "none";

        nasabahTerpilih = null;


        // refresh daftar

        await loadPengajuan();


        // tutup form sebentar setelah berhasil

        setTimeout(function () {

            formCard.style.display = "none";

        }, 1200);


    } catch (error) {

        console.error(error);

        showMessage(
            "Terjadi kesalahan saat menyimpan pengajuan.",
            "error"
        );

    } finally {

        btnSimpan.disabled = false;

        btnSimpan.textContent =
            "💾 Simpan Pengajuan";

    }
}


// =====================================
// LOAD DAFTAR PENGAJUAN
// =====================================

async function loadPengajuan() {

    hasil.innerHTML =
        "Memuat data pengajuan...";


    const { data, error } =
        await supabaseClient
            .from("pengajuan_kredit")
            .select("*")
            .order("created_at", {
                ascending: false
            });


    if (error) {

        console.error(
            "Gagal mengambil pengajuan:",
            error
        );

        hasil.innerHTML = `
            <div class="message error"
                 style="display:block;">
                Gagal mengambil data pengajuan:
                ${escapeHtml(error.message)}
            </div>
        `;

        return;
    }


    if (!data || !data.length) {

        hasil.innerHTML = `
            <div class="empty">
                Belum ada pengajuan kredit.
            </div>
        `;

        return;
    }


    // Ambil data nasabah terkait

    const nasabahIds =
        [
            ...new Set(
                data
                    .map(row => row.nasabah_id)
                    .filter(Boolean)
            )
        ];


    let nasabahMap = {};


    if (nasabahIds.length) {

        const {
            data: nasabah,
            error: nasabahError
        } =
            await supabaseClient
                .from("nasabah")
                .select("id, nama_lengkap, nik")
                .in("id", nasabahIds);


        if (!nasabahError) {

            (nasabah || []).forEach(
                n => {

                    nasabahMap[n.id] = n;

                }
            );

        }
    }


    hasil.innerHTML = `

        <div class="table-wrap">

            <table>

                <thead>

                    <tr>

                        <th>Tanggal</th>

                        <th>Nasabah</th>

                        <th>NIK</th>

                        <th>Jumlah</th>

                        <th>Tenor</th>

                        <th>Status</th>

                        <th>Aksi</th>

                    </tr>

                </thead>


                <tbody>

                    ${data.map(row => {

                        const n =
                            nasabahMap[row.nasabah_id];


                        return `

                            <tr>

                                <td data-label="Tanggal">
                                    ${tanggal(
                                        row.created_at
                                    )}
                                </td>

                                <td data-label="Nasabah">
                                    ${escapeHtml(
                                        n?.nama_lengkap || "-"
                                    )}
                                </td>

                                <td data-label="NIK">
                                    ${escapeHtml(
                                        n?.nik || "-"
                                    )}
                                </td>

                                <td data-label="Jumlah">
                                    ${rupiah(
                                        row.jumlah_pengajuan
                                    )}
                                </td>

                                <td data-label="Tenor">
                                    ${escapeHtml(
                                        row.tenor ?? "-"
                                    )}
                                    bulan
                                </td>

                                <td data-label="Status">
                                    ${statusBadge(row.status)}
                                </td>

                                <td data-label="Aksi">
                                    ${
                                        row.status === "pending"
                                            ? `
                                                <div class="action-group">

                                                    <button
                                                        class="btn-small btn-detail"
                                                        onclick="lihatDetailPengajuan('${row.id}')">
                                                        Detail
                                                    </button>

                                                    <button
                                                        class="btn-small btn-approve"
                                                        onclick="prosesPengajuan('${row.id}', 'disetujui')">
                                                        Setujui
                                                    </button>

                                                    <button
                                                        class="btn-small btn-reject"
                                                        onclick="prosesPengajuan('${row.id}', 'ditolak')">
                                                        Tolak
                                                    </button>

                                                </div>
                                            `
                                            : "-"
                                    }
                                </td>

                            </tr>

                        `;

                    }).join("")}

                </tbody>

            </table>

        </div>

    `;
}

// =====================================
// DETAIL PENGAJUAN
// =====================================

async function lihatDetailPengajuan(id) {

    const { data, error } =
        await supabaseClient
            .from("pengajuan_kredit")
            .select("*")
            .eq("id", id)
            .single();

    if (error) {

        console.error(
            "Gagal mengambil detail pengajuan:",
            error
        );

        alert(
            "Gagal mengambil detail pengajuan:\n" +
            error.message
        );

        return;
    }


    const jumlah =
        rupiah(data.jumlah_pengajuan);

    const tenorText =
        `${data.tenor} bulan`;

    const tujuan =
        data.tujuan || "-";

    const catatan =
        data.catatan || "-";


    alert(
        "DETAIL PENGAJUAN\n\n" +
        "Jumlah: " + jumlah + "\n" +
        "Tenor: " + tenorText + "\n" +
        "Tujuan: " + tujuan + "\n" +
        "Catatan: " + catatan + "\n" +
        "Status: " + data.status
    );
}


// =====================================
// PROSES PENGAJUAN
// =====================================

async function prosesPengajuan(id, statusBaru) {

    const label =
        statusBaru === "disetujui"
            ? "MENYETUJUI"
            : "MENOLAK";

    const yakin = confirm(
        `Yakin ingin ${label.toLowerCase()} pengajuan ini?`
    );

    if (!yakin) return;

    // Penolakan hanya mengubah status pengajuan.
    if (statusBaru !== "disetujui") {
        const { error } = await supabaseClient
            .from("pengajuan_kredit")
            .update({ status: statusBaru })
            .eq("id", id);

        if (error) {
            console.error("Gagal menolak pengajuan:", error);
            alert("Gagal memproses pengajuan:\n" + error.message);
            return;
        }

        alert("❌ Pengajuan ditolak.");
        await loadPengajuan();
        return;
    }

    // Ambil data pengajuan terlebih dahulu agar data pinjaman
    // dibuat dari pengajuan yang benar-benar disetujui.
    const { data: pengajuan, error: errorPengajuan } = await supabaseClient
        .from("pengajuan_kredit")
        .select("*")
        .eq("id", id)
        .single();

    if (errorPengajuan || !pengajuan) {
        console.error("Gagal mengambil pengajuan:", errorPengajuan);
        alert("Gagal mengambil data pengajuan:\n" + (errorPengajuan?.message || "Data tidak ditemukan."));
        return;
    }

    const jumlah = Number(pengajuan.jumlah_pengajuan || 0);
    const tenorValue = Number(pengajuan.tenor || 0);

    if (!jumlah || !tenorValue) {
        alert("Pengajuan belum memiliki jumlah atau tenor yang valid.");
        return;
    }

    /*
     * Untuk sementara aturan bunga/potongan belum ditetapkan.
     * Karena itu total kewajiban = pokok pengajuan.
     * Nanti rumus kredit bisa diganti di satu titik ini.
     */
    const totalHarusDibayar = jumlah;
    const cicilanDasar = Math.floor(totalHarusDibayar / tenorValue);
    const sisaPembulatan = totalHarusDibayar - (cicilanDasar * tenorValue);

    const tanggalMulai = new Date();
    tanggalMulai.setHours(0, 0, 0, 0);

    const tanggalJatuhTempo = new Date(tanggalMulai);
    tanggalJatuhTempo.setMonth(tanggalJatuhTempo.getMonth() + tenorValue);

    // Buat record pinjaman terlebih dahulu.
    const { data: pinjaman, error: errorPinjaman } = await supabaseClient
        .from("pinjaman")
        .insert({
            nasabah_id: pengajuan.nasabah_id,
            jumlah_pinjaman: jumlah,
            tenor: tenorValue,
            tanggal_mulai: tanggalMulai.toISOString(),
            tanggal_jatuh_tempo: tanggalJatuhTempo.toISOString(),
            total_harus_dibayar: totalHarusDibayar,
            total_dibayar: 0,
            sisa_pinjaman: totalHarusDibayar,
            status: "aktif"
        })
        .select()
        .single();

    if (errorPinjaman || !pinjaman) {
        console.error("Gagal membuat pinjaman:", errorPinjaman);
        alert(
            "Pengajuan belum diubah menjadi pinjaman.\n\n" +
            (errorPinjaman?.message || "Record pinjaman gagal dibuat.")
        );
        return;
    }

    // Buat jadwal angsuran bulanan.
    const daftarAngsuran = [];

    for (let i = 1; i <= tenorValue; i++) {
        const jatuhTempo = new Date(tanggalMulai);
        jatuhTempo.setMonth(jatuhTempo.getMonth() + i);

        // Sisa pembulatan dimasukkan ke angsuran terakhir agar total pas.
        const jumlahTagihan =
            cicilanDasar + (i === tenorValue ? sisaPembulatan : 0);

        daftarAngsuran.push({
            pinjaman_id: pinjaman.id,
            angsuran_ke: i,
            tanggal_jatuh_tempo: jatuhTempo.toISOString(),
            jumlah_tagihan: jumlahTagihan,
            jumlah_dibayar: 0,
            tanggal_bayar: null,
            status: "belum_bayar",
            catatan: null
        });
    }

    const { error: errorAngsuran } = await supabaseClient
        .from("angsuran")
        .insert(daftarAngsuran);

    if (errorAngsuran) {
        console.error("Gagal membuat jadwal angsuran:", errorAngsuran);
        alert(
            "Pinjaman berhasil dibuat, tetapi jadwal angsuran gagal dibuat.\n\n" +
            errorAngsuran.message
        );
        return;
    }

    // Terakhir baru tandai pengajuan sebagai disetujui.
    const { error: errorStatus } = await supabaseClient
        .from("pengajuan_kredit")
        .update({ status: statusBaru })
        .eq("id", id);

    if (errorStatus) {
        console.error("Gagal memperbarui status pengajuan:", errorStatus);
        alert(
            "Pinjaman dan jadwal angsuran sudah dibuat, tetapi status pengajuan gagal diperbarui.\n\n" +
            errorStatus.message
        );
        return;
    }

    alert(
        "✅ Pengajuan disetujui.\n\n" +
        "Pinjaman dan jadwal " + tenorValue + " angsuran berhasil dibuat."
    );

    await loadPengajuan();
}


// =====================================
// START
// =====================================

loadPengajuan();