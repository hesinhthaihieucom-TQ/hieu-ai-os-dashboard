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
function landingPageIntroHtml(lp) {
  const loiIchHtml = Array.isArray(lp.loi_ich) && lp.loi_ich.length
    ? `<ul class="lp-list">${lp.loi_ich.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : '';
  const phuHopHtml = Array.isArray(lp.phu_hop_voi_ai) && lp.phu_hop_voi_ai.length
    ? `<ul class="lp-list">${lp.phu_hop_voi_ai.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : '';
  return `
    ${lp.van_de ? `<div class="lp-section"><p class="lp-body">${esc(lp.van_de)}</p></div>` : ''}
    ${lp.noi_dung_gioi_thieu ? `<div class="lp-section"><h2 class="lp-h2">Bạn sẽ nhận được gì</h2><p class="lp-body">${esc(lp.noi_dung_gioi_thieu)}</p></div>` : ''}
    ${loiIchHtml ? `<div class="lp-section"><h2 class="lp-h2">Lợi ích</h2>${loiIchHtml}</div>` : ''}
    ${phuHopHtml ? `<div class="lp-section"><h2 class="lp-h2">Phù hợp với ai</h2>${phuHopHtml}</div>` : ''}
    ${lp.ve_nguoi_ban ? `<div class="lp-section"><h2 class="lp-h2">Về người bán</h2><p class="lp-body">${esc(lp.ve_nguoi_ban)}</p></div>` : ''}
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
    <div class="wrap"><div class="card">
      ${coverHtml}
      ${dinhDangBadgeHtml}
      ${hookHtml}
      <h1>${esc(product.title)}</h1>
      ${product.description ? `<p class="desc">${esc(product.description)}</p>` : ''}
      ${webinarPreHtml}
      ${lp ? landingPageIntroHtml(lp) : ''}
      <div class="price">${Number(product.price).toLocaleString('vi-VN')}đ</div>
      ${buyHtml}
      <div class="hint-box" style="margin-top:12px;text-align:center;">🔒 Cam kết hoàn tiền 100% nếu không hài lòng trong 7 ngày</div>
      ${lp ? landingPageFaqHtml(lp) : ''}
    </div></div>
  `;

  const buyBtn = document.getElementById('buy-btn');
  if (buyBtn) buyBtn.onclick = async () => {
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
