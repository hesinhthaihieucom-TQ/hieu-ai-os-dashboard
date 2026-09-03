// Trang công khai bán 1 sản phẩm số — KHÔNG cần đăng nhập. Đọc dữ liệu sản phẩm thẳng qua view
// digital_products_public (anon key, xem supabase/schema_full.sql — view này CỐ TÌNH không có cột
// file_storage_path để không lộ đường dẫn file thật ra client công khai). Thanh toán/tải file đi
// qua 2 endpoint riêng ở api/ (service role) vì cần ghi dữ liệu, không thể làm thẳng bằng anon key.

const SUPABASE_URL = 'https://ltcjlnvceuspnwldsbgi.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_j0ohsTIc7Df5_dz5vDiniA_nB5jPYWy';
// PHẢI khớp PAYMENT_BANK ở nhan-hieu/js/app-shell.js — cùng 1 tài khoản ngân hàng thật dùng chung
// cho mọi sản phẩm trong hệ sinh thái HIỂU (xem CLAUDE.md). Đổi 1 chỗ thì phải đổi cả 2.
const PAYMENT_BANK = { code: 'vietinbank', account: '199339288888', accountName: 'LE TU QUYNH' };

function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
}

// Giao hàng ĐÚNG THEO LOẠI sản phẩm (2026-09-01) — nhãn hiển thị + nhãn nút sau khi mua, khớp đúng
// dinh_dang/DINH_DANG_OPTIONS ở san-pham-so/js/util.js.
const DINH_DANG_LABEL = {
  ebook: 'Ebook', checklist_workbook: 'Checklist/Workbook', template_file_mau: 'Template/File mẫu',
  mini_course: 'Mini-course', coaching_1_1: 'Coaching 1-1', cong_dong_tra_phi: 'Cộng đồng trả phí', webinar: 'Webinar',
};
const DINH_DANG_BUY_BUTTON_LABEL = {
  template_file_mau: '🧰 Mở template →',
  coaching_1_1: '🧑‍🏫 Đặt lịch ngay →',
  cong_dong_tra_phi: '👥 Tham gia nhóm →',
  webinar: '🎥 Vào phòng Zoom/Meet →',
};
function formatWebinarDatetime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

// 2026-09-03 (Quỳnh: "3 mẫu đang na ná nhau... phải làm cho rõ như này luôn" + 4 link tham khảo thật)
// — đổi từ 3 biến thể màu/font trên CÙNG 1 bố cục sang 4 BỐ CỤC thật sự khác nhau, mỗi mẫu lấy cảm
// hứng rõ rệt từ 1 trang thật (không sao chép chữ/ảnh/thương hiệu của họ — chỉ lấy cấu trúc/phong
// cách hiển thị, nội dung vẫn luôn là dữ liệu thật của người bán đang dùng app này):
// - quynh: mẫu GỐC của Quỳnh (30ngaytamlinhtaichinh.netlify.app) — kem/serif, đã có từ đầu.
// - video: lấy cảm hứng thanhnguyen.vn/7ngaylamvideo — nền tối, hồng rực, hero riêng full-width,
//   vấn đề đánh số lớn kiểu "01/02/03".
// - sach: lấy cảm hứng teedoo.io — nền đen, vàng/gold, hero riêng, chương trình hiện dạng lưới mục lục.
// - chuyengia: lấy cảm hứng aichuyengia.topexpert.vn — nền trắng sạch, tím/indigo, khối giá nổi bật
//   ngay đầu trang, thẻ "PHẦN" viền rõ cho từng phần chương trình.
// normalizeTemplate() giữ tương thích sản phẩm đã lỡ chọn tên mẫu CŨ (classic/bold/minimal, trước
// 2026-09-03) — không lỗi, tự động quy về mẫu gần nhất.
function normalizeTemplate(t) {
  if (t === 'classic') return 'quynh';
  if (t === 'bold') return 'video';
  if (t === 'minimal') return 'sach';
  if (t === 'video' || t === 'sach' || t === 'chuyengia' || t === 'quynh') return t;
  return 'quynh';
}
const BANNER_TEMPLATES = new Set(['video', 'sach']);

// Nhãn "NGÀY N"/"PHẦN N" phía trên mỗi mục chương trình — khác nhau theo mẫu, đúng cách các trang
// tham khảo gọi tên từng phần (thanhnguyen.vn dùng "NGÀY", aichuyengia dùng "PHẦN").
function programLabel(template, i) {
  if (template === 'video') return `NGÀY ${i + 1}`;
  if (template === 'chuyengia') return `PHẦN ${i + 1}`;
  return String(i + 1);
}

