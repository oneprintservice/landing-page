import { auth, db } from "./core/firebase.js";
import { watchAuth, signOut, startIdleTimeout } from "./core/auth.js";
import { listInventory, saveInventory, removeInventory, changeStock } from "./features/inventory.js";
import { saveCustomer, findCustomer } from "./features/customers.js";
import { listServices, getService, saveService, removeService, makeServiceNumber, stats } from "./features/services.js";
import { printReceipt } from "./features/receipt.js";

const $ = s => document.querySelector(s);
const money = n => `Rp ${Number(n||0).toLocaleString("id-ID")}`;
const state = {
  tab: "jasa", items: { jasa: [], sparepart: [] }, inventory: [], services: [],
  selectedInventory: null, editInventoryKey: null, editInventoryCategory: null,
  editServiceKey: null, user: null
};

const view = {
  toast(message, type="info") {
    const el = $("#toast"); el.textContent = message; el.dataset.type = type;
    el.classList.add("show"); setTimeout(() => el.classList.remove("show"), 2500);
  },
  stat(id, value) { const el = $(`#${id}`); if (el) el.textContent = value; },
  modal(title, html) { $("#modal-title").textContent=title; $("#modal-body").innerHTML=html; $("#modal").classList.add("open"); },
  closeModal() { $("#modal").classList.remove("open"); }
};

function currentForm() {
  return {
    pelanggan: $("#input-nama").value.trim(), telp: $("#input-telp").value.trim(),
    merk: $("#input-merk").value.trim(), serial: $("#barcode-input").value.trim(),
    kelengkapan: $("#input-kelengkapan").value.trim(), keluhan: $("#input-keluhan").value.trim(),
    status: $("#status-servis").value, keterangan: $("#keterangan-servis").value.trim()
  };
}
function total() { return [...state.items.jasa, ...state.items.sparepart].reduce((s,x)=>s+Number(x.harga||0),0); }

