// Sản phẩm bổ trợ ở đây làm Y HỆT cách trình bày/đặt hàng đã làm ở Kiểm Tra Sức Khỏe (2026-08-30, chị
// Quỳnh yêu cầu đồng bộ): mỗi sản phẩm hiện lý do riêng (sk_library_entries.product_notes), có nhãn
// ưu tiên, bấm vào xổ đủ thông tin tại chỗ (skProductDetailHtml), tick chọn + đặt hàng qua giỏ hàng
// chung của TRANG (1 sản phẩm có thể thuộc nhiều mục, chọn ở đâu cũng tính vào cùng 1 đơn).
(function(){
function render(container, ctx){
  const state = { loading:true, entries:[], productById:{}, q:'', cart:new Set() };

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

  function allProductsById(){
    const map = {};
    Object.values(state.productById).forEach(p=>{ map[p.id] = p; });
    return map;
  }

  function html(){
    if(state.loading) return `<div class="loading"><div class="spinner"></div></div>`;
    const list = filtered();
    const byId = allProductsById();
    const cartChosen = [...state.cart].map(id=>byId[id]).filter(Boolean);
    const cartTotal = cartChosen.reduce((s,p)=>s+Number(p.retail_price||0),0);
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
                <div style="font-family:'IBM Plex Mono',monospace;font-size:12px;text-transform:uppercase;letter-spacing:.05em;color:var(--gold);margin-bottom:10px;">🛍️ Sản phẩm Unicity bổ trợ</div>
                ${products.map(p=>`
                  <details class="kt-section" style="background:#fff;">
                    <summary class="kt-summary" style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;">
                      <span style="display:flex;align-items:center;gap:10px;min-width:0;">
                        <span data-cart-toggle="${esc(p.id)}" title="${state.cart.has(p.id)?'Bỏ khỏi đơn hàng':'Thêm vào đơn hàng'}" style="width:24px;height:24px;border-radius:7px;border:1px solid ${state.cart.has(p.id)?'var(--accent)':'var(--line)'};background:${state.cart.has(p.id)?'var(--accent)':'#fff'};color:${state.cart.has(p.id)?'#fff':'var(--ink-soft)'};display:flex;align-items:center;justify-content:center;font-size:14px;flex-shrink:0;cursor:pointer;">${state.cart.has(p.id)?'✓':'+'}</span>
                        ${p.image_url ? `<img src="${esc(p.image_url)}" alt="" style="width:30px;height:30px;object-fit:cover;border-radius:7px;flex-shrink:0;">` : ''}
                        <span style="min-width:0;">
                          <span style="font-weight:700;">${esc(p.name)}</span>${p._priority ? ` <span style="font-size:10.5px;font-weight:700;color:#fff;background:#e8643c;border-radius:5px;padding:2px 6px;vertical-align:middle;">⭐ Nên dùng trước</span>` : ''}
                        </span>
                      </span>
                      ${p.retail_price!=null ? `<span style="font-family:'IBM Plex Mono',monospace;font-weight:700;color:var(--accent);white-space:nowrap;">${Number(p.retail_price).toLocaleString('vi-VN')}đ</span>` : ''}
                    </summary>
                    <div style="margin-top:10px;">
                      ${p._note ? `<div class="hint-box" style="margin-bottom:12px;">${esc(p._note)}</div>` : ''}
                      ${skProductDetailHtml(p)}
                    </div>
                  </details>
                `).join('')}
              </div>
            ` : ''}
          </div>
        </details>
      `;}).join('')}

      ${cartChosen.length>0 ? `
        <div style="position:sticky;bottom:14px;margin-top:20px;background:var(--panel);border:1px solid var(--accent);border-radius:12px;padding:14px 16px;display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;box-shadow:0 6px 20px rgba(0,0,0,.12);">
          <div style="font-size:13.5px;">Đã chọn <b>${cartChosen.length}</b> sản phẩm · <span style="font-family:'IBM Plex Mono',monospace;font-weight:700;color:var(--accent);">${cartTotal.toLocaleString('vi-VN')}đ</span></div>
          <button class="btn btn-sm" id="tv-order">Đặt hàng</button>
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
      el.onclick = (e)=>{
        e.preventDefault(); e.stopPropagation();
        const id = el.getAttribute('data-cart-toggle');
        if(state.cart.has(id)) state.cart.delete(id); else state.cart.add(id);
        draw();
      };
    });
    const orderBtn = container.querySelector('#tv-order');
    if(orderBtn) orderBtn.onclick = ()=>{
      const byId = allProductsById();
      openOrderModal(ctx, [...state.cart].map(id=>byId[id]).filter(Boolean));
    };
  }

  draw();
  load();
}

window.Modules = window.Modules || {};
window.Modules['thu-vien-suc-khoe'] = { title:'Thư Viện Sức Khỏe', render };
})();
