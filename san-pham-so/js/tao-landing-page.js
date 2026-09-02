// Sản Phẩm Số — "🖥️ Tạo Landing Page": AI viết TOÀN BỘ nội dung bán hàng (hook/vấn đề/lợi ích/nội
// dung/về người bán/phù hợp với ai/FAQ/CTA) cho 1 sản phẩm đã có ở "Sản phẩm của tôi" — người bán chỉ
// cần chọn mẫu giao diện + tải 2 loại ảnh THẬT (ảnh cá nhân dùng chung mọi sản phẩm, ảnh case study
// riêng từng sản phẩm), không phải điền chữ gì (Quỳnh 2026-09-02: "làm cho họ 90% luôn, 10% chỉ là
// người dùng tải thông tin của họ lên thôi"). Trang mua công khai (san-pham-so/p/) tự động hiện bản
// đầy đủ này nếu đã có, không thì vẫn dùng bản đơn giản cũ (title/description/price) — không bắt
// buộc phải tạo landing page mới bán được. Vẫn có thể sửa tay nội dung chữ sau khi AI viết (tuỳ
// chọn, không bắt buộc) — xem khối "showManualEdit" bên dưới.
(function () {
function newContent() {
  return { hook: '', van_de: '', loi_ich: [], noi_dung_gioi_thieu: '', ve_nguoi_ban: '', phu_hop_voi_ai: [], faq: [], cta_text: '' };
}

// Mẫu giao diện landing page công khai (san-pham-so/p/) — style.css có 3 khối CSS tương ứng, chọn
// bằng [data-lp-template]. Xem trước bằng chính trang mua THẬT qua <iframe src="p/?demo=1&tpl=...">
// (2026-09-02, Quỳnh: "phải cho người ta xem 1 mẫu thật chứ không phải giả") — không phải hình vẽ
// minh hoạ, mà là đúng code/CSS thật sẽ hiện cho khách, chỉ khác dữ liệu là mẫu dựng sẵn.
const LP_TEMPLATES = [
  { value: 'classic', label: 'Cổ điển', desc: 'Nền kem, chữ serif — đúng phong cách hiện có của app.' },
  { value: 'bold', label: 'Nổi bật', desc: 'Nền tối, chữ to đậm, màu nhấn rực — cảm giác quảng cáo mạnh.' },
  { value: 'minimal', label: 'Tối giản', desc: 'Nền trắng, nhiều khoảng trắng, ít trang trí — cảm giác cao cấp.' },
];
const MAX_CASE_STUDIES = 6;

function render(container) {
  const state = {
    screen: 'list', products: [], loading: true, selected: null, content: null, template: 'classic',
    caseStudies: [], caseStudyUploading: false, sellerPhotoUploading: false,
    generating: false, saving: false, error: null, showManualEdit: false,
  };
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

  function templateCellHtml(t, selected, selectable) {
    return `
      <div ${selectable ? `data-lp-pick-template="${t.value}"` : ''} style="${selectable ? 'cursor:pointer;' : ''}flex:1;min-width:190px;border:2px solid ${selected ? 'var(--accent)' : 'var(--line)'};border-radius:12px;overflow:hidden;">
        <div style="height:210px;overflow:hidden;position:relative;background:#eee;">
          <iframe src="p/?demo=1&tpl=${t.value}" style="width:700px;height:550px;border:none;transform:scale(0.4);transform-origin:top left;pointer-events:none;" tabindex="-1" title="${esc(t.label)}"></iframe>
        </div>
        <div style="padding:10px 12px;">
          <div style="font-size:13.5px;font-weight:600;">${selected ? '✓ ' : ''}${esc(t.label)}</div>
          <div style="font-size:12px;color:var(--ink-soft);margin-top:2px;">${esc(t.desc)}</div>
        </div>
      </div>
    `;
  }

  function templateShowcaseHtml() {
    return `
      <div class="card" style="margin-bottom:14px;">
        <label style="margin-bottom:10px;display:block;">🎨 3 mẫu giao diện có sẵn (xem trước thật) — chọn khi vào 1 sản phẩm cụ thể bên dưới</label>
        <div style="display:flex;gap:12px;flex-wrap:wrap;">
          ${LP_TEMPLATES.map(t => templateCellHtml(t, false, false)).join('')}
        </div>
      </div>
    `;
  }

  function listHtml() {
    if (state.products.length === 0) {
      return `
        <h2>Tạo Landing Page</h2>
        ${templateShowcaseHtml()}
        <div class="card" style="text-align:center;padding:36px 24px;">
          <div style="font-size:14.5px;color:var(--ink-soft);margin-bottom:16px;">Chưa có sản phẩm nào để viết landing page — tạo 1 sản phẩm (tên/giá/mô tả) ở "Sản phẩm của tôi" trước, rồi quay lại đây.</div>
          <span class="btn" id="lp-goto-product-btn" style="display:inline-block;width:auto;padding:12px 24px;">🛒 Tạo sản phẩm ngay</span>
        </div>
      `;
    }
    return `
      <h2>Tạo Landing Page</h2>
      ${templateShowcaseHtml()}
      <div class="hint-box">Chọn 1 sản phẩm bên dưới — tải ảnh cá nhân + ảnh case study, chọn mẫu, còn lại AI viết hết.</div>
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
        <label style="margin-bottom:10px;display:block;">1. Chọn mẫu giao diện (xem trước thật)</label>
        <div style="display:flex;gap:12px;flex-wrap:wrap;">
          ${LP_TEMPLATES.map(t => templateCellHtml(t, state.template === t.value, true)).join('')}
        </div>
      </div>
    `;
  }

  function assetsHtml() {
    const photoUrl = currentProfile && currentProfile.sps_seller_photo_url;
    return `
      <div class="card" style="margin-top:10px;">
        <label style="margin-bottom:10px;display:block;">2. Ảnh cá nhân của bạn (dùng chung cho mọi sản phẩm)</label>
        <div style="display:flex;align-items:center;gap:14px;">
          ${photoUrl ? `<img src="${esc(photoUrl)}" style="width:64px;height:64px;border-radius:999px;object-fit:cover;border:1px solid var(--line);">` : `<div style="width:64px;height:64px;border-radius:999px;background:var(--accent-soft);flex:0 0 auto;"></div>`}
          <div>
            <input id="lp-seller-photo-input" type="file" accept="image/*" style="display:none;">
            <span class="btn-ghost btn btn-sm" id="lp-seller-photo-btn">${state.sellerPhotoUploading ? 'Đang tải…' : (photoUrl ? 'Đổi ảnh' : 'Tải ảnh lên')}</span>
          </div>
        </div>
      </div>
      <div class="card" style="margin-top:10px;">
        <label style="margin-bottom:10px;display:block;">3. Ảnh case study THẬT cho sản phẩm này (khách/học viên thật đã dùng, tối đa ${MAX_CASE_STUDIES} ảnh) — không bắt buộc</label>
        <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:10px;">
          ${state.caseStudies.map((c, i) => `
            <div style="width:130px;">
              <img src="${esc(c.url)}" style="width:130px;height:90px;object-fit:cover;border-radius:8px;border:1px solid var(--line);display:block;">
              <input type="text" data-cs-caption="${i}" value="${esc(c.caption || '')}" placeholder="VD: Chị Lan — kết quả sau 3 tháng" style="margin-top:4px;font-size:12px;padding:6px 8px;">
              <span class="btn-ghost btn btn-sm" data-cs-remove="${i}" style="color:var(--danger);display:block;margin-top:4px;text-align:center;">Xoá</span>
            </div>
          `).join('')}
        </div>
        ${state.caseStudies.length < MAX_CASE_STUDIES ? `
          <input id="lp-case-study-input" type="file" accept="image/*" style="display:none;">
          <span class="btn-ghost btn btn-sm" id="lp-case-study-btn">${state.caseStudyUploading ? 'Đang tải…' : '+ Thêm ảnh case study'}</span>
        ` : ''}
      </div>
    `;
  }

  function editHtml() {
    const p = state.selected;
    const c = state.content;
    const hasContent = !!(p.landing_page_content);
    const publicLinkHtml = p.status === 'published'
      ? `<a class="btn-ghost btn btn-sm" href="p/?slug=${esc(p.slug)}" target="_blank" rel="noopener">Xem trang thật →</a>`
      : `<span style="font-size:12.5px;color:var(--ink-soft);">Xuất bản sản phẩm ở "Sản phẩm của tôi" để xem trang thật.</span>`;
    return `
      <h2>${esc(p.title)}</h2>
      <div class="btn-row"><span class="btn-ghost btn btn-sm" id="lp-back-btn">← Chọn sản phẩm khác</span></div>
      ${templatePickerHtml()}
      ${assetsHtml()}
      <div class="card" style="margin-top:10px;">
        <label style="margin-bottom:10px;display:block;">4. AI viết landing page</label>
        <button class="btn" id="lp-generate-btn" ${state.generating ? 'disabled' : ''}>${state.generating ? 'Đang viết…' : (hasContent ? '🔄 Viết lại bằng AI (4 lượt)' : '✨ Tạo Landing Page bằng AI (4 lượt)')}</button>
        ${state.generating ? `<div id="lp-progress-el" style="margin-top:12px;">${progressBarHtml(0)}</div>` : ''}
        ${state.error ? `<div class="error-box" style="margin-top:10px;">${esc(state.error)}</div>` : ''}
        ${hasContent ? `<div class="btn-row" style="margin-top:12px;">${publicLinkHtml}</div>` : ''}
      </div>
      ${hasContent ? `
        <div class="card" style="margin-top:10px;">
          <span class="btn-ghost btn btn-sm" id="lp-toggle-manual-btn">${state.showManualEdit ? '▲ Ẩn chỉnh sửa nội dung chữ' : '✏️ Chỉnh sửa nội dung chữ (không bắt buộc)'}</span>
          ${state.showManualEdit ? manualEditFieldsHtml(c) : ''}
        </div>
      ` : ''}
    `;
  }

  function manualEditFieldsHtml(c) {
    return `
      <div style="margin-top:14px;">
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
          state.caseStudies = Array.isArray(p.case_study_images) ? [...p.case_study_images] : [];
          state.showManualEdit = false;
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

    const sellerPhotoBtn = container.querySelector('#lp-seller-photo-btn');
    const sellerPhotoInput = container.querySelector('#lp-seller-photo-input');
    if (sellerPhotoBtn) sellerPhotoBtn.onclick = () => sellerPhotoInput.click();
    if (sellerPhotoInput) sellerPhotoInput.onchange = async () => {
      const file = sellerPhotoInput.files[0];
      if (!file) return;
      state.sellerPhotoUploading = true; state.error = null; draw();
      try {
        const dataUrl = await compressImageToDataUrl(file, 500, 0.8);
        const { error } = await supabaseClient.rpc('update_sps_seller_photo', { p_photo_url: dataUrl });
        if (error) throw new Error(error.message);
        if (currentProfile) currentProfile.sps_seller_photo_url = dataUrl;
      } catch (e) {
        state.error = e.message || 'Tải ảnh thất bại — thử lại giúp mình.';
      }
      state.sellerPhotoUploading = false;
      draw();
    };

    const caseStudyBtn = container.querySelector('#lp-case-study-btn');
    const caseStudyInput = container.querySelector('#lp-case-study-input');
    if (caseStudyBtn) caseStudyBtn.onclick = () => caseStudyInput.click();
    if (caseStudyInput) caseStudyInput.onchange = async () => {
      const file = caseStudyInput.files[0];
      if (!file) return;
      state.caseStudyUploading = true; state.error = null; draw();
      try {
        const dataUrl = await compressImageToDataUrl(file, 900, 0.75);
        state.caseStudies.push({ url: dataUrl, caption: '' });
      } catch (e) {
        state.error = e.message || 'Tải ảnh thất bại — thử lại giúp mình.';
      }
      state.caseStudyUploading = false;
      draw();
    };
    container.querySelectorAll('[data-cs-caption]').forEach(el => {
      el.oninput = () => { state.caseStudies[Number(el.getAttribute('data-cs-caption'))].caption = el.value; };
    });
    container.querySelectorAll('[data-cs-remove]').forEach(el => {
      el.onclick = () => { state.caseStudies.splice(Number(el.getAttribute('data-cs-remove')), 1); draw(); };
    });

    container.querySelector('#lp-generate-btn').onclick = async () => {
      state.generating = true; state.error = null; draw();
      const stopProgress = animateProgressBar(container.querySelector('#lp-progress-el'), 25);
      try {
        // Lưu mẫu + ảnh case study TRƯỚC (không mất nếu bước AI lỗi giữa chừng), rồi mới gọi AI viết
        // chữ — AI viết xong tự PATCH landing_page_content luôn (api/san-pham-so-tao-landing-page.js),
        // không cần bấm "Lưu" riêng cho luồng chính (Quỳnh: "90% chỉ là tải thông tin lên thôi").
        await callApi('api/san-pham-so-product', { action: 'update_landing_page', id: state.selected.id, landing_page_content: state.content, landing_page_template: state.template, case_study_images: state.caseStudies });
        const data = await callApi('api/san-pham-so-tao-landing-page', { product_id: state.selected.id }, 180000);
        state.content = { ...newContent(), ...data.result };
        state.selected.landing_page_content = state.content;
        state.selected.landing_page_template = state.template;
        state.selected.case_study_images = state.caseStudies;
      } catch (e) {
        state.error = e.message || 'Có lỗi xảy ra — thử lại giúp mình.';
      }
      stopProgress();
      state.generating = false;
      draw();
    };

    const toggleManualBtn = container.querySelector('#lp-toggle-manual-btn');
    if (toggleManualBtn) toggleManualBtn.onclick = () => { state.showManualEdit = !state.showManualEdit; draw(); };
    if (!state.showManualEdit) return;

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
        await callApi('api/san-pham-so-product', { action: 'update_landing_page', id: state.selected.id, landing_page_content: state.content, landing_page_template: state.template, case_study_images: state.caseStudies });
        state.selected.landing_page_content = state.content;
        state.selected.landing_page_template = state.template;
        state.selected.case_study_images = state.caseStudies;
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
