const form = document.getElementById("formNasabah");
const pesan = document.getElementById("pesan");

// Ambil NIK dari URL
const params = new URLSearchParams(window.location.search);
const nikDariURL = params.get("nik");

// Jika ada NIK dari halaman pencarian,
// otomatis masukkan ke form
if (nikDariURL) {
    document.getElementById("nik").value = nikDariURL;
}


// Saat form disubmit
form.addEventListener("submit", async function (event) {

    event.preventDefault();

    pesan.textContent = "Menyimpan data...";


    // Ambil data dari form
    const dataNasabah = {
        nik: document.getElementById("nik").value.trim(),
        nama_lengkap: document.getElementById("nama_lengkap").value.trim(),
        tempat_lahir: document.getElementById("tempat_lahir").value.trim(),
        tanggal_lahir: document.getElementById("tanggal_lahir").value,
        jenis_kelamin: document.getElementById("jenis_kelamin").value,
        alamat: document.getElementById("alamat").value.trim(),
        desa: document.getElementById("desa").value.trim(),
        kecamatan: document.getElementById("kecamatan").value.trim(),
        kabupaten: document.getElementById("kabupaten").value.trim(),
        no_hp: document.getElementById("no_hp").value.trim(),
        pekerjaan: document.getElementById("pekerjaan").value.trim()
    };


    // Simpan ke Supabase
    const { data, error } = await supabaseClient
        .from("nasabah")
        .insert(dataNasabah)
        .select()
        .single();


    // Jika error
    if (error) {

        console.error(error);

        pesan.textContent =
            "Gagal menyimpan: " + error.message;

        return;
    }


    // Berhasil
    pesan.textContent =
        "✅ Nasabah berhasil disimpan.";

    console.log("Nasabah baru:", data);


    // Kosongkan form
    form.reset();

});