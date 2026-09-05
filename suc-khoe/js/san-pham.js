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

// 2026-09-05, chị Quỳnh: "phần sản phẩm ở mục sản phẩm unicity cũng phải làm tương tự như phần sản
// phẩm ở mục kiểm tra sức khỏe" — đổi từ dòng "+/✓" cũ + accordion riêng sang dùng CHUNG
// skProductOrderRowHtml (checkbox, ảnh to, 2 dòng công dụng, "Xem đầy đủ công dụng →" mới mở full),
// giống hệt kiem-tra-suc-khoe.js/thu-vien-suc-khoe.js. Mặc định TẤT CẢ đã chọn (deselected lưu
// chiều "đã bỏ") — đúng quy ước chung đã chốt cho mọi trang có gợi ý/danh sách sản phẩm.
(function(){
function render(container, ctx){
  const state = { loading:true, products:[], tab:'all', deselected:new Set() };

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
    // Tổng đơn hàng luôn tính trên TOÀN BỘ sản phẩm đã chọn (không chỉ tab đang xem) — đổi tab chỉ
    // để duyệt/lọc, không làm mất lựa chọn đã chọn ở tab khác.
    const cartChosen = state.products.filter(p=>!state.deselected.has(p.id));
    const cartTotal = cartChosen.reduce((s,p)=>s+Number(p.retail_price||0),0);
    const cartPv = cartChosen.reduce((s,p)=>s+Number(p.pv||0),0);
    const gift = skOrderGift(cartTotal, cartChosen.length);
    return `
      <div class="page-head">
        <h1>Sản Phẩm Unicity</h1>
        <p>Bấm "Xem đầy đủ công dụng" để xem thành phần, cơ chế tác động và cách dùng.</p>
      </div>
      <div style="font-size:12.5px;color:var(--ink-soft);background:var(--surface-soft,#f5f5f5);border-radius:10px;padding:10px 14px;margin-bottom:16px;line-height:1.6;">
        Thông tin thành phần dưới đây chỉ mang tính tham khảo, không phải là công dụng đã được kiểm chứng của sản phẩm và không thay thế tư vấn y tế. Thực phẩm bảo vệ sức khỏe không phải là thuốc, không có tác dụng thay thế thuốc chữa bệnh.
      </div>

      <div class="chips" style="margin-bottom:20px;">
        <div class="chip ${state.tab==='all'?'selected':''}" data-tab="all">Tất cả</div>
        ${SK_PRODUCT_CATEGORIES.map(c=>`<div class="chip ${state.tab===c.key?'selected':''}" data-tab="${c.key}">${esc(c.label)}</div>`).join('')}
      </div>

      ${list.length===0 ? `<div style="color:var(--ink-soft);font-size:14px;">${state.products.length===0 ? 'Chưa có sản phẩm nào — chị Quỳnh sẽ thêm sớm.' : 'Chưa có sản phẩm nào ở nhánh này.'}</div>` : ''}
      ${list.map(p=>skProductOrderRowHtml(p, !state.deselected.has(p.id))).join('')}

      ${state.products.length>0 ? `
        <div style="position:sticky;bottom:14px;margin-top:16px;background:var(--panel);border:1px solid var(--accent);border-radius:12px;padding:14px 16px;box-shadow:0 6px 20px rgba(0,0,0,.12);">
          <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;">
            <div style="font-size:13.5px;">Đơn hàng: <b>${cartChosen.length}</b> sản phẩm · ${cartPv} PV · <span style="font-family:'IBM Plex Mono',monospace;font-weight:700;color:var(--accent);">${cartTotal.toLocaleString('vi-VN')}đ</span></div>
            <div style="display:flex;gap:8px;">
              <span class="btn-ghost btn btn-sm" id="sp-toggle-all">${cartChosen.length>0 ? 'Bỏ chọn hết' : 'Chọn lại tất cả'}</span>
              <button class="btn btn-sm" id="sp-order" ${cartChosen.length===0?'disabled':''}>Đặt hàng</button>
            </div>
          </div>
          ${skGiftPreviewHtml(gift)}
        </div>
      ` : ''}
    `;
  }

  function bind(){
    container.querySelectorAll('[data-tab]').forEach(el=>{
      el.onclick = ()=>{ state.tab = el.getAttribute('data-tab'); draw(); };
    });
    container.querySelectorAll('[data-cart-toggle]').forEach(el=>{
      el.onchange = (e)=>{
        const id = el.getAttribute('data-cart-toggle');
        if(e.target.checked) state.deselected.delete(id); else state.deselected.add(id);
        draw();
      };
    });
    const toggleAllBtn = container.querySelector('#sp-toggle-all');
    if(toggleAllBtn) toggleAllBtn.onclick = ()=>{
      const ids = state.products.map(p=>p.id);
      const anySelected = ids.some(id=>!state.deselected.has(id));
      if(anySelected) ids.forEach(id=>state.deselected.add(id));
      else state.deselected.clear();
      draw();
    };
    const orderBtn = container.querySelector('#sp-order');
    if(orderBtn) orderBtn.onclick = ()=>{
      openOrderModal(ctx, state.products.filter(p=>!state.deselected.has(p.id)));
    };
  }

  draw();
  load();
}

window.Modules = window.Modules || {};
window.Modules['san-pham'] = { title:'Sản Phẩm Unicity', render };
})();
