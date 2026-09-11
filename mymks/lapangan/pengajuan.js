const namaNasabah = document.getElementById("namaNasabah");
const nikNasabah = document.getElementById("nikNasabah");

const formPengajuan = document.getElementById("formPengajuan");
const pesan = document.getElementById("pesan");


// Ambil nasabah_id dari URL
const params = new URLSearchParams(window.location.search);
const nasabahId = params.get("nasabah_id");


// Kalau tidak ada nasabah_id
if (!nasabahId) {

    namaNasabah.textContent = "Nasabah tidak dipilih.";
    nikNasabah.textContent = "-";

} else {

    ambilDataNasabah();

}


// ================================
// AMBIL DATA NASABAH
// ================================

async function ambilDataNasabah() {

    const { data, error } = await supabaseClient
        .from("nasabah")
        .select("id, nik, nama_lengkap")
        .eq("id", nasabahId)
        .maybeSingle();


    if (error) {

        console.error(error);

        namaNasabah.textContent =
            "Gagal mengambil data.";

        nikNasabah.textContent = "-";

        return;
    }


    if (!data) {

        namaNasabah.textContent =
            "Nasabah tidak ditemukan.";

        nikNasabah.textContent = "-";

        return;
    }


    namaNasabah.textContent =
        data.nama_lengkap;

    nikNasabah.textContent =
        data.nik;

}


// ================================
// SUBMIT PENGAJUAN
// ================================

formPengajuan.addEventListener("submit", async function(event) {

    // Mencegah browser reload halaman
    event.preventDefault();


    // Pastikan nasabah dipilih
    if (!nasabahId) {

        pesan.textContent =
            "❌ Nasabah tidak dipilih.";

        return;
    }


    // Ambil nilai form
    const jumlahPengajuan =
        Number(
            document.getElementById("jumlah_pengajuan").value
        );

    const tenor =
        Number(
            document.getElementById("tenor").value
        );

    const tujuan =
        document.getElementById("tujuan").value.trim();

    const catatan =
        document.getElementById("catatan").value.trim();


    // Validasi sederhana
    if (jumlahPengajuan <= 0) {

        pesan.textContent =
            "❌ Jumlah pengajuan tidak valid.";

        return;
    }


    if (tenor <= 0) {

        pesan.textContent =
            "❌ Tenor tidak valid.";

        return;
    }


    if (tujuan === "") {

        pesan.textContent =
            "❌ Tujuan pengajuan harus diisi.";

        return;
    }


    // Beri informasi proses
    pesan.textContent =
        "Mengirim pengajuan...";


    // Simpan ke Supabase
    const { data, error } = await supabaseClient
        .from("pengajuan_kredit")
        .insert({

            nasabah_id: nasabahId,

            jumlah_pengajuan: jumlahPengajuan,

            tenor: tenor,

            tujuan: tujuan,

            catatan: catatan

        })
        .select()
        .single();


    // Kalau gagal
    if (error) {

        console.error(error);

        pesan.textContent =
            "❌ Gagal menyimpan pengajuan: " +
            error.message;

        return;
    }


    // Kalau berhasil
    console.log("Pengajuan berhasil:", data);

    pesan.textContent =
        "✅ Pengajuan kredit berhasil disimpan.";

});