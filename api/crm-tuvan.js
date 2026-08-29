// Serverless function — Trợ Lý AI Tư Vấn & CRM (tro-ly-crm/): đọc ảnh chụp/nội dung chat với khách,
// tư vấn câu hỏi/câu chốt dùng ngay theo đúng nhánh A/B/C/D, và TỰ ghi thẳng vào crm_customers +
// crm_interactions — thay cho kiểu multi-tool-call (search→upsert→log tách rời qua GPT Actions) của
// bản ChatGPT+Lark cũ. Không giới hạn lượt AI/tháng cho sản phẩm này (chị Quỳnh chốt 2026-08-29) —
// chỉ gate theo profiles.crm_has_paid/crm_access_until, không đụng hệ trial-quota của Xây Nhân Hiệu.

const { requireUser } = require('./_lib/auth');
const { TOOL_TU_VAN_CRM } = require('./_lib/crm-tuvan-schema');

const SUPABASE_URL = 'https://ltcjlnvceuspnwldsbgi.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_j0ohsTIc7Df5_dz5vDiniA_nB5jPYWy';

// Nhãn hiển thị cho answers.q1..q20 — PHẢI khớp đúng id trong tro-ly-crm/js/cau-chuyen.js's QUESTIONS
// (bộ câu hỏi lấy nguyên từ trang-ban-dich-vu.html, không phải bộ câu hỏi Định Vị AI).
const STORY_QUESTION_LABELS = {
  q1: 'Công việc hiện tại', q2: 'Bắt đầu từ năm nào', q3: 'Thế mạnh',
  q4: 'Công việc trước đây', q5: 'Giai đoạn khó khăn đáng nhớ',
  q6: 'Mô tả giai đoạn khó khăn nhất', q7: 'Từng tự hỏi những câu gì',
  q8: 'Biết đến công việc/người dẫn dắt qua đâu', q9: 'Điều ấn tượng/quyết định bắt đầu',
  q10: 'Tình hình lúc quyết định bắt đầu', q11: 'Đã làm gì để nghiêm túc bắt đầu',
  q12: 'Kết quả đầu tiên', q13: 'Mốc quan trọng tiếp theo',
  q14: 'Thay đổi lớn nhất ở bản thân', q15: 'Số liệu hiện tại',
  q16: 'Vấn đề sức khỏe quan tâm', q17: 'Trải nghiệm đồng hành cùng khách hàng',
  q18: 'Muốn giúp mọi người đạt được điều gì', q19: 'Muốn giúp đối tượng khách hàng nào',
  q20: 'Vì sao khách nên nghe bạn',
};

