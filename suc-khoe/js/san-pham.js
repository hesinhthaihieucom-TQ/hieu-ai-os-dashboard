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
        <p>Bấm vào tên sản phẩm để xem đầy đủ thành phần, cơ chế tác động và cách dùng.</p>
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
        const sections = Array.isArray(p.detail_sections) ? p.detail_sections : [];
        return `
        <details class="kt-section">
          <summary class="kt-summary" style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;">
            <span style="display:flex;align-items:center;gap:10px;">
              ${p.image_url ? `<img src="${esc(p.image_url)}" alt="" style="width:34px;height:34px;object-fit:cover;border-radius:8px;flex-shrink:0;">` : ''}
              <span>${esc(p.name)}${catLabel ? ` <span style="font-size:11.5px;font-weight:400;color:var(--ink-soft);">· ${esc(catLabel)}</span>` : ''}</span>
            </span>
            ${p.retail_price!=null ? `<span style="font-family:'IBM Plex Mono',monospace;font-weight:700;color:var(--accent);white-space:nowrap;">${Number(p.retail_price).toLocaleString('vi-VN')}đ</span>` : ''}
          </summary>
          <div style="margin-top:14px;">
            ${p.image_url ? `<img src="${esc(p.image_url)}" alt="${esc(p.name)}" data-zoom="${esc(p.image_url)}" style="width:96px;height:96px;object-fit:cover;border-radius:10px;float:right;margin:0 0 10px 14px;cursor:zoom-in;">` : ''}
            ${p.short_description ? `<div style="font-size:14px;font-weight:600;line-height:1.6;">${esc(p.short_description)}</div>` : ''}
            ${sections.map(sec=>`
              <div style="margin-top:16px;">
                <div style="font-family:'IBM Plex Mono',monospace;font-size:12px;text-transform:uppercase;letter-spacing:.05em;color:var(--gold);margin-bottom:6px;">${esc(sec.title||'')}</div>
                <div style="font-size:13.5px;line-height:1.75;white-space:pre-line;">${esc(sec.body||'')}</div>
              </div>
            `).join('')}
            ${sections.length===0 && p.benefits ? `<div style="font-size:13.5px;line-height:1.75;white-space:pre-line;margin-top:10px;">${esc(p.benefits)}</div>` : ''}
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
      el.onclick = (e)=>{ e.preventDefault(); e.stopPropagation(); openImageLightbox(el.getAttribute('data-zoom'), ''); };
    });
  }

  draw();
  load();
}

window.Modules = window.Modules || {};
window.Modules['san-pham'] = { title:'Sản Phẩm Unicity', render };
})();
