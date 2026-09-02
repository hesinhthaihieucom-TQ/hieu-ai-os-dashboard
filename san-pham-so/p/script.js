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
    price: 299000, cover_image_url: placeholderImg('Ảnh bìa sản phẩm', '#D7CDBA', '#5B5F55'),
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
function landingPageIntroHtml(product, lp) {
  const vanDeChiTietHtml = Array.isArray(lp.van_de_chi_tiet) && lp.van_de_chi_tiet.length
    ? `<div class="lp-problem-grid">${lp.van_de_chi_tiet.map(v => `
        <div class="lp-problem-item"><div class="lp-problem-ten">${esc(v.ten || '')}</div><div class="lp-problem-mota">${esc(v.mo_ta || '')}</div></div>
      `).join('')}</div>` : '';
  const chuongTrinhHtml = Array.isArray(lp.chuong_trinh) && lp.chuong_trinh.length
    ? `<div class="lp-program-list">${lp.chuong_trinh.map((c, i) => `
        <div class="lp-program-item"><div class="lp-program-num">${i + 1}</div><div><div class="lp-program-ten">${esc(c.ten || '')}</div><div class="lp-program-mota">${esc(c.mo_ta || '')}</div></div></div>
      `).join('')}</div>` : '';
  const ketQuaHtml = Array.isArray(lp.ket_qua_dat_duoc) && lp.ket_qua_dat_duoc.length
    ? `<ul class="lp-list">${lp.ket_qua_dat_duoc.map(x => `<li>${esc(x)}</li>`).join('')}</ul>`
    : (Array.isArray(lp.loi_ich) && lp.loi_ich.length ? `<ul class="lp-list">${lp.loi_ich.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : '');
  const phuHopHtml = Array.isArray(lp.phu_hop_voi_ai) && lp.phu_hop_voi_ai.length
    ? `<ul class="lp-list">${lp.phu_hop_voi_ai.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : '';
  const caseStudyHtml = Array.isArray(product.case_study_images) && product.case_study_images.length
    ? `<div class="lp-section"><h2 class="lp-h2">Kết quả thực tế</h2><div class="lp-case-studies">${product.case_study_images.map(c => `
        <div class="lp-case-study-item">
          <img src="${esc(c.url)}" alt="">
          ${c.caption ? `<div class="lp-case-study-caption">${esc(c.caption)}</div>` : ''}
        </div>
      `).join('')}</div></div>` : '';
  const bonusHtml = Array.isArray(product.bonus_items) && product.bonus_items.length
    ? `<div class="lp-section"><h2 class="lp-h2">Ưu đãi tặng kèm</h2><ul class="lp-list">${product.bonus_items.map(b => `<li>${esc(b)}</li>`).join('')}</ul></div>` : '';
  return `
    ${lp.van_de_intro || lp.van_de ? `<div class="lp-section"><p class="lp-body">${esc(lp.van_de_intro || lp.van_de)}</p>${vanDeChiTietHtml}</div>` : ''}
    ${chuongTrinhHtml ? `<div class="lp-section"><h2 class="lp-h2">Lộ trình / chương trình</h2>${chuongTrinhHtml}</div>` : (lp.noi_dung_gioi_thieu ? `<div class="lp-section"><h2 class="lp-h2">Bạn sẽ nhận được gì</h2><p class="lp-body">${esc(lp.noi_dung_gioi_thieu)}</p></div>` : '')}
    ${ketQuaHtml ? `<div class="lp-section"><h2 class="lp-h2">Kết quả bạn đạt được</h2>${ketQuaHtml}</div>` : ''}
    ${caseStudyHtml}
    ${bonusHtml}
    ${phuHopHtml ? `<div class="lp-section"><h2 class="lp-h2">Phù hợp với ai</h2>${phuHopHtml}</div>` : ''}
    ${lp.loi_nhan_nguoi_ban ? `<div class="lp-section"><div class="lp-letter">${esc(lp.loi_nhan_nguoi_ban)}</div></div>` : ''}
    ${lp.ve_nguoi_ban ? `<div class="lp-section"><h2 class="lp-h2">Về người bán</h2><div class="lp-seller">${product.seller_photo_url ? `<img class="lp-seller-photo" src="${esc(product.seller_photo_url)}" alt="">` : ''}<p class="lp-body">${esc(lp.ve_nguoi_ban)}</p></div></div>` : ''}
  `;
}
function landingPageFaqHtml(lp) {
  if (!Array.isArray(lp.faq) || !lp.faq.length) return '';
  return `
    <div class="lp-section">
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
  // Mẫu giao diện (2026-09-02, chọn ở san-pham-so/js/tao-landing-page.js) — chỉ đổi CSS hiển thị qua
  // [data-lp-template], không đổi nội dung/công thức AI viết. Không có landing page thì bỏ qua luôn.
  const lpTemplate = lp ? (product.landing_page_template || 'classic') : 'classic';
  const hookHtml = lp && lp.hook ? `<div class="lp-hook">${esc(lp.hook)}</div>` : '';
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

  app.innerHTML = `
    <div class="wrap" data-lp-template="${esc(lpTemplate)}"><div class="card">
      ${coverHtml}
      ${dinhDangBadgeHtml}
      ${hookHtml}
      <h1>${esc(product.title)}</h1>
      ${product.description ? `<p class="desc">${esc(product.description)}</p>` : ''}
      ${webinarPreHtml}
      ${lp ? landingPageIntroHtml(product, lp) : ''}
      <div class="price">${Number(product.price).toLocaleString('vi-VN')}đ</div>
      ${buyHtml}
      <div class="hint-box" style="margin-top:12px;text-align:center;">🔒 Cam kết hoàn tiền 100% nếu không hài lòng trong 7 ngày</div>
      ${lp ? landingPageFaqHtml(lp) : ''}
    </div></div>
  `;

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
