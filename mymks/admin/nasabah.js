const tableBody =
    document.getElementById("nasabahTable");

const searchInput =
    document.getElementById("searchInput");

const searchButton =
    document.getElementById("searchButton");


async function loadNasabah(keyword = "") {

    tableBody.innerHTML = `
        <tr>
            <td colspan="5" class="loading">
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
            `nik.ilike.%${keyword}%,nama_lengkap.ilike.%${keyword}%`
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
                <td colspan="5" class="error">
                    Gagal mengambil data nasabah.
                </td>
            </tr>
        `;

        return;
    }


    if (!data || data.length === 0) {

        tableBody.innerHTML = `
            <tr>
                <td colspan="5" class="empty">
                    Tidak ada data nasabah.
                </td>
            </tr>
        `;

        return;
    }


    tableBody.innerHTML =
        data.map(nasabah => {

            return `
                <tr class="nasabah-row">

                    <td data-label="Nasabah">
                        <a
                            href="detail-nasabah.html?id=${nasabah.id}"
                            style="
                                color:#2563eb;
                                font-weight:bold;
                                text-decoration:none;
                            ">
                            ${nasabah.nama_lengkap ?? "-"}
                        </a>
                    </td>

                    <td data-label="NIK">
                        ${nasabah.nik ?? "-"}
                    </td>

                    <td data-label="No. HP">
                        ${nasabah.no_hp ?? "-"}
                    </td>

                    <td data-label="Alamat">
                        ${nasabah.alamat ?? "-"}
                    </td>

                    <td data-label="Status">
                        <span class="status">
                            ${nasabah.status ?? "Aktif"}
                        </span>
                    </td>

                </tr>
            `;

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