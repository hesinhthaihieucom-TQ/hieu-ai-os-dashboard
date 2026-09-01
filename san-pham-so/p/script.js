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
        renderProduct(product, { ref_code: refCode, status: 'paid', downloadUrl: data.downloadUrl, fileName: data.fileName });
      }
    } catch (e) { /* lỗi mạng thoáng qua — thử lại ở lượt poll kế tiếp, không làm phiền bằng lỗi */ }
  }, 4000);
}

function renderProduct(product, order) {
  const coverHtml = product.cover_image_url ? `<img class="cover" src="${esc(product.cover_image_url)}" alt="">` : '';
  let buyHtml;

  if (!order) {
    buyHtml = `
      <input id="buyer-email" type="email" placeholder="Email (không bắt buộc — để nhận lại link nếu mất)">
      <button class="btn" id="buy-btn">Mua ngay — ${Number(product.price).toLocaleString('vi-VN')}đ</button>
    `;
  } else if (order.status === 'paid') {
    // fileName rỗng = sản phẩm giao bằng link ngoài (VD sách lật Heyzine) — không phải file tải về,
    // đổi nhãn nút cho đúng bản chất thay vì "Tải xuống" một link không phải file.
    const label = order.fileName ? `📥 Tải xuống ${esc(order.fileName)}` : '📖 Xem tài liệu của bạn →';
    buyHtml = `
      <div class="hint-box">✅ Đã thanh toán thành công!</div>
      <a class="btn" href="${esc(order.downloadUrl)}" target="_blank" rel="noopener">${label}</a>
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
      <h1>${esc(product.title)}</h1>
      ${product.description ? `<p class="desc">${esc(product.description)}</p>` : ''}
      <div class="price">${Number(product.price).toLocaleString('vi-VN')}đ</div>
      ${buyHtml}
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
      order = { ref_code: saved.ref_code, amount: saved.amount, status: data.status, downloadUrl: data.downloadUrl, fileName: data.fileName };
    }
  } catch (e) { /* đơn cũ tra lỗi (vd đã bị xoá) — coi như chưa mua, không chặn xem trang */ }

  renderProduct(product, order);
}

main();
