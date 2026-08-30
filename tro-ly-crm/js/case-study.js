// Kho Case Study — nơi lưu case khách cũ (hình + câu chuyện) để bước "gửi case tương tự" trong sổ
// tay Tư Vấn AI tự lấy đúng case thật theo nhóm (giảm mỡ/sức khỏe khác) thay vì placeholder chung
// chung (chị Quỳnh chốt 2026-08-30: "thêm mục case study cho người dùng tự cập nhật lên, kiểu kho
// lưu trữ"). Đọc/ghi thẳng crm_case_studies (RLS khoá theo user_id).
(function(){
const MAX_IMAGES = 4;
const NHOM_OPTIONS = [
  { key:'giam-mo', label:'Giảm cân / giảm mỡ' },
  { key:'suc-khoe-khac', label:'Vấn đề sức khỏe khác' },
  { key:'khac', label:'Khác' },
];
function nhomLabel(key){
  const found = NHOM_OPTIONS.find(n => n.key === key);
  return found ? found.label : (key || 'Khác');
}

// Nếu người dùng lưu case mà KHÔNG tự chọn nhóm (chị Quỳnh chốt 2026-08-30: "case study cho người
// dùng tự thêm, AI sẽ phân loại nếu người dùng không tự thêm") — gọi api/case-study-classify.js đọc
// nội dung tự đoán đúng 1 trong 3 nhóm ở trên, thay vì bắt buộc chọn tay như trước.
async function classifyNhom(noiDung){
  const data = await callApi('/api/case-study-classify', { noi_dung: noiDung });
  return data.nhom;
}

function render(container, ctx){
  const state = {
    loading: true, items: [], filterNhom: 'all',
    showForm: false, form: null, saving: false, error: '',
    detail: null, deleting: false,
  };

  function draw(){ container.innerHTML = html(); bind(); }

  async function load(){
    state.loading = true; draw();
    const { data } = await ctx.supabase.from('crm_case_studies').select('*')
      .eq('user_id', ctx.user.id).order('created_at', { ascending: false });
    state.items = data || [];
    state.loading = false;
    draw();
  }

  function filteredItems(){
    if(state.filterNhom === 'all') return state.items;
    return state.items.filter(i => i.nhom === state.filterNhom);
  }

  // ===== Form thêm/sửa =====
  function openForm(item){
    state.showForm = true; state.error = '';
    state.form = item
      ? { id: item.id, nhom: item.nhom || '', tieu_de: item.tieu_de || '', noi_dung: item.noi_dung || '', hinh_anh: item.hinh_anh || [] }
      : { id: null, nhom: '', tieu_de: '', noi_dung: '', hinh_anh: [] };
    draw();
  }
  function closeForm(){ state.showForm = false; state.form = null; draw(); }

  function handleFiles(files){
    const f = state.form;
    Array.from(files).slice(0, MAX_IMAGES - f.hinh_anh.length).forEach((file)=>{
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
          f.hinh_anh = [...f.hinh_anh, c.toDataURL('image/jpeg', 0.82)].slice(0, MAX_IMAGES);
          draw();
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }
  function removeImage(idx){
    state.form.hinh_anh = state.form.hinh_anh.filter((_,i)=>i!==idx);
    draw();
  }

  async function saveForm(){
    const f = state.form;
    if(!f.noi_dung.trim()){ state.error = 'Nhập câu chuyện của case này.'; draw(); return; }
    state.saving = true; state.error = ''; draw();
    let nhom = f.nhom;
    if(!nhom){
      try{ nhom = await classifyNhom(f.noi_dung.trim()); }
      catch(e){ state.saving = false; state.error = `Không tự phân loại được (${e.message}) — chọn tay giúp mình mục Nhóm ở trên.`; draw(); return; }
    }
    const payload = { user_id: ctx.user.id, nhom, tieu_de: f.tieu_de.trim() || null, noi_dung: f.noi_dung.trim(), hinh_anh: f.hinh_anh };
    const { error } = f.id
      ? await ctx.supabase.from('crm_case_studies').update(payload).eq('id', f.id)
      : await ctx.supabase.from('crm_case_studies').insert(payload);
    state.saving = false;
    if(error){ state.error = error.message; draw(); return; }
    state.showForm = false; state.form = null;
    await load();
  }

  async function deleteItem(id){
    if(!(await confirmModal('Xoá case study này?'))) return;
    state.deleting = true; draw();
    await ctx.supabase.from('crm_case_studies').delete().eq('id', id);
    state.deleting = false;
    state.detail = null;
    await load();
  }

  // ===== Render =====
  function itemCardHtml(item){
    const thumb = (item.hinh_anh && item.hinh_anh[0]) || null;
    return `
      <div class="list-item" data-open="${item.id}" style="cursor:pointer;gap:14px;">
        ${thumb ? `<img src="${thumb}" style="width:56px;height:56px;object-fit:cover;border-radius:8px;border:1px solid var(--line);flex-shrink:0;">` : ''}
        <div class="txt">
          <div class="meta">${esc(nhomLabel(item.nhom))}</div>
          <div style="font-weight:600;">${esc(item.tieu_de || 'Case study')}</div>
          <div style="font-size:13px;color:var(--ink-soft);margin-top:2px;">${esc((item.noi_dung||'').slice(0,100))}${(item.noi_dung||'').length>100?'…':''}</div>
        </div>
      </div>
    `;
  }

  function detailHtml(){
    const item = state.items.find(i => i.id === state.detail);
    if(!item) return '';
    return `
      <div id="cs-detail-overlay" style="position:fixed;inset:0;z-index:9998;background:rgba(20,24,20,.6);display:flex;justify-content:center;padding:24px 16px;overflow-y:auto;">
        <div data-modal-box style="background:var(--panel);border-radius:14px;max-width:560px;width:100%;padding:26px 24px;box-shadow:0 12px 40px rgba(0,0,0,.4);height:fit-content;margin:0 auto;">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;margin-bottom:10px;">
            <h2 style="font-family:'Playfair Display',serif;font-size:20px;">${esc(item.tieu_de || 'Case study')}</h2>
            <span id="cs-detail-close" style="cursor:pointer;font-size:20px;color:var(--ink-soft);line-height:1;">✕</span>
          </div>
          <div class="meta" style="margin-bottom:10px;">${esc(nhomLabel(item.nhom))}</div>
          ${(item.hinh_anh||[]).length ? `
            <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px;">
              ${item.hinh_anh.map(src=>`<img src="${src}" data-zoom-img="${esc(src)}" style="width:100px;height:100px;object-fit:cover;border-radius:10px;border:1px solid var(--line);cursor:zoom-in;">`).join('')}
            </div>
          ` : ''}
          <div style="white-space:pre-line;line-height:1.7;">${esc(item.noi_dung)}</div>
          <div class="btn-row" style="justify-content:flex-start;margin-top:18px;">
            <span class="btn-ghost btn btn-sm" id="cs-detail-edit">Sửa</span>
            <span class="btn-ghost btn btn-sm" style="color:var(--danger);${state.deleting?'opacity:.6;pointer-events:none;':''}" id="cs-detail-delete">${state.deleting?'Đang xoá…':'Xoá'}</span>
          </div>
        </div>
      </div>
    `;
  }

  function formHtml(){
    const f = state.form;
    return `
      <div id="cs-form-overlay" style="position:fixed;inset:0;z-index:9998;background:rgba(20,24,20,.6);display:flex;justify-content:center;padding:24px 16px;overflow-y:auto;">
        <div data-modal-box style="background:var(--panel);border-radius:14px;max-width:520px;width:100%;padding:26px 24px;box-shadow:0 12px 40px rgba(0,0,0,.4);height:fit-content;margin:0 auto;">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;margin-bottom:6px;">
            <h2 style="font-family:'Playfair Display',serif;font-size:20px;">${f.id ? 'Sửa case study' : 'Thêm case study'}</h2>
            <span id="cs-form-close" style="cursor:pointer;font-size:20px;color:var(--ink-soft);line-height:1;">✕</span>
          </div>
          ${state.error ? `<div class="error-box">${esc(state.error)}</div>` : ''}
          <label style="display:block;font-size:12.5px;font-weight:600;color:var(--ink-soft);margin-top:12px;">Nhóm</label>
          <select id="cs-nhom" style="margin-top:6px;">
            <option value="" ${!f.nhom?'selected':''}>✨ Để AI tự phân loại</option>
            ${NHOM_OPTIONS.map(n=>`<option value="${n.key}" ${f.nhom===n.key?'selected':''}>${esc(n.label)}</option>`).join('')}
          </select>
          <div style="font-size:11.5px;color:var(--ink-soft);margin-top:4px;">Không chắc nên xếp vào nhóm nào cũng được — để trống, AI sẽ đọc câu chuyện và tự xếp nhóm khi lưu.</div>
          <label style="display:block;font-size:12.5px;font-weight:600;color:var(--ink-soft);margin-top:12px;">Tiêu đề ngắn</label>
          <input type="text" id="cs-tieu-de" value="${esc(f.tieu_de)}" placeholder="VD: Chị Lan — giảm 5kg sau 30 ngày">
          <label style="display:block;font-size:12.5px;font-weight:600;color:var(--ink-soft);margin-top:12px;">Câu chuyện của case này</label>
          <textarea id="cs-noi-dung" style="min-height:140px;" placeholder="Trước đây thế nào, đã dùng giải pháp gì, kết quả ra sao...">${esc(f.noi_dung)}</textarea>
          <label style="display:block;font-size:12.5px;font-weight:600;color:var(--ink-soft);margin-top:12px;">Hình ảnh (tối đa ${MAX_IMAGES})</label>
          <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:8px;">
            ${f.hinh_anh.map((src,i)=>`
              <div style="position:relative;width:80px;height:80px;">
                <img src="${src}" style="width:100%;height:100%;object-fit:cover;border-radius:10px;border:1px solid var(--line);">
                <span data-remove-img="${i}" style="position:absolute;top:-6px;right:-6px;background:var(--danger);color:#fff;width:20px;height:20px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;cursor:pointer;">✕</span>
              </div>
            `).join('')}
            ${f.hinh_anh.length<MAX_IMAGES ? `<label style="width:80px;height:80px;border:1px dashed var(--line);border-radius:10px;display:flex;align-items:center;justify-content:center;cursor:pointer;color:var(--ink-soft);font-size:22px;">+<input type="file" accept="image/*" multiple id="cs-file" style="display:none;"></label>` : ''}
          </div>
          <div class="btn-row" style="justify-content:flex-start;margin-top:18px;">
            <button class="btn btn-sm" id="cs-form-save" ${state.saving?'disabled':''}>${state.saving?(f.nhom?'Đang lưu…':'Đang phân loại…'):'Lưu'}</button>
            <span class="btn-ghost btn btn-sm" id="cs-form-cancel">Huỷ</span>
          </div>
        </div>
      </div>
    `;
  }

  function html(){
    const list = filteredItems();
    return `
      <div class="page-head">
        <h1>Kho Case Study</h1>
        <p>Lưu case khách cũ (hình + câu chuyện) — sổ tay Tư Vấn AI tự lấy đúng case theo nhóm khi cần gửi cho khách mới, thay vì phải nhớ/tìm lại thủ công.</p>
      </div>

      <div class="btn-row" style="justify-content:flex-start;margin-top:0;margin-bottom:18px;">
        <button class="btn btn-sm" id="cs-new">+ Thêm case study</button>
      </div>

      <div class="chips" style="margin-top:0;margin-bottom:18px;">
        <div class="chip ${state.filterNhom==='all'?'selected':''}" data-filter-nhom="all">Tất cả</div>
        ${NHOM_OPTIONS.map(n=>`<div class="chip ${state.filterNhom===n.key?'selected':''}" data-filter-nhom="${n.key}">${esc(n.label)}</div>`).join('')}
      </div>

      ${state.loading ? `<div class="loading"><div class="spinner"></div></div>` : (
        list.length === 0
          ? `<div style="color:var(--ink-soft);font-size:14px;">${state.items.length===0 ? 'Chưa có case study nào — bấm "+ Thêm case study" để lưu case đầu tiên.' : 'Không có case nào ở nhóm này.'}</div>`
          : list.map(itemCardHtml).join('')
      )}

      ${state.detail ? detailHtml() : ''}
      ${state.showForm ? formHtml() : ''}
    `;
  }

  function bind(){
    const newBtn = container.querySelector('#cs-new');
    if(newBtn) newBtn.onclick = () => openForm(null);

    container.querySelectorAll('[data-filter-nhom]').forEach(el=>{
      el.onclick = () => { state.filterNhom = el.getAttribute('data-filter-nhom'); draw(); };
    });

    container.querySelectorAll('[data-open]').forEach(el=>{
      el.onclick = () => { state.detail = el.getAttribute('data-open'); draw(); };
    });

    const detailOverlay = container.querySelector('#cs-detail-overlay');
    if(detailOverlay){
      detailOverlay.onclick = () => { state.detail = null; draw(); };
      const box = detailOverlay.querySelector('[data-modal-box]');
      if(box) box.onclick = (e) => e.stopPropagation();
      const closeBtn = container.querySelector('#cs-detail-close');
      if(closeBtn) closeBtn.onclick = () => { state.detail = null; draw(); };
      const editBtn = container.querySelector('#cs-detail-edit');
      if(editBtn) editBtn.onclick = () => { const item = state.items.find(i=>i.id===state.detail); state.detail = null; openForm(item); };
      const delBtn = container.querySelector('#cs-detail-delete');
      if(delBtn) delBtn.onclick = () => deleteItem(state.detail);
      container.querySelectorAll('[data-zoom-img]').forEach(el=>{
        el.onclick = () => openImageLightbox(el.getAttribute('data-zoom-img'));
      });
    }

    const formOverlay = container.querySelector('#cs-form-overlay');
    if(formOverlay){
      formOverlay.onclick = closeForm;
      const box = formOverlay.querySelector('[data-modal-box]');
      if(box) box.onclick = (e) => e.stopPropagation();
      const closeBtn = container.querySelector('#cs-form-close');
      if(closeBtn) closeBtn.onclick = closeForm;
      const cancelBtn = container.querySelector('#cs-form-cancel');
      if(cancelBtn) cancelBtn.onclick = closeForm;
      const nhomEl = container.querySelector('#cs-nhom');
      if(nhomEl) nhomEl.onchange = (e) => { state.form.nhom = e.target.value; };
      const tieuDeEl = container.querySelector('#cs-tieu-de');
      if(tieuDeEl) tieuDeEl.oninput = (e) => { state.form.tieu_de = e.target.value; };
      const noiDungEl = container.querySelector('#cs-noi-dung');
      if(noiDungEl) noiDungEl.oninput = (e) => { state.form.noi_dung = e.target.value; };
      const fileEl = container.querySelector('#cs-file');
      if(fileEl) fileEl.onchange = () => { if(fileEl.files.length) handleFiles(fileEl.files); };
      container.querySelectorAll('[data-remove-img]').forEach(el=>{
        el.onclick = () => removeImage(Number(el.getAttribute('data-remove-img')));
      });
      const saveBtn = container.querySelector('#cs-form-save');
      if(saveBtn) saveBtn.onclick = saveForm;
    }
  }

  draw();
  load();
}

window.Modules = window.Modules || {};
window.Modules['case-study'] = { title: 'Kho Case Study', render };
})();
