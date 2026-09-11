const hasil = document.getElementById("daftar-pinjaman");

async function loadPinjaman() {

    // Ambil semua pinjaman
    const {
        data: pinjaman,
        error: errorPinjaman
    } = await supabaseClient
        .from("pinjaman")
        .select("*")
        .order("created_at", {
            ascending: false
        });

    if (errorPinjaman) {

        console.error(errorPinjaman);

        hasil.innerHTML = `
            <p style="color:red;">
                Gagal mengambil data pinjaman:
                ${errorPinjaman.message}
            </p>
        `;

        return;
    }


    if (!pinjaman || pinjaman.length === 0) {

        hasil.innerHTML = `
            <p>Tidak ada pinjaman.</p>
        `;

        return;
    }


    // Ambil semua ID nasabah
    const nasabahIds = [
        ...new Set(
            pinjaman
                .map(p => p.nasabah_id)
                .filter(Boolean)
        )
    ];


    // Ambil data nasabah
    let nasabahMap = {};

    if (nasabahIds.length > 0) {

        const {
            data: nasabah,
            error: errorNasabah
        } = await supabaseClient
            .from("nasabah")
            .select("id, nama_lengkap, nik")
            .in("id", nasabahIds);


        if (errorNasabah) {

            console.error(errorNasabah);

            hasil.innerHTML = `
                <div class="message error" style="display:block;">
                    Gagal mengambil data nasabah: ${errorNasabah.message}
                </div>
            `;

            return;
        }


        (nasabah || []).forEach(n => {

            nasabahMap[n.id] = n;

        });

    }


    // Ambil semua angsuran
    const pinjamanIds = pinjaman.map(p => p.id);

    let angsuranMap = {};

    if (pinjamanIds.length > 0) {

        const {
            data: angsuran,
            error: errorAngsuran
        } = await supabaseClient
            .from("angsuran")
            .select(`
                id,
                pinjaman_id,
                angsuran_ke,
                tanggal_jatuh_tempo,
                jumlah_tagihan,
                jumlah_dibayar,
                tanggal_bayar,
                status,
                catatan
            `)
            .in("pinjaman_id", pinjamanIds)
            .order("angsuran_ke", {
                ascending: true
            });


        if (errorAngsuran) {

            console.error(errorAngsuran);

            hasil.innerHTML = `
                <p style="color:red;">
                    Gagal mengambil data angsuran:
                    ${errorAngsuran.message}
                </p>
            `;

            return;
        }


        (angsuran || []).forEach(a => {

            if (!angsuranMap[a.pinjaman_id]) {
                angsuranMap[a.pinjaman_id] = [];
            }

            angsuranMap[a.pinjaman_id].push(a);

        });

    }


    // Render
    hasil.innerHTML = "";


    pinjaman.forEach(p => {

        const nasabah = nasabahMap[p.nasabah_id];

        const daftarAngsuran =
            angsuranMap[p.id] || [];


        const formatRupiah = nilai => {

            return "Rp " +
                Number(nilai || 0)
                    .toLocaleString("id-ID");

        };


        const formatTanggal = tanggal => {

            if (!tanggal) return "-";

            return new Date(tanggal)
                .toLocaleDateString("id-ID");

        };


        let tabelAngsuran = "";


        if (daftarAngsuran.length === 0) {

            tabelAngsuran = `
                <p>
                    Belum ada data angsuran.
                </p>
            `;

        } else {

            tabelAngsuran = `
                <table border="1" cellpadding="8" cellspacing="0">

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

                        ${daftarAngsuran.map(a => `

                            <tr>

                                <td data-label="Ke">
                                    ${a.angsuran_ke}
                                </td>

                                <td data-label="Jatuh Tempo">
                                    ${formatTanggal(
                                        a.tanggal_jatuh_tempo
                                    )}
                                </td>

                                <td data-label="Tagihan">
                                    ${formatRupiah(
                                        a.jumlah_tagihan
                                    )}
                                </td>

                                <td data-label="Dibayar">
                                    ${formatRupiah(
                                        a.jumlah_dibayar
                                    )}
                                </td>

                                <td data-label="Status">
                                    ${a.status || "-"}
                                </td>

                                <td data-label="Tanggal Bayar">
                                    ${formatTanggal(
                                        a.tanggal_bayar
                                    )}
                                </td>

                            </tr>

                        `).join("")}

                    </tbody>

                </table>
            `;
        }


        hasil.innerHTML += `

            <section class="loan-card">

                <h3>
                    Pinjaman
                </h3>


                <p>
                    <strong>Nama Nasabah:</strong>
                    ${nasabah?.nama_lengkap || "-"}
                </p>


                <p>
                    <strong>NIK:</strong>
                    ${nasabah?.nik || "-"}
                </p>


                <p>
                    <strong>Jumlah Pinjaman:</strong>
                    ${formatRupiah(p.jumlah_pinjaman)}
                </p>


                <p>
                    <strong>Tenor:</strong>
                    ${p.tenor} bulan
                </p>


                <p>
                    <strong>Tanggal Mulai:</strong>
                    ${formatTanggal(p.tanggal_mulai)}
                </p>


                <p>
                    <strong>Jatuh Tempo:</strong>
                    ${formatTanggal(p.tanggal_jatuh_tempo)}
                </p>


                <p>
                    <strong>Total Harus Dibayar:</strong>
                    ${formatRupiah(p.total_harus_dibayar)}
                </p>


                <p>
                    <strong>Total Dibayar:</strong>
                    ${formatRupiah(p.total_dibayar)}
                </p>


                <p>
                    <strong>Sisa Pinjaman:</strong>
                    ${formatRupiah(p.sisa_pinjaman)}
                </p>


                <p>
                    <strong>Status:</strong>
                    ${p.status || "-"}
                </p>


                <h4>
                    Jadwal Angsuran
                </h4>

                <div class="loan-schedule">
                    ${tabelAngsuran}
                </div>

            </section>

        `;

    });

}


loadPinjaman();