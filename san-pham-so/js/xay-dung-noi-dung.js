// Sản Phẩm Số — "✨ Tạo Sản Phẩm Bằng AI", Giai đoạn 2: Xây Dựng Nội Dung. Nhận thẳng phương án đã
// chọn ở Giai đoạn 1 (window.renderXayDungNoiDung được gọi trực tiếp từ tim-san-pham.js, không qua
// hash route riêng) — mở rộng outline cấp 2, rồi với từng phần: nghiên cứu nền tảng (mặc định dùng
// kiến thức sẵn có của Claude, nhưng có thể bật tùy chọn "Tìm kiến thức từ web" — 2026-09-01, thay
// quy trình thủ công cũ của Quỳnh tự tìm nguồn + NotebookLM, xem api/xay-dung-noi-dung.js) → viết
// nội dung → review theo 5 tiêu chí chất lượng.
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

// 5 bài nhạc nền gợi ý cho Heyzine Background Audio (2026-09-04, Quỳnh: "cho list 5 bài đi cho ngta
// chọn" — sau khi đã đổi từ Bensound (cần ghi nguồn) sang Pixabay (không cần)). Mỗi bài đã tự vào
// trang Pixabay xác nhận THẬT có nhãn "Free for use under the Pixabay Content License" (miễn phí,
// không bắt buộc ghi nguồn) trước khi đưa vào đây, không đoán.
const PIXABAY_MUSIC_LIST_HTML = `
  <ul style="margin:6px 0 0;padding-left:18px;">
    <li><a href="https://pixabay.com/music/modern-classical-piano-waltz-elegant-and-graceful-instrumental-music-285601/" target="_blank" rel="noopener">Piano Waltz – Elegant and Graceful</a> — piano nhẹ nhàng, ấm áp</li>
    <li><a href="https://pixabay.com/music/modern-classical-calm-classical-piano-melody-293695/" target="_blank" rel="noopener">Calm Classical Piano Melody</a> — piano cổ điển, êm dịu</li>
    <li><a href="https://pixabay.com/music/acoustic-group-warm-acoustic-guitar-232912/" target="_blank" rel="noopener">Warm Acoustic Guitar</a> — guitar mộc, ấm áp</li>
    <li><a href="https://pixabay.com/music/beautiful-plays-ambient-piano-and-strings-10711/" target="_blank" rel="noopener">Ambient Piano and Strings</a> — piano + dây, sâu lắng</li>
    <li><a href="https://pixabay.com/music/modern-classical-bookshop-afternoon-cozy-reading-573881/" target="_blank" rel="noopener">Bookshop Afternoon Cozy Reading</a> — đúng không khí đọc sách, ấm cúng</li>
  </ul>
`;

