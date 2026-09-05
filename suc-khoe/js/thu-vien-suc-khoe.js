// Sản phẩm bổ trợ ở đây làm Y HỆT cách trình bày/đặt hàng đã làm ở Kiểm Tra Sức Khỏe (2026-08-31, chị
// Quỳnh yêu cầu đồng bộ): mỗi sản phẩm hiện lý do riêng (sk_library_entries.product_notes) LUÔN hiện
// sẵn (không cần bấm mở), có nhãn ưu tiên, dòng dạng đơn hàng thật (checkbox - ảnh - tên - PV - giá),
// mặc định TẤT CẢ đã được chọn sẵn (deselected lưu chiều "đã bỏ", không phải "đã chọn" — sản phẩm mới
// xuất hiện khi tìm mục khác cũng tự động được chọn), có nút Bỏ/Chọn lại tất cả + tổng tiền/PV/quà ở
// thanh cố định cuối trang — xem cùng logic ở kiem-tra-suc-khoe.js.
(function(){
function render(container, ctx){
  const state = { loading:true, entries:[], productById:{}, q:'', deselected:new Set() };

  function draw(){ container.innerHTML = html(); bind(); }

  async function load(){
    const { data: entries } = await ctx.supabase.from('sk_library_entries').select('*').order('issue_name', { ascending:true });
    state.entries = entries || [];
    const productIds = [...new Set(state.entries.flatMap(e=>e.related_product_ids||[]))];
    if(productIds.length>0){
      const { data: products } = await ctx.supabase.from('sk_products').select('id,name,category,retail_price,pv,short_description,image_url,detail_sections,benefits').in('id', productIds);
      (products||[]).forEach(p=>{ state.productById[p.id] = p; });
    }
    state.loading = false;
    draw();
  }

  function filtered(){
    const q = state.q.trim().toLowerCase();
    if(!q) return state.entries;
    return state.entries.filter(e =>
      (e.issue_name||'').toLowerCase().includes(q) ||
      (e.causes||'').toLowerCase().includes(q) ||
      (e.symptoms||'').toLowerCase().includes(q) ||
      (e.remedies||'').toLowerCase().includes(q)
    );
  }

  // Sản phẩm của 1 mục, kèm lý do + cờ ưu tiên riêng của ĐÚNG mục đó (product_notes), ưu tiên xếp trước.
  function entryProducts(e){
    const notes = e.product_notes || {};
    return (e.related_product_ids||[])
      .map(id=>state.productById[id])
      .filter(Boolean)
      .map(p=>({ ...p, _note:(notes[p.id]||{}).note||null, _priority:!!(notes[p.id]||{}).priority }))
      .sort((a,b)=> (b._priority - a._priority));
  }

  // Toàn bộ sản phẩm đang khớp bộ lọc hiện tại (gộp mọi mục đang hiện, khử trùng theo id) — dùng cho
  // thanh tổng cuối trang + nút Bỏ/Chọn lại tất cả.
  function allVisibleProducts(list){
    const seen = new Map();
    list.forEach(e=>entryProducts(e).forEach(p=>{ if(!seen.has(p.id)) seen.set(p.id, p); }));
    return [...seen.values()];
  }

  function html(){
    if(state.loading) return `<div class="loading"><div class="spinner"></div></div>`;
    const list = filtered();
    const visibleProducts = allVisibleProducts(list);
    const cartChosen = visibleProducts.filter(p=>!state.deselected.has(p.id));
    const cartTotal = cartChosen.reduce((s,p)=>s+Number(p.retail_price||0),0);
    const cartPv = cartChosen.reduce((s,p)=>s+Number(p.pv||0),0);
    const gift = skOrderGift(cartTotal, cartChosen.length);
    return `
      <div class="page-head">
        <h1>Thư Viện Sức Khỏe</h1>
        <p>Tra cứu vấn đề bạn đang gặp — nguyên nhân, biểu hiện, cách xử lý và sản phẩm Unicity có thể bổ trợ.</p>
      </div>
      <input type="text" id="tv-search" placeholder="Tìm theo tên vấn đề, biểu hiện..." value="${esc(state.q)}" style="margin-bottom:20px;">
      ${list.length===0 ? `<div style="color:var(--ink-soft);font-size:14px;">${state.entries.length===0 ? 'Thư viện đang được xây dựng, chị Quỳnh sẽ bổ sung sớm.' : 'Không tìm thấy kết quả phù hợp.'}</div>` : ''}
      ${list.map(e=>{
        const products = entryProducts(e);
        return `
        <details class="kt-section">
          <summary class="kt-summary">${esc(e.issue_name)}</summary>
          <div style="margin-top:12px;font-size:13.5px;line-height:1.8;">
            ${e.causes ? `<div style="margin-bottom:16px;border-left:3px solid #c0392b;padding-left:14px;">${skSectionHeaderHtml('Nguyên nhân', '#c0392b', '🔍')}${skRichBodyHtml(e.causes)}</div>` : ''}
            ${e.symptoms ? `<div style="margin-bottom:16px;border-left:3px solid #e8643c;padding-left:14px;">${skSectionHeaderHtml('Biểu hiện', '#e8643c', '👁️')}${skRichBodyHtml(e.symptoms)}</div>` : ''}
            ${e.remedies ? `<div style="margin-bottom:16px;border-left:3px solid #1f9d63;padding-left:14px;">${skSectionHeaderHtml('Cách xử lý', '#1f9d63', '✅')}${skRichBodyHtml(e.remedies)}</div>` : ''}
            ${products.length>0 ? `
              <div style="margin-top:14px;">
                <div style="font-family:'IBM Plex Mono',monospace;font-size:12px;text-transform:uppercase;letter-spacing:.05em;color:var(--gold);margin-bottom:10px;">✨ Sản phẩm Unicity phù hợp — lý do vì sao từng sản phẩm hỗ trợ đúng vấn đề này:</div>
                ${products.map(p=>skProductOrderRowHtml(p, !state.deselected.has(p.id))).join('')}
              </div>
            ` : ''}
          </div>
        </details>
      `;}).join('')}

      ${visibleProducts.length>0 ? `
        <div style="position:sticky;bottom:14px;margin-top:20px;background:var(--panel);border:1px solid var(--accent);border-radius:12px;padding:14px 16px;box-shadow:0 6px 20px rgba(0,0,0,.12);">
          <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;">
            <div style="font-size:13.5px;">Đơn hàng: <b>${cartChosen.length}</b> sản phẩm · ${cartPv} PV · <span style="font-family:'IBM Plex Mono',monospace;font-weight:700;color:var(--accent);">${cartTotal.toLocaleString('vi-VN')}đ</span></div>
            <div style="display:flex;gap:8px;">
              <span class="btn-ghost btn btn-sm" id="tv-toggle-all">${cartChosen.length>0 ? 'Bỏ chọn hết' : 'Chọn lại tất cả'}</span>
              <button class="btn btn-sm" id="tv-order" ${cartChosen.length===0?'disabled':''}>Đặt hàng</button>
            </div>
          </div>
          ${skGiftPreviewHtml(gift)}
        </div>
      ` : ''}
    `;
  }

  function bind(){
    const searchEl = container.querySelector('#tv-search');
    // draw() thay toàn bộ innerHTML → input cũ bị huỷ, phải lưu vị trí con trỏ trước rồi khôi phục
    // trên node MỚI sau khi vẽ lại, không thì gõ tiếng Việt có dấu bị nhảy chữ (theo đúng bài học đã
    // gặp ở nhan-hieu/tai-chinh — xem ghi chú trong lịch sử commit).
    if(searchEl) searchEl.oninput = (e)=>{
      state.q = e.target.value;
      const pos = searchEl.selectionStart;
      draw();
      const newEl = container.querySelector('#tv-search');
      if(newEl){ newEl.focus(); newEl.setSelectionRange(pos, pos); }
    };
    container.querySelectorAll('[data-cart-toggle]').forEach(el=>{
      el.onchange = (e)=>{
        const id = el.getAttribute('data-cart-toggle');
        if(e.target.checked) state.deselected.delete(id); else state.deselected.add(id);
        draw();
      };
    });
    const toggleAllBtn = container.querySelector('#tv-toggle-all');
    if(toggleAllBtn) toggleAllBtn.onclick = ()=>{
      const ids = allVisibleProducts(filtered()).map(p=>p.id);
      const anySelected = ids.some(id=>!state.deselected.has(id));
      if(anySelected) ids.forEach(id=>state.deselected.add(id));
      else state.deselected.clear();
      draw();
    };
    const orderBtn = container.querySelector('#tv-order');
    if(orderBtn) orderBtn.onclick = ()=>{
      const chosen = allVisibleProducts(filtered()).filter(p=>!state.deselected.has(p.id));
      openOrderModal(ctx, chosen);
    };
  }

  draw();
  load();
}

window.Modules = window.Modules || {};
window.Modules['thu-vien-suc-khoe'] = { title:'Thư Viện Sức Khỏe', render };
})();
