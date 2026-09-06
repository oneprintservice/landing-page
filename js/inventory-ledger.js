/* OnePrint Inventory Ledger - shared stock movement helper */
(function(){
  function now(){ return Date.now(); }
  function recordStockMovement(data){
    if(!window.db) return Promise.resolve();
    const ref = db.ref('stock_movements').push();
    return ref.set({
      tipe: data.tipe || 'PENYESUAIAN',
      sumber: data.sumber || 'MANUAL',
      referensi: data.referensi || '',
      tanggal: data.tanggal || new Date().toISOString().slice(0,10),
      kategori: data.kategori || '',
      itemKey: data.itemKey || '',
      nama: data.nama || '',
      qty: Number(data.qty) || 0,
      delta: Number(data.delta) || 0,
      stokSebelum: Number(data.stokSebelum) || 0,
      stokSesudah: Number(data.stokSesudah) || 0,
      hargaSatuan: Number(data.hargaSatuan) || 0,
      supplier: data.supplier || '',
      catatan: data.catatan || '',
      createdAt: data.createdAt || now()
    });
  }
  window.recordStockMovement = recordStockMovement;
})();
