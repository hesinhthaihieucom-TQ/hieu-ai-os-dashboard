(function(){
function render(container, ctx){
  const state = { loading:true, entries:[], productById:{}, q:'' };

  function draw(){ container.innerHTML = html(); bind(); }

  async function load(){
    const { data: entries } = await ctx.supabase.from('sk_library_entries').select('*').order('issue_name', { ascending:true });
    state.entries = entries || [];
    const productIds = [...new Set(state.entries.flatMap(e=>e.related_product_ids||[]))];
    if(productIds.length>0){
      const { data: products } = await ctx.supabase.from('sk_products').select('id,name,retail_price').in('id', productIds);
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

  function html(){
    if(state.loading) return `<div class="loading"><div class="spinner"></div></div>`;
    const list = filtered();
    return `
      <div class="page-head">
        <h1>Thư Viện Sức Khỏe</h1>
        <p>Tra cứu vấn đề bạn đang gặp — nguyên nhân, biểu hiện, cách xử lý và sản phẩm Unicity có thể bổ trợ.</p>
      </div>
      <input type="text" id="tv-search" placeholder="Tìm theo tên vấn đề, biểu hiện..." value="${esc(state.q)}" style="margin-bottom:20px;">
      ${list.length===0 ? `<div style="color:var(--ink-soft);font-size:14px;">${state.entries.length===0 ? 'Thư viện đang được xây dựng, chị Quỳnh sẽ bổ sung sớm.' : 'Không tìm thấy kết quả phù hợp.'}</div>` : ''}
      ${list.map(e=>{
        const products = (e.related_product_ids||[]).map(id=>state.productById[id]).filter(Boolean);
        return `
        <details class="kt-section">
          <summary class="kt-summary">${esc(e.issue_name)}</summary>
          <div style="margin-top:12px;font-size:13.5px;line-height:1.8;">
            ${e.causes ? `<div style="margin-bottom:16px;border-left:3px solid #c0392b;padding-left:14px;">${skSectionHeaderHtml('Nguyên nhân', '#c0392b', '🔍')}${skRichBodyHtml(e.causes)}</div>` : ''}
            ${e.symptoms ? `<div style="margin-bottom:16px;border-left:3px solid #e8643c;padding-left:14px;">${skSectionHeaderHtml('Biểu hiện', '#e8643c', '👁️')}${skRichBodyHtml(e.symptoms)}</div>` : ''}
            ${e.remedies ? `<div style="margin-bottom:16px;border-left:3px solid #1f9d63;padding-left:14px;">${skSectionHeaderHtml('Cách xử lý', '#1f9d63', '✅')}${skRichBodyHtml(e.remedies)}</div>` : ''}
            ${products.length>0 ? `
              <div style="margin-top:12px;">
                <b>Sản phẩm Unicity bổ trợ:</b>
                <div class="chips">${products.map(p=>`<span class="chip" data-goto-product="1">${esc(p.name)}${p.retail_price!=null?` — ${Number(p.retail_price).toLocaleString('vi-VN')}đ`:''}</span>`).join('')}</div>
              </div>
            ` : ''}
          </div>
        </details>
      `;}).join('')}
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
    container.querySelectorAll('[data-goto-product]').forEach(el=>{
      el.onclick = ()=>{ location.hash = 'san-pham'; };
    });
  }

  draw();
  load();
}

window.Modules = window.Modules || {};
window.Modules['thu-vien-suc-khoe'] = { title:'Thư Viện Sức Khỏe', render };
})();
