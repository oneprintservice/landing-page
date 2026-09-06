(function(){
  const CATEGORIES=['sparepart','tinta','lisensi','jasa'];
  const state={items:[],editing:null,movements:[]};
  const $=id=>document.getElementById(id);
  const rupiah=n=>'Rp '+(Number(n)||0).toLocaleString('id-ID');
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const keyOf=(kategori,key)=>kategori+'|'+key;
  function feedback(msg,error=false){const el=$('inventory-feedback');if(!el)return;el.textContent=msg;el.style.color=error?'#dc2626':'#15803d';setTimeout(()=>{if(el.textContent===msg)el.textContent=''},3500)}
  async function loadInventory(){
    state.items=[];
    try{
      for(const kategori of CATEGORIES){const snap=await db.ref('inventori/'+kategori).once('value');snap.forEach(ch=>state.items.push({key:ch.key,kategori,...(ch.val()||{})}));}
      state.items.sort((a,b)=>String(a.nama).localeCompare(String(b.nama),'id'));
      render();updateStats();
    }catch(e){console.error(e);feedback('Gagal memuat inventori: '+e.message,true)}
  }
  function updateStats(){
    $('stat-item').textContent=state.items.length;
    $('stat-low').textContent=state.items.filter(x=>(Number(x.stok)||0)>0&&(Number(x.stok)||0)<=(Number(x.minimum)||1)&&x.kategori!=='jasa').length;
    $('stat-empty').textContent=state.items.filter(x=>(Number(x.stok)||0)<=0&&x.kategori!=='jasa').length;
    $('stat-value').textContent=rupiah(state.items.reduce((s,x)=>s+(Number(x.stok)||0)*(Number(x.harga_beli)||0),0));
  }
  function render(){
    const target=$('inventori-list');const q=($('inventory-search').value||'').trim().toLowerCase();const cat=$('inventory-filter').value;
    const list=state.items.filter(x=(!q||String(x.nama).toLowerCase().includes(q))&&(cat==='all'||x.kategori===cat));
    if(!list.length){target.innerHTML='<div class="empty-state">Tidak ada barang yang cocok.</div>';return}
    target.innerHTML=list.map(x=>{const stok=Number(x.stok)||0;const min=Number(x.minimum)||1;const cls=x.kategori==='jasa'?'stock-ok':stok<=0?'stock-empty':stok<=min?'stock-low':'stock-ok';const label=x.kategori==='jasa'?'JASA':stok<=0?'HABIS':stok<=min?'MENIPIS':'AMAN';return `<article class="inventory-item"><div class="item-top"><div><div class="item-name">${esc(x.nama)}</div><div class="item-cat">${esc(x.kategori)}</div></div><span class="stock-pill ${cls}">${label} · ${stok} ${esc(x.satuan||'')}</span></div><div class="item-meta"><span>Modal <b>${rupiah(x.harga_beli)}</b></span><span>Jual <b>${rupiah(x.harga_jual)}</b></span></div><div class="item-actions"><button class="btn-edit" data-edit="${esc(keyOf(x.kategori,x.key))}"><i class="fas fa-pen"></i> EDIT</button><button class="btn-delete" data-delete="${esc(keyOf(x.kategori,x.key))}"><i class="fas fa-trash"></i> HAPUS</button></div></article>`}).join('');
    target.querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>startEdit(...b.dataset.edit.split('|')));target.querySelectorAll('[data-delete]').forEach(b=>b.onclick=()=>deleteItem(...b.dataset.delete.split('|')));
  }
  function resetForm(){state.editing=null;$('form-title').textContent='Tambah Barang';$('btn-simpan-inventori').innerHTML='<i class="fas fa-floppy-disk"></i> SIMPAN BARANG';$('btn-cancel-edit').classList.add('hidden');['inv-nama','inv-beli','inv-jual','inv-stok','inv-minimum'].forEach(id=>$(id).value='');$('inv-kategori').value='sparepart';$('inv-satuan').value='pcs'}
  function startEdit(kategori,key){const x=state.items.find(v=>v.kategori===kategori&&v.key===key);if(!x)return;state.editing={kategori,key,oldStock:Number(x.stok)||0};$('form-title').textContent='Edit Barang';$('btn-simpan-inventori').innerHTML='<i class="fas fa-rotate"></i> UPDATE BARANG';$('btn-cancel-edit').classList.remove('hidden');$('inv-nama').value=x.nama||'';$('inv-kategori').value=kategori;$('inv-beli').value=x.harga_beli||0;$('inv-jual').value=x.harga_jual||0;$('inv-stok').value=x.stok||0;$('inv-satuan').value=x.satuan||'pcs';$('inv-minimum').value=x.minimum??(kategori==='tinta'?100:1);window.scrollTo({top:0,behavior:'smooth'})}
  async function saveItem(){const nama=$('inv-nama').value.trim(),kategori=$('inv-kategori').value,beli=Number($('inv-beli').value)||0,jual=Number($('inv-jual').value)||0,stok=Math.max(0,Number($('inv-stok').value)||0),satuan=$('inv-satuan').value,minimum=Math.max(0,Number($('inv-minimum').value)||0);if(!nama){feedback('Nama barang wajib diisi.',true);return}const key=state.editing?.key||nama.toUpperCase().replace(/\s+/g,'_').replace(/[^A-Z0-9_-]/g,'_');const saveKategori=state.editing?.kategori||kategori;const old=state.editing?.oldStock??0;const now=Date.now();const data={nama,harga_beli:beli,harga_jual:jual,stok,satuan,minimum,updatedAt:now};const btn=$('btn-simpan-inventori');btn.disabled=true;try{await db.ref('inventori/'+saveKategori+'/'+key).update(data);const delta=stok-old;if(!state.editing&&stok!==0||state.editing&&delta!==0){if(window.recordStockMovement)await recordStockMovement({tipe:delta>0?'PENYESUAIAN_MASUK':delta<0?'PENYESUAIAN_KELUAR':'PENYESUAIAN',sumber:'MANUAL',referensi:key,tanggal:new Date().toISOString().slice(0,10),kategori:saveKategori,itemKey:key,nama,qty:Math.abs(delta),delta,stokSebelum:old,stokSesudah:stok,hargaSatuan:beli,catatan:state.editing?'Koreksi stok':'Stok awal',createdAt:now})}feedback(state.editing?'Barang berhasil diperbarui.':'Barang berhasil ditambahkan.');resetForm();await loadInventory();await loadMovements()}catch(e){console.error(e);feedback('Gagal menyimpan: '+e.message,true)}finally{btn.disabled=false}}
  async function deleteItem(kategori,key){const x=state.items.find(v=>v.kategori===kategori&&v.key===key);if(!x)return;if(!confirm('Hapus barang "'+x.nama+'"?'))return;try{await db.ref('inventori/'+kategori+'/'+key).remove();feedback('Barang berhasil dihapus.');await loadInventory()}catch(e){feedback('Gagal menghapus: '+e.message,true)}}
  async function loadMovements(){try{const snap=await db.ref('stock_movements').orderByChild('createdAt').limitToLast(100).once('value');state.movements=[];snap.forEach(ch=>state.movements.push({key:ch.key,...(ch.val()||{})}));state.movements.reverse();renderMovements()}catch(e){console.error(e);$('movement-list').innerHTML='<div class="empty-state">Belum ada data mutasi.</div>'}}
  function renderMovements(){const t=$('movement-list');if(!state.movements.length){t.innerHTML='<div class="empty-state">Belum ada riwayat mutasi stok.</div>';return}t.innerHTML=state.movements.slice(0,50).map(m=>{const d=Number(m.delta)||0;const type=d>0?'in':d<0?'out':'adjust';const title=m.tipe||'MUTASI';const date=m.tanggal||'-';return `<div class="movement-row"><div class="movement-type ${type}">${d>0?'<i class="fas fa-arrow-down"></i> MASUK':d<0?'<i class="fas fa-arrow-up"></i> KELUAR':'<i class="fas fa-sliders"></i> KOREKSI'}</div><div><b>${esc(m.nama||'-')}</b><div class="movement-ref">${esc(title)} · ${esc(m.referensi||m.sumber||'-')} · ${date}</div></div><div class="movement-delta ${type}">${d>0?'+':''}${d} ${esc(m.satuan||'')}</div><div class="movement-stock">${m.stokSebelum??'-'} → <b>${m.stokSesudah??'-'}</b></div></div>`}).join('')}
  $('btn-simpan-inventori').onclick=saveItem;$('btn-cancel-edit').onclick=resetForm;$('btn-refresh-inventory').onclick=async()=>{await loadInventory();await loadMovements();feedback('Data inventori diperbarui.')};$('btn-show-all-movements').onclick=()=>document.getElementById('movement-panel').scrollIntoView({behavior:'smooth'});$('inventory-search').oninput=render;$('inventory-filter').onchange=render;
  window.editInventori=startEdit;window.hapusInventori=deleteItem;window.loadInventori=loadInventory;
  loadInventory();loadMovements();
})();
