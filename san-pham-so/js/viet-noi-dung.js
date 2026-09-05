// Sản Phẩm Số — "✍️ Viết Nội Dung": Bước 3 trong hành trình làm sản phẩm số (sau khi đã chốt ý
// tưởng ở "Tìm Sản Phẩm Phù Hợp"/"Chọn Loại Sản Phẩm Số"), TRƯỚC "Sản phẩm của tôi". Liệt kê các ý
// tưởng đã chọn (product_idea_results.chosen_index khác null) đang viết dở, bấm vào tiếp tục thẳng ở
// đúng chỗ đã dừng (window.renderXayDungNoiDung, xem xay-dung-noi-dung.js).
//
// 2026-09-02 (phản hồi Quỳnh — "web này cho người dùng hiểu phương thức tạo sản phẩm số từng bước,
// task bar phải theo từng bước như thế"): trước đây bước này KHÔNG có chỗ riêng trên task bar, chỉ
// vào được qua 1 dải nhỏ "Đang xây dở" ở đầu màn "Tìm Sản Phẩm Phù Hợp"/"Chọn Loại" — đã BỎ 2 dải đó
// (activeBannerHtml ở tim-san-pham.js/chon-loai.js) vì giờ trùng lặp với đúng 1 chỗ chuẩn ở đây.
//
// 2026-09-04 (Quỳnh: "phần viết nội dung nếu để như kia thì sẽ bị trùng lặp ý với phần tìm sản phẩm
// số... phần kết quả outline cấp 1 đang làm dở xong ng dùng làm tiếp thì làm ở đây"): thêm luôn ý
// tưởng CHƯA CHỌN phương án (chosen_index null — "đang cân nhắc", xem loadPendingIdeaResult() ở
// util.js) vào CHUNG danh sách này — trước đó ý tưởng dạng này chỉ tự hiện lại khi quay đúng về màn
// gốc (Tìm Sản Phẩm Phù Hợp/Chọn Loại), vô hình ở đây, tạo cảm giác có 2 cơ chế "tiếp tục làm dở"
// tách biệt dù cùng 1 khái niệm. Quy ước hiện có (xem util.js) là TỐI ĐA 1 dòng chưa chọn/user, nên
// chỉ cần loadPendingIdeaResult() (không cần hàm "list" riêng) — bấm vào thì điều hướng đúng theo
// answers.nguon (chon_loai -> #chon-loai, còn lại -> #tao-ai), màn gốc đó tự khôi phục lại đúng dòng
// này qua chính cơ chế loadPendingIdeaResult() nó đã có sẵn, không cần truyền id qua lại.
(function () {
function render(container) {
  const state = { loading: true, products: [], pending: null, error: null };
  boot();

  async function boot() {
    const [products, pending] = await Promise.all([listActiveIdeaResults(), loadPendingIdeaResult()]);
    state.products = products;
    state.pending = pending;
    state.loading = false;
    draw();
  }

  function draw() { container.innerHTML = html(); bind(); }

  function pendingCardHtml() {
    const p = state.pending;
    const tuChonLoai = p.answers && p.answers.nguon === 'chon_loai';
    const phuongAnList = (p.result && p.result.phuong_an) || [];
    const first = phuongAnList[0];
    const tenHienThi = first ? first.ten_san_pham : 'Ý tưởng chưa đặt tên';
    const themLabel = phuongAnList.length > 1 ? ` (+${phuongAnList.length - 1} phương án khác)` : '';
    return `
      <div class="card" data-continue-pending="1" style="cursor:pointer;border-style:dashed;">
        <div style="font-size:11.5px;color:var(--ink-soft);text-transform:uppercase;letter-spacing:.04em;margin-bottom:4px;">🔍 Đang cân nhắc — chưa chọn phương án</div>
        <b>${esc(tenHienThi)}${esc(themLabel)}</b>
        <div style="font-size:12.5px;color:var(--ink-soft);margin-top:4px;">Tiếp tục ở ${tuChonLoai ? '🗂️ Chọn Loại Sản Phẩm Số' : '🧭 Tìm Sản Phẩm Phù Hợp'} →</div>
      </div>
    `;
  }

  function html() {
    if (state.loading) return `<div class="loading"><div class="spinner"></div></div>`;
    if (!state.products.length && !state.pending) {
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
      <div class="hint-box">Tất cả ý tưởng đang dở — chưa chọn phương án hoặc đã chọn nhưng chưa viết xong — bấm vào để tiếp tục đúng chỗ đã dừng.</div>
      ${state.error ? `<div class="error-box" style="margin-top:10px;">${esc(state.error)}</div>` : ''}
      ${state.pending ? pendingCardHtml() : ''}
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
    if (!state.products.length && !state.pending) {
      const timBtn = container.querySelector('#vnd-goto-tim-btn');
      if (timBtn) timBtn.onclick = () => { location.hash = 'tao-ai'; };
      const chonBtn = container.querySelector('#vnd-goto-chon-btn');
      if (chonBtn) chonBtn.onclick = () => { location.hash = 'chon-loai'; };
      return;
    }
    const pendingCard = container.querySelector('[data-continue-pending]');
    if (pendingCard) pendingCard.onclick = () => {
      const tuChonLoai = state.pending.answers && state.pending.answers.nguon === 'chon_loai';
      location.hash = tuChonLoai ? 'chon-loai' : 'tao-ai';
    };
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