// Thanh điều hướng dính đầu trang (chỉ mẫu "video", đúng đặc trưng thanhnguyen.vn/7ngaylamvideo) —
// neo tới các mục thật đã có id, không phải trang trí suông.
function stickyNavHtml(template) {
  if (template !== 'video') return '';
  return `
    <nav class="lp-sticky-nav">
      <a href="#lp-sec-problem">Vấn đề</a>
      <a href="#lp-sec-program">Lộ trình</a>
      <a href="#lp-sec-faq">Hỏi đáp</a>
      <a href="#buy-area-anchor" class="lp-nav-cta">Đăng ký</a>
    </nav>
  `;
}

// Dải chữ chạy ngang (chỉ mẫu "video") — DỰNG TỪ DỮ LIỆU THẬT (kết quả đạt được/ưu đãi đã có), không
// phải số liệu/khẩu hiệu tự bịa như "chỉ còn 50 suất" ở trang tham khảo.
function tickerHtml(product, lp, template) {
  if (template !== 'video') return '';
  const items = [...(lp.ket_qua_dat_duoc || []), ...(product.bonus_items || [])].filter(Boolean);
  if (!items.length) return '';
  const strip = items.map(x => `<span>✓ ${esc(x)}</span>`).join('<span class="lp-ticker-dot">•</span>');
  return `<div class="lp-ticker"><div class="lp-ticker-track">${strip}<span class="lp-ticker-dot">•</span>${strip}</div></div>`;
}

// Bảng so sánh "chưa có hệ thống / có hệ thống" (chỉ mẫu "video", đúng kiểu bảng "Tự mò vs Tham gia"
// ở thanhnguyen.vn) — ghép TỪ DỮ LIỆU THẬT đã có (van_de_chi_tiet làm cột trái, ket_qua_dat_duoc làm
// cột phải, theo đúng thứ tự đã viết), không tự bịa thêm hàng/số liệu nào khác.
function comparisonTableHtml(lp, template) {
  if (template !== 'video') return '';
  const left = lp.van_de_chi_tiet || [];
  const right = lp.ket_qua_dat_duoc || [];
  const rows = Math.min(left.length, right.length);
  if (rows < 2) return '';
  let out = `<div class="lp-section"><h2 class="lp-h2">Tự loay hoay hay có hệ thống?</h2><div class="lp-compare">
    <div class="lp-compare-head lp-compare-bad">Chưa có hệ thống</div>
    <div class="lp-compare-head lp-compare-good">Sau khi hoàn thành</div>`;
  for (let i = 0; i < rows; i++) {
    out += `<div class="lp-compare-cell lp-compare-bad">✗ ${esc(left[i].ten || '')}</div><div class="lp-compare-cell lp-compare-good">✓ ${esc(right[i])}</div>`;
  }
  out += `</div></div>`;
  return out;
}

// Khối "trước / sau" (chỉ mẫu "chuyengia", đúng kiểu "5 năm trước / bây giờ" ở aichuyengia.topexpert.vn)
// — ghép TỪ DỮ LIỆU THẬT đã có (van_de_intro làm "trước", 2 ý đầu của ket_qua_dat_duoc làm "bây giờ").
function beforeAfterHtml(lp, template) {
  if (template !== 'chuyengia') return '';
  if (!lp.van_de_intro || !Array.isArray(lp.ket_qua_dat_duoc) || lp.ket_qua_dat_duoc.length < 2) return '';
  return `
    <div class="lp-section"><div class="lp-before-after">
      <div class="lp-ba-col lp-ba-before"><div class="lp-ba-label">Trước</div><p>${esc(lp.van_de_intro)}</p></div>
      <div class="lp-ba-col lp-ba-after"><div class="lp-ba-label">Bây giờ</div><ul>${lp.ket_qua_dat_duoc.slice(0, 3).map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>
    </div></div>
  `;
}

// Dải "cách đăng ký" 3 bước (chỉ mẫu "quynh", đúng kiểu "CÁCH ĐĂNG KÝ" ở trang gốc) — mô tả ĐÚNG luồng
// mua thật của app này (bấm mua → chuyển khoản đúng nội dung → tự động mở khoá), không phải quy trình
// thủ công cần nhắn Zalo như trang tham khảo (app này không cần bước đó, tự động 100%).
function threeStepHtml(template) {
  if (template !== 'quynh') return '';
  return `
    <div class="lp-3step">
      <div class="lp-3step-item"><div class="lp-3step-num">1</div>Bấm mua</div>
      <div class="lp-3step-item"><div class="lp-3step-num">2</div>Chuyển khoản đúng nội dung</div>
      <div class="lp-3step-item"><div class="lp-3step-num">3</div>Nhận ngay, tự động</div>
    </div>
  `;
}

const app = document.getElementById('app');
const params = new URLSearchParams(location.search);
const slug = params.get('slug');
const orderStorageKey = slug ? `sps_order_${slug}` : null;
let pollTimer = null;

