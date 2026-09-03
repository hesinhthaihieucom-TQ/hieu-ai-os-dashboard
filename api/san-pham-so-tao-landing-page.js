// "🖥️ Tạo Landing Page" — AI viết nội dung landing page đầy đủ hơn (hook/vấn đề/lợi ích/FAQ/CTA...)
// cho 1 sản phẩm đã có (title/description/dinh_dang/price), LƯU vào digital_products.landing_page_content
// (jsonb) — không tạo lại mỗi lần khách xem trang. Chỉ đúng chủ sở hữu sản phẩm mới gọi được (lọc
// owner_id = user.id, giống pattern api/san-pham-so-product.js).

const { requireUser } = require('./_lib/auth');
const { checkAndConsumeSpsQuota, refundSpsQuota } = require('./_lib/sps-ai-quota');
const { supabaseAdmin } = require('./_lib/supabase-admin');
const { TOOL_LANDING_PAGE } = require('./_lib/landing-page-schema');

const DINH_DANG_LABEL = {
  ebook: 'Ebook', checklist_workbook: 'Checklist/Workbook', template_file_mau: 'Template/File mẫu',
  mini_course: 'Mini-course', coaching_1_1: 'Coaching 1-1', cong_dong_tra_phi: 'Cộng đồng trả phí', webinar: 'Webinar',
};

// 2026-09-03 (Quỳnh: "muốn mẫu là làm y hệt, không tự làm theo bản nội dung cũ") — 4 mẫu giao diện
// (xem san-pham-so/p/script.js) giờ cũng viết GIỌNG VĂN khác nhau đúng đặc trưng từng trang tham
// khảo, không chỉ đổi cách trình bày trên CÙNG 1 văn phong nữa. Field/schema vẫn dùng chung (xem
// api/_lib/landing-page-schema.js — không đổi để tránh 4 schema riêng phức tạp), chỉ đổi CÁCH VIẾT.
const TEMPLATE_VOICE = {
  quynh: 'Giọng ấm áp, cá nhân, hơi chiêm nghiệm/tâm linh — câu văn mượt, dùng hình ảnh ẩn dụ nhẹ nhàng (kiểu "khơi thông dòng chảy", "gỡ từng nút thắt"). Đây là giọng gốc quen thuộc của app này, giữ nguyên phong cách đó.',
  video: 'Giọng NGẮN, MẠNH, THỰC CHIẾN — câu ngắn, nhiều động từ hành động, không vòng vo, không ẩn dụ dài dòng. Viết như đang huấn luyện trực tiếp 1-1, ưu tiên câu khẳng định dứt khoát kiểu "Không phải X. Là Y." Tránh câu phức nhiều mệnh đề.',
  sach: 'Giọng KỂ CHUYỆN, TÂM SỰ THẬT LÒNG — như đang viết thư tay cho 1 người bạn thân, xưng "mình", câu văn dài hơi hơn, có đoạn tự sự/giãi bày cảm xúc thật, hạn chế liệt kê khô khan, ưu tiên đoạn văn liền mạch có cảm xúc.',
  chuyengia: 'Giọng CHUYÊN NGHIỆP, RÕ RÀNG, TẬP TRUNG HIỆU QUẢ/KẾT QUẢ KINH DOANH — câu gọn, đi thẳng vào lợi ích thực tế, hạn chế cảm xúc hoá quá đà, phù hợp đối tượng coach/chuyên gia/chủ doanh nghiệp.',
};

const SYSTEM_PROMPT = `Bạn là chuyên gia viết landing page bán sản phẩm số — nhiệm vụ viết nội dung ĐẦY ĐỦ, CÓ CẤU TRÚC như 1 landing page bán hàng thật (không hời hợt, không viết chung chung qua loa), chạm đúng vấn đề/kết quả thật của sản phẩm đã có, theo đúng schema.

NGUYÊN TẮC BẮT BUỘC:
- TUYỆT ĐỐI không bịa số liệu/thành tích/testimonial/tên người/ưu đãi không có thật — nếu thiếu thông tin cụ thể, viết chung chung thay vì tự chế ra chi tiết giả. Ảnh case study thật và ưu đãi tặng kèm do người bán tự cung cấp riêng, KHÔNG thuộc phần bạn viết.
- Vấn đề (van_de_chi_tiet) phải tách thành các vấn đề CON có TÊN RIÊNG dễ nhớ, không viết 1 đoạn văn chung.
- Chương trình (chuong_trinh) phải chia theo từng phần/chặng cụ thể, BÁM SÁT mô tả sản phẩm đã có — không tự thêm nội dung/tính năng không tồn tại.
- Lời nhắn người bán (loi_nhan_nguoi_ban) viết giọng cá nhân, xưng "tôi", khác hẳn đoạn tiểu sử "về người bán".
- Output tiếng Việt, gọi người đọc là "bạn".`;

