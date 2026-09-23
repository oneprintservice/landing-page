const tableBody =
    document.getElementById("nasabahTable");

const searchInput =
    document.getElementById("searchInput");

const searchButton =
    document.getElementById("searchButton");


async function loadNasabah(keyword = "") {

    tableBody.innerHTML = `
        <tr>
            <td colspan="7" class="loading">
                Memuat data nasabah...
            </td>
        </tr>
    `;


    let query =
        supabaseClient
            .from("nasabah")
            .select("*")
            .order("created_at", {
                ascending: false
            });


    if (keyword) {

        query = query.or(
            `nomor_anggota.ilike.%${keyword}%,nik.ilike.%${keyword}%,nama_lengkap.ilike.%${keyword}%`
        );

    }


    const {
        data,
        error
    } = await query;


    if (error) {

        console.error(
            "Gagal mengambil data nasabah:",
            error
        );

        tableBody.innerHTML = `
            <tr>
                <td colspan="7" class="error">
                    Gagal mengambil data nasabah.
                </td>
            </tr>
        `;

        return;
    }


    if (!data || data.length === 0) {

        tableBody.innerHTML = `
            <tr>
                <td colspan="7" class="empty">
                    Tidak ada data nasabah.
                </td>
            </tr>
        `;

        return;
    }


    tableBody.innerHTML =
        data.map(nasabah => {
            const score = Number(nasabah.credit_score ?? 10);
            const safe = (v) => window.kspEscape ? window.kspEscape(v ?? "-") : String(v ?? "-");
            return `
                <tr class="nasabah-row">
                    <td data-label="Nasabah">
                        <a href="detail-nasabah.html?id=${encodeURIComponent(nasabah.id)}" style="color:#2563eb;font-weight:bold;text-decoration:none;">
                            ${safe(nasabah.nama_lengkap)}
                        </a>
                    </td>
                    <td data-label="No. Anggota">${safe(nasabah.nomor_anggota)}</td>
                    <td data-label="NIK">${safe(nasabah.nik)}</td>
                    <td data-label="Alamat">${safe(nasabah.alamat)}</td>
                    <td data-label="No. HP">${safe(nasabah.no_hp)}</td>
                    <td data-label="Status"><span class="status">${safe(nasabah.status || "aktif")}</span></td>
                    <td data-label="Credit Score"><span class="score-badge ${window.kspScoreClass ? window.kspScoreClass(score) : "good"}">${score}/10</span></td>
                </tr>`;
        }).join("");

}


searchButton.addEventListener(
    "click",
    function () {

        const keyword =
            searchInput.value.trim();

        loadNasabah(keyword);

    }
);


searchInput.addEventListener(
    "keydown",
    function (event) {

        if (event.key === "Enter") {

            const keyword =
                searchInput.value.trim();

            loadNasabah(keyword);

        }

    }
);


// Load awal
loadNasabah();