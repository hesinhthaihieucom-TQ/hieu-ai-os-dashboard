// Sản Phẩm Số — "🗂️ Chọn Loại Sản Phẩm Số": trang này TRƯỚC HẾT là để xem/chọn LOẠI sản phẩm số có
// thể bán (Ebook, Template, Mini-course, Coaching 1-1, Cộng đồng trả phí, Webinar...) — khác "Tìm
// Sản Phẩm Phù Hợp" (tim-san-pham.js), nơi AI phải đánh giá CẢ ý tưởng lẫn định dạng từ đầu qua 11
// câu hỏi. Luồng (chốt 2026-09-01 sau nhiều vòng phản hồi trực tiếp của Quỳnh — ban đầu để form
// ngành/chủ đề/đối tượng lên TRƯỚC rồi mới chọn loại ở bước ẩn phía sau, bị phản hồi "sao mấy cái
// loại sản phẩm số đâu" vì LOẠI phải là thứ nhìn thấy đầu tiên khi vào trang này):
// (1) hiện ngay 7 loại sản phẩm số kèm bảng "cần chuẩn bị gì / người mua nhận được gì" để tự chọn
// tay, HOẶC bấm "AI gợi ý" (nhập nhanh ngành/chủ đề/đối tượng, AI đề xuất 1-2 loại phù hợp);
// (2) loại đã chốt → điền/xác nhận chủ đề/đối tượng cụ thể (+ tài liệu PDF tuỳ chọn);
// (3) AI dựng outline cho đúng loại đã chốt (api/san-pham-so-tao-tu-loai.js);
// (4) chọn xong outline → vào thẳng Giai đoạn 2 (xay-dung-noi-dung.js).
(function () {
const FORM_DRAFT_KEY = 'chon-loai-form';

// Thông tin tham khảo cho từng định dạng — hiện NGAY trên màn chọn loại (đây chính là nội dung
// chính của trang, không phải phụ) VÀ như phần bổ sung dưới mỗi gợi ý của AI, để người dùng thật sự
// hiểu mình đang chọn gì: không chỉ "khi nào nên dùng", mà cả CẦN CHUẨN BỊ GÌ và NGƯỜI MUA NHẬN ĐƯỢC
// GÌ — mục tiêu "để người dùng còn học được từ web này" (Quỳnh 2026-09-01). can_chuan_bi/nguoi_mua_nhan
// lấy đúng theo bảng thật Quỳnh đã đưa (cơ chế giao hàng của "Sản phẩm của tôi"/landing page — ebook
// đã chạy, các loại còn lại là hướng sẽ làm, không phải đã có sẵn UI riêng cho từng loại ở bước này).
const DINH_DANG_INFO = {
  ebook: {
    khi_nao: 'Cần giải thích khái niệm/tư duy — người đọc chỉ cần đọc là hiểu, không cần thực hành theo tiến trình.',
    can_chuan_bi: 'AI tự viết (chọn "Tạo bằng AI"), hoặc tự upload file PDF sẵn có.',
    nguoi_mua_nhan: 'Link tải file PDF.',
  },
  checklist_workbook: {
    khi_nao: 'Cần thực hành theo từng bước — có form/checklist để tự theo dõi tiến trình.',
    can_chuan_bi: 'AI tự viết (chọn "Tạo bằng AI"), hoặc tự upload file PDF sẵn có.',
    nguoi_mua_nhan: 'Link tải file PDF.',
  },
  template_file_mau: {
    khi_nao: 'Cần công cụ tra cứu, dùng đi dùng lại nhiều lần (không phải đọc 1 lần rồi thôi).',
    can_chuan_bi: '1 link chia sẻ (Canva/Notion/Excel...) — không phải upload file, vì bản chất là link dùng lại nhiều lần.',
    nguoi_mua_nhan: 'Link mở template đó.',
  },
  mini_course: {
    khi_nao: 'Cần học có tiến trình nhiều bài, đi từng bước theo thời gian.',
    can_chuan_bi: 'Danh sách nhiều bài học (mỗi bài: tên + link video/Zoom hoặc file).',
    nguoi_mua_nhan: '1 trang riêng liệt kê từng bài học + link mở từng bài.',
  },
  coaching_1_1: {
    khi_nao: 'Cần hướng dẫn riêng theo từng người, gặp trực tiếp.',
    can_chuan_bi: '1 link đặt lịch (Calendly...).',
    nguoi_mua_nhan: 'Nút "Đặt lịch ngay" hiện sau khi thanh toán, dẫn tới link đó.',
  },
  cong_dong_tra_phi: {
    khi_nao: 'Cần đồng hành lâu dài, hỏi đáp liên tục trong 1 nhóm.',
    can_chuan_bi: '1 link mời nhóm (Zalo/Telegram/Facebook).',
    nguoi_mua_nhan: 'Link mời nhóm (nên giới hạn thời gian dùng, giống link tải file).',
  },
  webinar: {
    khi_nao: 'Cần 1 buổi học/sự kiện trực tiếp, tương tác thời gian thực.',
    can_chuan_bi: 'Ngày giờ diễn ra + link Zoom/Meet.',
    nguoi_mua_nhan: 'Trang chờ hiện đồng hồ đếm ngược, sau khi mua gửi link tham gia.',
  },
};

function newForm() {
  return {
    screen: 'pick-type',
    dinhDang: '',
    nganh: '', showNganhOther: false,
    chuDe: '', doiTuong: '',
    materialPath: null, materialFileName: null, materialUploading: false, materialUploadError: null,
    aiSuggestions: null,
  };
}

function render(container, profile) {
  const state = {
    screen: 'loading', form: newForm(), result: null, error: null,
    aiSuggestLoading: false, aiSuggestError: null,
    editing: false, editForm: null, editSaving: false,
    // id dòng product_idea_results "đang cân nhắc" (chosen_index null) hiện tại — null nếu chưa tạo
    // dòng nào (xem util.js: nhiều sản phẩm/user, không còn upsert-by-user_id nữa).
    pendingId: null, activeProducts: null,
  };

  function persistFormDraft() {
    saveDraft(FORM_DRAFT_KEY, state.form);
  }

  function draw() { container.innerHTML = html(); bind(); }

  async function boot() {
    // 2026-09-01: có thể có NHIỀU sản phẩm đang xây cùng lúc (Quỳnh: muốn lưu tạm 1 cái để bắt đầu
    // cái khác). Màn "Chọn Loại Sản Phẩm Số" LUÔN phải hiện đúng nội dung của nó (chọn loại trước
    // tiên) — sản phẩm đang xây dở chỉ là 1 dải gợi ý nhỏ ở đầu trang, KHÔNG thay hẳn màn hình.
    state.activeProducts = await listActiveIdeaResults();
    await bootFreshFlow();
  }

  async function bootFreshFlow() {
    const pending = await loadPendingIdeaResult();
    if (pending && pending.result && pending.answers && pending.answers.nguon === 'chon_loai') {
      // Outline đã dựng xong nhưng chưa bấm "Bắt đầu xây nội dung" — khôi phục màn kết quả, không
      // bắt làm lại từ đầu (xem feedback_auto_save_state).
      state.pendingId = pending.id;
      state.result = pending.result.phuong_an[0];
      state.form.nganh = pending.answers.nganh || '';
      state.form.chuDe = pending.answers.chu_de || '';
      state.form.doiTuong = pending.answers.doi_tuong || '';
      state.form.dinhDang = pending.answers.dinh_dang_mong_muon || '';
      state.form.materialPath = pending.answers.tai_lieu_path || null;
      state.screen = 'result';
      await clearDraft(FORM_DRAFT_KEY);
      draw();
      return;
    }
    const draft = await loadDraft(FORM_DRAFT_KEY);
    if (draft) {
      state.form = { ...state.form, ...draft };
    } else if (pending && pending.answers && pending.answers.nguon !== 'chon_loai') {
      // Chưa có draft riêng của màn này, nhưng có ý tưởng đang cân nhắc dở từ "Tìm Sản Phẩm Phù Hợp"
      // (chưa chọn phương án) — gợi ý điền sẵn ngành/đối tượng đã trả lời ở đó, đỡ phải gõ lại
      // (Quỳnh 2026-09-01: "tùy vào... nội dung trả lời của mục tìm sản phẩm số"). Chỉ điền sẵn, vẫn
      // sửa được thoải mái — không tự ý tạo/đụng tới dòng pending đó.
      state.form.nganh = pending.nganh || pending.answers.nganh || '';
      state.form.doiTuong = pending.answers.d1 || pending.answers.doi_tuong || '';
    }
    state.screen = state.form.screen || 'pick-type';
    draw();
  }

  function html() {
    if (state.screen === 'loading') return `<div class="loading"><div class="spinner"></div></div>`;
    if (state.screen === 'generating') return `<div class="loading"><div id="cl-progress-el">${progressBarHtml(0)}</div><p>Đang dựng outline…</p></div>`;
    if (state.screen === 'ai-suggest-input') return aiSuggestInputHtml();
    if (state.screen === 'ai-suggest-result') return aiSuggestResultHtml();
    if (state.screen === 'form') return formHtml();
    if (state.screen === 'result') return resultHtml();
    return pickTypeHtml();
  }

  // Dải gợi ý nhỏ ở đầu trang (chỉ khi có sản phẩm đang xây dở) — KHÔNG thay hẳn màn hình.
  function activeBannerHtml() {
    if (!state.activeProducts || !state.activeProducts.length) return '';
    return `
      <div style="margin-bottom:20px;">
        <div style="font-size:12px;color:var(--ink-soft);text-transform:uppercase;letter-spacing:.04em;margin-bottom:8px;">Đang xây dở (${state.activeProducts.length})</div>
        ${state.activeProducts.map((p, i) => {
          const idea = p.result.phuong_an[p.chosen_index];
          return `
            <div class="card" data-continue-active="${i}" style="cursor:pointer;padding:12px 16px;margin-bottom:8px;">
              <b style="font-size:14px;">${esc(idea.ten_san_pham)}</b>
              <span style="font-size:12.5px;color:var(--ink-soft);"> — ${esc(idea.doi_tuong)} · ${esc(idea.dinh_dang)}</span>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  // Bảng tham khảo "cần chuẩn bị gì / người mua nhận được gì" cho 1 định dạng — dùng chung cho cả
  // danh sách chọn tay (pickTypeHtml) lẫn gợi ý của AI (aiSuggestResultHtml).
  function dinhDangInfoHtml(value) {
    const info = DINH_DANG_INFO[value];
    if (!info) return '';
    return `
      <div style="font-size:12.5px;color:var(--ink-soft);margin-top:6px;">
        <b>Cần chuẩn bị:</b> ${esc(info.can_chuan_bi)}<br>
        <b>Người mua nhận được:</b> ${esc(info.nguoi_mua_nhan)}
      </div>
    `;
  }

  // MÀN CHÍNH của trang này — 7 loại sản phẩm số hiện NGAY, không ẩn sau bước nào khác.
  function pickTypeHtml() {
    return `
      ${activeBannerHtml()}
      <h2>Chọn loại sản phẩm số</h2>
      <div class="card" style="margin-bottom:14px;">
        <div style="font-size:13.5px;color:var(--ink-soft);margin-bottom:10px;">Chưa chắc nên chọn loại nào? Để AI gợi ý dựa trên chủ đề/đối tượng bạn nhắm tới.</div>
        <button class="btn" id="pt-ai-btn">🤖 Để AI gợi ý loại phù hợp (1 lượt AI)</button>
      </div>
      ${DINH_DANG_OPTIONS.map(o => `
        <div class="card" data-pt-choose="${esc(o.value)}" style="cursor:pointer;margin-bottom:10px;">
          <h2 style="font-size:16px;margin-bottom:6px;">${esc(o.label)}</h2>
          <div style="font-size:13px;color:var(--ink-soft);margin-bottom:4px;">${esc((DINH_DANG_INFO[o.value] || {}).khi_nao || '')}</div>
          ${dinhDangInfoHtml(o.value)}
        </div>
      `).join('')}
    `;
  }

  function canSubmitAiInput() {
    const f = state.form;
    return !!(f.nganh && f.chuDe.trim() && f.doiTuong.trim());
  }

  function aiSuggestInputHtml() {
    const f = state.form;
    const isOther = f.nganh && !NGANH_OPTIONS.includes(f.nganh);
    return `
      <h2>AI gợi ý loại phù hợp</h2>
      <div class="card">
        <label>Ngành/lĩnh vực</label>
        <div class="chips">
          ${NGANH_OPTIONS.map(o => `<div class="chip ${f.nganh === o ? 'selected' : ''}" data-ai-nganh="${esc(o)}">${esc(o)}</div>`).join('')}
          <div class="chip ${isOther || f.showNganhOther ? 'selected' : ''}" data-ai-nganh-other="1">Khác (tự nhập)</div>
        </div>
        ${isOther || f.showNganhOther ? `<input id="ai-nganh-other-input" type="text" placeholder="Nhập đúng ngành/lĩnh vực của bạn" value="${esc(isOther ? f.nganh : '')}" style="margin-top:8px;">` : ''}

        <label style="margin-top:14px;">Chủ đề/tên sản phẩm muốn làm</label>
        <input id="ai-chude" type="text" value="${esc(f.chuDe)}" placeholder='VD: Quản lý chi tiêu cho mẹ bỉm sữa'>

        <label style="margin-top:14px;">Đối tượng cụ thể</label>
        <input id="ai-doituong" type="text" value="${esc(f.doiTuong)}" placeholder='VD: mẹ bỉm sữa mới sinh con đầu lòng'>

        ${state.aiSuggestLoading ? `<div id="ai-progress-el" style="margin-top:14px;">${progressBarHtml(0)}</div>` : ''}
        ${state.aiSuggestError ? `<div class="error-box" style="margin-top:10px;">${esc(state.aiSuggestError)}</div>` : ''}
        <div class="btn-row">
          <span class="btn-ghost btn" id="ai-back-btn">← Quay lại</span>
          <button class="btn" id="ai-submit-btn" ${(!canSubmitAiInput() || state.aiSuggestLoading) ? 'disabled' : ''}>${state.aiSuggestLoading ? 'Đang gợi ý…' : 'Gợi ý giúp mình'}</button>
        </div>
      </div>
    `;
  }

  function aiSuggestResultHtml() {
    const f = state.form;
    return `
      <h2>Gợi ý cho bạn</h2>
      <div style="font-size:13.5px;color:var(--ink-soft);margin-bottom:14px;">Chủ đề: <b>${esc(f.chuDe)}</b> · Đối tượng: <b>${esc(f.doiTuong)}</b></div>
      ${(f.aiSuggestions || []).map(s => {
        const opt = DINH_DANG_OPTIONS.find(o => o.value === s.dinh_dang);
        return `
          <div class="card" style="margin-bottom:10px;">
            <h2 style="font-size:16px;margin-bottom:6px;">${esc(opt ? opt.label : s.dinh_dang)}</h2>
            <div style="font-size:13.5px;color:var(--ink-soft);margin-bottom:6px;">${esc(s.ly_do)}</div>
            ${dinhDangInfoHtml(s.dinh_dang)}
            <div class="btn-row" style="margin-top:10px;"><span class="btn btn-sm" data-ai-choose="${esc(s.dinh_dang)}">Chọn loại này →</span></div>
          </div>
        `;
      }).join('')}
      <div class="btn-row"><span class="btn-ghost btn btn-sm" id="ai-switch-manual-btn">Không cái nào phù hợp — để mình tự chọn</span></div>
    `;
  }

  function canSubmitForm() {
    const f = state.form;
    return !!(f.nganh && f.chuDe.trim() && f.doiTuong.trim() && !f.materialUploading);
  }

  // Bước 2 — chủ đề/đối tượng cụ thể, SAU KHI đã chốt loại (dù tự chọn hay theo AI gợi ý).
  function formHtml() {
    const f = state.form;
    const opt = DINH_DANG_OPTIONS.find(o => o.value === f.dinhDang);
    const isOther = f.nganh && !NGANH_OPTIONS.includes(f.nganh);
    return `
      <h2>Chi tiết sản phẩm</h2>
      <div class="card">
        <div style="font-size:13.5px;color:var(--ink-soft);margin-bottom:14px;">Loại đã chọn: <b>${esc(opt ? opt.label : f.dinhDang)}</b> — <span id="cl-change-type-btn" style="cursor:pointer;text-decoration:underline;">Đổi loại khác</span></div>

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
          <span class="btn-ghost btn" id="cl-back-btn">← Quay lại</span>
          <button class="btn" id="cl-submit-btn" ${!canSubmitForm() ? 'disabled' : ''}>Tạo outline (5 lượt AI)</button>
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
    if (state.screen === 'loading' || state.screen === 'generating') return;
    if (state.screen === 'result') { bindResult(); return; }
    if (state.screen === 'ai-suggest-input') { bindAiSuggestInput(); return; }
    if (state.screen === 'ai-suggest-result') { bindAiSuggestResult(); return; }
    if (state.screen === 'form') { bindForm(); return; }
    bindPickType();
  }

  function bindActiveBanner() {
    container.querySelectorAll('[data-continue-active]').forEach(el => {
      el.onclick = () => {
        const p = state.activeProducts[Number(el.getAttribute('data-continue-active'))];
        window.renderXayDungNoiDung(container, p);
      };
    });
  }

  function bindPickType() {
    bindActiveBanner();
    container.querySelector('#pt-ai-btn').onclick = () => {
      state.form.screen = 'ai-suggest-input'; state.screen = 'ai-suggest-input'; persistFormDraft(); draw();
    };
    container.querySelectorAll('[data-pt-choose]').forEach(el => {
      el.onclick = () => {
        state.form.dinhDang = el.getAttribute('data-pt-choose');
        state.form.screen = 'form'; state.screen = 'form';
        persistFormDraft(); draw();
      };
    });
  }

  function bindAiSuggestInput() {
    const f = state.form;
    container.querySelectorAll('[data-ai-nganh]').forEach(el => {
      el.onclick = () => { f.nganh = el.getAttribute('data-ai-nganh'); f.showNganhOther = false; persistFormDraft(); draw(); };
    });
    const otherChip = container.querySelector('[data-ai-nganh-other]');
    if (otherChip) otherChip.onclick = () => { f.showNganhOther = true; f.nganh = ''; draw(); };
    const otherInput = container.querySelector('#ai-nganh-other-input');
    if (otherInput) otherInput.oninput = () => {
      f.nganh = otherInput.value;
      persistFormDraft();
      const btn = container.querySelector('#ai-submit-btn');
      if (btn) btn.disabled = !canSubmitAiInput();
    };
    const chuDeEl = container.querySelector('#ai-chude');
    chuDeEl.oninput = () => {
      f.chuDe = chuDeEl.value;
      persistFormDraft();
      const btn = container.querySelector('#ai-submit-btn');
      if (btn) btn.disabled = !canSubmitAiInput();
    };
    const doiTuongEl = container.querySelector('#ai-doituong');
    doiTuongEl.oninput = () => {
      f.doiTuong = doiTuongEl.value;
      persistFormDraft();
      const btn = container.querySelector('#ai-submit-btn');
      if (btn) btn.disabled = !canSubmitAiInput();
    };
    container.querySelector('#ai-back-btn').onclick = () => {
      f.screen = 'pick-type'; state.screen = 'pick-type'; persistFormDraft(); draw();
    };
    container.querySelector('#ai-submit-btn').onclick = runSuggestFormat;
  }

  function bindAiSuggestResult() {
    container.querySelectorAll('[data-ai-choose]').forEach(el => {
      el.onclick = () => {
        state.form.dinhDang = el.getAttribute('data-ai-choose');
        state.form.screen = 'form'; state.screen = 'form';
        persistFormDraft(); draw();
      };
    });
    container.querySelector('#ai-switch-manual-btn').onclick = () => {
      state.form.screen = 'pick-type'; state.screen = 'pick-type'; persistFormDraft(); draw();
    };
  }

  function bindForm() {
    const f = state.form;
    container.querySelector('#cl-change-type-btn').onclick = () => {
      f.screen = 'pick-type'; state.screen = 'pick-type'; persistFormDraft(); draw();
    };
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

    container.querySelector('#cl-back-btn').onclick = () => {
      f.screen = 'pick-type'; state.screen = 'pick-type'; persistFormDraft(); draw();
    };
    container.querySelector('#cl-submit-btn').onclick = runGenerateOutline;
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
      const saved = await saveIdeaResult({ result: { du_lieu_du_manh: true, canh_bao: '', phuong_an: [state.result] } }, state.pendingId);
      if (saved) state.pendingId = saved.id;
      state.editSaving = false;
      await chooseAndProceed();
    };
  }

  async function chooseAndProceed() {
    const f = state.form;
    const saved = await saveIdeaResult({
      nganh: f.nganh || null,
      answers: { nguon: 'chon_loai', nganh: f.nganh, dinh_dang_mong_muon: f.dinhDang, chu_de: f.chuDe, doi_tuong: f.doiTuong, tai_lieu_path: f.materialPath },
      result: { du_lieu_du_manh: true, canh_bao: '', phuong_an: [state.result] },
      chosen_index: 0,
    }, state.pendingId);
    window.renderXayDungNoiDung(container, saved);
  }

  async function runSuggestFormat() {
    state.aiSuggestLoading = true; state.aiSuggestError = null; draw();
    const stopProgress = animateProgressBar(container.querySelector('#ai-progress-el'), 15);
    try {
      const f = state.form;
      const data = await callApi('api/san-pham-so-goi-y-dinh-dang', { nganh: f.nganh, chuDe: f.chuDe, doiTuong: f.doiTuong }, 180000);
      if (!data.result || !Array.isArray(data.result.goi_y) || !data.result.goi_y.length) throw new Error('AI trả về kết quả không đúng định dạng — thử lại giúp mình.');
      f.aiSuggestions = data.result.goi_y;
      f.screen = 'ai-suggest-result'; state.screen = 'ai-suggest-result';
      persistFormDraft();
    } catch (e) {
      state.aiSuggestError = e.message || 'Có lỗi xảy ra — thử lại giúp mình.';
    }
    stopProgress();
    state.aiSuggestLoading = false;
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
      const saved = await saveIdeaResult({
        nganh: f.nganh || null,
        answers: { nguon: 'chon_loai', nganh: f.nganh, dinh_dang_mong_muon: f.dinhDang, chu_de: f.chuDe, doi_tuong: f.doiTuong, tai_lieu_path: f.materialPath },
        result: { du_lieu_du_manh: true, canh_bao: '', phuong_an: [state.result] },
        chosen_index: null,
      }, state.pendingId);
      if (saved) state.pendingId = saved.id;
      await clearDraft(FORM_DRAFT_KEY);
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