async function callClaude({ apiKey, userContent }) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 150000);
  let resp;
  try {
    resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: 'claude-sonnet-5',
        max_tokens: 4000,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userContent }],
        tools: [TOOL_LANDING_PAGE],
        tool_choice: { type: 'tool', name: TOOL_LANDING_PAGE.name },
      }),
      signal: controller.signal,
    });
  } catch (e) {
    if (e.name === 'AbortError') throw new Error('AI phản hồi quá lâu (quá 150 giây) — có thể đang quá tải, thử lại giúp mình.');
    throw e;
  } finally {
    clearTimeout(timer);
  }
  if (!resp.ok) throw new Error(`Anthropic API lỗi (${resp.status}): ${await resp.text()}`);
  const data = await resp.json();
  if (data.stop_reason === 'max_tokens') throw new Error('AI trả lời quá dài bị cắt giữa chừng — thử lại giúp mình.');
  const toolUse = (data.content || []).find((b) => b.type === 'tool_use');
  if (!toolUse) throw new Error('Không nhận được kết quả có cấu trúc từ AI.');
  if (!Array.isArray(toolUse.input.van_de_chi_tiet) || !Array.isArray(toolUse.input.chuong_trinh) || !Array.isArray(toolUse.input.faq)) throw new Error('AI trả về kết quả không đúng định dạng — thử lại giúp mình.');
  return toolUse.input;
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

  const user = await requireUser(req);
  if (!user) { res.status(401).json({ error: 'Bạn cần đăng nhập để dùng tính năng này.' }); return; }

  const quotaError = await checkAndConsumeSpsQuota(user.id, 'san-pham-so-tao-landing-page');
  if (quotaError) { res.status(402).json({ error: quotaError, quotaExceeded: true }); return; }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) { res.status(500).json({ error: 'Server chưa được cấu hình ANTHROPIC_API_KEY.' }); return; }

  try {
    const { product_id, template } = req.body || {};
    if (!product_id) { res.status(400).json({ error: 'Thiếu product_id.' }); return; }
    const voiceGuide = TEMPLATE_VOICE[template] || TEMPLATE_VOICE.quynh;

    // profiles(full_name): dùng embed của PostgREST qua đúng FK owner_id->profiles(id) đã có sẵn —
    // lấy tên người bán thật để AI viết "về người bán" đúng, không bịa.
    const prodResp = await supabaseAdmin(`digital_products?id=eq.${product_id}&owner_id=eq.${user.id}&select=id,title,description,price,dinh_dang,profiles(full_name)`);
    const prodRows = prodResp.ok ? await prodResp.json() : [];
    const product = prodRows[0];
    if (!product) { res.status(404).json({ error: 'Không tìm thấy sản phẩm.' }); return; }

    const dinhDangLabel = DINH_DANG_LABEL[product.dinh_dang] || 'Sản phẩm số';
    const sellerName = (product.profiles && product.profiles.full_name) || null;
    const userContent = `TÊN SẢN PHẨM: ${product.title}\nLOẠI: ${dinhDangLabel}\nGIÁ: ${product.price}đ\nMÔ TẢ ĐÃ CÓ: ${product.description || '(chưa có mô tả)'}\nTÊN NGƯỜI BÁN: ${sellerName || '(chưa đặt tên, viết chung chung không nêu tên)'}\n\nGIỌNG VĂN BẮT BUỘC CHO TOÀN BỘ NỘI DUNG: ${voiceGuide}\n\nHãy viết nội dung landing page theo đúng schema, ĐÚNG giọng văn ở trên.`;

    const result = await callClaude({ apiKey, userContent });

    const saveResp = await supabaseAdmin(`digital_products?id=eq.${product_id}&owner_id=eq.${user.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ landing_page_content: result, updated_at: new Date().toISOString() }),
    });
    const savedRows = saveResp.ok ? await saveResp.json() : [];
    if (!saveResp.ok || !savedRows[0]) { res.status(500).json({ error: 'Không lưu được landing page — thử lại giúp mình.' }); return; }

    res.status(200).json({ result });
  } catch (err) {
    await refundSpsQuota(user.id, 'san-pham-so-tao-landing-page');
    res.status(500).json({ error: err.message || 'Có lỗi xảy ra khi viết landing page.' });
  }
};
