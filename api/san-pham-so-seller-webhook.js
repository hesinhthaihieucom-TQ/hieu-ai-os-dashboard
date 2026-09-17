// Sản Phẩm Số — webhook RIÊNG cho người bán đã TỰ kết nối tài khoản SePay của chính họ (2026-09-07,
// xem schema_san_pham_so.sql mục 30). Người bán tự đăng ký SePay ĐỘC LẬP tại sepay.vn, tự liên kết
// ngân hàng của họ, tự tạo 1 Webhook trong dashboard SePay của họ trỏ về đúng URL của file này — giống
// hệt cách người bán tự đăng ký Heyzine riêng ở san-pham-so/js/tai-khoan.js, KHÔNG phải "SePay Bank
// Hub" (đòi hỏi Quỳnh có hợp đồng đối tác trả phí với SePay).
//
// CỐ Ý tách riêng khỏi api/sepay-webhook.js (file đó đang xử lý ĐÚNG luồng tiền thật cho nhan-hieu/
// tai-chinh/tro-ly-crm/sps-subscription/sps-đơn-lẻ-về-TK-Quỳnh — không sửa để tránh rủi ro hỏng luồng
// đang chạy tốt). Đơn hàng của người bán CHƯA tự kết nối vẫn đi qua sepay-webhook.js như cũ, tiền vẫn
// về TK Quỳnh — file này CHỈ nhận giao dịch của người bán ĐÃ điền đủ sps_seller_bank_* trên profiles.
//
// Bảo mật: MỖI người bán có 1 secret RIÊNG (sps_seller_webhook_secret, tự sinh 1 lần lúc lưu kết nối,
// xem update_sps_seller_bank_info) thay vì 1 API Key cố định dùng chung cho mọi người — Authorization
// header CHÍNH LÀ secret của người bán, dùng để tra RA LUÔN họ là ai (không cần đoán qua accountNumber),
// thu hẹp phạm vi nếu rò rỉ chỉ còn đúng 1 người bán đó. Sau khi xác định được người bán, vẫn đối chiếu
// thêm accountNumber thật từ SePay phải khớp ĐÚNG số TK người bán đó đã tự khai, VÀ đơn hàng phải thuộc
// ĐÚNG sản phẩm của chính người bán này (không phải của người khác) — cả 2 lớp cùng lúc mới set paid.

const crypto = require('crypto');
const { supabaseAdmin } = require('./_lib/supabase-admin');

// Cùng định dạng "SPS......" với api/sepay-webhook.js (đơn hàng Sản Phẩm Số mua lẻ, không có profile).
function extractProductOrderRefCode(content) {
  const m = /SPS[A-Z0-9]{6,}/i.exec(content || '');
  return m ? m[0].toUpperCase() : null;
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') { res.status(405).json({ success: false }); return; }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    res.status(500).json({ success: false, error: 'Server chưa cấu hình SUPABASE_SERVICE_ROLE_KEY.' });
    return;
  }

  const authHeader = req.headers['authorization'] || '';
  const providedSecret = authHeader.replace(/^Apikey\s+/i, '').trim();
  if (!providedSecret) { res.status(401).json({ success: false }); return; }

  const sellerResp = await supabaseAdmin(`profiles?sps_seller_webhook_secret=eq.${encodeURIComponent(providedSecret)}&select=id,sps_seller_bank_account`);
  const sellerRows = sellerResp.ok ? await sellerResp.json() : [];
  const seller = sellerRows[0];
  if (!seller) { res.status(401).json({ success: false }); return; }

  try {
    const body = req.body || {};
    const { id: sepayId, gateway, transactionDate, accountNumber, transferAmount, content, transferType } = body;

    if (transferType !== 'in') {
      res.status(200).json({ success: true });
      return;
    }

    // Chống xử lý trùng nếu SePay gửi lại cùng 1 giao dịch (retry) — dùng chung bảng sepay_transactions
    // với webhook chính (sepay_id là unique thật của SePay, không phân biệt theo webhook nào ghi).
    if (sepayId) {
      const dupCheck = await supabaseAdmin(`sepay_transactions?sepay_id=eq.${sepayId}&select=id`, { prefer: 'return=minimal' });
      const dupRows = dupCheck.ok ? await dupCheck.json() : [];
      if (Array.isArray(dupRows) && dupRows.length > 0) {
        res.status(200).json({ success: true });
        return;
      }
    }

    const refCode = extractProductOrderRefCode(content);
    let status = 'unmatched_code';
    let matchedProductOrderId = null;

    // accountNumber thật từ SePay phải khớp ĐÚNG số TK người bán này đã tự khai — secret đã xác định
    // đúng người bán, đây là lớp đối chiếu THỨ 2 (phòng trường hợp secret + accountNumber không khớp
    // nhau vì lý do gì đó, VD người bán đổi số TK nhưng SePay vẫn còn cấu hình webhook cũ).
    const accountMatches = seller.sps_seller_bank_account && accountNumber
      && String(seller.sps_seller_bank_account).trim() === String(accountNumber).trim();

    if (refCode && accountMatches) {
      const orderResp = await supabaseAdmin(`digital_product_orders?ref_code=eq.${refCode}&select=id,status,amount,product_id`);
      const orderRows = orderResp.ok ? await orderResp.json() : [];
      const order = orderRows[0];

      if (order) {
        if (order.status === 'paid') {
          // SePay gửi lại đúng giao dịch đã xử lý (retry) — idempotent, không patch lại.
          status = 'matched';
          matchedProductOrderId = order.id;
        } else {
          // Đơn hàng phải thuộc ĐÚNG sản phẩm của chính người bán vừa xác định qua secret — chặn
          // trường hợp secret của người bán A khớp nhưng ref_code lại là đơn của sản phẩm người bán B.
          const prodResp = await supabaseAdmin(`digital_products?id=eq.${order.product_id}&owner_id=eq.${seller.id}&select=id`);
          const prodRows = prodResp.ok ? await prodResp.json() : [];
          const ownsProduct = prodRows.length > 0;

          if (ownsProduct && order.amount === transferAmount) {
            const updateResp = await supabaseAdmin(`digital_product_orders?id=eq.${order.id}`, {
              method: 'PATCH',
              body: JSON.stringify({ status: 'paid', paid_at: new Date().toISOString(), download_token: crypto.randomUUID() }),
            });
            if (updateResp.ok) {
              status = 'matched';
              matchedProductOrderId = order.id;
            } else {
              status = 'unmatched_amount';
            }
          } else {
            status = 'unmatched_amount';
          }
        }
      } else {
        status = 'unmatched_code';
      }
    } else if (refCode) {
      status = 'unmatched_amount'; // ref_code có nhưng accountNumber không khớp người bán đã xác định
    }

    await supabaseAdmin('sepay_transactions', {
      method: 'POST',
      prefer: 'return=minimal',
      body: JSON.stringify({
        sepay_id: sepayId || null,
        gateway: gateway ? `${gateway} (seller-direct)` : 'seller-direct',
        transaction_date: transactionDate || null,
        account_number: accountNumber || null,
        transfer_amount: transferAmount || null,
        content: content || null,
        ref_code_found: refCode,
        matched_product_order_id: matchedProductOrderId,
        status,
      }),
    });

    res.status(200).json({ success: true });
  } catch (err) {
    // Luôn trả success:true cho SePay để tránh spam retry — lỗi thật cần xem log Vercel trực tiếp.
    res.status(200).json({ success: true });
  }
};
