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
    hidden_sections: [],
  };
}

// 2026-09-07 (Quỳnh: "mỗi phần ladipage mẫu người dùng chọn thì sẽ có mục xóa phần nào đó nếu người
// dùng ko có dữ liệu") — CÁC MỤC AI VIẾT 1 KHỐI CHỮ (không có nút thêm/xoá từng dòng như bonus_items/
// team_members/case_study_images — những mục ĐÓ đã tự ẩn khi mảng rỗng, không cần công tắc riêng). 7
// mục này AI luôn điền sẵn khi viết landing page nên không thể "để trống" tự nhiên — cần công tắc ẩn
// tay khi người bán thấy không phù hợp/không muốn hiện.
const HIDEABLE_SECTIONS = [
  { key: 'van_de', label: 'Vấn đề' },
  { key: 'chuong_trinh', label: 'Lộ trình / chương trình' },
  { key: 'ket_qua', label: 'Kết quả đạt được' },
  { key: 'loi_nhan', label: 'Lời nhắn của bạn' },
  { key: 've_nguoi_ban', label: 'Về người bán' },
  { key: 'phu_hop', label: 'Phù hợp với ai' },
  { key: 'faq', label: 'Câu hỏi thường gặp' },
];

// Mẫu giao diện landing page công khai (san-pham-so/p/) — style.css có 3 khối CSS tương ứng, chọn
// bằng [data-lp-template]. Xem trước bằng chính trang mua THẬT qua <iframe src="p/?demo=1&tpl=...">
// (2026-09-02, Quỳnh: "phải cho người ta xem 1 mẫu thật chứ không phải giả") — không phải hình vẽ
// minh hoạ, mà là đúng code/CSS thật sẽ hiện cho khách, chỉ khác dữ liệu là mẫu dựng sẵn.
// 2026-09-03 — 4 BỐ CỤC THẬT (không phải 3 biến thể màu na ná nhau như bản trước), mỗi mẫu lấy cảm
// hứng rõ rệt từ 1 trang landing page thật Quỳnh gửi (nội dung vẫn luôn là dữ liệu thật của người
// bán, không sao chép chữ/thương hiệu của các trang đó — xem chú thích BANNER_TEMPLATES ở p/script.js).
const LP_TEMPLATES = [
  { value: 'quynh', label: 'Quỳnh gốc', desc: 'Kem/serif, có nhãn nhỏ trên mỗi mục — đúng mẫu 30 Ngày Tâm Linh Tài Chính.' },
  { value: 'video', label: 'Nổi bật', desc: 'Nền tối, hồng rực, hero riêng, vấn đề đánh số 01/02/03 — kiểu khoá học video viral.' },
  { value: 'sach', label: 'Sách/ebook', desc: 'Nền đen, vàng gold, chương trình dạng lưới mục lục — kiểu trang bán sách.' },
  { value: 'chuyengia', label: 'Chuyên gia', desc: 'Nền trắng sạch, tím indigo, thẻ "Phần" viền rõ — kiểu khoá học cho coach/chuyên gia.' },
];
const MAX_CASE_STUDIES = 6;
const MAX_PROOF_IMAGES = 6;
const MAX_TEAM_MEMBERS = 6;
// Tương thích sản phẩm đã lỡ chọn tên mẫu CŨ (classic/bold/minimal, trước 2026-09-03) — khớp đúng
// hàm normalizeTemplate() ở san-pham-so/p/script.js.
function normalizeTemplate(t) {
  if (t === 'classic') return 'quynh';
  if (t === 'bold') return 'video';
  if (t === 'minimal') return 'sach';
  if (t === 'video' || t === 'sach' || t === 'chuyengia' || t === 'quynh') return t;
  return 'quynh';
}

// 11 ngân hàng SePay hỗ trợ kết nối tự động thật (2026-09-07, xem schema_san_pham_so.sql mục 30) —
// PHẢI khớp SEPAY_BANKS ở san-pham-so/js/tai-khoan.js / SEPAY_BANKS_BY_BIN ở san-pham-so/p/script.js,
// đổi 1 chỗ thì phải đổi cả 3.
const SEPAY_BANKS = [
  { bin: '970436', name: 'Vietcombank' }, { bin: '970418', name: 'BIDV' }, { bin: '970415', name: 'VietinBank' },
  { bin: '970422', name: 'MBBank' }, { bin: '970416', name: 'ACB' }, { bin: '970432', name: 'VPBank' },
  { bin: '970423', name: 'TPBank' }, { bin: '970403', name: 'Sacombank' }, { bin: '970426', name: 'MSB' },
  { bin: '970448', name: 'OCB' }, { bin: '970452', name: 'KienLongBank' },
];
const SELLER_WEBHOOK_URL = 'https://hieu-ai-os-dashboard.vercel.app/api/san-pham-so-seller-webhook';

// Tổng giá trị = cộng đúng những mục CÓ số (gia == null/'' -> "Vô giá", không tính vào tổng) — dùng cả
// lúc hiện live trong editor lẫn lúc tính reference_price để lưu (xem valueStackItems, mục 31 schema).
function valueStackTotal(state) {
  return state.valueStackItems.reduce((sum, v) => sum + (v.gia === '' || v.gia == null ? 0 : Number(v.gia) || 0), 0);
}

