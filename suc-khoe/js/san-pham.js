// Phân nhánh theo "Sổ Tay Chăm Sóc Sức Khoẻ Chủ Động" chị Quỳnh gửi (2026-08-30) + thêm nhánh riêng
// "Xương khớp" (2026-08-30, chị chốt: Canxi-Magiê/Joint Mobility đang bị gộp nhầm vào Làm đẹp da,
// tách khỏi Làm đẹp da cho đúng bản chất). Sản phẩm chưa xếp nhánh (vd nhóm mỹ phẩm Neigene) có
// category = null, vẫn hiện ở tab "Tất cả".
const SK_PRODUCT_CATEGORIES = [
  { key:'thai_doc', label:'Thải độc' },
  { key:'giam_mo', label:'Giảm mỡ' },
  { key:'tang_de_khang', label:'Tăng đề kháng' },
  { key:'lam_dep_da', label:'Làm đẹp da' },
  { key:'xuong_khop', label:'Xương khớp' },
];

(function(){
function render(container, ctx){
  const state = { loading:true, products:[], tab:'all', cart: new Set() };

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
        return `
        <details class="kt-section">
          <summary class="kt-summary" style="display:flex;align-items:center;gap:12px;">
            ${p.retail_price!=null ? `<span data-cart-toggle="${esc(p.id)}" title="${state.cart.has(p.id)?'Bỏ khỏi đơn hàng':'Thêm vào đơn hàng'}" style="width:24px;height:24px;border-radius:7px;border:1px solid ${state.cart.has(p.id)?'var(--accent)':'var(--line)'};background:${state.cart.has(p.id)?'var(--accent)':'#fff'};color:${state.cart.has(p.id)?'#fff':'var(--ink-soft)'};display:flex;align-items:center;justify-content:center;font-size:14px;flex-shrink:0;cursor:pointer;">${state.cart.has(p.id)?'✓':'+'}</span>` : ''}
            ${p.image_url ? `<img src="${esc(p.image_url)}" alt="" style="width:68px;height:68px;object-fit:cover;border-radius:10px;flex-shrink:0;">` : ''}
            <span style="flex:1;min-width:0;">
              <div style="font-weight:700;font-size:14.5px;">${esc(p.name)}</div>
              ${catLabel ? `<div style="font-size:11.5px;font-weight:400;color:var(--ink-soft);margin-top:2px;">${esc(catLabel)}</div>` : ''}
            </span>
            ${p.retail_price!=null ? `<span style="font-family:'IBM Plex Mono',monospace;font-weight:700;color:var(--accent);white-space:nowrap;">${Number(p.retail_price).toLocaleString('vi-VN')}đ</span>` : ''}
          </summary>
          <div style="margin-top:14px;">
            ${p.image_url ? `<img src="${esc(p.image_url)}" alt="${esc(p.name)}" data-zoom="${esc(p.image_url)}" style="width:96px;height:96px;object-fit:cover;border-radius:10px;float:right;margin:0 0 10px 14px;cursor:zoom-in;">` : ''}
            ${skProductDetailHtml(p)}
          </div>
        </details>
      `;}).join('')}

      ${state.cart.size>0 ? (()=>{
        const chosen = state.products.filter(p=>state.cart.has(p.id));
        const total = chosen.reduce((s,p)=>s+Number(p.retail_price||0),0);
        return `
        <div style="position:sticky;bottom:14px;margin-top:20px;background:var(--panel);border:1px solid var(--accent);border-radius:12px;padding:14px 16px;display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;box-shadow:0 6px 20px rgba(0,0,0,.12);">
          <div style="font-size:13.5px;">Đã chọn <b>${state.cart.size}</b> sản phẩm · <span style="font-family:'IBM Plex Mono',monospace;font-weight:700;color:var(--accent);">${total.toLocaleString('vi-VN')}đ</span></div>
          <button class="btn btn-sm" id="sk-cart-order">Đặt hàng</button>
        </div>`;
      })() : ''}
    `;
  }

  function bind(){
    container.querySelectorAll('[data-tab]').forEach(el=>{
      el.onclick = ()=>{ state.tab = el.getAttribute('data-tab'); draw(); };
    });
    container.querySelectorAll('[data-zoom]').forEach(el=>{
      el.onclick = (e)=>{ e.preventDefault(); e.stopPropagation(); openImageLightbox(el.getAttribute('data-zoom'), ''); };
    });
    container.querySelectorAll('[data-cart-toggle]').forEach(el=>{
      el.onclick = (e)=>{
        e.preventDefault(); e.stopPropagation();
        const id = el.getAttribute('data-cart-toggle');
        if(state.cart.has(id)) state.cart.delete(id); else state.cart.add(id);
        draw();
      };
    });
    const orderBtn = container.querySelector('#sk-cart-order');
    if(orderBtn) orderBtn.onclick = ()=> openOrderModal(ctx, state.products.filter(p=>state.cart.has(p.id)));
  }

  draw();
  load();
}

window.Modules = window.Modules || {};
window.Modules['san-pham'] = { title:'Sản Phẩm Unicity', render };
})();
