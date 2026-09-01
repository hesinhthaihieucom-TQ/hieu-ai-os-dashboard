// Sản Phẩm Số — "🗂️ Chọn Loại Sản Phẩm Số": dành cho người ĐÃ BIẾT chủ đề/đối tượng muốn làm nhưng
// CHƯA CHẮC nên làm ĐỊNH DẠNG nào (ebook/checklist/mini-course/...) — khác "Tìm Sản Phẩm Phù Hợp"
// (tim-san-pham.js), nơi AI phải đánh giá CẢ ý tưởng lẫn định dạng từ đầu qua 11 câu hỏi. Luồng ở
// đây (chốt 2026-09-01 sau khi Quỳnh phản hồi bản đầu bị lẫn với tim-san-pham): (1) nhập nhanh
// ngành/chủ đề/đối tượng, (2) chốt định dạng — AI gợi ý (1 lượt) HOẶC tự chọn tay trong 7 loại có
// mô tả tham khảo, (3) AI dựng outline cho đúng định dạng đã chốt (api/san-pham-so-tao-tu-loai.js,
// vẫn dùng nguyên như bản đầu, chỉ đẩy xuống sau bước chốt định dạng), (4) chọn xong outline → vào
// thẳng Giai đoạn 2 (xay-dung-noi-dung.js).
(function () {
const FORM_DRAFT_KEY = 'chon-loai-form';

// Mô tả tham khảo khi nào nên dùng định dạng nào — hiện ở bước "Tôi tự chọn" và không đổi tuỳ chủ
// đề/đối tượng (khác goi_y của AI, vốn nối trực tiếp với chủ đề/đối tượng cụ thể).
const DINH_DANG_DESC = {
  ebook: 'Cần giải thích khái niệm/tư duy — người đọc chỉ cần đọc là hiểu, không cần thực hành theo tiến trình.',
  checklist_workbook: 'Cần thực hành theo từng bước — có form/checklist để tự theo dõi tiến trình.',
  template_file_mau: 'Cần công cụ tra cứu, dùng đi dùng lại nhiều lần (không phải đọc 1 lần rồi thôi).',
  mini_course: 'Cần học có tiến trình nhiều bài, đi từng bước theo thời gian.',
  coaching_1_1: 'Cần hướng dẫn riêng theo từng người, gặp trực tiếp.',
  cong_dong_tra_phi: 'Cần đồng hành lâu dài, hỏi đáp liên tục trong 1 nhóm.',
  webinar: 'Cần 1 buổi học/sự kiện trực tiếp, tương tác thời gian thực.',
};

function newForm() {
  return {
    screen: 'form',
    nganh: '', showNganhOther: false,
    chuDe: '', doiTuong: '',
    materialPath: null, materialFileName: null, materialUploading: false, materialUploadError: null,
    dinhDang: '', formatMode: null, aiSuggestions: null,
  };
}

function render(container, profile) {
  const state = {
    screen: 'loading', form: newForm(), result: null, error: null,
    formatSuggestLoading: false, formatSuggestError: null,
    editing: false, editForm: null, editSaving: false,
  };

  function persistFormDraft() {
    saveDraft(FORM_DRAFT_KEY, state.form);
  }

  function draw() { container.innerHTML = html(); bind(); }

  async function boot() {
    const existing = await loadIdeaResult();
    if (existing && existing.chosen_index != null) {
      // Đang viết dở 1 sản phẩm (dù tạo từ đường nào) — giao thẳng cho Giai đoạn 2, không phá luồng.
      window.renderXayDungNoiDung(container, existing);
      return;
    }
    if (existing && existing.result && existing.answers && existing.answers.nguon === 'chon_loai') {
      // Outline đã dựng xong nhưng chưa bấm "Bắt đầu xây nội dung" — khôi phục màn kết quả, không
      // bắt làm lại từ đầu (xem feedback_auto_save_state).
      state.result = existing.result.phuong_an[0];
      state.form.nganh = existing.answers.nganh || '';
      state.form.chuDe = existing.answers.chu_de || '';
      state.form.doiTuong = existing.answers.doi_tuong || '';
      state.form.dinhDang = existing.answers.dinh_dang_mong_muon || '';
      state.form.materialPath = existing.answers.tai_lieu_path || null;
      state.screen = 'result';
      await clearDraft(FORM_DRAFT_KEY);
      draw();
      return;
    }
    const draft = await loadDraft(FORM_DRAFT_KEY);
    if (draft) state.form = { ...state.form, ...draft };
    state.screen = state.form.screen || 'form';
    draw();
  }

  function html() {
    if (state.screen === 'loading') return `<div class="loading"><div class="spinner"></div></div>`;
    if (state.screen === 'generating') return `<div class="loading"><div id="cl-progress-el">${progressBarHtml(0)}</div><p>Đang dựng outline…</p></div>`;
    if (state.screen === 'format-pick') return formatPickHtml();
    if (state.screen === 'result') return resultHtml();
    return formHtml();
  }

  function canSubmitForm() {
    const f = state.form;
    return !!(f.nganh && f.chuDe.trim() && f.doiTuong.trim() && !f.materialUploading);
  }

  function formHtml() {
    const f = state.form;
    const isOther = f.nganh && !NGANH_OPTIONS.includes(f.nganh);
    return `
      <h2>Chọn loại sản phẩm số</h2>
      <div class="card">
        <label>Ngành/lĩnh vực</label>
        <div class="chips">
          ${NGANH_OPTIONS.map(o => `<div class="chip ${f.nganh === o ? 'selected' : ''}" data-cl-nganh="${esc(o)}">${esc(o)}</div>`).join('')}
          <div class="chip ${isOther || f.showNganhOther ? 'selected' : ''}" data-cl-nganh-other="1">Khác (tự nhập)</div>
        </div>
        ${isOther || f.showNganhOther ? `<input id="cl-nganh-other-input" type="text" placeholder="Nhập đúng ngành/lĩnh vực của bạn" value="${esc(isOther ? f.nganh : '')}" style="margin-top:8px;">` : ''}

        <label style="margin-top:14px;">Chủ đề/tên sản phẩm muốn làm</label>
        <input id="cl-chude" type="text" value="${esc(f.chuDe)}" placeholder='VD: Quản lý chi tiêu cho mẹ bỉm sữa'>

        <label style="margin-top:14px;">Đối tượng cụ thể</label>
        <input id="cl-doituong" type="text" value="${esc(f.doiTuong)}" placeholder='VD: mẹ bỉm sữa mới sinh con đầu lòng'>

        <label style="margin-top:14px;">Tài liệu (PDF, tuỳ chọn — nếu có sẵn, AI sẽ bám sát nội dung thật trong đó)</label>
        <input id="cl-file-input" type="file" accept="application/pdf">
        <div style="font-size:13px;color:var(--ink-soft);margin-top:4px;">${f.materialUploading ? 'Đang tải lên…' : (f.materialFileName ? `📎 ${esc(f.materialFileName)} — đã tải lên ✓` : 'Chưa chọn file.')}</div>
        ${f.materialUploadError ? `<div class="error-box" style="margin-top:6px;">${esc(f.materialUploadError)}</div>` : ''}

        ${state.error ? `<div class="error-box" style="margin-top:10px;">${esc(state.error)}</div>` : ''}
        <div class="btn-row">
          <button class="btn" id="cl-submit-btn" ${!canSubmitForm() ? 'disabled' : ''}>Tiếp tục →</button>
        </div>
      </div>
    `;
  }

  function formatPickHtml() {
    const f = state.form;
    const summary = `Chủ đề: <b>${esc(f.chuDe)}</b> · Đối tượng: <b>${esc(f.doiTuong)}</b>`;
    let body = '';
    if (!f.formatMode) {
      body = `
        <div class="btn-row" style="flex-direction:column;align-items:stretch;gap:10px;">
          <button class="btn" id="fp-ai-btn" ${state.formatSuggestLoading ? 'disabled' : ''}>${state.formatSuggestLoading ? 'Đang gợi ý…' : '🤖 AI gợi ý giúp mình (1 lượt AI)'}</button>
          <span class="btn-ghost btn" id="fp-manual-btn">✋ Tôi tự chọn</span>
        </div>
        ${state.formatSuggestLoading ? `<div id="fp-progress-el" style="margin-top:12px;">${progressBarHtml(0)}</div>` : ''}
        ${state.formatSuggestError ? `<div class="error-box" style="margin-top:10px;">${esc(state.formatSuggestError)}</div>` : ''}
      `;
    } else if (f.formatMode === 'ai') {
      body = `
        ${(f.aiSuggestions || []).map((s, i) => {
          const opt = DINH_DANG_OPTIONS.find(o => o.value === s.dinh_dang);
          return `
            <div class="card" style="margin-bottom:10px;">
              <h2 style="font-size:16px;margin-bottom:6px;">${esc(opt ? opt.label : s.dinh_dang)}</h2>
              <div style="font-size:13.5px;color:var(--ink-soft);margin-bottom:10px;">${esc(s.ly_do)}</div>
              <span class="btn btn-sm" data-fp-choose="${esc(s.dinh_dang)}">Chọn định dạng này →</span>
            </div>
          `;
        }).join('')}
        <div class="btn-row"><span class="btn-ghost btn btn-sm" id="fp-switch-manual-btn">Không cái nào phù hợp — để mình tự chọn</span></div>
      `;
    } else {
      body = `
        <div class="chips" style="flex-direction:column;align-items:stretch;">
          ${DINH_DANG_OPTIONS.map(o => `
            <div class="chip ${f.dinhDang === o.value ? 'selected' : ''}" data-fp-choose="${esc(o.value)}" style="margin-bottom:8px;text-align:left;">
              <b>${esc(o.label)}</b><br><span style="font-size:12.5px;color:var(--ink-soft);">${esc(DINH_DANG_DESC[o.value] || '')}</span>
            </div>
          `).join('')}
        </div>
      `;
    }
    return `
      <h2>Chọn định dạng phù hợp</h2>
      <div class="card">
        <div style="font-size:13.5px;color:var(--ink-soft);margin-bottom:14px;">${summary}</div>
        ${body}
        <div class="btn-row" style="margin-top:14px;"><span class="btn-ghost btn" id="fp-back-btn">← Quay lại</span></div>
      </div>
    `;
  }

  function ideaCardHtml(p) {
    return `
      <div class="card">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;">
          <h2 style="font-size:18px;">${esc(p.ten_san_pham)}</h2>
          <span class="btn-ghost btn btn-sm" id="cl-edit-btn">✏️ Sửa</span>
        </div>
        <div style="font-size:13.5px;color:var(--ink-soft);margin-bottom:10px;">
          <b>Đối tượng:</b> ${esc(p.doi_tuong)} · <b>Định dạng:</b> ${esc(p.dinh_dang)} · <b>Độ dài:</b> ${esc(p.do_dai_uoc_luong)}
        </div>
        <div style="font-size:13.5px;white-space:pre-line;margin-bottom:12px;">${esc(p.ly_do)}</div>
        <div style="font-size:13px;color:var(--ink-soft);margin-bottom:6px;"><b>Outline cấp 1:</b></div>
        <ol style="margin:0 0 12px;padding-left:20px;font-size:13.5px;">${(p.outline_cap_1 || []).map(o => `<li>${esc(o)}</li>`).join('')}</ol>
        <button class="btn" id="cl-choose-btn">Bắt đầu xây nội dung →</button>
      </div>
    `;
  }

  function editIdeaHtml() {
    const p = state.editForm;
    return `
      <div class="card">
        <h2 style="font-size:18px;">Sửa outline</h2>
        <label>Tên sản phẩm</label>
        <input id="edit-ten" type="text" value="${esc(p.ten_san_pham)}">
        <label>Đối tượng</label>
        <input id="edit-doi-tuong" type="text" value="${esc(p.doi_tuong)}">
        <label>Outline cấp 1 (mỗi dòng 1 phần)</label>
        <textarea id="edit-outline" rows="6">${esc((p.outline_cap_1 || []).join('\n'))}</textarea>
        ${state.error ? `<div class="error-box" style="margin-top:10px;">${esc(state.error)}</div>` : ''}
        <div class="btn-row">
          <button class="btn" id="edit-save-btn" ${state.editSaving ? 'disabled' : ''}>${state.editSaving ? 'Đang lưu…' : 'Lưu & bắt đầu xây nội dung'}</button>
          <span class="btn-ghost btn" id="edit-cancel-btn">Huỷ</span>
        </div>
      </div>
    `;
  }

  function resultHtml() {
    if (state.editing) return editIdeaHtml();
    return ideaCardHtml(state.result);
  }

  function bind() {
    if (state.screen === 'result') { bindResult(); return; }
    if (state.screen === 'format-pick') { bindFormatPick(); return; }
    if (state.screen !== 'form') return;
    bindForm();
  }

  function bindForm() {
    const f = state.form;
    container.querySelectorAll('[data-cl-nganh]').forEach(el => {
      el.onclick = () => { f.nganh = el.getAttribute('data-cl-nganh'); f.showNganhOther = false; persistFormDraft(); draw(); };
    });
    const otherChip = container.querySelector('[data-cl-nganh-other]');
    if (otherChip) otherChip.onclick = () => { f.showNganhOther = true; f.nganh = ''; draw(); };
    const otherInput = container.querySelector('#cl-nganh-other-input');
    if (otherInput) otherInput.oninput = () => {
      f.nganh = otherInput.value;
      persistFormDraft();
      const btn = container.querySelector('#cl-submit-btn');
      if (btn) btn.disabled = !canSubmitForm();
    };

    const chuDeEl = container.querySelector('#cl-chude');
    chuDeEl.oninput = () => {
      f.chuDe = chuDeEl.value;
      persistFormDraft();
      const btn = container.querySelector('#cl-submit-btn');
      if (btn) btn.disabled = !canSubmitForm();
    };
    const doiTuongEl = container.querySelector('#cl-doituong');
    doiTuongEl.oninput = () => {
      f.doiTuong = doiTuongEl.value;
      persistFormDraft();
      const btn = container.querySelector('#cl-submit-btn');
      if (btn) btn.disabled = !canSubmitForm();
    };

    const fileEl = container.querySelector('#cl-file-input');
    fileEl.onchange = async () => {
      const file = fileEl.files[0];
      if (!file) return;
      if (file.type !== 'application/pdf') { f.materialUploadError = 'Chỉ nhận file PDF.'; draw(); return; }
      f.materialUploading = true; f.materialUploadError = null; draw();
      try {
        const { uploadUrl, path } = await callApi('api/san-pham-so-upload-material-url', { file_name: file.name });
        const putResp = await fetch(uploadUrl, { method: 'PUT', headers: { 'content-type': 'application/pdf' }, body: file });
        if (!putResp.ok) throw new Error('Upload file thất bại — thử lại giúp mình.');
        f.materialPath = path; f.materialFileName = file.name;
        persistFormDraft();
      } catch (e) {
        f.materialUploadError = e.message;
      }
      f.materialUploading = false;
      draw();
    };

    container.querySelector('#cl-submit-btn').onclick = () => {
      f.screen = 'format-pick';
      state.screen = 'format-pick';
      persistFormDraft();
      draw();
    };
  }

  function bindFormatPick() {
    const f = state.form;
    container.querySelector('#fp-back-btn').onclick = () => {
      if (f.formatMode) { f.formatMode = null; f.aiSuggestions = null; state.formatSuggestError = null; draw(); return; }
      f.screen = 'form'; state.screen = 'form'; persistFormDraft(); draw();
    };
    const aiBtn = container.querySelector('#fp-ai-btn');
    if (aiBtn) aiBtn.onclick = runSuggestFormat;
    const manualBtn = container.querySelector('#fp-manual-btn');
    if (manualBtn) manualBtn.onclick = () => { f.formatMode = 'manual'; persistFormDraft(); draw(); };
    const switchManualBtn = container.querySelector('#fp-switch-manual-btn');
    if (switchManualBtn) switchManualBtn.onclick = () => { f.formatMode = 'manual'; persistFormDraft(); draw(); };
    container.querySelectorAll('[data-fp-choose]').forEach(el => {
      el.onclick = () => {
        f.dinhDang = el.getAttribute('data-fp-choose');
        persistFormDraft();
        runGenerateOutline();
      };
    });
  }

  function bindResult() {
    if (state.editing) { bindEditForm(); return; }
    container.querySelector('#cl-edit-btn').onclick = () => {
      state.editing = true;
      state.editForm = JSON.parse(JSON.stringify(state.result));
      state.error = null;
      draw();
    };
    container.querySelector('#cl-choose-btn').onclick = () => chooseAndProceed();
  }

  function bindEditForm() {
    container.querySelector('#edit-ten').oninput = (e) => { state.editForm.ten_san_pham = e.target.value; };
    container.querySelector('#edit-doi-tuong').oninput = (e) => { state.editForm.doi_tuong = e.target.value; };
    container.querySelector('#edit-outline').oninput = (e) => { state.editForm.outline_cap_1 = e.target.value.split('\n').map(s => s.trim()).filter(Boolean); };
    container.querySelector('#edit-cancel-btn').onclick = () => { state.editing = false; state.editForm = null; draw(); };
    container.querySelector('#edit-save-btn').onclick = async () => {
      if (!state.editForm.ten_san_pham.trim()) { state.error = 'Vui lòng nhập tên sản phẩm.'; draw(); return; }
      if (!state.editForm.outline_cap_1.length) { state.error = 'Outline cần ít nhất 1 phần.'; draw(); return; }
      state.editSaving = true; draw();
      state.result = state.editForm;
      await saveIdeaResult({ result: { du_lieu_du_manh: true, canh_bao: '', phuong_an: [state.result] } });
      state.editSaving = false;
      await chooseAndProceed();
    };
  }

  async function chooseAndProceed() {
    const f = state.form;
    await saveIdeaResult({
      nganh: f.nganh || null,
      answers: { nguon: 'chon_loai', nganh: f.nganh, dinh_dang_mong_muon: f.dinhDang, chu_de: f.chuDe, doi_tuong: f.doiTuong, tai_lieu_path: f.materialPath },
      result: { du_lieu_du_manh: true, canh_bao: '', phuong_an: [state.result] },
      chosen_index: 0,
    });
    const ideaRow = await loadIdeaResult();
    window.renderXayDungNoiDung(container, ideaRow);
  }

  async function runSuggestFormat() {
    state.formatSuggestLoading = true; state.formatSuggestError = null; draw();
    const stopProgress = animateProgressBar(container.querySelector('#fp-progress-el'), 15);
    try {
      const f = state.form;
      const data = await callApi('api/san-pham-so-goi-y-dinh-dang', { nganh: f.nganh, chuDe: f.chuDe, doiTuong: f.doiTuong }, 180000);
      if (!data.result || !Array.isArray(data.result.goi_y) || !data.result.goi_y.length) throw new Error('AI trả về kết quả không đúng định dạng — thử lại giúp mình.');
      f.formatMode = 'ai'; f.aiSuggestions = data.result.goi_y;
      persistFormDraft();
    } catch (e) {
      state.formatSuggestError = e.message || 'Có lỗi xảy ra — thử lại giúp mình.';
    }
    stopProgress();
    state.formatSuggestLoading = false;
    draw();
  }

  async function runGenerateOutline() {
    state.screen = 'generating'; state.error = null; draw();
    const stopProgress = animateProgressBar(container.querySelector('#cl-progress-el'), 40);
    try {
      const f = state.form;
      const data = await callApi('api/san-pham-so-tao-tu-loai', {
        nganh: f.nganh, dinhDang: f.dinhDang, chuDe: f.chuDe, doiTuong: f.doiTuong, materialPath: f.materialPath,
      }, 200000);
      if (!data.result || !Array.isArray(data.result.outline_cap_1)) throw new Error('AI trả về kết quả không đúng định dạng — thử lại giúp mình.');
      state.result = data.result;
      // Lưu ngay khi vừa dựng xong (chosen_index vẫn null) để không mất outline nếu người dùng rời
      // trang trước khi bấm "Bắt đầu xây nội dung" — xem feedback_auto_save_state.
      await saveIdeaResult({
        nganh: f.nganh || null,
        answers: { nguon: 'chon_loai', nganh: f.nganh, dinh_dang_mong_muon: f.dinhDang, chu_de: f.chuDe, doi_tuong: f.doiTuong, tai_lieu_path: f.materialPath },
        result: { du_lieu_du_manh: true, canh_bao: '', phuong_an: [state.result] },
        chosen_index: null,
      });
      await clearDraft(FORM_DRAFT_KEY);
      state.screen = 'result';
    } catch (e) {
      state.error = e.message || 'Có lỗi xảy ra — thử lại giúp mình.';
      state.screen = 'format-pick';
    }
    stopProgress();
    try {
      draw();
    } catch (e) {
      state.result = null; state.screen = 'format-pick'; state.error = 'Có lỗi khi hiển thị kết quả — thử lại giúp mình.';
      draw();
    }
  }

  boot();
}

window.SanPhamSoScreens = window.SanPhamSoScreens || {};
window.SanPhamSoScreens['chon-loai'] = render;
})();
