// Sản Phẩm Số — "✍️ Viết Nội Dung": Bước 3 trong hành trình làm sản phẩm số (sau khi đã chốt ý
// tưởng ở "Tìm Sản Phẩm Phù Hợp"/"Chọn Loại Sản Phẩm Số"), TRƯỚC "Sản phẩm của tôi". Liệt kê các ý
// tưởng đã chọn (product_idea_results.chosen_index khác null) đang viết dở, bấm vào tiếp tục thẳng ở
// đúng chỗ đã dừng (window.renderXayDungNoiDung, xem xay-dung-noi-dung.js).
//
// 2026-09-02 (phản hồi Quỳnh — "web này cho người dùng hiểu phương thức tạo sản phẩm số từng bước,
// task bar phải theo từng bước như thế"): trước đây bước này KHÔNG có chỗ riêng trên task bar, chỉ
// vào được qua 1 dải nhỏ "Đang xây dở" ở đầu màn "Tìm Sản Phẩm Phù Hợp"/"Chọn Loại" — đã BỎ 2 dải đó
// (activeBannerHtml ở tim-san-pham.js/chon-loai.js) vì giờ trùng lặp với đúng 1 chỗ chuẩn ở đây.
(function () {
function render(container) {
  const state = { loading: true, products: [], error: null };
  boot();

  async function boot() {
    state.products = await listActiveIdeaResults();
    state.loading = false;
    draw();
  }

  function draw() { container.innerHTML = html(); bind(); }

  function html() {
    if (state.loading) return `<div class="loading"><div class="spinner"></div></div>`;
    if (!state.products.length) {
      return `
        <h2>Viết Nội Dung</h2>
        <div class="card" style="text-align:center;padding:36px 24px;">
          <div style="font-size:14.5px;color:var(--ink-soft);margin-bottom:16px;">Chưa có ý tưởng nào đang viết dở — chốt 1 ý tưởng ở bước trước để bắt đầu viết nội dung.</div>
          <div class="btn-row" style="justify-content:center;">
            <span class="btn" id="vnd-goto-tim-btn" style="display:inline-block;width:auto;padding:12px 24px;">🧭 Tìm Sản Phẩm Phù Hợp</span>
            <span class="btn-ghost btn" id="vnd-goto-chon-btn" style="display:inline-block;width:auto;padding:12px 24px;">🗂️ Chọn Loại Sản Phẩm Số</span>
          </div>
        </div>
      `;
    }
    return `
      <h2>Viết Nội Dung</h2>
      <div class="hint-box">Các ý tưởng đã chốt, đang viết nội dung dở theo outline — bấm vào để tiếp tục đúng chỗ đã dừng.</div>
      ${state.error ? `<div class="error-box" style="margin-top:10px;">${esc(state.error)}</div>` : ''}
      ${state.products.map((p, i) => {
        const idea = p.result.phuong_an[p.chosen_index];
        return `
          <div class="card" data-continue="${i}" style="cursor:pointer;">
            <b>${esc(idea.ten_san_pham)}</b>
            <div style="font-size:12.5px;color:var(--ink-soft);margin-top:4px;">${esc(idea.doi_tuong)} · ${esc(idea.dinh_dang)}</div>
          </div>
        `;
      }).join('')}
    `;
  }

  function bind() {
    if (!state.products.length) {
      const timBtn = container.querySelector('#vnd-goto-tim-btn');
      if (timBtn) timBtn.onclick = () => { location.hash = 'tao-ai'; };
      const chonBtn = container.querySelector('#vnd-goto-chon-btn');
      if (chonBtn) chonBtn.onclick = () => { location.hash = 'chon-loai'; };
      return;
    }
    container.querySelectorAll('[data-continue]').forEach(el => {
      el.onclick = () => {
        const p = state.products[Number(el.getAttribute('data-continue'))];
        window.renderXayDungNoiDung(container, p);
      };
    });
  }
}

window.SanPhamSoScreens = window.SanPhamSoScreens || {};
window.SanPhamSoScreens['viet-noi-dung'] = render;
})();