// Chế độ xem trước mẫu giao diện (?demo=1&tpl=classic|bold|minimal) — dùng bởi bảng chọn mẫu ở
// san-pham-so/js/tao-landing-page.js (nhúng qua <iframe>, 2026-09-02). Render THẲNG bằng đúng code
// thật của trang mua công khai với dữ liệu mẫu dựng sẵn, để người bán thấy "mẫu thật" thay vì hình
// minh hoạ giả — không gọi API/DB nào, không tạo đơn hàng thật.
const isDemo = params.get('demo') === '1';

function placeholderImg(label, bg, fg) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="320"><rect width="480" height="320" fill="${bg}"/><text x="240" y="165" font-family="sans-serif" font-size="22" fill="${fg}" text-anchor="middle">${label}</text></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

function demoProduct(tpl) {
  return {
    slug: 'demo', title: 'Ebook: 21 Ngày Giải Nghiệp Tiền Bạc', description: 'Hành trình 21 ngày giúp bạn thoát khỏi vòng lặp chi tiêu mất kiểm soát, xây thói quen tài chính lành mạnh.',
    price: 299000, reference_price: 590000, paid_count: 12, guarantee_text: 'Hoàn tiền 100% nếu không hài lòng trong 7 ngày',
    cover_image_url: placeholderImg('Ảnh bìa sản phẩm', '#D7CDBA', '#5B5F55'),
    dinh_dang: 'ebook', webinar_datetime: null, landing_page_template: tpl,
    seller_photo_url: placeholderImg('Ảnh người bán', '#C9D6CF', '#2F6F62'),
    case_study_images: [
      { url: placeholderImg('Case study 1', '#EFE7D6', '#8A6A3C'), caption: 'Chị Hạnh — hết nợ thẻ tín dụng sau 3 tháng' },
      { url: placeholderImg('Case study 2', '#EFE7D6', '#8A6A3C'), caption: 'Anh Khoa — tiết kiệm được 15% thu nhập mỗi tháng' },
    ],
    bonus_items: ['Sổ tay theo dõi chi tiêu 21 ngày (PDF)', 'Nhóm Zalo hỗ trợ riêng cho học viên'],
    landing_page_content: {
      hook: 'Không phải nhịn tiêu — mà là hiểu đúng tiền của mình đang đi đâu, chỉ trong 21 ngày',
      van_de_intro: 'Bạn kiếm ra tiền nhưng cuối tháng vẫn không biết tiền đi đâu hết. Muốn tiết kiệm nhưng không biết bắt đầu từ đâu, muốn thoát nợ nhưng cứ trả rồi lại vay.',
      van_de_chi_tiet: [
        { ten: 'Chi Tiêu Vô Hình', mo_ta: 'Tiền cứ trôi đi qua những khoản nhỏ lẻ mỗi ngày mà bạn không hề để ý.' },
        { ten: 'Vòng Xoáy Vay-Trả', mo_ta: 'Vừa trả xong khoản này lại phải vay khoản khác, không bao giờ thấy dư ra.' },
        { ten: 'Sợ Nhìn Vào Số Dư', mo_ta: 'Né tránh kiểm tra tài khoản vì sợ đối diện với con số thật.' },
      ],
      ket_qua_dat_duoc: ['Biết chính xác tiền của mình đang đi đâu mỗi ngày', 'Xây quỹ dự phòng đầu tiên trong đời chỉ sau 21 ngày', 'Thoát khỏi cảm giác lo lắng mỗi khi nghĩ đến tiền'],
      chuong_trinh: [
        { ten: 'Ngày 1-7: Nhìn thẳng vào sự thật', mo_ta: 'Ghi chép toàn bộ chi tiêu, nhận diện các khoản rò rỉ.' },
        { ten: 'Ngày 8-14: Dựng lại ngân sách', mo_ta: 'Lập ngân sách thực tế theo đúng thu nhập của bạn.' },
        { ten: 'Ngày 15-21: Xây quỹ dự phòng', mo_ta: 'Bắt đầu khoản tiết kiệm đầu tiên, dù nhỏ.' },
      ],
      loi_nhan_nguoi_ban: 'Tôi từng đứng đúng chỗ bạn đang đứng — không biết tiền của mình đi đâu, chỉ biết là không đủ. 21 ngày này là đúng những gì tôi đã tự làm để thay đổi.',
      ve_nguoi_ban: 'Người viết đã tự áp dụng đúng quy trình này để thoát khỏi nợ tiêu dùng.',
      phu_hop_voi_ai: ['Người mới đi làm, chưa có thói quen quản lý tiền', 'Người đang có nợ muốn tìm lối ra rõ ràng'],
      faq: [
        { cau_hoi: 'Không giỏi tính toán có làm được không?', tra_loi: 'Được — mỗi ngày chỉ cần 10-15 phút, có mẫu điền sẵn.' },
        { cau_hoi: 'Nhận sản phẩm bằng cách nào?', tra_loi: 'Link tải PDF gửi ngay sau khi thanh toán thành công.' },
      ],
      cta_text: 'Bắt đầu 21 ngày ngay',
    },
  };
}

