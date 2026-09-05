// Quản Trị — Thư Viện + Sản Phẩm + Gói & Lịch Trình + Thành Viên. Route này chỉ hiện trong sidebar
// khi profiles.role==='admin' (xem app-shell.js NAV, cờ adminOnly) — nhưng RLS ở Supabase (is_admin())
// mới là chốt chặn thật, ẩn sidebar chỉ để đỡ rối giao diện cho user thường.
(function(){
function render(container, ctx){
  const hubState = { tab:'thuvien' };
  function drawHub(){
    container.innerHTML = `
      <div class="page-head"><h1>Quản Trị</h1><p>Quản lý Thư Viện Sức Khỏe, Sản Phẩm Unicity, Gói & Lịch Trình, và gán gói/điểm cho thành viên.</p></div>
      <div class="chips" style="margin-bottom:18px;">
        <div class="chip ${hubState.tab==='thuvien'?'selected':''}" data-hub-tab="thuvien">Thư Viện</div>
        <div class="chip ${hubState.tab==='sanpham'?'selected':''}" data-hub-tab="sanpham">Sản Phẩm</div>
        <div class="chip ${hubState.tab==='goi'?'selected':''}" data-hub-tab="goi">Gói & Lịch Trình</div>
        <div class="chip ${hubState.tab==='thanhvien'?'selected':''}" data-hub-tab="thanhvien">Thành Viên</div>
        <div class="chip ${hubState.tab==='donhang'?'selected':''}" data-hub-tab="donhang">Đơn Hàng</div>
        <div class="chip ${hubState.tab==='cauchuyen'?'selected':''}" data-hub-tab="cauchuyen">Câu Chuyện Thành Công</div>
      </div>
      <div id="qt-hub-sub"></div>
    `;
    container.querySelectorAll('[data-hub-tab]').forEach(el=>{
      el.onclick = ()=>{ hubState.tab = el.getAttribute('data-hub-tab'); drawHub(); };
    });
    const sub = container.querySelector('#qt-hub-sub');
    if(hubState.tab === 'thuvien') renderThuVien(sub, ctx);
    else if(hubState.tab === 'sanpham') renderSanPham(sub, ctx);
    else if(hubState.tab === 'goi') renderGoiLichTrinh(sub, ctx);
    else if(hubState.tab === 'donhang') renderDonHang(sub, ctx);
    else if(hubState.tab === 'cauchuyen') renderCauChuyen(sub, ctx);
    else renderThanhVien(sub, ctx);
  }
  drawHub();
}

// ===== Tab "Thư Viện" — CRUD sk_library_entries =====
function renderThuVien(container, ctx){
  const state = { list:[], products:[], form:null, saving:false };

  function draw(){ container.innerHTML = html(); bind(); }

  async function load(){
    const [{ data: list }, { data: products }] = await Promise.all([
      ctx.supabase.from('sk_library_entries').select('*').order('issue_name', { ascending:true }),
      ctx.supabase.from('sk_products').select('id,name').order('name', { ascending:true }),
    ]);
    state.list = list || [];
    state.products = products || [];
    draw();
  }

  function newForm(){ return { id:null, issue_name:'', causes:'', symptoms:'', remedies:'', related_product_ids:[], product_notes:{} }; }
  function openNew(){ state.form = newForm(); draw(); }
  function openEdit(entry){ state.form = { ...entry, related_product_ids: entry.related_product_ids||[], product_notes: entry.product_notes||{} }; draw(); }

  async function save(){
    if(!state.form.issue_name.trim()) return;
    state.saving = true; draw();
    const payload = {
      issue_name: state.form.issue_name.trim(), causes: state.form.causes.trim()||null,
      symptoms: state.form.symptoms.trim()||null, remedies: state.form.remedies.trim()||null,
      related_product_ids: state.form.related_product_ids,
      product_notes: state.form.product_notes,
    };
    const { error } = state.form.id
      ? await ctx.supabase.from('sk_library_entries').update(payload).eq('id', state.form.id)
      : await ctx.supabase.from('sk_library_entries').insert(payload);
    state.saving = false;
    if(error){ alert('Lỗi: ' + error.message); draw(); return; }
    state.form = null;
    await load();
  }

  async function remove(id){
    if(!(await confirmModal('Xoá mục này khỏi Thư Viện?'))) return;
    await ctx.supabase.from('sk_library_entries').delete().eq('id', id);
    await load();
  }

  // toggleProduct thêm/bớt sản phẩm liên quan — gắn kèm KHỞI TẠO product_notes rỗng khi thêm (2026-09-05,
  // chị Quỳnh: "cho e quyền admin để sửa công dụng nổi bật của sản phẩm" — trước đây product_notes chỉ
  // sửa được qua SQL do Claude viết tay, giờ admin tự sửa ngay trong Quản Trị), xoá note khi bỏ chọn.
  function toggleProduct(id){
    const i = state.form.related_product_ids.indexOf(id);
    if(i>=0){ state.form.related_product_ids.splice(i,1); delete state.form.product_notes[id]; }
    else { state.form.related_product_ids.push(id); if(!state.form.product_notes[id]) state.form.product_notes[id] = { note:'', priority:false }; }
  }

  function html(){
    return `
      ${state.form ? `
        <div class="card" style="margin-bottom:20px;">
          <div class="field"><label>Tên vấn đề</label><input type="text" id="tv-issue" value="${esc(state.form.issue_name)}" placeholder="VD: Mất ngủ"></div>
          <div class="field" style="margin-top:12px;"><label>Nguyên nhân</label><textarea id="tv-causes">${esc(state.form.causes)}</textarea></div>
          <div class="field" style="margin-top:12px;"><label>Biểu hiện</label><textarea id="tv-symptoms">${esc(state.form.symptoms)}</textarea></div>
          <div class="field" style="margin-top:12px;"><label>Cách xử lý</label><textarea id="tv-remedies">${esc(state.form.remedies)}</textarea></div>
          <div class="field" style="margin-top:12px;">
            <label style="display:block;font-size:13px;font-weight:600;color:var(--ink-soft);margin-bottom:6px;">Sản phẩm liên quan</label>
            <div class="chips">${state.products.map(p=>`<div class="chip ${state.form.related_product_ids.includes(p.id)?'selected':''}" data-toggle-product="${p.id}">${esc(p.name)}</div>`).join('')}</div>
          </div>
          ${state.form.related_product_ids.length>0 ? `
            <div class="field" style="margin-top:14px;">
              <label style="display:block;font-size:13px;font-weight:600;color:var(--ink-soft);margin-bottom:8px;">Công dụng nổi bật riêng cho từng sản phẩm (hiện ở Kiểm Tra Sức Khỏe/Thư Viện Sức Khỏe — nói về THÀNH PHẦN, không nói sản phẩm "chữa"). Đánh dấu tối đa 2-3 sản phẩm "Nên dùng trước" mỗi mục.</label>
              ${state.form.related_product_ids.map(pid=>{
                const p = state.products.find(x=>x.id===pid);
                const pn = state.form.product_notes[pid] || { note:'', priority:false };
                return `
                  <div style="border:1px solid var(--line);border-radius:10px;padding:12px;margin-bottom:10px;">
                    <div style="font-weight:600;font-size:13.5px;margin-bottom:6px;">${esc(p ? p.name : pid)}</div>
                    <textarea data-note-product="${pid}" placeholder="VD: Chlorophyll được biết đến với vai trò chống oxy hóa, hỗ trợ gan..." style="min-height:60px;">${esc(pn.note||'')}</textarea>
                    <label style="display:flex;align-items:center;gap:6px;margin-top:8px;font-size:13px;cursor:pointer;">
                      <input type="checkbox" data-priority-product="${pid}" ${pn.priority?'checked':''}> ⭐ Nên dùng trước
                    </label>
                  </div>
                `;
              }).join('')}
            </div>
          ` : ''}
          <div class="btn-row" style="justify-content:flex-start;margin-top:16px;">
            <button class="btn btn-sm" id="tv-save" ${state.saving?'disabled':''}>${state.saving?'Đang lưu…':'Lưu'}</button>
            <span class="btn-ghost btn btn-sm" id="tv-cancel">Huỷ</span>
          </div>
        </div>
      ` : `<button class="btn btn-sm" id="tv-new" style="margin-bottom:18px;">+ Thêm mục mới</button>`}

      ${state.list.map(e=>`
        <div class="section" style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;">
          <div style="font-weight:600;font-size:14.5px;">${esc(e.issue_name)}</div>
          <div style="display:flex;gap:8px;flex-shrink:0;">
            <span class="btn-ghost btn btn-sm" data-edit="${e.id}">Sửa</span>
            <span class="btn-ghost btn btn-sm" style="color:var(--danger);" data-remove="${e.id}">Xoá</span>
          </div>
        </div>
      `).join('')}
      ${state.list.length===0 ? `<div style="color:var(--ink-soft);font-size:14px;">Chưa có mục nào.</div>` : ''}
    `;
  }

  function bind(){
    const newBtn = container.querySelector('#tv-new'); if(newBtn) newBtn.onclick = openNew;
    const cancelBtn = container.querySelector('#tv-cancel'); if(cancelBtn) cancelBtn.onclick = ()=>{ state.form=null; draw(); };
    const saveBtn = container.querySelector('#tv-save'); if(saveBtn) saveBtn.onclick = save;
    const issueEl = container.querySelector('#tv-issue'); if(issueEl) issueEl.oninput = (e)=>{ state.form.issue_name = e.target.value; };
    const causesEl = container.querySelector('#tv-causes'); if(causesEl) causesEl.oninput = (e)=>{ state.form.causes = e.target.value; };
    const symptomsEl = container.querySelector('#tv-symptoms'); if(symptomsEl) symptomsEl.oninput = (e)=>{ state.form.symptoms = e.target.value; };
    const remediesEl = container.querySelector('#tv-remedies'); if(remediesEl) remediesEl.oninput = (e)=>{ state.form.remedies = e.target.value; };
    container.querySelectorAll('[data-toggle-product]').forEach(el=>{
      el.onclick = ()=>{ toggleProduct(el.getAttribute('data-toggle-product')); draw(); };
    });
    container.querySelectorAll('[data-note-product]').forEach(el=>{
      el.oninput = (e)=>{
        const pid = el.getAttribute('data-note-product');
        if(!state.form.product_notes[pid]) state.form.product_notes[pid] = { note:'', priority:false };
        state.form.product_notes[pid].note = e.target.value;
      };
    });
    container.querySelectorAll('[data-priority-product]').forEach(el=>{
      el.onchange = (e)=>{
        const pid = el.getAttribute('data-priority-product');
        if(!state.form.product_notes[pid]) state.form.product_notes[pid] = { note:'', priority:false };
        state.form.product_notes[pid].priority = e.target.checked;
      };
    });
    container.querySelectorAll('[data-edit]').forEach(el=>{
      el.onclick = ()=>{ openEdit(state.list.find(e=>e.id===el.getAttribute('data-edit'))); };
    });
    container.querySelectorAll('[data-remove]').forEach(el=>{
      el.onclick = ()=>remove(el.getAttribute('data-remove'));
    });
  }

  draw();
  load();
}

// ===== Tab "Sản Phẩm" — CRUD sk_products =====
function renderSanPham(container, ctx){
  const state = { list:[], form:null, saving:false };

  function draw(){ container.innerHTML = html(); bind(); }

  async function load(){
    const { data } = await ctx.supabase.from('sk_products').select('*').order('name', { ascending:true });
    state.list = data || [];
    draw();
  }

  function newForm(){ return { id:null, name:'', short_description:'', benefits:'', retail_price:'', image_url:'' }; }
  function openNew(){ state.form = newForm(); draw(); }
  function openEdit(p){ state.form = { ...p, retail_price: p.retail_price ?? '' }; draw(); }

  async function save(){
    if(!state.form.name.trim()) return;
    state.saving = true; draw();
    const payload = {
      name: state.form.name.trim(), short_description: state.form.short_description.trim()||null,
      benefits: state.form.benefits.trim()||null,
      retail_price: state.form.retail_price===''? null : Number(state.form.retail_price),
      image_url: state.form.image_url.trim()||null,
    };
    const { error } = state.form.id
      ? await ctx.supabase.from('sk_products').update(payload).eq('id', state.form.id)
      : await ctx.supabase.from('sk_products').insert(payload);
    state.saving = false;
    if(error){ alert('Lỗi: ' + error.message); draw(); return; }
    state.form = null;
    await load();
  }

  async function remove(id){
    if(!(await confirmModal('Xoá sản phẩm này?'))) return;
    await ctx.supabase.from('sk_products').delete().eq('id', id);
    await load();
  }

  function html(){
    return `
      ${state.form ? `
        <div class="card" style="margin-bottom:20px;">
          <div class="field"><label>Tên sản phẩm</label><input type="text" id="sp-name" value="${esc(state.form.name)}"></div>
          <div class="field" style="margin-top:12px;"><label>Mô tả ngắn</label><textarea id="sp-desc">${esc(state.form.short_description)}</textarea></div>
          <div class="field" style="margin-top:12px;"><label>Công dụng</label><textarea id="sp-benefits">${esc(state.form.benefits)}</textarea></div>
          <div class="field" style="margin-top:12px;"><label>Giá bán lẻ (đ)</label><input type="number" id="sp-price" value="${esc(state.form.retail_price)}"></div>
          <div class="field" style="margin-top:12px;"><label>Link ảnh (URL)</label><input type="text" id="sp-image" value="${esc(state.form.image_url)}" placeholder="https://..."></div>
          <div class="btn-row" style="justify-content:flex-start;margin-top:16px;">
            <button class="btn btn-sm" id="sp-save" ${state.saving?'disabled':''}>${state.saving?'Đang lưu…':'Lưu'}</button>
            <span class="btn-ghost btn btn-sm" id="sp-cancel">Huỷ</span>
          </div>
        </div>
      ` : `<button class="btn btn-sm" id="sp-new" style="margin-bottom:18px;">+ Thêm sản phẩm</button>`}

      ${state.list.map(p=>`
        <div class="section" style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;">
          <div>
            <div style="font-weight:600;font-size:14.5px;">${esc(p.name)}</div>
            ${p.retail_price!=null ? `<div style="font-size:13px;color:var(--ink-soft);">${Number(p.retail_price).toLocaleString('vi-VN')}đ</div>` : ''}
          </div>
          <div style="display:flex;gap:8px;flex-shrink:0;">
            <span class="btn-ghost btn btn-sm" data-edit="${p.id}">Sửa</span>
            <span class="btn-ghost btn btn-sm" style="color:var(--danger);" data-remove="${p.id}">Xoá</span>
          </div>
        </div>
      `).join('')}
      ${state.list.length===0 ? `<div style="color:var(--ink-soft);font-size:14px;">Chưa có sản phẩm nào.</div>` : ''}
    `;
  }

  function bind(){
    const newBtn = container.querySelector('#sp-new'); if(newBtn) newBtn.onclick = openNew;
    const cancelBtn = container.querySelector('#sp-cancel'); if(cancelBtn) cancelBtn.onclick = ()=>{ state.form=null; draw(); };
    const saveBtn = container.querySelector('#sp-save'); if(saveBtn) saveBtn.onclick = save;
    const nameEl = container.querySelector('#sp-name'); if(nameEl) nameEl.oninput = (e)=>{ state.form.name = e.target.value; };
    const descEl = container.querySelector('#sp-desc'); if(descEl) descEl.oninput = (e)=>{ state.form.short_description = e.target.value; };
    const benefitsEl = container.querySelector('#sp-benefits'); if(benefitsEl) benefitsEl.oninput = (e)=>{ state.form.benefits = e.target.value; };
    const priceEl = container.querySelector('#sp-price'); if(priceEl) priceEl.oninput = (e)=>{ state.form.retail_price = e.target.value; };
    const imageEl = container.querySelector('#sp-image'); if(imageEl) imageEl.oninput = (e)=>{ state.form.image_url = e.target.value; };
    container.querySelectorAll('[data-edit]').forEach(el=>{
      el.onclick = ()=>{ openEdit(state.list.find(p=>p.id===el.getAttribute('data-edit'))); };
    });
    container.querySelectorAll('[data-remove]').forEach(el=>{
      el.onclick = ()=>remove(el.getAttribute('data-remove'));
    });
  }

  draw();
  load();
}

// ===== Tab "Gói & Lịch Trình" — CRUD sk_packages + sk_package_schedule_items =====
function renderGoiLichTrinh(container, ctx){
  const state = { packages:[], selectedPackageId:null, items:[], newPackageName:'', newPackageDesc:'', savingPackage:false, itemForm:null, savingItem:false };

  function draw(){ container.innerHTML = html(); bind(); }

  async function loadPackages(){
    const { data } = await ctx.supabase.from('sk_packages').select('*').order('created_at', { ascending:false });
    state.packages = data || [];
    if(!state.selectedPackageId && state.packages.length>0) state.selectedPackageId = state.packages[0].id;
    draw();
    if(state.selectedPackageId) await loadItems();
  }

  async function loadItems(){
    const { data } = await ctx.supabase.from('sk_package_schedule_items').select('*').eq('package_id', state.selectedPackageId).order('day_offset', { ascending:true });
    state.items = data || [];
    draw();
  }

  async function addPackage(){
    if(!state.newPackageName.trim()) return;
    state.savingPackage = true; draw();
    const { error } = await ctx.supabase.from('sk_packages').insert({ name: state.newPackageName.trim(), description: state.newPackageDesc.trim()||null });
    state.savingPackage = false;
    if(error){ alert('Lỗi: ' + error.message); draw(); return; }
    state.newPackageName = ''; state.newPackageDesc = '';
    await loadPackages();
  }

  async function removePackage(id){
    if(!(await confirmModal('Xoá gói này? Toàn bộ lịch trình của gói cũng bị xoá theo.'))) return;
    await ctx.supabase.from('sk_packages').delete().eq('id', id);
    if(state.selectedPackageId===id) state.selectedPackageId = null;
    await loadPackages();
  }

  function newItemForm(){ return { id:null, day_offset:0, title:'', description:'' }; }
  function openNewItem(){ state.itemForm = newItemForm(); draw(); }
  function openEditItem(item){ state.itemForm = { ...item }; draw(); }

  async function saveItem(){
    if(!state.itemForm.title.trim()) return;
    state.savingItem = true; draw();
    const payload = { package_id: state.selectedPackageId, day_offset: Number(state.itemForm.day_offset)||0, title: state.itemForm.title.trim(), description: state.itemForm.description.trim()||null };
    const { error } = state.itemForm.id
      ? await ctx.supabase.from('sk_package_schedule_items').update(payload).eq('id', state.itemForm.id)
      : await ctx.supabase.from('sk_package_schedule_items').insert(payload);
    state.savingItem = false;
    if(error){ alert('Lỗi: ' + error.message); draw(); return; }
    state.itemForm = null;
    await loadItems();
  }

  async function removeItem(id){
    if(!(await confirmModal('Xoá mục lịch trình này?'))) return;
    await ctx.supabase.from('sk_package_schedule_items').delete().eq('id', id);
    await loadItems();
  }

  function html(){
    return `
      <div class="card" style="margin-bottom:20px;">
        <label style="display:block;font-size:13px;font-weight:600;color:var(--ink-soft);">Thêm gói mới</label>
        <input type="text" id="gt-new-name" value="${esc(state.newPackageName)}" placeholder="Tên gói, VD: Detox 30 ngày">
        <textarea id="gt-new-desc" placeholder="Mô tả ngắn (không bắt buộc)">${esc(state.newPackageDesc)}</textarea>
        <button class="btn btn-sm" style="margin-top:10px;" id="gt-add-package" ${state.savingPackage?'disabled':''}>${state.savingPackage?'Đang lưu…':'Thêm gói'}</button>
      </div>

      ${state.packages.length===0 ? `<div style="color:var(--ink-soft);font-size:14px;">Chưa có gói nào.</div>` : `
        <div class="chips" style="margin-bottom:20px;">
          ${state.packages.map(p=>`<div class="chip ${state.selectedPackageId===p.id?'selected':''}" data-select-package="${p.id}">${esc(p.name)}</div>`).join('')}
        </div>
      `}

      ${state.selectedPackageId ? (()=>{
        const pkg = state.packages.find(p=>p.id===state.selectedPackageId);
        return `
        <div class="page-head" style="margin-bottom:10px;">
          <h2 style="font-size:17px;">Lịch trình — ${esc(pkg ? pkg.name : '')}</h2>
          <span class="btn-ghost btn btn-sm" style="color:var(--danger);margin-top:8px;display:inline-block;" data-remove-package="${state.selectedPackageId}">Xoá gói này</span>
        </div>

        ${state.itemForm ? `
          <div class="card" style="margin-bottom:16px;">
            <label style="display:block;font-size:13px;font-weight:600;color:var(--ink-soft);">Ngày thứ (tính từ lúc bắt đầu gói)</label>
            <input type="number" id="gt-item-offset" value="${esc(state.itemForm.day_offset)}">
            <label style="display:block;font-size:13px;font-weight:600;color:var(--ink-soft);margin-top:12px;">Tiêu đề</label>
            <input type="text" id="gt-item-title" value="${esc(state.itemForm.title)}" placeholder="VD: Bắt đầu uống Bios Life mỗi sáng">
            <label style="display:block;font-size:13px;font-weight:600;color:var(--ink-soft);margin-top:12px;">Mô tả</label>
            <textarea id="gt-item-desc">${esc(state.itemForm.description)}</textarea>
            <div class="btn-row" style="justify-content:flex-start;margin-top:14px;">
              <button class="btn btn-sm" id="gt-item-save" ${state.savingItem?'disabled':''}>${state.savingItem?'Đang lưu…':'Lưu'}</button>
              <span class="btn-ghost btn btn-sm" id="gt-item-cancel">Huỷ</span>
            </div>
          </div>
        ` : `<button class="btn btn-sm" id="gt-item-new" style="margin-bottom:16px;">+ Thêm mục lịch trình</button>`}

        ${state.items.map(item=>`
          <div class="section" style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;">
            <div>
              <div class="meta">Ngày ${item.day_offset}</div>
              <div style="font-weight:600;font-size:14px;">${esc(item.title)}</div>
              ${item.description ? `<div style="font-size:13px;color:var(--ink-soft);margin-top:4px;">${esc(item.description)}</div>` : ''}
            </div>
            <div style="display:flex;gap:8px;flex-shrink:0;">
              <span class="btn-ghost btn btn-sm" data-edit-item="${item.id}">Sửa</span>
              <span class="btn-ghost btn btn-sm" style="color:var(--danger);" data-remove-item="${item.id}">Xoá</span>
            </div>
          </div>
        `).join('')}
        ${state.items.length===0 ? `<div style="color:var(--ink-soft);font-size:14px;">Gói này chưa có mục lịch trình nào.</div>` : ''}
      `;
      })() : ''}
    `;
  }

  function bind(){
    const nameEl = container.querySelector('#gt-new-name'); if(nameEl) nameEl.oninput = (e)=>{ state.newPackageName = e.target.value; };
    const descEl = container.querySelector('#gt-new-desc'); if(descEl) descEl.oninput = (e)=>{ state.newPackageDesc = e.target.value; };
    const addBtn = container.querySelector('#gt-add-package'); if(addBtn) addBtn.onclick = addPackage;
    container.querySelectorAll('[data-select-package]').forEach(el=>{
      el.onclick = ()=>{ state.selectedPackageId = el.getAttribute('data-select-package'); state.itemForm = null; draw(); loadItems(); };
    });
    const removePkgBtn = container.querySelector('[data-remove-package]');
    if(removePkgBtn) removePkgBtn.onclick = ()=>removePackage(removePkgBtn.getAttribute('data-remove-package'));

    const newItemBtn = container.querySelector('#gt-item-new'); if(newItemBtn) newItemBtn.onclick = openNewItem;
    const cancelItemBtn = container.querySelector('#gt-item-cancel'); if(cancelItemBtn) cancelItemBtn.onclick = ()=>{ state.itemForm=null; draw(); };
    const saveItemBtn = container.querySelector('#gt-item-save'); if(saveItemBtn) saveItemBtn.onclick = saveItem;
    const offsetEl = container.querySelector('#gt-item-offset'); if(offsetEl) offsetEl.oninput = (e)=>{ state.itemForm.day_offset = e.target.value; };
    const titleEl = container.querySelector('#gt-item-title'); if(titleEl) titleEl.oninput = (e)=>{ state.itemForm.title = e.target.value; };
    const itemDescEl = container.querySelector('#gt-item-desc'); if(itemDescEl) itemDescEl.oninput = (e)=>{ state.itemForm.description = e.target.value; };
    container.querySelectorAll('[data-edit-item]').forEach(el=>{
      el.onclick = ()=>{ openEditItem(state.items.find(i=>i.id===el.getAttribute('data-edit-item'))); };
    });
    container.querySelectorAll('[data-remove-item]').forEach(el=>{
      el.onclick = ()=>removeItem(el.getAttribute('data-remove-item'));
    });
  }

  draw();
  loadPackages();
}

// ===== Tab "Thành Viên" — gán gói + nhập điểm/hoa hồng =====
function renderThanhVien(container, ctx){
  const state = { loading:true, rows:[], packages:[], search:'', busyId:null, pointsFormFor:null, pointsForm:{ month:new Date().toISOString().slice(0,7), points:'', purchase_amount:'', commission:'', note:'' },
    anyQuery:'', anySearching:false, anySearched:false, anyResults:[] };

  function draw(){ container.innerHTML = html(); bind(); }

  async function load(){
    state.loading = true; draw();
    const [{ data: rows }, { data: packages }] = await Promise.all([
      // Chỉ lấy người ĐÃ TỪNG vào app suc-khoe (sk_first_visited_at chỉ set ở loadProfile() của
      // suc-khoe/js/app-shell.js) — profiles là bảng CHUNG giữa mọi app, không lọc sẽ lẫn người chỉ
      // dùng nhan-hieu/tai-chinh/san-pham-so.
      ctx.supabase.from('profiles').select('id,email,full_name,role,sk_package_id,sk_package_started_at,sk_first_visited_at').not('sk_first_visited_at', 'is', null).order('sk_first_visited_at', { ascending:false }).limit(200),
      ctx.supabase.from('sk_packages').select('id,name'),
    ]);
    state.rows = rows || [];
    state.packages = packages || [];
    state.loading = false;
    draw();
  }

  function packageName(id){ const p = state.packages.find(x=>x.id===id); return p ? p.name : null; }

  // Tìm & gán gói cho khách MUA TRƯỚC ĐÓ, không qua app (2026-09-05, chị Quỳnh: "khách hàng nào đã
  // mua sản phẩm từ trc chứ k phải mua qua app thì cần có nút gán gói sản phẩm riêng chứ") — danh
  // sách chính ở dưới CHỈ lọc người đã từng mở app suc-khoe (sk_first_visited_at), nên khách chị bán
  // trực tiếp mà chưa từng đăng nhập app sẽ không hiện ở đó. Ô tìm này tra CẢ profiles (không lọc
  // sk_first_visited_at) theo email/tên — khách đó vẫn cần có TÀI KHOẢN sẵn (đã đăng ký, dù chưa mở
  // app suc-khoe lần nào) mới gán được, vì gán gói chỉ là update 1 cột trên profiles có sẵn.
  async function searchAnyProfile(){
    const q = state.anyQuery.trim();
    if(!q){ state.anySearched = true; state.anyResults = []; draw(); return; }
    state.anySearching = true; state.anySearched = true; draw();
    const { data } = await ctx.supabase.from('profiles').select('id,email,full_name,sk_package_id')
      .or(`email.ilike.%${q}%,full_name.ilike.%${q}%`).limit(20);
    state.anyResults = data || [];
    state.anySearching = false;
    draw();
  }

  async function assignPackage(userId, packageId){
    state.busyId = userId; draw();
    await ctx.supabase.from('profiles').update({
      sk_package_id: packageId || null,
      sk_package_started_at: packageId ? new Date().toISOString() : null,
    }).eq('id', userId);
    state.busyId = null;
    // Cập nhật ngay dòng trong kết quả tìm "khách bất kỳ" (nếu có) — khỏi phải tìm lại mới thấy đổi.
    const anyRow = state.anyResults.find(r=>r.id===userId);
    if(anyRow) anyRow.sk_package_id = packageId || null;
    await load();
  }

  async function submitPoints(userId){
    const f = state.pointsForm;
    state.busyId = userId; draw();
    const { error } = await ctx.supabase.from('sk_points_ledger').insert({
      user_id: userId, month: f.month, points: Number(f.points)||0,
      purchase_amount: Number(f.purchase_amount)||0, commission: Number(f.commission)||0, note: f.note.trim()||null,
    });
    state.busyId = null;
    if(error){ alert('Lỗi: ' + error.message); draw(); return; }
    state.pointsFormFor = null;
    state.pointsForm = { month:new Date().toISOString().slice(0,7), points:'', purchase_amount:'', commission:'', note:'' };
    draw();
  }

  function html(){
    const filtered = state.search.trim()
      ? state.rows.filter(r => (r.email||'').toLowerCase().includes(state.search.toLowerCase()) || (r.full_name||'').toLowerCase().includes(state.search.toLowerCase()))
      : state.rows;
    return `
      <div class="card" style="margin-bottom:20px;">
        <h3 style="margin-bottom:6px;">Gán gói cho khách mua trước đó (chưa từng vào app)</h3>
        <div class="hint-box" style="margin-bottom:12px;">Danh sách bên dưới chỉ hiện người ĐÃ TỪNG mở app này. Khách chị bán trực tiếp (chưa đăng nhập app suc-khoe lần nào) sẽ không hiện ở đó — tìm theo email/tên ở đây để gán gói cho họ (khách cần đã có tài khoản trong hệ sinh thái Hiểu, dù chưa mở app này).</div>
        <div style="display:flex;gap:8px;">
          <input type="text" id="any-search" placeholder="Nhập email hoặc tên..." value="${esc(state.anyQuery)}" style="margin:0;flex:1;">
          <button class="btn btn-sm" id="any-search-btn" ${state.anySearching?'disabled':''}>${state.anySearching?'Đang tìm…':'Tìm'}</button>
        </div>
        ${state.anySearched && !state.anySearching ? (
          state.anyResults.length===0
            ? `<div style="color:var(--ink-soft);font-size:13.5px;margin-top:10px;">Không tìm thấy tài khoản nào khớp — khách cần tự đăng ký tài khoản trước (ở bất kỳ app nào trong hệ sinh thái Hiểu) thì mới gán gói được.</div>`
            : state.anyResults.map(r=>`
              <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;border-top:1px solid var(--line);padding-top:10px;margin-top:10px;">
                <div>
                  <div style="font-weight:600;font-size:13.5px;">${esc(r.full_name||'(chưa đặt tên)')}</div>
                  <div style="font-size:12.5px;color:var(--ink-soft);">${esc(r.email||'')} · Gói hiện tại: ${esc(packageName(r.sk_package_id) || 'chưa có')}</div>
                </div>
                <select data-assign="${r.id}" ${state.busyId===r.id?'disabled':''} style="margin:0;width:auto;min-width:160px;">
                  <option value="">— Chưa gán gói —</option>
                  ${state.packages.map(p=>`<option value="${p.id}" ${r.sk_package_id===p.id?'selected':''}>${esc(p.name)}</option>`).join('')}
                </select>
              </div>
            `).join('')
        ) : ''}
      </div>

      <input type="text" id="tv2-search" placeholder="Tìm theo email hoặc tên..." value="${esc(state.search)}" style="margin-bottom:16px;">
      ${state.loading ? `<div class="loading"><div class="spinner"></div></div>` : filtered.map(r=>`
        <div class="section">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;flex-wrap:wrap;">
            <div>
              <div style="font-weight:600;font-size:14px;">${esc(r.full_name||'(chưa đặt tên)')} ${r.role==='admin'?'<span style="font-size:11px;color:var(--gold);">Admin</span>':''}</div>
              <div style="font-size:12.5px;color:var(--ink-soft);margin-top:2px;">${esc(r.email||'')}</div>
              <div style="font-size:12px;color:var(--ink-soft);margin-top:4px;">Gói hiện tại: ${esc(packageName(r.sk_package_id) || 'chưa có')}</div>
            </div>
          </div>
          <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-top:10px;">
            <select data-assign="${r.id}" ${state.busyId===r.id?'disabled':''} style="margin:0;width:auto;flex:1;min-width:160px;">
              <option value="">— Chưa gán gói —</option>
              ${state.packages.map(p=>`<option value="${p.id}" ${r.sk_package_id===p.id?'selected':''}>${esc(p.name)}</option>`).join('')}
            </select>
            <span class="btn-ghost btn btn-sm" data-add-points="${r.id}">+ Ghi điểm/hoa hồng</span>
          </div>
          ${state.pointsFormFor===r.id ? `
            <div class="card" style="margin-top:12px;">
              <label style="display:block;font-size:12.5px;font-weight:600;color:var(--ink-soft);">Tháng (YYYY-MM)</label>
              <input type="text" id="pf-month" value="${esc(state.pointsForm.month)}">
              <label style="display:block;font-size:12.5px;font-weight:600;color:var(--ink-soft);margin-top:10px;">Điểm</label>
              <input type="number" id="pf-points" value="${esc(state.pointsForm.points)}">
              <label style="display:block;font-size:12.5px;font-weight:600;color:var(--ink-soft);margin-top:10px;">Giá trị mua (đ)</label>
              <input type="number" id="pf-purchase" value="${esc(state.pointsForm.purchase_amount)}">
              <label style="display:block;font-size:12.5px;font-weight:600;color:var(--ink-soft);margin-top:10px;">Hoa hồng (đ)</label>
              <input type="number" id="pf-commission" value="${esc(state.pointsForm.commission)}">
              <label style="display:block;font-size:12.5px;font-weight:600;color:var(--ink-soft);margin-top:10px;">Ghi chú</label>
              <input type="text" id="pf-note" value="${esc(state.pointsForm.note)}">
              <div class="btn-row" style="justify-content:flex-start;margin-top:12px;">
                <button class="btn btn-sm" data-submit-points="${r.id}" ${state.busyId===r.id?'disabled':''}>Lưu</button>
                <span class="btn-ghost btn btn-sm" id="pf-cancel">Huỷ</span>
              </div>
            </div>
          ` : ''}
        </div>
      `).join('')}
      ${!state.loading && filtered.length===0 ? `<div style="color:var(--ink-soft);font-size:14px;">Không có kết quả.</div>` : ''}
    `;
  }

  function bind(){
    const anySearchEl = container.querySelector('#any-search');
    if(anySearchEl) anySearchEl.oninput = (e)=>{ state.anyQuery = e.target.value; };
    const anySearchBtn = container.querySelector('#any-search-btn');
    if(anySearchBtn) anySearchBtn.onclick = searchAnyProfile;
    const searchEl = container.querySelector('#tv2-search');
    if(searchEl) searchEl.oninput = (e)=>{
      state.search = e.target.value;
      const pos = searchEl.selectionStart;
      draw();
      const newEl = container.querySelector('#tv2-search');
      if(newEl){ newEl.focus(); newEl.setSelectionRange(pos, pos); }
    };
    container.querySelectorAll('[data-assign]').forEach(el=>{
      el.onchange = ()=>assignPackage(el.getAttribute('data-assign'), el.value);
    });
    container.querySelectorAll('[data-add-points]').forEach(el=>{
      el.onclick = ()=>{ state.pointsFormFor = el.getAttribute('data-add-points'); draw(); };
    });
    const cancelBtn = container.querySelector('#pf-cancel'); if(cancelBtn) cancelBtn.onclick = ()=>{ state.pointsFormFor=null; draw(); };
    const monthEl = container.querySelector('#pf-month'); if(monthEl) monthEl.oninput = (e)=>{ state.pointsForm.month = e.target.value; };
    const pointsEl = container.querySelector('#pf-points'); if(pointsEl) pointsEl.oninput = (e)=>{ state.pointsForm.points = e.target.value; };
    const purchaseEl = container.querySelector('#pf-purchase'); if(purchaseEl) purchaseEl.oninput = (e)=>{ state.pointsForm.purchase_amount = e.target.value; };
    const commissionEl = container.querySelector('#pf-commission'); if(commissionEl) commissionEl.oninput = (e)=>{ state.pointsForm.commission = e.target.value; };
    const noteEl = container.querySelector('#pf-note'); if(noteEl) noteEl.oninput = (e)=>{ state.pointsForm.note = e.target.value; };
    container.querySelectorAll('[data-submit-points]').forEach(el=>{
      el.onclick = ()=>submitPoints(el.getAttribute('data-submit-points'));
    });
  }

  load();
}

// ===== Tab "Đơn Hàng" — xem đơn khách đặt qua app (2026-08-30) + đổi trạng thái. status="da_xac_nhan"
// là mốc để PV cộng vào tháng đó (xem tich-diem-hoa-hong.js) — chỉ đổi khi ĐÃ thật sự liên hệ và chốt
// được đơn với khách, vì đây là nguồn duy nhất tính PV/tháng cho khách.
const SK_ORDER_STATUS_LABELS = { cho_xac_nhan:'Chờ xác nhận', da_xac_nhan:'Đã xác nhận', da_giao:'Đã giao', huy:'Đã huỷ' };
const SK_ORDER_GIFT_LABELS = { binh_lac:'🎁 Bình lắc', binh_lac_son:'🎁 Bình lắc + Son Hàn' };
const SK_GIFT_COLOR_LABELS = { '503':'#503 Hồng Seoul', '505':'#505 Cam Cà Rốt' };

function renderDonHang(container, ctx){
  const state = { loading:true, orders:[], profileById:{}, busyId:null };

  function draw(){ container.innerHTML = html(); bind(); }

  async function load(){
    state.loading = true; draw();
    const { data: orders } = await ctx.supabase.from('sk_orders').select('*').order('created_at', { ascending:false }).limit(200);
    state.orders = orders || [];
    const userIds = [...new Set(state.orders.map(o=>o.user_id))];
    if(userIds.length>0){
      const { data: profiles } = await ctx.supabase.from('profiles').select('id,email,full_name').in('id', userIds);
      (profiles||[]).forEach(p=>{ state.profileById[p.id] = p; });
    }
    state.loading = false;
    draw();
  }

  async function updateStatus(orderId, status){
    state.busyId = orderId; draw();
    await ctx.supabase.from('sk_orders').update({ status }).eq('id', orderId);
    state.busyId = null;
    await load();
  }

  function html(){
    if(state.loading) return `<div class="loading"><div class="spinner"></div></div>`;
    if(state.orders.length===0) return `<div style="color:var(--ink-soft);font-size:14px;">Chưa có đơn hàng nào.</div>`;
    return state.orders.map(o=>{
      const profile = state.profileById[o.user_id] || {};
      const items = Array.isArray(o.items) ? o.items : [];
      return `
        <div class="section">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;flex-wrap:wrap;">
            <div>
              <div style="font-weight:600;font-size:14px;">${esc(profile.full_name||'(chưa đặt tên)')}</div>
              <div style="font-size:12.5px;color:var(--ink-soft);margin-top:2px;">${esc(profile.email||'')} · ${esc(new Date(o.created_at).toLocaleString('vi-VN'))}</div>
            </div>
            <select data-order-status="${esc(o.id)}" ${state.busyId===o.id?'disabled':''}>
              ${Object.keys(SK_ORDER_STATUS_LABELS).map(k=>`<option value="${k}" ${o.status===k?'selected':''}>${esc(SK_ORDER_STATUS_LABELS[k])}</option>`).join('')}
            </select>
          </div>
          <div style="font-size:13.5px;margin-top:10px;line-height:1.7;">
            ${items.map(it=>`${esc(it.name)} — ${Number(it.price||0).toLocaleString('vi-VN')}đ`).join('<br>')}
          </div>
          <div style="font-size:13.5px;margin-top:8px;">
            <b>Tổng: ${Number(o.total_amount||0).toLocaleString('vi-VN')}đ</b> · ${o.total_pv||0} PV
            ${o.gift ? ` · ${esc(SK_ORDER_GIFT_LABELS[o.gift]||o.gift)}` : ''}
            ${o.gift_color ? ` (màu son: ${esc(SK_GIFT_COLOR_LABELS[o.gift_color]||o.gift_color)})` : ''}
          </div>
          ${o.gift ? `
            <div style="display:flex;gap:8px;margin-top:8px;">
              <img src="${esc(SK_GIFT_SHAKER_IMAGE)}" alt="Bình lắc" title="Bình lắc" style="width:52px;height:52px;object-fit:cover;border-radius:8px;">
              ${o.gift_color ? `<img src="${esc((SK_LIPSTICK_COLORS.find(c=>c.key===o.gift_color)||{}).image)}" alt="Son ${esc(SK_GIFT_COLOR_LABELS[o.gift_color]||'')}" title="Son ${esc(SK_GIFT_COLOR_LABELS[o.gift_color]||'')}" style="width:52px;height:52px;object-fit:cover;border-radius:8px;">` : ''}
            </div>
          ` : ''}
          <div style="font-size:13px;color:var(--ink-soft);margin-top:8px;">
            Giao tới: ${esc(o.shipping_name)} · ${esc(o.shipping_phone)}<br>${esc(o.shipping_address)}
            ${o.note ? `<br>Ghi chú: ${esc(o.note)}` : ''}
          </div>
        </div>
      `;
    }).join('');
  }

  function bind(){
    container.querySelectorAll('[data-order-status]').forEach(el=>{
      el.onchange = (e)=>updateStatus(el.getAttribute('data-order-status'), e.target.value);
    });
  }

  load();
}

// ===== Tab "Câu Chuyện Thành Công" — CRUD sk_success_stories (2026-08-31, chị Quỳnh: "để 1 mục
// riêng") — ảnh upload nén thành data URL lưu thẳng vào cột images, copy đúng pattern
// tro-ly-crm/js/case-study.js (đã có sẵn upload+nén ảnh) thay vì cần Supabase Storage riêng.
const CAU_CHUYEN_MAX_IMAGES = 3;
function renderCauChuyen(container, ctx){
  const state = { loading:true, items:[], showForm:false, form:null, saving:false, error:'', deletingId:null };

  function draw(){ container.innerHTML = html(); bind(); }

  async function load(){
    state.loading = true; draw();
    const { data } = await ctx.supabase.from('sk_success_stories').select('*').order('created_at', { ascending:false });
    state.items = data || [];
    state.loading = false;
    draw();
  }

  function openForm(item){
    state.showForm = true; state.error = '';
    state.form = item
      ? { id:item.id, display_name:item.display_name||'', story:item.story||'', images:item.images||[], category:item.category||'' }
      : { id:null, display_name:'', story:'', images:[], category:'' };
    draw();
  }
  function closeForm(){ state.showForm = false; state.form = null; draw(); }

  function handleFiles(files){
    const f = state.form;
    Array.from(files).slice(0, CAU_CHUYEN_MAX_IMAGES - f.images.length).forEach((file)=>{
      const reader = new FileReader();
      reader.onload = ()=>{
        const img = new Image();
        img.onload = ()=>{
          const maxW = 1000;
          const scale = Math.min(1, maxW / img.width);
          const w = Math.round(img.width * scale), h = Math.round(img.height * scale);
          const c = document.createElement('canvas');
          c.width = w; c.height = h;
          c.getContext('2d').drawImage(img, 0, 0, w, h);
          f.images = [...f.images, c.toDataURL('image/jpeg', 0.82)].slice(0, CAU_CHUYEN_MAX_IMAGES);
          draw();
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }
  function removeImage(idx){
    state.form.images = state.form.images.filter((_,i)=>i!==idx);
    draw();
  }

  async function saveForm(){
    const f = state.form;
    if(!f.display_name.trim()){ state.error = 'Nhập tên hiển thị (thật hoặc viết tắt).'; draw(); return; }
    if(!f.story.trim()){ state.error = 'Nhập câu chuyện của case này.'; draw(); return; }
    state.saving = true; state.error = ''; draw();
    const payload = { display_name:f.display_name.trim(), story:f.story.trim(), images:f.images, category:f.category||null };
    const { error } = f.id
      ? await ctx.supabase.from('sk_success_stories').update(payload).eq('id', f.id)
      : await ctx.supabase.from('sk_success_stories').insert(payload);
    state.saving = false;
    if(error){ state.error = error.message; draw(); return; }
    state.showForm = false; state.form = null;
    await load();
  }

  async function deleteItem(id){
    if(!(await confirmModal('Xoá câu chuyện này?'))) return;
    state.deletingId = id; draw();
    await ctx.supabase.from('sk_success_stories').delete().eq('id', id);
    state.deletingId = null;
    await load();
  }

  function itemRowHtml(item){
    const catLabel = (SK_PRODUCT_CATEGORIES.find(c=>c.key===item.category)||{}).label;
    return `
      <div class="section" style="display:flex;gap:12px;align-items:flex-start;">
        ${item.images && item.images[0] ? `<img src="${item.images[0]}" style="width:56px;height:56px;object-fit:cover;border-radius:8px;flex-shrink:0;">` : ''}
        <div style="flex:1;min-width:0;">
          <div style="font-weight:700;">${esc(item.display_name)}${catLabel ? ` <span style="font-size:11.5px;font-weight:400;color:var(--ink-soft);">· ${esc(catLabel)}</span>` : ''}</div>
          <div style="font-size:13px;color:var(--ink-soft);margin-top:4px;">${esc((item.story||'').slice(0,140))}${(item.story||'').length>140?'…':''}</div>
        </div>
        <div style="display:flex;gap:8px;flex-shrink:0;">
          <span class="btn-ghost btn btn-sm" data-edit="${item.id}">Sửa</span>
          <span class="btn-ghost btn btn-sm" style="color:var(--danger);${state.deletingId===item.id?'opacity:.6;pointer-events:none;':''}" data-delete="${item.id}">${state.deletingId===item.id?'Đang xoá…':'Xoá'}</span>
        </div>
      </div>
    `;
  }

  function formHtml(){
    const f = state.form;
    return `
      <div id="cc-form-overlay" style="position:fixed;inset:0;z-index:9998;background:rgba(20,24,20,.6);display:flex;justify-content:center;padding:24px 16px;overflow-y:auto;">
        <div data-modal-box style="background:#fff;border-radius:14px;max-width:520px;width:100%;padding:26px 24px;box-shadow:0 12px 40px rgba(0,0,0,.4);height:fit-content;margin:0 auto;">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;margin-bottom:6px;">
            <h2 style="font-size:18px;">${f.id ? 'Sửa câu chuyện' : 'Thêm câu chuyện'}</h2>
            <span id="cc-form-close" style="cursor:pointer;font-size:20px;color:var(--ink-soft);line-height:1;">✕</span>
          </div>
          ${state.error ? `<div class="error-box">${esc(state.error)}</div>` : ''}
          <label style="display:block;font-size:12.5px;font-weight:600;color:var(--ink-soft);margin-top:12px;">Tên hiển thị</label>
          <input type="text" id="cc-name" value="${esc(f.display_name)}" placeholder="Tên thật hoặc viết tắt, tuỳ khách đồng ý">
          <label style="display:block;font-size:12.5px;font-weight:600;color:var(--ink-soft);margin-top:12px;">Nhánh liên quan (không bắt buộc)</label>
          <select id="cc-category">
            <option value="" ${!f.category?'selected':''}>— Chung, không gắn nhánh —</option>
            ${SK_PRODUCT_CATEGORIES.map(c=>`<option value="${c.key}" ${f.category===c.key?'selected':''}>${esc(c.label)}</option>`).join('')}
          </select>
          <label style="display:block;font-size:12.5px;font-weight:600;color:var(--ink-soft);margin-top:12px;">Câu chuyện</label>
          <textarea id="cc-story" style="min-height:140px;" placeholder="Trước đây thế nào, đã dùng sản phẩm/gói gì, kết quả ra sao...">${esc(f.story)}</textarea>
          <label style="display:block;font-size:12.5px;font-weight:600;color:var(--ink-soft);margin-top:12px;">Hình ảnh (tối đa ${CAU_CHUYEN_MAX_IMAGES})</label>
          <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:8px;">
            ${f.images.map((src,i)=>`
              <div style="position:relative;width:80px;height:80px;">
                <img src="${src}" style="width:100%;height:100%;object-fit:cover;border-radius:10px;border:1px solid var(--line);">
                <span data-remove-img="${i}" style="position:absolute;top:-6px;right:-6px;background:var(--danger);color:#fff;width:20px;height:20px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;cursor:pointer;">✕</span>
              </div>
            `).join('')}
            ${f.images.length<CAU_CHUYEN_MAX_IMAGES ? `<label style="width:80px;height:80px;border:1px dashed var(--line);border-radius:10px;display:flex;align-items:center;justify-content:center;cursor:pointer;color:var(--ink-soft);font-size:22px;">+<input type="file" accept="image/*" multiple id="cc-file" style="display:none;"></label>` : ''}
          </div>
          <div class="btn-row" style="justify-content:flex-start;margin-top:18px;">
            <button class="btn btn-sm" id="cc-form-save" ${state.saving?'disabled':''}>${state.saving?'Đang lưu…':'Lưu'}</button>
            <span class="btn-ghost btn btn-sm" id="cc-form-cancel">Huỷ</span>
          </div>
        </div>
      </div>
    `;
  }

  function html(){
    return `
      <div class="btn-row" style="justify-content:flex-start;margin-top:0;margin-bottom:18px;">
        <button class="btn btn-sm" id="cc-new">+ Thêm câu chuyện</button>
      </div>
      ${state.loading ? `<div class="loading"><div class="spinner"></div></div>` : (
        state.items.length === 0
          ? `<div style="color:var(--ink-soft);font-size:14px;">Chưa có câu chuyện nào — bấm "+ Thêm câu chuyện" để thêm case đầu tiên.</div>`
          : state.items.map(itemRowHtml).join('')
      )}
      ${state.showForm ? formHtml() : ''}
    `;
  }

  function bind(){
    const newBtn = container.querySelector('#cc-new');
    if(newBtn) newBtn.onclick = ()=>openForm(null);
    container.querySelectorAll('[data-edit]').forEach(el=>{
      el.onclick = ()=>openForm(state.items.find(i=>i.id===el.getAttribute('data-edit')));
    });
    container.querySelectorAll('[data-delete]').forEach(el=>{
      el.onclick = ()=>deleteItem(el.getAttribute('data-delete'));
    });

    const formOverlay = container.querySelector('#cc-form-overlay');
    if(formOverlay){
      formOverlay.onclick = closeForm;
      const box = formOverlay.querySelector('[data-modal-box]');
      if(box) box.onclick = (e)=>e.stopPropagation();
      const closeBtn = container.querySelector('#cc-form-close');
      if(closeBtn) closeBtn.onclick = closeForm;
      const cancelBtn = container.querySelector('#cc-form-cancel');
      if(cancelBtn) cancelBtn.onclick = closeForm;
      const nameEl = container.querySelector('#cc-name');
      if(nameEl) nameEl.oninput = (e)=>{ state.form.display_name = e.target.value; };
      const catEl = container.querySelector('#cc-category');
      if(catEl) catEl.onchange = (e)=>{ state.form.category = e.target.value; };
      const storyEl = container.querySelector('#cc-story');
      if(storyEl) storyEl.oninput = (e)=>{ state.form.story = e.target.value; };
      const fileEl = container.querySelector('#cc-file');
      if(fileEl) fileEl.onchange = ()=>{ if(fileEl.files.length) handleFiles(fileEl.files); };
      container.querySelectorAll('[data-remove-img]').forEach(el=>{
        el.onclick = ()=>removeImage(Number(el.getAttribute('data-remove-img')));
      });
      const saveBtn = container.querySelector('#cc-form-save');
      if(saveBtn) saveBtn.onclick = saveForm;
    }
  }

  load();
}

window.Modules = window.Modules || {};
window.Modules['quan-tri'] = { title:'Quản Trị', render };
})();
