// Sản Phẩm Số — "Quản trị" (route ẩn khỏi NAV chính vì adminOnly, xem app-shell.js). Khác nhan-hieu's
// quan-tri-hub (6 tab tách 6 file riêng) — ở đây gộp 3 tab liên quan trực tiếp tới dữ liệu RIÊNG của
// Sản Phẩm Số (sản phẩm đã đăng bán + doanh thu bán lẻ + đánh giá app) vào 1 file, vì quy mô nhỏ hơn
// hẳn. "Thành viên"/"Tài chính" tổng quát KHÔNG lặp lại ở đây — dùng Quản trị bên Xây Nhân Hiệu cho
// việc đó (cùng 1 bảng profiles/thanh toán, không cần xây lại). Tab "Doanh thu" (2026-09-04) đọc qua
// api/san-pham-so-admin-orders.js — digital_product_orders không có policy admin đọc trực tiếp (chỉ
// service_role), nên phải qua API riêng thay vì query thẳng như 2 tab kia.
(function () {
function render(container) {
  const state = { tab: 'san-pham', products: null, reviews: null, reviewSearch: '', orders: null, ordersSummary: null, loading: true };
  boot();

  async function boot() {
    if (!currentProfile || currentProfile.role !== 'admin') {
      container.innerHTML = `<h2>Quản trị</h2><div class="hint-box">Chỉ quản trị viên mới xem được mục này.</div>`;
      return;
    }
    draw();
    await loadTab();
  }

  function draw() { container.innerHTML = html(); bind(); }

  function html() {
    return `
      <h2>Quản trị Sản Phẩm Số</h2>
      <div class="chips" style="margin-bottom:16px;">
        <div class="chip ${state.tab === 'san-pham' ? 'selected' : ''}" data-qt-tab="san-pham">Sản phẩm</div>
        <div class="chip ${state.tab === 'doanh-thu' ? 'selected' : ''}" data-qt-tab="doanh-thu">Doanh thu</div>
        <div class="chip ${state.tab === 'danh-gia' ? 'selected' : ''}" data-qt-tab="danh-gia">Đánh giá app${state.reviews ? ` (${state.reviews.filter(r => !r.approved).length} chờ duyệt)` : ''}</div>
      </div>
      ${state.tab === 'san-pham' ? sanPhamTabHtml() : state.tab === 'doanh-thu' ? doanhThuTabHtml() : danhGiaTabHtml()}
    `;
  }

  function doanhThuTabHtml() {
    if (state.loading && !state.orders) return `<div class="loading"><div class="spinner"></div></div>`;
    const orders = state.orders || [];
    const s = state.ordersSummary || { totalRevenue: 0, paidCount: 0, totalCount: 0 };
    return `
      <div class="card" style="margin-bottom:14px;">
        <div style="font-size:22px;font-weight:700;color:var(--accent);">${s.totalRevenue.toLocaleString('vi-VN')}đ</div>
        <div style="font-size:13px;color:var(--ink-soft);margin-top:2px;">Tổng doanh thu đã thanh toán · ${s.paidCount}/${s.totalCount} đơn đã thanh toán · mọi người bán.</div>
      </div>
      ${orders.length === 0 ? `<div class="hint-box">Chưa có đơn hàng nào.</div>` : orders.map(o => `
        <div class="card" style="margin-bottom:10px;">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;">
            <b>${esc(o.productTitle || 'Sản phẩm đã xoá')}</b>
            <span style="font-size:12.5px;white-space:nowrap;">${o.status === 'paid' ? '✅ Đã thanh toán' : '⏳ Chờ thanh toán'}</span>
          </div>
          <div style="color:var(--ink-soft);font-size:13.5px;margin-top:4px;">
            ${Number(o.amount).toLocaleString('vi-VN')}đ · Người bán: ${esc(o.sellerName || '(không rõ)')} · ${esc(o.buyerName || '(chưa có tên)')}${o.buyerPhone ? ` · ${esc(o.buyerPhone)}` : ''}${o.buyerEmail ? ` · ${esc(o.buyerEmail)}` : ''}
          </div>
          <div style="color:var(--ink-soft);font-size:12px;margin-top:2px;">
            Đặt lúc: ${new Date(o.createdAt).toLocaleString('vi-VN')}${o.paidAt ? ` · Thanh toán lúc: ${new Date(o.paidAt).toLocaleString('vi-VN')}` : ''}
          </div>
        </div>
      `).join('')}
    `;
  }

  function sanPhamTabHtml() {
    if (state.loading && !state.products) return `<div class="loading"><div class="spinner"></div></div>`;
    const products = state.products || [];
    return `
      <div style="font-size:13px;color:var(--ink-soft);margin-bottom:10px;">${products.length} sản phẩm, mọi người bán.</div>
      ${products.map(p => `
        <div class="card">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;">
            <h2 style="font-size:16px;margin-bottom:4px;">${esc(p.title)}</h2>
            <span style="font-size:11.5px;padding:2px 8px;border-radius:4px;background:${p.status === 'published' ? 'var(--accent-soft)' : '#EEE'};color:${p.status === 'published' ? 'var(--accent)' : '#888'};">${p.status === 'published' ? 'Đã đăng' : 'Nháp'}</span>
          </div>
          <div style="font-size:13px;color:var(--ink-soft);">Người bán: ${esc(p.ownerName || '(không rõ)')} · ${Number(p.price).toLocaleString('vi-VN')}đ · ${esc(new Date(p.created_at).toLocaleDateString('vi-VN'))}</div>
        </div>
      `).join('') || `<div class="hint-box">Chưa có sản phẩm nào.</div>`}
    `;
  }

  function danhGiaTabHtml() {
    if (state.loading && !state.reviews) return `<div class="loading"><div class="spinner"></div></div>`;
    const q = state.reviewSearch.toLowerCase();
    const reviews = (state.reviews || []).filter(r => !q || (r.comment || '').toLowerCase().includes(q) || (r.display_name || '').toLowerCase().includes(q));
    return `
      <input id="qt-review-search" type="text" placeholder="Tìm theo tên/nội dung..." value="${esc(state.reviewSearch)}" style="margin-bottom:14px;">
      ${reviews.map(r => `
        <div class="card">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;margin-bottom:6px;">
            <b style="font-size:14px;">${esc(r.display_name || '(ẩn danh)')}</b>
            <span style="font-size:11.5px;padding:2px 8px;border-radius:4px;background:${r.approved ? 'var(--accent-soft)' : '#EEE'};color:${r.approved ? 'var(--accent)' : '#888'};">${r.approved ? 'Đã duyệt' : 'Chờ duyệt'}</span>
          </div>
          <div style="font-size:13.5px;white-space:pre-line;margin-bottom:10px;">${esc(r.comment)}</div>
          <div class="btn-row">
            ${r.approved
              ? `<span class="btn-ghost btn btn-sm" data-qt-unapprove="${r.id}">Ẩn khỏi công khai</span>`
              : `<span class="btn btn-sm" data-qt-approve="${r.id}">Duyệt hiện công khai</span>`}
            <span class="btn-ghost btn btn-sm" data-qt-delete="${r.id}" style="color:var(--danger);">Xoá</span>
          </div>
        </div>
      `).join('') || `<div class="hint-box">Chưa có đánh giá nào.</div>`}
    `;
  }

  async function loadTab() {
    state.loading = true;
    if (state.tab === 'san-pham' && !state.products) {
      const { data: products } = await supabaseClient.from('digital_products').select('id,title,price,status,owner_id,created_at').order('created_at', { ascending: false });
      const ownerIds = [...new Set((products || []).map(p => p.owner_id))];
      let namesById = {};
      if (ownerIds.length) {
        const { data: owners } = await supabaseClient.from('profiles').select('id,full_name').in('id', ownerIds);
        namesById = Object.fromEntries((owners || []).map(o => [o.id, o.full_name]));
      }
      state.products = (products || []).map(p => ({ ...p, ownerName: namesById[p.owner_id] }));
    }
    if (state.tab === 'doanh-thu' && !state.orders) {
      try {
        const data = await callApi('api/san-pham-so-admin-orders', {});
        state.orders = data.orders || [];
        state.ordersSummary = { totalRevenue: data.totalRevenue || 0, paidCount: data.paidCount || 0, totalCount: data.totalCount || 0 };
      } catch (e) {
        state.orders = [];
        state.ordersSummary = { totalRevenue: 0, paidCount: 0, totalCount: 0 };
      }
    }
    if (state.tab === 'danh-gia' && !state.reviews) {
      const { data: reviews } = await supabaseClient.from('app_reviews').select('*').eq('app', 'san-pham-so').order('created_at', { ascending: false }).limit(200);
      state.reviews = reviews || [];
    }
    state.loading = false;
    draw();
  }

  function bind() {
    container.querySelectorAll('[data-qt-tab]').forEach(el => {
      el.onclick = () => { state.tab = el.getAttribute('data-qt-tab'); draw(); loadTab(); };
    });
    if (state.tab === 'danh-gia') {
      const searchEl = container.querySelector('#qt-review-search');
      // draw() vẽ lại toàn bộ innerHTML nên ô search cũ bị xoá khỏi DOM — phải lấy lại đúng ô MỚI rồi
      // khôi phục vị trí con trỏ, không thì gõ tiếng Việt có dấu (Telex/VNI) bị nhảy con trỏ/vỡ chữ
      // (lỗi thật Quỳnh phát hiện 2026-09-04 — cùng pattern đã sửa ở nhan-hieu/js/kho-content.js).
      if (searchEl) searchEl.oninput = () => {
        state.reviewSearch = searchEl.value;
        const pos = searchEl.selectionStart;
        draw();
        const newEl = container.querySelector('#qt-review-search');
        if (newEl) { newEl.focus(); newEl.setSelectionRange(pos, pos); }
      };
      container.querySelectorAll('[data-qt-approve]').forEach(el => {
        el.onclick = async () => {
          const id = el.getAttribute('data-qt-approve');
          await supabaseClient.from('app_reviews').update({ approved: true }).eq('id', id);
          const r = state.reviews.find(x => x.id === id); if (r) r.approved = true;
          draw();
        };
      });
      container.querySelectorAll('[data-qt-unapprove]').forEach(el => {
        el.onclick = async () => {
          const id = el.getAttribute('data-qt-unapprove');
          await supabaseClient.from('app_reviews').update({ approved: false }).eq('id', id);
          const r = state.reviews.find(x => x.id === id); if (r) r.approved = false;
          draw();
        };
      });
      container.querySelectorAll('[data-qt-delete]').forEach(el => {
        el.onclick = async () => {
          const id = el.getAttribute('data-qt-delete');
          if (!confirm('Xoá hẳn đánh giá này?')) return;
          await supabaseClient.from('app_reviews').delete().eq('id', id);
          state.reviews = state.reviews.filter(x => x.id !== id);
          draw();
        };
      });
    }
  }
}

window.SanPhamSoScreens = window.SanPhamSoScreens || {};
window.SanPhamSoScreens['quan-tri'] = render;
})();
