// Sản Phẩm Số — người bán (tài khoản được bật cờ can_sell_products, xem schema_full.sql) tạo landing
// page bán file tải về (ebook...). Đây CHỈ là màn hình quản lý sản phẩm của người bán (đăng nhập) —
// trang công khai cho khách mua nằm ở san-pham-so/p/ (HTML tĩnh riêng, không qua module system này,
// vì khách KHÔNG đăng nhập). File thật KHÔNG đi qua callApi()/base64 (payload quá lớn cho hàm
// serverless) — upload thẳng lên Supabase Storage qua signed URL riêng, xem api/san-pham-so-upload-url.js.
(function(){
const DRAFT_KEY = 'san-pham-so';
// Bản thân <label>/<input> không có style mặc định nào ngoài .auth-shell (xem style.css) — mọi
// module khác đều tự inline style riêng cho từng label/input (xem dinh-vi.js, day-bai.js...), lấy
// đúng theo cách .auth-shell input đang style để đồng bộ giao diện.
const LABEL_STYLE = 'display:block;font-size:13px;font-weight:600;color:var(--ink-soft);margin-bottom:6px;';
const INPUT_STYLE = 'width:100%;padding:12px 14px;border:1px solid var(--line);border-radius:10px;font-size:14.5px;font-family:\'Be Vietnam Pro\',sans-serif;background:#FDFCF8;color:var(--ink);';

function newForm(){
  return { id:null, title:'', description:'', price:'', cover_image_url:null, file_storage_path:null, file_name:null, published:false };
}

function publicLink(slug){
  return `${location.origin}/san-pham-so/p/?slug=${encodeURIComponent(slug)}`;
}

function render(container, ctx){
  const state = { view:'list', products:[], loading:true, saving:false, error:null, form:null };

  function persistDraft(){
    if(state.view === 'edit' && state.form) saveModuleDraft(ctx, DRAFT_KEY, state.form);
  }

  async function fetchList(){
    try{
      const data = await callApi('api/san-pham-so-product', { action:'list' });
      return data.products || [];
    } catch(e){ state.error = e.message; return []; }
  }

  async function boot(){
    state.products = await fetchList();
    const draft = await loadModuleDraft(ctx, DRAFT_KEY);
    // Chỉ khôi phục nháp form nếu KHÔNG có tín hiệu điều hướng nào khác đè lên — module này chưa
    // có tín hiệu window.Pending* nào, nên luôn khôi phục nếu có nháp (đúng quy ước chung, xem util.js).
    if(draft){ state.view = 'edit'; state.form = draft; }
    state.loading = false;
    draw();
  }

  function draw(){ container.innerHTML = html(); bind(); }

  function html(){
    if(state.loading) return `<div class="loading"><div class="spinner"></div></div>`;
    return state.view === 'edit' ? editHtml() : listHtml();
  }

  function listHtml(){
    return `
      <h2>Sản Phẩm Số</h2>
      <div class="hint-box" style="margin-bottom:16px;">Tạo trang giới thiệu bán file tải về (ebook, checklist, template...) — khách không cần tài khoản, quét mã VietQR chuyển khoản là tự động nhận link tải, không cần bạn xác nhận tay.</div>
      <button class="btn" id="sps-new-btn">+ Tạo sản phẩm mới</button>
      ${state.error ? `<div class="error-box" style="margin-top:12px;">${esc(state.error)}</div>` : ''}
      <div style="margin-top:16px;display:flex;flex-direction:column;gap:12px;">
        ${state.products.length === 0 ? `<div class="card">Chưa có sản phẩm nào.</div>` : state.products.map(p => `
          <div class="card">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap;">
              <div>
                <b>${esc(p.title)}</b>
                <span style="margin-left:8px;font-size:12px;padding:2px 8px;border-radius:4px;background:${p.status==='published'?'var(--accent-soft)':'#EEE'};color:${p.status==='published'?'var(--accent)':'#888'};">${p.status==='published'?'Đã đăng':'Nháp'}</span>
                <div style="color:var(--ink-soft);font-size:13.5px;margin-top:4px;">${(p.price||0).toLocaleString('vi-VN')}đ</div>
              </div>
              <div style="display:flex;gap:8px;flex-wrap:wrap;">
                <span class="btn-ghost btn btn-sm" data-edit="${p.id}">Sửa</span>
                <span class="btn-ghost btn btn-sm" data-delete="${p.id}" style="color:var(--danger);">Xoá</span>
              </div>
            </div>
            ${p.status==='published' ? `
              <div style="margin-top:10px;display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
                <span style="font-family:'IBM Plex Mono',monospace;font-size:12.5px;background:var(--accent-soft);padding:3px 8px;border-radius:6px;word-break:break-all;">${esc(publicLink(p.slug))}</span>
                <span class="btn-ghost btn btn-sm" data-copy-link="${esc(publicLink(p.slug))}">Copy link</span>
              </div>
            ` : ''}
          </div>
        `).join('')}
      </div>
    `;
  }

  function editHtml(){
    const f = state.form;
    return `
      <h2>${f.id ? 'Sửa sản phẩm' : 'Tạo sản phẩm mới'}</h2>
      <div class="card" style="max-width:520px;">
        <label style="${LABEL_STYLE}">Tên sản phẩm</label>
        <input id="sps-title" type="text" value="${esc(f.title)}" placeholder="VD: Ebook 30 ngày quản lý chi tiêu" style="${INPUT_STYLE}">
        <label style="${LABEL_STYLE}margin-top:14px;">Mô tả (hiện trên trang giới thiệu)</label>
        <textarea id="sps-desc" rows="4" placeholder="Giới thiệu ngắn gọn nội dung, lợi ích cho người mua...">${esc(f.description||'')}</textarea>
        <label style="${LABEL_STYLE}margin-top:14px;">Giá bán (đ)</label>
        <input id="sps-price" type="number" min="1000" step="1000" value="${esc(f.price)}" placeholder="VD: 99000" style="${INPUT_STYLE}">
        <label style="${LABEL_STYLE}margin-top:14px;">Ảnh bìa (tuỳ chọn)</label>
        <input id="sps-cover" type="file" accept="image/*">
        ${f.cover_image_url ? `<img src="${f.cover_image_url}" style="max-width:160px;border-radius:8px;margin-top:8px;display:block;">` : ''}
        <label style="${LABEL_STYLE}margin-top:14px;">File sản phẩm (bắt buộc để đăng công khai)</label>
        <input id="sps-file" type="file">
        <div id="sps-file-status" style="font-size:13px;color:var(--ink-soft);margin-top:4px;">${f.file_name ? `📎 ${esc(f.file_name)} — đã upload` : 'Chưa có file.'}</div>
        <label style="display:flex;align-items:center;gap:8px;margin-top:16px;cursor:pointer;font-size:13.5px;">
          <input id="sps-published" type="checkbox" ${f.published?'checked':''}> Công khai (cho khách mua ngay)
        </label>
        ${state.error ? `<div class="error-box" style="margin-top:10px;">${esc(state.error)}</div>` : ''}
        <div class="btn-row" style="margin-top:16px;">
          <button class="btn" id="sps-save-btn" ${state.saving?'disabled':''}>${state.saving?'Đang lưu…':'Lưu'}</button>
          <span class="btn-ghost btn" id="sps-back-btn">Quay lại danh sách</span>
        </div>
      </div>
    `;
  }

  function bind(){
    if(state.view === 'list'){
      const newBtn = container.querySelector('#sps-new-btn');
      if(newBtn) newBtn.onclick = () => { state.form = newForm(); state.error = null; state.view = 'edit'; draw(); persistDraft(); };

      container.querySelectorAll('[data-edit]').forEach(el=>{
        el.onclick = () => {
          const p = state.products.find(x => x.id === el.getAttribute('data-edit'));
          if(!p) return;
          state.form = { id:p.id, title:p.title, description:p.description||'', price:p.price, cover_image_url:p.cover_image_url||null, file_storage_path:p.file_storage_path||null, file_name:p.file_name||null, published: p.status==='published' };
          state.error = null; state.view = 'edit'; draw(); persistDraft();
        };
      });

      container.querySelectorAll('[data-delete]').forEach(el=>{
        el.onclick = async () => {
          const ok = await confirmModal('Xoá sản phẩm này? Không thể hoàn tác, khách đã mua vẫn giữ được link tải cũ.', 'Xoá sản phẩm');
          if(!ok) return;
          try{
            await callApi('api/san-pham-so-product', { action:'delete', id: el.getAttribute('data-delete') });
            state.products = await fetchList();
            draw();
          } catch(e){ state.error = e.message; draw(); }
        };
      });

      container.querySelectorAll('[data-copy-link]').forEach(el=>{
        el.onclick = async () => {
          try{
            await navigator.clipboard.writeText(el.getAttribute('data-copy-link'));
            const old = el.textContent;
            el.textContent = 'Đã copy ✓';
            setTimeout(()=>{ el.textContent = old; }, 1500);
          } catch(e){}
        };
      });
      return;
    }

    // view === 'edit'
    const titleEl = container.querySelector('#sps-title');
    titleEl.oninput = () => { state.form.title = titleEl.value; persistDraft(); };
    const descEl = container.querySelector('#sps-desc');
    descEl.oninput = () => { state.form.description = descEl.value; persistDraft(); };
    const priceEl = container.querySelector('#sps-price');
    priceEl.oninput = () => { state.form.price = priceEl.value; persistDraft(); };
    const publishedEl = container.querySelector('#sps-published');
    publishedEl.onchange = () => { state.form.published = publishedEl.checked; persistDraft(); };

    const coverEl = container.querySelector('#sps-cover');
    coverEl.onchange = () => {
      const file = coverEl.files[0];
      if(!file) return;
      const reader = new FileReader();
      reader.onload = () => { state.form.cover_image_url = reader.result; persistDraft(); draw(); };
      reader.readAsDataURL(file);
    };

    const fileEl = container.querySelector('#sps-file');
    fileEl.onchange = async () => {
      const file = fileEl.files[0];
      if(!file) return;
      if(!state.form.title.trim()){ state.error = 'Vui lòng nhập tên sản phẩm trước khi upload file.'; draw(); return; }
      const statusEl = container.querySelector('#sps-file-status');
      try{
        state.error = null;
        if(statusEl) statusEl.textContent = 'Đang chuẩn bị…';
        // Cần có id sản phẩm TRƯỚC khi xin link upload (path Storage khoá theo product_id) — tạo
        // trước ở dạng nháp nếu đây là sản phẩm mới, chưa từng lưu lần nào.
        if(!state.form.id){
          const saved = await callApi('api/san-pham-so-product', {
            action:'save', title: state.form.title, description: state.form.description,
            price: Number(state.form.price) || 0, cover_image_url: state.form.cover_image_url,
          });
          state.form.id = saved.product.id;
        }
        if(statusEl) statusEl.textContent = 'Đang tạo link upload…';
        const { uploadUrl, path } = await callApi('api/san-pham-so-upload-url', { product_id: state.form.id, file_name: file.name });
        if(statusEl) statusEl.textContent = `Đang tải lên ${file.name}…`;
        // PUT thẳng lên Supabase Storage (KHÔNG qua callApi — token đã nằm trong uploadUrl, không
        // phải gọi API của chính app này).
        const putResp = await fetch(uploadUrl, { method:'PUT', headers:{ 'content-type': file.type || 'application/octet-stream' }, body: file });
        if(!putResp.ok) throw new Error('Upload file thất bại — thử lại giúp mình.');
        state.form.file_storage_path = path;
        state.form.file_name = file.name;
        await callApi('api/san-pham-so-product', {
          action:'save', id: state.form.id, title: state.form.title, description: state.form.description,
          price: Number(state.form.price) || 0, file_storage_path: path, file_name: file.name,
        });
        if(statusEl) statusEl.textContent = `📎 ${file.name} — đã upload ✓`;
        persistDraft();
      } catch(e){
        state.error = e.message;
        draw();
      }
    };

    container.querySelector('#sps-back-btn').onclick = async () => {
      state.view = 'list';
      state.error = null;
      await clearModuleDraft(ctx, DRAFT_KEY);
      draw();
    };

    container.querySelector('#sps-save-btn').onclick = async () => {
      const priceNum = Number(state.form.price);
      if(!state.form.title.trim()){ state.error = 'Vui lòng nhập tên sản phẩm.'; draw(); return; }
      if(!priceNum || priceNum <= 0){ state.error = 'Giá sản phẩm phải lớn hơn 0.'; draw(); return; }
      if(state.form.published && !state.form.file_storage_path){ state.error = 'Cần upload file trước khi đăng công khai.'; draw(); return; }
      state.saving = true; state.error = null; draw();
      try{
        const data = await callApi('api/san-pham-so-product', {
          action:'save', id: state.form.id, title: state.form.title, description: state.form.description,
          price: priceNum, cover_image_url: state.form.cover_image_url,
          file_storage_path: state.form.file_storage_path, file_name: state.form.file_name,
          status: state.form.published ? 'published' : 'draft',
        });
        state.form.id = data.product.id;
        state.saving = false;
        await clearModuleDraft(ctx, DRAFT_KEY);
        state.view = 'list';
        state.products = await fetchList();
        draw();
      } catch(e){
        state.saving = false;
        state.error = e.message;
        draw();
      }
    };
  }

  boot();
}

window.Modules = window.Modules || {};
window.Modules['san-pham-so'] = { title:'🛒 Sản Phẩm Số', render };
})();