async function fetchProduct() {
  const resp = await fetch(`${SUPABASE_URL}/rest/v1/digital_products_public?slug=eq.${encodeURIComponent(slug)}&select=*`, {
    headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
  });
  if (!resp.ok) return null;
  const rows = await resp.json();
  return rows[0] || null;
}

async function createOrder(productSlug, buyerEmail) {
  // Đường dẫn TƯƠNG ĐỐI (trang này nằm ở .../p/, "../api/..." trỏ lên .../api/...) — không hard-code
  // "/san-pham-so/api/..." vì domain thật sau này sẽ là hesinhthaihieu.com/apptaosanphamso/p/, path
  // tương đối tự khớp đúng dù đang chạy dưới tiền tố nào (xem app.js đầu file để biết thêm).
  const resp = await fetch('../api/san-pham-so-create-order', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ slug: productSlug, buyer_email: buyerEmail || null }),
  });
  const data = await resp.json();
  if (!resp.ok) throw new Error(data.error || 'Có lỗi xảy ra.');
  return data;
}

async function checkOrder(refCode) {
  const resp = await fetch('../api/san-pham-so-check-order', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ ref_code: refCode }),
  });
  const data = await resp.json();
  if (!resp.ok) throw new Error(data.error || 'Có lỗi xảy ra.');
  return data;
}

function qrUrl(amount, content) {
  return `https://img.vietqr.io/image/${PAYMENT_BANK.code}-${PAYMENT_BANK.account}-compact2.png?amount=${amount}&addInfo=${encodeURIComponent(content)}&accountName=${encodeURIComponent(PAYMENT_BANK.accountName)}`;
}