function render(container, ideaRow) {
  const idea = ideaRow.result.phuong_an[ideaRow.chosen_index];
  // Tài liệu gốc (nhánh A của Giai đoạn 1, xem san-pham-so/js/tim-san-pham.js, HOẶC tải lên ngay ở
  // màn intro này nếu chưa có) + giọng văn — lồng trong answers (jsonb tự do sẵn có), không cần cột
  // DB mới. materialPath chỉ có với sản phẩm tạo từ tài liệu ở Giai đoạn 1; giọng văn/taiLieu chốt
  // lại khi outline cấp 2 được tạo (xem generateOutline2()), dùng nhất quán cho mọi phần viết sau —
  // kể cả sau khi rời trang quay lại (trước 2026-09-01, taiLieu bị xoá draft mà KHÔNG lưu lại đâu cả,
  // nên không bao giờ tới được bước viết nội dung thật — bug đã sửa).
  const materialPath = (ideaRow.answers && ideaRow.answers.tai_lieu_path) || null;
  // Bìa & màu ebook (2026-09-04) — tính TRƯỚC object state vì themeUseCustomColor cần so khớp với
  // giá trị ebookTheme ĐÃ ÁP DỤNG FALLBACK (không phải ideaRow.ebook_theme thô, thường null với sản
  // phẩm mới — so trực tiếp với null luôn ra "không khớp preset nào" nên mặc định hiện lầm "Tự chọn
  // màu" thay vì đúng preset đầu tiên, bug thật phát hiện khi tự chụp ảnh màn hình demo soát lại).
  const initialEbookTheme = ideaRow.ebook_theme || { coverMode: 'solid', moodPreset: EBOOK_THEME_PRESETS[0].key, accent: EBOOK_THEME_PRESETS[0].accent, bg: EBOOK_THEME_PRESETS[0].bg, coverImageDataUrl: null };
  const initialIsCustomColor = !EBOOK_THEME_PRESETS.some(p => p.accent === initialEbookTheme.accent && p.bg === initialEbookTheme.bg);

  const state = {
    screen: ideaRow.outline_cap_2 ? 'outline2' : 'intro',
    outline2: ideaRow.outline_cap_2 || null,
    sections: ideaRow.sections || {},
    taiLieu: (ideaRow.answers && ideaRow.answers.tai_lieu_kinh_nghiem) || '',
    giongVan: (ideaRow.answers && ideaRow.answers.giong_van) || GIONG_VAN_OPTIONS[0],
    newMaterialPath: null, materialUploading: false, materialUploadError: null, materialFileName: null,
    activeIndex: null,
    workingStep: null, // 'nghien-cuu' | 'viet' | 'review' — hiện text tiến trình khi đang chạy chuỗi
    // {heyzineUrl, thumbnail, pdfStoragePath} cho mọi dinh_dang khác, HOẶC {lessons:{[index]:{link,
    // storagePath}}} khi dinh_dang='mini_course' (xem miniCourseExportCardHtml) — giữ qua reload.
    ebookResult: ideaRow.ebook_result || null,
    exportingLessonIndex: null, // index (flattenSections) đang xuất PDF bài học dở, null = không có
    editingOutlineIndex: null, // index (flattenSections) của phần outline cấp 2 đang sửa tay, null = không sửa
    editOutlineForm: null,
    tongDuyetLoading: false, tongDuyetResult: null, // KHÔNG lưu DB — tính lại mỗi lần bấm, xem plan
    // coverMode: 'ai' (gpt-image-1 theo moodPreset) | 'upload' (ảnh tự tải lên) | 'solid' (chỉ màu).
    ebookTheme: initialEbookTheme,
    themeUseCustomColor: initialIsCustomColor,
    coverGenerating: false, coverUploading: false, themeError: null,
    illustrationUploading: false, // ảnh minh hoạ TỪNG PHẦN (khác ảnh bìa) — xem illustrationBlockHtml
    previewLoading: false, previewPdfBase64: null, previewTimer: null,
    // Kết nối Heyzine riêng NGAY TẠI ĐÂY, BẮT BUỘC (2026-09-04) — cùng field/RPC với chon-loai.js's
    // flipbookHtml và tai-khoan.js, không trỏ người dùng sang mục "Tài khoản" nữa.
    heyzineApiKey: '', heyzineClientId: '', heyzineSaving: false, heyzineError: null,
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
    if (state.screen === 'generating-outline2') return `<div class="loading"><div id="xdnd-progress-el">${progressBarHtml(0)}</div><p>Đang xây outline chi tiết…</p></div>`;
    if (state.screen === 'outline2') return outline2Html();
    if (state.screen === 'exporting-ebook') return `<div class="loading"><div id="xdnd-progress-el">${progressBarHtml(0)}</div><p>Đang xuất PDF & tạo sách lật…</p></div>`;
    if (state.screen === 'section-start-choice') return sectionStartChoiceHtml();
    if (state.screen === 'section-working') return `<div class="loading"><div id="xdnd-progress-el">${progressBarHtml(0)}</div><p>${esc(workingLabel())}</p></div>`;
    if (state.screen === 'section-draft') return sectionDraftHtml();
    if (state.screen === 'section-review-loading') return `<div class="loading"><div id="xdnd-progress-el">${progressBarHtml(0)}</div><p>Đang kiểm tra chất lượng…</p></div>`;
    if (state.screen === 'section-final') return sectionFinalHtml();
    return '';
  }

  function workingLabel() {
    if (state.workingStep === 'nghien-cuu-web') return 'Đang tìm kiến thức từ web…';
    if (state.workingStep === 'nghien-cuu') return 'Đang tổng hợp kiến thức nền…';
    if (state.workingStep === 'viet') return 'Đang viết nội dung…';
    return 'Đang xử lý…';
  }

  function introHtml() {
    return `
      <div class="card">
        <h2 style="font-size:18px;">Trước khi viết: bạn có sẵn tài liệu gì không?</h2>
        <div style="font-size:13.5px;color:var(--ink-soft);margin-bottom:8px;">Không bắt buộc — nếu chưa có, AI sẽ tự tổng hợp kiến thức nền giúp bạn trước khi viết.</div>
        ${taiLieuUploadHtml()}
        <label style="margin-top:14px;">Ghi chú thêm (tuỳ chọn)</label>
        <textarea id="xdnd-tailieu" rows="3" placeholder="VD: điều bạn muốn AI đặc biệt lưu ý khi viết...">${esc(state.taiLieu)}</textarea>
        <label style="margin-top:14px;">Giọng văn</label>
        <div style="font-size:12.5px;color:var(--ink-soft);margin-bottom:6px;">Áp dụng nhất quán cho mọi phần sẽ viết — chọn 1 lần ở đây.</div>
        <div class="chips">${GIONG_VAN_OPTIONS.map(o => `<div class="chip ${state.giongVan === o ? 'selected' : ''}" data-giongvan="${esc(o)}">${esc(o)}</div>`).join('')}</div>
        ${state.error ? `<div class="error-box" style="margin-top:10px;">${esc(state.error)}</div>` : ''}
        <div class="btn-row"><button class="btn" id="xdnd-outline2-btn" ${state.materialUploading ? 'disabled' : ''}>Xây outline chi tiết → (3 lượt AI)</button></div>
      </div>
    `;
  }

  // materialPath (const, đọc từ ideaRow.answers) chỉ có khi sản phẩm được tạo từ nhánh A của Giai
  // đoạn 1 (đã tải PDF lên lúc tìm ý tưởng). Nếu chưa có (sản phẩm đi từ wizard 11 câu hỏi), cho tải
  // lên NGAY tại đây — dùng lại đúng endpoint/luồng ký URL đã có ở san-pham-so/js/tim-san-pham.js.
  function taiLieuUploadHtml() {
    if (materialPath) {
      return `<div class="hint-box">📎 Đã có tài liệu tải lên từ bước tìm ý tưởng — AI sẽ dùng file đó khi viết nội dung.</div>`;
    }
    return `
      <label>Tài liệu (PDF)</label>
      <input id="xdnd-material-file" type="file" accept="application/pdf">
      <div style="font-size:13px;color:var(--ink-soft);margin-top:4px;">${state.materialUploading ? 'Đang tải lên…' : (state.materialFileName ? `📎 ${esc(state.materialFileName)} — đã tải lên ✓` : 'Chưa chọn file.')}</div>
      ${state.materialUploadError ? `<div class="error-box" style="margin-top:6px;">${esc(state.materialUploadError)}</div>` : ''}
    `;
  }

  // Path thật sự dùng cho mọi lệnh gọi AI — ưu tiên materialPath có sẵn từ nhánh A, nếu không thì
  // dùng file vừa tải lên ở màn này (state.newMaterialPath, vì materialPath là const nên không gán
  // lại được).
  function getMaterialPath() {
    return materialPath || state.newMaterialPath;
  }

  // Bìa & màu (2026-09-04) — chọn 1 lần, áp dụng cho cả bìa lẫn nội dung khi xuất PDF (ebook thường
  // lẫn từng bài mini_course, xem api/_lib/pdf-ebook.js). Đặt TRƯỚC card xuất — người bán cần thấy
  // trước khi bấm xuất, không phải sau.
  function themeCardHtml() {
    const th = state.ebookTheme;
    const isCustom = state.themeUseCustomColor;
    return `
      <div class="card">
        <h2 style="font-size:16px;">🎨 Bìa & màu sắc</h2>
        <div style="font-size:13px;color:var(--ink-soft);margin-bottom:10px;">Chọn 1 phong cách màu — áp dụng cho cả bìa lẫn toàn bộ nội dung bên trong khi xuất PDF.</div>
        <div class="chips">
          ${EBOOK_THEME_PRESETS.map(p => `
            <div class="chip ${!isCustom && th.accent === p.accent && th.bg === p.bg ? 'selected' : ''}" data-theme-preset="${p.key}" style="display:inline-flex;align-items:center;gap:6px;">
              <span style="width:13px;height:13px;border-radius:50%;background:${p.accent};display:inline-block;border:1px solid rgba(0,0,0,.15);"></span>${esc(p.label)}
            </div>
          `).join('')}
          <div class="chip ${isCustom ? 'selected' : ''}" data-theme-preset="_custom">🎨 Tự chọn màu</div>
        </div>
        ${isCustom ? `
          <div style="display:flex;gap:18px;margin-top:10px;align-items:center;">
            <label style="margin:0;display:flex;align-items:center;gap:6px;">Màu nhấn <input id="xdnd-theme-accent" type="color" value="${esc(th.accent)}" style="width:40px;height:26px;padding:0;border:none;"></label>
            <label style="margin:0;display:flex;align-items:center;gap:6px;">Màu nền <input id="xdnd-theme-bg" type="color" value="${esc(th.bg)}" style="width:40px;height:26px;padding:0;border:none;"></label>
          </div>
        ` : ''}
        <label style="margin-top:14px;">Bìa sách</label>
        <div class="chips">
          <div class="chip ${th.coverMode === 'ai' ? 'selected' : ''}" data-cover-mode="ai">✨ AI vẽ bìa</div>
          <div class="chip ${th.coverMode === 'upload' ? 'selected' : ''}" data-cover-mode="upload">📷 Ảnh riêng</div>
          <div class="chip ${th.coverMode === 'solid' ? 'selected' : ''}" data-cover-mode="solid">🎨 Chỉ màu (không ảnh)</div>
        </div>
        ${coverModeExtraHtml()}
        ${state.themeError ? `<div class="error-box" style="margin-top:10px;">${esc(state.themeError)}</div>` : ''}
        <div style="margin-top:14px;">
          <div style="font-size:12.5px;color:var(--ink-soft);margin-bottom:6px;">Xem trước thật (bìa + 1 trang mẫu):</div>
          ${previewFrameHtml()}
        </div>
      </div>
    `;
  }

  function coverModeExtraHtml() {
    const th = state.ebookTheme;
    if (th.coverMode === 'ai') {
      return `
        <div style="margin-top:10px;">
          ${th.coverImageDataUrl ? `<img src="${esc(th.coverImageDataUrl)}" style="max-width:140px;border-radius:8px;display:block;margin-bottom:8px;border:1px solid var(--line);">` : ''}
          <span class="btn-ghost btn btn-sm" id="xdnd-gen-cover-btn" ${state.coverGenerating ? 'style="opacity:.5;pointer-events:none;"' : ''}>${state.coverGenerating ? 'Đang tạo…' : (th.coverImageDataUrl ? '🔄 Tạo lại (3 lượt AI)' : '✨ Tạo bìa bằng AI (3 lượt AI)')}</span>
        </div>
      `;
    }
    if (th.coverMode === 'upload') {
      return `
        <div style="margin-top:10px;">
          ${th.coverImageDataUrl ? `<img src="${esc(th.coverImageDataUrl)}" style="max-width:140px;border-radius:8px;display:block;margin-bottom:8px;border:1px solid var(--line);">` : ''}
          <input id="xdnd-cover-upload" type="file" accept="image/*">
          <div style="font-size:12px;color:var(--ink-soft);margin-top:4px;">${state.coverUploading ? 'Đang xử lý ảnh…' : ''}</div>
        </div>
      `;
    }
    return '';
  }

  function previewFrameHtml() {
    if (state.previewLoading) return `<div style="font-size:12.5px;color:var(--ink-soft);">Đang dựng bản xem trước…</div>`;
    if (!state.previewPdfBase64) return `<span class="btn-ghost btn btn-sm" id="xdnd-preview-btn">🔍 Xem trước</span>`;
    return `<iframe id="xdnd-preview-frame" src="about:blank" style="width:100%;max-width:280px;height:396px;border:1px solid var(--line);border-radius:8px;display:block;"></iframe>`;
  }

  async function saveTheme() {
    await saveIdeaResult({ ebook_theme: state.ebookTheme }, ideaRow.id);
  }

  function scheduleThemeUpdate() {
    if (state.previewTimer) clearTimeout(state.previewTimer);
    state.previewTimer = setTimeout(async () => {
      await saveTheme();
      fetchPreview();
    }, 500);
  }

  async function fetchPreview() {
    state.previewLoading = true; draw();
    try {
      const data = await callApi('api/san-pham-so-xem-truoc-ebook', {
        ten_san_pham: idea.ten_san_pham, doi_tuong: idea.doi_tuong,
        theme: { accent: state.ebookTheme.accent, bg: state.ebookTheme.bg },
        coverImageDataUrl: state.ebookTheme.coverMode !== 'solid' ? state.ebookTheme.coverImageDataUrl : null,
        coverHasBakedText: state.ebookTheme.coverMode === 'ai',
      }, 30000);
      state.previewPdfBase64 = data.pdfBase64;
    } catch (e) {
      // Preview lỗi không chặn luồng chính (xuất ebook thật vẫn dùng được) — im lặng bỏ qua, không
      // hiện error to giữa màn hình vì đây chỉ là tiện ích xem trước.
    }
    state.previewLoading = false;
    draw();
  }

  async function generateAiCover() {
    state.coverGenerating = true; state.themeError = null; draw();
    try {
      const data = await callApi('api/san-pham-so-tao-bia-ebook', {
        ten_san_pham: idea.ten_san_pham, doi_tuong: idea.doi_tuong, moodPreset: state.ebookTheme.moodPreset,
      }, 180000);
      state.ebookTheme.coverImageDataUrl = data.coverImageDataUrl;
      await saveTheme();
      fetchPreview();
    } catch (e) {
      state.themeError = e.message || 'Có lỗi xảy ra — thử lại giúp mình.';
    }
    state.coverGenerating = false;
    draw();
  }

  function bindThemeCard() {
    container.querySelectorAll('[data-theme-preset]').forEach(el => {
      el.onclick = () => {
        const key = el.getAttribute('data-theme-preset');
        if (key === '_custom') { state.themeUseCustomColor = true; draw(); return; }
        const preset = EBOOK_THEME_PRESETS.find(p => p.key === key);
        state.themeUseCustomColor = false;
        state.ebookTheme.moodPreset = key;
        state.ebookTheme.accent = preset.accent;
        state.ebookTheme.bg = preset.bg;
        draw();
        saveTheme();
        fetchPreview();
      };
    });
    const accentInput = container.querySelector('#xdnd-theme-accent');
    if (accentInput) accentInput.oninput = () => { state.ebookTheme.accent = accentInput.value; scheduleThemeUpdate(); };
    const bgInput = container.querySelector('#xdnd-theme-bg');
    if (bgInput) bgInput.oninput = () => { state.ebookTheme.bg = bgInput.value; scheduleThemeUpdate(); };
    container.querySelectorAll('[data-cover-mode]').forEach(el => {
      el.onclick = () => {
        state.ebookTheme.coverMode = el.getAttribute('data-cover-mode');
        draw();
        saveTheme();
        fetchPreview();
      };
    });
    const genCoverBtn = container.querySelector('#xdnd-gen-cover-btn');
    if (genCoverBtn) genCoverBtn.onclick = generateAiCover;
    const coverUploadEl = container.querySelector('#xdnd-cover-upload');
    if (coverUploadEl) coverUploadEl.onchange = async () => {
      const file = coverUploadEl.files[0];
      if (!file) return;
      state.coverUploading = true; draw();
      try {
        state.ebookTheme.coverImageDataUrl = await compressImageToDataUrl(file, 900, 0.8);
        await saveTheme();
        fetchPreview();
      } catch (e) {
        state.themeError = e.message || 'Không đọc được ảnh.';
      }
      state.coverUploading = false;
      draw();
    };
    const previewBtn = container.querySelector('#xdnd-preview-btn');
    if (previewBtn) previewBtn.onclick = fetchPreview;
    // Iframe xem trước dùng blob URL (không phải data: URI thẳng) — ổn định hơn cho PDF khá nặng,
    // xem preview-iframe ghi chú ở previewFrameHtml(). Chạy lại mỗi lần draw() vì draw() luôn tạo lại
    // phần tử iframe mới (innerHTML ghi đè toàn bộ), không có iframe cũ nào để tái dùng src.
    const previewFrame = container.querySelector('#xdnd-preview-frame');
    if (previewFrame && state.previewPdfBase64) {
      const byteChars = atob(state.previewPdfBase64);
      const byteNumbers = new Array(byteChars.length);
      for (let i = 0; i < byteChars.length; i++) byteNumbers[i] = byteChars.charCodeAt(i);
      const blob = new Blob([new Uint8Array(byteNumbers)], { type: 'application/pdf' });
      previewFrame.src = URL.createObjectURL(blob);
    }
  }

  function isHeyzineConnected() {
    return !!(currentProfile && currentProfile.sps_heyzine_api_key && currentProfile.sps_heyzine_client_id);
  }

  // Hướng dẫn thêm nhạc nền/tiếng lật trang SAU KHI đã xuất — làm trong Heyzine, app không có nút
  // riêng (Heyzine không cho set qua API, chỉ set tay trong trình chỉnh sửa của họ). Cả 2 mục
  // "Background Audio" và "Sound on page turn" (trong "Page Effect") đã XÁC NHẬN THẬT qua ảnh chụp
  // màn hình trình chỉnh sửa Heyzine thật Quỳnh gửi 2026-09-04 — không phải đoán. Có cả tiếng Anh gốc
  // lẫn nghĩa tiếng Việt cho từng nút/nhãn — phòng khi trình duyệt/Heyzine của người dùng đang hiển
  // thị ngôn ngữ khác (Quỳnh: "nhỡ ngta dùng trình duyệt tiếng Việt"). Định dạng <ol><li> thật + tô
  // màu accent cho từ khoá quan trọng, theo đúng yêu cầu "làm nổi các từ quan trọng".
  function heyzineSoundGuideHtml() {
    return `
      <div class="hint-box" style="margin-top:10px;">🎵 Muốn thêm nhạc nền/tiếng lật trang cho cuốn này?
      <ol style="margin:6px 0 0;padding-left:20px;font-size:12.5px;line-height:1.7;">
        <li>Vào <a href="https://heyzine.com" target="_blank" rel="noopener">heyzine.com</a>, bấm <b style="color:var(--accent);">"Dashboard"</b> → mở đúng cuốn sách vừa xuất → bấm <b style="color:var(--accent);">"Edit"</b> (Chỉnh sửa).</li>
        <li>Thêm nhạc nền: cột <b>STYLE</b> bên trái → bấm <b style="color:var(--accent);">"Background Audio"</b> (Âm thanh nền). 5 bài gợi ý có sẵn (Pixabay, MIỄN PHÍ, KHÔNG cần mua, KHÔNG cần ghi nguồn) — bấm 1 bài, bấm nút <b style="color:var(--accent);">"Download"</b> màu xanh trên trang đó để tải MP3 về máy, rồi tải chính file đó lên "Background Audio":
          ${PIXABAY_MUSIC_LIST_HTML}
          Chọn trang bắt đầu/kết thúc phát, chỉnh âm lượng/lặp lại.
        </li>
        <li>Bật tiếng lật trang: cũng cột STYLE → bấm <b style="color:var(--accent);">"Page Effect"</b> (Hiệu ứng lật trang) → bật công tắc <b style="color:var(--accent);">"Sound on page turn"</b> (Bật âm thanh khi lật trang).</li>
      </ol>
      </div>
    `;
  }

  // Widget kết nối Heyzine riêng NHÚNG THẲNG vào màn xuất ebook — không trỏ người dùng sang mục
  // "Tài khoản" nữa (2026-09-04, Quỳnh: "workflow là sẽ kết nối heyzine tại đó luôn, ko phải đến mục
  // nào hết"). BẮT BUỘC với mọi người (Quỳnh: "cho tất cả mng đều bắt buộc kết nối heyzine đi") — tài
  // khoản chung free của Quỳnh chỉ có hạn 5 flipbook TOÀN APP + mỗi người bán cần tự chỉnh nhạc/tiếng
  // lật trang được, chỉ chủ tài khoản mới làm được. Không có nút "Để sau" nữa vì bắt buộc, form luôn
  // mở khi chưa kết nối. Là 1 hàm (không phải const tính 1 lần) vì render() chỉ chạy 1 lần cho cả
  // phiên màn hình — nếu tính sẵn 1 lần, kết nối xong ngay tại đây sẽ không cập nhật được dòng "✓ đã
  // kết nối".
  function heyzineInlineHtml() {
    // Hướng dẫn thêm nhạc nền/tiếng lật trang KHÔNG hiện ở đây — chỉ hiện SAU KHI đã xuất xong (trong
    // khối "📖 Ebook đã xuất" bên dưới), theo đúng yêu cầu Quỳnh 2026-09-04: "phần hướng dẫn thêm nhạc
    // nền phải để sau khi đã tạo sách lật xong rồi mới hướng dẫn".
    if (isHeyzineConnected()) {
      return `<div class="hint-box" style="margin-top:10px;">✓ Đang dùng tài khoản Heyzine riêng của bạn.</div>`;
    }
    return `
      <div class="card" style="margin-top:10px;">
        <h2 style="font-size:14px;margin-bottom:6px;">🔗 Bắt buộc kết nối Heyzine riêng trước khi xuất</h2>
        <div class="hint-box" style="margin-bottom:10px;">
          <ol style="margin:0;padding-left:20px;font-size:12.5px;line-height:1.7;">
            <li>Mở <a href="https://heyzine.com/developers" target="_blank" rel="noopener">heyzine.com/developers</a> — hoặc vào heyzine.com, bấm icon <b style="color:var(--accent);">☰</b> (menu) góc trên bên trái → chọn <b style="color:var(--accent);">API</b>.</li>
            <li>Chưa có tài khoản: bấm <b style="color:var(--accent);">"register"</b> (Đăng ký). Đã có: bấm <b style="color:var(--accent);">"Login"</b> (Đăng nhập) — miễn phí.</li>
            <li>Đăng nhập xong, trang hiện 2 ô <b style="color:var(--accent);">"This is your Client Id:"</b> (Client ID của bạn) và <b style="color:var(--accent);">"This is your API key:"</b> (API Key của bạn) — không cần bấm icon con mắt để xem, bấm thẳng nút <b style="color:var(--accent);">"Copy"</b> (Sao chép) từng ô là được.</li>
            <li>Dán vào 2 ô dưới rồi bấm "Lưu kết nối", quay lại đây xuất ebook luôn không cần mở tab khác.</li>
          </ol>
        </div>
        <label style="font-size:12.5px;">Client ID</label>
        <input id="xdnd-heyzine-client" type="text" value="${esc(state.heyzineClientId)}" placeholder="Dán Client ID từ Heyzine">
        <label style="margin-top:8px;font-size:12.5px;">API Key</label>
        <input id="xdnd-heyzine-key" type="password" value="${esc(state.heyzineApiKey)}" placeholder="Dán API Key từ Heyzine">
        ${state.heyzineError ? `<div class="error-box" style="margin-top:8px;">${esc(state.heyzineError)}</div>` : ''}
        <div class="btn-row">
          <button class="btn btn-sm" id="xdnd-heyzine-save" ${state.heyzineSaving ? 'disabled' : ''}>${state.heyzineSaving ? 'Đang lưu…' : 'Lưu kết nối'}</button>
        </div>
      </div>
    `;
  }

  // Dùng chung để biết TẤT CẢ các phần đã ở bản FINAL chưa (status 'review-done') — cả để khoá thẻ
  // xuất ebook (ebookExportCardHtml) lẫn để báo mừng ngay tại màn "section-final" của phần vừa hoàn
  // tất cuối cùng (sectionFinalHtml, 2026-09-04, Quỳnh hỏi "viết xong các phần rồi thì sao, có nút gì
  // tiếp tục k" — trước đó viết xong phần CUỐI vẫn chỉ thấy nút "← Quay lại outline" y hệt mọi phần
  // khác, không có gì báo là ĐÃ XONG HẾT/được xuất rồi, phải tự đoán quay lại outline mới thấy).
  function allSectionsFinal() {
    const sections = flattenSections(state.outline2);
    return sections.every((_, i) => state.sections[i] && state.sections[i].status === 'review-done');
  }

  // Chỉ cho xuất khi TẤT CẢ các phần đã ở bản FINAL — status 'review-done', tức đã qua "Kiểm tra
  // chất lượng", KHÔNG chỉ là bản nháp 'viet-done' (2026-09-04, Quỳnh: ban đầu "sao chưa gì đã auto
  // cho xuất thành ebook vậy... làm nội dung full mới xuất được", rồi làm rõ thêm khi bị hỏi lại:
  // "ko phải là viết bản nháp, mà là bản full chốt. sau khi làm thì ra bản pdf, xong từ pdf mới ra
  // bản ebook... pdf là kết quả final" — PDF chỉ nên đóng gói nội dung đã thật sự chốt xong, không
  // phải nháp còn có thể sai/thiếu). CHỈ áp cho lần xuất ĐẦU TIÊN; đã xuất rồi (state.ebookResult
  // tồn tại) thì vẫn cho xem lại/xuất lại bình thường dù sau đó có thêm phần mới chưa final, không
  // chặn ngược. Riêng mini_course (miniCourseExportCardHtml() bên dưới) KHÔNG áp quy tắc này — theo
  // yêu cầu của Quỳnh ("trừ minicourse thui"), giữ nguyên cho xuất từng bài ngay khi có bản nháp,
  // đúng lý do ban đầu của tính năng đó: người bán không bị kẹt chờ xong CẢ khoá mới bán được.
  function ebookExportCardHtml() {
    const connected = isHeyzineConnected();
    if (!state.ebookResult) {
      const allFinal = allSectionsFinal();
      if (!allFinal) {
        return `<div class="hint-box">📖 Cần TẤT CẢ các phần bên dưới đạt bản final (đã qua "Kiểm tra chất lượng", không chỉ bản nháp) thì mới xuất được thành ebook — PDF/sách lật phải là kết quả cuối cùng, không phải bản còn dở dang.</div>`;
      }
    }
    if (state.ebookResult) {
      return `
        <div class="card">
          <h2 style="font-size:16px;">📖 Ebook đã xuất</h2>
          ${state.ebookResult.thumbnail ? `<img src="${esc(state.ebookResult.thumbnail)}" style="max-width:140px;border-radius:8px;margin-bottom:10px;display:block;border:1px solid var(--line);">` : ''}
          ${state.error ? `<div class="error-box">${esc(state.error)}</div>` : ''}
          <div class="btn-row" style="margin-top:0;">
            <a class="btn-ghost btn" href="${esc(state.ebookResult.heyzineUrl)}" target="_blank" rel="noopener">Xem thử sách lật →</a>
            <span class="btn" id="xdnd-use-as-product-btn">✅ Dùng làm sản phẩm để bán</span>
            <span class="btn-ghost btn" id="xdnd-export-ebook-btn" ${connected ? '' : 'disabled'}>Xuất lại</span>
          </div>
          ${heyzineInlineHtml()}
          ${connected ? heyzineSoundGuideHtml() : ''}
        </div>
      `;
    }
    return `
      <div class="card">
        <h2 style="font-size:16px;">📖 Xuất thành Ebook</h2>
        <div style="font-size:13px;color:var(--ink-soft);margin-bottom:10px;">Đóng gói toàn bộ nội dung đã viết thành file PDF, tự động biến thành sách lật đẹp (Heyzine).</div>
        ${state.error ? `<div class="error-box">${esc(state.error)}</div>` : ''}
        ${heyzineInlineHtml()}
        ${!connected ? `<div style="font-size:12px;color:var(--ink-soft);margin:8px 0;">⬆️ Kết nối Heyzine ở trên trước đã, nút bên dưới mới bấm được.</div>` : ''}
        <button class="btn" id="xdnd-export-ebook-btn" ${connected ? '' : 'disabled'} style="margin-top:${connected ? '0' : '4px'};">📖 Xuất thành Ebook (PDF + sách lật)</button>
      </div>
    `;
  }

  // Mini_course: "nhiều bài học, mỗi bài link riêng" (đúng định nghĩa của loại này ở chon-loai.js)
  // — khác ebookExportCardHtml() ở chỗ xuất RIÊNG từng phần trong outline thành 1 file PDF/1 link,
  // không gộp chung 1 file. KHÔNG dùng Heyzine (xem api/san-pham-so-xuat-bai-hoc.js) — chỉ ký link
  // Storage hạn rất dài, không tốn quota flipbook (Heyzine free chỉ có 5 flipbook cho CẢ app).
  function miniCourseExportCardHtml() {
    const sections = flattenSections(state.outline2);
    const lessons = (state.ebookResult && state.ebookResult.lessons) || {};
    const exporting = state.exportingLessonIndex;
    const doneCount = sections.filter((_, i) => lessons[i]).length;
    return `
      <div class="card">
        <h2 style="font-size:16px;">🎓 Xuất từng bài học (PDF)</h2>
        <div style="font-size:13px;color:var(--ink-soft);margin-bottom:10px;">Khoá học nhiều bài — mỗi phần trong outline xuất thành 1 file PDF riêng, có link tải riêng cho từng bài. Bài nào viết xong bản nháp mới xuất được bài đó (tránh xuất nhầm outline thô).</div>
        ${state.error ? `<div class="error-box">${esc(state.error)}</div>` : ''}
        ${sections.map((s, i) => {
          const l = lessons[i];
          const isExporting = exporting === i;
          const written = !!state.sections[i];
          return `
            <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--line);">
              <div style="font-size:13.5px;">${esc(s.kind)} · ${esc(s.tieu_de)}</div>
              <div class="btn-row" style="margin:0;">
                ${l ? `<a class="btn-ghost btn btn-sm" href="${esc(l.link)}" target="_blank" rel="noopener">Xem file</a>` : ''}
                ${isExporting
                  ? `<span class="btn-ghost btn btn-sm" style="opacity:.6;">Đang xuất…</span>`
                  : written
                    ? `<span class="btn-ghost btn btn-sm" ${exporting != null ? 'style="opacity:.4;pointer-events:none;"' : ''} data-export-lesson="${i}">${l ? 'Xuất lại' : 'Xuất PDF'}</span>`
                    : `<span style="font-size:12px;color:var(--ink-soft);">Viết bài này trước đã</span>`}
              </div>
            </div>
          `;
        }).join('')}
        ${doneCount ? `<div class="btn-row" style="margin-top:14px;"><span class="btn" id="xdnd-use-lessons-as-product-btn">✅ Dùng làm sản phẩm để bán (${doneCount}/${sections.length} bài đã xuất)</span></div>` : ''}
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
      return `<div class="card"><h2 style="font-size:16px;margin-bottom:10px;">🔍 Đang duyệt tổng thể…</h2><button class="btn" id="xdnd-tong-duyet-btn" disabled>Đang duyệt tổng thể 0%</button></div>`;
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

  // Thứ tự các thẻ: danh sách các phần TRƯỚC, "Duyệt tổng thể"/"Bìa & màu"/thẻ xuất SAU CÙNG
  // (2026-09-04, Quỳnh: "cái đoạn chọn banner phông nền màu chữ để xuất thành ebook sách lật phải để
  // đến cuối cùng chứ" — trước đây 3 thẻ này nằm NGAY ĐẦU trang, trước cả khi viết chữ nào, dù chức
  // năng của chúng chỉ thật sự dùng được sau khi đã viết xong hết — cùng tinh thần với gate "phải
  // viết xong hết mới xuất" đã thêm trước đó, giờ áp luôn cho THỨ TỰ hiển thị, không chỉ trạng thái
  // khoá/mở của riêng thẻ xuất).
  function outline2Html() {
    if (state.editingOutlineIndex != null) return outlineEditHtml();
    const sections = flattenSections(state.outline2);
    return `
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;">
        <h2>${esc(idea.ten_san_pham)}</h2>
        <span class="btn-ghost btn btn-sm" id="xdnd-luu-tam-btn" style="white-space:nowrap;">💾 Lưu tạm, bắt đầu sản phẩm khác</span>
      </div>
      <div style="font-size:13.5px;color:var(--ink-soft);margin-bottom:14px;">${esc(idea.doi_tuong)} · ${esc(idea.dinh_dang)}</div>
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
            <div class="btn-row" style="margin-top:0;align-items:center;">
              <span class="btn-ghost btn btn-sm" data-open-section="${i}">${btnLabel}</span>
              ${st && st.used_web_search ? `<span style="font-size:12px;color:var(--ink-soft);">🔍 Có dùng nguồn web</span>` : ''}
            </div>
          </div>
        `;
      }).join('')}
      ${tongDuyetCardHtml()}
      ${themeCardHtml()}
      ${idea.dinh_dang === 'mini_course' ? miniCourseExportCardHtml() : ebookExportCardHtml()}
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

  function sectionStartChoiceHtml() {
    const s = flattenSections(state.outline2)[state.activeIndex];
    return `
      <div class="card">
        <h2 style="font-size:16px;">Bắt đầu viết — ${esc(s.tieu_de)}</h2>
        <div style="font-size:13.5px;color:var(--ink-soft);margin-bottom:10px;">AI cần tổng hợp kiến thức nền trước khi viết phần này. Chọn nguồn kiến thức:</div>
        <div class="btn-row">
          <button class="btn" id="xdnd-start-normal-btn">✍️ Viết luôn (kiến thức sẵn có của AI)</button>
          <span class="btn-ghost btn" id="xdnd-start-websearch-btn">🔍 Tìm thêm từ web trước (phát sinh phí tìm kiếm)</span>
        </div>
        <div class="btn-row"><span class="btn-ghost btn btn-sm" id="xdnd-back-outline-btn">← Quay lại outline</span></div>
      </div>
    `;
  }

  // Nhắc mạnh hơn khi sản phẩm KHÔNG có tài liệu gốc nào — theo đúng nguyên tắc "bổ sung góc nhìn cá
  // nhân là bắt buộc" của quy trình cũ. Nhẹ nhàng hơn khi đã có tài liệu, vì nội dung khi đó đã ít
  // nhiều bám sát thực tế của người dùng rồi.
  // Ảnh minh hoạ (2026-09-04) — KHÁC hẳn bìa ebook (không gọi AI vẽ ảnh trực tiếp, tốn phí thật nhân
  // theo số phần). Thay vào đó dùng lại đúng mẫu đã có sẵn ở nhan-hieu/js/sua-kenh.js (mục ảnh bìa
  // kênh): AI viết SẴN 1 prompt trong chính lệnh gọi "viết nội dung" (không tốn lượt AI thêm, chỉ là
  // 1 field nữa trong cùng 1 lần gọi) — người bán tự copy, dán vào ChatGPT, tải ảnh kết quả lên lại.
  function illustrationBlockHtml(s) {
    const prompt = s.viet && s.viet.goi_y_anh_minh_hoa;
    if (!prompt) return '';
    const imageUrl = s.viet.anh_minh_hoa_url;
    return `
      <div class="hint-box">
        <b>🖼️ Ảnh minh hoạ gợi ý</b>
        <div style="font-family:'IBM Plex Mono',monospace;font-size:12px;background:var(--panel);padding:10px;border-radius:6px;margin:8px 0;white-space:pre-wrap;border:1px solid var(--line);">${esc(prompt)}</div>
        <div class="btn-row" style="margin:0 0 8px;">
          <span class="btn-ghost btn btn-sm" data-copy-illustration-prompt="${esc(prompt)}">Copy prompt</span>
          <a class="btn-ghost btn btn-sm" href="https://chatgpt.com" target="_blank" rel="noopener">Mở ChatGPT →</a>
        </div>
        <div style="font-size:11.5px;color:var(--ink-soft);margin-bottom:8px;">Dán prompt vào ChatGPT để tạo ảnh, rồi tải ảnh kết quả lên đây — ảnh sẽ tự chèn vào đúng phần này khi xuất PDF.</div>
        ${imageUrl ? `<img src="${esc(imageUrl)}" style="max-width:160px;border-radius:8px;display:block;margin-bottom:8px;border:1px solid var(--line);">` : ''}
        <input id="xdnd-illustration-upload" type="file" accept="image/*">
        <div style="font-size:12px;color:var(--ink-soft);margin-top:4px;">${state.illustrationUploading ? 'Đang xử lý ảnh…' : ''}</div>
      </div>
    `;
  }

  function bindIllustrationBlock() {
    container.querySelectorAll('[data-copy-illustration-prompt]').forEach(el => {
      el.onclick = async () => {
        try {
          await navigator.clipboard.writeText(el.getAttribute('data-copy-illustration-prompt'));
          const old = el.textContent;
          el.textContent = 'Đã copy ✓';
          setTimeout(() => { el.textContent = old; }, 1500);
        } catch (e) {}
      };
    });
    const uploadEl = container.querySelector('#xdnd-illustration-upload');
    if (uploadEl) uploadEl.onchange = async () => {
      const file = uploadEl.files[0];
      if (!file) return;
      const s = state.sections[state.activeIndex];
      state.illustrationUploading = true; draw();
      try {
        s.viet.anh_minh_hoa_url = await compressImageToDataUrl(file, 900, 0.8);
        await saveIdeaResult({ sections: state.sections }, ideaRow.id);
      } catch (e) {
        state.error = e.message || 'Không đọc được ảnh.';
      }
      state.illustrationUploading = false;
      draw();
    };
  }

  function personalPerspectiveHintHtml() {
    if (getMaterialPath()) {
      return `<div style="font-size:12px;color:var(--ink-soft);margin-bottom:6px;">Sửa trực tiếp nếu muốn bổ sung quan điểm/kinh nghiệm cá nhân — bấm "Lưu chỉnh sửa" để giữ lại.</div>`;
    }
    return `<div class="hint-box" style="margin-bottom:6px;">✍️ Bổ sung góc nhìn cá nhân là BẮT BUỘC — nội dung này được AI viết hoàn toàn từ kiến thức chung, dù chỉ 1-2 câu từ trải nghiệm thật của bạn cũng tạo khác biệt lớn hơn nhiều. Sửa trực tiếp vào ô bên dưới rồi bấm "Lưu chỉnh sửa".</div>`;
  }

  function sectionDraftHtml() {
    const s = state.sections[state.activeIndex];
    return `
      <div class="card">
        <h2 style="font-size:16px;">Bản nháp — ${esc(flattenSections(state.outline2)[state.activeIndex].tieu_de)}</h2>
        ${personalPerspectiveHintHtml()}
        <textarea id="xdnd-draft-textarea" rows="14" style="font-size:14.5px;">${esc(s.viet.noi_dung)}</textarea>
        <div class="hint-box"><b>Ví dụ:</b> ${esc(s.viet.vi_du)}</div>
        <div class="hint-box"><b>Bài tập:</b> ${esc(s.viet.bai_tap)}</div>
        ${(s.viet.tom_tat_3_y && s.viet.tom_tat_3_y.length) ? `<div class="hint-box"><b>3 điều cần nhớ:</b><ul style="margin:6px 0 0;padding-left:18px;">${s.viet.tom_tat_3_y.map(t => `<li>${esc(t)}</li>`).join('')}</ul></div>` : ''}
        ${(s.nghien_cuu && s.nghien_cuu.nguon_tham_khao && s.nghien_cuu.nguon_tham_khao.length) ? `<div class="hint-box"><b>🔍 Nguồn tham khảo:</b><ul style="margin:6px 0 0;padding-left:18px;">${s.nghien_cuu.nguon_tham_khao.map(t => `<li>${esc(t)}</li>`).join('')}</ul></div>` : ''}
        ${(s.nghien_cuu && s.nghien_cuu.khoang_trong_thi_truong && s.nghien_cuu.khoang_trong_thi_truong.length) ? `<div class="hint-box"><b>📊 Khoảng trống thị trường:</b><ul style="margin:6px 0 0;padding-left:18px;">${s.nghien_cuu.khoang_trong_thi_truong.map(t => `<li>${esc(t)}</li>`).join('')}</ul></div>` : ''}
        ${illustrationBlockHtml(s)}
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
    // Báo mừng ngay tại đây nếu đây là phần CUỐI vừa hoàn tất — không bắt phải tự quay lại outline
    // mới biết đã xong hết/xuất được rồi (xem allSectionsFinal() ở trên). Ebook: nhắc thẳng đi xuất;
    // mini_course không áp gate all-final (xem miniCourseExportCardHtml) nên không cần nhắc kiểu này.
    const justFinishedAll = idea.dinh_dang !== 'mini_course' && allSectionsFinal();
    return `
      <div class="card">
        ${justFinishedAll ? `<div class="hint-box">🎉 Đã viết xong bản final cho TẤT CẢ các phần! Quay lại outline để xuất thành Ebook.</div>` : ''}
        <h2 style="font-size:16px;">Kết quả kiểm tra chất lượng</h2>
        <ul style="margin:0 0 12px;padding-left:20px;font-size:13.5px;">
          ${items.map(([k, label]) => `<li>${c[k] ? '✅' : '⚠️'} ${label}</li>`).join('')}
        </ul>
        ${s.review.gop_y ? `<div class="hint-box"><b>Góp ý:</b> ${esc(s.review.gop_y)}</div>` : ''}
        <div style="margin-top:10px;">${personalPerspectiveHintHtml()}</div>
        <textarea id="xdnd-final-textarea" rows="14" style="font-size:14.5px;">${esc(s.review.ban_da_chinh || s.viet.noi_dung)}</textarea>
        ${(s.viet.tom_tat_3_y && s.viet.tom_tat_3_y.length) ? `<div class="hint-box"><b>3 điều cần nhớ:</b><ul style="margin:6px 0 0;padding-left:18px;">${s.viet.tom_tat_3_y.map(t => `<li>${esc(t)}</li>`).join('')}</ul></div>` : ''}
        ${(s.nghien_cuu && s.nghien_cuu.nguon_tham_khao && s.nghien_cuu.nguon_tham_khao.length) ? `<div class="hint-box"><b>🔍 Nguồn tham khảo:</b><ul style="margin:6px 0 0;padding-left:18px;">${s.nghien_cuu.nguon_tham_khao.map(t => `<li>${esc(t)}</li>`).join('')}</ul></div>` : ''}
        ${(s.nghien_cuu && s.nghien_cuu.khoang_trong_thi_truong && s.nghien_cuu.khoang_trong_thi_truong.length) ? `<div class="hint-box"><b>📊 Khoảng trống thị trường:</b><ul style="margin:6px 0 0;padding-left:18px;">${s.nghien_cuu.khoang_trong_thi_truong.map(t => `<li>${esc(t)}</li>`).join('')}</ul></div>` : ''}
        ${illustrationBlockHtml(s)}
        ${state.error ? `<div class="error-box">${esc(state.error)}</div>` : ''}
        <div class="btn-row">
          <span class="btn-ghost btn btn-sm" id="xdnd-save-edit-btn">💾 Lưu chỉnh sửa</span>
          <span class="btn-ghost btn btn-sm" id="xdnd-rewrite-btn">🔄 Viết lại bằng AI</span>
        </div>
        <div class="btn-row">
          <span class="${justFinishedAll ? 'btn' : 'btn-ghost btn'}" id="xdnd-back-outline-btn">${justFinishedAll ? '📖 Quay lại outline để xuất Ebook →' : '← Quay lại outline'}</span>
        </div>
      </div>
    `;
  }

  function bind() {
    if (state.screen === 'intro') {
      const ta = container.querySelector('#xdnd-tailieu');
      ta.oninput = () => { state.taiLieu = ta.value; persistIntroDraft(); };
      const fileEl = container.querySelector('#xdnd-material-file');
      if (fileEl) fileEl.onchange = async () => {
        const file = fileEl.files[0];
        if (!file) return;
        if (file.type !== 'application/pdf') { state.materialUploadError = 'Chỉ nhận file PDF.'; draw(); return; }
        state.materialUploading = true; state.materialUploadError = null; draw();
        try {
          const { uploadUrl, path } = await callApi('api/san-pham-so-upload-material-url', { file_name: file.name });
          const putResp = await fetch(uploadUrl, { method: 'PUT', headers: { 'content-type': 'application/pdf' }, body: file });
          if (!putResp.ok) throw new Error('Upload file thất bại — thử lại giúp mình.');
          state.newMaterialPath = path; state.materialFileName = file.name;
        } catch (e) {
          state.materialUploadError = e.message;
        }
        state.materialUploading = false;
        draw();
      };
      container.querySelectorAll('[data-giongvan]').forEach(el => {
        el.onclick = () => { state.giongVan = el.getAttribute('data-giongvan'); persistIntroDraft(); draw(); };
      });
      container.querySelector('#xdnd-outline2-btn').onclick = generateOutline2;
    } else if (state.screen === 'outline2') {
      if (state.editingOutlineIndex != null) { bindOutlineEdit(); return; }
      const luuTamBtn = container.querySelector('#xdnd-luu-tam-btn');
      // Sản phẩm này đã tự lưu liên tục rồi (mỗi lần viết/sửa đều gọi saveIdeaResult) — bấm nút này
      // chỉ đơn giản là QUAY LẠI màn chọn ý tưởng, không xoá/động gì tới dữ liệu. Ở đó giờ luôn hiện
      // danh sách "sản phẩm đang dở" (kể cả chỉ có 1 cái) kèm nút "+ Bắt đầu sản phẩm mới".
      if (luuTamBtn) luuTamBtn.onclick = () => {
        // location.hash='tao-ai' không tự re-render nếu đang SẴN ở đúng hash đó (Giai đoạn 2 không có
        // hash riêng, chỉ "mượn" hash của màn gọi nó) — gọi thẳng renderShell (global, app-shell.js
        // không bọc IIFE) để chắc chắn quay lại được dù đang ở #tao-ai hay #chon-loai.
        if (location.hash === '#tao-ai') { renderShell(currentProfile); return; }
        location.hash = 'tao-ai';
      };
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
      container.querySelectorAll('[data-export-lesson]').forEach(el => {
        el.onclick = () => exportLesson(Number(el.getAttribute('data-export-lesson')));
      });
      const useLessonsBtn = container.querySelector('#xdnd-use-lessons-as-product-btn');
      if (useLessonsBtn) useLessonsBtn.onclick = useLessonsAsProduct;
      const tongDuyetBtn = container.querySelector('#xdnd-tong-duyet-btn');
      if (tongDuyetBtn) tongDuyetBtn.onclick = runTongDuyet;
      bindThemeCard();
      const heyzineKeyEl = container.querySelector('#xdnd-heyzine-key');
      if (heyzineKeyEl) heyzineKeyEl.oninput = () => { state.heyzineApiKey = heyzineKeyEl.value; };
      const heyzineClientEl = container.querySelector('#xdnd-heyzine-client');
      if (heyzineClientEl) heyzineClientEl.oninput = () => { state.heyzineClientId = heyzineClientEl.value; };
      const heyzineSaveBtn = container.querySelector('#xdnd-heyzine-save');
      if (heyzineSaveBtn) heyzineSaveBtn.onclick = async () => {
        state.heyzineError = null;
        if (!state.heyzineApiKey.trim() || !state.heyzineClientId.trim()) { state.heyzineError = 'Cần nhập đủ cả API Key và Client ID.'; draw(); return; }
        state.heyzineSaving = true; draw();
        const { error } = await supabaseClient.rpc('update_sps_heyzine_credentials', { p_api_key: state.heyzineApiKey.trim(), p_client_id: state.heyzineClientId.trim() });
        state.heyzineSaving = false;
        if (error) { state.heyzineError = error.message; }
        else if (currentProfile) { currentProfile.sps_heyzine_api_key = state.heyzineApiKey.trim(); currentProfile.sps_heyzine_client_id = state.heyzineClientId.trim(); }
        draw();
      };
    } else if (state.screen === 'section-start-choice') {
      container.querySelector('#xdnd-start-normal-btn').onclick = () => runNghienCuuAndViet(state.activeIndex, false);
      container.querySelector('#xdnd-start-websearch-btn').onclick = () => runNghienCuuAndViet(state.activeIndex, true);
      container.querySelector('#xdnd-back-outline-btn').onclick = () => { state.screen = 'outline2'; draw(); };
    } else if (state.screen === 'section-draft') {
      container.querySelector('#xdnd-review-btn').onclick = runReview;
      container.querySelector('#xdnd-back-outline-btn').onclick = () => { state.screen = 'outline2'; draw(); };
      container.querySelector('#xdnd-save-edit-btn').onclick = () => saveManualEdit('#xdnd-draft-textarea', (s, val) => { s.viet.noi_dung = val; });
      // "🔄 Viết lại bằng AI" trước đây gọi thẳng lại runNghienCuuAndViet() với ĐÚNG used_web_search cũ
      // — không cho đổi ý (VD muốn bật "Tìm thêm từ web" cho lần viết lại nếu bản đầu quá hời hợt).
      // Quay lại đúng màn chọn nguồn kiến thức (2026-09-04, Quỳnh: "phải có phần quay lại mục dùng ai
      // để tìm kiến thức để viết lại chứ, nút viết lại bằng ai thì ko quay lại mục đó được").
      container.querySelector('#xdnd-rewrite-btn').onclick = () => { state.screen = 'section-start-choice'; draw(); };
      bindIllustrationBlock();
    } else if (state.screen === 'section-final') {
      container.querySelector('#xdnd-back-outline-btn').onclick = () => { state.screen = 'outline2'; draw(); };
      container.querySelector('#xdnd-save-edit-btn').onclick = () => saveManualEdit('#xdnd-final-textarea', (s, val) => { s.review.ban_da_chinh = val; });
      container.querySelector('#xdnd-rewrite-btn').onclick = () => { state.screen = 'section-start-choice'; draw(); };
      bindIllustrationBlock();
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
      await saveIdeaResult({ outline_cap_2: state.outline2 }, ideaRow.id);
      state.editingOutlineIndex = null; state.editOutlineForm = null; state.error = null;
      draw();
    };
  }

  // Ghi nội dung sửa tay (bấm "Lưu chỉnh sửa") KHÔNG gọi AI — thuần lưu textarea vào đúng chỗ trong
  // state.sections (viet.noi_dung ở bản nháp, review.ban_da_chinh ở bản hoàn chỉnh) rồi lưu DB.
  // KHÔNG gọi draw() ngay sau khi lưu — màn hình sẽ y hệt như trước (cùng chữ trong ô), khiến người
  // dùng không chắc đã lưu hay chưa (Quỳnh hỏi "chưa được à?" 2026-09-01). Hiện xác nhận "✓ Đã lưu"
  // ngay trên nút — giống đúng cách các nút "Copy link"/"Copy caption" đã làm — rồi mới draw().
  async function saveManualEdit(selector, applyFn) {
    const ta = container.querySelector(selector);
    const s = state.sections[state.activeIndex];
    applyFn(s, ta.value);
    await saveIdeaResult({ sections: state.sections }, ideaRow.id);
    state.error = null;
    const btn = container.querySelector('#xdnd-save-edit-btn');
    if (btn) {
      btn.textContent = '✓ Đã lưu';
      setTimeout(() => { draw(); }, 1200);
    } else {
      draw();
    }
  }

  async function exportEbook() {
    state.screen = 'exporting-ebook'; state.error = null; draw();
    const stopProgress = animateProgressBar(container.querySelector('#xdnd-progress-el'), 45);
    try {
      // Chuỗi này gồm dựng PDF + tải lên Storage + ký URL + gọi Heyzine (riêng Heyzine đã có thể
      // mất tới 200s, xem api/_lib/heyzine.js) — timeout phía client PHẢI cao hơn hẳn timeout của
      // riêng bước Heyzine, không được để bằng nhau (lỗi thật Quỳnh gặp 2026-09-01: "Có lỗi xảy ra"
      // do client bỏ cuộc trước khi chuỗi xử lý xong).
      const data = await callApi('api/san-pham-so-xuat-ebook', { idea, outline2: state.outline2, sections: state.sections, theme: state.ebookTheme }, 260000);
      state.ebookResult = { heyzineUrl: data.heyzineUrl, thumbnail: data.thumbnail, pdfStoragePath: data.pdfStoragePath };
      await saveIdeaResult({ ebook_result: state.ebookResult }, ideaRow.id);
      state.screen = 'outline2';
    } catch (e) {
      state.error = e.message || 'Có lỗi xảy ra — thử lại giúp mình.';
      state.screen = 'outline2';
    }
    stopProgress();
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
      // 3 field này thiếu trước 2026-09-04 (thêm ở batch #21 nhưng chưa cập nhật handoff này) — vô
      // hại vì danh-sach-san-pham.js đọc draft nguyên vẹn (state.form = draft, không merge newForm()),
      // nhưng thêm cho đủ khớp newForm() để tránh field undefined lặng lẽ.
      dinh_dang: '', mini_course_lessons: [], webinar_datetime: '',
    });
    location.hash = 'san-pham';
  }

  async function exportLesson(index) {
    state.exportingLessonIndex = index; state.error = null; draw();
    try {
      const data = await callApi('api/san-pham-so-xuat-bai-hoc', { idea, outline2: state.outline2, sections: state.sections, index, theme: state.ebookTheme }, 120000);
      const lessons = { ...((state.ebookResult && state.ebookResult.lessons) || {}) };
      lessons[index] = { link: data.link, storagePath: data.storagePath };
      state.ebookResult = { lessons };
      await saveIdeaResult({ ebook_result: state.ebookResult }, ideaRow.id);
    } catch (e) {
      state.error = e.message || 'Có lỗi xảy ra — thử lại giúp mình.';
    }
    state.exportingLessonIndex = null;
    safeDraw('outline2');
  }

  // Hand-off giống useEbookAsProduct() nhưng cho mini_course — mỗi bài đã xuất thành 1 mục trong
  // mini_course_lessons (đúng shape {title,link} mà san-pham-so/js/danh-sach-san-pham.js đã hỗ trợ
  // sẵn từ batch #21). Chỉ đưa những bài ĐÃ xuất — bài chưa xuất bỏ qua, người bán tự xuất bổ sung
  // sau ở đây rồi sửa lại sản phẩm nếu muốn.
  async function useLessonsAsProduct() {
    const sections = flattenSections(state.outline2);
    const lessons = (state.ebookResult && state.ebookResult.lessons) || {};
    const lessonList = sections.map((s, i) => (lessons[i] ? { title: s.tieu_de, link: lessons[i].link } : null)).filter(Boolean);
    await saveDraft('san-pham-so', {
      id: null,
      title: idea.ten_san_pham || '',
      description: idea.ly_do || '',
      price: '',
      cover_image_url: null,
      file_storage_path: null,
      file_name: null,
      external_link: null,
      published: false,
      dinh_dang: 'mini_course',
      mini_course_lessons: lessonList,
      webinar_datetime: '',
    });
    location.hash = 'san-pham';
  }

  async function generateOutline2() {
    state.screen = 'generating-outline2'; state.error = null; draw();
    const stopProgress = animateProgressBar(container.querySelector('#xdnd-progress-el'), 50);
    try {
      // Outline cấp 2 có thể cần AI sinh tới 8000 token — timeout mặc định 90s của callApi() không
      // đủ, khớp đúng lỗi thật Quỳnh gặp 2026-09-01. Nâng lên 180s (server cũng đã nâng tương ứng).
      const data = await callApi('api/xay-dung-noi-dung', {
        step: 'outline2', idea, outlineCap1: idea.outline_cap_1, taiLieuKinhNghiem: state.taiLieu || null,
        materialPath: getMaterialPath(),
      }, 250000);
      if (!data.result || !Array.isArray(data.result.phan)) throw new Error('AI trả về outline không đúng định dạng — thử lại giúp mình.');
      state.outline2 = data.result;
      // Chốt giọng văn/tài liệu/ghi chú vĩnh viễn vào answers (merge, không ghi đè các key khác đã
      // có) — dùng nhất quán cho mọi lần viết/viết lại phần sau, kể cả sau khi rời trang rồi quay lại
      // (trước đây taiLieu bị xoá draft mà không lưu lại đâu cả — bug đã sửa). tai_lieu_path chỉ ghi
      // đè khi vừa tải file mới ở màn này (getMaterialPath() ưu tiên materialPath cũ nếu đã có).
      await saveIdeaResult({
        outline_cap_2: state.outline2,
        answers: { ...(ideaRow.answers || {}), giong_van: state.giongVan, tai_lieu_kinh_nghiem: state.taiLieu || null, tai_lieu_path: getMaterialPath() },
      }, ideaRow.id);
      await clearDraft(XDND_INTRO_DRAFT_KEY);
      state.screen = 'outline2';
    } catch (e) {
      state.error = e.message || 'Có lỗi xảy ra — thử lại giúp mình.';
      state.screen = 'intro';
    }
    stopProgress();
    safeDraw('intro');
  }

  async function openSection(index) {
    state.activeIndex = index;
    const existing = state.sections[index];
    if (existing && existing.status === 'viet-done') { state.screen = 'section-draft'; draw(); return; }
    if (existing && existing.status === 'review-done') { state.screen = 'section-final'; draw(); return; }
    // Phần CHƯA viết gì — hỏi nguồn kiến thức trước (kiến thức sẵn có của AI, hay tìm thêm từ web —
    // tùy chọn, tốn thêm phí thật nếu chọn web) thay vì tự động chạy luôn như trước 2026-09-01.
    state.screen = 'section-start-choice';
    draw();
  }

  async function runNghienCuuAndViet(index, useWebSearch) {
    const flat = flattenSections(state.outline2);
    const s = flat[index];
    const phanTruoc = index > 0 ? flat[index - 1] : null;
    const phanSau = index < flat.length - 1 ? flat[index + 1] : null;
    state.screen = 'section-working'; state.workingStep = useWebSearch ? 'nghien-cuu-web' : 'nghien-cuu'; state.error = null; draw();
    // 2 pha (nghiên cứu -> viết) đổi màn hình con qua workingStep, mỗi lần draw() lại tạo phần tử
    // #xdnd-progress-el MỚI — phải lấy lại tham chiếu + khởi động lại thanh tiến trình cho từng pha.
    let stopProgress = animateProgressBar(container.querySelector('#xdnd-progress-el'), useWebSearch ? 40 : 18);
    try {
      // Timeout mặc định 90s của callApi() từng áp cho MỌI bước, không riêng outline2 — lỗi thật
      // Quỳnh gặp lại 2026-09-01 xảy ra đúng ở bước này (nghien-cuu/viet), không phải outline2. Nâng
      // lên 150s khớp DEFAULT_TIMEOUT_MS đã nâng ở server (api/xay-dung-noi-dung.js).
      const nghienCuuData = await callApi('api/xay-dung-noi-dung', {
        step: 'nghien-cuu', idea, phan: s, useWebSearch,
        taiLieuKinhNghiem: state.taiLieu || null,
      }, 150000);
      stopProgress();
      state.workingStep = 'viet'; draw();
      // Không còn giới hạn số từ cứng — nội dung có thể dài hơn, thời gian sinh chữ lâu hơn (khớp
      // max_tokens=16000/timeoutMs=250000 đã nâng ở server).
      stopProgress = animateProgressBar(container.querySelector('#xdnd-progress-el'), 45);
      const vietData = await callApi('api/xay-dung-noi-dung', {
        step: 'viet', idea, phan: s, nghienCuu: nghienCuuData.result, giongVan: state.giongVan, materialPath: getMaterialPath(),
        taiLieuKinhNghiem: state.taiLieu || null,
        phanTruoc: phanTruoc ? { tieu_de: phanTruoc.tieu_de, ket_qua_cu_the: phanTruoc.ket_qua_cu_the } : null,
        phanSau: phanSau ? { tieu_de: phanSau.tieu_de } : null,
      }, 250000);
      state.sections[index] = { nghien_cuu: nghienCuuData.result, viet: vietData.result, review: null, status: 'viet-done', used_web_search: !!useWebSearch };
      await saveIdeaResult({ sections: state.sections }, ideaRow.id);
      state.screen = 'section-draft';
    } catch (e) {
      state.error = e.message || 'Có lỗi xảy ra — thử lại giúp mình.';
      state.screen = 'outline2';
    }
    stopProgress();
    safeDraw('outline2');
  }

  // Duyệt tổng thể — chỉ CHẨN ĐOÁN (mạch lạc/trùng lặp/đúng lời hứa outline), không tự sửa nội dung.
  // Người dùng chủ động sửa qua ô "Lưu chỉnh sửa" đã có ở từng phần. KHÔNG lưu DB — tính lại mỗi lần
  // bấm (giống "💡 Xem gợi ý" ở wizard cũ), vì đây là 1 bản kiểm tra dùng trước khi xuất bản, không
  // phải nội dung sản phẩm.
  async function runTongDuyet() {
    state.tongDuyetLoading = true; state.error = null; draw();
    const stopProgress = animateProgressButton(container.querySelector('#xdnd-tong-duyet-btn'), 30, 'Đang duyệt tổng thể');
    try {
      const flat = flattenSections(state.outline2);
      const noiDungTheoPhan = {};
      flat.forEach((_, i) => {
        const s = state.sections[i];
        noiDungTheoPhan[i] = s ? (s.review && s.review.ban_da_chinh ? s.review.ban_da_chinh : s.viet.noi_dung) : null;
      });
      const data = await callApi('api/xay-dung-noi-dung', { step: 'tong-duyet', idea, outlineCap2: state.outline2, noiDungTheoPhan }, 150000);
      state.tongDuyetResult = data.result;
    } catch (e) {
      state.error = e.message || 'Có lỗi xảy ra — thử lại giúp mình.';
    }
    stopProgress();
    state.tongDuyetLoading = false;
    safeDraw('outline2');
  }

  async function runReview() {
    const index = state.activeIndex;
    const s = state.sections[index];
    state.screen = 'section-review-loading'; state.error = null; draw();
    const stopProgress = animateProgressBar(container.querySelector('#xdnd-progress-el'), 15);
    try {
      const data = await callApi('api/xay-dung-noi-dung', { step: 'review', noiDungDaViet: s.viet.noi_dung }, 150000);
      state.sections[index] = { ...s, review: data.result, status: 'review-done' };
      await saveIdeaResult({ sections: state.sections }, ideaRow.id);
      state.screen = 'section-final';
    } catch (e) {
      state.error = e.message || 'Có lỗi xảy ra — thử lại giúp mình.';
      state.screen = 'section-draft';
    }
    stopProgress();
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
