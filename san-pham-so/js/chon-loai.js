// Sản Phẩm Số — "🗂️ Chọn Loại Sản Phẩm Số": dành cho người ĐÃ BIẾT rõ muốn làm loại sản phẩm gì về
// chủ đề gì, không cần qua wizard 11 câu hỏi hay nhánh tài liệu của "Tìm Sản Phẩm Phù Hợp"
// (tim-san-pham.js) — chỉ điền nhanh ngành/loại/chủ đề/đối tượng, AI dựng 1 outline rồi vào thẳng
// Giai đoạn 2 (xay-dung-noi-dung.js). Tái dùng NGANH_OPTIONS/DINH_DANG_OPTIONS và khung upload tài
// liệu đã có ở util.js/tim-san-pham.js — không tạo API upload mới.
(function () {
const FORM_DRAFT_KEY = 'chon-loai-form';

function newForm() {
  return {
    nganh: '', showNganhOther: false,
    dinhDang: '', chuDe: '', doiTuong: '',
    materialPath: null, materialFileName: null, materialUploading: false, materialUploadError: null,
  };
}

function render(container, profile) {
  const state = {
    screen: 'loading', form: newForm(), result: null, error: null,
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
    const draft = await loadDraft(FORM_DRAFT_KEY);
    if (draft) state.form = { ...state.form, ...draft };
    state.screen = 'form';
    draw();
  }

  function html() {
    if (state.screen === 'loading') return `<div class="loading"><div class="spinner"></div></div>`;
    if (state.screen === 'generating') return `<div class="loading"><div id="cl-progress-el">${progressBarHtml(0)}</div><p>Đang dựng outline…</p></div>`;
    if (state.screen === 'result') return resultHtml();
    return formHtml();
  }

  function canSubmit() {
    const f = state.form;
    return !!(f.nganh && f.dinhDang && f.chuDe.trim() && f.doiTuong.trim() && !f.materialUploading);
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

        <label style="margin-top:14px;">Loại sản phẩm</label>
        <div class="chips">${DINH_DANG_OPTIONS.map(o => `<div class="chip ${f.dinhDang === o.value ? 'selected' : ''}" data-cl-dinhdang="${esc(o.value)}">${esc(o.label)}</div>`).join('')}</div>

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
          <button class="btn" id="cl-submit-btn" ${!canSubmit() ? 'disabled' : ''}>Tạo outline (5 lượt AI)</button>
        </div>
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
      if (btn) btn.disabled = !canSubmit();
    };

    container.querySelectorAll('[data-cl-dinhdang]').forEach(el => {
      el.onclick = () => {
        const v = el.getAttribute('data-cl-dinhdang');
        f.dinhDang = (f.dinhDang === v) ? '' : v;
        persistFormDraft(); draw();
      };
    });

    const chuDeEl = container.querySelector('#cl-chude');
    chuDeEl.oninput = () => {
      f.chuDe = chuDeEl.value;
      persistFormDraft();
      const btn = container.querySelector('#cl-submit-btn');
      if (btn) btn.disabled = !canSubmit();
    };
    const doiTuongEl = container.querySelector('#cl-doituong');
    doiTuongEl.oninput = () => {
      f.doiTuong = doiTuongEl.value;
      persistFormDraft();
      const btn = container.querySelector('#cl-submit-btn');
      if (btn) btn.disabled = !canSubmit();
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

    container.querySelector('#cl-submit-btn').onclick = runGenerate;
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
    await clearDraft(FORM_DRAFT_KEY);
    const ideaRow = await loadIdeaResult();
    window.renderXayDungNoiDung(container, ideaRow);
  }

  async function runGenerate() {
    state.screen = 'generating'; state.error = null; draw();
    const stopProgress = animateProgressBar(container.querySelector('#cl-progress-el'), 40);
    try {
      const f = state.form;
      const data = await callApi('api/san-pham-so-tao-tu-loai', {
        nganh: f.nganh, dinhDang: f.dinhDang, chuDe: f.chuDe, doiTuong: f.doiTuong, materialPath: f.materialPath,
      }, 200000);
      if (!data.result || !Array.isArray(data.result.outline_cap_1)) throw new Error('AI trả về kết quả không đúng định dạng — thử lại giúp mình.');
      state.result = data.result;
      state.screen = 'result';
    } catch (e) {
      state.error = e.message || 'Có lỗi xảy ra — thử lại giúp mình.';
      state.screen = 'form';
    }
    stopProgress();
    try {
      draw();
    } catch (e) {
      state.result = null; state.screen = 'form'; state.error = 'Có lỗi khi hiển thị kết quả — thử lại giúp mình.';
      draw();
    }
  }

  boot();
}

window.SanPhamSoScreens = window.SanPhamSoScreens || {};
window.SanPhamSoScreens['chon-loai'] = render;
})();
