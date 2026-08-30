// Phân nhánh theo đúng 4 nhóm trong "Sổ Tay Chăm Sóc Sức Khoẻ Chủ Động" chị Quỳnh gửi (2026-08-30) —
// khớp cột sk_products.category ở schema_full.sql. Sản phẩm chưa xếp nhánh (vd nhóm mỹ phẩm Neigene)
// có category = null, vẫn hiện ở tab "Tất cả".
const SK_PRODUCT_CATEGORIES = [
  { key:'thai_doc', label:'Thải độc' },
  { key:'giam_mo', label:'Giảm mỡ' },
  { key:'tang_de_khang', label:'Tăng đề kháng' },
  { key:'lam_dep_da', label:'Làm đẹp da' },
];

(function(){
function render(container, ctx){
  const state = { loading:true, products:[], tab:'all' };

  function draw(){ container.innerHTML = html(); bind(); }

  async function load(){
    const { data } = await ctx.supabase.from('sk_products').select('*').order('name', { ascending:true });
    state.products = data || [];
    state.loading = false;
    draw();
  }

  function filtered(){
    if(state.tab==='all') return state.products;
    return state.products.filter(p=>p.category===state.tab);
  }

  function html(){
    if(state.loading) return `<div class="loading"><div class="spinner"></div></div>`;
    const list = filtered();
    return `
      <div class="page-head">
        <h1>Sản Phẩm Unicity</h1>
        <p>Thành phần và giá bán lẻ — dễ hiểu, dễ chọn.</p>
      </div>
      <div style="font-size:12.5px;color:var(--ink-soft);background:var(--surface-soft,#f5f5f5);border-radius:10px;padding:10px 14px;margin-bottom:16px;line-height:1.6;">
        Thông tin thành phần dưới đây chỉ mang tính tham khảo, không phải là công dụng đã được kiểm chứng của sản phẩm và không thay thế tư vấn y tế. Thực phẩm bảo vệ sức khỏe không phải là thuốc, không có tác dụng thay thế thuốc chữa bệnh.
      </div>

      <div class="chips" style="margin-bottom:20px;">
        <div class="chip ${state.tab==='all'?'selected':''}" data-tab="all">Tất cả</div>
        ${SK_PRODUCT_CATEGORIES.map(c=>`<div class="chip ${state.tab===c.key?'selected':''}" data-tab="${c.key}">${esc(c.label)}</div>`).join('')}
      </div>

      ${list.length===0 ? `<div style="color:var(--ink-soft);font-size:14px;">${state.products.length===0 ? 'Chưa có sản phẩm nào — chị Quỳnh sẽ thêm sớm.' : 'Chưa có sản phẩm nào ở nhánh này.'}</div>` : ''}
      ${list.map(p=>{
        const catLabel = (SK_PRODUCT_CATEGORIES.find(c=>c.key===p.category)||{}).label;
        return `
        <details class="kt-section">
          <summary class="kt-summary" style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;">
            <span>${esc(p.name)}${catLabel ? ` <span style="font-size:11.5px;font-weight:400;color:var(--ink-soft);">· ${esc(catLabel)}</span>` : ''}</span>
            ${p.retail_price!=null ? `<span style="font-family:'IBM Plex Mono',monospace;font-weight:700;color:var(--accent);white-space:nowrap;">${Number(p.retail_price).toLocaleString('vi-VN')}đ</span>` : ''}
          </summary>
          <div style="margin-top:12px;display:flex;gap:16px;align-items:flex-start;flex-wrap:wrap;">
            ${p.image_url ? `<img src="${esc(p.image_url)}" alt="${esc(p.name)}" data-zoom="${esc(p.image_url)}" style="width:88px;height:88px;object-fit:cover;border-radius:10px;flex-shrink:0;cursor:zoom-in;">` : ''}
            <div style="flex:1;min-width:220px;">
              ${p.short_description ? `<div style="font-size:13.5px;color:var(--ink-soft);line-height:1.6;">${esc(p.short_description)}</div>` : ''}
              ${p.benefits ? `<div style="font-size:13.5px;margin-top:10px;line-height:1.7;white-space:pre-line;"><b>Thành phần nổi bật:</b>\n${esc(p.benefits)}</div>` : ''}
            </div>
          </div>
        </details>
      `;}).join('')}
    `;
  }

  function bind(){
    container.querySelectorAll('[data-tab]').forEach(el=>{
      el.onclick = ()=>{ state.tab = el.getAttribute('data-tab'); draw(); };
    });
    container.querySelectorAll('[data-zoom]').forEach(el=>{
      el.onclick = (e)=>{ e.preventDefault(); openImageLightbox(el.getAttribute('data-zoom'), ''); };
    });
  }

  draw();
  load();
}

window.Modules = window.Modules || {};
window.Modules['san-pham'] = { title:'Sản Phẩm Unicity', render };
})();
