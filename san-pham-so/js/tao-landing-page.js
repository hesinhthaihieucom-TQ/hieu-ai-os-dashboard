// Sản Phẩm Số — "🖥️ Tạo Landing Page": AI viết nội dung landing page đầy đủ hơn (hook/vấn đề/lợi
// ích/nội dung/về người bán/phù hợp với ai/FAQ/CTA) cho 1 sản phẩm đã có ở "Sản phẩm của tôi" — lưu
// lại thành JSON (digital_products.landing_page_content), người bán sửa tay lại được sau khi AI viết.
// Trang mua công khai (san-pham-so/p/) tự động hiện bản đầy đủ này nếu đã có, không thì vẫn dùng bản
// đơn giản cũ (title/description/price) — không bắt buộc phải tạo landing page mới bán được.
(function () {
function newContent() {
  return { hook: '', van_de: '', loi_ich: [], noi_dung_gioi_thieu: '', ve_nguoi_ban: '', phu_hop_voi_ai: [], faq: [], cta_text: '' };
}

function render(container) {
  const state = { screen: 'list', products: [], loading: true, selected: null, content: null, generating: false, saving: false, error: null };
  boot();

  async function boot() {
    state.products = await fetchList();
    state.loading = false;
    draw();
  }

  async function fetchList() {
    try {
      const data = await callApi('api/san-pham-so-product', { action: 'list' });
      return data.products || [];
    } catch (e) { state.error = e.message; return []; }
  }

  function draw() { container.innerHTML = html(); bind(); }

  function html() {
    if (state.loading) return `<div class="loading"><div class="spinner"></div></div>`;
    return state.screen === 'edit' ? editHtml() : listHtml();
  }

  function listHtml() {
    return `
      <h2>Tạo Landing Page</h2>
      <div class="hint-box">AI viết nội dung landing page đầy đủ hơn (vấn đề/lợi ích/FAQ...) cho 1 sản phẩm đã có — chọn sản phẩm bên dưới.</div>
      ${state.error ? `<div class="error-box" style="margin-top:10px;">${esc(state.error)}</div>` : ''}
      ${state.products.length === 0 ? `<div class="card">Chưa có sản phẩm nào — tạo sản phẩm ở mục "Sản phẩm của tôi" trước.</div>` : state.products.map(p => `
        <div class="card" data-pick-product="${p.id}" style="cursor:pointer;">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;">
            <b>${esc(p.title)}</b>
            <span style="font-size:12px;color:var(--ink-soft);">${p.landing_page_content ? '✅ Đã có landing page' : 'Chưa có landing page'}</span>
          </div>
          <div style="color:var(--ink-soft);font-size:13.5px;margin-top:4px;">${(p.price || 0).toLocaleString('vi-VN')}đ</div>
        </div>
      `).join('')}
    `;
  }

  function editHtml() {
    const p = state.selected;
    const c = state.content;
    return `
      <h2>${esc(p.title)}</h2>
      <div class="btn-row"><span class="btn-ghost btn btn-sm" id="lp-back-btn">← Chọn sản phẩm khác</span></div>
      <div class="card" style="margin-top:10px;">
        <button class="btn" id="lp-generate-btn" ${state.generating ? 'disabled' : ''}>${state.generating ? 'Đang viết…' : (p.landing_page_content ? '🔄 Viết lại bằng AI (4 lượt)' : '✨ Viết landing page bằng AI (4 lượt)')}</button>
        ${state.generating ? `<div id="lp-progress-el" style="margin-top:12px;">${progressBarHtml(0)}</div>` : ''}
      </div>
      ${state.error ? `<div class="error-box" style="margin-top:10px;">${esc(state.error)}</div>` : ''}
      ${p.landing_page_content || (c.hook || c.van_de) ? `
        <div class="card">
          <label>Hook (tiêu đề chính)</label>
          <input id="lp-hook" type="text" value="${esc(c.hook)}">

          <label style="margin-top:14px;">Vấn đề/nỗi đau</label>
          <textarea id="lp-van-de" rows="4">${esc(c.van_de)}</textarea>

          <label style="margin-top:14px;">Lợi ích (mỗi dòng 1 ý)</label>
          <textarea id="lp-loi-ich" rows="4">${esc((c.loi_ich || []).join('\n'))}</textarea>

          <label style="margin-top:14px;">Giới thiệu nội dung sản phẩm</label>
          <textarea id="lp-noi-dung" rows="4">${esc(c.noi_dung_gioi_thieu)}</textarea>

          <label style="margin-top:14px;">Về người bán</label>
          <textarea id="lp-ve-nguoi-ban" rows="3">${esc(c.ve_nguoi_ban)}</textarea>

          <label style="margin-top:14px;">Phù hợp với ai (mỗi dòng 1 ý)</label>
          <textarea id="lp-phu-hop" rows="3">${esc((c.phu_hop_voi_ai || []).join('\n'))}</textarea>

          <label style="margin-top:14px;">Câu hỏi thường gặp (FAQ)</label>
          <div id="lp-faq-list">
            ${(c.faq || []).map((f, i) => `
              <div style="border:1px solid var(--line);border-radius:8px;padding:10px;margin-bottom:8px;">
                <input type="text" data-faq-question="${i}" value="${esc(f.cau_hoi || '')}" placeholder="Câu hỏi" style="margin-bottom:6px;">
                <textarea data-faq-answer="${i}" rows="2" placeholder="Trả lời">${esc(f.tra_loi || '')}</textarea>
                <span class="btn-ghost btn btn-sm" data-faq-remove="${i}" style="color:var(--danger);margin-top:6px;">Xoá câu này</span>
              </div>
            `).join('')}
          </div>
          <span class="btn-ghost btn btn-sm" id="lp-faq-add">+ Thêm câu hỏi</span>

          <label style="margin-top:14px;">Nút kêu gọi hành động (CTA)</label>
          <input id="lp-cta" type="text" value="${esc(c.cta_text)}">

          <div class="btn-row" style="margin-top:16px;">
            <button class="btn" id="lp-save-btn" ${state.saving ? 'disabled' : ''}>${state.saving ? 'Đang lưu…' : 'Lưu'}</button>
          </div>
        </div>
      ` : ''}
    `;
  }

  function bind() {
    if (state.screen === 'list') {
      container.querySelectorAll('[data-pick-product]').forEach(el => {
        el.onclick = () => {
          const p = state.products.find(x => x.id === el.getAttribute('data-pick-product'));
          if (!p) return;
          state.selected = p;
          state.content = p.landing_page_content ? { ...newContent(), ...p.landing_page_content } : newContent();
          state.screen = 'edit'; state.error = null;
          draw();
        };
      });
      return;
    }

    container.querySelector('#lp-back-btn').onclick = () => { state.screen = 'list'; draw(); };

    container.querySelector('#lp-generate-btn').onclick = async () => {
      state.generating = true; state.error = null; draw();
      const stopProgress = animateProgressBar(container.querySelector('#lp-progress-el'), 25);
      try {
        const data = await callApi('api/san-pham-so-tao-landing-page', { product_id: state.selected.id }, 180000);
        state.content = { ...newContent(), ...data.result };
        state.selected.landing_page_content = state.content;
      } catch (e) {
        state.error = e.message || 'Có lỗi xảy ra — thử lại giúp mình.';
      }
      stopProgress();
      state.generating = false;
      draw();
    };

    const hookEl = container.querySelector('#lp-hook');
    if (hookEl) hookEl.oninput = () => { state.content.hook = hookEl.value; };
    const vanDeEl = container.querySelector('#lp-van-de');
    if (vanDeEl) vanDeEl.oninput = () => { state.content.van_de = vanDeEl.value; };
    const loiIchEl = container.querySelector('#lp-loi-ich');
    if (loiIchEl) loiIchEl.oninput = () => { state.content.loi_ich = loiIchEl.value.split('\n').map(s => s.trim()).filter(Boolean); };
    const noiDungEl = container.querySelector('#lp-noi-dung');
    if (noiDungEl) noiDungEl.oninput = () => { state.content.noi_dung_gioi_thieu = noiDungEl.value; };
    const veNguoiBanEl = container.querySelector('#lp-ve-nguoi-ban');
    if (veNguoiBanEl) veNguoiBanEl.oninput = () => { state.content.ve_nguoi_ban = veNguoiBanEl.value; };
    const phuHopEl = container.querySelector('#lp-phu-hop');
    if (phuHopEl) phuHopEl.oninput = () => { state.content.phu_hop_voi_ai = phuHopEl.value.split('\n').map(s => s.trim()).filter(Boolean); };
    const ctaEl = container.querySelector('#lp-cta');
    if (ctaEl) ctaEl.oninput = () => { state.content.cta_text = ctaEl.value; };

    const faqAddBtn = container.querySelector('#lp-faq-add');
    if (faqAddBtn) faqAddBtn.onclick = () => {
      state.content.faq = [...(state.content.faq || []), { cau_hoi: '', tra_loi: '' }];
      draw();
    };
    container.querySelectorAll('[data-faq-question]').forEach(el => {
      el.oninput = () => { state.content.faq[Number(el.getAttribute('data-faq-question'))].cau_hoi = el.value; };
    });
    container.querySelectorAll('[data-faq-answer]').forEach(el => {
      el.oninput = () => { state.content.faq[Number(el.getAttribute('data-faq-answer'))].tra_loi = el.value; };
    });
    container.querySelectorAll('[data-faq-remove]').forEach(el => {
      el.onclick = () => { state.content.faq.splice(Number(el.getAttribute('data-faq-remove')), 1); draw(); };
    });

    const saveBtn = container.querySelector('#lp-save-btn');
    if (saveBtn) saveBtn.onclick = async () => {
      state.saving = true; state.error = null; draw();
      try {
        await callApi('api/san-pham-so-product', { action: 'update_landing_page', id: state.selected.id, landing_page_content: state.content });
        state.selected.landing_page_content = state.content;
      } catch (e) {
        state.error = e.message || 'Có lỗi xảy ra — thử lại giúp mình.';
      }
      state.saving = false;
      draw();
    };
  }
}

window.SanPhamSoScreens = window.SanPhamSoScreens || {};
window.SanPhamSoScreens['tao-landing-page'] = render;
})();
