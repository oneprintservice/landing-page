(function(){
  'use strict';

  // Keep the known categories for writing/editing, but do not assume these are
  // the only categories that already exist in the database. Older OnePrint
  // data may contain additional groups (for example "alat").
  const KNOWN_CATEGORIES=['sparepart','tinta','lisensi','jasa','alat'];
  const state={items:[],editing:null,movements:[]};
  const $=id=>document.getElementById(id);
  const rupiah=n=>'Rp '+(Number(n)||0).toLocaleString('id-ID');
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const keyOf=(kategori,key)=>kategori+'|'+key;

  function feedback(msg,error=false){
    const el=$('inventory-feedback');
    if(!el)return;
    el.textContent=msg;
    el.style.color=error?'#dc2626':'#15803d';
    clearTimeout(feedback.timer);
    feedback.timer=setTimeout(()=>{if(el.textContent===msg)el.textContent=''},4000);
  }

  function normalizeCategoryName(name){
    return String(name||'sparepart').trim().toLowerCase();
  }

  function looksLikeInventoryItem(value){
    if(!value || typeof value!=='object' || Array.isArray(value)) return false;
    return ['nama','harga_beli','harga_jual','stok','satuan','minimum'].some(k=>Object.prototype.hasOwnProperty.call(value,k));
  }

  function pushCategorySnapshot(items,kategori,snapshot){
    snapshot.forEach(child=>{
      const value=child.val()||{};
      if(looksLikeInventoryItem(value)){
        items.push({key:child.key,kategori,...value});
      }
    });
  }

  // Primary loader: read the inventory root once so every existing category is
  // discovered. This is important for legacy data that was not limited to the
  // four categories used by the refactored UI.
  async function loadInventory(){
    state.items=[];
    const errors=[];
    try{
      const rootSnap=await db.ref('inventori').once('value');
      const rootVal=rootSnap.val();

      if(rootSnap.exists() && rootVal && typeof rootVal==='object'){
        // Legacy possibility: inventori/<itemKey> is an item directly.
        if(looksLikeInventoryItem(rootVal)){
          const kategori=normalizeCategoryName(rootVal.kategori||'sparepart');
          state.items.push({key:'root',kategori,...rootVal});
        }else{
          Object.keys(rootVal).forEach(kategori=>{
            const node=rootSnap.child(kategori);
            pushCategorySnapshot(state.items,normalizeCategoryName(kategori),node);
          });
        }
      }
    }catch(e){
      console.warn('Root inventory read failed, trying category reads:',e);
      errors.push(e);
    }

    // Fallback for Firebase rules that allow category-level reads but not a
    // root-level read.
    if(!state.items.length){
      const seen=new Set();
      await Promise.all(KNOWN_CATEGORIES.map(async kategori=>{
        try{
          const snap=await db.ref('inventori/'+kategori).once('value');
          pushCategorySnapshot(state.items,kategori,snap);
        }catch(e){
          errors.push(e);
        }
      }));
      state.items=state.items.filter(x=>{
        const k=keyOf(x.kategori,x.key);
        if(seen.has(k)) return false;
        seen.add(k); return true;
      });
    }

    state.items.sort((a,b)=>String(a.nama||'').localeCompare(String(b.nama||''),'id'));
    renderCategoryFilter();
    render();
    updateStats();

    const empty=state.items.length===0;
    if(empty && errors.length){
      console.error('Inventory load errors:',errors);
      const first=errors[0];
      if(first && /permission|denied/i.test(String(first.message||first)))
        feedback('Data inventori tidak dapat dibaca. Periksa sesi login/aturan Firebase.',true);
      else
        feedback('Inventori belum dapat dimuat. Tekan Refresh Stok untuk mencoba lagi.',true);
    }else if(!empty){
      feedback(state.items.length+' item inventori dimuat.');
    }
  }

  function renderCategoryFilter(){
    const select=$('inventory-filter');
    if(!select)return;
    const current=select.value||'all';
    const categories=[...new Set(state.items.map(x=>normalizeCategoryName(x.kategori)))];
    const preferred=['sparepart','tinta','lisensi','jasa','alat'];
    const ordered=[...preferred.filter(x=>categories.includes(x)),...categories.filter(x=>!preferred.includes(x)).sort()];
    select.innerHTML='<option value="all">Semua kategori</option>'+ordered.map(c=>`<option value="${esc(c)}">${esc(c.charAt(0).toUpperCase()+c.slice(1))}</option>`).join('');
    select.value=ordered.includes(current)?current:'all';
  }

  function updateStats(){
    const goods=state.items.filter(x=>normalizeCategoryName(x.kategori)!=='jasa');
    $('stat-item').textContent=state.items.length;
    $('stat-low').textContent=goods.filter(x=>{
      const stok=Number(x.stok)||0;
      const min=Number(x.minimum);
      return stok>0 && stok<=(Number.isFinite(min)?min:1);
    }).length;
    $('stat-empty').textContent=goods.filter(x=>(Number(x.stok)||0)<=0).length;
    $('stat-value').textContent=rupiah(goods.reduce((s,x)=>s+(Number(x.stok)||0)*(Number(x.harga_beli)||0),0));
  }

  function render(){
    const target=$('inventori-list');
    if(!target)return;
    const q=($('inventory-search')?.value||'').trim().toLowerCase();
    const cat=$('inventory-filter')?.value||'all';
    const list=state.items.filter(x=>
      (!q||String(x.nama||'').toLowerCase().includes(q)) &&
      (cat==='all'||normalizeCategoryName(x.kategori)===cat)
    );
    if(!list.length){
      target.innerHTML=state.items.length
        ? '<div class="empty-state">Tidak ada barang yang cocok dengan pencarian.</div>'
        : '<div class="empty-state">Belum ada data inventori yang terbaca dari database.</div>';
      return;
    }
    target.innerHTML=list.map(x=>{
      const stok=Number(x.stok)||0;
      const min=Number.isFinite(Number(x.minimum))?Number(x.minimum):1;
      const kategori=normalizeCategoryName(x.kategori);
      const cls=kategori==='jasa'?'stock-ok':stok<=0?'stock-empty':stok<=min?'stock-low':'stock-ok';
      const label=kategori==='jasa'?'JASA':stok<=0?'HABIS':stok<=min?'MENIPIS':'AMAN';
      return `<article class="inventory-item">
        <div class="item-top"><div><div class="item-name">${esc(x.nama)}</div><div class="item-cat">${esc(kategori)}</div></div>
        <span class="stock-pill ${cls}">${label} · ${stok} ${esc(x.satuan||'')}</span></div>
        <div class="item-meta"><span>Modal <b>${rupiah(x.harga_beli)}</b></span><span>Jual <b>${rupiah(x.harga_jual)}</b></span></div>
        <div class="item-actions"><button class="btn-edit" data-edit="${esc(keyOf(kategori,x.key))}"><i class="fas fa-pen"></i> EDIT</button>
        <button class="btn-delete" data-delete="${esc(keyOf(kategori,x.key))}"><i class="fas fa-trash"></i> HAPUS</button></div>
      </article>`;
    }).join('');
    target.querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>startEdit(...b.dataset.edit.split('|')));
    target.querySelectorAll('[data-delete]').forEach(b=>b.onclick=()=>deleteItem(...b.dataset.delete.split('|')));
  }

  function resetForm(){
    state.editing=null;
    $('form-title').textContent='Tambah Barang';
    $('btn-simpan-inventori').innerHTML='<i class="fas fa-floppy-disk"></i> SIMPAN BARANG';
    $('btn-cancel-edit').classList.add('hidden');
    ['inv-nama','inv-beli','inv-jual','inv-stok','inv-minimum'].forEach(id=>$(id).value='');
    $('inv-kategori').value='sparepart';
    $('inv-satuan').value='pcs';
  }

  function startEdit(kategori,key){
    const x=state.items.find(v=>normalizeCategoryName(v.kategori)===normalizeCategoryName(kategori)&&v.key===key);
    if(!x)return;
    state.editing={kategori,key,oldStock:Number(x.stok)||0};
    $('form-title').textContent='Edit Barang';
    $('btn-simpan-inventori').innerHTML='<i class="fas fa-rotate"></i> UPDATE BARANG';
    $('btn-cancel-edit').classList.remove('hidden');
    $('inv-nama').value=x.nama||'';
    $('inv-kategori').value=KNOWN_CATEGORIES.includes(kategori)?kategori:'sparepart';
    $('inv-beli').value=x.harga_beli||0;
    $('inv-jual').value=x.harga_jual||0;
    $('inv-stok').value=x.stok||0;
    $('inv-satuan').value=x.satuan||'pcs';
    $('inv-minimum').value=x.minimum??1;
    window.scrollTo({top:0,behavior:'smooth'});
  }

  async function saveItem(){
    const nama=$('inv-nama').value.trim();
    const kategori=$('inv-kategori').value;
    const beli=Number($('inv-beli').value)||0;
    const jual=Number($('inv-jual').value)||0;
    const stok=Math.max(0,Number($('inv-stok').value)||0);
    const satuan=$('inv-satuan').value;
    const minimum=Math.max(0,Number($('inv-minimum').value)||0);
    if(!nama){feedback('Nama barang wajib diisi.',true);return}
    const key=state.editing?.key||nama.toUpperCase().replace(/\s+/g,'_').replace(/[^A-Z0-9_-]/g,'_');
    const saveKategori=state.editing?.kategori||kategori;
    const old=state.editing?.oldStock??0;
    const now=Date.now();
    const data={nama,harga_beli:beli,harga_jual:jual,stok,satuan,minimum,updatedAt:now};
    const btn=$('btn-simpan-inventori');btn.disabled=true;
    try{
      await db.ref('inventori/'+saveKategori+'/'+key).update(data);
      const delta=stok-old;
      if((!state.editing&&stok!==0)||(state.editing&&delta!==0)){
        if(window.recordStockMovement)await recordStockMovement({
          tipe:delta>0?'PENYESUAIAN_MASUK':delta<0?'PENYESUAIAN_KELUAR':'PENYESUAIAN',
          sumber:'MANUAL',referensi:key,tanggal:new Date().toISOString().slice(0,10),
          kategori:saveKategori,itemKey:key,nama,qty:Math.abs(delta),delta,
          stokSebelum:old,stokSesudah:stok,hargaSatuan:beli,
          catatan:state.editing?'Koreksi stok':'Stok awal',createdAt:now
        });
      }
      feedback(state.editing?'Barang berhasil diperbarui.':'Barang berhasil ditambahkan.');
      resetForm();
      await loadInventory();
      await loadMovements();
    }catch(e){console.error(e);feedback('Gagal menyimpan: '+e.message,true)}
    finally{btn.disabled=false}
  }

  async function deleteItem(kategori,key){
    const x=state.items.find(v=>normalizeCategoryName(v.kategori)===normalizeCategoryName(kategori)&&v.key===key);
    if(!x)return;
    if(!confirm('Hapus barang "'+x.nama+'"?'))return;
    try{
      await db.ref('inventori/'+kategori+'/'+key).remove();
      feedback('Barang berhasil dihapus.');
      await loadInventory();
    }catch(e){feedback('Gagal menghapus: '+e.message,true)}
  }

  async function loadMovements(){
    try{
      const snap=await db.ref('stock_movements').orderByChild('createdAt').limitToLast(100).once('value');
      state.movements=[];
      snap.forEach(ch=>state.movements.push({key:ch.key,...(ch.val()||{})}));
      state.movements.reverse();
      renderMovements();
    }catch(e){
      console.error(e);
      $('movement-list').innerHTML='<div class="empty-state">Belum ada data mutasi stok.</div>';
    }
  }

  function renderMovements(){
    const t=$('movement-list');
    if(!t)return;
    if(!state.movements.length){t.innerHTML='<div class="empty-state">Belum ada riwayat mutasi stok.</div>';return}
    t.innerHTML=state.movements.slice(0,50).map(m=>{
      const d=Number(m.delta)||0;const type=d>0?'in':d<0?'out':'adjust';
      const title=m.tipe||'MUTASI';const date=m.tanggal||'-';
      return `<div class="movement-row"><div class="movement-type ${type}">${d>0?'<i class="fas fa-arrow-down"></i> MASUK':d<0?'<i class="fas fa-arrow-up"></i> KELUAR':'<i class="fas fa-sliders"></i> KOREKSI'}</div><div><b>${esc(m.nama||'-')}</b><div class="movement-ref">${esc(title)} · ${esc(m.referensi||m.sumber||'-')} · ${date}</div></div><div class="movement-delta ${type}">${d>0?'+':''}${d} ${esc(m.satuan||'')}</div><div class="movement-stock">${m.stokSebelum??'-'} → <b>${m.stokSesudah??'-'}</b></div></div>`
    }).join('');
  }

  $('btn-simpan-inventori').onclick=saveItem;
  $('btn-cancel-edit').onclick=resetForm;
  $('btn-refresh-inventory').onclick=async()=>{await loadInventory();await loadMovements();feedback('Data inventori diperbarui.')};
  $('btn-show-all-movements').onclick=()=>document.getElementById('movement-panel').scrollIntoView({behavior:'smooth'});
  $('inventory-search').oninput=render;
  $('inventory-filter').onchange=render;
  window.editInventori=startEdit;
  window.hapusInventori=deleteItem;
  window.loadInventori=loadInventory;

  let inventoryBooted=false;
  function bootInventory(){
    if(inventoryBooted)return;
    inventoryBooted=true;
    loadInventory();
    loadMovements();
  }

  // Firebase is already initialized by firebase.js. Wait for an authenticated
  // session, but also boot immediately when currentUser is already available.
  if(window.auth){
    auth.onAuthStateChanged(user=>{if(user)bootInventory();});
    if(auth.currentUser)bootInventory();
  }else{
    bootInventory();
  }
})();
