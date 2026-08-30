(function(){
function render(container, ctx){
  const state = { loading:true, products:[] };

  function draw(){ container.innerHTML = html(); bind(); }

  async function load(){
    const { data } = await ctx.supabase.from('sk_products').select('*').order('name', { ascending:true });
    state.products = data || [];
    state.loading = false;
    draw();
  }

  function html(){
    if(state.loading) return `<div class="loading"><div class="spinner"></div></div>`;
    return `
      <div class="page-head">
        <h1>Sản Phẩm Unicity</h1>
        <p>Thành phần và giá bán lẻ — dễ hiểu, dễ chọn.</p>
      </div>
      <div style="font-size:12.5px;color:var(--ink-soft);background:var(--surface-soft,#f5f5f5);border-radius:10px;padding:10px 14px;margin-bottom:14px;line-height:1.6;">
        Thông tin thành phần dưới đây chỉ mang tính tham khảo, không phải là công dụng đã được kiểm chứng của sản phẩm và không thay thế tư vấn y tế. Thực phẩm bảo vệ sức khỏe không phải là thuốc, không có tác dụng thay thế thuốc chữa bệnh.
      </div>
      ${state.products.length===0 ? `<div style="color:var(--ink-soft);font-size:14px;">Chưa có sản phẩm nào — chị Quỳnh sẽ thêm sớm.</div>` : ''}
      ${state.products.map(p=>`
        <div class="section" style="display:flex;gap:16px;align-items:flex-start;">
          ${p.image_url ? `<img src="${esc(p.image_url)}" alt="${esc(p.name)}" data-zoom="${esc(p.image_url)}" style="width:76px;height:76px;object-fit:cover;border-radius:10px;flex-shrink:0;cursor:zoom-in;">` : ''}
          <div style="flex:1;min-width:0;">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;flex-wrap:wrap;">
              <div style="font-weight:700;font-size:15.5px;">${esc(p.name)}</div>
              ${p.retail_price!=null ? `<div style="font-family:'IBM Plex Mono',monospace;font-weight:700;color:var(--accent);white-space:nowrap;">${Number(p.retail_price).toLocaleString('vi-VN')}đ</div>` : ''}
            </div>
            ${p.short_description ? `<div style="font-size:13.5px;color:var(--ink-soft);margin-top:6px;line-height:1.6;">${esc(p.short_description)}</div>` : ''}
            ${p.benefits ? `<div style="font-size:13.5px;margin-top:8px;line-height:1.6;"><b>Thành phần nổi bật:</b> ${esc(p.benefits)}</div>` : ''}
          </div>
        </div>
      `).join('')}
    `;
  }

  function bind(){
    container.querySelectorAll('[data-zoom]').forEach(el=>{
      el.onclick = ()=>openImageLightbox(el.getAttribute('data-zoom'), '');
    });
  }

  draw();
  load();
}

window.Modules = window.Modules || {};
window.Modules['san-pham'] = { title:'Sản Phẩm Unicity', render };
})();
