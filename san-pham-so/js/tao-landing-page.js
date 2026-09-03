// Sản Phẩm Số — "🖥️ Tạo Landing Page": AI viết TOÀN BỘ nội dung bán hàng, đầy đủ và có cấu trúc như
// 1 landing page bán hàng thật (vấn đề đặt tên riêng, lộ trình theo chặng, lời nhắn cá nhân — xem
// api/_lib/landing-page-schema.js) cho 1 sản phẩm đã có ở "Sản phẩm của tôi" — người bán chỉ cần
// chọn mẫu giao diện + tải ảnh THẬT (ảnh cá nhân dùng chung mọi sản phẩm, ảnh case study riêng từng
// sản phẩm) + tự viết ưu đãi tặng kèm nếu có, không phải điền chữ nội dung bán hàng (Quỳnh 2026-09-02:
// "làm cho họ 90% luôn, 10% chỉ là người dùng tải thông tin của họ lên thôi"). Trang mua công khai
// (san-pham-so/p/) tự động hiện bản đầy đủ này nếu đã có, không thì vẫn dùng bản đơn giản cũ
// (title/description/price) — không bắt buộc phải tạo landing page mới bán được. Vẫn có thể sửa tay
// nội dung chữ sau khi AI viết (tuỳ chọn, không bắt buộc) — xem khối "showManualEdit" bên dưới.
(function () {
function newContent() {
  return {
    hook: '', van_de_intro: '', van_de_chi_tiet: [], ket_qua_dat_duoc: [], chuong_trinh: [],
    loi_nhan_nguoi_ban: '', ve_nguoi_ban: '', phu_hop_voi_ai: [], faq: [], cta_text: '',
  };
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

function newProductForm() {
  return { title: '', price: '', description: '', deliverableType: 'file', externalLink: '', fileStoragePath: null, fileName: null, fileUploading: false, error: null, saving: false };
}

function render(container) {
  const state = {
    screen: 'list', products: [], loading: true, selected: null, content: null, template: 'classic',
    caseStudies: [], bonusItems: [], caseStudyUploading: false, sellerPhotoUploading: false,
    generating: false, saving: false, error: null, showManualEdit: false,
    // Tạo nhanh 1 sản phẩm NGAY TẠI ĐÂY (2026-09-02, Quỳnh: "người dùng không cần làm bước 1-2-3
    // cũng có thể làm trực tiếp landing page, với người đã có sẵn 1 sản phẩm chỉ cần trang landing
    // page để bán") — không bắt buộc phải vòng qua "Sản phẩm của tôi"/Chọn Loại/Viết Nội Dung trước.
    // Chỉ đủ trường tối thiểu để bán được (tên/giá/mô tả + 1 file hoặc 1 link) — sản phẩm tạo ra vẫn
    // nằm chung ở "Sản phẩm của tôi", có thể vào đó bổ sung thêm sau (ảnh bìa, loại chi tiết...).
    showQuickCreate: false, quickCreate: newProductForm(),
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
    // 2026-09-03 (Quỳnh: "muốn bấm vào thấy landing page như của em gửi chứ hiện nó chỉ là hình cho
    // mình xem ở ngoài người ta không hiểu") — khung cắt nhỏ ở trên chỉ để liếc nhanh, KHÔNG đủ để
    // hiểu hết 1 mẫu; thêm link "Xem đầy đủ →" mở NGUYÊN trang mẫu thật (cuộn được, đúng như xem 1
    // landing page thật) ở tab mới — data-lp-view-full để bind() chặn click này lan lên chọn mẫu.
    return `
      <div ${selectable ? `data-lp-pick-template="${t.value}"` : ''} style="${selectable ? 'cursor:pointer;' : ''}flex:1;min-width:190px;border:2px solid ${selected ? 'var(--accent)' : 'var(--line)'};border-radius:12px;overflow:hidden;">
        <div style="height:210px;overflow:hidden;position:relative;background:#eee;">
          <iframe src="p/?demo=1&tpl=${t.value}" style="width:700px;height:550px;border:none;transform:scale(0.4);transform-origin:top left;pointer-events:none;" tabindex="-1" title="${esc(t.label)}"></iframe>
        </div>
        <div style="padding:10px 12px;">
          <div style="font-size:13.5px;font-weight:600;">${selected ? '✓ ' : ''}${esc(t.label)}</div>
          <div style="font-size:12px;color:var(--ink-soft);margin-top:2px;">${esc(t.desc)}</div>
          <a data-lp-view-full href="p/?demo=1&tpl=${t.value}" target="_blank" rel="noopener" style="display:inline-block;margin-top:8px;font-size:12.5px;color:var(--accent);text-decoration:underline;">🔍 Xem đầy đủ →</a>
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

  function quickCreateHtml() {
    const f = state.quickCreate;
    return `
      <div class="card">
        <h2 style="font-size:16px;margin-bottom:10px;">Tạo nhanh sản phẩm để bán</h2>
        <div style="font-size:12.5px;color:var(--ink-soft);margin-bottom:12px;">Chỉ cần đủ thông tin để bán — có thể vào "Sản phẩm của tôi" bổ sung thêm sau (ảnh bìa, loại chi tiết...).</div>
        <label>Tên sản phẩm</label>
        <input id="qc-title" type="text" value="${esc(f.title)}" placeholder="VD: Ebook 21 Ngày Giải Nghiệp Tiền Bạc">

        <label style="margin-top:14px;">Giá (đ)</label>
        <input id="qc-price" type="number" value="${esc(f.price)}" placeholder="VD: 199000">

        <label style="margin-top:14px;">Mô tả ngắn</label>
        <textarea id="qc-desc" rows="3">${esc(f.description)}</textarea>

        <label style="margin-top:14px;">Giao hàng cho khách bằng</label>
        <div class="chips">
          <div class="chip ${f.deliverableType === 'file' ? 'selected' : ''}" data-qc-deliv="file">📎 Tải file lên</div>
          <div class="chip ${f.deliverableType === 'link' ? 'selected' : ''}" data-qc-deliv="link">🔗 Link có sẵn</div>
        </div>
        ${f.deliverableType === 'file' ? `
          <input id="qc-file-input" type="file" style="margin-top:10px;">
          <div style="font-size:13px;color:var(--ink-soft);margin-top:4px;">${f.fileUploading ? 'Đang tải lên…' : (f.fileName ? `📎 ${esc(f.fileName)} — đã tải lên ✓` : 'Chưa chọn file.')}</div>
        ` : `
          <input id="qc-link" type="text" value="${esc(f.externalLink)}" placeholder="https://..." style="margin-top:10px;">
        `}

        ${f.error ? `<div class="error-box" style="margin-top:10px;">${esc(f.error)}</div>` : ''}
        <div class="btn-row" style="margin-top:16px;">
          <button class="btn" id="qc-save-btn" ${f.saving ? 'disabled' : ''}>${f.saving ? 'Đang tạo…' : 'Tạo sản phẩm & viết Landing Page →'}</button>
          <span class="btn-ghost btn" id="qc-cancel-btn">Huỷ</span>
        </div>
      </div>
    `;
  }

  function listHtml() {
    if (state.showQuickCreate) {
      return `<h2>Tạo Landing Page</h2>${templateShowcaseHtml()}${quickCreateHtml()}`;
    }
    if (state.products.length === 0) {
      return `
        <h2>Tạo Landing Page</h2>
        ${templateShowcaseHtml()}
        <div class="card" style="text-align:center;padding:36px 24px;">
          <div style="font-size:14.5px;color:var(--ink-soft);margin-bottom:16px;">Đã có sẵn 1 sản phẩm muốn bán? Tạo nhanh ngay đây, không cần qua bước nào khác.</div>
          <span class="btn" id="lp-quick-create-btn" style="display:inline-block;width:auto;padding:12px 24px;">🛒 Tạo nhanh sản phẩm</span>
        </div>
      `;
    }
    return `
      <h2>Tạo Landing Page</h2>
      ${templateShowcaseHtml()}
      <div class="hint-box">Chọn 1 sản phẩm bên dưới — tải ảnh cá nhân + ảnh case study, chọn mẫu, còn lại AI viết hết.</div>
      ${state.error ? `<div class="error-box" style="margin-top:10px;">${esc(state.error)}</div>` : ''}
      <div class="btn-row"><span class="btn-ghost btn btn-sm" id="lp-quick-create-btn">+ Tạo nhanh sản phẩm khác</span></div>
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
      <div class="card" style="margin-top:10px;">
        <label style="margin-bottom:10px;display:block;">4. Ưu đãi tặng kèm (tuỳ chọn, mỗi dòng 1 ưu đãi — do bạn tự viết, không phải AI vì đây là cam kết thật của bạn)</label>
        <textarea id="lp-bonus" rows="3" placeholder="VD: Tặng kèm Sổ tay PDF&#10;VD: Vào nhóm Zalo hỗ trợ riêng">${esc(state.bonusItems.join('\n'))}</textarea>
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
        <label style="margin-bottom:10px;display:block;">5. AI viết landing page</label>
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

  function namedListEditorHtml(items, tenAttr, moTaAttr, removeAttr, tenPlaceholder, moTaPlaceholder) {
    return `
      <div>
        ${(items || []).map((it, i) => `
          <div style="border:1px solid var(--line);border-radius:8px;padding:10px;margin-bottom:8px;">
            <input type="text" data-${tenAttr}="${i}" value="${esc(it.ten || '')}" placeholder="${esc(tenPlaceholder)}" style="margin-bottom:6px;font-weight:600;">
            <textarea data-${moTaAttr}="${i}" rows="2" placeholder="${esc(moTaPlaceholder)}">${esc(it.mo_ta || '')}</textarea>
            <span class="btn-ghost btn btn-sm" data-${removeAttr}="${i}" style="color:var(--danger);margin-top:6px;">Xoá</span>
          </div>
        `).join('')}
      </div>
    `;
  }

  function manualEditFieldsHtml(c) {
    return `
      <div style="margin-top:14px;">
        <label>Hook (tiêu đề chính)</label>
        <input id="lp-hook" type="text" value="${esc(c.hook)}">

        <label style="margin-top:14px;">Vấn đề — mở đầu</label>
        <textarea id="lp-van-de-intro" rows="3">${esc(c.van_de_intro)}</textarea>

        <label style="margin-top:14px;">Vấn đề — chi tiết (mỗi vấn đề 1 tên riêng + mô tả)</label>
        <div id="lp-van-de-ct-list">${namedListEditorHtml(c.van_de_chi_tiet, 'vandect-ten', 'vandect-mota', 'vandect-remove', 'Tên vấn đề', 'Mô tả')}</div>
        <span class="btn-ghost btn btn-sm" id="lp-vandect-add">+ Thêm vấn đề</span>

        <label style="margin-top:14px;">Kết quả đạt được (mỗi dòng 1 ý)</label>
        <textarea id="lp-ket-qua" rows="4">${esc((c.ket_qua_dat_duoc || []).join('\n'))}</textarea>

        <label style="margin-top:14px;">Lộ trình / chương trình (mỗi phần 1 tên + mô tả)</label>
        <div id="lp-chuong-trinh-list">${namedListEditorHtml(c.chuong_trinh, 'ct-ten', 'ct-mota', 'ct-remove', 'Tên phần', 'Mô tả')}</div>
        <span class="btn-ghost btn btn-sm" id="lp-ct-add">+ Thêm phần</span>

        <label style="margin-top:14px;">Lời nhắn của bạn (giọng cá nhân, gửi trực tiếp tới người đọc)</label>
        <textarea id="lp-loi-nhan" rows="3">${esc(c.loi_nhan_nguoi_ban)}</textarea>

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

  function pickProduct(p) {
    state.selected = p;
    state.content = p.landing_page_content ? { ...newContent(), ...p.landing_page_content } : newContent();
    state.template = p.landing_page_template || 'classic';
    state.caseStudies = Array.isArray(p.case_study_images) ? [...p.case_study_images] : [];
    state.bonusItems = Array.isArray(p.bonus_items) ? [...p.bonus_items] : [];
    state.showManualEdit = false;
    state.screen = 'edit'; state.error = null;
  }

  function bindQuickCreate() {
    const f = state.quickCreate;
    const quickCreateBtn = container.querySelector('#lp-quick-create-btn');
    if (quickCreateBtn) quickCreateBtn.onclick = () => { state.showQuickCreate = true; state.quickCreate = newProductForm(); draw(); };
    if (!state.showQuickCreate) return;

    container.querySelector('#qc-cancel-btn').onclick = () => { state.showQuickCreate = false; draw(); };
    const titleEl = container.querySelector('#qc-title');
    if (titleEl) titleEl.oninput = () => { f.title = titleEl.value; };
    const priceEl = container.querySelector('#qc-price');
    if (priceEl) priceEl.oninput = () => { f.price = priceEl.value; };
    const descEl = container.querySelector('#qc-desc');
    if (descEl) descEl.oninput = () => { f.description = descEl.value; };
    container.querySelectorAll('[data-qc-deliv]').forEach(el => {
      el.onclick = () => { f.deliverableType = el.getAttribute('data-qc-deliv'); draw(); };
    });
    const linkEl = container.querySelector('#qc-link');
    if (linkEl) linkEl.oninput = () => { f.externalLink = linkEl.value; };
    const fileEl = container.querySelector('#qc-file-input');
    if (fileEl) fileEl.onchange = async () => {
      const file = fileEl.files[0];
      if (!file) return;
      f.fileUploading = true; f.error = null; draw();
      try {
        // Cần product_id trước khi ký URL upload — tạo trước 1 dòng nháp tối thiểu (title tạm) rồi
        // upload file vào đúng dòng đó, tránh phải đổi cả luồng ký URL hiện có (api/san-pham-so-upload-url.js
        // yêu cầu product_id đã tồn tại, xem file đó).
        if (!f._draftProductId) {
          const created = await callApi('api/san-pham-so-product', { action: 'save', title: f.title || 'Sản phẩm mới', price: Number(f.price) || 1000, description: f.description });
          f._draftProductId = created.product.id;
        }
        const { uploadUrl, path } = await callApi('api/san-pham-so-upload-url', { product_id: f._draftProductId, file_name: file.name });
        const putResp = await fetch(uploadUrl, { method: 'PUT', headers: { 'content-type': file.type || 'application/octet-stream' }, body: file });
        if (!putResp.ok) throw new Error('Upload file thất bại — thử lại giúp mình.');
        f.fileStoragePath = path; f.fileName = file.name;
      } catch (e) {
        f.error = e.message || 'Có lỗi xảy ra — thử lại giúp mình.';
      }
      f.fileUploading = false;
      draw();
    };

    container.querySelector('#qc-save-btn').onclick = async () => {
      if (!f.title.trim()) { f.error = 'Vui lòng nhập tên sản phẩm.'; draw(); return; }
      if (!Number(f.price) || Number(f.price) <= 0) { f.error = 'Vui lòng nhập giá lớn hơn 0.'; draw(); return; }
      if (f.deliverableType === 'file' && !f.fileStoragePath) { f.error = 'Vui lòng tải file lên (hoặc chuyển sang "Link có sẵn").'; draw(); return; }
      if (f.deliverableType === 'link' && !f.externalLink.trim()) { f.error = 'Vui lòng nhập link.'; draw(); return; }
      f.saving = true; f.error = null; draw();
      try {
        const payload = {
          action: 'save', id: f._draftProductId || undefined,
          title: f.title.trim(), price: Number(f.price), description: f.description || null,
          file_storage_path: f.deliverableType === 'file' ? f.fileStoragePath : null,
          file_name: f.deliverableType === 'file' ? f.fileName : null,
          external_link: f.deliverableType === 'link' ? f.externalLink.trim() : null,
        };
        const data = await callApi('api/san-pham-so-product', payload);
        state.products.push(data.product);
        state.showQuickCreate = false;
        pickProduct(data.product);
      } catch (e) {
        f.error = e.message || 'Có lỗi xảy ra — thử lại giúp mình.';
      }
      f.saving = false;
      draw();
    };
  }

  function bind() {
    if (state.screen === 'list') {
      bindQuickCreate();
      if (state.showQuickCreate) return;
      container.querySelectorAll('[data-pick-product]').forEach(el => {
        el.onclick = () => {
          const p = state.products.find(x => x.id === el.getAttribute('data-pick-product'));
          if (!p) return;
          pickProduct(p);
          draw();
        };
      });
      return;
    }

    container.querySelector('#lp-back-btn').onclick = () => { state.screen = 'list'; draw(); };

    container.querySelectorAll('[data-lp-pick-template]').forEach(el => {
      el.onclick = () => { state.template = el.getAttribute('data-lp-pick-template'); draw(); };
    });
    // Chặn click "Xem đầy đủ →" lan lên div cha (data-lp-pick-template) — mở tab mới xong không nên
    // tự động đổi luôn mẫu đang chọn, đây chỉ là xem thử.
    container.querySelectorAll('[data-lp-view-full]').forEach(el => {
      el.onclick = (e) => { e.stopPropagation(); };
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

    const bonusEl = container.querySelector('#lp-bonus');
    if (bonusEl) bonusEl.oninput = () => { state.bonusItems = bonusEl.value.split('\n').map(s => s.trim()).filter(Boolean); };

    container.querySelector('#lp-generate-btn').onclick = async () => {
      state.generating = true; state.error = null; draw();
      const stopProgress = animateProgressBar(container.querySelector('#lp-progress-el'), 25);
      try {
        // Lưu mẫu + ảnh case study + bonus TRƯỚC (không mất nếu bước AI lỗi giữa chừng), rồi mới gọi
        // AI viết chữ — AI viết xong tự PATCH landing_page_content luôn
        // (api/san-pham-so-tao-landing-page.js), không cần bấm "Lưu" riêng cho luồng chính (Quỳnh:
        // "90% chỉ là tải thông tin lên thôi").
        await callApi('api/san-pham-so-product', { action: 'update_landing_page', id: state.selected.id, landing_page_content: state.content, landing_page_template: state.template, case_study_images: state.caseStudies, bonus_items: state.bonusItems });
        const data = await callApi('api/san-pham-so-tao-landing-page', { product_id: state.selected.id }, 180000);
        state.content = { ...newContent(), ...data.result };
        state.selected.landing_page_content = state.content;
        state.selected.landing_page_template = state.template;
        state.selected.case_study_images = state.caseStudies;
        state.selected.bonus_items = state.bonusItems;
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
    const vanDeIntroEl = container.querySelector('#lp-van-de-intro');
    if (vanDeIntroEl) vanDeIntroEl.oninput = () => { state.content.van_de_intro = vanDeIntroEl.value; };
    const ketQuaEl = container.querySelector('#lp-ket-qua');
    if (ketQuaEl) ketQuaEl.oninput = () => { state.content.ket_qua_dat_duoc = ketQuaEl.value.split('\n').map(s => s.trim()).filter(Boolean); };
    const loiNhanEl = container.querySelector('#lp-loi-nhan');
    if (loiNhanEl) loiNhanEl.oninput = () => { state.content.loi_nhan_nguoi_ban = loiNhanEl.value; };
    const veNguoiBanEl = container.querySelector('#lp-ve-nguoi-ban');
    if (veNguoiBanEl) veNguoiBanEl.oninput = () => { state.content.ve_nguoi_ban = veNguoiBanEl.value; };
    const phuHopEl = container.querySelector('#lp-phu-hop');
    if (phuHopEl) phuHopEl.oninput = () => { state.content.phu_hop_voi_ai = phuHopEl.value.split('\n').map(s => s.trim()).filter(Boolean); };
    const ctaEl = container.querySelector('#lp-cta');
    if (ctaEl) ctaEl.oninput = () => { state.content.cta_text = ctaEl.value; };

    const vandectAddBtn = container.querySelector('#lp-vandect-add');
    if (vandectAddBtn) vandectAddBtn.onclick = () => { state.content.van_de_chi_tiet = [...(state.content.van_de_chi_tiet || []), { ten: '', mo_ta: '' }]; draw(); };
    container.querySelectorAll('[data-vandect-ten]').forEach(el => {
      el.oninput = () => { state.content.van_de_chi_tiet[Number(el.getAttribute('data-vandect-ten'))].ten = el.value; };
    });
    container.querySelectorAll('[data-vandect-mota]').forEach(el => {
      el.oninput = () => { state.content.van_de_chi_tiet[Number(el.getAttribute('data-vandect-mota'))].mo_ta = el.value; };
    });
    container.querySelectorAll('[data-vandect-remove]').forEach(el => {
      el.onclick = () => { state.content.van_de_chi_tiet.splice(Number(el.getAttribute('data-vandect-remove')), 1); draw(); };
    });

    const ctAddBtn = container.querySelector('#lp-ct-add');
    if (ctAddBtn) ctAddBtn.onclick = () => { state.content.chuong_trinh = [...(state.content.chuong_trinh || []), { ten: '', mo_ta: '' }]; draw(); };
    container.querySelectorAll('[data-ct-ten]').forEach(el => {
      el.oninput = () => { state.content.chuong_trinh[Number(el.getAttribute('data-ct-ten'))].ten = el.value; };
    });
    container.querySelectorAll('[data-ct-mota]').forEach(el => {
      el.oninput = () => { state.content.chuong_trinh[Number(el.getAttribute('data-ct-mota'))].mo_ta = el.value; };
    });
    container.querySelectorAll('[data-ct-remove]').forEach(el => {
      el.onclick = () => { state.content.chuong_trinh.splice(Number(el.getAttribute('data-ct-remove')), 1); draw(); };
    });

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
        await callApi('api/san-pham-so-product', { action: 'update_landing_page', id: state.selected.id, landing_page_content: state.content, landing_page_template: state.template, case_study_images: state.caseStudies, bonus_items: state.bonusItems });
        state.selected.landing_page_content = state.content;
        state.selected.landing_page_template = state.template;
        state.selected.case_study_images = state.caseStudies;
        state.selected.bonus_items = state.bonusItems;
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
