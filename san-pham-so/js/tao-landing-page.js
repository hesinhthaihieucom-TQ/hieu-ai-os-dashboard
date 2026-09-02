// Sản Phẩm Số — "🖥️ Tạo Landing Page": AI viết nội dung landing page đầy đủ hơn (hook/vấn đề/lợi
// ích/nội dung/về người bán/phù hợp với ai/FAQ/CTA) cho 1 sản phẩm đã có ở "Sản phẩm của tôi" — lưu
// lại thành JSON (digital_products.landing_page_content), người bán sửa tay lại được sau khi AI viết.
// Trang mua công khai (san-pham-so/p/) tự động hiện bản đầy đủ này nếu đã có, không thì vẫn dùng bản
// đơn giản cũ (title/description/price) — không bắt buộc phải tạo landing page mới bán được.
//
// 2026-09-02 (phản hồi trực tiếp Quỳnh — "chưa thấy hiện gì ở mục đó, phải cho người ta thấy mẫu cho
// người ta chọn"): 2 thay đổi lớn — (1) form nội dung giờ LUÔN hiện ngay khi chọn 1 sản phẩm (kể cả
// chưa bấm AI viết, kể cả chưa có nội dung gì) thay vì chỉ hiện 1 nút trơ trọi; (2) thêm bước chọn
// MẪU GIAO DIỆN (landing_page_template — chỉ đổi màu/bố cục hiển thị, KHÔNG đổi công thức nội dung
// AI viết, công thức đó đã chốt trước đó). Việc bắt buộc phải có sản phẩm có sẵn thì Quỳnh xác nhận
// giữ nguyên, chỉ cần màn danh sách rõ ràng hơn khi chưa có sản phẩm nào.
(function () {
function newContent() {
  return { hook: '', van_de: '', loi_ich: [], noi_dung_gioi_thieu: '', ve_nguoi_ban: '', phu_hop_voi_ai: [], faq: [], cta_text: '' };
}

// Mẫu giao diện landing page công khai (san-pham-so/p/) — style.css có 3 khối CSS tương ứng, chọn
// bằng [data-lp-template]. Swatch ở đây chỉ để xem trước nhanh trong lúc chọn, không phải CSS thật.
const LP_TEMPLATES = [
  { value: 'classic', label: 'Cổ điển', desc: 'Nền kem, chữ serif — đúng phong cách hiện có của app.', swatchBg: '#F7F5EC', swatchAccent: '#2F6F62', swatchText: '#1E2420' },
  { value: 'bold', label: 'Nổi bật', desc: 'Nền tối, chữ to đậm, màu nhấn rực — cảm giác quảng cáo mạnh.', swatchBg: '#171E1A', swatchAccent: '#F2A93B', swatchText: '#F4F1E8' },
  { value: 'minimal', label: 'Tối giản', desc: 'Nền trắng, nhiều khoảng trắng, ít trang trí — cảm giác cao cấp.', swatchBg: '#FFFFFF', swatchAccent: '#3A3A3A', swatchText: '#3A3A3A' },
];

function render(container) {
  const state = { screen: 'list', products: [], loading: true, selected: null, content: null, template: 'classic', generating: false, saving: false, error: null };
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
    if (state.products.length === 0) {
      return `
        <h2>Tạo Landing Page</h2>
        <div class="card" style="text-align:center;padding:36px 24px;">
          <div style="font-size:14.5px;color:var(--ink-soft);margin-bottom:16px;">Chưa có sản phẩm nào để viết landing page — tạo 1 sản phẩm (tên/giá/mô tả) ở "Sản phẩm của tôi" trước, rồi quay lại đây.</div>
          <span class="btn" id="lp-goto-product-btn" style="display:inline-block;width:auto;padding:12px 24px;">🛒 Tạo sản phẩm ngay</span>
        </div>
      `;
    }
    return `
      <h2>Tạo Landing Page</h2>
      <div class="hint-box">AI viết nội dung landing page đầy đủ hơn (vấn đề/lợi ích/FAQ...) cho 1 sản phẩm đã có — chọn sản phẩm bên dưới.</div>
      ${state.error ? `<div class="error-box" style="margin-top:10px;">${esc(state.error)}</div>` : ''}
      ${state.products.map(p => `
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

  function templatePickerHtml() {
    return `
      <div class="card" style="margin-top:10px;">
        <label style="margin-bottom:10px;display:block;">Mẫu giao diện landing page</label>
        <div style="display:flex;gap:10px;flex-wrap:wrap;">
          ${LP_TEMPLATES.map(t => `
            <div data-lp-pick-template="${t.value}" style="cursor:pointer;flex:1;min-width:140px;border:2px solid ${state.template === t.value ? 'var(--accent)' : 'var(--line)'};border-radius:10px;padding:10px;">
              <div style="background:${t.swatchBg};border-radius:6px;padding:10px 8px;margin-bottom:8px;">
                <div style="width:60%;height:6px;background:${t.swatchAccent};border-radius:3px;margin-bottom:6px;"></div>
                <div style="width:90%;height:4px;background:${t.swatchText};opacity:.5;border-radius:2px;margin-bottom:4px;"></div>
                <div style="width:75%;height:4px;background:${t.swatchText};opacity:.5;border-radius:2px;"></div>
              </div>
              <div style="font-size:13.5px;font-weight:600;">${state.template === t.value ? '✓ ' : ''}${esc(t.label)}</div>
              <div style="font-size:12px;color:var(--ink-soft);margin-top:2px;">${esc(t.desc)}</div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  function editHtml() {
    const p = state.selected;
    const c = state.content;
    return `
      <h2>${esc(p.title)}</h2>
      <div class="btn-row"><span class="btn-ghost btn btn-sm" id="lp-back-btn">← Chọn sản phẩm khác</span></div>
      ${templatePickerHtml()}
      <div class="card" style="margin-top:10px;">
        <button class="btn" id="lp-generate-btn" ${state.generating ? 'disabled' : ''}>${state.generating ? 'Đang viết…' : (p.landing_page_content ? '🔄 Viết lại bằng AI (4 lượt)' : '✨ Viết landing page bằng AI (4 lượt)')}</button>
        ${state.generating ? `<div id="lp-progress-el" style="margin-top:12px;">${progressBarHtml(0)}</div>` : ''}
        <div style="font-size:12.5px;color:var(--ink-soft);margin-top:8px;">Hoặc tự điền tay các mục bên dưới, không bắt buộc phải dùng AI.</div>
      </div>
      ${state.error ? `<div class="error-box" style="margin-top:10px;">${esc(state.error)}</div>` : ''}
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
    `;
  }

  function bind() {
    if (state.screen === 'list') {
      const gotoBtn = container.querySelector('#lp-goto-product-btn');
      if (gotoBtn) gotoBtn.onclick = () => { location.hash = 'san-pham'; };
      container.querySelectorAll('[data-pick-product]').forEach(el => {
        el.onclick = () => {
          const p = state.products.find(x => x.id === el.getAttribute('data-pick-product'));
          if (!p) return;
          state.selected = p;
          state.content = p.landing_page_content ? { ...newContent(), ...p.landing_page_content } : newContent();
          state.template = p.landing_page_template || 'classic';
          state.screen = 'edit'; state.error = null;
          draw();
        };
      });
      return;
    }

    container.querySelector('#lp-back-btn').onclick = () => { state.screen = 'list'; draw(); };

    container.querySelectorAll('[data-lp-pick-template]').forEach(el => {
      el.onclick = () => { state.template = el.getAttribute('data-lp-pick-template'); draw(); };
    });

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
        await callApi('api/san-pham-so-product', { action: 'update_landing_page', id: state.selected.id, landing_page_content: state.content, landing_page_template: state.template });
        state.selected.landing_page_content = state.content;
        state.selected.landing_page_template = state.template;
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