function renderCart() {
  const el = $("#cart"); el.innerHTML = "";
  for (const cat of ["jasa","sparepart"]) {
    if (!state.items[cat].length) continue;
    const head=document.createElement("div"); head.className="cart-section"; head.textContent=cat==="jasa"?"JASA":"SPAREPART / TINTA"; el.append(head);
    state.items[cat].forEach((item,i)=>{
      const row=document.createElement("div"); row.className="cart-row";
      row.innerHTML=`<div><strong>${escapeHtml(item.nama)}</strong>${item.dariInventori?'<small> • inventory</small>':''}</div><div>${money(item.harga)} <button class="icon-btn danger" data-remove="${cat}:${i}" title="Hapus">×</button></div>`;
      el.append(row);
    });
  }
  $("#total").textContent=money(total());
}
function escapeHtml(v){return String(v??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;");}

async function loadAll() {
  state.inventory = await listInventory();
  state.services = await listServices();
  renderInventory();
  renderStats();
  renderServiceTable();
}
function renderStats() {
  const s=stats(state.services);
  view.stat("stat-total",s.total); view.stat("stat-aktif",s.aktif); view.stat("stat-sparepart",s.sparepart); view.stat("stat-selesai",s.selesai);
  const badge=$("#new-badge"); if(s.baru){badge.textContent=s.baru;badge.hidden=false}else badge.hidden=true;
}
function renderInventory() {
  const q=($("#inventory-search")?.value||"").toLowerCase();
  const rows=state.inventory.filter(x=>(x.nama||"").toLowerCase().includes(q));
  $("#inventory-list").innerHTML=rows.map(x=>`<tr>
  <td><strong>${escapeHtml(x.nama)}</strong><small>${escapeHtml(x.kategori)} · ${escapeHtml(x.satuan||"pcs")}</small></td>
  <td>${money(x.harga_jual)}</td><td>${x.stok??0}</td><td>${money(x.harga_beli)}</td>
  <td><span class="stock ${Number(x.stok||0)<=Number(x.minimum||1)?"low":""}">${Number(x.stok||0)<=Number(x.minimum||1)?"Menipis":"Aman"}</span></td>
  <td><button class="table-action" data-edit-inv="${x.kategori}:${x.key}">Edit</button><button class="table-action danger" data-del-inv="${x.kategori}:${x.key}">Hapus</button></td></tr>`).join("") || `<tr><td colspan="6" class="empty">Belum ada inventori.</td></tr>`;
}
function renderSuggestions() {
  const q=$("#input-item-nama").value.trim().toLowerCase(), box=$("#suggestions");
  if(q.length<2){box.hidden=true;return}
  const rows=state.inventory.filter(x=>(x.nama||"").toLowerCase().includes(q)).slice(0,8);
  box.innerHTML=rows.map(x=>`<button class="suggestion" data-pick="${x.kategori}:${x.key}"><b>${escapeHtml(x.nama)}</b><span>${money(x.harga_jual)} · stok ${x.stok??0} ${escapeHtml(x.satuan||"")}</span></button>`).join("");
  box.hidden=!rows.length;
}
function renderServiceTable() {
  const q=($("#service-search")?.value||"").toLowerCase();
  const rows=state.services.filter(x=>[x.nomor,x.pelanggan,x.telp,x.merk,x.status].some(v=>String(v||"").toLowerCase().includes(q))).slice(0,80);
  $("#service-list").innerHTML=rows.map(x=>`<tr>
  <td><strong>${escapeHtml(x.nomor)}</strong><small>${new Date(x.tanggal||0).toLocaleString("id-ID")}</small></td>
  <td>${escapeHtml(x.pelanggan)}<small>${escapeHtml(x.merk)}</small></td>
  <td><span class="status status-${String(x.status||"").toLowerCase().replaceAll(" ","-")}">${escapeHtml(x.status||"-")}</span></td>
  <td>${money(x.total)}</td><td><button class="table-action" data-open-service="${x.key}">Buka</button></td></tr>`).join("") || `<tr><td colspan="5" class="empty">Belum ada servis.</td></tr>`;
}
function resetServiceForm(){
  ["input-nama","input-telp","input-merk","barcode-input","input-kelengkapan","input-keluhan","keterangan-servis"].forEach(id=>{$("#"+id).value=""});
  $("#status-servis").value="MASUK"; state.items={jasa:[],sparepart:[]}; state.editServiceKey=null;
  $("#service-mode").textContent="Transaksi Baru"; $("#delete-service").hidden=true; $("#print-note").disabled=false; renderCart();
}
function fillService(data){
  $("#input-nama").value=data.pelanggan||""; $("#input-telp").value=data.telp||""; $("#input-merk").value=data.merk||"";
  $("#barcode-input").value=data.serial||""; $("#input-kelengkapan").value=data.kelengkapan||""; $("#input-keluhan").value=data.keluhan||"";
  $("#status-servis").value=data.status||"MASUK"; $("#keterangan-servis").value=data.keterangan||"";
  state.items={jasa:data.jasa||[],sparepart:data.sparepart||[]}; state.editServiceKey=data.key;
  $("#service-mode").textContent=`Edit ${data.nomor||data.key}`; $("#delete-service").hidden=false; renderCart();
}
async function addCartItem(){
  const name=$("#input-item-nama").value.trim(), price=Number($("#input-item-harga").value)||0;
  if(!name||price<=0)return view.toast("Nama dan harga wajib diisi","error");
  const item={nama:name,harga:price};
  if(state.selectedInventory){
    const inv=state.inventory.find(x=>x.key===state.selectedInventory.key&&x.kategori===state.selectedInventory.kategori);
    if(inv){ item.key=inv.key; item.kategori=inv.kategori; item.dariInventori=true;
      if(inv.kategori!=="jasa" && Number(inv.stok||0)<=0)return view.toast("Stok barang habis","error");
      if(inv.kategori!=="jasa") await changeStock(inv,-1);
    }
  }
  state.items[state.tab].push(item); state.selectedInventory=null; $("#input-item-nama").value="";$("#input-item-harga").value="";$("#suggestions").hidden=true; renderCart(); renderInventory();
}
async function saveCurrentService(print=false,type="nota"){
  const f=currentForm();
  if(!f.pelanggan || !f.merk) return view.toast("Nama pelanggan dan merk/tipe wajib diisi","error");
  const number=state.editServiceKey || makeServiceNumber();
  await saveCustomer(f.serial,f);
  const data={...f,nomor:number,tanggal:state.editServiceKey?(state.services.find(x=>x.key===state.editServiceKey)?.tanggal||new Date().toISOString()):new Date().toISOString(),
    jasa:state.items.jasa,sparepart:state.items.sparepart,total:total(),teknisi:state.user?.email?.split("@")[0]?.toUpperCase()||"TEKNISI"};
  await saveService(state.editServiceKey,data);
  await loadAll(); state.editServiceKey=number;
  view.toast("Servis tersimpan","success");
  if(print) printReceipt(data,type);
}
async function openService(key){ const d=await getService(key); if(!d)return; fillService(d); switchPage("kasir"); }
async function removeCurrentService(){ if(!state.editServiceKey)return; if(!confirm("Hapus servis ini?"))return; await removeService(state.editServiceKey); resetServiceForm(); await loadAll(); view.toast("Servis dihapus","success"); }

function renderPage(name){
  document.querySelectorAll(".page").forEach(p=>p.classList.toggle("active",p.id===`page-${name}`));
  document.querySelectorAll("[data-page]").forEach(b=>b.classList.toggle("active",b.dataset.page===name));
  $("#page-title").textContent={dashboard:"Dashboard",kasir:"Kasir & Servis",services:"Data Servis",inventory:"Inventori",tools:"Tools"}[name]||"OnePrint";
}
function switchPage(name){renderPage(name); if(name==="dashboard")renderStats();}

function bind(){
  document.addEventListener("click",async e=>{
    const page=e.target.closest("[data-page]"); if(page){switchPage(page.dataset.page);return}
    if(e.target.closest("#logout")){await signOut();return}
    if(e.target.closest("#new-service")){resetServiceForm();switchPage("kasir");return}
    if(e.target.closest("#modal-close")){view.closeModal();return}
    const pick=e.target.closest("[data-pick]"); if(pick){const [kategori,key]=pick.dataset.pick.split(":");const x=state.inventory.find(i=>i.kategori===kategori&&i.key===key);if(x){state.selectedInventory=x;$("#input-item-nama").value=x.nama;$("#input-item-harga").value=x.harga_jual||0;state.tab=x.kategori==="jasa"?"jasa":"sparepart";renderSuggestions();}return}
    const rem=e.target.closest("[data-remove]"); if(rem){const [cat,i]=rem.dataset.remove.split(":");const item=state.items[cat][Number(i)];if(item?.dariInventori&&item.kategori!=="jasa"){const inv=state.inventory.find(x=>x.key===item.key&&x.kategori===item.kategori);if(inv)await changeStock(inv,1)}state.items[cat].splice(Number(i),1);renderCart();renderInventory();return}
    const oe=e.target.closest("[data-open-service]"); if(oe){await openService(oe.dataset.openService);return}
    const ei=e.target.closest("[data-edit-inv]"); if(ei){const [cat,key]=ei.dataset.editInv.split(":");const x=state.inventory.find(i=>i.kategori===cat&&i.key===key);if(x){state.editInventoryKey=key;state.editInventoryCategory=cat;$("#inv-nama").value=x.nama;$("#inv-kategori").value=cat;$("#inv-beli").value=x.harga_beli||0;$("#inv-jual").value=x.harga_jual||0;$("#inv-stok").value=x.stok||0;$("#inv-satuan").value=x.satuan||"pcs";switchPage("inventory");}return}
    const di=e.target.closest("[data-del-inv]"); if(di){const [cat,key]=di.dataset.delInv.split(":");if(confirm("Hapus barang ini?")){await removeInventory(cat,key);await loadAll();view.toast("Barang dihapus","success")}return}
    if(e.target.closest("#dashboard-aktif")){const rows=state.services.filter(x=>["MASUK","DIAGNOSA","DIKERJAKAN"].includes(String(x.status||"").toUpperCase()));view.modal("Servis Aktif",rows.map(serviceCard).join("")||"Tidak ada data");}
    if(e.target.closest("#dashboard-sparepart")){const rows=state.services.filter(x=>String(x.status||"").toUpperCase()==="MENUNGGU SPAREPART");view.modal("Menunggu Sparepart",rows.map(serviceCard).join("")||"Tidak ada data");}
    if(e.target.closest("#dashboard-selesai")){const rows=state.services.filter(x=>String(x.status||"").toUpperCase()==="SELESAI");view.modal("Selesai",rows.map(serviceCard).join("")||"Tidak ada data");}
  });
  $("#input-item-nama").addEventListener("input",renderSuggestions);
  $("#add-item").addEventListener("click",addCartItem);
  $("#tab-jasa").addEventListener("click",()=>{state.tab="jasa";$("#tab-jasa").classList.add("active");$("#tab-sparepart").classList.remove("active")});
  $("#tab-sparepart").addEventListener("click",()=>{state.tab="sparepart";$("#tab-sparepart").classList.add("active");$("#tab-jasa").classList.remove("active")});
  $("#save-service").addEventListener("click",()=>saveCurrentService(false));
  $("#save-print-note").addEventListener("click",()=>saveCurrentService(true,"tanda-terima"));
  $("#save-print-invoice").addEventListener("click",()=>saveCurrentService(true,"nota"));
  $("#delete-service").addEventListener("click",removeCurrentService);
  $("#new-service-2").addEventListener("click",()=>{resetServiceForm();switchPage("kasir")});
  $("#service-search").addEventListener("input",renderServiceTable);
  $("#inventory-search").addEventListener("input",renderInventory);
  $("#lookup-serial").addEventListener("click",async()=>{const d=await findCustomer($("#barcode-input").value);if(!d)return view.toast("Pelanggan/serial belum ditemukan","info");$("#input-nama").value=d.nama||"";$("#input-telp").value=d.telp||"";$("#input-merk").value=d.merk||"";$("#input-kelengkapan").value=d.kelengkapan||"";view.toast("Data pelanggan dimuat","success")});
  $("#save-inventory").addEventListener("click",async()=>{const item={nama:$("#inv-nama").value,kategori:$("#inv-kategori").value,harga_beli:$("#inv-beli").value,harga_jual:$("#inv-jual").value,stok:$("#inv-stok").value,satuan:$("#inv-satuan").value};if(!item.nama)return view.toast("Nama barang wajib diisi","error");await saveInventory(item,state.editInventoryKey,state.editInventoryCategory);state.editInventoryKey=null;state.editInventoryCategory=null;["inv-nama","inv-beli","inv-jual","inv-stok"].forEach(id=>$("#"+id).value="");await loadAll();view.toast("Inventori tersimpan","success")});
  $("#clear-inventory").addEventListener("click",()=>{state.editInventoryKey=null;state.editInventoryCategory=null;["inv-nama","inv-beli","inv-jual","inv-stok"].forEach(id=>$("#"+id).value="")});
  $("#service-status-filter").addEventListener("change",()=>{const q=$("#service-status-filter").value;$("#service-list").querySelectorAll("tr").forEach(tr=>tr.hidden=false);if(q)state.services.filter(x=>String(x.status||"")!==q).forEach(x=>{const tr=[...$("#service-list").children].find(r=>r.textContent.includes(x.nomor));if(tr)tr.hidden=true})});
}
function serviceCard(x){return `<div class="result-card"><strong>${escapeHtml(x.nomor)}</strong><span>${escapeHtml(x.pelanggan)} · ${escapeHtml(x.merk)}</span><span>${escapeHtml(x.status||"-")} · ${money(x.total)}</span><button class="table-action" data-open-service="${x.key}">Buka</button></div>`}

watchAuth({
  onUser: async user => {
    state.user=user; $("#user-name").textContent=(user.email||"user").split("@")[0].toUpperCase();
    $("#login-screen").hidden=true; $("#app-shell").hidden=false;
    startIdleTimeout(30,()=>view.toast("Sesi berakhir karena tidak aktif","info"));
    bind(); resetServiceForm(); await loadAll();
  },
  onSignedOut:()=>{ $("#login-screen").hidden=false; $("#app-shell").hidden=true; }
});