// Câu lệnh (prompt) để người bán tự viết nội dung landing page bằng Claude thay vì dùng nút "AI viết
// landing page" có sẵn (2026-09-17, Quỳnh: "hướng dẫn ng dùng nếu ko dùng app thì làm ladipgae như
// nào") — dành cho người hết lượt AI hoặc muốn tự viết theo cách riêng. Cấu trúc 14 bước hỏi + 12
// phần viết ra KHỚP ĐÚNG với cấu trúc landingPageIntroHtml()/TOOL_LANDING_PAGE (api/_lib/landing-page-schema.js)
// để nội dung dán vào manualEditFieldsHtml() bên dưới đúng chuẩn, không lệch cấu trúc.
const DIY_CLAUDE_PROMPT = `Bạn là chuyên gia viết landing page bán hàng tiếng Việt. Nhiệm vụ: giúp tôi tạo NỘI DUNG ĐẦY ĐỦ cho 1 trang landing page bán 1 sản phẩm số (ebook, khoá học online, template, coaching, cộng đồng trả phí, hoặc webinar).

QUY TẮC LÀM VIỆC:
- Hỏi tôi TỪNG BƯỚC MỘT theo đúng thứ tự dưới đây, chờ tôi trả lời xong bước này mới hỏi bước tiếp theo — KHÔNG hỏi dồn hết 1 lần.
- Nếu tôi trả lời "không có" hoặc để trống 1 mục, bỏ qua mục đó khi viết, không tự bịa thông tin giả.
- Toàn bộ văn phong: gần gũi, xưng "tôi/bạn" hoặc theo đúng cách tôi tự giới thiệu, không sáo rỗng, không hứa hẹn phóng đại (không viết "cam kết thu nhập", "chắc chắn thành công" trừ khi tôi tự nói rõ tôi muốn cam kết gì).

CÁC BƯỚC HỎI (theo đúng thứ tự):
1. Tên sản phẩm, giá bán, và mô tả ngắn (1-2 câu) sản phẩm này giúp được gì.
2. Đối tượng khách hàng: họ là ai, đang gặp vấn đề/nỗi đau cụ thể gì (hỏi 3-5 vấn đề cụ thể, càng chi tiết càng tốt — tránh chung chung).
3. Giải pháp/chương trình: nội dung sản phẩm gồm những phần/chặng nào (liệt kê từng phần + mô tả ngắn).
4. Kết quả khách đạt được sau khi dùng sản phẩm (liệt kê 3-6 kết quả cụ thể, đo lường được nếu có).
5. Câu chuyện cá nhân của tôi (người bán) — vì sao tôi làm sản phẩm này, tôi từng gặp vấn đề gì giống khách hàng không.
6. Case study/kết quả THẬT của khách cũ (nếu có) — tên khách + kết quả cụ thể của từng người (không bịa nếu tôi chưa có).
7. Sản phẩm này phù hợp với ai / không phù hợp với ai.
8. Ưu đãi tặng kèm (nếu có) — liệt kê từng món quà tặng kèm khi mua.
9. Giá trị theo từng mục: liệt kê TỪNG THỨ khách nhận được kèm giá trị quy đổi riêng (VD: "Ebook chính: 300.000đ", "Bonus X: 150.000đ", "Cộng đồng hỗ trợ: Vô giá") — để tôi tính tổng giá trị rồi đối lập với giá bán thật, KHÔNG dùng 1 con số "giá trị tham khảo" mơ hồ không giải thích.
10. Cam kết với khách (hoàn tiền, bảo hành...) — nếu không có thì bỏ qua, không tự bịa.
11. Số lượng có hạn/thời hạn ưu đãi (nếu có thật) — không bịa số giả tạo cảm giác khan hiếm ảo.
12. 4-6 câu hỏi thường gặp (FAQ) khách hay hỏi trước khi mua + câu trả lời.
13. Thông tin liên hệ hỗ trợ: số Zalo/điện thoại để khách nhắn nếu gặp lỗi lúc mua.
14. Câu kêu gọi hành động (nút mua) — muốn ghi gì trên nút (VD: "Mua ngay", "Đăng ký ngay", "Giữ chỗ ngay").

SAU KHI HỎI XONG HẾT 14 BƯỚC, viết lại toàn bộ landing page theo đúng cấu trúc sau (đúng thứ tự):
1. Hook — 1 câu mở đầu gây chú ý ngay, nêu đúng lợi ích/chuyển đổi chính (không phải tên sản phẩm).
2. Vấn đề — mở đầu 1 đoạn ngắn đồng cảm với khách, sau đó liệt kê từng vấn đề cụ thể (mỗi vấn đề 1 tên ngắn + mô tả).
3. Chương trình/giải pháp — liệt kê từng phần theo chương trình đã hỏi ở bước 3.
4. Kết quả đạt được — liệt kê ngắn gọn, dễ quét mắt.
5. Case study thật (nếu có).
6. Lời nhắn cá nhân — đoạn văn giọng cá nhân từ câu chuyện đã hỏi ở bước 5.
7. Về người bán — 1 đoạn giới thiệu ngắn.
8. Phù hợp với ai.
9. Ưu đãi tặng kèm + bảng giá trị từng mục + tổng giá trị + giá bán thật + số tiền tiết kiệm được.
10. Cam kết (nếu có).
11. FAQ.
12. Nút kêu gọi hành động + dòng liên hệ Zalo hỗ trợ ngay bên dưới.

Bắt đầu bằng cách hỏi tôi bước 1.`;

function newProductForm() {
  return { title: '', price: '', description: '', deliverableType: 'file', externalLink: '', fileStoragePath: null, fileName: null, fileUploading: false, error: null, saving: false };
}

