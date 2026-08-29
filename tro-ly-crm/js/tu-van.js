// Màn hình chính: dán ảnh chụp chat với khách + mô tả ngắn → AI tư vấn câu hỏi/câu chốt dùng ngay,
// đồng thời TỰ ghi vào crm_customers/crm_interactions (xem api/crm-tuvan.js) — không cần qua Lark.
(function(){
const DRAFT_KEY = 'tu-van';
const CONTEXT_DRAFT_KEY = 'tu-van-san-pham'; // riêng, KHÔNG bị xoá sau mỗi lần tư vấn (bối cảnh lâu dài)

function render(container, ctx){
  const state = {
    images: [], note: '',
    sanPhamText: '', showSanPham: false, cauChuyen: null, submitting: false, result: null, error: '',
    // AI tự đọc tên khách từ ảnh/mô tả rồi server tự khớp/tạo hồ sơ — không cần gõ/tìm tay nữa
    // (chị Quỳnh yêu cầu 2026-08-29: 1 khách nhắn nhiều lượt, mỗi lượt lại chụp ảnh gửi, gõ tên mỗi
    // lần quá mất công). needsName chỉ bật khi AI THẬT SỰ không đọc được tên nào (xem api/crm-tuvan.js).
    needsName: false, manualName: '',
  };

  function draw(){ container.innerHTML = html(); bind(); }

  function persistDraft(){
    saveModuleDraft(ctx, DRAFT_KEY, { images: state.images, note: state.note });
  }

  async function boot(){
    // Ưu tiên hồ sơ "Câu Chuyện Của Bạn" riêng của app này (đúng bộ câu hỏi trên landing page) —
    // chỉ dùng lùi về Định Vị AI (positioning_results, dùng chung Xây Nhân Hiệu) nếu chưa điền hồ sơ
    // riêng (xem cau-chuyen.js — 2 nguồn không bắt buộc cùng lúc).
    const [draft, sanPhamDraft, { data: story }, { data: positioning }] = await Promise.all([
      loadModuleDraft(ctx, DRAFT_KEY),
      loadModuleDraft(ctx, CONTEXT_DRAFT_KEY),
      ctx.supabase.from('crm_story_profiles').select('*').eq('user_id', ctx.user.id).maybeSingle(),
      ctx.supabase.from('positioning_results').select('luot1').eq('user_id', ctx.user.id).maybeSingle(),
    ]);
    if(draft){
      state.images = draft.images || [];
      state.note = draft.note || '';
    }
    if(sanPhamDraft && sanPhamDraft.text) state.sanPhamText = sanPhamDraft.text;
    const hasStory = story && story.answers && Object.values(story.answers).some(v=>String(v||'').trim());
    if(hasStory) state.cauChuyen = { nguon:'cau-chuyen', ten: story.ten, zalo: story.zalo, links: story.links, answers: story.answers };
    else if(positioning && positioning.luot1) state.cauChuyen = { nguon:'dinh-vi', luot1: positioning.luot1 };
    else state.cauChuyen = null;
    draw();
  }

  function handleFiles(files){
    Array.from(files).slice(0, 5 - state.images.length).forEach((file)=>{
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
          state.images = [...state.images, c.toDataURL('image/jpeg', 0.82)].slice(0, 5);
          draw();
          persistDraft();
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  function removeImage(idx){
    state.images = state.images.filter((_,i)=>i!==idx);
    draw();
    persistDraft();
  }

  async function submit(){
    if(!state.images.length && !state.note.trim()){ return; }
    if(state.needsName && !state.manualName.trim()){ state.error = 'Nhập giúp tên khách hàng.'; draw(); return; }
    state.submitting = true; state.error = ''; state.result = null; draw();
    const stopProgress = animateProgressButton(container.querySelector('#tv-submit'), 14, 'Đang phân tích');
    try{
      const data = await callApi('/api/crm-tuvan', {
        images: state.images,
        note: state.note,
        // KHÔNG còn chọn/tìm khách tay — server tự đọc tên khách hàng từ ảnh/mô tả rồi tự khớp hồ sơ
        // cũ hoặc tạo mới (xem api/crm-tuvan.js). manual_ten_khach_hang chỉ gửi khi AI đã báo không
        // đọc được tên ở lượt trước và người dùng vừa gõ bổ sung.
        manual_ten_khach_hang: state.needsName ? state.manualName.trim() : undefined,
        san_pham_dich_vu: state.sanPhamText,
        cau_chuyen: state.cauChuyen,
      }, 110000);
      if(data.needsName){
        state.needsName = true;
        state.error = '';
        return;
      }
      state.result = data;
      state.needsName = false; state.manualName = '';
      state.images = []; state.note = '';
      await clearModuleDraft(ctx, DRAFT_KEY);
    } catch(e){
      state.error = e.message;
    } finally {
      stopProgress();
      state.submitting = false;
      draw();
    }
  }

  function copyCauChot(){
    if(!state.result) return;
    navigator.clipboard.writeText(state.result.advice.cau_hoi_cau_chot).catch(()=>{});
  }

  function html(){
    return `
      <div class="page-head">
        <h1>Tư Vấn AI</h1>
        <p>Dán ảnh chụp đoạn chat với khách (hoặc mô tả nhanh) — AI đọc, tư vấn câu nên nhắn tiếp theo, và tự lưu vào hồ sơ khách.</p>
      </div>

      <div class="section" style="cursor:pointer;" data-toggle-sanpham="1">
        <h3>Thông tin sản phẩm/dịch vụ đang tư vấn ${state.showSanPham?'▾':'▸'}</h3>
        ${!state.showSanPham ? `<div class="body" style="color:var(--ink-soft);font-size:13px;">${state.sanPhamText ? 'Đã có thông tin — bấm để xem/sửa.' : 'Chưa có — bấm để dán tên gói/giá/link (AI chỉ dùng đúng thông tin ở đây, không tự bịa giá).'}</div>` : ''}
      </div>
      ${state.showSanPham ? `
        <div class="card" style="margin-top:-10px;margin-bottom:20px;">
          <textarea id="tv-sanpham" placeholder="VD: Gói Cân Bằng Chuyển Hóa 1 tháng — 20.000.000đ, link: ...&#10;Gói Xây Nhân Hiệu Zoom 6 buổi — 1.990.000đ, link: ...">${esc(state.sanPhamText)}</textarea>
        </div>
      ` : ''}

      <div class="card" style="margin-bottom:20px;">
        <label style="display:block;font-size:13px;font-weight:600;color:var(--ink-soft);margin-bottom:10px;">Ảnh chụp đoạn chat (tối đa 5 ảnh)</label>
        <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:10px;">
          ${state.images.map((src,i)=>`
            <div style="position:relative;width:90px;height:90px;">
              <img src="${src}" data-zoom-img="${i}" style="width:100%;height:100%;object-fit:cover;border-radius:10px;cursor:zoom-in;border:1px solid var(--line);">
              <span data-remove-img="${i}" style="position:absolute;top:-6px;right:-6px;background:var(--danger);color:#fff;width:20px;height:20px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;cursor:pointer;">✕</span>
            </div>
          `).join('')}
          ${state.images.length<5 ? `<label style="width:90px;height:90px;border:1px dashed var(--line);border-radius:10px;display:flex;align-items:center;justify-content:center;cursor:pointer;color:var(--ink-soft);font-size:24px;">+<input type="file" accept="image/*" multiple id="tv-file" style="display:none;"></label>` : ''}
        </div>
        <label style="display:block;font-size:13px;font-weight:600;color:var(--ink-soft);margin-bottom:6px;">Mô tả/ghi chú thêm ${state.images.length?'(không bắt buộc nếu đã có ảnh)':''}</label>
        <textarea id="tv-note" placeholder="VD: khách hỏi giá gói 1 tháng, có vẻ đang phân vân...">${esc(state.note)}</textarea>
      </div>

      ${state.needsName ? `
        <div class="card" style="margin-bottom:20px;">
          <div class="hint-box" style="margin-top:0;">AI không đọc được tên khách trong ảnh/mô tả — nhập giúp tên khách hàng để lưu đúng hồ sơ.</div>
          <label style="display:block;font-size:13px;font-weight:600;color:var(--ink-soft);margin:14px 0 6px;">Tên khách hàng</label>
          <input type="text" id="tv-manual-name" placeholder="VD: Chị Lan" value="${esc(state.manualName)}">
        </div>
      ` : ''}

      ${state.error ? `<div class="error-box">${esc(state.error)}</div>` : ''}

      <div class="btn-row" style="justify-content:flex-start;">
        <button class="btn" id="tv-submit" ${state.submitting?'disabled':''}>${state.submitting?'Đang phân tích…':(state.needsName?'Xác nhận tên & tư vấn':'Tư vấn ngay')}</button>
      </div>

      ${state.result ? resultHtml() : ''}
    `;
  }

  function resultHtml(){
    const a = state.result.advice;
    const c = state.result.customer;
    return `
      <div class="page-divider" style="margin:32px 0 20px;"></div>
      <div class="section highlight">
        <h3>Câu nên nhắn ngay</h3>
        <div class="body" style="font-size:16px;font-weight:600;">${esc(a.cau_hoi_cau_chot)}</div>
        <div class="btn-row" style="justify-content:flex-start;margin-top:14px;">
          <span class="btn-ghost btn btn-sm" id="tv-copy">Sao chép</span>
        </div>
      </div>
      <div class="section">
        <h3>Phân tích</h3>
        <div class="body">
          <b>${esc(a.tom_tat)}</b><br><br>
          Nhánh: ${esc(a.nhanh)} — ${esc(a.buoc_hien_tai)}<br>
          Nỗi đau: ${esc(a.phan_tich.noi_dau)}<br>
          Mức sẵn sàng: ${esc(a.phan_tich.san_sang)}<br>
          Giai đoạn: ${esc(a.phan_tich.giai_doan)} — Độ nóng: ${esc(a.phan_tich.do_nong)}
        </div>
      </div>
      ${c ? `<div class="hint-box">✓ Đã lưu vào hồ sơ <b>${esc(c.ten_khach_hang)}</b>${c.ngay_follow_tiep ? ` — hẹn follow ngày ${esc(c.ngay_follow_tiep)}` : ''}. <a href="#khach-hang">Xem trong Khách Hàng →</a></div>` : ''}
    `;
  }

  function bind(){
    const toggleSanPham = container.querySelector('[data-toggle-sanpham]');
    if(toggleSanPham) toggleSanPham.onclick = ()=>{ state.showSanPham = !state.showSanPham; draw(); };
    const sanPhamEl = container.querySelector('#tv-sanpham');
    if(sanPhamEl) sanPhamEl.oninput = (e)=>{ state.sanPhamText = e.target.value; saveModuleDraft(ctx, CONTEXT_DRAFT_KEY, { text: state.sanPhamText }); };

    const manualNameEl = container.querySelector('#tv-manual-name');
    if(manualNameEl) manualNameEl.oninput = (e)=>{ state.manualName = e.target.value; };

    const fileEl = container.querySelector('#tv-file');
    if(fileEl) fileEl.onchange = ()=>{ if(fileEl.files.length) handleFiles(fileEl.files); };
    container.querySelectorAll('[data-remove-img]').forEach(el=>{
      el.onclick = ()=>removeImage(Number(el.getAttribute('data-remove-img')));
    });
    container.querySelectorAll('[data-zoom-img]').forEach(el=>{
      el.onclick = ()=>openImageLightbox(state.images[Number(el.getAttribute('data-zoom-img'))]);
    });

    const noteEl = container.querySelector('#tv-note');
    if(noteEl) noteEl.oninput = (e)=>{ state.note = e.target.value; persistDraft(); };

    const submitBtn = container.querySelector('#tv-submit');
    if(submitBtn) submitBtn.onclick = submit;

    const copyBtn = container.querySelector('#tv-copy');
    if(copyBtn) copyBtn.onclick = copyCauChot;
  }

  draw();
  boot();
}

window.Modules = window.Modules || {};
window.Modules['tu-van'] = { title:'Tư Vấn AI', render };
})();
