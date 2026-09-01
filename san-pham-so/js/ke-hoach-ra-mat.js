// Sản Phẩm Số — "🚀 Kế Hoạch Ra Mắt": chọn 1 sản phẩm đã tạo, AI lập timeline hành động cụ thể
// trước/trong/sau ngày ra mắt, dành cho người bán tự làm 1 mình. Tái dùng đúng lệnh gọi danh sách
// sản phẩm đã có ở san-pham-so/js/danh-sach-san-pham.js (api/san-pham-so-product action:'list').
// Lưu kết quả qua module_drafts (loadDraft/saveDraft ở util.js), key riêng theo từng sản phẩm —
// không cần cột DB mới, và cho phép "Lập lại" (ghi đè draft) khi muốn làm mới kế hoạch.
(function () {
function draftKey(productId) {
  return `ke-hoach-ra-mat-${productId}`;
}

function render(container) {
  const state = { products: [], loading: true, error: null, plans: {} }; // plans[productId] = {loading, result, error}

  async function fetchList() {
    try {
      const data = await callApi('api/san-pham-so-product', { action: 'list' });
      return data.products || [];
    } catch (e) { state.error = e.message; return []; }
  }

  async function boot() {
    state.products = await fetchList();
    await Promise.all(state.products.map(async (p) => {
      const draft = await loadDraft(draftKey(p.id));
      if (draft) state.plans[p.id] = { loading: false, result: draft, error: null };
    }));
    state.loading = false;
    draw();
  }

  function draw() { container.innerHTML = html(); bind(); }

  function html() {
    if (state.loading) return `<div class="loading"><div class="spinner"></div></div>`;
    return `
      <h2>🚀 Kế Hoạch Ra Mắt</h2>
      <div class="hint-box">Chọn 1 sản phẩm đã tạo — AI lập timeline việc cần làm trước/trong/sau ngày ra mắt, chỉ dùng kênh cá nhân (Zalo/Facebook), không cần ngân sách quảng cáo.</div>
      ${state.error ? `<div class="error-box">${esc(state.error)}</div>` : ''}
      ${state.products.length === 0 ? `<div class="card">Chưa có sản phẩm nào — vào "Sản phẩm của tôi" để tạo 1 sản phẩm trước.</div>` : state.products.map((p) => productCardHtml(p)).join('')}
    `;
  }

  function productCardHtml(p) {
    const plan = state.plans[p.id];
    return `
      <div class="card">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap;">
          <div>
            <b>${esc(p.title)}</b>
            <div style="color:var(--ink-soft);font-size:13.5px;margin-top:4px;">${(p.price || 0).toLocaleString('vi-VN')}đ</div>
          </div>
          <span class="btn-ghost btn btn-sm" data-plan-btn="${p.id}" ${plan && plan.loading ? 'style="opacity:.5;pointer-events:none;"' : ''}>${plan && plan.loading ? 'Đang lập kế hoạch…' : (plan && plan.result ? '🔄 Lập lại' : '🚀 Lập kế hoạch ra mắt (2 lượt AI)')}</span>
        </div>
        ${plan && plan.error ? `<div class="error-box" style="margin-top:10px;">${esc(plan.error)}</div>` : ''}
        ${plan && plan.result ? planResultHtml(plan.result) : ''}
      </div>
    `;
  }

  function planResultHtml(result) {
    return `
      <div style="margin-top:14px;display:flex;flex-direction:column;gap:10px;">
        ${(result.giai_doan || []).map((g) => `
          <div class="hint-box" style="margin-bottom:0;">
            <b>${esc(g.ten_giai_doan)}</b>
            <ul style="margin:6px 0 0;padding-left:18px;">${(g.hanh_dong || []).map((h) => `<li>${esc(h)}</li>`).join('')}</ul>
          </div>
        `).join('')}
      </div>
    `;
  }

  function bind() {
    container.querySelectorAll('[data-plan-btn]').forEach((el) => {
      el.onclick = async () => {
        const id = el.getAttribute('data-plan-btn');
        const p = state.products.find((x) => x.id === id);
        if (!p) return;
        state.plans[id] = { loading: true, result: null, error: null };
        draw();
        const stopProgress = animateProgressButton(container.querySelector(`[data-plan-btn="${id}"]`), 20, 'Đang lập kế hoạch');
        try {
          const data = await callApi('api/san-pham-so-ke-hoach-ra-mat', { title: p.title, description: p.description || '', price: p.price }, 150000);
          state.plans[id] = { loading: false, result: data.result, error: null };
          await saveDraft(draftKey(id), data.result);
        } catch (e) {
          state.plans[id] = { loading: false, result: null, error: e.message };
        }
        stopProgress();
        draw();
      };
    });
  }

  boot();
}

window.SanPhamSoScreens = window.SanPhamSoScreens || {};
window.SanPhamSoScreens['ke-hoach-ra-mat'] = render;
})();