function render(container) {
  const state = {
    screen: 'list', products: [], loading: true, selected: null, content: null, template: 'quynh',
    caseStudies: [], bonusItems: [], referencePrice: '', guaranteeText: '', caseStudyUploading: false, sellerPhotoUploading: false,
    proofImages: [], proofUploading: false, valueStackItems: [],
    sellerContactZalo: (currentProfile && currentProfile.sps_seller_contact_zalo) || '', sellerZaloSaving: false, sellerZaloSaved: false,
    teamMembers: [], statItems: [], metricItems: [], eventInfoItems: [], scarcityText: '', teamPhotoUploadingIndex: null,
    generating: false, saving: false, error: null, showManualEdit: false, showDiyClaude: false,
    // Tạo nhanh 1 sản phẩm NGAY TẠI ĐÂY (2026-09-02, Quỳnh: "người dùng không cần làm bước 1-2-3
    // cũng có thể làm trực tiếp landing page, với người đã có sẵn 1 sản phẩm chỉ cần trang landing
    // page để bán") — không bắt buộc phải vòng qua "Sản phẩm của tôi"/Chọn Loại/Viết Nội Dung trước.
    // Chỉ đủ trường tối thiểu để bán được (tên/giá/mô tả + 1 file hoặc 1 link) — sản phẩm tạo ra vẫn
    // nằm chung ở "Sản phẩm của tôi", có thể vào đó bổ sung thêm sau (ảnh bìa, loại chi tiết...).
    showQuickCreate: false, quickCreate: newProductForm(),
    // Kết nối SePay riêng NHÚNG THẲNG vào workflow tạo landing page (2026-09-07, Quỳnh: "cái phần kết
    // nối sepay cũng nằm trong workflow làm ladipage luôn, giống cách mình hướng dẫn họ kết nối
    // heyzine á") — cùng field/RPC với san-pham-so/js/tai-khoan.js (update_sps_seller_bank_info), chỉ
    // khác chỗ đặt (ngay trong màn này, không cần rời sang "Tài khoản"). KHÔNG bắt buộc như Heyzine
    // (chưa kết nối vẫn bán được bình thường, tiền chỉ đơn giản về TK chung của Quỳnh).
    sellerBankBin: (currentProfile && currentProfile.sps_seller_bank_bin) || '',
    sellerBankAccount: (currentProfile && currentProfile.sps_seller_bank_account) || '',
    sellerBankAccountName: (currentProfile && currentProfile.sps_seller_bank_account_name) || '',
    sellerBankSaving: false, sellerBankSaved: false, sellerBankError: null, sellerBankFormOpen: false,
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
        <label style="margin-bottom:10px;display:block;">🎨 4 mẫu giao diện có sẵn (xem trước thật) — chọn khi vào 1 sản phẩm cụ thể bên dưới</label>
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
    // Mỗi mẫu DÙNG KHÁC dữ liệu nhau (2026-09-07, Quỳnh: "có những mẫu cần người dùng cung cấp nhiều
    // thông tin hơn thế thì mục thông tin cần cung cấp nó phải nhiều hơn chứ") — trước đó mọi mẫu hiện
    // y hệt 1 danh sách 11 mục dù event_info_items/scarcity_text CHỈ "quynh" dùng, proof_images CHỈ
    // "sach" dùng — người chọn "Chuyên gia"/"Nổi bật" vẫn thấy 2 mục vô dụng với mẫu họ chọn. Giờ chỉ
    // hiện đúng mục mẫu đang chọn thật sự dùng tới (khớp đúng lpTemplate === '...' ở p/script.js).
    const isQuynh = state.template === 'quynh';
    const isSach = state.template === 'sach';
    return `
      <div class="card" style="margin-top:10px;">
        <label style="margin-bottom:10px;display:block;">2. Ảnh cá nhân của bạn (dùng chung cho mọi sản phẩm)${isQuynh ? ' — <b style="color:var(--danger);">bắt buộc cho mẫu Quỳnh gốc</b> (ảnh hiện ngay đầu trang, để trống sẽ trông thiếu)' : ' — không bắt buộc'}</label>
        <div style="display:flex;align-items:center;gap:14px;">
          ${photoUrl ? `<img src="${esc(photoUrl)}" style="width:64px;height:64px;border-radius:999px;object-fit:cover;border:1px solid var(--line);">` : `<div style="width:64px;height:64px;border-radius:999px;background:var(--accent-soft);flex:0 0 auto;"></div>`}
          <div>
            <input id="lp-seller-photo-input" type="file" accept="image/*" style="display:none;">
            <span class="btn-ghost btn btn-sm" id="lp-seller-photo-btn">${state.sellerPhotoUploading ? 'Đang tải…' : (photoUrl ? 'Đổi ảnh' : 'Tải ảnh lên')}</span>
          </div>
        </div>
        <label style="margin-top:14px;font-size:12.5px;font-weight:400;">Số Zalo hỗ trợ khách (dùng chung cho mọi sản phẩm — hiện ngay dưới form đặt hàng, để khách liên hệ nếu gặp lỗi khi mua) — không bắt buộc</label>
        <div style="display:flex;gap:8px;align-items:center;">
          <input id="lp-seller-zalo" type="text" value="${esc(state.sellerContactZalo)}" placeholder="VD: 0987654321" style="flex:1;">
          <button class="btn btn-sm" id="lp-seller-zalo-save" ${state.sellerZaloSaving ? 'disabled' : ''}>${state.sellerZaloSaving ? 'Đang lưu…' : 'Lưu'}</button>
        </div>
        ${state.sellerZaloSaved ? `<div style="font-size:12px;color:var(--ink-soft);margin-top:4px;">✓ Đã lưu.</div>` : ''}
      </div>
      <div class="card" style="margin-top:10px;">
        <label style="margin-bottom:10px;display:block;">3. Ảnh case study THẬT cho sản phẩm này (khách/học viên thật đã dùng, tối đa ${MAX_CASE_STUDIES} ảnh) — không bắt buộc</label>
        <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:10px;">
          ${state.caseStudies.map((c, i) => `
            <div style="width:130px;">
              <img src="${esc(c.url)}" style="width:130px;height:90px;object-fit:cover;border-radius:8px;border:1px solid var(--line);display:block;">
              <input type="text" data-cs-name="${i}" value="${esc(c.name || '')}" placeholder="Tên khách hàng, VD: Chị Lan" style="margin-top:4px;font-size:12px;padding:6px 8px;">
              <input type="text" data-cs-caption="${i}" value="${esc(c.caption || '')}" placeholder="Kết quả đạt được, VD: Giảm 5kg sau 2 tháng" style="margin-top:4px;font-size:12px;padding:6px 8px;">
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
      <div class="card" style="margin-top:10px;">
        <label style="margin-bottom:4px;display:block;">5. Giá trị theo từng mục (tuỳ chọn — liệt kê những gì khách nhận được kèm giá riêng, app tự cộng ra "Tổng giá trị" đối lập với giá bán, kiểu VD: Sách 349.000đ + Prompt 499.000đ + Cộng đồng: Vô giá = Tổng giá trị)</label>
        <div style="font-size:12px;color:var(--ink-soft);margin-bottom:10px;">Để trống ô "Giá" của 1 mục = hiện "Vô giá" thay vì số.</div>
        ${state.valueStackItems.map((v, i) => `
          <div style="display:flex;gap:8px;margin-bottom:8px;align-items:center;">
            <input type="text" data-vs-ten="${i}" value="${esc(v.ten || '')}" placeholder="VD: Sách AI Affiliate 2026" style="flex:1.6;">
            <input type="number" data-vs-gia="${i}" value="${v.gia == null ? '' : esc(v.gia)}" placeholder="Giá (để trống = Vô giá)" style="flex:1;">
            <span class="btn-ghost btn btn-sm" data-vs-remove="${i}" style="color:var(--danger);">Xoá</span>
          </div>
        `).join('')}
        <span class="btn-ghost btn btn-sm" id="lp-vs-add">+ Thêm mục giá trị</span>
        ${state.valueStackItems.length ? `<div id="lp-vs-total" style="margin-top:10px;font-size:13.5px;font-weight:600;">Tổng giá trị: ${valueStackTotal(state).toLocaleString('vi-VN')}đ</div>` : ''}
        <label style="margin-top:14px;font-size:12.5px;font-weight:400;">Cam kết với khách (VD hoàn tiền) — để trống nếu không muốn hứa gì</label>
        <input id="lp-guarantee" type="text" value="${esc(state.guaranteeText)}" placeholder="VD: Hoàn tiền 100% nếu không hài lòng trong 7 ngày">
      </div>
      <div class="card" style="margin-top:10px;">
        <label style="margin-bottom:10px;display:block;">6. Đội ngũ đứng sau (tuỳ chọn — nếu có ai khác cùng đồng hành/giảng dạy ngoài bạn, tối đa ${MAX_TEAM_MEMBERS} người)</label>
        ${state.teamMembers.map((m, i) => `
          <div style="border:1px solid var(--line);border-radius:8px;padding:10px;margin-bottom:8px;display:flex;gap:10px;">
            ${m.photo_url ? `<img src="${esc(m.photo_url)}" style="width:56px;height:56px;border-radius:999px;object-fit:cover;flex:0 0 auto;">` : `<div style="width:56px;height:56px;border-radius:999px;background:var(--accent-soft);flex:0 0 auto;"></div>`}
            <div style="flex:1;">
              <input type="text" data-team-name="${i}" value="${esc(m.name || '')}" placeholder="Tên" style="margin-bottom:6px;">
              <input type="text" data-team-role="${i}" value="${esc(m.role || '')}" placeholder="Vai trò (VD: Đồng giảng dạy)" style="margin-bottom:6px;">
              <textarea data-team-bio="${i}" rows="2" placeholder="Vài dòng giới thiệu">${esc(m.bio || '')}</textarea>
              <div class="btn-row" style="margin-top:6px;">
                <input type="file" accept="image/*" data-team-photo-input="${i}" style="display:none;">
                <span class="btn-ghost btn btn-sm" data-team-photo-btn="${i}">${state.teamPhotoUploadingIndex === i ? 'Đang tải…' : (m.photo_url ? 'Đổi ảnh' : 'Tải ảnh')}</span>
                <span class="btn-ghost btn btn-sm" data-team-remove="${i}" style="color:var(--danger);">Xoá</span>
              </div>
            </div>
          </div>
        `).join('')}
        ${state.teamMembers.length < MAX_TEAM_MEMBERS ? `<span class="btn-ghost btn btn-sm" id="lp-team-add">+ Thêm người</span>` : ''}
      </div>
      <div class="card" style="margin-top:10px;">
        <label style="margin-bottom:10px;display:block;">7. Thống kê thật (tuỳ chọn — số liệu do bạn tự nhập, VD "5 năm kinh nghiệm", "200 học viên")</label>
        ${state.statItems.map((s, i) => `
          <div style="display:flex;gap:8px;margin-bottom:8px;align-items:center;">
            <input type="text" data-stat-number="${i}" value="${esc(s.number || '')}" placeholder="VD: 5 năm" style="flex:1;">
            <input type="text" data-stat-label="${i}" value="${esc(s.label || '')}" placeholder="VD: Kinh nghiệm" style="flex:1;">
            <span class="btn-ghost btn btn-sm" data-stat-remove="${i}" style="color:var(--danger);">Xoá</span>
          </div>
        `).join('')}
        <span class="btn-ghost btn btn-sm" id="lp-stat-add">+ Thêm số liệu</span>
      </div>
      <div class="card" style="margin-top:10px;">
        <label style="margin-bottom:10px;display:block;">8. Chỉ số trước/sau (tuỳ chọn — số liệu thật của khách/học viên bạn, VD "Số bài viết/tháng: 3 bài → 20 bài")</label>
        ${state.metricItems.map((m, i) => `
          <div style="display:flex;gap:8px;margin-bottom:8px;align-items:center;">
            <input type="text" data-metric-label="${i}" value="${esc(m.label || '')}" placeholder="Tên chỉ số" style="flex:1.4;">
            <input type="text" data-metric-before="${i}" value="${esc(m.before || '')}" placeholder="Trước" style="flex:1;">
            <input type="text" data-metric-after="${i}" value="${esc(m.after || '')}" placeholder="Sau" style="flex:1;">
            <span class="btn-ghost btn btn-sm" data-metric-remove="${i}" style="color:var(--danger);">Xoá</span>
          </div>
        `).join('')}
        <span class="btn-ghost btn btn-sm" id="lp-metric-add">+ Thêm chỉ số</span>
      </div>
      ${isQuynh ? `
      <div class="card" style="margin-top:10px;">
        <label style="margin-bottom:10px;display:block;">9. Thông tin lịch học/sự kiện — <b>riêng cho mẫu Quỳnh gốc</b> (chỉ dùng cho sản phẩm dạng khoá học/buổi học có lịch cụ thể, VD "📅 20:00 tối, ngày 18/08" hoặc "⏱ 30 ngày · 4 buổi Zoom") — không bắt buộc, để trống thì khối này tự ẩn</label>
        ${state.eventInfoItems.map((e, i) => `
          <div style="display:flex;gap:8px;margin-bottom:8px;align-items:center;">
            <input type="text" data-event-icon="${i}" value="${esc(e.icon || '')}" placeholder="Icon (VD: 📅)" style="flex:0 0 90px;">
            <input type="text" data-event-text="${i}" value="${esc(e.text || '')}" placeholder="VD: 20:00 tối, ngày 18/08/2026" style="flex:1;">
            <span class="btn-ghost btn btn-sm" data-event-remove="${i}" style="color:var(--danger);">Xoá</span>
          </div>
        `).join('')}
        <span class="btn-ghost btn btn-sm" id="lp-event-add">+ Thêm dòng thông tin</span>
      </div>
      <div class="card" style="margin-top:10px;">
        <label style="margin-bottom:10px;display:block;">10. Dòng cảnh báo số lượng có hạn — <b>riêng cho mẫu Quỳnh gốc</b> (VD "Chỉ 30 chỗ mỗi khóa · Ưu tiên người đăng ký sớm") — không bắt buộc, để trống thì khối này tự ẩn</label>
        <input id="lp-scarcity" type="text" value="${esc(state.scarcityText)}" placeholder="VD: Chỉ 30 chỗ mỗi khóa">
      </div>
      ` : ''}
      ${isSach ? `
      <div class="card" style="margin-top:10px;">
        <label style="margin-bottom:10px;display:block;">9. Ảnh thực tế THẬT — <b>riêng cho mẫu Sách/ebook</b> (lớp học/buổi đào tạo/hoạt động thật — tối đa ${MAX_PROOF_IMAGES} ảnh, khác ảnh case study ở mục 3) — không bắt buộc, để trống thì khối này tự ẩn</label>
        <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:10px;">
          ${state.proofImages.map((c, i) => `
            <div style="width:130px;">
              <img src="${esc(c.url)}" style="width:130px;height:90px;object-fit:cover;border-radius:8px;border:1px solid var(--line);display:block;">
              <input type="text" data-proof-caption="${i}" value="${esc(c.caption || '')}" placeholder="VD: Buổi đào tạo tháng 6" style="margin-top:4px;font-size:12px;padding:6px 8px;">
              <span class="btn-ghost btn btn-sm" data-proof-remove="${i}" style="color:var(--danger);display:block;margin-top:4px;text-align:center;">Xoá</span>
            </div>
          `).join('')}
        </div>
        ${state.proofImages.length < MAX_PROOF_IMAGES ? `
          <input id="lp-proof-input" type="file" accept="image/*" style="display:none;">
          <span class="btn-ghost btn btn-sm" id="lp-proof-btn">${state.proofUploading ? 'Đang tải…' : '+ Thêm ảnh thực tế'}</span>
        ` : ''}
      </div>
      ` : ''}
    `;
  }

  // Cùng phong cách widget kết nối Heyzine nhúng thẳng ở chon-loai.js/xay-dung-noi-dung.js — thu gọn
  // form nhập liệu còn 1 dòng ✓ khi đã kết nối, mở đủ form khi chưa (KHÔNG bắt buộc, có thể bỏ qua và
  // bán bình thường). Khối URL Webhook + API Key hiện ĐỘC LẬP với form — LUÔN hiện khi đã có secret
  // (kể cả sau khi form đã thu gọn), không nằm lồng bên trong form — nếu không, vừa bấm "Lưu kết nối"
  // xong là card lập tức thu gọn qua nhánh ✓, làm mất luôn 2 giá trị người bán đang cần copy sang SePay
  // (bug thật phát hiện lúc test — xem lại phải giữ HIỆN LUÔN, không ẩn theo trạng thái đã kết nối hay
  // chưa). "Sửa lại" mở lại form khi cần đổi ngân hàng/số TK. Các bước cụ thể (menu/nút thật trong
  // dashboard SePay, xem docs.sepay.vn) — CÙNG MỨC CHI TIẾT với hướng dẫn Heyzine, mỗi dòng 1 thao tác.
  function sellerBankInlineHtml() {
    const p = currentProfile || {};
    const connected = !!(p.sps_seller_bank_bin && p.sps_seller_bank_account);
    const showForm = !connected || state.sellerBankFormOpen;
    const connectedHintHtml = connected
      ? `<div class="hint-box" style="margin-top:10px;">✓ Tiền bán hàng đang về thẳng ${esc(SEPAY_BANKS.find(b => b.bin === p.sps_seller_bank_bin)?.name || '')} — ${esc(p.sps_seller_bank_account)} của bạn. <span style="cursor:pointer;color:var(--accent);text-decoration:underline;" id="lp-seller-bank-edit-toggle">${state.sellerBankFormOpen ? 'Thu gọn' : 'Sửa lại'}</span></div>`
      : '';
    const formHtml = showForm ? `
      <div class="card" style="margin-top:10px;">
        <h2 style="font-size:14px;margin-bottom:6px;">💳 Nhận tiền trực tiếp về tài khoản của bạn (không bắt buộc)</h2>
        <div style="font-size:12.5px;color:var(--ink-soft);margin-bottom:10px;">Kết nối để tiền khách mua tự động về THẲNG tài khoản của bạn.</div>
        <div class="hint-box" style="margin-bottom:10px;">
          <b>Bước 1 — liên kết ngân hàng trên SePay:</b>
          <ol style="margin:6px 0 0;padding-left:20px;font-size:12.5px;line-height:1.7;">
            <li>Đăng ký tài khoản <b style="color:var(--accent);">SePay</b> miễn phí tại <a href="https://sepay.vn" target="_blank" rel="noopener">sepay.vn</a>.</li>
            <li>Vào mục <b style="color:var(--accent);">"Ngân hàng"</b> ở menu bên trái → bấm <b style="color:var(--accent);">"+ Kết nối tài khoản"</b> góc trên bên phải.</li>
            <li>Chọn đúng ngân hàng, điền Số tài khoản + Tên chủ tài khoản, làm theo hướng dẫn SePay hiện ra để hoàn tất.</li>
            <li>Quay lại đây, chọn ngân hàng + điền số TK/tên chủ TK bên dưới, bấm "Lưu kết nối".</li>
          </ol>
        </div>
        <label style="font-size:12.5px;">Ngân hàng</label>
        <select id="lp-seller-bank">
          <option value="">— Chọn ngân hàng —</option>
          ${SEPAY_BANKS.map(b => `<option value="${b.bin}" ${state.sellerBankBin === b.bin ? 'selected' : ''}>${esc(b.name)}</option>`).join('')}
        </select>
        <label style="margin-top:8px;font-size:12.5px;">Số tài khoản</label>
        <input id="lp-seller-bank-account" type="text" value="${esc(state.sellerBankAccount)}" placeholder="Số tài khoản ngân hàng của bạn">
        <label style="margin-top:8px;font-size:12.5px;">Tên chủ tài khoản</label>
        <input id="lp-seller-bank-name" type="text" value="${esc(state.sellerBankAccountName)}" placeholder="VD: NGUYEN VAN A (không dấu, in hoa)">
        ${state.sellerBankError ? `<div class="error-box" style="margin-top:8px;">${esc(state.sellerBankError)}</div>` : ''}
        <div class="btn-row">
          <button class="btn btn-sm" id="lp-seller-bank-save" ${state.sellerBankSaving ? 'disabled' : ''}>${state.sellerBankSaving ? 'Đang lưu…' : 'Lưu kết nối'}</button>
        </div>
      </div>
    ` : '';
    const webhookHtml = p.sps_seller_webhook_secret ? `
      <div class="hint-box" style="margin-top:10px;">
        <b>Bước 2 — tạo Webhook trong SePay:</b>
        <ol style="margin:6px 0 0;padding-left:20px;font-size:12.5px;line-height:1.7;">
          <li>Vào mục <b style="color:var(--accent);">"Lập trình & Tích hợp"</b> ở menu bên trái → chọn <b style="color:var(--accent);">"Tích hợp WebHooks"</b>.</li>
          <li>Bấm <b style="color:var(--accent);">"+ Thêm webhook"</b> góc trên bên phải.</li>
          <li>Đặt tên bất kỳ, chọn loại sự kiện <b style="color:var(--accent);">"Có tiền vào"</b> (không chọn "Cả hai").</li>
          <li>Dán URL bên dưới vào ô "nhập URL nhận webhook".</li>
          <li>Ở Phương thức xác thực chọn <b style="color:var(--accent);">"API Key"</b>, dán API Key bên dưới vào ô hiện ra.</li>
          <li>Bấm <b style="color:var(--accent);">"Thêm"</b> để hoàn tất.</li>
        </ol>
        <div style="font-size:12.5px;margin-top:8px;"><b>URL Webhook:</b> <span class="mono" style="font-size:11.5px;">${esc(SELLER_WEBHOOK_URL)}</span></div>
        <div style="font-size:12.5px;margin-top:4px;"><b>API Key:</b> <span class="mono" style="font-size:11.5px;">${esc(p.sps_seller_webhook_secret)}</span></div>
      </div>
    ` : '';
    return `${connectedHintHtml}${formHtml}${webhookHtml}`;
  }

  // "Không muốn dùng AI có sẵn? Tự viết bằng Claude" — thu gọn mặc định, dành cho người hết lượt AI
  // hoặc muốn tự viết theo cách riêng (2026-09-17). Bảng ánh xạ "dán vào đâu" khớp đúng nhãn từng ô
  // trong manualEditFieldsHtml() bên dưới để người dùng dán đúng chỗ, không đoán mò.
  function diyClaudeHtml() {
    return `
      <div class="card" style="margin-top:10px;">
        <span class="btn-ghost btn btn-sm" id="lp-toggle-diy-btn">${state.showDiyClaude ? '▲ Ẩn hướng dẫn tự viết bằng Claude' : '❓ Không muốn dùng AI có sẵn? Tự viết bằng Claude'}</span>
        ${state.showDiyClaude ? `
          <div style="margin-top:12px;">
            <div class="hint-box">
              <b>Cách dùng:</b>
              <ol style="margin:6px 0 0;padding-left:20px;font-size:13px;line-height:1.7;">
                <li>Vào <a href="https://claude.ai" target="_blank" rel="noopener">claude.ai</a> → đăng ký/đăng nhập.</li>
                <li>Dán toàn bộ câu lệnh bên dưới vào ô nhập tin nhắn, bấm gửi.</li>
                <li>Claude hỏi lần lượt 14 câu — trả lời từng câu như nhắn tin bình thường.</li>
                <li>Trả lời hết, Claude tự viết ra toàn bộ nội dung — quay lại đây, bấm <b>"✨ Tạo Landing Page bằng AI"</b> ở dưới 1 lần (bắt buộc, dù không dùng nội dung AI viết, để mở được ô tự sửa chữ), rồi mở <b>"✏️ Chỉnh sửa nội dung chữ"</b>, dán từng phần Claude viết vào đúng ô theo bảng dưới đây.</li>
              </ol>
            </div>
            <textarea readonly rows="6" style="font-size:12px;font-family:'IBM Plex Mono',monospace;" onclick="this.select()">${esc(DIY_CLAUDE_PROMPT)}</textarea>
            <div class="btn-row" style="margin-top:8px;"><span class="btn-ghost btn btn-sm" id="lp-copy-diy-prompt">Sao chép câu lệnh</span></div>
            <div class="hint-box" style="margin-top:10px;">
              <b>Dán vào đâu:</b>
              <table style="width:100%;font-size:12.5px;border-collapse:collapse;margin-top:6px;">
                <tr><td style="padding:3px 0;">1. Hook</td><td style="padding:3px 0;"><b>Hook (tiêu đề chính)</b></td></tr>
                <tr><td style="padding:3px 0;">2. Vấn đề</td><td style="padding:3px 0;"><b>Vấn đề — mở đầu</b> + <b>Vấn đề — chi tiết</b></td></tr>
                <tr><td style="padding:3px 0;">3. Chương trình</td><td style="padding:3px 0;"><b>Lộ trình / chương trình</b></td></tr>
                <tr><td style="padding:3px 0;">4. Kết quả</td><td style="padding:3px 0;"><b>Kết quả đạt được</b></td></tr>
                <tr><td style="padding:3px 0;">6. Lời nhắn cá nhân</td><td style="padding:3px 0;"><b>Lời nhắn của bạn</b></td></tr>
                <tr><td style="padding:3px 0;">7. Về người bán</td><td style="padding:3px 0;"><b>Về người bán</b></td></tr>
                <tr><td style="padding:3px 0;">8. Phù hợp với ai</td><td style="padding:3px 0;"><b>Phù hợp với ai</b></td></tr>
                <tr><td style="padding:3px 0;">11. FAQ</td><td style="padding:3px 0;"><b>Câu hỏi thường gặp (FAQ)</b></td></tr>
                <tr><td style="padding:3px 0;">12. Nút CTA</td><td style="padding:3px 0;"><b>Nút kêu gọi hành động (CTA)</b></td></tr>
              </table>
              <div style="margin-top:8px;color:var(--ink-soft);">Phần 5 (case study), 9 (ưu đãi/giá trị), 10 (cam kết), 13 (Zalo) không nằm trong ô chữ — điền tay ở các mục 2-5 phía trên khung này.</div>
            </div>
          </div>
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
      <div class="hint-box">
        <b>Thanh toán + thông tin khách hoạt động thế nào?</b> Khách bấm mua trên trang landing page sẽ tự điền Họ tên/SĐT/Email, quét mã QR chuyển khoản — hệ thống TỰ ĐỘNG xác nhận đã thanh toán trong vài giây, không cần bạn làm gì. Tiền về tài khoản chung nếu bạn chưa kết nối SePay riêng bên dưới, hoặc về thẳng tài khoản của bạn nếu đã kết nối. Xem lại danh sách khách đã mua + thông tin liên hệ của họ bất cứ lúc nào ở mục <b>"📦 Đơn hàng của tôi"</b> trong menu bên trái.
      </div>
      ${templatePickerHtml()}
      ${assetsHtml()}
      ${sellerBankInlineHtml()}
      <div class="card" style="margin-top:10px;">
        <label style="margin-bottom:10px;display:block;">9. AI viết landing page</label>
        <button class="btn" id="lp-generate-btn" ${state.generating ? 'disabled' : ''}>${state.generating ? 'Đang viết…' : (hasContent ? '🔄 Viết lại bằng AI (4 lượt)' : '✨ Tạo Landing Page bằng AI (4 lượt)')}</button>
        ${state.generating ? `<div id="lp-progress-el" style="margin-top:12px;">${progressBarHtml(0)}</div>` : ''}
        ${state.error ? `<div class="error-box" style="margin-top:10px;">${esc(state.error)}</div>` : ''}
        ${hasContent ? `<div class="btn-row" style="margin-top:12px;">${publicLinkHtml}</div>` : ''}
      </div>
      ${diyClaudeHtml()}
      ${hasContent ? `
        <div class="card" style="margin-top:10px;">
          <span class="btn-ghost btn btn-sm" id="lp-toggle-manual-btn">${state.showManualEdit ? '▲ Ẩn chỉnh sửa nội dung chữ' : '✏️ Chỉnh sửa nội dung chữ (không bắt buộc)'}</span>
          ${state.showManualEdit ? manualEditFieldsHtml(c) : ''}
        </div>
      ` : ''}
    `;
  }

  function namedListEditorHtml(items, tenAttr, moTaAttr, removeAttr, tenPlaceholder, moTaPlaceholder, nhomAttr) {
    return `
      <div>
        ${(items || []).map((it, i) => `
          <div style="border:1px solid var(--line);border-radius:8px;padding:10px;margin-bottom:8px;">
            <input type="text" data-${tenAttr}="${i}" value="${esc(it.ten || '')}" placeholder="${esc(tenPlaceholder)}" style="margin-bottom:6px;font-weight:600;">
            <textarea data-${moTaAttr}="${i}" rows="2" placeholder="${esc(moTaPlaceholder)}">${esc(it.mo_ta || '')}</textarea>
            ${nhomAttr ? `<input type="text" data-${nhomAttr}="${i}" value="${esc(it.nhom || '')}" placeholder="Tên nhóm lớn chứa phần này (không bắt buộc, VD: Phần 1: Tư duy)" style="margin-top:6px;font-size:12.5px;">` : ''}
            <span class="btn-ghost btn btn-sm" data-${removeAttr}="${i}" style="color:var(--danger);margin-top:6px;">Xoá</span>
          </div>
        `).join('')}
      </div>
    `;
  }

  function hiddenSectionsHtml(c) {
    const hidden = Array.isArray(c.hidden_sections) ? c.hidden_sections : [];
    return `
      <div style="margin-top:14px;padding:12px;border:1px solid var(--line);border-radius:8px;">
        <label style="margin-bottom:8px;display:block;">Ẩn bớt phần không có dữ liệu (tick vào phần muốn ẨN khỏi trang bán — mặc định mọi phần đều hiện)</label>
        ${HIDEABLE_SECTIONS.map(s => `
          <label style="display:flex;align-items:center;gap:8px;font-weight:400;margin-bottom:6px;">
            <input type="checkbox" data-hide-section="${s.key}" ${hidden.includes(s.key) ? 'checked' : ''} style="width:auto;">
            ${esc(s.label)}
          </label>
        `).join('')}
      </div>
    `;
  }

  function manualEditFieldsHtml(c) {
    return `
      <div style="margin-top:14px;">
        ${hiddenSectionsHtml(c)}
        <label style="margin-top:14px;">Hook (tiêu đề chính)</label>
        <input id="lp-hook" type="text" value="${esc(c.hook)}">

        <label style="margin-top:14px;">Vấn đề — mở đầu</label>
        <textarea id="lp-van-de-intro" rows="3">${esc(c.van_de_intro)}</textarea>

        <label style="margin-top:14px;">Vấn đề — chi tiết (mỗi vấn đề 1 tên riêng + mô tả)</label>
        <div id="lp-van-de-ct-list">${namedListEditorHtml(c.van_de_chi_tiet, 'vandect-ten', 'vandect-mota', 'vandect-remove', 'Tên vấn đề', 'Mô tả')}</div>
        <span class="btn-ghost btn btn-sm" id="lp-vandect-add">+ Thêm vấn đề</span>

        <label style="margin-top:14px;">Kết quả đạt được (mỗi dòng 1 ý)</label>
        <textarea id="lp-ket-qua" rows="4">${esc((c.ket_qua_dat_duoc || []).join('\n'))}</textarea>

        <label style="margin-top:14px;">Lộ trình / chương trình (mỗi phần 1 tên + mô tả)</label>
        <div id="lp-chuong-trinh-list">${namedListEditorHtml(c.chuong_trinh, 'ct-ten', 'ct-mota', 'ct-remove', 'Tên phần', 'Mô tả', 'ct-nhom')}</div>
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
    state.template = normalizeTemplate(p.landing_page_template);
    state.caseStudies = Array.isArray(p.case_study_images) ? [...p.case_study_images] : [];
    state.proofImages = Array.isArray(p.proof_images) ? [...p.proof_images] : [];
    state.bonusItems = Array.isArray(p.bonus_items) ? [...p.bonus_items] : [];
    state.referencePrice = p.reference_price || '';
    state.valueStackItems = Array.isArray(p.value_stack_items) ? [...p.value_stack_items] : [];
    state.guaranteeText = p.guarantee_text || '';
    state.teamMembers = Array.isArray(p.team_members) ? [...p.team_members] : [];
    state.statItems = Array.isArray(p.stat_items) ? [...p.stat_items] : [];
    state.metricItems = Array.isArray(p.metric_items) ? [...p.metric_items] : [];
    state.eventInfoItems = Array.isArray(p.event_info_items) ? [...p.event_info_items] : [];
    state.scarcityText = p.scarcity_text || '';
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

    const bankEditToggle = container.querySelector('#lp-seller-bank-edit-toggle');
    if (bankEditToggle) bankEditToggle.onclick = () => { state.sellerBankFormOpen = !state.sellerBankFormOpen; draw(); };
    const bankSelectEl = container.querySelector('#lp-seller-bank');
    if (bankSelectEl) bankSelectEl.onchange = () => { state.sellerBankBin = bankSelectEl.value; };
    const bankAccountEl = container.querySelector('#lp-seller-bank-account');
    if (bankAccountEl) bankAccountEl.oninput = () => { state.sellerBankAccount = bankAccountEl.value; };
    const bankNameEl = container.querySelector('#lp-seller-bank-name');
    if (bankNameEl) bankNameEl.oninput = () => { state.sellerBankAccountName = bankNameEl.value; };
    const bankSaveBtn = container.querySelector('#lp-seller-bank-save');
    if (bankSaveBtn) bankSaveBtn.onclick = async () => {
      state.sellerBankError = null;
      if (!state.sellerBankBin || !state.sellerBankAccount.trim() || !state.sellerBankAccountName.trim()) {
        state.sellerBankError = 'Cần chọn ngân hàng + nhập đủ số tài khoản và tên chủ tài khoản.'; draw(); return;
      }
      state.sellerBankSaving = true; draw();
      const { data, error } = await supabaseClient.rpc('update_sps_seller_bank_info', {
        p_bin: state.sellerBankBin, p_account: state.sellerBankAccount.trim(), p_account_name: state.sellerBankAccountName.trim(),
      });
      state.sellerBankSaving = false;
      if (error) { state.sellerBankError = error.message; }
      else if (currentProfile) {
        currentProfile.sps_seller_bank_bin = state.sellerBankBin;
        currentProfile.sps_seller_bank_account = state.sellerBankAccount.trim();
        currentProfile.sps_seller_bank_account_name = state.sellerBankAccountName.trim();
        currentProfile.sps_seller_webhook_secret = data;
      }
      draw();
    };

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

    const sellerZaloEl = container.querySelector('#lp-seller-zalo');
    if (sellerZaloEl) sellerZaloEl.oninput = () => { state.sellerContactZalo = sellerZaloEl.value; };
    const sellerZaloSaveBtn = container.querySelector('#lp-seller-zalo-save');
    if (sellerZaloSaveBtn) sellerZaloSaveBtn.onclick = async () => {
      state.sellerZaloSaved = false;
      state.sellerZaloSaving = true; draw();
      const { error } = await supabaseClient.rpc('update_sps_seller_contact', { p_contact_zalo: state.sellerContactZalo.trim() || null });
      state.sellerZaloSaving = false;
      if (error) { state.error = error.message; }
      else {
        if (currentProfile) currentProfile.sps_seller_contact_zalo = state.sellerContactZalo.trim() || null;
        state.sellerZaloSaved = true;
      }
      draw();
    };

    const vsAddBtn = container.querySelector('#lp-vs-add');
    if (vsAddBtn) vsAddBtn.onclick = () => { state.valueStackItems.push({ ten: '', gia: '' }); draw(); };
    container.querySelectorAll('[data-vs-ten]').forEach(el => {
      el.oninput = () => { state.valueStackItems[Number(el.getAttribute('data-vs-ten'))].ten = el.value; };
    });
    container.querySelectorAll('[data-vs-gia]').forEach(el => {
      // KHÔNG gọi draw() ở đây — draw() vẽ lại toàn bộ innerHTML, xoá mất ô đang gõ dở khiến con trỏ bị
      // đẩy về cuối/mất focus sau MỖI ký tự gõ (lỗi thật đã gặp ở chon-loai.js/fb-title trước đây).
      // Patch thẳng nội dung "Tổng giá trị" thay vì draw() lại toàn form.
      el.oninput = () => {
        state.valueStackItems[Number(el.getAttribute('data-vs-gia'))].gia = el.value;
        const totalEl = container.querySelector('#lp-vs-total');
        if (totalEl) totalEl.textContent = `Tổng giá trị: ${valueStackTotal(state).toLocaleString('vi-VN')}đ`;
      };
    });
    container.querySelectorAll('[data-vs-remove]').forEach(el => {
      el.onclick = () => { state.valueStackItems.splice(Number(el.getAttribute('data-vs-remove')), 1); draw(); };
    });

    const caseStudyBtn = container.querySelector('#lp-case-study-btn');
    const caseStudyInput = container.querySelector('#lp-case-study-input');
    if (caseStudyBtn) caseStudyBtn.onclick = () => caseStudyInput.click();
    if (caseStudyInput) caseStudyInput.onchange = async () => {
      const file = caseStudyInput.files[0];
      if (!file) return;
      state.caseStudyUploading = true; state.error = null; draw();
      try {
        const dataUrl = await compressImageToDataUrl(file, 900, 0.75);
        state.caseStudies.push({ url: dataUrl, name: '', caption: '' });
      } catch (e) {
        state.error = e.message || 'Tải ảnh thất bại — thử lại giúp mình.';
      }
      state.caseStudyUploading = false;
      draw();
    };
    container.querySelectorAll('[data-cs-name]').forEach(el => {
      el.oninput = () => { state.caseStudies[Number(el.getAttribute('data-cs-name'))].name = el.value; };
    });
    container.querySelectorAll('[data-cs-caption]').forEach(el => {
      el.oninput = () => { state.caseStudies[Number(el.getAttribute('data-cs-caption'))].caption = el.value; };
    });
    container.querySelectorAll('[data-cs-remove]').forEach(el => {
      el.onclick = () => { state.caseStudies.splice(Number(el.getAttribute('data-cs-remove')), 1); draw(); };
    });

    const proofBtn = container.querySelector('#lp-proof-btn');
    const proofInput = container.querySelector('#lp-proof-input');
    if (proofBtn) proofBtn.onclick = () => proofInput.click();
    if (proofInput) proofInput.onchange = async () => {
      const file = proofInput.files[0];
      if (!file) return;
      state.proofUploading = true; state.error = null; draw();
      try {
        const dataUrl = await compressImageToDataUrl(file, 900, 0.75);
        state.proofImages.push({ url: dataUrl, caption: '' });
      } catch (e) {
        state.error = e.message || 'Tải ảnh thất bại — thử lại giúp mình.';
      }
      state.proofUploading = false;
      draw();
    };
    container.querySelectorAll('[data-proof-caption]').forEach(el => {
      el.oninput = () => { state.proofImages[Number(el.getAttribute('data-proof-caption'))].caption = el.value; };
    });
    container.querySelectorAll('[data-proof-remove]').forEach(el => {
      el.onclick = () => { state.proofImages.splice(Number(el.getAttribute('data-proof-remove')), 1); draw(); };
    });

    const bonusEl = container.querySelector('#lp-bonus');
    if (bonusEl) bonusEl.oninput = () => { state.bonusItems = bonusEl.value.split('\n').map(s => s.trim()).filter(Boolean); };
    const guaranteeEl = container.querySelector('#lp-guarantee');
    if (guaranteeEl) guaranteeEl.oninput = () => { state.guaranteeText = guaranteeEl.value; };

    const teamAddBtn = container.querySelector('#lp-team-add');
    if (teamAddBtn) teamAddBtn.onclick = () => { state.teamMembers.push({ name: '', role: '', bio: '', photo_url: null }); draw(); };
    container.querySelectorAll('[data-team-name]').forEach(el => {
      el.oninput = () => { state.teamMembers[Number(el.getAttribute('data-team-name'))].name = el.value; };
    });
    container.querySelectorAll('[data-team-role]').forEach(el => {
      el.oninput = () => { state.teamMembers[Number(el.getAttribute('data-team-role'))].role = el.value; };
    });
    container.querySelectorAll('[data-team-bio]').forEach(el => {
      el.oninput = () => { state.teamMembers[Number(el.getAttribute('data-team-bio'))].bio = el.value; };
    });
    container.querySelectorAll('[data-team-remove]').forEach(el => {
      el.onclick = () => { state.teamMembers.splice(Number(el.getAttribute('data-team-remove')), 1); draw(); };
    });
    container.querySelectorAll('[data-team-photo-btn]').forEach(el => {
      const i = Number(el.getAttribute('data-team-photo-btn'));
      el.onclick = () => container.querySelector(`[data-team-photo-input="${i}"]`).click();
    });
    container.querySelectorAll('[data-team-photo-input]').forEach(el => {
      const i = Number(el.getAttribute('data-team-photo-input'));
      el.onchange = async () => {
        const file = el.files[0];
        if (!file) return;
        state.teamPhotoUploadingIndex = i; state.error = null; draw();
        try {
          state.teamMembers[i].photo_url = await compressImageToDataUrl(file, 400, 0.8);
        } catch (e) {
          state.error = e.message || 'Tải ảnh thất bại — thử lại giúp mình.';
        }
        state.teamPhotoUploadingIndex = null;
        draw();
      };
    });

    const statAddBtn = container.querySelector('#lp-stat-add');
    if (statAddBtn) statAddBtn.onclick = () => { state.statItems.push({ number: '', label: '' }); draw(); };
    container.querySelectorAll('[data-stat-number]').forEach(el => {
      el.oninput = () => { state.statItems[Number(el.getAttribute('data-stat-number'))].number = el.value; };
    });
    container.querySelectorAll('[data-stat-label]').forEach(el => {
      el.oninput = () => { state.statItems[Number(el.getAttribute('data-stat-label'))].label = el.value; };
    });
    container.querySelectorAll('[data-stat-remove]').forEach(el => {
      el.onclick = () => { state.statItems.splice(Number(el.getAttribute('data-stat-remove')), 1); draw(); };
    });

    const metricAddBtn = container.querySelector('#lp-metric-add');
    if (metricAddBtn) metricAddBtn.onclick = () => { state.metricItems.push({ label: '', before: '', after: '' }); draw(); };
    container.querySelectorAll('[data-metric-label]').forEach(el => {
      el.oninput = () => { state.metricItems[Number(el.getAttribute('data-metric-label'))].label = el.value; };
    });
    container.querySelectorAll('[data-metric-before]').forEach(el => {
      el.oninput = () => { state.metricItems[Number(el.getAttribute('data-metric-before'))].before = el.value; };
    });
    container.querySelectorAll('[data-metric-after]').forEach(el => {
      el.oninput = () => { state.metricItems[Number(el.getAttribute('data-metric-after'))].after = el.value; };
    });
    container.querySelectorAll('[data-metric-remove]').forEach(el => {
      el.onclick = () => { state.metricItems.splice(Number(el.getAttribute('data-metric-remove')), 1); draw(); };
    });

    const eventAddBtn = container.querySelector('#lp-event-add');
    if (eventAddBtn) eventAddBtn.onclick = () => { state.eventInfoItems.push({ icon: '', text: '' }); draw(); };
    container.querySelectorAll('[data-event-icon]').forEach(el => {
      el.oninput = () => { state.eventInfoItems[Number(el.getAttribute('data-event-icon'))].icon = el.value; };
    });
    container.querySelectorAll('[data-event-text]').forEach(el => {
      el.oninput = () => { state.eventInfoItems[Number(el.getAttribute('data-event-text'))].text = el.value; };
    });
    container.querySelectorAll('[data-event-remove]').forEach(el => {
      el.onclick = () => { state.eventInfoItems.splice(Number(el.getAttribute('data-event-remove')), 1); draw(); };
    });
    const scarcityEl = container.querySelector('#lp-scarcity');
    if (scarcityEl) scarcityEl.oninput = () => { state.scarcityText = scarcityEl.value; };

    container.querySelector('#lp-generate-btn').onclick = async () => {
      state.generating = true; state.error = null; draw();
      const stopProgress = animateProgressBar(container.querySelector('#lp-progress-el'), 25);
      try {
        // Lưu mẫu + ảnh case study + bonus TRƯỚC (không mất nếu bước AI lỗi giữa chừng), rồi mới gọi
        // AI viết chữ — AI viết xong tự PATCH landing_page_content luôn
        // (api/san-pham-so-tao-landing-page.js), không cần bấm "Lưu" riêng cho luồng chính (Quỳnh:
        // "90% chỉ là tải thông tin lên thôi").
        await callApi('api/san-pham-so-product', { action: 'update_landing_page', id: state.selected.id, landing_page_content: state.content, landing_page_template: state.template, case_study_images: state.caseStudies, bonus_items: state.bonusItems, guarantee_text: state.guaranteeText || null, reference_price: valueStackTotal(state) > 0 ? valueStackTotal(state) : (Number(state.referencePrice) || null), value_stack_items: state.valueStackItems, team_members: state.teamMembers, stat_items: state.statItems, metric_items: state.metricItems, event_info_items: state.eventInfoItems, scarcity_text: state.scarcityText || null, proof_images: state.proofImages });
        const data = await callApi('api/san-pham-so-tao-landing-page', { product_id: state.selected.id, template: state.template }, 180000);
        state.content = { ...newContent(), ...data.result };
        state.selected.landing_page_content = state.content;
        state.selected.landing_page_template = state.template;
        state.selected.case_study_images = state.caseStudies;
        state.selected.bonus_items = state.bonusItems;
        state.selected.guarantee_text = state.guaranteeText || null;
        state.selected.reference_price = valueStackTotal(state) > 0 ? valueStackTotal(state) : (Number(state.referencePrice) || null);
        state.selected.value_stack_items = state.valueStackItems;
        state.selected.team_members = state.teamMembers;
        state.selected.stat_items = state.statItems;
        state.selected.metric_items = state.metricItems;
      } catch (e) {
        state.error = e.message || 'Có lỗi xảy ra — thử lại giúp mình.';
      }
      stopProgress();
      state.generating = false;
      draw();
    };

    const toggleDiyBtn = container.querySelector('#lp-toggle-diy-btn');
    if (toggleDiyBtn) toggleDiyBtn.onclick = () => { state.showDiyClaude = !state.showDiyClaude; draw(); };
    const copyDiyBtn = container.querySelector('#lp-copy-diy-prompt');
    if (copyDiyBtn) copyDiyBtn.onclick = () => { navigator.clipboard.writeText(DIY_CLAUDE_PROMPT); };

    const toggleManualBtn = container.querySelector('#lp-toggle-manual-btn');
    if (toggleManualBtn) toggleManualBtn.onclick = () => { state.showManualEdit = !state.showManualEdit; draw(); };
    if (!state.showManualEdit) return;

    container.querySelectorAll('[data-hide-section]').forEach(el => {
      el.onchange = () => {
        const key = el.getAttribute('data-hide-section');
        const hidden = new Set(Array.isArray(state.content.hidden_sections) ? state.content.hidden_sections : []);
        if (el.checked) hidden.add(key); else hidden.delete(key);
        state.content.hidden_sections = [...hidden];
      };
    });

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
    if (ctAddBtn) ctAddBtn.onclick = () => { state.content.chuong_trinh = [...(state.content.chuong_trinh || []), { ten: '', mo_ta: '', nhom: '' }]; draw(); };
    container.querySelectorAll('[data-ct-ten]').forEach(el => {
      el.oninput = () => { state.content.chuong_trinh[Number(el.getAttribute('data-ct-ten'))].ten = el.value; };
    });
    container.querySelectorAll('[data-ct-mota]').forEach(el => {
      el.oninput = () => { state.content.chuong_trinh[Number(el.getAttribute('data-ct-mota'))].mo_ta = el.value; };
    });
    container.querySelectorAll('[data-ct-nhom]').forEach(el => {
      el.oninput = () => { state.content.chuong_trinh[Number(el.getAttribute('data-ct-nhom'))].nhom = el.value; };
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
        await callApi('api/san-pham-so-product', { action: 'update_landing_page', id: state.selected.id, landing_page_content: state.content, landing_page_template: state.template, case_study_images: state.caseStudies, bonus_items: state.bonusItems, guarantee_text: state.guaranteeText || null, reference_price: valueStackTotal(state) > 0 ? valueStackTotal(state) : (Number(state.referencePrice) || null), value_stack_items: state.valueStackItems, team_members: state.teamMembers, stat_items: state.statItems, metric_items: state.metricItems, event_info_items: state.eventInfoItems, scarcity_text: state.scarcityText || null, proof_images: state.proofImages });
        state.selected.landing_page_content = state.content;
        state.selected.landing_page_template = state.template;
        state.selected.case_study_images = state.caseStudies;
        state.selected.bonus_items = state.bonusItems;
        state.selected.guarantee_text = state.guaranteeText || null;
        state.selected.reference_price = valueStackTotal(state) > 0 ? valueStackTotal(state) : (Number(state.referencePrice) || null);
        state.selected.value_stack_items = state.valueStackItems;
        state.selected.team_members = state.teamMembers;
        state.selected.stat_items = state.statItems;
        state.selected.metric_items = state.metricItems;
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