const SYSTEM_PROMPT = `Bạn là TRỢ LÝ AI TƯ VẤN & CRM — làm việc trực tiếp cho người vận hành (không đóng vai người bán, hỗ trợ người vận hành ở vị thế người dẫn dắt). Nhiệm vụ: đọc/hiểu chat tư vấn (ảnh/text), phân tích nỗi đau/mức sẵn sàng, gợi ý câu hỏi/câu chốt đúng quy trình từng nhánh, và xuất dữ liệu để hệ thống tự ghi vào CRM.

NGUYÊN TẮC TƯ VẤN CHUNG (áp dụng mọi nhánh A/B/C/D):
- Câu hỏi/câu chốt gợi ý phải NGẮN GỌN (1-2 câu), tự nhiên như đang nhắn tin thật, không dồn nhiều câu hỏi cùng lúc, không giống thẩm vấn.
- Luôn giữ quyền dẫn dắt: khách lạc đề/hỏi dồn/hỏi giá thẳng/đổi chủ đề → gợi ý trả lời đúng phần cần thiết rồi chủ động đưa khách quay lại đúng bước hiện tại.
- KHÔNG tự nhảy sang nhánh khác chỉ vì khách nhắc 1 từ khóa liên quan — chỉ đổi nhánh khi khách chủ động, rõ ràng đổi hẳn chủ đề.
- Vai trò là người đồng hành, không dạy dỗ hay bán hàng cứng ép chốt.
- KHÔNG bịa giá/tên gói/link nếu không có trong phần "THÔNG TIN SẢN PHẨM/DỊCH VỤ" được cung cấp — thiếu dữ liệu thì để trống field đó và ghi rõ trong ghi_chu_ai là còn thiếu thông tin gì.
- KHÔNG tự chẩn đoán bệnh, không tự gộp khách nếu chưa chắc là cùng 1 người (nếu chưa chắc, vẫn cứ tạo/ghi theo tên khách nhưng nêu rõ nghi vấn trong ghi_chu_ai để người vận hành tự xác nhận).
- Phân biệt SỰ THẬT (từ ảnh/nội dung) và SUY LUẬN (đánh giá của bạn) — không lẫn lộn 2 loại này khi viết vào các field.

NGUYÊN TẮC CẬP NHẬT HỒ SƠ ĐÃ CÓ (khi có "HỒ SƠ KHÁCH ĐÃ CÓ" trong ngữ cảnh): mọi field bạn xuất ra trong "khach_hang" sẽ THAY THẾ HOÀN TOÀN giá trị cũ trong CRM, không tự cộng dồn phía hệ thống — vì vậy bạn phải tự cộng dồn TRƯỚC khi xuất. Với nhom_nhu_cau/rao_can: xuất mảng ĐẦY ĐỦ gồm mục cũ còn đúng + mục mới, chỉ bỏ mục cũ khi chat lần này cho thấy rõ nó không còn đúng (VD rào cản đã được gỡ). Với nhu_cau_cu_the/giai_phap_phu_hop/hanh_dong_tiep_theo/gia_tri_du_kien/ket_qua: viết bản cập nhật đầy đủ (giữ thông tin cũ còn giá trị, bổ sung/sửa theo tin mới) thay vì chỉ mô tả mỗi đoạn chat đang đọc. Field nào hồ sơ cũ đã có và chat lần này không nhắc gì thêm/không có gì đổi thì GIỮ NGUYÊN giá trị cũ trong output, đừng để trống.

NHỊP FOLLOW THEO ĐỘ NÓNG: Nóng 1-2 ngày, Ấm 3-5 ngày, Lạnh 7-14 ngày kể từ hôm nay. Giai đoạn Chốt/Đã mua-onboarding/Mất thì KHÔNG tính ngày follow tiếp (để trống).

4 NHÁNH:
A. HIỂU MẠNH — Sức khỏe (giảm mỡ/tăng cơ/chuyển hóa/năng lượng).
B. HIỂU HẠNH — Tâm linh/Tài chính/Phát triển bản thân.
C. HIỂU KÊNH — Nhân hiệu/Content/Kinh doanh online.
D. KINH DOANH/ĐỐI TÁC — cơ hội kinh doanh, đối tác.
Xác định đúng nhánh dựa trên nội dung khách hỏi; nếu không rõ, chọn nhánh gần nhất và nêu rõ sự không chắc chắn trong ghi_chu_ai.`;

async function callClaude({ apiKey, contentBlocks }) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 90000);
  let resp;
  try {
    resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: 'claude-sonnet-5',
        max_tokens: 4000,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: contentBlocks }],
        tools: [TOOL_TU_VAN_CRM],
        tool_choice: { type: 'tool', name: TOOL_TU_VAN_CRM.name },
      }),
      signal: controller.signal,
    });
  } catch (e) {
    if (e.name === 'AbortError') throw new Error('AI phản hồi quá lâu (quá 90 giây) — có thể đang quá tải, thử lại giúp mình.');
    throw e;
  } finally {
    clearTimeout(timer);
  }
  if (!resp.ok) throw new Error(`Anthropic API lỗi (${resp.status}): ${await resp.text()}`);
  const data = await resp.json();
  const toolUse = (data.content || []).find((b) => b.type === 'tool_use');
  if (!toolUse) throw new Error('Không nhận được kết quả có cấu trúc từ AI.');
  return toolUse.input;
}

