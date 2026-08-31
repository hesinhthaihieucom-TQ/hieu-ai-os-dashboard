// Câu Chuyện Thành Công — mục RIÊNG (2026-08-31, chị Quỳnh: "để 1 mục riêng") hiển thị case khách
// chuyển hoá thật (ảnh trước/sau + câu chuyện) do admin thêm qua Quản Trị (sk_success_stories, đọc
// công khai cho mọi khách đã đăng nhập). Cuối mỗi case có nút dẫn sang Sản Phẩm — đúng tinh thần
// liên kết Kiểm Tra/Thư Viện/Sản Phẩm chị Quỳnh đã yêu cầu trước đó, để bán được thêm sản phẩm.
(function(){
function render(container, ctx){
  const state = { loading:true, items:[] };

  function draw(){ container.innerHTML = html(); bind(); }

  async function load(){
    const { data } = await ctx.supabase.from('sk_success_stories').select('*').order('created_at', { ascending:false });
    state.items = data || [];
    state.loading = false;
    draw();
  }

  function storyCardHtml(item){
    const catLabel = (SK_PRODUCT_CATEGORIES.find(c=>c.key===item.category)||{}).label;
    const images = Array.isArray(item.images) ? item.images : [];
    return `
      <div class="section" style="margin-bottom:16px;">
        ${images.length ? `
          <div style="display:flex;gap:8px;overflow-x:auto;margin-bottom:14px;">
            ${images.map(src=>`<img src="${esc(src)}" data-zoom="${esc(src)}" style="width:140px;height:140px;object-fit:cover;border-radius:10px;flex-shrink:0;cursor:zoom-in;">`).join('')}
          </div>
        ` : ''}
        <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:8px;">
          <div style="font-weight:700;font-size:15px;">${esc(item.display_name)}</div>
          ${catLabel ? `<span style="font-size:11.5px;font-weight:600;color:var(--accent);background:var(--accent-soft,rgba(31,157,99,.12));border-radius:6px;padding:3px 9px;">${esc(catLabel)}</span>` : ''}
        </div>
        <div style="font-size:13.5px;line-height:1.8;white-space:pre-line;">${esc(item.story)}</div>
        <div style="margin-top:14px;padding-top:14px;border-top:1px solid var(--line);">
          <span class="btn-ghost btn btn-sm" data-goto-sanpham="${item.category||''}">Xem sản phẩm liên quan →</span>
        </div>
      </div>
    `;
  }

  function html(){
    if(state.loading) return `<div class="loading"><div class="spinner"></div></div>`;
    return `
      <div class="page-head">
        <h1>Câu Chuyện Thành Công</h1>
        <p>Kết quả thật từ khách đã dùng sản phẩm Unicity — hình ảnh và câu chuyện được chính khách đồng ý chia sẻ.</p>
      </div>
      ${state.items.length===0
        ? `<div style="color:var(--ink-soft);font-size:14px;">Chưa có câu chuyện nào — chị Quỳnh sẽ bổ sung sớm.</div>`
        : state.items.map(storyCardHtml).join('')}
    `;
  }

  function bind(){
    container.querySelectorAll('[data-zoom]').forEach(el=>{
      el.onclick = ()=>openImageLightbox(el.getAttribute('data-zoom'), '');
    });
    container.querySelectorAll('[data-goto-sanpham]').forEach(el=>{
      el.onclick = ()=>{ location.hash = 'san-pham'; };
    });
  }

  draw();
  load();
}

window.Modules = window.Modules || {};
window.Modules['cau-chuyen-thanh-cong'] = { title:'Câu Chuyện Thành Công', render };
})();
