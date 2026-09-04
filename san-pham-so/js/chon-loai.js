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
// la_gi/uu_diem/thach_thuc/phu_hop_neu: nội dung "Tìm hiểu thêm" — mở rộng sâu hơn hẳn 3 dòng tóm
// tắt ở trên, để người dùng thật sự cân nhắc kỹ trước khi chọn (Quỳnh 2026-09-01: "chi tiết từng
// thứ nhỏ cho các loại"). KHÔNG có giá tham khảo ở đây (Quỳnh xác nhận không cần) — giá tham khảo
// theo định dạng đã có sẵn ở màn "Sản phẩm của tôi" (danh-sach-san-pham.js), không lặp lại ở đây.
const DINH_DANG_ICON = {
  ebook: '📘', checklist_workbook: '✅', template_file_mau: '🧰', mini_course: '🎓',
  coaching_1_1: '🧑‍🏫', cong_dong_tra_phi: '👥', webinar: '🎥',
};
const DINH_DANG_INFO = {
  ebook: {
    khi_nao: 'Cần giải thích khái niệm/tư duy, hoặc 1 hành trình nhiều ngày/bước NHƯNG gộp chung 1 cuốn sách để tự đọc lần lượt (VD "21 ngày...") — khác mini_course ở chỗ không có video/buổi học riêng cho từng ngày, chỉ là chương mục trong cùng 1 file.',
    can_chuan_bi: 'AI tự viết (chọn "Tạo bằng AI"), hoặc tự upload file PDF sẵn có.',
    nguoi_mua_nhan: 'Link tải file PDF.',
    la_gi: '1 file PDF hoàn chỉnh, người mua đọc trên điện thoại hoặc máy tính — không cần cài thêm công cụ nào khác.',
    uu_diem: 'Làm nhanh nhất trong các loại — AI viết xong là xuất được luôn, không cần quay video/ghi âm, không phải làm gì thêm sau khi bán.',
    thach_thuc: 'Nội dung phải đủ chi tiết để người đọc tự làm được một mình — không có ai hướng dẫn trực tiếp nếu họ bị mắc kẹt giữa chừng.',
    phu_hop_neu: 'Bạn giỏi diễn đạt bằng chữ, và chủ đề có thể trình bày rõ ràng theo từng bước mà không cần hình ảnh/video minh hoạ.',
  },
  checklist_workbook: {
    khi_nao: 'Cần thực hành theo từng bước — có form/checklist để tự theo dõi tiến trình.',
    can_chuan_bi: 'AI tự viết (chọn "Tạo bằng AI"), hoặc tự upload file PDF sẵn có.',
    nguoi_mua_nhan: 'Link tải file PDF.',
    la_gi: 'Giống ebook nhưng thiên về biểu mẫu để điền/tích vào, không phải đọc-hiểu mà là làm-theo.',
    uu_diem: 'Người mua cảm thấy "dùng được ngay" rõ hơn ebook thuần chữ — dễ thấy giá trị nhanh, dễ tạo cảm giác hoàn thành.',
    thach_thuc: 'Phải chia nội dung thành từng bước hành động cụ thể, không chỉ lý thuyết — nếu chỉ liệt kê ý tưởng chung chung sẽ không có gì để "điền".',
    phu_hop_neu: 'Chủ đề của bạn có quy trình rõ ràng (ví dụ: làm trong 30 ngày, 5 bước, checklist trước khi làm gì đó).',
  },
  template_file_mau: {
    khi_nao: 'Cần công cụ tra cứu, dùng đi dùng lại nhiều lần (không phải đọc 1 lần rồi thôi).',
    can_chuan_bi: '1 link chia sẻ (Canva/Notion/Excel...) — không phải upload file, vì bản chất là link dùng lại nhiều lần.',
    nguoi_mua_nhan: 'Link mở template đó.',
    la_gi: '1 công cụ (thường là file Excel/Notion/Canva) người mua tải về và dùng đi dùng lại nhiều lần, không phải đọc 1 lần rồi cất đi.',
    uu_diem: 'Giá trị lâu dài với người mua nên dễ được đánh giá cao — bạn cũng gần như không cần cập nhật nội dung sau khi đã bán.',
    thach_thuc: 'Bạn cần tự chuẩn bị sẵn file công cụ đó (Excel/Notion/Canva...) — AI ở app này chỉ giúp viết outline/hướng dẫn cách dùng, không tự tạo ra file Excel/Notion thật.',
    phu_hop_neu: 'Bạn đã có sẵn 1 bảng tính/công cụ mình hay dùng, và thấy nhiều người khác cũng đang cần đúng thứ đó.',
  },
  mini_course: {
    khi_nao: 'Mỗi bài/ngày cần giao hàng RIÊNG bằng video/buổi học/file RIÊNG — khác ebook/checklist_workbook ở chỗ KHÔNG gộp chung 1 file, mỗi bài có link mở riêng.',
    can_chuan_bi: 'Danh sách nhiều bài học (mỗi bài: tên + link video/Zoom hoặc file).',
    nguoi_mua_nhan: '1 trang riêng liệt kê từng bài học + link mở từng bài.',
    la_gi: 'Nhiều bài học nhỏ có thứ tự, MỖI BÀI LÀ 1 FILE/LINK GIAO HÀNG RIÊNG (video bài giảng, buổi Zoom ghi hình, file riêng...) — khác hẳn 1 cuốn ebook/workbook có chia ngày nhưng vẫn là 1 file duy nhất.',
    uu_diem: 'Cảm giác "được đồng hành" rõ hơn hẳn 1 file đơn lẻ — khối lượng nội dung/công sức nhiều hơn nên thường được định giá cao hơn.',
    thach_thuc: 'Cần chuẩn bị nội dung RIÊNG cho TỪNG bài (video/buổi học/file riêng, không chỉ 1 file chung) — tốn công hơn ebook nhiều, và phải giữ chất lượng đều giữa các bài.',
    phu_hop_neu: 'Bạn THỰC SỰ có nội dung riêng cho từng ngày/buổi (video quay riêng, buổi live riêng...) cần giao link riêng — nếu chỉ là 1 cuốn sách chia theo ngày để tự đọc, chọn Ebook/Checklist-Workbook sẽ đúng hơn.',
  },
  coaching_1_1: {
    khi_nao: 'Cần hướng dẫn riêng theo từng người, gặp trực tiếp.',
    can_chuan_bi: '1 link đặt lịch (Calendly...).',
    nguoi_mua_nhan: 'Nút "Đặt lịch ngay" hiện sau khi thanh toán, dẫn tới link đó.',
    la_gi: 'Không phải 1 file cố định mà là buổi gặp trực tiếp (online/offline) giữa bạn và người mua — sản phẩm chính là chính bạn và thời gian của bạn.',
    uu_diem: 'Thường được định giá cao nhất trong các loại vì là kinh nghiệm cá nhân, không nhân bản/copy được như file.',
    thach_thuc: 'Không "bán xong là xong" — bạn phải có mặt cho từng buổi, nên không nhân rộng được nếu bán nhiều cùng lúc (giới hạn bởi chính thời gian của bạn).',
    phu_hop_neu: 'Bạn thoải mái nói chuyện trực tiếp, có kinh nghiệm thật để tư vấn theo đúng tình huống riêng của từng người, không phải nội dung chung chung ai cũng như ai.',
  },
  cong_dong_tra_phi: {
    khi_nao: 'Cần đồng hành lâu dài, hỏi đáp liên tục trong 1 nhóm.',
    can_chuan_bi: '1 link mời nhóm (Zalo/Telegram/Facebook).',
    nguoi_mua_nhan: 'Link mời nhóm (nên giới hạn thời gian dùng, giống link tải file).',
    la_gi: '1 nhóm kín (Zalo/Telegram/Facebook) người mua trả phí để tham gia, thường thu phí định kỳ theo tháng/quý.',
    uu_diem: 'Doanh thu đều đặn hàng tháng thay vì bán 1 lần rồi thôi — đồng thời xây được cộng đồng gắn bó lâu dài với bạn.',
    thach_thuc: 'Cần hoạt động/trả lời trong nhóm thường xuyên — 1 nhóm im lặng sẽ nhanh bị huỷ phí, đây là loại tốn công sức duy trì nhiều nhất trong 7 loại.',
    phu_hop_neu: 'Bạn có thời gian đều đặn để chăm nhóm, và thích tương tác/trả lời câu hỏi mỗi ngày hoặc mỗi tuần.',
  },
  webinar: {
    khi_nao: 'Cần 1 buổi học/sự kiện trực tiếp, tương tác thời gian thực.',
    can_chuan_bi: 'Ngày giờ diễn ra + link Zoom/Meet.',
    nguoi_mua_nhan: 'Trang chờ hiện đồng hồ đếm ngược, sau khi mua gửi link tham gia.',
    la_gi: '1 buổi học/chia sẻ trực tiếp online (Zoom/Meet) diễn ra vào đúng 1 thời điểm cố định, không phải nội dung xem lại bất cứ lúc nào.',
    uu_diem: 'Làm nhanh nhất để ra mắt — không cần viết nội dung dài trước, chỉ cần chuẩn bị dàn ý nói và tổ chức 1 buổi.',
    thach_thuc: 'Phụ thuộc vào đúng 1 thời điểm — người mua bận không tham dự được sẽ dễ khó chịu nếu bạn không có bản ghi lại; cần chọn giờ phù hợp với số đông.',
    phu_hop_neu: 'Bạn tự tin nói chuyện trực tiếp/livestream, và muốn ra mắt sản phẩm thật nhanh trước khi có nội dung hoàn chỉnh.',
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
    pendingId: null,
    // { [dinh_dang]: true } — loại nào đang mở "Tìm hiểu thêm" ở màn pick-type, chỉ là UI tạm, không
    // cần lưu draft.
    expandedTypes: {},
    // "📖 Đã có PDF hoàn chỉnh, biến thành sách lật" (2026-09-04) — nhánh RIÊNG, không qua
    // outline/AI/Giai đoạn 2 gì cả, hand-off thẳng sang "Sản phẩm của tôi" khi xong (xem
    // useAsProductFlipbook). materialPath ở đây là file CHÍNH (toàn bộ sản phẩm), khác hẳn
    // state.form.materialPath (chỉ là tài liệu THAM KHẢO tuỳ chọn cho bước tạo outline AI).
    flipbook: {
      title: '', materialPath: null, materialFileName: null, materialUploading: false, materialUploadError: null,
      generating: false, error: null, result: null,
    },
  };

  function persistFormDraft() {
    saveDraft(FORM_DRAFT_KEY, state.form);
  }

  function draw() { container.innerHTML = html(); bind(); }

  async function boot() {
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
    if (state.screen === 'flipbook') return flipbookHtml();
    if (state.screen === 'ebook-fork') return ebookForkHtml();
    return pickTypeHtml();
  }

  // Bảng tham khảo "cần chuẩn bị gì / người mua nhận được gì" cho 1 định dạng — dùng chung cho cả
  // danh sách chọn tay (pickTypeHtml) lẫn gợi ý của AI (aiSuggestResultHtml).
  function dinhDangInfoHtml(value) {
    const info = DINH_DANG_INFO[value];
    if (!info) return '';
    return `
      <div class="hint-box" style="margin-top:8px;margin-bottom:0;font-size:12.5px;">
        <div>🧩 <b>Cần chuẩn bị:</b> ${esc(info.can_chuan_bi)}</div>
        <div style="margin-top:4px;">🎁 <b>Người mua nhận được:</b> ${esc(info.nguoi_mua_nhan)}</div>
      </div>
    `;
  }

  // "Tìm hiểu thêm" — nội dung mở rộng, chỉ hiện khi bấm mở (Quỳnh 2026-09-01: cần chi tiết hơn hẳn,
  // như 1 phần kiến thức cho người dùng, không chỉ 2 dòng tóm tắt ở dinhDangInfoHtml).
  function dinhDangDetailHtml(value) {
    const info = DINH_DANG_INFO[value];
    if (!info) return '';
    return `
      <div style="margin-top:10px;padding-top:10px;border-top:1px dashed var(--line);font-size:13px;line-height:1.6;">
        <div style="margin-bottom:8px;"><b style="color:var(--accent);">Là gì:</b> ${esc(info.la_gi)}</div>
        <div style="margin-bottom:8px;"><b style="color:var(--accent);">Ưu điểm:</b> ${esc(info.uu_diem)}</div>
        <div style="margin-bottom:8px;"><b style="color:var(--accent);">Thách thức:</b> ${esc(info.thach_thuc)}</div>
        <div><b style="color:var(--accent);">Phù hợp nếu:</b> ${esc(info.phu_hop_neu)}</div>
      </div>
    `;
  }

  // MÀN CHÍNH của trang này — 7 loại sản phẩm số hiện NGAY, không ẩn sau bước nào khác. Tiêu đề/icon
  // mỗi loại làm nổi bật (màu accent, icon riêng) + có "Tìm hiểu thêm" mở rộng từng loại, theo đúng
  // phản hồi 2026-09-01: "làm rõ ràng hơn, chi tiết hơn... đầu mục làm nổi bật lên".
  function pickTypeHtml() {
    return `
      <h2>Chọn loại sản phẩm số</h2>
      <div class="hint-box">Dành cho người ĐÃ biết chủ đề/đối tượng muốn nhắm tới, chỉ cần chốt định dạng. Nếu chưa có ý tưởng gì cả, dùng "🧭 Tìm Sản Phẩm Phù Hợp" ở mục 1 sẽ hợp hơn.</div>
      <div class="card" style="margin-bottom:14px;">
        <div style="font-size:13.5px;color:var(--ink-soft);margin-bottom:8px;">📎 Đã có sẵn file PDF (tài liệu, hoặc sản phẩm đã viết xong)? Tải lên đây trước — dù chọn loại nào ở dưới hoặc để AI gợi ý, file này sẽ được dùng luôn, không cần tải lại.</div>
        <input id="pt-file-input" type="file" accept="application/pdf">
        <div style="font-size:13px;color:var(--ink-soft);margin-top:4px;">${state.form.materialUploading ? 'Đang tải lên…' : (state.form.materialFileName ? `📎 ${esc(state.form.materialFileName)} — đã tải lên ✓` : 'Chưa chọn file — không bắt buộc.')}</div>
        ${state.form.materialUploadError ? `<div class="error-box" style="margin-top:6px;">${esc(state.form.materialUploadError)}</div>` : ''}
      </div>
      <div class="card" style="margin-bottom:14px;">
        <div style="font-size:13.5px;color:var(--ink-soft);margin-bottom:10px;">Chưa chắc nên chọn loại nào? Để AI gợi ý dựa trên chủ đề/đối tượng bạn nhắm tới.</div>
        <button class="btn" id="pt-ai-btn">🤖 Để AI gợi ý loại phù hợp (1 lượt AI)</button>
      </div>
      ${DINH_DANG_OPTIONS.map(o => {
        const expanded = !!state.expandedTypes[o.value];
        return `
        <div class="card" style="margin-bottom:10px;">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
            <span style="font-size:22px;line-height:1;">${DINH_DANG_ICON[o.value] || ''}</span>
            <h2 style="font-size:18px;color:var(--accent);margin:0;">${esc(o.label)}</h2>
          </div>
          <div style="font-size:13.5px;color:var(--ink);margin-bottom:2px;">${esc((DINH_DANG_INFO[o.value] || {}).khi_nao || '')}</div>
          ${dinhDangInfoHtml(o.value)}
          <div style="margin-top:10px;display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;">
            <span data-pt-toggle="${esc(o.value)}" style="cursor:pointer;color:var(--accent);font-size:13px;text-decoration:underline;">${expanded ? '▲ Ẩn bớt' : '🔍 Tìm hiểu thêm'}</span>
            <button class="btn btn-sm" data-pt-choose="${esc(o.value)}">Chọn loại này →</button>
          </div>
          ${expanded ? dinhDangDetailHtml(o.value) : ''}
        </div>
      `;
      }).join('')}
    `;
  }

  // Ebook LUÔN giao hàng dạng sách lật (Heyzine) — theo đúng chỉ đạo Quỳnh 2026-09-04: "nó phải ở mục
  // Ebook chứ không phải 1 mục riêng". Chọn "Ebook" xong rẽ 2 nhánh RA SÁCH LẬT cả 2: AI viết nội dung
  // mới (→ form → outline → Giai đoạn 2 → tự xuất sách lật, xem xay-dung-noi-dung.js) hoặc đã có sẵn
  // PDF (→ flipbook, biến thẳng thành sách lật, không qua AI). Dùng CHUNG 1 hàm chooseDinhDang() cho
  // cả 2 chỗ chọn loại (tự chọn tay VÀ AI gợi ý) để hành vi nhất quán, không lệch nhau.
  function chooseDinhDang(value) {
    state.form.dinhDang = value;
    if (value === 'ebook') {
      state.screen = 'ebook-fork';
      state.form.screen = 'ebook-fork';
    } else {
      state.screen = 'form';
      state.form.screen = 'form';
    }
    persistFormDraft();
    draw();
  }

  function ebookForkHtml() {
    const hasUploaded = !!state.form.materialPath;
    return `
      <h2>📘 Ebook</h2>
      <div class="hint-box">Ebook trong app này luôn giao hàng dạng sách lật (Heyzine) — khách xem trực tiếp trên trình duyệt, không phải tải file thô về.</div>
      <div class="card" style="margin-bottom:10px;">
        <h2 style="font-size:16px;">✨ AI viết nội dung mới</h2>
        <div style="font-size:13.5px;color:var(--ink-soft);margin-bottom:10px;">${hasUploaded ? `Sẽ dùng file <b>${esc(state.form.materialFileName)}</b> đã tải làm nguồn tham khảo để AI viết nội dung mới bám sát nó.` : 'Chưa có sẵn nội dung — để AI giúp dựng outline rồi viết từng phần, sau đó tự xuất thành sách lật.'}</div>
        <button class="btn" id="ef-ai-btn">Tiếp tục với AI →</button>
      </div>
      <div class="card">
        <h2 style="font-size:16px;">📖 Đã có sẵn file PDF hoàn chỉnh</h2>
        <div style="font-size:13.5px;color:var(--ink-soft);margin-bottom:10px;">${hasUploaded ? `Dùng thẳng file <b>${esc(state.form.materialFileName)}</b> đã tải — biến ngay thành sách lật, không qua AI, không tốn lượt.` : 'Đã viết xong nội dung — chỉ cần biến ngay thành sách lật, không qua AI, không tốn lượt.'}</div>
        <button class="btn-ghost btn" id="ef-flipbook-btn">${hasUploaded ? 'Dùng file này, tạo sách lật →' : 'Tải PDF lên, tạo sách lật →'}</button>
      </div>
      <div class="btn-row"><span class="btn-ghost btn btn-sm" id="ef-back-btn">← Chọn loại khác</span></div>
    `;
  }

  function bindEbookFork() {
    container.querySelector('#ef-ai-btn').onclick = () => {
      state.screen = 'form'; state.form.screen = 'form'; persistFormDraft(); draw();
    };
    container.querySelector('#ef-flipbook-btn').onclick = () => {
      // Đã tải PDF sẵn từ đầu trang Chọn Loại (state.form.materialPath) → mang thẳng sang, khỏi bắt
      // tải lại lần 2 (2026-09-04, theo đúng yêu cầu Quỳnh: tải 1 lần ở đầu, dùng lại dù đi đường nào).
      if (state.form.materialPath) {
        state.flipbook.materialPath = state.form.materialPath;
        state.flipbook.materialFileName = state.form.materialFileName;
      }
      state.screen = 'flipbook'; draw();
    };
    container.querySelector('#ef-back-btn').onclick = () => {
      state.screen = 'pick-type'; state.form.screen = 'pick-type'; persistFormDraft(); draw();
    };
  }

  // "📖 Đã có PDF hoàn chỉnh, biến thành sách lật" — không đi qua outline/AI/Giai đoạn 2, KHÔNG lưu gì
  // vào product_idea_results (không phải 1 "ý tưởng" cần Giai đoạn 2 viết tiếp) — chỉ ký URL file đã
  // tải lên rồi gọi thẳng Heyzine (api/san-pham-so-pdf-thanh-sach-lat.js), xong hand-off thẳng sang
  // "Sản phẩm của tôi" như 1 sản phẩm ebook đã có link giao hàng sẵn.
  function flipbookHtml() {
    const f = state.flipbook;
    return `
      <h2>📖 Đã có PDF hoàn chỉnh</h2>
      <div class="hint-box">Không cần chọn loại hay tạo outline gì cả — tải file PDF đã hoàn chỉnh lên, app tự biến thành sách lật đẹp (Heyzine), sẵn sàng bán ngay. Không qua AI, không tốn lượt.</div>
      <div class="card">
        <label>Tên sản phẩm</label>
        <input id="fb-title" type="text" value="${esc(f.title)}" placeholder="VD: 21 Ngày Chuyển Nghiệp Tài Chính">
        <label style="margin-top:14px;">File PDF</label>
        <input id="fb-file" type="file" accept="application/pdf">
        <div style="font-size:13px;color:var(--ink-soft);margin-top:4px;">${f.materialUploading ? 'Đang tải lên…' : (f.materialFileName ? `📎 ${esc(f.materialFileName)} — đã tải lên ✓` : 'Chưa chọn file.')}</div>
        ${f.materialUploadError ? `<div class="error-box" style="margin-top:6px;">${esc(f.materialUploadError)}</div>` : ''}
        ${f.error ? `<div class="error-box" style="margin-top:10px;">${esc(f.error)}</div>` : ''}
        <div class="btn-row">
          <span class="btn-ghost btn" id="fb-back-btn">← Quay lại</span>
          <button class="btn" id="fb-generate-btn" ${(!f.materialPath || !f.title.trim() || f.generating) ? 'disabled' : ''}>${f.generating ? 'Đang tạo sách lật…' : '📖 Tạo sách lật'}</button>
        </div>
      </div>
      ${f.result ? `
        <div class="card">
          <h2 style="font-size:16px;">✅ Sách lật đã tạo xong</h2>
          ${f.result.thumbnail ? `<img src="${esc(f.result.thumbnail)}" style="max-width:140px;border-radius:8px;margin-bottom:10px;display:block;border:1px solid var(--line);">` : ''}
          <div class="btn-row" style="margin-top:0;">
            <a class="btn-ghost btn" href="${esc(f.result.heyzineUrl)}" target="_blank" rel="noopener">Xem thử sách lật →</a>
            <span class="btn" id="fb-use-btn">✅ Dùng làm sản phẩm để bán</span>
          </div>
        </div>
      ` : ''}
    `;
  }

  function bindFlipbook() {
    const f = state.flipbook;
    container.querySelector('#fb-back-btn').onclick = () => { state.screen = 'pick-type'; draw(); };
    // KHÔNG gọi draw() ở đây — draw() vẽ lại toàn bộ innerHTML, xoá mất ô đang gõ dở khiến con trỏ bị
    // đẩy về cuối/mất focus sau MỖI ký tự gõ (lỗi thật Quỳnh phát hiện 2026-09-04). Chỉ cần cập nhật
    // đúng trạng thái disabled của nút, đúng pattern #cl-chude/#cl-doituong ở bindForm() cùng file này.
    const titleEl = container.querySelector('#fb-title');
    if (titleEl) titleEl.oninput = () => {
      f.title = titleEl.value;
      const btn = container.querySelector('#fb-generate-btn');
      if (btn) btn.disabled = !f.materialPath || !f.title.trim() || f.generating;
    };
    const fileEl = container.querySelector('#fb-file');
    if (fileEl) fileEl.onchange = async () => {
      const file = fileEl.files[0];
      if (!file) return;
      if (file.type !== 'application/pdf') { f.materialUploadError = 'Chỉ nhận file PDF.'; draw(); return; }
      f.materialUploading = true; f.materialUploadError = null; draw();
      try {
        const { uploadUrl, path } = await callApi('api/san-pham-so-upload-material-url', { file_name: file.name });
        const putResp = await fetch(uploadUrl, { method: 'PUT', headers: { 'content-type': 'application/pdf' }, body: file });
        if (!putResp.ok) throw new Error('Upload file thất bại — thử lại giúp mình.');
        f.materialPath = path; f.materialFileName = file.name;
      } catch (e) {
        f.materialUploadError = e.message;
      }
      f.materialUploading = false;
      draw();
    };
    const genBtn = container.querySelector('#fb-generate-btn');
    if (genBtn) genBtn.onclick = async () => {
      f.generating = true; f.error = null; draw();
      try {
        const data = await callApi('api/san-pham-so-pdf-thanh-sach-lat', { materialPath: f.materialPath, title: f.title }, 200000);
        f.result = { heyzineUrl: data.heyzineUrl, thumbnail: data.thumbnail };
      } catch (e) {
        f.error = e.message || 'Có lỗi xảy ra — thử lại giúp mình.';
      }
      f.generating = false;
      draw();
    };
    const useBtn = container.querySelector('#fb-use-btn');
    if (useBtn) useBtn.onclick = async () => {
      await saveDraft('san-pham-so', {
        id: null, title: f.title, description: '', price: '',
        cover_image_url: null, file_storage_path: null, file_name: null,
        external_link: f.result.heyzineUrl, published: false,
        dinh_dang: 'ebook', mini_course_lessons: [], webinar_datetime: '',
      });
      location.hash = 'san-pham';
    };
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
        const expanded = !!state.expandedTypes[s.dinh_dang];
        return `
          <div class="card" style="margin-bottom:10px;">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
              <span style="font-size:22px;line-height:1;">${DINH_DANG_ICON[s.dinh_dang] || ''}</span>
              <h2 style="font-size:18px;color:var(--accent);margin:0;">${esc(opt ? opt.label : s.dinh_dang)}</h2>
            </div>
            <div style="font-size:13.5px;color:var(--ink);margin-bottom:2px;">${esc(s.ly_do)}</div>
            ${dinhDangInfoHtml(s.dinh_dang)}
            <div style="margin-top:10px;display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;">
              <span data-pt-toggle="${esc(s.dinh_dang)}" style="cursor:pointer;color:var(--accent);font-size:13px;text-decoration:underline;">${expanded ? '▲ Ẩn bớt' : '🔍 Tìm hiểu thêm'}</span>
              <button class="btn btn-sm" data-ai-choose="${esc(s.dinh_dang)}">Chọn loại này →</button>
            </div>
            ${expanded ? dinhDangDetailHtml(s.dinh_dang) : ''}
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

        <label style="margin-top:14px;">Tài liệu (PDF, tuỳ chọn — nếu có sẵn, AI sẽ bám sát nội dung thật trong đó để VIẾT NỘI DUNG MỚI, không phải đăng nguyên file này lên bán)</label>
        <input id="cl-file-input" type="file" accept="application/pdf">
        <div style="font-size:13px;color:var(--ink-soft);margin-top:4px;">${f.materialUploading ? 'Đang tải lên…' : (f.materialFileName ? `📎 ${esc(f.materialFileName)} — đã tải lên ✓` : 'Chưa chọn file.')}</div>
        ${f.materialUploadError ? `<div class="error-box" style="margin-top:6px;">${esc(f.materialUploadError)}</div>` : ''}
        <div class="hint-box" style="margin-top:10px;">📦 File này đã HOÀN CHỈNH, sẵn sàng bán ngay, không cần AI viết thêm? Khỏi cần tải lên đây — vào thẳng <a href="#san-pham">"🛒 Sản phẩm của tôi"</a>, tải file lên là xong.</div>

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
    if (state.screen === 'flipbook') { bindFlipbook(); return; }
    if (state.screen === 'ebook-fork') { bindEbookFork(); return; }
    bindPickType();
  }

  function bindPickType() {
    // Tải PDF NGAY từ đầu trang (2026-09-04, theo yêu cầu Quỳnh — dùng chung field materialPath/
    // materialFileName với bước form phía sau, KHÔNG tách state riêng, để dù chọn loại tay hay để AI
    // gợi ý, file đã tải vẫn còn nguyên khi tới bước sau, không phải tải lại lần 2). Dùng ĐÚNG pattern
    // upload đã có sẵn ở #cl-file-input (bindForm()).
    const f = state.form;
    const fileEl = container.querySelector('#pt-file-input');
    if (fileEl) fileEl.onchange = async () => {
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
    container.querySelector('#pt-ai-btn').onclick = () => {
      state.form.screen = 'ai-suggest-input'; state.screen = 'ai-suggest-input'; persistFormDraft(); draw();
    };
    container.querySelectorAll('[data-pt-toggle]').forEach(el => {
      el.onclick = () => {
        const v = el.getAttribute('data-pt-toggle');
        state.expandedTypes[v] = !state.expandedTypes[v];
        draw();
      };
    });
    container.querySelectorAll('[data-pt-choose]').forEach(el => {
      el.onclick = () => chooseDinhDang(el.getAttribute('data-pt-choose'));
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
    container.querySelectorAll('[data-pt-toggle]').forEach(el => {
      el.onclick = () => {
        const v = el.getAttribute('data-pt-toggle');
        state.expandedTypes[v] = !state.expandedTypes[v];
        draw();
      };
    });
    container.querySelectorAll('[data-ai-choose]').forEach(el => {
      el.onclick = () => chooseDinhDang(el.getAttribute('data-ai-choose'));
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
      // .length: AI đôi khi bỏ sót outline_cap_1 dù schema bắt buộc (forced tool_choice không ép
      // buộc tuyệt đối, cùng lớp lỗi đã gặp ở tim-san-pham.js) — Array.isArray([]) vẫn true nên chỉ
      // check kiểu mảng không đủ, phải chặn NGAY ở đây, không để lọt xuống "Bắt đầu xây nội dung" rồi
      // tốn oan 3 lượt AI ở outline2 mà không hiểu vì sao (lỗi thật, Quỳnh phát hiện 2026-09-04).
      if (!data.result || !Array.isArray(data.result.outline_cap_1) || !data.result.outline_cap_1.length) throw new Error('AI trả về outline rỗng — thử lại giúp mình (bấm "Tạo outline" lần nữa).');
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