function imageBlockFromDataUrl(dataUrl) {
  const m = /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/.exec(dataUrl || '');
  if (!m) return null;
  return { type: 'image', source: { type: 'base64', media_type: m[1], data: m[2] } };
}

// Gọi PostgREST bằng ĐÚNG token của user (không dùng service role) — RLS "owner_all" tự cho phép
// vì auth.uid() khớp user_id, không cần quyền bỏ qua RLS cho việc ghi dữ liệu của chính họ.
async function supabaseAsUser(token, path, opts = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  try {
    return await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
      ...opts,
      headers: {
        'content-type': 'application/json',
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${token}`,
        Prefer: opts.prefer || 'return=representation',
        ...(opts.headers || {}),
      },
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

  const authHeader = req.headers['authorization'] || req.headers['Authorization'];
  const token = authHeader ? authHeader.replace(/^Bearer\s+/i, '') : null;

  const user = await requireUser(req);
  if (!user || !token) { res.status(401).json({ error: 'Bạn cần đăng nhập để dùng tính năng này.' }); return; }

  // Gate riêng sản phẩm này — không đụng has_paid/access_until (Xây Nhân Hiệu) hay hệ trial-quota.
  const profResp = await supabaseAsUser(token, `profiles?id=eq.${user.id}&select=crm_has_paid,crm_access_until,full_name`);
  const profRows = profResp.ok ? await profResp.json() : [];
  const profile = profRows[0];
  const isActive = profile && profile.crm_has_paid && profile.crm_access_until && new Date(profile.crm_access_until).getTime() > Date.now();
  if (!isActive) {
    res.status(402).json({ error: 'Gói của bạn chưa kích hoạt hoặc đã hết hạn — vào mục "Nâng Cấp" để tiếp tục dùng.', needsUpgrade: true });
    return;
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) { res.status(500).json({ error: 'Server chưa được cấu hình ANTHROPIC_API_KEY.' }); return; }

  try {
    const { images, note, customer, san_pham_dich_vu, cau_chuyen } = req.body || {};
    const imgList = Array.isArray(images) ? images : (images ? [images] : []);
    if (!imgList.length && !(note && note.trim())) {
      res.status(400).json({ error: 'Cần ít nhất 1 ảnh chụp chat hoặc mô tả tình huống.' });
      return;
    }

    const todayIso = new Date().toISOString().slice(0, 10);
    const contentBlocks = [];
    let contextText = `HÔM NAY: ${todayIso}\nLEADER PHỤ TRÁCH: ${(profile && profile.full_name) || '(chưa đặt tên)'}\n`;
    if (customer && (customer.id || customer.ten_khach_hang)) {
      contextText += `\nHỒ SƠ KHÁCH ĐÃ CÓ (nếu đúng người, ghi lại field khach_hang.ten_khach_hang khớp đúng tên này để hệ thống cập nhật thay vì tạo mới):\n${JSON.stringify(customer, null, 2)}\n`;
    } else {
      contextText += `\nCHƯA CÓ HỒ SƠ KHÁCH KHỚP — nếu xác định được tên khách, hệ thống sẽ tạo hồ sơ mới.\n`;
    }
    if (san_pham_dich_vu && String(san_pham_dich_vu).trim()) {
      contextText += `\nTHÔNG TIN SẢN PHẨM/DỊCH VỤ (chỉ dùng đúng giá/gói trong này, không bịa thêm):\n${san_pham_dich_vu.trim()}\n`;
    }
    if (cau_chuyen && cau_chuyen.nguon === 'cau-chuyen' && cau_chuyen.answers) {
      const lines = Object.keys(STORY_QUESTION_LABELS).map((id) => {
        const val = cau_chuyen.answers[id] ? String(cau_chuyen.answers[id]).trim() : '';
        return val ? `- ${STORY_QUESTION_LABELS[id]}: ${val}` : null;
      }).filter(Boolean);
      if (lines.length) {
        contextText += `\nCÂU CHUYỆN CÁ NHÂN CỦA NGƯỜI VẬN HÀNH (dùng để câu tư vấn gợi ý bám đúng giọng/câu chuyện thật nếu phù hợp, không bắt buộc nhắc mỗi lần):\n${lines.join('\n')}\n`;
      }
    } else if (cau_chuyen && cau_chuyen.nguon === 'dinh-vi' && cau_chuyen.luot1) {
      const cc = cau_chuyen.luot1.cau_chuyen_ca_nhan;
      if (cc && cc.cau_chuyen) {
        contextText += `\nCÂU CHUYỆN CÁ NHÂN CỦA NGƯỜI VẬN HÀNH (từ hồ sơ Định Vị AI — dùng để câu tư vấn gợi ý bám đúng giọng/câu chuyện thật nếu phù hợp, không bắt buộc nhắc mỗi lần):\n${cc.cau_chuyen}\n`;
      }
    }
    if (note && note.trim()) contextText += `\nMÔ TẢ/GHI CHÚ THÊM TỪ NGƯỜI VẬN HÀNH: ${note.trim()}\n`;
    contentBlocks.push({ type: 'text', text: contextText });

    imgList.forEach((dataUrl) => {
      const block = imageBlockFromDataUrl(dataUrl);
      if (block) contentBlocks.push(block);
    });

    const result = await callClaude({ apiKey, contentBlocks });

    // Ghi CRM — cập nhật nếu có customer.id khớp, ngược lại tạo mới. lan_tuong_tac_cuoi/ngay_follow_tiep
    // LUÔN set cùng lúc (đúng nguyên tắc gốc: 2 field này Lark Automation dùng để tự nhắc lịch).
    const customerPayload = {
      ...result.khach_hang,
      // AI chỉ điền leader_phu_trach nếu hồ sơ cũ đã có/chat nêu rõ — hồ sơ MỚI thì mặc định là chính
      // người đang dùng app (đúng thực tế: người thao tác app cũng là người phụ trách khách này).
      leader_phu_trach: result.khach_hang.leader_phu_trach || (customer && customer.leader_phu_trach) || (profile && profile.full_name) || null,
      lan_tuong_tac_cuoi: todayIso,
      ngay_follow_tiep: result.ngay_follow_tiep || null,
      user_id: user.id,
    };

    let savedCustomer;
    if (customer && customer.id) {
      const upd = await supabaseAsUser(token, `crm_customers?id=eq.${customer.id}&user_id=eq.${user.id}`, {
        method: 'PATCH',
        body: JSON.stringify(customerPayload),
      });
      const rows = upd.ok ? await upd.json() : [];
      savedCustomer = rows[0];
    } else {
      const ins = await supabaseAsUser(token, 'crm_customers', {
        method: 'POST',
        body: JSON.stringify(customerPayload),
      });
      const rows = ins.ok ? await ins.json() : [];
      savedCustomer = rows[0];
    }

    let savedInteraction = null;
    if (savedCustomer) {
      const interactionPayload = {
        customer_id: savedCustomer.id,
        user_id: user.id,
        thoi_gian: todayIso,
        kenh: result.khach_hang.kenh || null,
        ngay_follow_tiep: result.ngay_follow_tiep || null,
        ...result.tuong_tac,
      };
      const insInt = await supabaseAsUser(token, 'crm_interactions', {
        method: 'POST',
        body: JSON.stringify(interactionPayload),
      });
      const rows = insInt.ok ? await insInt.json() : [];
      savedInteraction = rows[0] || null;
    }

    res.status(200).json({ advice: result, customer: savedCustomer || null, interaction: savedInteraction });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Có lỗi xảy ra khi tư vấn.' });
  }
};
