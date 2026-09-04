// Sản Phẩm Số — "✨ Tạo Sản Phẩm Bằng AI", Giai đoạn 1: Tìm Sản Phẩm Phù Hợp (Ikigai rút gọn, 12 câu
// /5 nhóm). Mô phỏng chặt kiến trúc wizard của Định Vị (nhan-hieu/js/dinh-vi.js): 1 câu/màn, gợi ý
// AI miễn phí/câu (1 lần), 1 lượt AI tổng hợp cuối ra kết quả có thể sửa tay. Khi đã chọn 1 phương
// án, giao thẳng cho Giai đoạn 2 (window.renderXayDungNoiDung, xem xay-dung-noi-dung.js) — không
// cần rời màn hình, không cần copy-paste tay.
//
// 2026-09-04: gộp nhánh "đã có tài liệu" vào THẲNG luồng 11 câu hỏi, không còn là 1 lựa chọn tách
// biệt bỏ qua wizard nữa (Quỳnh: "cái mục tải tài liệu kiến thức lên thì cho vào mục tìm ý tưởng
// luôn vì như thế cũng là tìm ý tưởng, chứ 11 câu hỏi cũng cần thiết khi làm sản phẩm mà" — xác nhận
// qua AskUserQuestion: thêm bước tải tài liệu TUỲ CHỌN ngay đầu wizard, vẫn trả lời đủ 11 câu, AI
// dùng CẢ tài liệu (nếu có) LẪN câu trả lời để tổng hợp). Bỏ hẳn màn "choose-path" + màn form riêng
// cho tài liệu + endpoint api/tim-san-pham-tu-tai-lieu.js (đã xoá) — chỉ còn 1 endpoint
// api/tim-san-pham-phu-hop.js nhận thêm materialPath tuỳ chọn.
(function () {
const WIZARD_DRAFT_KEY = 'tim-san-pham-wizard';
const SUGGEST_LIMIT_PER_QUESTION = 1;

// NGANH_OPTIONS/DINH_DANG_OPTIONS chuyển sang san-pham-so/js/util.js (2026-09-01) — dùng chung với
// màn "Chọn Loại Sản Phẩm Số" (san-pham-so/js/chon-loai.js), tránh 2 danh sách lệch nhau về sau.

const GROUPS = [
  { key: 'N', title: 'Ngành' },
  { key: 'A', title: 'Con Người & Kênh' },
  { key: 'B', title: 'Vấn Đề & Thị Trường' },
  { key: 'C', title: 'Đối Tượng & Bằng Chứng Trả Tiền' },
  { key: 'D', title: 'Khả Năng & Sở Thích' },
];

// Thứ tự CỐ Ý: d1 (đối tượng cụ thể) đứng TRƯỚC c2 ("hỏi 3 người trong nhóm đối tượng đó") — c2
// nhắc tới "nhóm đối tượng đó" nên phải hỏi RÕ đối tượng là ai trước, nếu không câu hỏi c2 vô nghĩa
// (góp ý Quỳnh 2026-08-25, thứ tự cũ bị ngược). d3 (giờ rảnh/tuần) đã bỏ — không quan trọng bằng
// các câu còn lại, cắt bớt cho wizard gọn hơn.
const QUESTIONS = [
  { id: 'nganh', group: 'N', type: 'nganh', q: 'Sản phẩm này nên thuộc ngành/lĩnh vực nào?' },
  { id: 'a1', group: 'A', type: 'textarea', q: 'Bạn đang có kênh nào chưa (Facebook/TikTok/Zalo...)? Nếu có, khoảng bao nhiêu người theo dõi, họ thường quan tâm chủ đề gì nhất?', placeholder: 'Ví dụ: Có 1 nhóm Zalo ~200 người, hầu hết hỏi về cách quản lý chi tiêu khi mới có con nhỏ...' },
  { id: 'a2', group: 'A', type: 'textarea', q: 'Mọi người hay nhắn hỏi/nhờ bạn giúp điều gì nhất?' },
  { id: 'a3', group: 'A', type: 'textarea', q: 'Bạn tự học/luyện điều gì đủ lâu tới mức thành phản xạ, làm không cần nghĩ?' },
  { id: 'b1', group: 'B', type: 'textarea', q: 'Vấn đề đó, mọi người đang tự xử lý thế nào? Đã ai làm tốt chưa?' },
  { id: 'b2', group: 'B', type: 'textarea', q: 'Bạn biết ai đang bán sản phẩm/dịch vụ gần giống chưa? Họ làm chưa tốt ở đâu mà bạn nghĩ mình có thể làm khác/tốt hơn?' },
  { id: 'b3', group: 'B', type: 'textarea', q: 'Dạy người mới điều này trong 7-21 ngày, có chia được thành các bước nhỏ rõ ràng không? Thử liệt kê 3 bước.' },
  { id: 'c1', group: 'C', type: 'textarea', q: 'Có ai từng trả tiền cho thứ gần giống chưa? Khoảng bao nhiêu?' },
  // 2026-09-04, Quỳnh: "thêm câu giá mong muốn đi" — có ở form tài liệu cũ (đã gộp/xoá, xem batch
  // merge cùng ngày) nhưng chưa từng có trong wizard 11 câu — AI không biết định giá tầm nào để canh
  // độ dài/độ sâu outline (ebook 99k khác hẳn mini-course 999k). TUỲ CHỌN — không chặn "Tiếp tục" nếu
  // để trống, dùng type riêng 'textarea_optional' (xem isAnswered/wizardHtml/bindWizard).
  { id: 'gia', group: 'C', type: 'textarea_optional', q: 'Bạn dự định bán sản phẩm này giá khoảng bao nhiêu? (không bắt buộc)', placeholder: 'VD: 149.000đ — để trống nếu chưa chắc' },
  { id: 'd1', group: 'C', type: 'textarea', q: 'Đối tượng cụ thể bạn nhắm tới là ai? (không viết "mọi người" — mô tả rõ độ tuổi/hoàn cảnh, VD "mẹ bỉm sữa mới sinh con đầu lòng")' },
  { id: 'c2', group: 'C', type: 'radio', q: 'Nếu hỏi thẳng 3 người trong nhóm đối tượng đó, họ sẽ...', options: ['Gật đầu ngay', 'Có thể, còn đắn đo', 'Chưa chắc'] },
  { id: 'd2', group: 'D', type: 'textarea', q: 'Trong những gì vừa kể, phần nào bạn thấy HÀO HỨNG nhất, làm không thấy mệt?' },
];

function isAnswered(q, val) {
  if (q.type === 'textarea') return !!(val && val.trim().length > 0);
  if (q.type === 'textarea_optional') return true; // tuỳ chọn — không chặn "Tiếp tục" dù để trống
  if (q.type === 'radio') return !!val;
  if (q.type === 'nganh') return !!val;
  return false;
}

function render(container, profile) {
  const state = {
    screen: 'loading', qIndex: 0, answers: {}, result: null, chosenIndex: null, error: null,
    suggestLoading: false, suggestionsByQ: {}, suggestCounts: {}, suggestError: null,
    editing: false, editForm: null, editSaving: false,
    // Tài liệu tuỳ chọn — tải 1 lần ở màn "wizard-intro" (đầu wizard), mang theo suốt tới lúc tổng
    // hợp kết quả (runGenerate() gửi kèm materialPath), KHÔNG phải 1 nhánh tách biệt bỏ qua 11 câu
    // hỏi nữa (xem comment đầu file, 2026-09-04).
    materialPath: null, materialFileName: null, materialUploading: false, materialUploadError: null,
    // id dòng product_idea_results "đang cân nhắc" (chosen_index null) hiện tại — null nếu chưa tạo
    // dòng nào (xem util.js: nhiều sản phẩm/user, không còn upsert-by-user_id nữa).
    pendingId: null,
  };

  function persistWizardDraft() {
    saveDraft(WIZARD_DRAFT_KEY, {
      qIndex: state.qIndex, answers: state.answers,
      materialPath: state.materialPath, materialFileName: state.materialFileName,
    });
  }

  function draw() { container.innerHTML = html(); bind(); }

  async function boot() {
    await bootFreshFlow();
  }

  async function bootFreshFlow() {
    const pending = await loadPendingIdeaResult();
    if (pending && pending.result) {
      state.result = pending.result;
      state.pendingId = pending.id;
      state.screen = 'result';
    } else {
      const wizardDraft = await loadDraft(WIZARD_DRAFT_KEY);
      if (wizardDraft) {
        state.qIndex = wizardDraft.qIndex || 0; state.answers = wizardDraft.answers || {};
        state.materialPath = wizardDraft.materialPath || null; state.materialFileName = wizardDraft.materialFileName || null;
        state.screen = 'wizard';
      } else {
        state.screen = 'wizard-intro';
      }
    }
    draw();
  }

  function html() {
    if (state.screen === 'loading') return `<div class="loading"><div class="spinner"></div></div>`;
    if (state.screen === 'generating') return `<div class="loading"><div id="tsp-progress-el">${progressBarHtml(0)}</div><p>Đang tổng hợp kết quả…</p></div>`;
    if (state.screen === 'result') return resultHtml();
    if (state.screen === 'wizard-intro') return wizardIntroHtml();
    return wizardHtml();
  }

  // Màn mở đầu — thiết kế lại 2026-09-04 (Quỳnh: "phần đầu đang bị không đẹp lắm, thiết kế cho hợp
  // mắt hơn"). Trước đó là 2 hint-box cùng màu xếp chồng + input file trần trụi — dồn hết vào 1 card
  // chính có phân cấp rõ (tiêu đề lớn → mô tả → khung tải tài liệu riêng biệt có viền đứt → nút CTA
  // to rõ ràng), 2 dòng chuyển hướng (đã biết loại/đã có file hoàn chỉnh) hạ xuống thành ghi chú nhỏ
  // bên dưới card thay vì cạnh tranh sự chú ý với nội dung chính. Tài liệu vẫn TUỲ CHỌN, không thay
  // thế 11 câu hỏi (xem comment đầu file) — bấm "Bắt đầu" luôn vào câu 1 dù có tải hay không.
  function wizardIntroHtml() {
    return `
      <div class="card">
        <h2 style="font-size:22px;margin-bottom:6px;">🧭 Tìm sản phẩm phù hợp</h2>
        <div style="font-size:14px;color:var(--ink-soft);margin-bottom:18px;">Trả lời 11 câu hỏi ngắn, AI sẽ gợi ý 2-3 sản phẩm số phù hợp với bạn kèm outline sẵn.</div>

        <div style="border:1px dashed var(--line);border-radius:10px;padding:16px;background:var(--accent-soft);">
          <label style="margin-top:0;font-size:13.5px;">📚 Đã có sẵn tài liệu/kiến thức? Tải lên đây</label>
          <div style="font-size:12.5px;color:var(--ink-soft);margin-bottom:8px;">Không bắt buộc — AI sẽ đọc tài liệu CÙNG VỚI câu trả lời của bạn để đề xuất sát hơn.</div>
          <input id="tsp-intro-file-input" type="file" accept="application/pdf">
          <div style="font-size:12.5px;color:var(--ink-soft);margin-top:6px;">${state.materialUploading ? 'Đang tải lên…' : (state.materialFileName ? `📎 ${esc(state.materialFileName)} — đã tải lên ✓` : 'Chưa chọn file.')}</div>
          ${state.materialUploadError ? `<div class="error-box" style="margin-top:6px;margin-bottom:0;">${esc(state.materialUploadError)}</div>` : ''}
        </div>

        <div class="btn-row">
          <button class="btn btn-full" id="tsp-intro-start-btn" ${state.materialUploading ? 'disabled' : ''}>Bắt đầu →</button>
        </div>
      </div>
      <div style="font-size:12.5px;color:var(--ink-soft);text-align:center;line-height:1.7;margin-top:2px;">
        Đã biết rõ chủ đề/đối tượng, chỉ cần chọn định dạng? <a href="#chon-loai">🗂️ Chọn Loại Sản Phẩm Số</a> sẽ nhanh hơn.<br>
        File đã HOÀN CHỈNH, sẵn sàng bán ngay? Vào thẳng <a href="#san-pham">🛒 Sản phẩm của tôi</a>, không cần qua bước này.
      </div>
    `;
  }

  function progressHtml() {
    const q = QUESTIONS[state.qIndex];
    const groupIndex = GROUPS.findIndex(g => g.key === q.group);
    return `
      <div class="progress-bar">
        ${GROUPS.map((g, i) => `<div class="progress-seg ${i < groupIndex ? 'done' : i === groupIndex ? 'current' : ''}"></div>`).join('')}
      </div>
      <div style="font-size:12px;color:var(--ink-soft);margin-bottom:14px;">Câu ${state.qIndex + 1}/${QUESTIONS.length} — ${esc(GROUPS[groupIndex].title)}</div>
    `;
  }

  function wizardHtml() {
    const q = QUESTIONS[state.qIndex];
    const val = state.answers[q.id];
    let inputHtml = '';
    if (q.type === 'textarea') {
      const suggestUsed = (state.suggestCounts[q.id] || 0) >= SUGGEST_LIMIT_PER_QUESTION;
      // Gợi ý đã fetch lưu theo ĐÚNG q.id (không phải 1 ô nhớ tạm chung, xem state.suggestionsByQ) —
      // 2026-09-04, Quỳnh: "khi ngta quay lại câu cũ xong trở lại câu trước đó thì ko xem đc gợi ý
      // nữa" — trước đây suggestions/suggestForQ bị XOÁ mỗi lần đổi qIndex (cả lùi lẫn tiến), trong khi
      // suggestCounts (giới hạn 1 lần/câu) thì KHÔNG bị xoá — quay lại 1 câu đã xem gợi ý sẽ thấy nút
      // bị khoá (đã dùng hết lượt) NHƯNG gợi ý cũ cũng không còn hiển thị, mất hẳn không xem lại được.
      const savedSuggestion = state.suggestionsByQ[q.id];
      inputHtml = `
        <textarea id="tsp-input" rows="4" placeholder="${esc(q.placeholder || '')}">${esc(val || '')}</textarea>
        <div style="font-size:12px;color:var(--ink-soft);margin-top:6px;">💡 Bí ý tưởng hoặc chưa biết trả lời cụ thể thế nào? Bấm "Xem gợi ý" để AI đưa 3 ví dụ đúng mức độ chi tiết cần có — không phải để copy nguyên văn, chỉ để dễ hình dung rồi viết câu trả lời thật của riêng bạn.</div>
        <div class="btn-row" style="margin-top:6px;">
          <span class="btn-ghost btn btn-sm" id="tsp-suggest-btn" ${(state.suggestLoading || suggestUsed) ? 'style="opacity:.5;pointer-events:none;"' : ''}>${state.suggestLoading ? 'Đang tạo gợi ý…' : '💡 Xem gợi ý'}</span>
        </div>
        ${savedSuggestion ? `
          <div class="hint-box" style="margin-top:8px;">
            ${savedSuggestion.map((s, i) => `<div style="margin-bottom:10px;">${esc(s)}<br><span class="btn-ghost btn btn-sm" data-use-suggestion="${i}" style="margin-top:4px;">Dùng làm gợi ý →</span></div>`).join('')}
          </div>
        ` : ''}
        ${state.suggestError ? `<div class="error-box" style="margin-top:8px;">${esc(state.suggestError)}</div>` : ''}
      `;
    } else if (q.type === 'textarea_optional') {
      // Câu ngắn, tuỳ chọn (VD giá mong muốn) — 1 dòng, không cần "Xem gợi ý" AI như các câu bắt buộc.
      inputHtml = `<input id="tsp-input" type="text" placeholder="${esc(q.placeholder || '')}" value="${esc(val || '')}">`;
    } else if (q.type === 'radio') {
      inputHtml = `<div class="chips">${q.options.map(o => `<div class="chip ${val === o ? 'selected' : ''}" data-radio="${esc(o)}">${esc(o)}</div>`).join('')}</div>`;
    } else if (q.type === 'nganh') {
      // Ô "tự nhập" LUÔN HIỆN SẴN, không phải chip "Khác" ẩn/hiện input nữa (2026-09-04, Quỳnh: "cho
      // ngta tự điền nó là 1 ô để tự điền luôn ko là bị lẫn ở các phần" — chip-bấm-để-hiện-ô dễ bị bỏ
      // sót/lẫn với các chip khác). Bấm 1 chip preset thì ô này tự trống lại (val khớp preset → isOther
      // false → value="" khi re-render), không cần logic showNganhOther riêng nữa.
      const isOther = val && !NGANH_OPTIONS.includes(val);
      inputHtml = `
        <div class="chips">
          ${NGANH_OPTIONS.map(o => `<div class="chip ${val === o ? 'selected' : ''}" data-nganh="${esc(o)}">${esc(o)}</div>`).join('')}
        </div>
        <input id="tsp-nganh-other-input" type="text" placeholder="Hoặc tự nhập ngành/lĩnh vực khác" value="${esc(isOther ? val : '')}" style="margin-top:8px;">
      `;
    }
    return `
      ${progressHtml()}
      <div class="card">
        <h2 style="font-size:18px;">${esc(q.q)}</h2>
        ${q.helper ? `<div style="font-size:13px;color:var(--ink-soft);margin-bottom:10px;">${esc(q.helper)}</div>` : ''}
        ${inputHtml}
        ${state.error ? `<div class="error-box" style="margin-top:10px;">${esc(state.error)}</div>` : ''}
        <div class="btn-row">
          ${state.qIndex > 0 ? `<span class="btn-ghost btn" id="tsp-back-btn">← Quay lại</span>` : ''}
          <button class="btn" id="tsp-next-btn" ${!isAnswered(q, val) ? 'disabled' : ''}>${state.qIndex === QUESTIONS.length - 1 ? 'Xem kết quả (8 lượt AI)' : 'Tiếp tục'}</button>
        </div>
      </div>
    `;
  }

  function phuongAnCardHtml(p, i) {
    return `
      <div class="card">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;">
          <h2 style="font-size:18px;">${esc(p.ten_san_pham)}</h2>
          <span class="btn-ghost btn btn-sm" data-edit-phuong-an="${i}">✏️ Tự sửa</span>
        </div>
        <div style="font-size:13.5px;color:var(--ink-soft);margin-bottom:10px;">
          <b>Đối tượng:</b> ${esc(p.doi_tuong)} · <b>Định dạng:</b> ${esc(p.dinh_dang)} · <b>Độ dài:</b> ${esc(p.do_dai_uoc_luong)}
        </div>
        <div style="font-size:13.5px;white-space:pre-line;margin-bottom:12px;">${esc(p.ly_do)}</div>
        <div style="font-size:13px;color:var(--ink-soft);margin-bottom:6px;"><b>Outline cấp 1:</b></div>
        <ol style="margin:0 0 12px;padding-left:20px;font-size:13.5px;">${(p.outline_cap_1 || []).map(o => `<li>${esc(o)}</li>`).join('')}</ol>
        <button class="btn" data-choose-phuong-an="${i}">Chọn phương án này →</button>
      </div>
    `;
  }

  function editPhuongAnHtml(i) {
    const p = state.editForm;
    return `
      <div class="card">
        <h2 style="font-size:18px;">Sửa phương án</h2>
        <label>Tên sản phẩm</label>
        <input id="edit-ten" type="text" value="${esc(p.ten_san_pham)}">
        <label>Đối tượng</label>
        <input id="edit-doi-tuong" type="text" value="${esc(p.doi_tuong)}">
        <label>Outline cấp 1 (mỗi dòng 1 phần)</label>
        <textarea id="edit-outline" rows="6">${esc((p.outline_cap_1 || []).join('\n'))}</textarea>
        ${state.error ? `<div class="error-box" style="margin-top:10px;">${esc(state.error)}</div>` : ''}
        <div class="btn-row">
          <button class="btn" id="edit-save-btn" ${state.editSaving ? 'disabled' : ''}>${state.editSaving ? 'Đang lưu…' : 'Lưu & chọn phương án này'}</button>
          <span class="btn-ghost btn" id="edit-cancel-btn">Huỷ</span>
        </div>
      </div>
    `;
  }

  function resultHtml() {
    const r = state.result;
    if (state.editing != null && typeof state.editing === 'number') return editPhuongAnHtml(state.editing);
    if (!r.du_lieu_du_manh) {
      return `
        <div class="card">
          <h2 style="font-size:18px;">Chưa đủ chắc để chốt</h2>
          <div class="hint-box" style="margin-top:8px;">${esc(r.canh_bao)}</div>
          <div class="btn-row"><span class="btn-ghost btn" id="tsp-redo-btn">Quay lại chỉnh sửa câu trả lời</span></div>
        </div>
      `;
    }
    return `
      <h2>Chọn 1 phương án phù hợp nhất</h2>
      ${state.error ? `<div class="error-box" style="margin-bottom:12px;">${esc(state.error)}</div>` : ''}
      ${(r.phuong_an || []).map((p, i) => phuongAnCardHtml(p, i)).join('')}
      <div class="btn-row"><span class="btn-ghost btn" id="tsp-redo-btn">Làm lại từ đầu</span></div>
    `;
  }

  function bind() {
    if (state.screen === 'result') { bindResult(); return; }
    if (state.screen === 'wizard-intro') { bindWizardIntro(); return; }
    if (state.screen !== 'wizard') return;
    bindWizard();
  }

  function bindWizardIntro() {
    const fileEl = container.querySelector('#tsp-intro-file-input');
    fileEl.onchange = async () => {
      const file = fileEl.files[0];
      if (!file) return;
      if (file.type !== 'application/pdf') { state.materialUploadError = 'Chỉ nhận file PDF.'; draw(); return; }
      state.materialUploading = true; state.materialUploadError = null; draw();
      try {
        const { uploadUrl, path } = await callApi('api/san-pham-so-upload-material-url', { file_name: file.name });
        const putResp = await fetch(uploadUrl, { method: 'PUT', headers: { 'content-type': 'application/pdf' }, body: file });
        if (!putResp.ok) throw new Error('Upload file thất bại — thử lại giúp mình.');
        state.materialPath = path; state.materialFileName = file.name;
        persistWizardDraft();
      } catch (e) {
        state.materialUploadError = e.message;
      }
      state.materialUploading = false;
      draw();
    };
    container.querySelector('#tsp-intro-start-btn').onclick = () => {
      state.screen = 'wizard'; persistWizardDraft(); draw();
    };
  }

  function bindWizard() {
    const q = QUESTIONS[state.qIndex];
    if (q.type === 'textarea') {
      const ta = container.querySelector('#tsp-input');
      ta.oninput = () => {
        state.answers[q.id] = ta.value;
        persistWizardDraft();
        const btn = container.querySelector('#tsp-next-btn');
        if (btn) btn.disabled = !isAnswered(q, ta.value);
      };
      const suggestBtn = container.querySelector('#tsp-suggest-btn');
      if (suggestBtn) suggestBtn.onclick = fetchSuggestion;
      container.querySelectorAll('[data-use-suggestion]').forEach(el => {
        el.onclick = () => {
          const i = Number(el.getAttribute('data-use-suggestion'));
          state.answers[q.id] = state.suggestionsByQ[q.id][i];
          persistWizardDraft();
          draw();
        };
      });
    } else if (q.type === 'textarea_optional') {
      const input = container.querySelector('#tsp-input');
      input.oninput = () => { state.answers[q.id] = input.value; persistWizardDraft(); };
    } else if (q.type === 'radio') {
      container.querySelectorAll('[data-radio]').forEach(el => {
        el.onclick = () => { state.answers[q.id] = el.getAttribute('data-radio'); persistWizardDraft(); draw(); };
      });
    } else if (q.type === 'nganh') {
      container.querySelectorAll('[data-nganh]').forEach(el => {
        el.onclick = () => { state.answers[q.id] = el.getAttribute('data-nganh'); persistWizardDraft(); draw(); };
      });
      const otherInput = container.querySelector('#tsp-nganh-other-input');
      if (otherInput) otherInput.oninput = () => {
        state.answers[q.id] = otherInput.value;
        persistWizardDraft();
        const btn = container.querySelector('#tsp-next-btn');
        if (btn) btn.disabled = !isAnswered(q, otherInput.value);
      };
    }
    const backBtn = container.querySelector('#tsp-back-btn');
    if (backBtn) backBtn.onclick = () => { state.qIndex--; state.suggestError = null; draw(); };
    container.querySelector('#tsp-next-btn').onclick = () => {
      if (state.qIndex < QUESTIONS.length - 1) {
        state.qIndex++; state.suggestError = null;
        draw(); persistWizardDraft();
      } else {
        runGenerate();
      }
    };
  }

  function bindResult() {
    if (typeof state.editing === 'number') { bindEditForm(); return; }
    const redoBtn = container.querySelector('#tsp-redo-btn');
    if (redoBtn) redoBtn.onclick = async () => {
      if (!state.result.du_lieu_du_manh) { state.screen = 'wizard'; draw(); return; }
      if (!confirm('Làm lại từ đầu? Kết quả hiện tại sẽ bị xoá.')) return;
      await clearIdeaResultById(state.pendingId);
      state.pendingId = null;
      state.result = null; state.answers = {}; state.qIndex = 0;
      state.materialPath = null; state.materialFileName = null;
      state.screen = 'wizard-intro';
      draw();
    };
    container.querySelectorAll('[data-edit-phuong-an]').forEach(el => {
      el.onclick = () => {
        const i = Number(el.getAttribute('data-edit-phuong-an'));
        state.editing = i;
        state.editForm = JSON.parse(JSON.stringify(state.result.phuong_an[i]));
        state.error = null;
        draw();
      };
    });
    container.querySelectorAll('[data-choose-phuong-an]').forEach(el => {
      el.onclick = () => chooseAndProceed(Number(el.getAttribute('data-choose-phuong-an')));
    });
  }

  function bindEditForm() {
    container.querySelector('#edit-ten').oninput = (e) => { state.editForm.ten_san_pham = e.target.value; };
    container.querySelector('#edit-doi-tuong').oninput = (e) => { state.editForm.doi_tuong = e.target.value; };
    container.querySelector('#edit-outline').oninput = (e) => { state.editForm.outline_cap_1 = e.target.value.split('\n').map(s => s.trim()).filter(Boolean); };
    container.querySelector('#edit-cancel-btn').onclick = () => { state.editing = null; state.editForm = null; draw(); };
    container.querySelector('#edit-save-btn').onclick = async () => {
      if (!state.editForm.ten_san_pham.trim()) { state.error = 'Vui lòng nhập tên sản phẩm.'; draw(); return; }
      if (!state.editForm.outline_cap_1.length) { state.error = 'Outline cần ít nhất 1 phần.'; draw(); return; }
      state.editSaving = true; draw();
      const i = state.editing;
      state.result.phuong_an[i] = state.editForm;
      const saved = await saveIdeaResult({ result: state.result }, state.pendingId);
      if (saved) state.pendingId = saved.id;
      state.editSaving = false;
      await chooseAndProceed(i);
    };
  }

  async function chooseAndProceed(i) {
    // AI đôi khi bỏ sót field required dù schema đánh dấu bắt buộc (forced tool_choice không ép
    // buộc tuyệt đối) — nếu để lọt, Giai đoạn 2 sẽ chặn với lỗi kỹ thuật khó hiểu ("Thiếu thông tin
    // sản phẩm/outline cấp 1") ngay khi bấm "Xây outline chi tiết", muộn hơn nhiều và khó hiểu hơn so
    // với chặn NGAY tại đây, đúng lúc còn nút "✏️ Tự sửa" ngay trước mắt để bổ sung outline tay.
    const p = state.result.phuong_an[i];
    if (!Array.isArray(p.outline_cap_1) || !p.outline_cap_1.length) {
      state.error = 'Phương án này chưa có outline cấp 1 (AI bỏ sót) — bấm "✏️ Tự sửa" bên dưới để tự thêm outline trước khi chọn.';
      draw();
      return;
    }
    state.chosenIndex = i;
    const saved = await saveIdeaResult({ result: state.result, chosen_index: i }, state.pendingId);
    window.renderXayDungNoiDung(container, saved);
  }

  async function fetchSuggestion() {
    const q = QUESTIONS[state.qIndex];
    if ((state.suggestCounts[q.id] || 0) >= SUGGEST_LIMIT_PER_QUESTION) return;
    state.suggestCounts[q.id] = (state.suggestCounts[q.id] || 0) + 1;
    state.suggestLoading = true; state.suggestError = null; draw();
    try {
      const data = await callApi('api/tim-san-pham-goi-y', { question: q.q, previousAnswers: state.answers }, 150000);
      const viDu = data && data.result && data.result.vi_du;
      if (!viDu || !viDu.length) throw new Error('AI không trả về gợi ý — thử bấm lại giúp mình.');
      state.suggestionsByQ[q.id] = viDu;
    } catch (e) {
      state.suggestError = e.message;
    } finally {
      state.suggestLoading = false; draw();
    }
  }

  async function runGenerate() {
    state.screen = 'generating'; state.error = null; draw();
    const stopProgress = animateProgressBar(container.querySelector('#tsp-progress-el'), 50);
    try {
      // materialPath tuỳ chọn (tải ở màn "wizard-intro") gửi kèm 11 câu trả lời — server (xem
      // api/tim-san-pham-phu-hop.js) đọc THÊM tài liệu này nếu có, không thay thế câu trả lời.
      const data = await callApi('api/tim-san-pham-phu-hop', { answers: state.answers, materialPath: state.materialPath || null }, 250000);
      if (!data.result || !Array.isArray(data.result.phuong_an) || (data.result.du_lieu_du_manh && !data.result.phuong_an.length)) throw new Error('AI trả về kết quả không đúng định dạng — thử lại giúp mình.');
      state.result = data.result;
      await clearDraft(WIZARD_DRAFT_KEY);
      const saved = await saveIdeaResult({
        nganh: state.answers.nganh || null,
        // tai_lieu_path lưu lại (nếu có tải) để Giai đoạn 2 (xay-dung-noi-dung.js) dùng lại đúng tài
        // liệu này khi viết nội dung thật, không chỉ dùng 1 lần ở bước tìm ý tưởng rồi bỏ.
        answers: { ...state.answers, tai_lieu_path: state.materialPath || null },
        result: state.result, chosen_index: null,
      }, state.pendingId);
      if (saved) state.pendingId = saved.id;
      state.screen = 'result';
    } catch (e) {
      // Bọc cả lỗi render (không chỉ lỗi gọi API) — nếu không, màn hình sẽ đứng im ở "Đang tổng hợp
      // kết quả…" vô thời hạn khi có bug hiếm gặp lúc dựng HTML kết quả, thay vì báo lỗi rõ ràng.
      state.error = e.message || 'Có lỗi xảy ra — thử lại giúp mình.';
      state.screen = 'wizard';
    }
    stopProgress();
    try {
      draw();
    } catch (e) {
      state.result = null; state.screen = 'wizard'; state.error = 'Có lỗi khi hiển thị kết quả — thử lại giúp mình.';
      draw();
    }
  }

  boot();
}

window.SanPhamSoScreens = window.SanPhamSoScreens || {};
window.SanPhamSoScreens['tao-ai'] = render;
})();
