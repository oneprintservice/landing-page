(function(){
  'use strict';
  const categories=['sparepart','tinta','lisensi','jasa'];
  const state={inventory:[],items:[]};
  const $=id=>document.getElementById(id);
  const rupiah=n=>'Rp '+(Number(n)||0).toLocaleString('id-ID');
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function makeNumber(){const d=new Date();const p=n=>String(n).padStart(2,'0');return `PB-${d.getFullYear()}${p(d.getMonth()+1)}-${p(d.getDate())}-${String(Date.now()).slice(-5)}`}
  function inventoryLabel(x){return `${x.nama} — stok ${x.stok||0} ${x.satuan||''}`}
  async function loadInventory(){
    state.inventory=[];
    for(const kategori of categories){
      const snap=await db.ref('inventori/'+kategori).once('value');
      snap.forEach(ch=>state.inventory.push({key:ch.key,kategori,...(ch.val()||{})}));
    }
    state.inventory.sort((a,b)=>String(a.nama).localeCompare(String(b.nama)));
    $('item-select').innerHTML='<option value="">Pilih barang inventori...</option>'+state.inventory.map(x=>`<option value="${esc(x.kategori+'|'+x.key)}">${esc(inventoryLabel(x))}</option>`).join('');
  }
  async function loadSuppliers(){
    const snap=await db.ref('suppliers').once('value'); const list=$('supplier-list');
    list.innerHTML=''; snap.forEach(ch=>{const v=ch.val()||{}; const o=document.createElement('option');o.value=v.nama||ch.key;list.appendChild(o)});
  }
  function renderItems(){
    $('purchase-items').innerHTML=state.items.length?state.items.map((x,i)=>`<div class="border rounded-lg p-3 flex flex-col sm:flex-row sm:items-center gap-2"><div class="flex-1"><div class="font-bold text-sm">${esc(x.nama)}</div><div class="text-xs text-gray-500">${x.qty} ${esc(x.satuan||'')} × ${rupiah(x.harga)}</div></div><div class="font-bold text-sm">${rupiah(x.qty*x.harga)}</div><button data-remove="${i}" class="text-red-600 text-xs font-bold">HAPUS</button></div>`).join(''):'<div class="text-xs text-gray-400 italic border rounded-lg p-4 text-center">Belum ada barang dalam pembelian.</div>';
    $('purchase-total').textContent=rupiah(state.items.reduce((s,x)=>s+x.qty*x.harga,0)+(+($('purchase-shipping').value||0))+(+($('purchase-other').value||0)));
    document.querySelectorAll('[data-remove]').forEach(b=>b.onclick=()=>{state.items.splice(+b.dataset.remove,1);renderItems()});
  }
  function addItem(){
    const val=$('item-select').value;if(!val)return alert('Pilih barang terlebih dahulu.');
    const [kategori,key]=val.split('|'); const inv=state.inventory.find(x=>x.kategori===kategori&&x.key===key);if(!inv)return;
    const qty=Math.max(1,parseInt($('item-qty').value)||0); const harga=Math.max(0,parseInt($('item-price').value)||0);
    const existing=state.items.find(x=>x.kategori===kategori&&x.key===key&&x.harga===harga);
    if(existing) existing.qty+=qty; else state.items.push({kategori,key,nama:inv.nama,satuan:inv.satuan||'pcs',qty,harga});
    $('item-qty').value=1;$('item-price').value=inv.harga_beli||0;renderItems();
  }
  async function savePurchase(){
    if(!state.items.length)return alert('Tambahkan minimal satu barang.');
    const supplier=$('supplier-name').value.trim();if(!supplier)return alert('Nama supplier wajib diisi.');
    const purchaseKey=db.ref('pembelanjaan').push().key; const number=$('purchase-number').textContent;
    const date=$('purchase-date').value||new Date().toISOString().slice(0,10);
    const shipping=+($('purchase-shipping').value||0), other=+($('purchase-other').value||0);
    const subtotal=state.items.reduce((s,x)=>s+x.qty*x.harga,0), total=subtotal+shipping+other;
    const supplierKey=supplier.toUpperCase().replace(/[^A-Z0-9]+/g,'_').replace(/^_|_$/g,'')||'SUPPLIER';
    const now=Date.now(); const updates={};
    updates[`pembelanjaan/${purchaseKey}`]={nomor:number,tanggal:date,supplier,nama_supplier:supplier, kontak:$('supplier-contact').value.trim(), catatan:$('purchase-note').value.trim(), items:state.items, subtotal, ongkir:shipping, biaya_lain:other,total,createdAt:now};
    updates[`suppliers/${supplierKey}`]={nama:supplier,kontak:$('supplier-contact').value.trim(),updatedAt:now};
    state.items.forEach((x,i)=>{
      const base=`inventori/${x.kategori}/${x.key}`; const inv=state.inventory.find(v=>v.kategori===x.kategori&&v.key===x.key); const newStock=(Number(inv.stok)||0)+x.qty;
      updates[`${base}/stok`]=newStock;
      updates[`stock_movements/${db.ref('stock_movements').push().key}`]={tipe:'PEMBELIAN',sumber:'PEMBELIAN',referensi:number,pembelianId:purchaseKey,tanggal:date,kategori:x.kategori,itemKey:x.key,nama:x.nama,qty:x.qty,delta:x.qty,stokSebelum:Number(inv.stok)||0,stokSesudah:newStock,satuan:x.satuan||'pcs',hargaSatuan:x.harga,supplier,createdAt:now};
    });
    const btn=$('btn-save-purchase');btn.disabled=true;btn.textContent='MENYIMPAN...';
    try{await db.ref().update(updates);alert(`Pembelian ${number} berhasil disimpan. Stok telah ditambahkan.`);state.items=[];$('supplier-name').value='';$('supplier-contact').value='';$('purchase-note').value='';renderItems();await loadInventory();await loadHistory();}catch(e){console.error(e);alert('Gagal menyimpan pembelian: '+e.message)}finally{btn.disabled=false;btn.textContent='SIMPAN PEMBELIAN & TAMBAH STOK'}
  }
  async function loadHistory(){const snap=await db.ref('pembelanjaan').orderByChild('createdAt').limitToLast(30).once('value');const arr=[];snap.forEach(ch=>arr.push({key:ch.key,...(ch.val()||{})}));arr.reverse();$('purchase-history').innerHTML=arr.length?arr.map(x=>`<div class="border rounded-lg p-3"><div class="flex justify-between gap-2"><strong class="text-sm">${esc(x.nomor||x.key)}</strong><span class="text-xs text-gray-500">${esc(x.tanggal||'')}</span></div><div class="text-xs mt-1">${esc(x.supplier||'-')}</div><div class="text-xs text-gray-500">${(x.items||[]).length} jenis barang</div><div class="font-bold text-sm mt-2">${rupiah(x.total)}</div></div>`).join(''):'<div class="text-xs text-gray-400 italic">Belum ada pembelanjaan.</div>'}
  $('btn-add-item').onclick=addItem;$('btn-save-purchase').onclick=savePurchase;$('btn-refresh').onclick=loadHistory;$('purchase-shipping').oninput=renderItems;$('purchase-other').oninput=renderItems;$('item-select').onchange=()=>{const [k,key]=($('item-select').value||'|').split('|');const x=state.inventory.find(v=>v.kategori===k&&v.key===key);if(x)$('item-price').value=x.harga_beli||0};
  $('purchase-date').value=new Date().toISOString().slice(0,10);$('purchase-number').textContent=makeNumber();
  Promise.all([loadInventory(),loadSuppliers(),loadHistory()]).then(renderItems).catch(e=>{console.error(e);alert('Gagal memuat data inventori.')});
})();
