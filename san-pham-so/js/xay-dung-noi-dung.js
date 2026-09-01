// Sản Phẩm Số — "✨ Tạo Sản Phẩm Bằng AI", Giai đoạn 2: Xây Dựng Nội Dung. Nhận thẳng phương án đã
// chọn ở Giai đoạn 1 (window.renderXayDungNoiDung được gọi trực tiếp từ tim-san-pham.js, không qua
// hash route riêng) — mở rộng outline cấp 2, rồi với từng phần: nghiên cứu nền tảng (dùng kiến thức
// sẵn có của Claude, KHÔNG tích hợp web-search — quyết định 2026-08-25) → viết nội dung → review
// theo 5 tiêu chí chất lượng.
(function () {

function flattenSections(outline2) {
  return [
    { ...outline2.mo_dau, kind: 'Mở đầu' },
    ...outline2.phan.map(p => ({ ...p, kind: 'Phần' })),
    { ...outline2.ket, kind: 'Kết' },
  ];
}

const XDND_INTRO_DRAFT_KEY = 'xay-dung-noi-dung-intro';
const GIONG_VAN_OPTIONS = ['Gần gũi, tâm sự', 'Thẳng thắn, chuyên gia', 'Vui vẻ, hài hước', 'Trang trọng, uy tín'];

function render(container, ideaRow) {
  const idea = ideaRow.result.phuong_an[ideaRow.chosen_index];
  // Tài liệu gốc (nhánh A của Giai đoạn 1, xem san-pham-so/js/tim-san-pham.js) + giọng văn — cả 2
  // lồng trong answers (jsonb tự do sẵn có), không cần cột DB mới. materialPath chỉ có với sản phẩm
  // tạo từ tài liệu; giọng văn chốt lại khi outline cấp 2 được tạo, dùng nhất quán cho mọi phần sau.
  const materialPath = (ideaRow.answers && ideaRow.answers.tai_lieu_path) || null;
  const state = {
    screen: ideaRow.outline_cap_2 ? 'outline2' : 'intro',
    outline2: ideaRow.outline_cap_2 || null,
    sections: ideaRow.sections || {},
    taiLieu: '',
    giongVan: (ideaRow.answers && ideaRow.answers.giong_van) || GIONG_VAN_OPTIONS[0],
    activeIndex: null,
    workingStep: null, // 'nghien-cuu' | 'viet' | 'review' — hiện text tiến trình khi đang chạy chuỗi
    ebookResult: ideaRow.ebook_result || null, // {heyzineUrl, thumbnail, pdfStoragePath} — giữ qua reload
    editingOutlineIndex: null, // index (flattenSections) của phần outline cấp 2 đang sửa tay, null = không sửa
    editOutlineForm: null,
    tongDuyetLoading: false, tongDuyetResult: null, // KHÔNG lưu DB — tính lại mỗi lần bấm, xem plan
    error: null,
  };

  // Đối chiếu index phẳng (flattenSections) về đúng vị trí gốc trong state.outline2 (mo_dau/phan[i]/ket)
  // — dùng chung cho đọc và ghi khi sửa tay outline cấp 2 (mục C).
  function outlineSectionRef(i) {
    const total = flattenSections(state.outline2).length;
    if (i === 0) return { get: () => state.outline2.mo_dau, set: (v) => { state.outline2.mo_dau = v; } };
    if (i === total - 1) return { get: () => state.outline2.ket, set: (v) => { state.outline2.ket = v; } };
    return { get: () => state.outline2.phan[i - 1], set: (v) => { state.outline2.phan[i - 1] = v; } };
  }

  function persistIntroDraft() {
    saveDraft(XDND_INTRO_DRAFT_KEY, { taiLieu: state.taiLieu, giongVan: state.giongVan });
  }

  function draw() { container.innerHTML = html(); bind(); }
  // Bọc lỗi render (không chỉ lỗi gọi API) — nếu html() throw vì dữ liệu AI bất thường, màn hình sẽ
  // đứng im ở màn "Đang xử lý…" trước đó vô thời hạn thay vì báo lỗi rõ ràng. Dùng ở cuối mỗi chuỗi
  // gọi AI thay cho draw() trần.
  function safeDraw(fallbackScreen) {
    try { draw(); } catch (e) { state.screen = fallbackScreen; state.error = 'Có lỗi khi hiển thị kết quả — thử lại giúp mình.'; draw(); }
  }

  function html() {
    if (state.screen === 'intro') return introHtml();
    if (state.screen === 'generating-outline2') return `<div class="loading"><div class="spinner"></div><p>Đang xây outline chi tiết…</p></div>`;
    if (state.screen === 'outline2') return outline2Html();
    if (state.screen === 'exporting-ebook') return `<div class="loading"><div class="spinner"></div><p>Đang xuất PDF & tạo sách lật…</p></div>`;
    if (state.screen === 'section-working') return `<div class="loading"><div class="spinner"></div><p>${esc(workingLabel())}</p></div>`;
    if (state.screen === 'section-draft') return sectionDraftHtml();
    if (state.screen === 'section-review-loading') return `<div class="loading"><div class="spinner"></div><p>Đang kiểm tra chất lượng…</p></div>`;
    if (state.screen === 'section-final') return sectionFinalHtml();
    return '';
  }

  function workingLabel() {
    if (state.workingStep === 'nghien-cuu') return 'Đang tổng hợp kiến thức nền…';
    if (state.workingStep === 'viet') return 'Đang viết nội dung…';
    return 'Đang xử lý…';
  }

  function introHtml() {
    return `
      <div class="card">
        <h2 style="font-size:18px;">Trước khi viết: bạn có sẵn tài liệu/kinh nghiệm gì không?</h2>
        <div style="font-size:13.5px;color:var(--ink-soft);margin-bottom:8px;">Không bắt buộc — nếu chưa có, AI sẽ tự tổng hợp kiến thức nền giúp bạn trước khi viết.</div>
        <textarea id="xdnd-tailieu" rows="3" placeholder="VD: có 1 file ghi chú cũ về chủ đề này; từng giúp 1 người bạn xử lý việc tương tự và họ đã cải thiện rõ rệt sau 2 tuần...">${esc(state.taiLieu)}</textarea>
        <label style="margin-top:14px;">Giọng văn</label>
        <div style="font-size:12.5px;color:var(--ink-soft);margin-bottom:6px;">Áp dụng nhất quán cho mọi phần sẽ viết — chọn 1 lần ở đây.</div>
        <div class="chips">${GIONG_VAN_OPTIONS.map(o => `<div class="chip ${state.giongVan === o ? 'selected' : ''}" data-giongvan="${esc(o)}">${esc(o)}</div>`).join('')}</div>
        ${state.error ? `<div class="error-box" style="margin-top:10px;">${esc(state.error)}</div>` : ''}
        <div class="btn-row"><button class="btn" id="xdnd-outline2-btn">Xây outline chi tiết → (3 lượt AI)</button></div>
      </div>
    `;
  }

  function ebookExportCardHtml() {
    if (state.ebookResult) {
      return `
        <div class="card">
          <h2 style="font-size:16px;">📖 Ebook đã xuất</h2>
          ${state.ebookResult.thumbnail ? `<img src="${esc(state.ebookResult.thumbnail)}" style="max-width:140px;border-radius:8px;margin-bottom:10px;display:block;border:1px solid var(--line);">` : ''}
          ${state.error ? `<div class="error-box">${esc(state.error)}</div>` : ''}
          <div class="btn-row" style="margin-top:0;">
            <a class="btn-ghost btn" href="${esc(state.ebookResult.heyzineUrl)}" target="_blank" rel="noopener">Xem thử sách lật →</a>
            <span class="btn" id="xdnd-use-as-product-btn">✅ Dùng làm sản phẩm để bán</span>
            <span class="btn-ghost btn" id="xdnd-export-ebook-btn">Xuất lại</span>
          </div>
        </div>
      `;
    }
    return `
      <div class="card">
        <h2 style="font-size:16px;">📖 Xuất thành Ebook</h2>
        <div style="font-size:13px;color:var(--ink-soft);margin-bottom:10px;">Đóng gói nội dung đã viết thành file PDF, tự động biến thành sách lật đẹp (Heyzine) — phần nào chưa viết xong sẽ hiện dạng outline, vẫn xuất được ngay, không cần viết xong hết.</div>
        ${state.error ? `<div class="error-box">${esc(state.error)}</div>` : ''}
        <button class="btn" id="xdnd-export-ebook-btn">📖 Xuất thành Ebook (PDF + sách lật)</button>
      </div>
    `;
  }

  function tongDuyetCardHtml() {
    const sections = flattenSections(state.outline2);
    const allStarted = sections.every((_, i) => !!state.sections[i]);
    if (!allStarted) {
      return `<div class="hint-box">🔍 Khi đã viết xong bản nháp cho TẤT CẢ các phần, bạn có thể "Duyệt tổng thể" để AI kiểm tra mạch lạc, trùng lặp giữa các phần.</div>`;
    }
    if (state.tongDuyetLoading) {
      return `<div class="card"><h2 style="font-size:16px;">🔍 Đang duyệt tổng thể…</h2></div>`;
    }
    if (!state.tongDuyetResult) {
      return `
        <div class="card">
          <h2 style="font-size:16px;">🔍 Duyệt tổng thể sản phẩm</h2>
          <div style="font-size:13.5px;color:var(--ink-soft);margin-bottom:10px;">AI đọc lại toàn bộ nội dung đã viết, kiểm tra mạch lạc, trùng lặp giữa các phần, và có giữ đúng lời hứa outline không.</div>
          ${state.error ? `<div class="error-box">${esc(state.error)}</div>` : ''}
          <button class="btn" id="xdnd-tong-duyet-btn">🔍 Duyệt tổng thể (2 lượt AI)</button>
        </div>
      `;
    }
    const r = state.tongDuyetResult;
    return `
      <div class="card">
        <h2 style="font-size:16px;">🔍 Kết quả duyệt tổng thể</h2>
        <div style="font-size:13.5px;margin-bottom:10px;">${r.mach_lac ? '✅ Mạch lạc' : '⚠️ Chưa thật mạch lạc'} · ${r.giu_dung_loi_hua_outline ? '✅ Đúng lời hứa outline' : '⚠️ Chưa đúng lời hứa outline'}</div>
        ${r.nhan_xet_tong_quan ? `<div class="hint-box">${esc(r.nhan_xet_tong_quan)}</div>` : ''}
        ${(r.trung_lap || []).length ? `<div class="error-box"><b>Chỗ bị lặp ý:</b><ul style="margin:6px 0 0;padding-left:18px;">${r.trung_lap.map(t => `<li>${esc(t)}</li>`).join('')}</ul></div>` : ''}
        ${(r.cho_thieu_lien_ket || []).length ? `<div class="error-box"><b>Chỗ chuyển phần bị cộc:</b><ul style="margin:6px 0 0;padding-left:18px;">${r.cho_thieu_lien_ket.map(t => `<li>${esc(t)}</li>`).join('')}</ul></div>` : ''}
        ${state.error ? `<div class="error-box">${esc(state.error)}</div>` : ''}
        <div class="btn-row"><span class="btn-ghost btn btn-sm" id="xdnd-tong-duyet-btn">Duyệt lại (2 lượt AI)</span></div>
      </div>
    `;
  }

  function outline2Html() {
    if (state.editingOutlineIndex != null) return outlineEditHtml();
    const sections = flattenSections(state.outline2);
    return `
      <h2>${esc(idea.ten_san_pham)}</h2>
      <div style="font-size:13.5px;color:var(--ink-soft);margin-bottom:14px;">${esc(idea.doi_tuong)} · ${esc(idea.dinh_dang)}</div>
      ${ebookExportCardHtml()}
      ${tongDuyetCardHtml()}
      ${sections.map((s, i) => {
        const st = state.sections[i];
        const status = st ? st.status : null;
        let btnLabel = '✍️ Bắt đầu viết';
        if (status === 'viet-done') btnLabel = 'Xem bản nháp & review →';
        if (status === 'review-done') btnLabel = '✅ Xem bản hoàn chỉnh';
        return `
          <div class="card">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;">
              <div style="font-size:11.5px;color:var(--ink-soft);text-transform:uppercase;letter-spacing:.04em;margin-bottom:4px;">${esc(s.kind)}</div>
              <span class="btn-ghost btn btn-sm" data-edit-outline-section="${i}">✏️ Sửa</span>
            </div>
            <h2 style="font-size:16px;margin-bottom:6px;">${esc(s.tieu_de)}</h2>
            <div style="font-size:13.5px;margin-bottom:8px;"><b>Kết quả đạt được:</b> ${esc(s.ket_qua_cu_the)}</div>
            <ul style="margin:0 0 10px;padding-left:20px;font-size:13px;color:var(--ink-soft);">${(s.noi_dung_con || []).map(n => `<li>${esc(n)}</li>`).join('')}</ul>
            <div class="btn-row" style="margin-top:0;"><span class="btn-ghost btn btn-sm" data-open-section="${i}">${btnLabel}</span></div>
          </div>
        `;
      }).join('')}
    `;
  }

  function outlineEditHtml() {
    const f = state.editOutlineForm;
    return `
      <div class="card">
        <h2 style="font-size:18px;">Sửa phần outline</h2>
        <label>Tiêu đề</label>
        <input id="xdnd-edit-tieude" type="text" value="${esc(f.tieu_de)}">
        <label>Kết quả cụ thể</label>
        <input id="xdnd-edit-ketqua" type="text" value="${esc(f.ket_qua_cu_the)}">
        <label>Nội dung con (mỗi dòng 1 ý)</label>
        <textarea id="xdnd-edit-noidungcon" rows="5">${esc((f.noi_dung_con || []).join('\n'))}</textarea>
        ${state.error ? `<div class="error-box" style="margin-top:10px;">${esc(state.error)}</div>` : ''}
        <div class="btn-row">
          <button class="btn" id="xdnd-edit-outline-save-btn">Lưu</button>
          <span class="btn-ghost btn" id="xdnd-edit-outline-cancel-btn">Huỷ</span>
        </div>
      </div>
    `;
  }

  function sectionDraftHtml() {
    const s = state.sections[state.activeIndex];
    return `
      <div class="card">
        <h2 style="font-size:16px;">Bản nháp — ${esc(flattenSections(state.outline2)[state.activeIndex].tieu_de)}</h2>
        <div style="font-size:12px;color:var(--ink-soft);margin-bottom:6px;">Sửa trực tiếp nếu muốn bổ sung quan điểm/kinh nghiệm cá nhân — bấm "Lưu chỉnh sửa" để giữ lại.</div>
        <textarea id="xdnd-draft-textarea" rows="14" style="font-size:14.5px;">${esc(s.viet.noi_dung)}</textarea>
        <div class="hint-box"><b>Ví dụ:</b> ${esc(s.viet.vi_du)}</div>
        <div class="hint-box"><b>Bài tập:</b> ${esc(s.viet.bai_tap)}</div>
        ${(s.viet.tom_tat_3_y && s.viet.tom_tat_3_y.length) ? `<div class="hint-box"><b>3 điều cần nhớ:</b><ul style="margin:6px 0 0;padding-left:18px;">${s.viet.tom_tat_3_y.map(t => `<li>${esc(t)}</li>`).join('')}</ul></div>` : ''}
        ${state.error ? `<div class="error-box">${esc(state.error)}</div>` : ''}
        <div class="btn-row">
          <span class="btn-ghost btn btn-sm" id="xdnd-save-edit-btn">💾 Lưu chỉnh sửa</span>
          <span class="btn-ghost btn btn-sm" id="xdnd-rewrite-btn">🔄 Viết lại bằng AI</span>
        </div>
        <div class="btn-row">
          <button class="btn" id="xdnd-review-btn">🔍 Kiểm tra chất lượng (1 lượt AI)</button>
          <span class="btn-ghost btn" id="xdnd-back-outline-btn">← Quay lại outline</span>
        </div>
      </div>
    `;
  }

  function sectionFinalHtml() {
    const s = state.sections[state.activeIndex];
    const c = s.review.checklist;
    const items = [
      ['co_vi_du_that', 'Có ví dụ thật'], ['co_bai_tap_lam_ngay', 'Bài tập làm được ngay'],
      ['giong_van_tu_nhien', 'Giọng văn tự nhiên'], ['khong_chung_chung', 'Không chung chung'],
      ['biet_buoc_tiep_theo', 'Biết bước tiếp theo'],
    ];
    return `
      <div class="card">
        <h2 style="font-size:16px;">Kết quả kiểm tra chất lượng</h2>
        <ul style="margin:0 0 12px;padding-left:20px;font-size:13.5px;">
          ${items.map(([k, label]) => `<li>${c[k] ? '✅' : '⚠️'} ${label}</li>`).join('')}
        </ul>
        ${s.review.gop_y ? `<div class="hint-box"><b>Góp ý:</b> ${esc(s.review.gop_y)}</div>` : ''}
        <div style="font-size:12px;color:var(--ink-soft);margin-top:10px;margin-bottom:6px;">Sửa trực tiếp nếu muốn bổ sung quan điểm/kinh nghiệm cá nhân — bấm "Lưu chỉnh sửa" để giữ lại.</div>
        <textarea id="xdnd-final-textarea" rows="14" style="font-size:14.5px;">${esc(s.review.ban_da_chinh || s.viet.noi_dung)}</textarea>
        ${(s.viet.tom_tat_3_y && s.viet.tom_tat_3_y.length) ? `<div class="hint-box"><b>3 điều cần nhớ:</b><ul style="margin:6px 0 0;padding-left:18px;">${s.viet.tom_tat_3_y.map(t => `<li>${esc(t)}</li>`).join('')}</ul></div>` : ''}
        ${state.error ? `<div class="error-box">${esc(state.error)}</div>` : ''}
        <div class="btn-row">
          <span class="btn-ghost btn btn-sm" id="xdnd-save-edit-btn">💾 Lưu chỉnh sửa</span>
          <span class="btn-ghost btn btn-sm" id="xdnd-rewrite-btn">🔄 Viết lại bằng AI</span>
        </div>
        <div class="btn-row">
          <span class="btn-ghost btn" id="xdnd-back-outline-btn">← Quay lại outline</span>
        </div>
      </div>
    `;
  }

  function bind() {
    if (state.screen === 'intro') {
      const ta = container.querySelector('#xdnd-tailieu');
      ta.oninput = () => { state.taiLieu = ta.value; persistIntroDraft(); };
      container.querySelectorAll('[data-giongvan]').forEach(el => {
        el.onclick = () => { state.giongVan = el.getAttribute('data-giongvan'); persistIntroDraft(); draw(); };
      });
      container.querySelector('#xdnd-outline2-btn').onclick = generateOutline2;
    } else if (state.screen === 'outline2') {
      if (state.editingOutlineIndex != null) { bindOutlineEdit(); return; }
      container.querySelectorAll('[data-open-section]').forEach(el => {
        el.onclick = () => openSection(Number(el.getAttribute('data-open-section')));
      });
      container.querySelectorAll('[data-edit-outline-section]').forEach(el => {
        el.onclick = () => {
          const i = Number(el.getAttribute('data-edit-outline-section'));
          state.editingOutlineIndex = i;
          state.editOutlineForm = JSON.parse(JSON.stringify(outlineSectionRef(i).get()));
          state.error = null;
          draw();
        };
      });
      const exportBtn = container.querySelector('#xdnd-export-ebook-btn');
      if (exportBtn) exportBtn.onclick = exportEbook;
      const useBtn = container.querySelector('#xdnd-use-as-product-btn');
      if (useBtn) useBtn.onclick = useEbookAsProduct;
      const tongDuyetBtn = container.querySelector('#xdnd-tong-duyet-btn');
      if (tongDuyetBtn) tongDuyetBtn.onclick = runTongDuyet;
    } else if (state.screen === 'section-draft') {
      container.querySelector('#xdnd-review-btn').onclick = runReview;
      container.querySelector('#xdnd-back-outline-btn').onclick = () => { state.screen = 'outline2'; draw(); };
      container.querySelector('#xdnd-save-edit-btn').onclick = () => saveManualEdit('#xdnd-draft-textarea', (s, val) => { s.viet.noi_dung = val; });
      container.querySelector('#xdnd-rewrite-btn').onclick = () => runNghienCuuAndViet(state.activeIndex);
    } else if (state.screen === 'section-final') {
      container.querySelector('#xdnd-back-outline-btn').onclick = () => { state.screen = 'outline2'; draw(); };
      container.querySelector('#xdnd-save-edit-btn').onclick = () => saveManualEdit('#xdnd-final-textarea', (s, val) => { s.review.ban_da_chinh = val; });
      container.querySelector('#xdnd-rewrite-btn').onclick = () => runNghienCuuAndViet(state.activeIndex);
    }
  }

  function bindOutlineEdit() {
    container.querySelector('#xdnd-edit-tieude').oninput = (e) => { state.editOutlineForm.tieu_de = e.target.value; };
    container.querySelector('#xdnd-edit-ketqua').oninput = (e) => { state.editOutlineForm.ket_qua_cu_the = e.target.value; };
    container.querySelector('#xdnd-edit-noidungcon').oninput = (e) => { state.editOutlineForm.noi_dung_con = e.target.value.split('\n').map(x => x.trim()).filter(Boolean); };
    container.querySelector('#xdnd-edit-outline-cancel-btn').onclick = () => { state.editingOutlineIndex = null; state.editOutlineForm = null; state.error = null; draw(); };
    container.querySelector('#xdnd-edit-outline-save-btn').onclick = async () => {
      if (!state.editOutlineForm.tieu_de.trim()) { state.error = 'Vui lòng nhập tiêu đề.'; draw(); return; }
      if (!state.editOutlineForm.noi_dung_con.length) { state.error = 'Cần ít nhất 1 nội dung con.'; draw(); return; }
      outlineSectionRef(state.editingOutlineIndex).set(state.editOutlineForm);
      await saveIdeaResult({ outline_cap_2: state.outline2 });
      state.editingOutlineIndex = null; state.editOutlineForm = null; state.error = null;
      draw();
    };
  }

  // Ghi nội dung sửa tay (bấm "Lưu chỉnh sửa") KHÔNG gọi AI — thuần lưu textarea vào đúng chỗ trong
  // state.sections (viet.noi_dung ở bản nháp, review.ban_da_chinh ở bản hoàn chỉnh) rồi lưu DB.
  async function saveManualEdit(selector, applyFn) {
    const ta = container.querySelector(selector);
    const s = state.sections[state.activeIndex];
    applyFn(s, ta.value);
    await saveIdeaResult({ sections: state.sections });
    state.error = null;
    draw();
  }

  async function exportEbook() {
    state.screen = 'exporting-ebook'; state.error = null; draw();
    try {
      const data = await callApi('api/san-pham-so-xuat-ebook', { idea, outline2: state.outline2, sections: state.sections });
      state.ebookResult = { heyzineUrl: data.heyzineUrl, thumbnail: data.thumbnail, pdfStoragePath: data.pdfStoragePath };
      await saveIdeaResult({ ebook_result: state.ebookResult });
      state.screen = 'outline2';
    } catch (e) {
      state.error = e.message || 'Có lỗi xảy ra — thử lại giúp mình.';
      state.screen = 'outline2';
    }
    safeDraw('outline2');
  }

  // Hand-off sang màn "Sản phẩm của tôi" qua ĐÚNG module_drafts key mà màn đó tự đọc khi mở
  // (xem san-pham-so/js/danh-sach-san-pham.js DRAFT_KEY='san-pham-so') — tái dùng cơ chế draft có
  // sẵn thay vì dựng đường truyền dữ liệu mới giữa 2 màn.
  async function useEbookAsProduct() {
    await saveDraft('san-pham-so', {
      id: null,
      title: idea.ten_san_pham || '',
      description: idea.ly_do || '',
      price: '',
      cover_image_url: null,
      file_storage_path: null,
      file_name: null,
      external_link: state.ebookResult.heyzineUrl,
      published: false,
    });
    location.hash = 'san-pham';
  }

  async function generateOutline2() {
    state.screen = 'generating-outline2'; state.error = null; draw();
    try {
      const data = await callApi('api/xay-dung-noi-dung', {
        step: 'outline2', idea, outlineCap1: idea.outline_cap_1, taiLieuKinhNghiem: state.taiLieu || null,
        materialPath,
      });
      if (!data.result || !Array.isArray(data.result.phan)) throw new Error('AI trả về outline không đúng định dạng — thử lại giúp mình.');
      state.outline2 = data.result;
      // Chốt giọng văn vĩnh viễn vào answers (merge, không ghi đè các key khác đã có) — dùng nhất
      // quán cho mọi lần viết/viết lại phần sau, kể cả sau khi rời trang rồi quay lại.
      await saveIdeaResult({ outline_cap_2: state.outline2, answers: { ...(ideaRow.answers || {}), giong_van: state.giongVan } });
      await clearDraft(XDND_INTRO_DRAFT_KEY);
      state.screen = 'outline2';
    } catch (e) {
      state.error = e.message || 'Có lỗi xảy ra — thử lại giúp mình.';
      state.screen = 'intro';
    }
    safeDraw('intro');
  }

  async function openSection(index) {
    state.activeIndex = index;
    const existing = state.sections[index];
    if (existing && existing.status === 'viet-done') { state.screen = 'section-draft'; draw(); return; }
    if (existing && existing.status === 'review-done') { state.screen = 'section-final'; draw(); return; }
    await runNghienCuuAndViet(index);
  }

  async function runNghienCuuAndViet(index) {
    const flat = flattenSections(state.outline2);
    const s = flat[index];
    const phanTruoc = index > 0 ? flat[index - 1] : null;
    const phanSau = index < flat.length - 1 ? flat[index + 1] : null;
    state.screen = 'section-working'; state.workingStep = 'nghien-cuu'; state.error = null; draw();
    try {
      const nghienCuuData = await callApi('api/xay-dung-noi-dung', { step: 'nghien-cuu', idea, phan: s });
      state.workingStep = 'viet'; draw();
      const vietData = await callApi('api/xay-dung-noi-dung', {
        step: 'viet', idea, phan: s, nghienCuu: nghienCuuData.result, giongVan: state.giongVan, materialPath,
        phanTruoc: phanTruoc ? { tieu_de: phanTruoc.tieu_de, ket_qua_cu_the: phanTruoc.ket_qua_cu_the } : null,
        phanSau: phanSau ? { tieu_de: phanSau.tieu_de } : null,
      });
      state.sections[index] = { nghien_cuu: nghienCuuData.result, viet: vietData.result, review: null, status: 'viet-done' };
      await saveIdeaResult({ sections: state.sections });
      state.screen = 'section-draft';
    } catch (e) {
      state.error = e.message || 'Có lỗi xảy ra — thử lại giúp mình.';
      state.screen = 'outline2';
    }
    safeDraw('outline2');
  }

  // Duyệt tổng thể — chỉ CHẨN ĐOÁN (mạch lạc/trùng lặp/đúng lời hứa outline), không tự sửa nội dung.
  // Người dùng chủ động sửa qua ô "Lưu chỉnh sửa" đã có ở từng phần. KHÔNG lưu DB — tính lại mỗi lần
  // bấm (giống "💡 Xem gợi ý" ở wizard cũ), vì đây là 1 bản kiểm tra dùng trước khi xuất bản, không
  // phải nội dung sản phẩm.
  async function runTongDuyet() {
    state.tongDuyetLoading = true; state.error = null; draw();
    try {
      const flat = flattenSections(state.outline2);
      const noiDungTheoPhan = {};
      flat.forEach((_, i) => {
        const s = state.sections[i];
        noiDungTheoPhan[i] = s ? (s.review && s.review.ban_da_chinh ? s.review.ban_da_chinh : s.viet.noi_dung) : null;
      });
      const data = await callApi('api/xay-dung-noi-dung', { step: 'tong-duyet', idea, outlineCap2: state.outline2, noiDungTheoPhan });
      state.tongDuyetResult = data.result;
    } catch (e) {
      state.error = e.message || 'Có lỗi xảy ra — thử lại giúp mình.';
    }
    state.tongDuyetLoading = false;
    safeDraw('outline2');
  }

  async function runReview() {
    const index = state.activeIndex;
    const s = state.sections[index];
    state.screen = 'section-review-loading'; state.error = null; draw();
    try {
      const data = await callApi('api/xay-dung-noi-dung', { step: 'review', noiDungDaViet: s.viet.noi_dung });
      state.sections[index] = { ...s, review: data.result, status: 'review-done' };
      await saveIdeaResult({ sections: state.sections });
      state.screen = 'section-final';
    } catch (e) {
      state.error = e.message || 'Có lỗi xảy ra — thử lại giúp mình.';
      state.screen = 'section-draft';
    }
    safeDraw('section-draft');
  }

  // Khôi phục nội dung textarea "tài liệu/kinh nghiệm" nếu người dùng gõ dở rồi rời trang trước khi
  // bấm "Xây outline chi tiết" — không để mất chữ đã gõ khi quay lại (auto-save mọi màn đang làm dở).
  (async () => {
    if (state.screen === 'intro') {
      const draft = await loadDraft(XDND_INTRO_DRAFT_KEY);
      if (draft && draft.taiLieu) state.taiLieu = draft.taiLieu;
      if (draft && draft.giongVan) state.giongVan = draft.giongVan;
    }
    draw();
  })();
}

window.renderXayDungNoiDung = render;
})();
