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

function render(container, ideaRow) {
  const idea = ideaRow.result.phuong_an[ideaRow.chosen_index];
  const state = {
    screen: ideaRow.outline_cap_2 ? 'outline2' : 'intro',
    outline2: ideaRow.outline_cap_2 || null,
    sections: ideaRow.sections || {},
    taiLieu: '',
    activeIndex: null,
    workingStep: null, // 'nghien-cuu' | 'viet' | 'review' — hiện text tiến trình khi đang chạy chuỗi
    error: null,
  };

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
        ${state.error ? `<div class="error-box" style="margin-top:10px;">${esc(state.error)}</div>` : ''}
        <div class="btn-row"><button class="btn" id="xdnd-outline2-btn">Xây outline chi tiết → (3 lượt AI)</button></div>
      </div>
    `;
  }

  function outline2Html() {
    const sections = flattenSections(state.outline2);
    return `
      <h2>${esc(idea.ten_san_pham)}</h2>
      <div style="font-size:13.5px;color:var(--ink-soft);margin-bottom:14px;">${esc(idea.doi_tuong)} · ${esc(idea.dinh_dang)}</div>
      ${sections.map((s, i) => {
        const st = state.sections[i];
        const status = st ? st.status : null;
        let btnLabel = '✍️ Bắt đầu viết';
        if (status === 'viet-done') btnLabel = 'Xem bản nháp & review →';
        if (status === 'review-done') btnLabel = '✅ Xem bản hoàn chỉnh';
        return `
          <div class="card">
            <div style="font-size:11.5px;color:var(--ink-soft);text-transform:uppercase;letter-spacing:.04em;margin-bottom:4px;">${esc(s.kind)}</div>
            <h2 style="font-size:16px;margin-bottom:6px;">${esc(s.tieu_de)}</h2>
            <div style="font-size:13.5px;margin-bottom:8px;"><b>Kết quả đạt được:</b> ${esc(s.ket_qua_cu_the)}</div>
            <ul style="margin:0 0 10px;padding-left:20px;font-size:13px;color:var(--ink-soft);">${(s.noi_dung_con || []).map(n => `<li>${esc(n)}</li>`).join('')}</ul>
            <div class="btn-row" style="margin-top:0;"><span class="btn-ghost btn btn-sm" data-open-section="${i}">${btnLabel}</span></div>
          </div>
        `;
      }).join('')}
    `;
  }

  function sectionDraftHtml() {
    const s = state.sections[state.activeIndex];
    return `
      <div class="card">
        <h2 style="font-size:16px;">Bản nháp — ${esc(flattenSections(state.outline2)[state.activeIndex].tieu_de)}</h2>
        <div style="font-size:14.5px;white-space:pre-line;margin-bottom:12px;">${esc(s.viet.noi_dung)}</div>
        <div class="hint-box"><b>Ví dụ:</b> ${esc(s.viet.vi_du)}</div>
        <div class="hint-box"><b>Bài tập:</b> ${esc(s.viet.bai_tap)}</div>
        ${state.error ? `<div class="error-box">${esc(state.error)}</div>` : ''}
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
        <div style="font-size:14.5px;white-space:pre-line;margin-top:10px;">${esc(s.review.ban_da_chinh || s.viet.noi_dung)}</div>
        <div class="btn-row">
          <span class="btn-ghost btn" id="xdnd-back-outline-btn">← Quay lại outline</span>
        </div>
      </div>
    `;
  }

  function bind() {
    if (state.screen === 'intro') {
      const ta = container.querySelector('#xdnd-tailieu');
      ta.oninput = () => { state.taiLieu = ta.value; saveDraft(XDND_INTRO_DRAFT_KEY, { taiLieu: state.taiLieu }); };
      container.querySelector('#xdnd-outline2-btn').onclick = generateOutline2;
    } else if (state.screen === 'outline2') {
      container.querySelectorAll('[data-open-section]').forEach(el => {
        el.onclick = () => openSection(Number(el.getAttribute('data-open-section')));
      });
    } else if (state.screen === 'section-draft') {
      container.querySelector('#xdnd-review-btn').onclick = runReview;
      container.querySelector('#xdnd-back-outline-btn').onclick = () => { state.screen = 'outline2'; draw(); };
    } else if (state.screen === 'section-final') {
      container.querySelector('#xdnd-back-outline-btn').onclick = () => { state.screen = 'outline2'; draw(); };
    }
  }

  async function generateOutline2() {
    state.screen = 'generating-outline2'; state.error = null; draw();
    try {
      const data = await callApi('api/xay-dung-noi-dung', {
        step: 'outline2', idea, outlineCap1: idea.outline_cap_1, taiLieuKinhNghiem: state.taiLieu || null,
      });
      if (!data.result || !Array.isArray(data.result.phan)) throw new Error('AI trả về outline không đúng định dạng — thử lại giúp mình.');
      state.outline2 = data.result;
      await saveIdeaResult({ outline_cap_2: state.outline2 });
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
    const s = flattenSections(state.outline2)[index];
    state.screen = 'section-working'; state.workingStep = 'nghien-cuu'; state.error = null; draw();
    try {
      const nghienCuuData = await callApi('api/xay-dung-noi-dung', { step: 'nghien-cuu', idea, phan: s });
      state.workingStep = 'viet'; draw();
      const vietData = await callApi('api/xay-dung-noi-dung', { step: 'viet', idea, phan: s, nghienCuu: nghienCuuData.result });
      state.sections[index] = { nghien_cuu: nghienCuuData.result, viet: vietData.result, review: null, status: 'viet-done' };
      await saveIdeaResult({ sections: state.sections });
      state.screen = 'section-draft';
    } catch (e) {
      state.error = e.message || 'Có lỗi xảy ra — thử lại giúp mình.';
      state.screen = 'outline2';
    }
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
    }
    draw();
  })();
}

window.renderXayDungNoiDung = render;
})();