// Landing page ĐẦY ĐỦ (san-pham-so/js/tao-landing-page.js, AI viết) — CHỈ hiện khi người bán đã tạo,
// không thì trang vẫn dùng đúng bản đơn giản cũ (title/description) như trước, không bắt buộc.
// case_study_images/seller_photo_url/bonus_items nằm ở `product` (không phải `lp`/landing_page_content)
// — nội dung THẬT do người bán tự cung cấp (2026-09-02), khác nội dung chữ do AI viết.
//
// 2026-09-02: schema landing_page_content ĐỔI (van_de→van_de_intro+van_de_chi_tiet, noi_dung_gioi_thieu
// →chuong_trinh, thêm loi_nhan_nguoi_ban — xem api/_lib/landing-page-schema.js) sau khi Quỳnh phản hồi
// bản cũ "hời hợt" so với landing page thật của chị. VẪN ĐỌC ĐƯỢC field cũ (van_de/loi_ich/
// noi_dung_gioi_thieu) cho sản phẩm đã tạo landing page TRƯỚC batch này — không lỗi, chỉ đơn giản
// không có phần "đặt tên vấn đề"/"lộ trình theo chặng"/"lời nhắn cá nhân" cho tới khi viết lại bằng AI.
function landingPageIntroHtml(product, lp, template) {
  // Nhãn nhỏ viết hoa phía trên tiêu đề (kiểu "BÓC TRẦN SỰ THẬT" ở mẫu gốc của Quỳnh) — CHỈ mẫu
  // "quynh" mới có, đúng đặc trưng riêng của trang tham khảo đó.
  const eyebrow = template === 'quynh' ? (t => `<div class="lp-eyebrow">${esc(t)}</div>`) : (() => '');
  const vanDeChiTietHtml = Array.isArray(lp.van_de_chi_tiet) && lp.van_de_chi_tiet.length
    ? `<div class="lp-problem-grid">${lp.van_de_chi_tiet.map(v => `
        <div class="lp-problem-item"><div class="lp-problem-ten">${esc(v.ten || '')}</div><div class="lp-problem-mota">${esc(v.mo_ta || '')}</div></div>
      `).join('')}</div>` : '';
  const chuongTrinhHtml = Array.isArray(lp.chuong_trinh) && lp.chuong_trinh.length
    ? `<div class="lp-program-list">${lp.chuong_trinh.map((c, i) => `
        <div class="lp-program-item"><div class="lp-program-num">${esc(programLabel(template, i))}</div><div><div class="lp-program-ten">${esc(c.ten || '')}</div><div class="lp-program-mota">${esc(c.mo_ta || '')}</div></div></div>
      `).join('')}</div>` : '';
  const ketQuaListHtml = Array.isArray(lp.ket_qua_dat_duoc) && lp.ket_qua_dat_duoc.length
    ? `<ul class="lp-list">${lp.ket_qua_dat_duoc.map(x => `<li>${esc(x)}</li>`).join('')}</ul>`
    : (Array.isArray(lp.loi_ich) && lp.loi_ich.length ? `<ul class="lp-list">${lp.loi_ich.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : '');
  // "chuyengia" hiện kết quả dạng LƯỚI THẺ (giống 4 thẻ kết quả ở aichuyengia.topexpert.vn) thay vì
  // danh sách gạch đầu dòng — cùng dữ liệu thật, khác cách trình bày.
  const ketQuaGridHtml = template === 'chuyengia' && Array.isArray(lp.ket_qua_dat_duoc) && lp.ket_qua_dat_duoc.length
    ? `<div class="lp-result-grid">${lp.ket_qua_dat_duoc.map(x => `<div class="lp-result-card">✓ ${esc(x)}</div>`).join('')}</div>` : '';
  const ketQuaHtml = ketQuaGridHtml || ketQuaListHtml;
  const phuHopHtml = Array.isArray(lp.phu_hop_voi_ai) && lp.phu_hop_voi_ai.length
    ? `<ul class="lp-list">${lp.phu_hop_voi_ai.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : '';
  const caseStudyHtml = Array.isArray(product.case_study_images) && product.case_study_images.length
    ? `<div class="lp-section">${eyebrow('Người dùng nói gì')}<h2 class="lp-h2">Kết quả thực tế</h2><div class="lp-case-studies">${product.case_study_images.map(c => `
        <div class="lp-case-study-item">
          <img src="${esc(c.url)}" alt="">
          ${c.caption ? `<div class="lp-case-study-caption">${esc(c.caption)}</div>` : ''}
        </div>
      `).join('')}</div></div>` : '';
  // "sach" hiện ưu đãi dạng HỘP CÓ VIỀN kèm icon (giống khối "Bạn sẽ nhận được gì" ở teedoo.io) thay
  // vì danh sách gạch đầu dòng đơn giản.
  const bonusListHtml = template === 'sach'
    ? `<div class="lp-bonus-box">${(product.bonus_items || []).map(b => `<div class="lp-bonus-row">🎁 ${esc(b)}</div>`).join('')}</div>`
    : `<ul class="lp-list">${(product.bonus_items || []).map(b => `<li>${esc(b)}</li>`).join('')}</ul>`;
  const bonusHtml = Array.isArray(product.bonus_items) && product.bonus_items.length
    ? `<div class="lp-section">${eyebrow('Đặc quyền đi kèm')}<h2 class="lp-h2">Ưu đãi tặng kèm</h2>${bonusListHtml}</div>` : '';
  return `
    ${beforeAfterHtml(lp, template)}
    ${lp.van_de_intro || lp.van_de ? `<div class="lp-section" id="lp-sec-problem">${eyebrow('Bóc trần sự thật')}<p class="lp-body">${esc(lp.van_de_intro || lp.van_de)}</p>${vanDeChiTietHtml}</div>` : ''}
    ${comparisonTableHtml(lp, template)}
    ${chuongTrinhHtml ? `<div class="lp-section" id="lp-sec-program">${eyebrow('Lộ trình thực chiến')}<h2 class="lp-h2">Lộ trình / chương trình</h2>${chuongTrinhHtml}</div>` : (lp.noi_dung_gioi_thieu ? `<div class="lp-section" id="lp-sec-program"><h2 class="lp-h2">Bạn sẽ nhận được gì</h2><p class="lp-body">${esc(lp.noi_dung_gioi_thieu)}</p></div>` : '')}
    ${ketQuaHtml ? `<div class="lp-section">${eyebrow('Sau khi hoàn thành')}<h2 class="lp-h2">Kết quả bạn đạt được</h2>${ketQuaHtml}</div>` : ''}
    ${caseStudyHtml}
    ${bonusHtml}
    ${phuHopHtml ? `<div class="lp-section">${eyebrow('Dành cho ai')}<h2 class="lp-h2">Phù hợp với ai</h2>${phuHopHtml}</div>` : ''}
    ${lp.loi_nhan_nguoi_ban ? `<div class="lp-section">${eyebrow('Lời nhắn từ người bán')}<div class="lp-letter">${esc(lp.loi_nhan_nguoi_ban)}</div></div>` : ''}
    ${lp.ve_nguoi_ban ? `<div class="lp-section">${eyebrow('Người đứng sau')}<h2 class="lp-h2">Về người bán</h2><div class="lp-seller">${product.seller_photo_url ? `<img class="lp-seller-photo" src="${esc(product.seller_photo_url)}" alt="">` : ''}<p class="lp-body">${esc(lp.ve_nguoi_ban)}</p></div></div>` : ''}
  `;
}
function landingPageFaqHtml(lp) {
  if (!Array.isArray(lp.faq) || !lp.faq.length) return '';
  return `
    <div class="lp-section" id="lp-sec-faq">
      <h2 class="lp-h2">Câu hỏi thường gặp</h2>
      <div class="lp-faq">
        ${lp.faq.map(f => `
          <details class="lp-faq-item">
            <summary>${esc(f.cau_hoi || '')}</summary>
            <div class="lp-faq-answer">${esc(f.tra_loi || '')}</div>
          </details>
        `).join('')}
      </div>
    </div>
  `;
}

function renderNotFound() {
  app.innerHTML = `<div class="wrap"><div class="card">
    <h1>Không tìm thấy sản phẩm</h1>
    <p class="desc">Link này có thể đã sai hoặc sản phẩm chưa được đăng công khai.</p>
  </div></div>`;
}

function startPolling(product, refCode) {
  if (pollTimer) clearInterval(pollTimer);
  pollTimer = setInterval(async () => {
    try {
      const data = await checkOrder(refCode);
      if (data.status === 'paid') {
        clearInterval(pollTimer);
        renderProduct(product, { ref_code: refCode, status: 'paid', downloadUrl: data.downloadUrl, fileName: data.fileName, dinhDang: data.dinhDang, lessons: data.lessons, webinarDatetime: data.webinarDatetime });
      }
    } catch (e) { /* lỗi mạng thoáng qua — thử lại ở lượt poll kế tiếp, không làm phiền bằng lỗi */ }
  }, 4000);
}

function renderProduct(product, order) {
  const coverHtml = product.cover_image_url ? `<img class="cover" src="${esc(product.cover_image_url)}" alt="">` : '';
  // Nhãn loại + ngày giờ webinar (nếu có) lộ công khai TRƯỚC khi mua — giúp khách biết rõ mình sắp
  // mua dạng gì (2026-09-01, xem digital_products_public trong schema_san_pham_so.sql).
  const dinhDangBadgeHtml = product.dinh_dang && DINH_DANG_LABEL[product.dinh_dang]
    ? `<div class="mono" style="display:inline-block;background:var(--accent-soft,#E7F0EC);color:var(--accent,#2F6F62);padding:3px 10px;border-radius:999px;font-size:12px;margin-bottom:8px;">${esc(DINH_DANG_LABEL[product.dinh_dang])}</div>`
    : '';
  const webinarPreHtml = product.dinh_dang === 'webinar' && product.webinar_datetime
    ? `<div class="hint-box" style="margin-bottom:12px;">🗓️ Diễn ra: <b>${esc(formatWebinarDatetime(product.webinar_datetime))}</b></div>`
    : '';
  const lp = product.landing_page_content || null;
  // Mẫu giao diện (2026-09-02, chọn ở san-pham-so/js/tao-landing-page.js) — chỉ đổi CÁCH HIỂN THỊ
  // (bố cục hero + màu + kiểu đánh số) qua [data-lp-template], không đổi nội dung/công thức AI viết.
  // Không có landing page thì bỏ qua luôn, dùng mẫu gốc.
  const lpTemplate = lp ? normalizeTemplate(product.landing_page_template) : 'quynh';
  const isBanner = BANNER_TEMPLATES.has(lpTemplate);
  const hookHtml = lp && lp.hook ? `<div class="lp-hook">${esc(lp.hook)}</div>` : '';
  const titleBlockHtml = `${dinhDangBadgeHtml}${hookHtml}<h1>${esc(product.title)}</h1>${product.description ? `<p class="desc">${esc(product.description)}</p>` : ''}`;
  let buyHtml;

  if (!order) {
    const buyLabel = lp && lp.cta_text ? esc(lp.cta_text) : 'Mua ngay';
    buyHtml = `
      <input id="buyer-email" type="email" placeholder="Email (không bắt buộc — để nhận lại link nếu mất)">
      <button class="btn" id="buy-btn">${buyLabel} — ${Number(product.price).toLocaleString('vi-VN')}đ</button>
    `;
  } else if (order.status === 'paid') {
    // Giao hàng ĐÚNG THEO LOẠI (2026-09-01): mini_course trả về NHIỀU bài học (danh sách link), các
    // loại khác trả về 1 link/file duy nhất — nhãn nút khớp đúng bản chất (đặt lịch/tham gia nhóm/
    // vào phòng Zoom thay vì luôn ghi "Tải xuống" một thứ không phải file).
    let deliverableHtml;
    if (order.dinhDang === 'mini_course' && Array.isArray(order.lessons) && order.lessons.length) {
      deliverableHtml = `
        <div class="hint-box" style="text-align:left;">
          ${order.lessons.map((l, i) => `<div style="margin-bottom:8px;"><b>Bài ${i + 1}:</b> ${esc(l.title || '')}${l.link ? ` — <a href="${esc(l.link)}" target="_blank" rel="noopener">Mở bài học →</a>` : ''}</div>`).join('')}
        </div>
      `;
    } else {
      const label = order.dinhDang && DINH_DANG_BUY_BUTTON_LABEL[order.dinhDang]
        ? DINH_DANG_BUY_BUTTON_LABEL[order.dinhDang]
        : (order.fileName ? `📥 Tải xuống ${esc(order.fileName)}` : '📖 Xem tài liệu của bạn →');
      deliverableHtml = `<a class="btn" href="${esc(order.downloadUrl)}" target="_blank" rel="noopener">${label}</a>`;
    }
    const webinarPostHtml = order.dinhDang === 'webinar' && order.webinarDatetime
      ? `<div class="hint-box" style="margin-bottom:12px;">🗓️ Diễn ra: <b>${esc(formatWebinarDatetime(order.webinarDatetime))}</b></div>` : '';
    buyHtml = `
      <div class="hint-box">✅ Đã thanh toán thành công!</div>
      ${webinarPostHtml}
      ${deliverableHtml}
    `;
  } else {
    const transferContent = `SEVQR ${order.ref_code}`;
    buyHtml = `
      <div class="qr-wrap"><img src="${qrUrl(order.amount, transferContent)}" alt="Mã VietQR"></div>
      <div class="pay-info">
        <div><b>Ngân hàng:</b> Vietinbank</div>
        <div><b>Số tài khoản:</b> ${esc(PAYMENT_BANK.account)}</div>
        <div><b>Chủ tài khoản:</b> ${esc(PAYMENT_BANK.accountName)}</div>
        <div><b>Số tiền:</b> ${Number(order.amount).toLocaleString('vi-VN')}đ</div>
        <div><b>Nội dung CK (bắt buộc giữ nguyên):</b> <span class="mono">${esc(transferContent)}</span></div>
      </div>
      <div class="hint-box">Quét mã hoặc chuyển khoản đúng số tiền + giữ nguyên nội dung (bắt buộc có chữ SEVQR ở đầu) — trang này tự kiểm tra và hiện link tải ngay khi nhận được, không cần bấm gì thêm.</div>
      <div id="poll-status" class="poll-status">Đang chờ thanh toán…</div>
    `;
  }

  // Giá trị tham khảo + số người đã mua thật (2026-09-03, Quỳnh: rà lại độ hiệu quả landing page) —
  // CẢ 2 đều là dữ liệu THẬT (giá tham khảo do người bán tự nhập, số người mua đếm thẳng từ đơn đã
  // thanh toán của đúng sản phẩm này qua digital_products_public), không phải AI/hệ thống tự bịa.
  const referencePriceHtml = product.reference_price && Number(product.reference_price) > Number(product.price)
    ? `<span style="text-decoration:line-through;color:var(--ink-soft);font-size:15px;margin-right:8px;">${Number(product.reference_price).toLocaleString('vi-VN')}đ</span>` : '';
  const soldCountHtml = product.paid_count > 0
    ? `<div style="font-size:12.5px;color:var(--ink-soft);margin:-10px 0 16px;">🎉 Đã có ${product.paid_count} người mua sản phẩm này</div>` : '';
  // Cam kết — TRƯỚC ĐÂY hardcode cho mọi sản phẩm (rủi ro hứa hộ người bán điều họ không đồng ý),
  // giờ CHỈ hiện khi người bán tự viết (guarantee_text null = không hiện gì, không phải lỗi).
  const guaranteeHtml = product.guarantee_text
    ? `<div class="hint-box" style="margin-top:12px;text-align:center;">🔒 ${esc(product.guarantee_text)}</div>` : '';

  // "chuyengia" đẩy giá lên ngay trong hero (đúng kiểu khối giá nổi bật đầu trang ở
  // aichuyengia.topexpert.vn) — chỉ là 1 ô hiện giá, KHÔNG lặp nút mua thật (tránh 2 nơi có thể tạo
  // đơn khác nhau) — bấm vào cuộn xuống đúng nút mua thật duy nhất.
  const heroPriceTeaserHtml = lp && lpTemplate === 'chuyengia'
    ? `<div class="lp-hero-price-box" data-lp-scroll-buy>${referencePriceHtml}<span class="lp-hero-price-num">${Number(product.price).toLocaleString('vi-VN')}đ</span><span class="lp-hero-price-cta">Xem ưu đãi ↓</span></div>` : '';

  app.innerHTML = `
    <div class="wrap" data-lp-template="${esc(lpTemplate)}">
      ${stickyNavHtml(lpTemplate)}
      ${isBanner ? `<div class="lp-hero-banner"><div class="lp-hero-inner">${coverHtml}${titleBlockHtml}</div></div>${lp ? tickerHtml(product, lp, lpTemplate) : ''}` : ''}
      <div class="card">
      ${isBanner ? '' : `${coverHtml}${titleBlockHtml}${heroPriceTeaserHtml}`}
      ${webinarPreHtml}
      ${lp ? landingPageIntroHtml(product, lp, lpTemplate) : ''}
      <div id="buy-area-anchor">
        <div class="price">${referencePriceHtml}${Number(product.price).toLocaleString('vi-VN')}đ</div>
        ${soldCountHtml}
        ${threeStepHtml(lpTemplate)}
        ${buyHtml}
        ${guaranteeHtml}
      </div>
      ${lp ? landingPageFaqHtml(lp) : ''}
    </div></div>
    <div id="sticky-buy-bar" class="sticky-buy-bar" data-lp-template="${esc(lpTemplate)}" hidden>
      <div class="sticky-buy-price">${referencePriceHtml}${Number(product.price).toLocaleString('vi-VN')}đ</div>
      <span class="btn" id="sticky-buy-btn">${(order && order.status === 'paid') ? 'Xem sản phẩm ↓' : ((lp && lp.cta_text) ? esc(lp.cta_text) : 'Mua ngay')}</span>
    </div>
  `;

  // Thanh mua dính đáy — chỉ hiện khi khu vực giá/nút mua THẬT đã cuộn khỏi màn hình, bấm vào cuộn
  // mượt về lại đúng chỗ đó (không nhân bản logic tạo đơn/nhập email — tránh 2 nơi có thể lệch nhau).
  const anchorEl = document.getElementById('buy-area-anchor');
  const stickyBar = document.getElementById('sticky-buy-bar');
  if (anchorEl && stickyBar && 'IntersectionObserver' in window) {
    const obs = new IntersectionObserver(([entry]) => { stickyBar.hidden = entry.isIntersecting; }, { threshold: 0 });
    obs.observe(anchorEl);
    document.getElementById('sticky-buy-btn').onclick = () => anchorEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
  // Ô giá nổi bật trong hero (chỉ mẫu "chuyengia") + link "Đăng ký" trên thanh nav dính (chỉ mẫu
  // "video") — cùng 1 hành vi: cuộn về đúng nút mua thật, không tạo logic mua riêng.
  const heroPriceBox = document.querySelector('[data-lp-scroll-buy]');
  if (heroPriceBox && anchorEl) heroPriceBox.onclick = () => anchorEl.scrollIntoView({ behavior: 'smooth', block: 'center' });

  const buyBtn = document.getElementById('buy-btn');
  if (buyBtn && isDemo) {
    buyBtn.disabled = true;
    buyBtn.title = 'Bản xem trước mẫu — không mua được ở đây.';
  } else if (buyBtn) buyBtn.onclick = async () => {
    buyBtn.disabled = true; buyBtn.textContent = 'Đang xử lý…';
    try {
      const emailEl = document.getElementById('buyer-email');
      const data = await createOrder(product.slug, emailEl ? emailEl.value.trim() : '');
      try { localStorage.setItem(orderStorageKey, JSON.stringify({ ref_code: data.ref_code, amount: data.amount })); } catch (e) {}
      const newOrder = { ref_code: data.ref_code, amount: data.amount, status: 'pending' };
      renderProduct(product, newOrder);
      startPolling(product, newOrder.ref_code);
    } catch (e) {
      buyBtn.disabled = false; buyBtn.textContent = 'Mua ngay';
      alert(e.message);
    }
  };

  if (order && order.status !== 'paid') startPolling(product, order.ref_code);
}

async function main() {
  if (isDemo) { renderProduct(demoProduct(params.get('tpl') || 'classic'), null); return; }
  if (!slug) { renderNotFound(); return; }
  const product = await fetchProduct().catch(() => null);
  if (!product) { renderNotFound(); return; }

  let order = null;
  try {
    const saved = JSON.parse(localStorage.getItem(orderStorageKey) || 'null');
    if (saved && saved.ref_code) {
      const data = await checkOrder(saved.ref_code);
      order = { ref_code: saved.ref_code, amount: saved.amount, status: data.status, downloadUrl: data.downloadUrl, fileName: data.fileName, dinhDang: data.dinhDang, lessons: data.lessons, webinarDatetime: data.webinarDatetime };
    }
  } catch (e) { /* đơn cũ tra lỗi (vd đã bị xoá) — coi như chưa mua, không chặn xem trang */ }

  renderProduct(product, order);
}

main();
