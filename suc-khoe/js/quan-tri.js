// Quản Trị — Thư Viện + Gói & Lịch Trình + Thành Viên + Đơn Hàng + Báo Cáo Doanh Thu + Câu Chuyện
// Thành Công. Route này chỉ hiện trong sidebar khi profiles.role==='admin' (xem app-shell.js NAV, cờ
// adminOnly) — nhưng RLS ở Supabase (is_admin()) mới là chốt chặn thật, ẩn sidebar chỉ để đỡ rối giao
// diện cho user thường.
// 2026-09-20, chị Quỳnh: "mục sản phẩm trong quản trị bỏ đi" — bỏ tab CRUD sản phẩm (renderSanPham
// vẫn còn trong file, chỉ không route tới nữa). 2026-09-24: chị tưởng nhầm việc này ảnh hưởng tới
// Kiểm Tra Sức Khỏe nên bảo phục hồi lại, sau khi em giải thích rõ (bỏ tab này chỉ mất chỗ SỬA sản
// phẩm trên giao diện — không đụng gì tới trang Kiểm Tra Sức Khỏe) chị xác nhận CHỐT LẠI Ý BAN ĐẦU:
// vẫn bỏ tab này — sửa tên/giá/ảnh/công dụng/giá vốn/giá NPP sản phẩm từ nay nhờ sửa bằng SQL. Trang
// "Sản Phẩm Unicity" khách hàng (sidebar chính) không đổi, vẫn xem được bình thường.
(function(){
function render(container, ctx){
  const hubState = { tab:'thuvien' };
  function drawHub(){
    container.innerHTML = `
      <div class="page-head"><h1>Quản Trị</h1><p>Quản lý Thư Viện Sức Khỏe, Gói & Lịch Trình, thành viên, đơn hàng và báo cáo doanh thu.</p></div>
      <div class="chips" style="margin-bottom:18px;">
        <div class="chip ${hubState.tab==='thuvien'?'selected':''}" data-hub-tab="thuvien">Thư Viện</div>
        <div class="chip ${hubState.tab==='goi'?'selected':''}" data-hub-tab="goi">Gói & Lịch Trình</div>
        <div class="chip ${hubState.tab==='thanhvien'?'selected':''}" data-hub-tab="thanhvien">Thành Viên</div>
        <div class="chip ${hubState.tab==='donhang'?'selected':''}" data-hub-tab="donhang">Đơn Hàng</div>
        <div class="chip ${hubState.tab==='baocao'?'selected':''}" data-hub-tab="baocao">Báo Cáo Doanh Thu</div>
        <div class="chip ${hubState.tab==='cauchuyen'?'selected':''}" data-hub-tab="cauchuyen">Câu Chuyện Thành Công</div>
      </div>
      <div id="qt-hub-sub"></div>
    `;
    container.querySelectorAll('[data-hub-tab]').forEach(el=>{
      el.onclick = ()=>{ hubState.tab = el.getAttribute('data-hub-tab'); drawHub(); };
    });
    const sub = container.querySelector('#qt-hub-sub');
    if(hubState.tab === 'thuvien') renderThuVien(sub, ctx);
    else if(hubState.tab === 'goi') renderGoiLichTrinh(sub, ctx);
    else if(hubState.tab === 'donhang') renderDonHang(sub, ctx);
    else if(hubState.tab === 'baocao') renderThongKe(sub, ctx);
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
    const { error } = await ctx.supabase.from('sk_library_entries').delete().eq('id', id);
    if(error) alert('Không xoá được: ' + error.message);
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
            <label style="display:block;font-size:14.5px;font-weight:600;color:var(--ink-soft);margin-bottom:6px;">Sản phẩm liên quan</label>
            <div class="chips">${state.products.map(p=>`<div class="chip ${state.form.related_product_ids.includes(p.id)?'selected':''}" data-toggle-product="${p.id}">${esc(p.name)}</div>`).join('')}</div>
          </div>
          ${state.form.related_product_ids.length>0 ? `
            <div class="field" style="margin-top:14px;">
              <label style="display:block;font-size:14.5px;font-weight:600;color:var(--ink-soft);margin-bottom:8px;">Công dụng nổi bật riêng cho từng sản phẩm (hiện ở Kiểm Tra Sức Khỏe/Thư Viện Sức Khỏe — nói về THÀNH PHẦN, không nói sản phẩm "chữa"). Đánh dấu tối đa 2-3 sản phẩm "Nên dùng trước" mỗi mục.</label>
              ${state.form.related_product_ids.map(pid=>{
                const p = state.products.find(x=>x.id===pid);
                const pn = state.form.product_notes[pid] || { note:'', priority:false };
                return `
                  <div style="border:1px solid var(--line);border-radius:10px;padding:12px;margin-bottom:10px;">
                    <div style="font-weight:600;font-size:15px;margin-bottom:6px;">${esc(p ? p.name : pid)}</div>
                    <textarea data-note-product="${pid}" placeholder="VD: Chlorophyll được biết đến với vai trò chống oxy hóa, hỗ trợ gan..." style="min-height:60px;">${esc(pn.note||'')}</textarea>
                    <label style="display:flex;align-items:center;gap:6px;margin-top:8px;font-size:14.5px;cursor:pointer;">
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
          <div style="font-weight:600;font-size:16px;">${esc(e.issue_name)}</div>
          <div style="display:flex;gap:8px;flex-shrink:0;">
            <span class="btn-ghost btn btn-sm" data-edit="${e.id}">Sửa</span>
            <span class="btn-ghost btn btn-sm" style="color:var(--danger);" data-remove="${e.id}">Xoá</span>
          </div>
        </div>
      `).join('')}
      ${state.list.length===0 ? `<div style="color:var(--ink-soft);font-size:15.5px;">Chưa có mục nào.</div>` : ''}
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

  // 2026-09-12, chị Quỳnh: "cho e sửa cái hướng dẫn sử dụng từng sản phẩm" — trước đây "Đối tượng sử
  // dụng"/"Cách dùng" chỉ nằm trong detail_sections (mảng {title,body} tự do), chỉ sửa được qua file
  // SQL, không có UI. Thay vì bắt admin tự soạn cả mảng JSON, tách riêng 2 ô text đúng 2 mục khách
  // hàng thật sự cần xem (skProductUsageHtml ở lich-trinh.js đang lọc đúng 2 mục này) — lúc lưu GHÉP
  // LẠI vào đúng vị trí trong detail_sections, các mục khác (thành phần, cơ chế...) giữ nguyên không đụng tới.
  function findSectionBody(sections, re){
    const hit = (sections||[]).find(s=>re.test(s.title||''));
    return hit ? (hit.body||'') : '';
  }
  function withSectionBody(sections, re, defaultTitle, body){
    const list = Array.isArray(sections) ? sections.map(s=>({ ...s })) : [];
    const idx = list.findIndex(s=>re.test(s.title||''));
    if(body.trim()===''){
      if(idx>=0) list.splice(idx,1);
      return list;
    }
    if(idx>=0) list[idx].body = body;
    else list.push({ title:defaultTitle, body });
    return list;
  }

  function newForm(){ return { id:null, name:'', short_description:'', benefits:'', retail_price:'', cost_price:'', npp_price:'', image_url:'', detail_sections:[], usageAudience:'', usageInstruction:'' }; }
  function openNew(){ state.form = newForm(); draw(); }
  function openEdit(p){
    state.form = {
      ...p, retail_price: p.retail_price ?? '', cost_price: p.cost_price ?? '', npp_price: p.npp_price ?? '',
      usageAudience: findSectionBody(p.detail_sections, /đối tượng/i),
      usageInstruction: findSectionBody(p.detail_sections, /cách dùng/i),
    };
    draw();
  }

  async function save(){
    if(!state.form.name.trim()) return;
    state.saving = true; draw();
    let sections = Array.isArray(state.form.detail_sections) ? state.form.detail_sections : [];
    sections = withSectionBody(sections, /đối tượng/i, 'Đối tượng sử dụng', state.form.usageAudience.trim());
    sections = withSectionBody(sections, /cách dùng/i, 'Cách dùng', state.form.usageInstruction.trim());
    const payload = {
      name: state.form.name.trim(), short_description: state.form.short_description.trim()||null,
      benefits: state.form.benefits.trim()||null,
      retail_price: state.form.retail_price===''? null : Number(state.form.retail_price),
      cost_price: state.form.cost_price===''? null : Number(state.form.cost_price),
      npp_price: state.form.npp_price===''? null : Number(state.form.npp_price),
      image_url: state.form.image_url.trim()||null,
      detail_sections: sections,
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
    const { error } = await ctx.supabase.from('sk_products').delete().eq('id', id);
    if(error) alert('Không xoá được: ' + error.message);
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
          <div class="field" style="margin-top:12px;"><label>Giá vốn / giá sỉ (đ) — dùng để tính lãi lẻ ở Báo Cáo Doanh Thu</label><input type="number" id="sp-cost-price" value="${esc(state.form.cost_price)}" placeholder="Giá chị nhập/mua từ Unicity"></div>
          <div class="field" style="margin-top:12px;"><label>Giá NPP (đ) — hiện cho khách được bật "Giá NPP" ở Thành Viên</label><input type="number" id="sp-npp-price" value="${esc(state.form.npp_price)}" placeholder="Để trống nếu sản phẩm này chưa có giá NPP riêng"></div>
          <div class="field" style="margin-top:12px;"><label>Link ảnh (URL)</label><input type="text" id="sp-image" value="${esc(state.form.image_url)}" placeholder="https://..."></div>
          <div class="field" style="margin-top:12px;"><label>Đối tượng sử dụng</label><textarea id="sp-usage-audience" placeholder="VD: Người trưởng thành, không dùng cho phụ nữ mang thai...">${esc(state.form.usageAudience)}</textarea></div>
          <div class="field" style="margin-top:12px;"><label>Cách dùng (Hướng dẫn sử dụng)</label><textarea id="sp-usage-instruction" placeholder="VD: Uống 1 viên/lần, 2 lần/ngày trước bữa ăn 30 phút...">${esc(state.form.usageInstruction)}</textarea></div>
          <div class="btn-row" style="justify-content:flex-start;margin-top:16px;">
            <button class="btn btn-sm" id="sp-save" ${state.saving?'disabled':''}>${state.saving?'Đang lưu…':'Lưu'}</button>
            <span class="btn-ghost btn btn-sm" id="sp-cancel">Huỷ</span>
          </div>
        </div>
      ` : `<button class="btn btn-sm" id="sp-new" style="margin-bottom:18px;">+ Thêm sản phẩm</button>`}

      ${state.list.map(p=>`
        <div class="section" style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;">
          <div>
            <div style="font-weight:600;font-size:16px;">${esc(p.name)}</div>
            ${p.retail_price!=null ? `<div style="font-size:14.5px;color:var(--ink-soft);">${Number(p.retail_price).toLocaleString('vi-VN')}đ</div>` : ''}
          </div>
          <div style="display:flex;gap:8px;flex-shrink:0;">
            <span class="btn-ghost btn btn-sm" data-edit="${p.id}">Sửa</span>
            <span class="btn-ghost btn btn-sm" style="color:var(--danger);" data-remove="${p.id}">Xoá</span>
          </div>
        </div>
      `).join('')}
      ${state.list.length===0 ? `<div style="color:var(--ink-soft);font-size:15.5px;">Chưa có sản phẩm nào.</div>` : ''}
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
    const costPriceEl = container.querySelector('#sp-cost-price'); if(costPriceEl) costPriceEl.oninput = (e)=>{ state.form.cost_price = e.target.value; };
    const nppPriceEl = container.querySelector('#sp-npp-price'); if(nppPriceEl) nppPriceEl.oninput = (e)=>{ state.form.npp_price = e.target.value; };
    const imageEl = container.querySelector('#sp-image'); if(imageEl) imageEl.oninput = (e)=>{ state.form.image_url = e.target.value; };
    const usageAudienceEl = container.querySelector('#sp-usage-audience'); if(usageAudienceEl) usageAudienceEl.oninput = (e)=>{ state.form.usageAudience = e.target.value; };
    const usageInstructionEl = container.querySelector('#sp-usage-instruction'); if(usageInstructionEl) usageInstructionEl.oninput = (e)=>{ state.form.usageInstruction = e.target.value; };
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
// 2026-09-25, chị Quỳnh vào tab này hỏi "ở cái mục lịch trình này sao ko hiện lịch để mình chỉnh
// sửa" — đúng là trước đây tab NÀY chỉ CRUD được sk_package_schedule_items ("Mốc theo ngày", mục PHỤ,
// gần như trống ở mọi gói), còn nội dung lịch trình THẬT khách thấy mỗi ngày (sk_packages.
// regimen_sections — Sáng/Trưa/Tối dùng sản phẩm gì, hướng dẫn ra sao) trước giờ CHỈ sửa được qua
// việc chị gửi nội dung, em viết file SQL, chị chạy tay ở Supabase — không có chỗ nào trong app tự
// sửa trực tiếp được. Sau khi chị nói "từ giờ phải làm các lịch trình cho nó chuẩn vì cái đó quan
// trọng nhất", thêm hẳn 1 khối sửa trực tiếp regimen_sections ở đây (regimenEditorHtml) — sửa xong
// bấm Lưu là khách thấy ngay, không cần qua SQL nữa. Giữ NGUYÊN cấu trúc dữ liệu gốc (mảng "khung giờ"
// tự do, mỗi khung có time_label + note + danh sách sản phẩm) thay vì ép cứng về đúng 3 khung Sáng/
// Trưa/Tối, vì dữ liệu thật đang có nhiều khung nhỏ hơn (VD "Giữa buổi sáng" tách riêng "Buổi sáng
// ngay sau khi ngủ dậy") — ép về 3 khung sẽ làm mất chi tiết đang có.
function renderGoiLichTrinh(container, ctx){
  const state = { packages:[], allProducts:[], selectedPackageId:null, items:[], newPackageName:'', newPackageDesc:'', savingPackage:false, itemForm:null, savingItem:false, regimenForm:null, regimenSaving:false };

  function draw(){ container.innerHTML = html(); bind(); }

  async function loadPackages(){
    const [{ data }, { data: products }] = await Promise.all([
      ctx.supabase.from('sk_packages').select('*').order('created_at', { ascending:false }),
      ctx.supabase.from('sk_products').select('id,name').order('name', { ascending:true }),
    ]);
    state.packages = data || [];
    state.allProducts = products || [];
    if(!state.selectedPackageId && state.packages.length>0) state.selectedPackageId = state.packages[0].id;
    loadRegimenForm();
    draw();
    if(state.selectedPackageId) await loadItems();
  }

  async function loadItems(){
    const { data } = await ctx.supabase.from('sk_package_schedule_items').select('*').eq('package_id', state.selectedPackageId).order('day_offset', { ascending:true });
    state.items = data || [];
    draw();
  }

  // Deep clone để sửa nháp không đụng vào state.packages gốc — chỉ ghi thật khi bấm Lưu.
  function loadRegimenForm(){
    const pkg = state.packages.find(p=>p.id===state.selectedPackageId);
    state.regimenForm = pkg ? JSON.parse(JSON.stringify(pkg.regimen_sections || [])) : null;
  }

  function addRegimenSection(){
    state.regimenForm.push({ time_label:'', note:'', steps:[] });
    draw();
  }
  function removeRegimenSection(idx){
    state.regimenForm.splice(idx, 1);
    draw();
  }
  function addRegimenStep(secIdx){
    state.regimenForm[secIdx].steps.push({ product_name:'', instruction:'', priority:false });
    draw();
  }
  function removeRegimenStep(secIdx, stepIdx){
    state.regimenForm[secIdx].steps.splice(stepIdx, 1);
    draw();
  }

  async function saveRegimen(){
    state.regimenSaving = true; draw();
    const { error } = await ctx.supabase.from('sk_packages').update({ regimen_sections: state.regimenForm }).eq('id', state.selectedPackageId);
    state.regimenSaving = false;
    if(error){ alert('Không lưu được lịch trình: ' + error.message); draw(); return; }
    const pkg = state.packages.find(p=>p.id===state.selectedPackageId);
    if(pkg) pkg.regimen_sections = JSON.parse(JSON.stringify(state.regimenForm));
    draw();
  }

  function regimenEditorHtml(){
    if(!state.regimenForm) return '';
    return `
      <div class="card" style="margin-bottom:20px;">
        <div style="font-weight:700;font-size:16px;margin-bottom:4px;">📅 Lịch trình hằng ngày — nội dung khách thấy mỗi ngày</div>
        <div style="font-size:13.5px;color:var(--ink-soft);margin-bottom:14px;">Đây là lịch trình THẬT khách thấy ở "Lịch Trình Của Bạn" (khác với "Mốc theo ngày" ở dưới, mục phụ ít dùng). Tên khung giờ nên chứa đúng chữ "sáng"/"trưa"/"tối" để tự xếp đúng chỗ — khung nào không chứa chữ nào trong 3 chữ đó sẽ rơi vào mục "Khác trong ngày".</div>
        ${state.regimenForm.map((sec, secIdx)=>`
          <div style="border:1px solid var(--line);border-radius:10px;padding:12px;margin-bottom:12px;">
            <div style="display:flex;gap:8px;align-items:center;margin-bottom:8px;">
              <input type="text" data-regimen-label="${secIdx}" value="${esc(sec.time_label||'')}" placeholder="VD: Buổi sáng ngay sau khi ngủ dậy" style="flex:1;margin:0;">
              <span data-regimen-remove-section="${secIdx}" style="color:var(--danger);cursor:pointer;font-size:14.5px;flex-shrink:0;">✕ Xoá khung</span>
            </div>
            <textarea data-regimen-note="${secIdx}" placeholder="Ghi chú thêm cho khung này (không bắt buộc)" style="min-height:40px;margin-bottom:8px;">${esc(sec.note||'')}</textarea>
            ${(sec.steps||[]).map((step, stepIdx)=>`
              <div style="display:flex;gap:6px;align-items:center;margin-bottom:6px;flex-wrap:wrap;">
                <select data-regimen-product="${secIdx}|${stepIdx}" style="width:auto;min-width:140px;margin:0;">
                  <option value="">— Chọn sản phẩm —</option>
                  ${state.allProducts.map(prod=>`<option value="${esc(prod.name)}" ${step.product_name===prod.name?'selected':''}>${esc(prod.name)}</option>`).join('')}
                </select>
                <input type="text" data-regimen-instruction="${secIdx}|${stepIdx}" value="${esc(step.instruction||'')}" placeholder="Hướng dẫn dùng, VD: Pha 1 gói với 250ml nước..." style="flex:1;min-width:220px;margin:0;">
                <label style="display:flex;align-items:center;gap:4px;font-size:12.5px;white-space:nowrap;margin:0;"><input type="checkbox" data-regimen-priority="${secIdx}|${stepIdx}" ${step.priority?'checked':''} style="width:auto;margin:0;">Ưu tiên</label>
                <span data-regimen-remove-step="${secIdx}|${stepIdx}" style="color:var(--danger);cursor:pointer;font-size:14.5px;">✕</span>
              </div>
            `).join('')}
            <span class="btn-ghost btn btn-sm" data-regimen-add-step="${secIdx}">+ Thêm sản phẩm vào khung này</span>
          </div>
        `).join('')}
        ${state.regimenForm.length===0 ? `<div style="color:var(--ink-soft);font-size:14.5px;margin-bottom:12px;">Gói này chưa có lịch trình hằng ngày nào.</div>` : ''}
        <div class="btn-row" style="justify-content:flex-start;">
          <span class="btn-ghost btn btn-sm" id="gt-regimen-add-section">+ Thêm khung giờ mới</span>
          <button class="btn btn-sm" id="gt-regimen-save" ${state.regimenSaving?'disabled':''}>${state.regimenSaving?'Đang lưu…':'Lưu lịch trình'}</button>
        </div>
      </div>
    `;
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
    const { error } = await ctx.supabase.from('sk_packages').delete().eq('id', id);
    if(error){ alert('Không xoá được: ' + error.message); return; }
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
    const { error } = await ctx.supabase.from('sk_package_schedule_items').delete().eq('id', id);
    if(error) alert('Không xoá được: ' + error.message);
    await loadItems();
  }

  function html(){
    return `
      <div class="card" style="margin-bottom:20px;">
        <label style="display:block;font-size:14.5px;font-weight:600;color:var(--ink-soft);">Thêm gói mới</label>
        <input type="text" id="gt-new-name" value="${esc(state.newPackageName)}" placeholder="Tên gói, VD: Detox 30 ngày">
        <textarea id="gt-new-desc" placeholder="Mô tả ngắn (không bắt buộc)">${esc(state.newPackageDesc)}</textarea>
        <button class="btn btn-sm" style="margin-top:10px;" id="gt-add-package" ${state.savingPackage?'disabled':''}>${state.savingPackage?'Đang lưu…':'Thêm gói'}</button>
      </div>

      ${state.packages.length===0 ? `<div style="color:var(--ink-soft);font-size:15.5px;">Chưa có gói nào.</div>` : `
        <div class="chips" style="margin-bottom:20px;">
          ${state.packages.map(p=>`<div class="chip ${state.selectedPackageId===p.id?'selected':''}" data-select-package="${p.id}">${esc(p.name)}</div>`).join('')}
        </div>
      `}

      ${state.selectedPackageId ? (()=>{
        const pkg = state.packages.find(p=>p.id===state.selectedPackageId);
        return `
        <div class="page-head" style="margin-bottom:10px;">
          <h2 style="font-size:18px;">Lịch trình — ${esc(pkg ? pkg.name : '')}</h2>
          <span class="btn-ghost btn btn-sm" style="color:var(--danger);margin-top:8px;display:inline-block;" data-remove-package="${state.selectedPackageId}">Xoá gói này</span>
        </div>

        ${regimenEditorHtml()}

        <div class="page-head" style="margin-bottom:10px;"><h2 style="font-size:16px;">Mốc theo ngày của gói (mục phụ, không bắt buộc)</h2></div>

        ${state.itemForm ? `
          <div class="card" style="margin-bottom:16px;">
            <label style="display:block;font-size:14.5px;font-weight:600;color:var(--ink-soft);">Ngày thứ (tính từ lúc bắt đầu gói)</label>
            <input type="number" id="gt-item-offset" value="${esc(state.itemForm.day_offset)}">
            <label style="display:block;font-size:14.5px;font-weight:600;color:var(--ink-soft);margin-top:12px;">Tiêu đề</label>
            <input type="text" id="gt-item-title" value="${esc(state.itemForm.title)}" placeholder="VD: Bắt đầu uống Bios Life mỗi sáng">
            <label style="display:block;font-size:14.5px;font-weight:600;color:var(--ink-soft);margin-top:12px;">Mô tả</label>
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
              <div style="font-weight:600;font-size:15.5px;">${esc(item.title)}</div>
              ${item.description ? `<div style="font-size:14.5px;color:var(--ink-soft);margin-top:4px;">${esc(item.description)}</div>` : ''}
            </div>
            <div style="display:flex;gap:8px;flex-shrink:0;">
              <span class="btn-ghost btn btn-sm" data-edit-item="${item.id}">Sửa</span>
              <span class="btn-ghost btn btn-sm" style="color:var(--danger);" data-remove-item="${item.id}">Xoá</span>
            </div>
          </div>
        `).join('')}
        ${state.items.length===0 ? `<div style="color:var(--ink-soft);font-size:15.5px;">Gói này chưa có mục lịch trình nào.</div>` : ''}
      `;
      })() : ''}
    `;
  }

  function bind(){
    const nameEl = container.querySelector('#gt-new-name'); if(nameEl) nameEl.oninput = (e)=>{ state.newPackageName = e.target.value; };
    const descEl = container.querySelector('#gt-new-desc'); if(descEl) descEl.oninput = (e)=>{ state.newPackageDesc = e.target.value; };
    const addBtn = container.querySelector('#gt-add-package'); if(addBtn) addBtn.onclick = addPackage;
    container.querySelectorAll('[data-select-package]').forEach(el=>{
      el.onclick = ()=>{ state.selectedPackageId = el.getAttribute('data-select-package'); state.itemForm = null; loadRegimenForm(); draw(); loadItems(); };
    });

    const addSectionBtn = container.querySelector('#gt-regimen-add-section'); if(addSectionBtn) addSectionBtn.onclick = addRegimenSection;
    const saveRegimenBtn = container.querySelector('#gt-regimen-save'); if(saveRegimenBtn) saveRegimenBtn.onclick = saveRegimen;
    container.querySelectorAll('[data-regimen-label]').forEach(el=>{
      el.oninput = (e)=>{ state.regimenForm[Number(el.getAttribute('data-regimen-label'))].time_label = e.target.value; };
    });
    container.querySelectorAll('[data-regimen-note]').forEach(el=>{
      el.oninput = (e)=>{ state.regimenForm[Number(el.getAttribute('data-regimen-note'))].note = e.target.value; };
    });
    container.querySelectorAll('[data-regimen-remove-section]').forEach(el=>{
      el.onclick = ()=>removeRegimenSection(Number(el.getAttribute('data-regimen-remove-section')));
    });
    container.querySelectorAll('[data-regimen-add-step]').forEach(el=>{
      el.onclick = ()=>addRegimenStep(Number(el.getAttribute('data-regimen-add-step')));
    });
    container.querySelectorAll('[data-regimen-product]').forEach(el=>{
      el.onchange = (e)=>{
        const [secIdx, stepIdx] = el.getAttribute('data-regimen-product').split('|').map(Number);
        state.regimenForm[secIdx].steps[stepIdx].product_name = e.target.value;
      };
    });
    container.querySelectorAll('[data-regimen-instruction]').forEach(el=>{
      el.oninput = (e)=>{
        const [secIdx, stepIdx] = el.getAttribute('data-regimen-instruction').split('|').map(Number);
        state.regimenForm[secIdx].steps[stepIdx].instruction = e.target.value;
      };
    });
    container.querySelectorAll('[data-regimen-priority]').forEach(el=>{
      el.onchange = (e)=>{
        const [secIdx, stepIdx] = el.getAttribute('data-regimen-priority').split('|').map(Number);
        state.regimenForm[secIdx].steps[stepIdx].priority = e.target.checked;
      };
    });
    container.querySelectorAll('[data-regimen-remove-step]').forEach(el=>{
      el.onclick = ()=>{
        const [secIdx, stepIdx] = el.getAttribute('data-regimen-remove-step').split('|').map(Number);
        removeRegimenStep(secIdx, stepIdx);
      };
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
  const state = { loading:true, rows:[], packages:[], allProducts:[], search:'', busyId:null, pointsFormFor:null, pointsForm:{ month:new Date().toISOString().slice(0,7), points:'', purchase_amount:'', commission:'', note:'' },
    anyQuery:'', anySearching:false, anySearched:false, anyResults:[],
    customerProductsFor:null, customerProductIds:null,
    scheduleFor:null, scheduleItemsByPackage:{},
    dailyScheduleFor:null, dailyScheduleForm:null, dailyScheduleSaving:false, dailyScheduleBmiByUser:{} };

  function draw(){ container.innerHTML = html(); bind(); }

  async function load(){
    state.loading = true; draw();
    const [{ data: rows }, { data: packages }, { data: products }] = await Promise.all([
      // Chỉ lấy người ĐÃ TỪNG vào app suc-khoe (sk_first_visited_at chỉ set ở loadProfile() của
      // suc-khoe/js/app-shell.js) — profiles là bảng CHUNG giữa mọi app, không lọc sẽ lẫn người chỉ
      // dùng nhan-hieu/tai-chinh/san-pham-so.
      ctx.supabase.from('profiles').select('id,email,full_name,role,sk_package_id,sk_package_started_at,sk_first_visited_at,sk_daily_schedule_override,sk_is_npp').not('sk_first_visited_at', 'is', null).order('sk_first_visited_at', { ascending:false }).limit(200),
      ctx.supabase.from('sk_packages').select('id,name'),
      ctx.supabase.from('sk_products').select('id,name').order('name', { ascending:true }),
    ]);
    state.rows = rows || [];
    state.packages = packages || [];
    state.allProducts = products || [];
    state.loading = false;
    draw();
  }

  function packageName(id){ const p = state.packages.find(x=>x.id===id); return p ? p.name : null; }

  // 2026-09-12, chị Quỳnh: "gán gói xong ko ra được lịch trình chi tiết của các gói" — trước đây phải
  // sang tận tab "Gói & Lịch Trình" mới xem được lịch trình chi tiết của 1 gói, không có cách nào xem
  // ngay tại đây (Thành Viên) để kiểm tra đúng gói vừa gán. Thêm nút xem nhanh, cache theo package_id
  // (nhiều khách chung 1 gói không cần tải lại).
  async function toggleSchedule(userId, packageId){
    if(state.scheduleFor === userId){ state.scheduleFor = null; draw(); return; }
    state.scheduleFor = userId; draw();
    if(!state.scheduleItemsByPackage[packageId]){
      const { data } = await ctx.supabase.from('sk_package_schedule_items').select('*').eq('package_id', packageId).order('day_offset', { ascending:true });
      state.scheduleItemsByPackage[packageId] = data || [];
    }
    draw();
  }

  // 2026-09-19, chị Quỳnh: "có khách e muốn để cho giá NPP vì đã dùng lâu thì làm như nào?" — bật cờ
  // profiles.sk_is_npp cho ĐÚNG khách đó, mọi trang khách hàng tự đổi sang npp_price (nếu sản phẩm có
  // giá riêng) ngay lần load kế tiếp — xem skApplyNppPricing (util.js).
  async function toggleNpp(userId, checked){
    state.busyId = userId; draw();
    const { error } = await ctx.supabase.from('profiles').update({ sk_is_npp: checked }).eq('id', userId);
    state.busyId = null;
    if(error){ alert('Không cập nhật được: ' + error.message); draw(); return; }
    const row = state.rows.find(r=>r.id===userId); if(row) row.sk_is_npp = checked;
    const anyRow = state.anyResults.find(r=>r.id===userId); if(anyRow) anyRow.sk_is_npp = checked;
    draw();
  }
  function nppToggleHtml(userId, checked){
    return `<label style="display:inline-flex;align-items:center;gap:5px;font-size:14px;cursor:pointer;"><input type="checkbox" data-toggle-npp="${userId}" ${checked?'checked':''} style="width:auto;margin:0;">🏷️ Giá NPP</label>`;
  }

  // 2026-09-25, chị Quỳnh hỏi "cái lịch trình ở đây là như nào??" — tên "Lịch trình gói này" dễ nhầm
  // với "✏️ Sửa lịch trình 1 ngày" ngay bên cạnh (2 thứ KHÁC NHAU: cái này là sk_package_schedule_items
  // — mốc mua/dùng theo NGÀY THỨ MẤY, VD "Ngày 5: bắt đầu X", sửa ở tab "Gói & Lịch Trình" — khác hẳn
  // "Lịch trình 1 ngày" sáng/trưa/tối, sửa ở sk_daily_schedule_override). Đổi tên rõ hơn — "Mốc theo
  // ngày" — để không lẫn với "lịch trình 1 ngày" nữa. Phần lớn các gói hiện chưa có mục nào (chỉ mới
  // seed regimen_sections — nội dung khách thấy hằng ngày — chưa từng thêm mốc theo ngày này).
  function packageSchedulePreviewHtml(userId, packageId){
    if(!packageId) return '';
    return `
      <span class="btn-ghost btn btn-sm" data-toggle-schedule="${userId}|${packageId}">📋 Mốc theo ngày của gói</span>
      ${state.scheduleFor===userId ? `
        <div class="card" style="margin-top:10px;width:100%;">
          ${!state.scheduleItemsByPackage[packageId] ? `<div class="loading"><div class="spinner"></div></div>` : (
            state.scheduleItemsByPackage[packageId].length===0
              ? `<div style="color:var(--ink-soft);font-size:14px;">Gói "${esc(packageName(packageId))}" chưa có mốc theo ngày nào (VD "Ngày 5: bắt đầu dùng X") — đây là mục RIÊNG, khác với nội dung khách thấy hằng ngày ở "Lịch Trình Của Bạn". Không bắt buộc phải có — vào tab "Gói & Lịch Trình" nếu muốn thêm.</div>`
              : state.scheduleItemsByPackage[packageId].map(item=>`
                <div style="padding:8px 0;border-bottom:1px solid var(--line);">
                  <div class="meta">Ngày ${item.day_offset}</div>
                  <div style="font-weight:600;font-size:14.5px;">${esc(item.title)}</div>
                  ${item.description ? `<div style="font-size:14px;color:var(--ink-soft);margin-top:2px;">${esc(item.description)}</div>` : ''}
                </div>
              `).join('')
          )}
        </div>
      ` : ''}
    `;
  }

  // 2026-09-12, chị Quỳnh: "cho e quyền sửa lịch trình của người dùng" (xác nhận sửa RIÊNG cho 1 khách
  // cụ thể) — profiles.sk_daily_schedule_override ghi đè lịch trình 1 ngày mặc định theo BMI (xem
  // lich-trinh.js dailyScheduleHtml). Mở form là tải sẵn BMI mốc gần nhất của khách làm bản nháp hợp
  // lý (không bắt admin gõ từ đầu) — đã có tuỳ chỉnh trước đó thì ưu tiên hiện đúng bản đã lưu.
  async function openDailyScheduleEdit(userId, currentOverride){
    if(state.dailyScheduleFor === userId){ state.dailyScheduleFor = null; state.dailyScheduleForm = null; draw(); return; }
    state.dailyScheduleFor = userId; state.dailyScheduleForm = null; draw();
    let bmiCat = state.dailyScheduleBmiByUser[userId];
    if(bmiCat === undefined){
      const { data } = await ctx.supabase.from('sk_weekly_logs').select('metrics').eq('user_id', userId).maybeSingle();
      bmiCat = skLatestBmiCategoryFromMetrics(data && data.metrics) || null;
      state.dailyScheduleBmiByUser[userId] = bmiCat;
    }
    const base = currentOverride || (bmiCat && SK_DAILY_SCHEDULE_BY_BMI[bmiCat.key]) || {
      label:'', sang:{uong:'',an:''}, trua:{uong:'',an:''}, toi:{uong:'',an:''}, tap:{gio:'',bai:''},
    };
    // Deep clone để không sửa nhầm vào hằng số SK_DAILY_SCHEDULE_BY_BMI dùng chung (util.js).
    state.dailyScheduleForm = JSON.parse(JSON.stringify(base));
    // 2026-09-15, chị Quỳnh: "phải sửa chi tiết từng sản phẩm dùng như nào, vào thời điểm nào, liều
    // lượng dùng ra sao" — mỗi khung sang/trua/toi có thêm mảng "products" (product_name/instruction/
    // priority, cùng shape step của regimen_sections) để admin khai riêng đúng sản phẩm/liều cho khách
    // này. Đảm bảo luôn có mảng (kể cả bản BMI mặc định/override cũ chưa từng có field này).
    ['sang','trua','toi'].forEach(k=>{
      if(!Array.isArray(state.dailyScheduleForm[k].products)) state.dailyScheduleForm[k].products = [];
    });
    state.dailyScheduleBmiLabel = bmiCat ? bmiCat.label : null;
    draw();
  }

  async function saveDailySchedule(userId){
    state.dailyScheduleSaving = true; draw();
    const { error } = await ctx.supabase.from('profiles').update({ sk_daily_schedule_override: state.dailyScheduleForm }).eq('id', userId);
    state.dailyScheduleSaving = false;
    if(error){ alert('Không lưu được lịch trình: ' + error.message); return; }
    const row = state.rows.find(r=>r.id===userId); if(row) row.sk_daily_schedule_override = state.dailyScheduleForm;
    const anyRow = state.anyResults.find(r=>r.id===userId); if(anyRow) anyRow.sk_daily_schedule_override = state.dailyScheduleForm;
    draw();
  }

  async function resetDailySchedule(userId){
    if(!(await confirmModal('Bỏ tuỳ chỉnh riêng, quay về lịch trình mặc định theo BMI cho khách này?'))) return;
    state.dailyScheduleSaving = true; draw();
    const { error } = await ctx.supabase.from('profiles').update({ sk_daily_schedule_override: null }).eq('id', userId);
    state.dailyScheduleSaving = false;
    if(error){ alert('Không xoá được: ' + error.message); return; }
    const row = state.rows.find(r=>r.id===userId); if(row) row.sk_daily_schedule_override = null;
    const anyRow = state.anyResults.find(r=>r.id===userId); if(anyRow) anyRow.sk_daily_schedule_override = null;
    state.dailyScheduleFor = null; state.dailyScheduleForm = null;
    draw();
  }

  function dailyScheduleEditHtml(userId, currentOverride){
    return `
      <span class="btn-ghost btn btn-sm" data-toggle-daily-schedule="${userId}">✏️ Sửa lịch trình 1 ngày</span>
      ${state.dailyScheduleFor===userId ? (()=>{
        const f = state.dailyScheduleForm;
        if(!f) return `<div class="card" style="margin-top:10px;width:100%;"><div class="loading"><div class="spinner"></div></div></div>`;
        const field = (path, label, isTextarea) => {
          const val = path.split('.').reduce((o,k)=>o[k], f);
          return `
            <div class="field" style="margin-top:8px;">
              <label style="font-size:13.5px;">${esc(label)}</label>
              ${isTextarea ? `<textarea data-ds-field="${path}" style="min-height:44px;">${esc(val)}</textarea>` : `<input type="text" data-ds-field="${path}" value="${esc(val)}">`}
            </div>
          `;
        };
        // 2026-09-15, chị Quỳnh: "phải sửa chi tiết từng sản phẩm dùng như nào, vào thời điểm nào, liều
        // lượng dùng ra sao" — ô uống/ăn ở trên chỉ là kiến thức CHUNG, không đủ. Thêm đúng danh sách
        // sản phẩm (tên + liều dùng/hướng dẫn + ưu tiên) cho TỪNG khung giờ — để trống = khách vẫn thấy
        // lịch dùng sản phẩm mặc định theo gói (xem lich-trinh.js dailyScheduleHtml, overrideProductsFor).
        const productStepsEditor = (slotKey, slotLabel) => {
          const products = f[slotKey].products || [];
          return `
            <div style="margin-top:6px;">
              <div style="font-size:13px;color:var(--ink-soft);margin-bottom:4px;">Sản phẩm dùng vào ${esc(slotLabel)} (để trống = dùng theo lịch chung của gói)</div>
              ${products.map((p,i)=>`
                <div style="display:flex;gap:6px;align-items:center;margin-bottom:6px;flex-wrap:wrap;">
                  <select data-ds-product="${slotKey}|${i}" style="width:auto;min-width:140px;margin:0;">
                    <option value="">— Chọn sản phẩm —</option>
                    ${state.allProducts.map(prod=>`<option value="${esc(prod.name)}" ${p.product_name===prod.name?'selected':''}>${esc(prod.name)}</option>`).join('')}
                  </select>
                  <input type="text" data-ds-product-instruction="${slotKey}|${i}" value="${esc(p.instruction||'')}" placeholder="Liều dùng/hướng dẫn, VD: 1 viên trước ăn 30 phút" style="flex:1;min-width:180px;margin:0;">
                  <label style="display:flex;align-items:center;gap:4px;font-size:12.5px;white-space:nowrap;margin:0;"><input type="checkbox" data-ds-product-priority="${slotKey}|${i}" ${p.priority?'checked':''} style="width:auto;margin:0;">Ưu tiên</label>
                  <span data-ds-product-remove="${slotKey}|${i}" style="color:var(--danger);cursor:pointer;font-size:14.5px;">✕</span>
                </div>
              `).join('')}
              <span class="btn-ghost btn btn-sm" data-ds-product-add="${slotKey}">+ Thêm sản phẩm</span>
            </div>
          `;
        };
        return `
          <div class="card" style="margin-top:10px;width:100%;">
            <div style="font-size:14px;color:var(--ink-soft);margin-bottom:8px;">
              ${currentOverride ? 'Khách này đang dùng lịch trình TUỲ CHỈNH riêng.' : `Chưa tuỳ chỉnh — bản nháp bên dưới lấy theo BMI mốc gần nhất của khách${state.dailyScheduleBmiLabel ? ` (${esc(state.dailyScheduleBmiLabel)})` : ' (chưa có số liệu, để trống)'}.`}
            </div>
            ${field('label', 'Tên lịch trình (hiện cho khách thấy)')}
            <div style="font-weight:700;font-size:14.5px;margin-top:12px;">🌅 Sáng</div>
            ${field('sang.uong', 'Uống', true)}
            ${field('sang.an', 'Ăn', true)}
            ${productStepsEditor('sang', 'buổi Sáng')}
            <div style="font-weight:700;font-size:14.5px;margin-top:12px;">☀️ Trưa</div>
            ${field('trua.uong', 'Uống', true)}
            ${field('trua.an', 'Ăn', true)}
            ${productStepsEditor('trua', 'buổi Trưa')}
            <div style="font-weight:700;font-size:14.5px;margin-top:12px;">🌙 Tối</div>
            ${field('toi.uong', 'Uống', true)}
            ${field('toi.an', 'Ăn', true)}
            ${productStepsEditor('toi', 'buổi Tối')}
            <div style="font-weight:700;font-size:14.5px;margin-top:12px;">🏃 Tập luyện</div>
            ${field('tap.gio', 'Giờ tập')}
            ${field('tap.bai', 'Bài tập', true)}
            <div class="btn-row" style="justify-content:flex-start;margin-top:14px;">
              <button class="btn btn-sm" data-save-daily-schedule="${userId}" ${state.dailyScheduleSaving?'disabled':''}>${state.dailyScheduleSaving?'Đang lưu…':'Lưu'}</button>
              ${currentOverride ? `<span class="btn-ghost btn btn-sm" style="color:var(--danger);" data-reset-daily-schedule="${userId}">Bỏ tuỳ chỉnh, dùng lại mặc định</span>` : ''}
            </div>
          </div>
        `;
      })() : ''}
    `;
  }

  // Gán ĐÚNG sản phẩm khách đang dùng, riêng lẻ (2026-09-05, chị Quỳnh: "gán gói ở đây là gán sản
  // phẩm khách đang dùng á, chứ k phải mỗi combo") — độc lập với sk_package_id (1 trong 3 bộ Combo có
  // lịch dùng sẵn): khách mua lẻ/ngoài app không nhất thiết khớp đúng 1 combo, nhưng Lịch Trình Của
  // Bạn vẫn cần hiện đúng hướng dẫn sử dụng của đúng sản phẩm họ dùng (xem lich-trinh.js).
  async function openCustomerProducts(userId){
    if(state.customerProductsFor === userId){ state.customerProductsFor = null; draw(); return; }
    state.customerProductsFor = userId; state.customerProductIds = null; draw();
    const { data } = await ctx.supabase.from('sk_customer_products').select('product_id').eq('user_id', userId);
    state.customerProductIds = new Set((data||[]).map(r=>r.product_id));
    draw();
  }

  async function toggleCustomerProduct(userId, productId){
    if(state.customerProductIds.has(productId)){
      const { error } = await ctx.supabase.from('sk_customer_products').delete().eq('user_id', userId).eq('product_id', productId);
      if(error){ alert('Không bỏ được sản phẩm: ' + error.message); return; }
      state.customerProductIds.delete(productId);
    } else {
      const { error } = await ctx.supabase.from('sk_customer_products').insert({ user_id:userId, product_id:productId });
      // Bảng sk_customer_products chưa tồn tại nếu chưa chạy schema_suc_khoe.sql mới nhất — báo rõ
      // lý do thay vì im lặng "như chưa lưu gì" (2026-09-05, chị Quỳnh phản ánh gán sản phẩm bị mất
      // sau khi tắt/mở lại app — khả năng cao là do lỗi này bị nuốt im lặng trước đây).
      if(error){ alert('Không lưu được sản phẩm — có thể chưa chạy file schema_suc_khoe.sql mới nhất. Lỗi: ' + error.message); return; }
      state.customerProductIds.add(productId);
    }
    draw();
  }

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
    const { data } = await ctx.supabase.from('profiles').select('id,email,full_name,sk_package_id,sk_daily_schedule_override,sk_is_npp')
      .or(`email.ilike.%${q}%,full_name.ilike.%${q}%`).limit(20);
    state.anyResults = data || [];
    state.anySearching = false;
    draw();
  }

  async function assignPackage(userId, packageId){
    state.busyId = userId; draw();
    const { error } = await ctx.supabase.from('profiles').update({
      sk_package_id: packageId || null,
      sk_package_started_at: packageId ? new Date().toISOString() : null,
    }).eq('id', userId);
    state.busyId = null;
    if(error){ alert('Không gán được gói: ' + error.message); draw(); return; }
    // 2026-09-12, chị Quỳnh: "khi gán gói ở quản trị, xong nó lại nhảy sang mục gán sản phẩm" — trước
    // đây gọi await load() ở đây, tức TOÀN BỘ danh sách khách chớp qua spinner rồi vẽ lại từ đầu ngay
    // sau khi chọn gói (select vừa đổi giá trị bị disable+render lại giữa chừng) — dễ khiến layout
    // dịch chuyển đúng lúc đang thao tác, cảm giác như bấm nhầm sang khung "Sản phẩm đang dùng" ngay
    // bên cạnh. Giờ chỉ cập nhật đúng dòng đang sửa tại chỗ (đã biết chắc chắn ghi thành công), không
    // vẽ lại toàn bộ danh sách/không hiện spinner nữa.
    const row = state.rows.find(r=>r.id===userId);
    if(row) row.sk_package_id = packageId || null;
    const anyRow = state.anyResults.find(r=>r.id===userId);
    if(anyRow) anyRow.sk_package_id = packageId || null;
    draw();
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

  // Nút + khung chọn sản phẩm đang dùng, dùng chung cho cả danh sách chính lẫn kết quả tìm "khách bất
  // kỳ" — độc lập với select gán Combo, khách có thể vừa có Combo vừa có thêm sản phẩm lẻ.
  function customerProductsPickerHtml(userId){
    return `
      <span class="btn-ghost btn btn-sm" data-open-customer-products="${userId}">Sản phẩm đang dùng</span>
      ${state.customerProductsFor===userId ? `
        <div class="card" style="margin-top:10px;width:100%;">
          ${state.customerProductIds===null ? `<div class="loading"><div class="spinner"></div></div>` : `
            <div style="font-size:14px;color:var(--ink-soft);margin-bottom:8px;">Tick đúng sản phẩm khách đang dùng (không cần khớp Combo nào) — Lịch Trình Của Bạn của khách sẽ hiện đúng hướng dẫn sử dụng của các sản phẩm này. Khách tự đặt giờ nhắc riêng ở Lịch Trình Của Bạn, không đặt ở đây.</div>
            <div class="chips">${state.allProducts.map(p=>`<div class="chip ${state.customerProductIds.has(p.id)?'selected':''}" data-toggle-customer-product="${userId}|${p.id}">${esc(p.name)}</div>`).join('')}</div>
            <div style="margin-top:10px;font-size:14px;font-weight:700;color:${state.customerProductIds.size>0?'var(--accent)':'var(--ink-soft)'};">
              ${state.customerProductIds.size>0 ? `✓ Đã lưu ${state.customerProductIds.size} sản phẩm — đã cập nhật vào Lịch Trình của khách ngay khi bấm tick, không cần bấm gì thêm.` : 'Chưa chọn sản phẩm nào.'}
            </div>
          `}
        </div>
      ` : ''}
    `;
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
            ? `<div style="color:var(--ink-soft);font-size:15px;margin-top:10px;">Không tìm thấy tài khoản nào khớp — khách cần tự đăng ký tài khoản trước (ở bất kỳ app nào trong hệ sinh thái Hiểu) thì mới gán gói được.</div>`
            : state.anyResults.map(r=>`
              <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;border-top:1px solid var(--line);padding-top:10px;margin-top:10px;">
                <div>
                  <div style="font-weight:600;font-size:15px;">${esc(r.full_name||'(chưa đặt tên)')}</div>
                  <div style="font-size:14px;color:var(--ink-soft);">${esc(r.email||'')} · Gói hiện tại: ${esc(packageName(r.sk_package_id) || 'chưa có')}</div>
                </div>
                <select data-assign="${r.id}" ${state.busyId===r.id?'disabled':''} style="margin:0;width:auto;min-width:160px;">
                  <option value="">— Chưa gán gói —</option>
                  ${state.packages.map(p=>`<option value="${p.id}" ${r.sk_package_id===p.id?'selected':''}>${esc(p.name)}</option>`).join('')}
                </select>
                ${nppToggleHtml(r.id, r.sk_is_npp)}
                ${packageSchedulePreviewHtml(r.id, r.sk_package_id)}
                ${dailyScheduleEditHtml(r.id, r.sk_daily_schedule_override)}
                ${customerProductsPickerHtml(r.id)}
              </div>
            `).join('')
        ) : ''}
      </div>

      <input type="text" id="tv2-search" placeholder="Tìm theo email hoặc tên..." value="${esc(state.search)}" style="margin-bottom:16px;">
      ${state.loading ? `<div class="loading"><div class="spinner"></div></div>` : filtered.map(r=>`
        <div class="section">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;flex-wrap:wrap;">
            <div>
              <div style="font-weight:600;font-size:15.5px;">${esc(r.full_name||'(chưa đặt tên)')} ${r.role==='admin'?'<span style="font-size:12.5px;color:var(--gold);">Admin</span>':''}</div>
              <div style="font-size:14px;color:var(--ink-soft);margin-top:2px;">${esc(r.email||'')}</div>
              <div style="font-size:13.5px;color:var(--ink-soft);margin-top:4px;">Gói hiện tại: ${esc(packageName(r.sk_package_id) || 'chưa có')}</div>
            </div>
          </div>
          <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-top:10px;">
            <select data-assign="${r.id}" ${state.busyId===r.id?'disabled':''} style="margin:0;width:auto;flex:1;min-width:160px;">
              <option value="">— Chưa gán gói —</option>
              ${state.packages.map(p=>`<option value="${p.id}" ${r.sk_package_id===p.id?'selected':''}>${esc(p.name)}</option>`).join('')}
            </select>
            <span class="btn-ghost btn btn-sm" data-add-points="${r.id}">+ Ghi điểm/hoa hồng</span>
            ${nppToggleHtml(r.id, r.sk_is_npp)}
            ${packageSchedulePreviewHtml(r.id, r.sk_package_id)}
            ${dailyScheduleEditHtml(r.id, r.sk_daily_schedule_override)}
            ${customerProductsPickerHtml(r.id)}
          </div>
          ${state.pointsFormFor===r.id ? `
            <div class="card" style="margin-top:12px;">
              <label style="display:block;font-size:14px;font-weight:600;color:var(--ink-soft);">Tháng (YYYY-MM)</label>
              <input type="text" id="pf-month" value="${esc(state.pointsForm.month)}">
              <label style="display:block;font-size:14px;font-weight:600;color:var(--ink-soft);margin-top:10px;">Điểm</label>
              <input type="number" id="pf-points" value="${esc(state.pointsForm.points)}">
              <label style="display:block;font-size:14px;font-weight:600;color:var(--ink-soft);margin-top:10px;">Giá trị mua (đ)</label>
              <input type="number" id="pf-purchase" value="${esc(state.pointsForm.purchase_amount)}">
              <label style="display:block;font-size:14px;font-weight:600;color:var(--ink-soft);margin-top:10px;">Hoa hồng (đ)</label>
              <input type="number" id="pf-commission" value="${esc(state.pointsForm.commission)}">
              <label style="display:block;font-size:14px;font-weight:600;color:var(--ink-soft);margin-top:10px;">Ghi chú</label>
              <input type="text" id="pf-note" value="${esc(state.pointsForm.note)}">
              <div class="btn-row" style="justify-content:flex-start;margin-top:12px;">
                <button class="btn btn-sm" data-submit-points="${r.id}" ${state.busyId===r.id?'disabled':''}>Lưu</button>
                <span class="btn-ghost btn btn-sm" id="pf-cancel">Huỷ</span>
              </div>
            </div>
          ` : ''}
        </div>
      `).join('')}
      ${!state.loading && filtered.length===0 ? `<div style="color:var(--ink-soft);font-size:15.5px;">Không có kết quả.</div>` : ''}
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
    container.querySelectorAll('[data-open-customer-products]').forEach(el=>{
      el.onclick = ()=>openCustomerProducts(el.getAttribute('data-open-customer-products'));
    });
    container.querySelectorAll('[data-toggle-schedule]').forEach(el=>{
      el.onclick = ()=>{
        const [userId, packageId] = el.getAttribute('data-toggle-schedule').split('|');
        toggleSchedule(userId, packageId);
      };
    });
    container.querySelectorAll('[data-toggle-customer-product]').forEach(el=>{
      el.onclick = ()=>{
        const [userId, productId] = el.getAttribute('data-toggle-customer-product').split('|');
        toggleCustomerProduct(userId, productId);
      };
    });
    container.querySelectorAll('[data-toggle-daily-schedule]').forEach(el=>{
      el.onclick = ()=>{
        const userId = el.getAttribute('data-toggle-daily-schedule');
        const row = state.rows.find(r=>r.id===userId) || state.anyResults.find(r=>r.id===userId);
        openDailyScheduleEdit(userId, row ? row.sk_daily_schedule_override : null);
      };
    });
    container.querySelectorAll('[data-toggle-npp]').forEach(el=>{
      el.onchange = (e)=>toggleNpp(el.getAttribute('data-toggle-npp'), e.target.checked);
    });
    container.querySelectorAll('[data-ds-field]').forEach(el=>{
      el.oninput = (e)=>{
        const path = el.getAttribute('data-ds-field').split('.');
        let obj = state.dailyScheduleForm;
        for(let i=0;i<path.length-1;i++) obj = obj[path[i]];
        obj[path[path.length-1]] = e.target.value;
      };
    });
    container.querySelectorAll('[data-save-daily-schedule]').forEach(el=>{
      el.onclick = ()=>saveDailySchedule(el.getAttribute('data-save-daily-schedule'));
    });
    container.querySelectorAll('[data-reset-daily-schedule]').forEach(el=>{
      el.onclick = ()=>resetDailySchedule(el.getAttribute('data-reset-daily-schedule'));
    });
    container.querySelectorAll('[data-ds-product]').forEach(el=>{
      el.onchange = (e)=>{
        const [slot, idx] = el.getAttribute('data-ds-product').split('|');
        state.dailyScheduleForm[slot].products[Number(idx)].product_name = e.target.value;
      };
    });
    container.querySelectorAll('[data-ds-product-instruction]').forEach(el=>{
      el.oninput = (e)=>{
        const [slot, idx] = el.getAttribute('data-ds-product-instruction').split('|');
        state.dailyScheduleForm[slot].products[Number(idx)].instruction = e.target.value;
      };
    });
    container.querySelectorAll('[data-ds-product-priority]').forEach(el=>{
      el.onchange = (e)=>{
        const [slot, idx] = el.getAttribute('data-ds-product-priority').split('|');
        state.dailyScheduleForm[slot].products[Number(idx)].priority = e.target.checked;
      };
    });
    container.querySelectorAll('[data-ds-product-remove]').forEach(el=>{
      el.onclick = ()=>{
        const [slot, idx] = el.getAttribute('data-ds-product-remove').split('|');
        state.dailyScheduleForm[slot].products.splice(Number(idx), 1);
        draw();
      };
    });
    container.querySelectorAll('[data-ds-product-add]').forEach(el=>{
      el.onclick = ()=>{
        const slot = el.getAttribute('data-ds-product-add');
        if(!Array.isArray(state.dailyScheduleForm[slot].products)) state.dailyScheduleForm[slot].products = [];
        state.dailyScheduleForm[slot].products.push({ product_name:'', instruction:'', priority:false });
        draw();
      };
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
  const state = { loading:true, orders:[], profileById:{}, busyId:null,
    showCreate:false, allProducts:[], productsLoaded:false, createForm:null };

  function draw(){ container.innerHTML = html(); bind(); }

  async function load(){
    state.loading = true; draw();
    const { data: orders } = await ctx.supabase.from('sk_orders').select('*').order('created_at', { ascending:false }).limit(200);
    state.orders = orders || [];
    // 2026-09-19, chị Quỳnh: đơn tạo tay cho khách CHƯA đăng ký có user_id = null (xem
    // schema_suc_khoe.sql: alter column user_id drop not null) — lọc null ra trước khi .in(), nếu
    // không Supabase trả lỗi "invalid input syntax" vì null không hợp lệ trong mảng so khớp id.
    const userIds = [...new Set(state.orders.map(o=>o.user_id).filter(Boolean))];
    if(userIds.length>0){
      const { data: profiles } = await ctx.supabase.from('profiles').select('id,email,full_name').in('id', userIds);
      (profiles||[]).forEach(p=>{ state.profileById[p.id] = p; });
    }
    state.loading = false;
    draw();
  }

  async function updateStatus(orderId, status){
    state.busyId = orderId; draw();
    const { error } = await ctx.supabase.from('sk_orders').update({ status }).eq('id', orderId);
    state.busyId = null;
    if(error) alert('Không cập nhật được trạng thái: ' + error.message);
    await load();
  }

  // 2026-09-19, chị Quỳnh: "cho e được xóa đơn hàng nếu nhầm" — xoá HẲN (không có trạng thái "đã
  // xoá" riêng, khác "Đã huỷ" — Đã huỷ vẫn giữ lại lịch sử, Xoá dùng cho đơn tạo/nhập nhầm không cần
  // lưu vết). Xác nhận trước vì không hoàn tác được.
  async function deleteOrder(orderId){
    if(!(await confirmModal('Xoá hẳn đơn hàng này? Không thể hoàn tác.'))) return;
    state.busyId = orderId; draw();
    const { error } = await ctx.supabase.from('sk_orders').delete().eq('id', orderId);
    state.busyId = null;
    if(error){ alert('Không xoá được: ' + error.message); return; }
    await load();
  }

  // 2026-09-19, chị Quỳnh: "e muốn có thêm 1 mục... quản lý đơn hàng của e vì có thể sẽ có khách họ
  // ko đăng ký vào sử dụng app thì e vẫn muốn quản lý được đơn hàng" — form tạo đơn TAY cho khách bán
  // trực tiếp ngoài app (Zalo/điện thoại...), không bắt buộc có tài khoản. Tìm khách CÓ SẴN tài khoản
  // là TUỲ CHỌN (gắn đúng user_id nếu tìm thấy, để sau này khách đăng nhập vẫn thấy lại đơn của mình
  // ở "Sản phẩm"/lịch sử) — để trống thì lưu như khách vãng lai (user_id null).
  async function openCreateForm(){
    state.showCreate = true;
    state.createForm = { name:'', phone:'', address:'', note:'', customerId:null, customerName:'',
      customerQuery:'', customerResults:[], searching:false, selected:{}, saving:false, useNpp:false };
    draw();
    if(!state.productsLoaded){
      const { data } = await ctx.supabase.from('sk_products').select('id,name,category,retail_price,npp_price,pv,short_description,image_url,detail_sections,benefits').order('name', { ascending:true });
      state.allProducts = data || [];
      state.productsLoaded = true;
      draw();
    }
  }
  function closeCreateForm(){ state.showCreate = false; state.createForm = null; draw(); }

  async function searchCreateCustomer(){
    const f = state.createForm;
    const q = f.customerQuery.trim();
    if(!q){ f.customerResults = []; draw(); return; }
    f.searching = true; draw();
    const { data } = await ctx.supabase.from('profiles').select('id,email,full_name').or(`email.ilike.%${q}%,full_name.ilike.%${q}%`).limit(10);
    f.customerResults = data || [];
    f.searching = false;
    draw();
  }
  function pickCreateCustomer(p){
    const f = state.createForm;
    f.customerId = p.id; f.customerName = p.full_name || p.email || '(chưa đặt tên)';
    f.customerQuery = ''; f.customerResults = [];
    draw();
  }

  // 2026-09-19, chị Quỳnh: "có khách e muốn để cho giá NPP" — cho admin BẬT TAY giá NPP cho đúng đơn
  // này (không phụ thuộc khách có được gắn cờ sk_is_npp hay không, vì đơn tay có thể là khách vãng
  // lai không có tài khoản để gắn cờ) — swap retail_price→npp_price ngay tại danh sách hiển thị/tính
  // tiền, giống hệt cách skApplyNppPricing làm ở các trang khách hàng.
  function createDisplayProducts(){
    const f = state.createForm;
    if(!f.useNpp) return state.allProducts;
    return state.allProducts.map(p => p.npp_price!=null ? { ...p, retail_price:p.npp_price } : p);
  }

  function createTotals(){
    const f = state.createForm;
    const products = createDisplayProducts();
    const chosen = products.filter(p=>f.selected[p.id]!==undefined);
    const subtotal = chosen.reduce((s,p)=>s+Number(p.retail_price||0)*(f.selected[p.id]||1),0);
    const pv = chosen.reduce((s,p)=>s+Number(p.pv||0)*(f.selected[p.id]||1),0);
    const surcharge = skOrderSurcharge(subtotal);
    return { chosen, subtotal, surcharge, total:subtotal+surcharge, pv };
  }

  async function submitCreate(){
    const f = state.createForm;
    const name = f.name.trim(), phone = f.phone.trim(), address = f.address.trim();
    if(!name || !phone || !address){ alert('Vui lòng nhập đủ tên, số điện thoại, địa chỉ giao hàng.'); return; }
    const { chosen, surcharge, total, pv } = createTotals();
    if(chosen.length===0){ alert('Chọn ít nhất 1 sản phẩm.'); return; }
    f.saving = true; draw();
    const { error } = await ctx.supabase.from('sk_orders').insert({
      user_id: f.customerId || null,
      items: chosen.map(p=>({ product_id:p.id, name:p.name, price:Number(p.retail_price||0), pv:Number(p.pv||0), qty:f.selected[p.id]||1 })),
      total_amount: total, surcharge_amount: surcharge, total_pv: pv,
      shipping_name: name, shipping_phone: phone, shipping_address: address,
      note: f.note.trim() || null,
      status: 'cho_xac_nhan',
    });
    f.saving = false;
    if(error){ alert('Không tạo được đơn: ' + error.message); draw(); return; }
    closeCreateForm();
    await load();
  }

  function createFormHtml(){
    const f = state.createForm;
    const { chosen, subtotal, surcharge, total, pv } = createTotals();
    return `
      <div class="card" style="margin-bottom:20px;">
        <h3 style="margin-bottom:12px;">Tạo đơn hàng thủ công</h3>
        <div class="hint-box" style="margin-bottom:14px;">Dùng cho khách chị bán trực tiếp (Zalo/điện thoại...), chưa từng vào app. Nếu khách đã có tài khoản, tìm và gắn đúng người để họ thấy lại đơn khi đăng nhập — không tìm thấy/để trống vẫn tạo được đơn bình thường.</div>

        <div class="field"><label>Khách hàng đã có tài khoản (không bắt buộc)</label>
          ${f.customerId ? `
            <div style="display:flex;align-items:center;gap:8px;">
              <span style="font-size:15px;font-weight:600;">✓ ${esc(f.customerName)}</span>
              <span class="btn-ghost btn btn-sm" id="dh-clear-customer">Bỏ chọn</span>
            </div>
          ` : `
            <div style="display:flex;gap:8px;">
              <input type="text" id="dh-customer-search" placeholder="Tìm theo email hoặc tên..." value="${esc(f.customerQuery)}" style="margin:0;flex:1;">
              <button class="btn btn-sm" id="dh-customer-search-btn" ${f.searching?'disabled':''}>${f.searching?'Đang tìm…':'Tìm'}</button>
            </div>
            ${f.customerResults.length>0 ? f.customerResults.map(p=>`
              <div data-pick-customer="${esc(p.id)}" style="padding:8px 4px;border-bottom:1px solid var(--line);cursor:pointer;font-size:14.5px;">${esc(p.full_name||'(chưa đặt tên)')} — ${esc(p.email||'')}</div>
            `).join('') : ''}
          `}
        </div>

        <div class="field" style="margin-top:12px;"><label>Tên người nhận</label><input type="text" id="dh-name" value="${esc(f.name)}"></div>
        <div class="field" style="margin-top:12px;"><label>Số điện thoại</label><input type="text" id="dh-phone" value="${esc(f.phone)}"></div>
        <div class="field" style="margin-top:12px;"><label>Địa chỉ giao hàng</label><textarea id="dh-address" style="min-height:60px;">${esc(f.address)}</textarea></div>
        <div class="field" style="margin-top:12px;"><label>Ghi chú (không bắt buộc)</label><input type="text" id="dh-note" value="${esc(f.note)}" placeholder="VD: tặng kèm son màu 503..."></div>
        <label style="display:flex;align-items:center;gap:6px;margin-top:12px;font-size:14.5px;cursor:pointer;"><input type="checkbox" id="dh-use-npp" ${f.useNpp?'checked':''} style="width:auto;margin:0;">🏷️ Áp dụng giá NPP cho đơn này</label>

        <div style="margin-top:16px;font-weight:700;font-size:15px;">Chọn sản phẩm</div>
        <div style="max-height:50vh;overflow-y:auto;margin-top:8px;">
          ${state.allProducts.length===0 ? `<div class="loading"><div class="spinner"></div></div>` :
            createDisplayProducts().map(p=>skProductOrderRowHtml(p, f.selected[p.id]!==undefined, f.selected[p.id]||1)).join('')}
        </div>

        <div style="font-size:14.5px;display:flex;justify-content:space-between;margin-top:14px;color:var(--ink-soft);">
          <span>Tiền hàng</span><span>${subtotal.toLocaleString('vi-VN')}đ</span>
        </div>
        ${surcharge>0 ? `
          <div style="font-size:14.5px;display:flex;justify-content:space-between;color:var(--ink-soft);">
            <span>Phụ phí đơn trên ${SK_ORDER_SURCHARGE_TIERS.find(t=>subtotal>t.min).min.toLocaleString('vi-VN')}đ</span><span>+${surcharge.toLocaleString('vi-VN')}đ</span>
          </div>
        ` : ''}
        <div style="display:flex;justify-content:space-between;font-weight:700;font-size:16.5px;margin-top:6px;">
          <span>Tổng cộng</span><span style="color:var(--accent);">${total.toLocaleString('vi-VN')}đ · ${pv} PV</span>
        </div>
        <div class="btn-row" style="justify-content:flex-start;margin-top:14px;">
          <button class="btn btn-sm" id="dh-create-submit" ${f.saving?'disabled':''}>${f.saving?'Đang lưu…':'Tạo đơn'}</button>
          <span class="btn-ghost btn btn-sm" id="dh-create-cancel">Huỷ</span>
        </div>
      </div>
    `;
  }

  function html(){
    return `
      ${state.showCreate ? createFormHtml() : `<button class="btn btn-sm" id="dh-create-open" style="margin-bottom:20px;">+ Tạo đơn hàng thủ công</button>`}
      ${state.loading ? `<div class="loading"><div class="spinner"></div></div>` : (
        state.orders.length===0 ? `<div style="color:var(--ink-soft);font-size:15.5px;">Chưa có đơn hàng nào.</div>` :
        state.orders.map(o=>{
          const profile = o.user_id ? (state.profileById[o.user_id] || {}) : null;
          const items = Array.isArray(o.items) ? o.items : [];
          return `
            <div class="section">
              <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;flex-wrap:wrap;">
                <div>
                  <div style="font-weight:600;font-size:15.5px;">${profile ? esc(profile.full_name||'(chưa đặt tên)') : `👤 ${esc(o.shipping_name)}`}${!profile ? ` <span style="font-size:12.5px;font-weight:400;color:var(--ink-soft);">(khách ngoài app)</span>` : ''}</div>
                  <div style="font-size:14px;color:var(--ink-soft);margin-top:2px;">${profile ? esc(profile.email||'') + ' · ' : ''}${esc(new Date(o.created_at).toLocaleString('vi-VN'))}</div>
                </div>
                <div style="display:flex;gap:6px;align-items:center;">
                  <select data-order-status="${esc(o.id)}" ${state.busyId===o.id?'disabled':''}>
                    ${Object.keys(SK_ORDER_STATUS_LABELS).map(k=>`<option value="${k}" ${o.status===k?'selected':''}>${esc(SK_ORDER_STATUS_LABELS[k])}</option>`).join('')}
                  </select>
                  <span class="btn-ghost btn btn-sm" style="color:var(--danger);" data-order-delete="${esc(o.id)}">Xoá</span>
                </div>
              </div>
              <div style="font-size:15px;margin-top:10px;line-height:1.7;">
                ${items.map(it=>{
                  const qty = it.qty||1;
                  return `${esc(it.name)}${qty>1?` × ${qty}`:''} — ${(Number(it.price||0)*qty).toLocaleString('vi-VN')}đ`;
                }).join('<br>')}
              </div>
              <div style="font-size:15px;margin-top:8px;">
                <b>Tổng: ${Number(o.total_amount||0).toLocaleString('vi-VN')}đ</b> · ${o.total_pv||0} PV
                ${Number(o.surcharge_amount||0)>0 ? ` (đã gồm phụ phí ${Number(o.surcharge_amount).toLocaleString('vi-VN')}đ)` : ''}
                ${o.gift ? ` · ${esc(SK_ORDER_GIFT_LABELS[o.gift]||o.gift)}` : ''}
                ${o.gift_color ? ` (màu son: ${esc(SK_GIFT_COLOR_LABELS[o.gift_color]||o.gift_color)})` : ''}
              </div>
              ${o.gift ? `
                <div style="display:flex;gap:8px;margin-top:8px;">
                  <img src="${esc(SK_GIFT_SHAKER_IMAGE)}" alt="Bình lắc" title="Bình lắc" style="width:52px;height:52px;object-fit:cover;border-radius:8px;">
                  ${o.gift_color ? `<img src="${esc((SK_LIPSTICK_COLORS.find(c=>c.key===o.gift_color)||{}).image)}" alt="Son ${esc(SK_GIFT_COLOR_LABELS[o.gift_color]||'')}" title="Son ${esc(SK_GIFT_COLOR_LABELS[o.gift_color]||'')}" style="width:52px;height:52px;object-fit:cover;border-radius:8px;">` : ''}
                </div>
              ` : ''}
              <div style="font-size:14.5px;color:var(--ink-soft);margin-top:8px;">
                Giao tới: ${esc(o.shipping_name)} · ${esc(o.shipping_phone)}<br>${esc(o.shipping_address)}
                ${o.note ? `<br>Ghi chú: ${esc(o.note)}` : ''}
              </div>
            </div>
          `;
        }).join('')
      )}
    `;
  }

  function bind(){
    container.querySelectorAll('[data-order-delete]').forEach(el=>{
      el.onclick = ()=>deleteOrder(el.getAttribute('data-order-delete'));
    });
    container.querySelectorAll('[data-order-status]').forEach(el=>{
      el.onchange = (e)=>updateStatus(el.getAttribute('data-order-status'), e.target.value);
    });
    const createOpenBtn = container.querySelector('#dh-create-open'); if(createOpenBtn) createOpenBtn.onclick = openCreateForm;
    const createCancelBtn = container.querySelector('#dh-create-cancel'); if(createCancelBtn) createCancelBtn.onclick = closeCreateForm;
    const createSubmitBtn = container.querySelector('#dh-create-submit'); if(createSubmitBtn) createSubmitBtn.onclick = submitCreate;
    if(!state.createForm) return;
    const f = state.createForm;
    const nameEl = container.querySelector('#dh-name'); if(nameEl) nameEl.oninput = (e)=>{ f.name = e.target.value; };
    const phoneEl = container.querySelector('#dh-phone'); if(phoneEl) phoneEl.oninput = (e)=>{ f.phone = e.target.value; };
    const addressEl = container.querySelector('#dh-address'); if(addressEl) addressEl.oninput = (e)=>{ f.address = e.target.value; };
    const noteEl = container.querySelector('#dh-note'); if(noteEl) noteEl.oninput = (e)=>{ f.note = e.target.value; };
    const useNppEl = container.querySelector('#dh-use-npp'); if(useNppEl) useNppEl.onchange = (e)=>{ f.useNpp = e.target.checked; draw(); };
    const customerSearchEl = container.querySelector('#dh-customer-search'); if(customerSearchEl) customerSearchEl.oninput = (e)=>{ f.customerQuery = e.target.value; };
    const customerSearchBtn = container.querySelector('#dh-customer-search-btn'); if(customerSearchBtn) customerSearchBtn.onclick = searchCreateCustomer;
    const clearCustomerBtn = container.querySelector('#dh-clear-customer'); if(clearCustomerBtn) clearCustomerBtn.onclick = ()=>{ f.customerId = null; f.customerName = ''; draw(); };
    container.querySelectorAll('[data-pick-customer]').forEach(el=>{
      el.onclick = ()=>{
        const p = f.customerResults.find(r=>r.id===el.getAttribute('data-pick-customer'));
        if(p) pickCreateCustomer(p);
      };
    });
    container.querySelectorAll('[data-cart-toggle]').forEach(el=>{
      el.onchange = (e)=>{
        const id = el.getAttribute('data-cart-toggle');
        if(e.target.checked) f.selected[id] = f.selected[id]||1; else delete f.selected[id];
        draw();
      };
    });
    container.querySelectorAll('[data-qty-dec]').forEach(el=>{
      el.onclick = ()=>{
        const id = el.getAttribute('data-qty-dec');
        f.selected[id] = Math.max(1, (f.selected[id]||1)-1);
        draw();
      };
    });
    container.querySelectorAll('[data-qty-inc]').forEach(el=>{
      el.onclick = ()=>{
        const id = el.getAttribute('data-qty-inc');
        f.selected[id] = (f.selected[id]||1)+1;
        draw();
      };
    });
  }

  load();
}

// ===== Tab "Thống Kê" — doanh số & lãi lẻ theo tháng (2026-09-19, chị Quỳnh: "cho e cái thống kê
// doanh số và lãi lẻ kiểu bảng tài chính 1 cách chuyên nghiệp á"). "Lãi lẻ" = giá bán lẻ trừ giá vốn
// (sk_products.cost_price, admin tự nhập ở tab Sản Phẩm — KHÔNG suy ra được từ dữ liệu sẵn có). Chỉ
// tính doanh số/lãi lẻ trên đơn ĐÃ XÁC NHẬN/ĐÃ GIAO (status) — "chờ xác nhận" hiện riêng vì chưa chắc
// chốt được, "đã huỷ" bỏ hẳn. Giá vốn lấy CURRENT sk_products.cost_price tại thời điểm xem báo cáo
// (không snapshot lúc đặt hàng vì customer-facing product query không được phép đọc cost_price —
// xem san-pham.js — nên đổi giá vốn sẽ áp dụng lùi lại cả đơn cũ, chấp nhận được vì giá vốn ít đổi).
function renderThongKe(container, ctx){
  // 2026-09-20, chị Quỳnh: "phần thống kê ko ghi thống kê mà ghi báo cáo doanh thu chẳng hạn và có
  // thời gian cụ thể" — đổi tên hiển thị (tab + tiêu đề) thành "Báo Cáo Doanh Thu" + thêm bộ lọc từ
  // ngày/đến ngày để xem đúng khoảng thời gian cần, không chỉ xem gộp tất cả.
  const state = { loading:true, orders:[], costByProduct:{}, dateFrom:'', dateTo:'' };

  function draw(){ container.innerHTML = html(); bind(); }

  async function load(){
    state.loading = true; draw();
    const [{ data: orders }, { data: products }] = await Promise.all([
      ctx.supabase.from('sk_orders').select('items,total_amount,total_pv,surcharge_amount,status,created_at').order('created_at', { ascending:false }).limit(2000),
      ctx.supabase.from('sk_products').select('id,cost_price'),
    ]);
    state.orders = orders || [];
    state.costByProduct = {};
    (products||[]).forEach(p=>{ state.costByProduct[p.id] = p.cost_price; });
    state.loading = false;
    draw();
  }

  function monthKey(iso){ return iso.slice(0,7); }
  function monthLabel(key){ const [y,m] = key.split('-'); return `Tháng ${Number(m)}/${y}`; }

  function inRange(iso){
    const d = iso.slice(0,10);
    if(state.dateFrom && d < state.dateFrom) return false;
    if(state.dateTo && d > state.dateTo) return false;
    return true;
  }

  function buildReport(){
    const inWindow = state.orders.filter(o=>inRange(o.created_at));
    const counted = inWindow.filter(o=>o.status==='da_xac_nhan' || o.status==='da_giao');
    const pending = inWindow.filter(o=>o.status==='cho_xac_nhan');
    const byMonth = {};
    let missingCost = false;
    counted.forEach(o=>{
      const key = monthKey(o.created_at);
      if(!byMonth[key]) byMonth[key] = { key, orderCount:0, revenue:0, profit:0, pv:0 };
      const m = byMonth[key];
      m.orderCount += 1;
      m.revenue += Number(o.total_amount||0);
      // Phụ phí (surcharge_amount) là lợi nhuận THUẦN, không gắn với giá vốn sản phẩm nào — cộng
      // thẳng vào lãi lẻ (2026-09-19, xem SK_ORDER_SURCHARGE_TIERS ở util.js).
      m.profit += Number(o.surcharge_amount||0);
      m.pv += Number(o.total_pv||0);
      (Array.isArray(o.items) ? o.items : []).forEach(it=>{
        const cost = state.costByProduct[it.product_id];
        if(cost==null){ missingCost = true; return; }
        m.profit += (Number(it.price||0) - Number(cost)) * (it.qty||1);
      });
    });
    const months = Object.values(byMonth).sort((a,b)=> b.key.localeCompare(a.key));
    const totals = months.reduce((s,m)=>({ orderCount:s.orderCount+m.orderCount, revenue:s.revenue+m.revenue, profit:s.profit+m.profit, pv:s.pv+m.pv }), { orderCount:0, revenue:0, profit:0, pv:0 });
    const pendingTotal = pending.reduce((s,o)=>s+Number(o.total_amount||0), 0);
    return { months, totals, missingCost, pendingCount:pending.length, pendingTotal };
  }

  function html(){
    if(state.loading) return `<div class="loading"><div class="spinner"></div></div>`;
    const { months, totals, missingCost, pendingCount, pendingTotal } = buildReport();
    return `
      <div class="page-head"><h1 style="font-size:20px;">Báo Cáo Doanh Thu</h1><p>Chỉ tính đơn đã xác nhận/đã giao — đơn chờ xác nhận và đơn đã huỷ không tính vào đây.</p></div>

      <div class="card" style="margin-bottom:16px;display:flex;gap:14px;align-items:flex-end;flex-wrap:wrap;">
        <div class="field" style="margin:0;"><label>Từ ngày</label><input type="date" id="bc-date-from" value="${esc(state.dateFrom)}"></div>
        <div class="field" style="margin:0;"><label>Đến ngày</label><input type="date" id="bc-date-to" value="${esc(state.dateTo)}"></div>
        ${(state.dateFrom || state.dateTo) ? `<span class="btn-ghost btn btn-sm" id="bc-date-clear">Xoá lọc — xem tất cả</span>` : ''}
      </div>

      <div class="card" style="margin-bottom:20px;display:flex;gap:24px;flex-wrap:wrap;">
        <div>
          <div style="font-size:13.5px;color:var(--ink-soft);text-transform:uppercase;letter-spacing:.05em;">Tổng doanh số</div>
          <div style="font-family:'IBM Plex Mono',monospace;font-size:22px;font-weight:700;color:var(--accent);">${totals.revenue.toLocaleString('vi-VN')}đ</div>
        </div>
        <div>
          <div style="font-size:13.5px;color:var(--ink-soft);text-transform:uppercase;letter-spacing:.05em;">Tổng lãi lẻ</div>
          <div style="font-family:'IBM Plex Mono',monospace;font-size:22px;font-weight:700;color:#1f9d63;">${totals.profit.toLocaleString('vi-VN')}đ</div>
        </div>
        <div>
          <div style="font-size:13.5px;color:var(--ink-soft);text-transform:uppercase;letter-spacing:.05em;">Tổng đơn</div>
          <div style="font-family:'IBM Plex Mono',monospace;font-size:22px;font-weight:700;">${totals.orderCount}</div>
        </div>
        <div>
          <div style="font-size:13.5px;color:var(--ink-soft);text-transform:uppercase;letter-spacing:.05em;">Tổng PV</div>
          <div style="font-family:'IBM Plex Mono',monospace;font-size:22px;font-weight:700;">${totals.pv}</div>
        </div>
      </div>

      ${missingCost ? `<div class="hint-box" style="margin-bottom:16px;">⚠️ Một số sản phẩm trong các đơn chưa có "Giá vốn" — lãi lẻ ở đây CHƯA đầy đủ. Vào Quản Trị &gt; Sản Phẩm nhập giá vốn cho từng sản phẩm để lãi lẻ tính đúng.</div>` : ''}
      ${pendingCount>0 ? `<div class="hint-box" style="margin-bottom:16px;">📋 Còn ${pendingCount} đơn đang chờ xác nhận, tổng giá trị ${pendingTotal.toLocaleString('vi-VN')}đ — chưa tính vào thống kê bên trên.</div>` : ''}

      ${months.length===0 ? `<div style="color:var(--ink-soft);font-size:15.5px;">Chưa có đơn hàng nào đã xác nhận/đã giao.</div>` : `
        <div style="overflow-x:auto;">
          <table style="width:100%;border-collapse:collapse;font-size:15px;">
            <thead>
              <tr style="border-bottom:2px solid var(--line);">
                <th style="text-align:left;padding:10px 8px;">Tháng</th>
                <th style="text-align:right;padding:10px 8px;">Số đơn</th>
                <th style="text-align:right;padding:10px 8px;">Doanh số</th>
                <th style="text-align:right;padding:10px 8px;">Lãi lẻ</th>
                <th style="text-align:right;padding:10px 8px;">PV</th>
              </tr>
            </thead>
            <tbody>
              ${months.map(m=>`
                <tr style="border-bottom:1px solid var(--line);">
                  <td style="padding:10px 8px;font-weight:600;">${esc(monthLabel(m.key))}</td>
                  <td style="text-align:right;padding:10px 8px;font-family:'IBM Plex Mono',monospace;">${m.orderCount}</td>
                  <td style="text-align:right;padding:10px 8px;font-family:'IBM Plex Mono',monospace;color:var(--accent);">${m.revenue.toLocaleString('vi-VN')}đ</td>
                  <td style="text-align:right;padding:10px 8px;font-family:'IBM Plex Mono',monospace;color:#1f9d63;">${m.profit.toLocaleString('vi-VN')}đ</td>
                  <td style="text-align:right;padding:10px 8px;font-family:'IBM Plex Mono',monospace;">${m.pv}</td>
                </tr>
              `).join('')}
            </tbody>
            <tfoot>
              <tr style="border-top:2px solid var(--line);font-weight:700;">
                <td style="padding:10px 8px;">Tổng cộng</td>
                <td style="text-align:right;padding:10px 8px;font-family:'IBM Plex Mono',monospace;">${totals.orderCount}</td>
                <td style="text-align:right;padding:10px 8px;font-family:'IBM Plex Mono',monospace;color:var(--accent);">${totals.revenue.toLocaleString('vi-VN')}đ</td>
                <td style="text-align:right;padding:10px 8px;font-family:'IBM Plex Mono',monospace;color:#1f9d63;">${totals.profit.toLocaleString('vi-VN')}đ</td>
                <td style="text-align:right;padding:10px 8px;font-family:'IBM Plex Mono',monospace;">${totals.pv}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      `}
    `;
  }

  function bind(){
    const fromEl = container.querySelector('#bc-date-from'); if(fromEl) fromEl.onchange = (e)=>{ state.dateFrom = e.target.value; draw(); };
    const toEl = container.querySelector('#bc-date-to'); if(toEl) toEl.onchange = (e)=>{ state.dateTo = e.target.value; draw(); };
    const clearEl = container.querySelector('#bc-date-clear'); if(clearEl) clearEl.onclick = ()=>{ state.dateFrom=''; state.dateTo=''; draw(); };
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
    const { error } = await ctx.supabase.from('sk_success_stories').delete().eq('id', id);
    state.deletingId = null;
    if(error) alert('Không xoá được: ' + error.message);
    await load();
  }

  function itemRowHtml(item){
    const catLabel = (SK_PRODUCT_CATEGORIES.find(c=>c.key===item.category)||{}).label;
    return `
      <div class="section" style="display:flex;gap:12px;align-items:flex-start;">
        ${item.images && item.images[0] ? `<img src="${item.images[0]}" style="width:56px;height:56px;object-fit:cover;border-radius:8px;flex-shrink:0;">` : ''}
        <div style="flex:1;min-width:0;">
          <div style="font-weight:700;">${esc(item.display_name)}${catLabel ? ` <span style="font-size:13px;font-weight:400;color:var(--ink-soft);">· ${esc(catLabel)}</span>` : ''}</div>
          <div style="font-size:14.5px;color:var(--ink-soft);margin-top:4px;">${esc((item.story||'').slice(0,140))}${(item.story||'').length>140?'…':''}</div>
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
            <h2 style="font-size:19px;">${f.id ? 'Sửa câu chuyện' : 'Thêm câu chuyện'}</h2>
            <span id="cc-form-close" style="cursor:pointer;font-size:20px;color:var(--ink-soft);line-height:1;">✕</span>
          </div>
          ${state.error ? `<div class="error-box">${esc(state.error)}</div>` : ''}
          <label style="display:block;font-size:14px;font-weight:600;color:var(--ink-soft);margin-top:12px;">Tên hiển thị</label>
          <input type="text" id="cc-name" value="${esc(f.display_name)}" placeholder="Tên thật hoặc viết tắt, tuỳ khách đồng ý">
          <label style="display:block;font-size:14px;font-weight:600;color:var(--ink-soft);margin-top:12px;">Nhánh liên quan (không bắt buộc)</label>
          <select id="cc-category">
            <option value="" ${!f.category?'selected':''}>— Chung, không gắn nhánh —</option>
            ${SK_PRODUCT_CATEGORIES.map(c=>`<option value="${c.key}" ${f.category===c.key?'selected':''}>${esc(c.label)}</option>`).join('')}
          </select>
          <label style="display:block;font-size:14px;font-weight:600;color:var(--ink-soft);margin-top:12px;">Câu chuyện</label>
          <textarea id="cc-story" style="min-height:140px;" placeholder="Trước đây thế nào, đã dùng sản phẩm/gói gì, kết quả ra sao...">${esc(f.story)}</textarea>
          <label style="display:block;font-size:14px;font-weight:600;color:var(--ink-soft);margin-top:12px;">Hình ảnh (tối đa ${CAU_CHUYEN_MAX_IMAGES})</label>
          <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:8px;">
            ${f.images.map((src,i)=>`
              <div style="position:relative;width:80px;height:80px;">
                <img src="${src}" style="width:100%;height:100%;object-fit:cover;border-radius:10px;border:1px solid var(--line);">
                <span data-remove-img="${i}" style="position:absolute;top:-6px;right:-6px;background:var(--danger);color:#fff;width:20px;height:20px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:13.5px;cursor:pointer;">✕</span>
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
          ? `<div style="color:var(--ink-soft);font-size:15.5px;">Chưa có câu chuyện nào — bấm "+ Thêm câu chuyện" để thêm case đầu tiên.</div>`
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
