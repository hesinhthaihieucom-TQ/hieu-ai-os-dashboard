// Sản Phẩm Số — trang công khai gọi liên tục (poll) để biết đơn hàng đã được webhook khớp thanh
// toán chưa. Khi status='paid', sinh LUÔN 1 signed URL tải file (hết hạn sau 10 phút) trong cùng 1
// lượt gọi — khách bấm "Tải xuống" lại bất cứ lúc nào (quay lại trang, gọi lại endpoint này) để có
// link mới, không giới hạn số lần tải, nhưng mỗi link chỉ dùng được trong thời gian ngắn (không phải
// link public vĩnh viễn có thể bị chia sẻ lại cho người chưa trả tiền).

const { supabaseAdmin, SUPABASE_URL } = require('./_lib/supabase-admin');

module.exports = async (req, res) => {
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) { res.status(500).json({ error: 'Server chưa cấu hình SUPABASE_SERVICE_ROLE_KEY.' }); return; }

  try {
    const { ref_code } = req.body || {};
    if (!ref_code) { res.status(400).json({ error: 'Thiếu ref_code.' }); return; }

    const orderResp = await supabaseAdmin(`digital_product_orders?ref_code=eq.${encodeURIComponent(ref_code)}&select=id,status,product_id`);
    const orderRows = orderResp.ok ? await orderResp.json() : [];
    const order = orderRows[0];
    if (!order) { res.status(404).json({ error: 'Không tìm thấy đơn hàng.' }); return; }

    if (order.status !== 'paid') {
      res.status(200).json({ status: order.status });
      return;
    }

    const prodResp = await supabaseAdmin(`digital_products?id=eq.${order.product_id}&select=file_storage_path,file_name,external_link`);
    const prodRows = prodResp.ok ? await prodResp.json() : [];
    const product = prodRows[0];
    if (!product || (!product.file_storage_path && !product.external_link)) {
      res.status(200).json({ status: 'paid', error: 'Đã thanh toán nhưng file chưa sẵn sàng — liên hệ người bán để được hỗ trợ.' });
      return;
    }

    // Sản phẩm giao bằng LINK NGOÀI (VD sách lật Heyzine) — trả thẳng, không cần ký URL Storage vì
    // không có file nào trong Storage của app này cho trường hợp này.
    if (product.external_link) {
      res.status(200).json({ status: 'paid', downloadUrl: product.external_link, fileName: null });
      return;
    }

    const signResp = await fetch(`${SUPABASE_URL}/storage/v1/object/sign/digital-products/${product.file_storage_path}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
      body: JSON.stringify({ expiresIn: 600 }),
    });
    if (!signResp.ok) { res.status(200).json({ status: 'paid', error: 'Không tạo được link tải — thử lại sau vài phút.' }); return; }
    const signData = await signResp.json();

    // Thêm &download=<tên file> vào cuối URL đã ký — Supabase Storage đọc tham số này để trả
    // Content-Disposition: attachment (buộc trình duyệt TẢI VỀ thay vì mở xem trực tiếp trong tab).
    const downloadUrl = `${SUPABASE_URL}/storage/v1${signData.signedURL}&download=${encodeURIComponent(product.file_name || 'file')}`;

    res.status(200).json({
      status: 'paid',
      downloadUrl,
      fileName: product.file_name,
    });
  } catch (e) {
    res.status(500).json({ error: 'Có lỗi xảy ra — thử lại giúp mình.' });
  }
};
