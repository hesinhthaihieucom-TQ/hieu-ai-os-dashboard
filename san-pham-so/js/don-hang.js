// Sản Phẩm Số — "📦 Đơn hàng của tôi": người bán tự xem ai đã mua sản phẩm của mình, không cần Quỳnh
// can thiệp tay (2026-09-02). Thanh toán/xác nhận/giao hàng đã tự động 100% qua SePay webhook từ
// trước — màn này CHỈ để XEM, không có hành động gì (đơn "pending" tự chuyển "paid" khi khách chuyển
// khoản đúng, không cần bấm gì ở đây).
(function () {
function render(container) {
  const state = { loading: true, orders: [], error: null };
  boot();

  async function boot() {
    try {
      const data = await callApi('api/san-pham-so-my-orders', {});
      state.orders = data.orders || [];
    } catch (e) {
      state.error = e.message || 'Có lỗi xảy ra — thử lại giúp mình.';
    }
    state.loading = false;
    draw();
  }

  function draw() { container.innerHTML = html(); }

  function statusLabel(o) {
    return o.status === 'paid' ? '✅ Đã thanh toán' : '⏳ Chờ thanh toán';
  }

  function html() {
    if (state.loading) return `<div class="loading"><div class="spinner"></div></div>`;
    return `
      <h2>Đơn hàng của tôi</h2>
      <div class="hint-box">Danh sách khách đã đặt mua sản phẩm của bạn — thanh toán và giao hàng tự động, không cần làm gì ở đây.</div>
      ${state.error ? `<div class="error-box" style="margin-top:10px;">${esc(state.error)}</div>` : ''}
      ${state.orders.length === 0 ? `<div class="card">Chưa có đơn hàng nào.</div>` : state.orders.map(o => `
        <div class="card" style="margin-bottom:10px;">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;">
            <b>${esc((o.digital_products && o.digital_products.title) || 'Sản phẩm đã xoá')}</b>
            <span style="font-size:12.5px;white-space:nowrap;">${statusLabel(o)}</span>
          </div>
          <div style="color:var(--ink-soft);font-size:13.5px;margin-top:4px;">
            ${Number(o.amount).toLocaleString('vi-VN')}đ · ${o.buyer_email ? esc(o.buyer_email) : 'Không để lại email'}
          </div>
          <div style="color:var(--ink-soft);font-size:12px;margin-top:2px;">
            Đặt lúc: ${new Date(o.created_at).toLocaleString('vi-VN')}${o.paid_at ? ` · Thanh toán lúc: ${new Date(o.paid_at).toLocaleString('vi-VN')}` : ''}
          </div>
        </div>
      `).join('')}
    `;
  }
}

window.SanPhamSoScreens = window.SanPhamSoScreens || {};
window.SanPhamSoScreens['don-hang'] = render;
})();
