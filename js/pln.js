const inputs = document.querySelectorAll('input');
    
    function formatRP(angka) {
        return "RP " + parseInt(angka).toLocaleString('id-ID');
    }

    function updateStruk() {
        document.getElementById('out_id').innerText = document.getElementById('in_id').value;
        document.getElementById('out_nama').innerText = document.getElementById('in_nama').value.toUpperCase();
        document.getElementById('out_daya').innerText = document.getElementById('in_daya').value.toUpperCase();
        document.getElementById('out_bln').innerText = document.getElementById('in_bln').value.toUpperCase();
        document.getElementById('out_stand').innerText = document.getElementById('in_stand').value;
        document.getElementById('out_ref').innerText = document.getElementById('in_ref').value;

        const tag = parseInt(document.getElementById('in_tag').value) || 0;
        const adm = parseInt(document.getElementById('in_adm').value) || 0;
        
        document.getElementById('out_tag').innerText = formatRP(tag);
        document.getElementById('out_adm').innerText = formatRP(adm);
        document.getElementById('out_total').innerText = formatRP(tag + adm);
        
        const skrg = new Date();
        document.getElementById('tgl_cetak').innerText = skrg.toLocaleString('id-ID');
    }

    inputs.forEach(input => {
        input.addEventListener('input', updateStruk);
    });

    // Inisialisasi tanggal saat pertama buka
    updateStruk();
