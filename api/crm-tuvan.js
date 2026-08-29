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
Xác định đúng nhánh dựa trên nội dung khách hỏi; nếu không rõ, chọn nhánh gần nhất và nêu rõ sự không chắc chắn trong ghi_chu_ai.

KHUNG FORM-HD (chỉ áp dụng khi nhanh="D"): mỗi khách nhánh D cần khai thác dần 6 mục sau qua nhiều lần trò chuyện — không hỏi dồn hết 1 lúc, hỏi tự nhiên đúng chỗ câu chuyện đang dẫn tới, và chỉ ghi vào field khi khách THỰC SỰ có nói tới (không suy đoán):
F — Gia đình: tình trạng hôn nhân, con cái, người phụ thuộc.
O — Occupation/Công việc: đang làm gì, thu nhập hiện tại, thời gian rảnh.
R — Sở thích/Quan hệ: sở thích cá nhân, mối quan hệ xã hội, mạng lưới.
M — Money: khả năng tài chính, mức đầu tư sẵn sàng bỏ ra.
H — Sức khỏe: tình trạng hiện tại, có ảnh hưởng gì tới khả năng làm việc.
D — Desire/Mong muốn: mục tiêu, ước mơ, điều họ đang tìm kiếm.
Field nào chưa khai thác được thì xuất đúng nguyên văn "Chưa có" — TUYỆT ĐỐI không bịa. Field nào hồ sơ cũ đã khai thác được (khác "Chưa có") thì GIỮ NGUYÊN trong output, không ghi đè lại thành "Chưa có" chỉ vì chat lần này không nhắc lại.`;

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
        // cache_control trên system — SYSTEM_PROMPT + tool schema (đứng trước system trong thứ tự
        // Anthropic ghép request) giống hệt nhau mỗi lượt, cache lại giảm ~90% chi phí phần đó từ
        // lượt gọi thứ 2 trở đi trong vòng 5 phút — không đổi hành vi, chỉ giảm chi phí.
        system: [{ type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
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

const NO_NAME_SENTINEL = 'CHƯA_RÕ_TEN';

function buildContentBlocks({ todayIso, profile, customer, sanPhamDichVu, cauChuyen, note, imgList }) {
  const contentBlocks = [];
  let contextText = `HÔM NAY: ${todayIso}\nLEADER PHỤ TRÁCH: ${(profile && profile.full_name) || '(chưa đặt tên)'}\n`;
  if (customer && (customer.id || customer.ten_khach_hang)) {
    contextText += `\nHỒ SƠ KHÁCH ĐÃ CÓ (nếu đúng người, ghi lại field khach_hang.ten_khach_hang khớp đúng tên này để hệ thống cập nhật thay vì tạo mới):\n${JSON.stringify(customer, null, 2)}\n`;
  } else {
    contextText += `\nCHƯA CÓ HỒ SƠ KHÁCH KHỚP — nếu xác định được tên khách, hệ thống sẽ tạo hồ sơ mới.\n`;
  }
  if (sanPhamDichVu && String(sanPhamDichVu).trim()) {
    contextText += `\nTHÔNG TIN SẢN PHẨM/DỊCH VỤ (chỉ dùng đúng giá/gói trong này, không bịa thêm):\n${sanPhamDichVu.trim()}\n`;
  }
  if (cauChuyen && cauChuyen.nguon === 'cau-chuyen' && cauChuyen.answers) {
    const lines = Object.keys(STORY_QUESTION_LABELS).map((id) => {
      const val = cauChuyen.answers[id] ? String(cauChuyen.answers[id]).trim() : '';
      return val ? `- ${STORY_QUESTION_LABELS[id]}: ${val}` : null;
    }).filter(Boolean);
    if (lines.length) {
      contextText += `\nCÂU CHUYỆN CÁ NHÂN CỦA NGƯỜI VẬN HÀNH (dùng để câu tư vấn gợi ý bám đúng giọng/câu chuyện thật nếu phù hợp, không bắt buộc nhắc mỗi lần):\n${lines.join('\n')}\n`;
    }
  } else if (cauChuyen && cauChuyen.nguon === 'dinh-vi' && cauChuyen.luot1) {
    const cc = cauChuyen.luot1.cau_chuyen_ca_nhan;
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
  return contentBlocks;
}

// Khớp hồ sơ khách theo ĐÚNG tên (không phân biệt hoa/thường), scoped theo user — trả về mảng để gọi
// nơi dùng tự quyết định theo số lượng khớp (0 = tạo mới, 1 = cập nhật, >1 = không tự đoán, xem dưới).
async function findCustomersByName(token, userId, name) {
  const resp = await supabaseAsUser(token, `crm_customers?user_id=eq.${userId}&ten_khach_hang=ilike.${encodeURIComponent(name)}&select=*`);
  return resp.ok ? await resp.json() : [];
}

async function fetchRecentInteractions(token, customerId) {
  const resp = await supabaseAsUser(token, `crm_interactions?customer_id=eq.${customerId}&select=thoi_gian,noi_dung,ket_qua,buoc_tiep_theo&order=created_at.desc&limit=3`);
  return resp.ok ? await resp.json() : [];
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
    const { images, note, manual_ten_khach_hang, san_pham_dich_vu, cau_chuyen } = req.body || {};
    const imgList = Array.isArray(images) ? images : (images ? [images] : []);
    if (!imgList.length && !(note && note.trim())) {
      res.status(400).json({ error: 'Cần ít nhất 1 ảnh chụp chat hoặc mô tả tình huống.' });
      return;
    }

    const todayIso = new Date().toISOString().slice(0, 10);
    let customer = null; // hồ sơ khách đã khớp (nếu có) — để trống nghĩa là sẽ tạo hồ sơ mới
    let result;
    let ambiguousNameNote = null;

    if (manual_ten_khach_hang && manual_ten_khach_hang.trim()) {
      // Người vận hành vừa gõ bổ sung tên sau khi AI báo không đọc được — khớp trước rồi mới hỏi AI,
      // để AI có đủ HỒ SƠ KHÁCH ĐÃ CÓ ngay từ lượt gọi đầu (không cần gọi 2 lần trong nhánh này).
      const name = manual_ten_khach_hang.trim();
      const matches = await findCustomersByName(token, user.id, name);
      if (matches.length === 1) {
        customer = { ...matches[0], lich_su_gan_day: await fetchRecentInteractions(token, matches[0].id) };
      }
      const contentBlocks = buildContentBlocks({ todayIso, profile, customer, sanPhamDichVu: san_pham_dich_vu, cauChuyen: cau_chuyen, note, imgList });
      result = await callClaude({ apiKey, contentBlocks });
      result.khach_hang.ten_khach_hang = name; // giữ đúng tên người dùng vừa xác nhận, không để AI viết lệch đi
    } else {
      // Lượt đầu — chưa biết là khách nào, để AI tự đọc tên từ ảnh/mô tả trước (không có HỒ SƠ KHÁCH ĐÃ CÓ).
      const contentBlocks1 = buildContentBlocks({ todayIso, profile, customer: null, sanPhamDichVu: san_pham_dich_vu, cauChuyen: cau_chuyen, note, imgList });
      const result1 = await callClaude({ apiKey, contentBlocks: contentBlocks1 });
      const extractedName = (result1.khach_hang.ten_khach_hang || '').trim();

      if (!extractedName || extractedName === NO_NAME_SENTINEL) {
        // Không đọc được tên nào — hỏi lại người vận hành, CHƯA ghi gì vào CRM (đợi tên rồi mới ghi 1 lần).
        res.status(200).json({ needsName: true });
        return;
      }

      const matches = await findCustomersByName(token, user.id, extractedName);
      if (matches.length === 1) {
        // Khớp đúng 1 khách — gọi lại lượt 2 KÈM hồ sơ cũ để AI cộng dồn đúng (nhom_nhu_cau/rao_can/
        // form_hd/...), tránh lặp lại lỗi "gọi không có ngữ cảnh thì ghi đè mất dữ liệu cũ" đã sửa hôm nay.
        customer = { ...matches[0], lich_su_gan_day: await fetchRecentInteractions(token, matches[0].id) };
        const contentBlocks2 = buildContentBlocks({ todayIso, profile, customer, sanPhamDichVu: san_pham_dich_vu, cauChuyen: cau_chuyen, note, imgList });
        result = await callClaude({ apiKey, contentBlocks: contentBlocks2 });
      } else {
        result = result1;
        if (matches.length > 1) {
          // Nhiều khách trùng tên — không tự đoán khách nào đúng (nguyên tắc "không tự gộp khách nếu
          // chưa chắc"), tạo hồ sơ mới và nêu rõ để người vận hành tự kiểm tra/gộp tay nếu cần.
          ambiguousNameNote = `[Lưu ý: có ${matches.length} khách trùng tên "${extractedName}" trong hồ sơ — kiểm tra lại thủ công để tránh tạo trùng.]`;
        }
      }
    }

    if (ambiguousNameNote) {
      result.khach_hang.ghi_chu_ai = result.khach_hang.ghi_chu_ai
        ? `${result.khach_hang.ghi_chu_ai} ${ambiguousNameNote}` : ambiguousNameNote;
    }

    // Ghi CRM — cập nhật nếu khớp hồ sơ cũ, ngược lại tạo mới. lan_tuong_tac_cuoi/ngay_follow_tiep
    // LUÔN set cùng lúc (đúng nguyên tắc gốc: 2 field này Lark Automation dùng để tự nhắc lịch).
    const customerPayload = {
      ...result.khach_hang,
      // AI chỉ điền leader_phu_trach nếu hồ sơ cũ đã có/chat nêu rõ — hồ sơ MỚI thì mặc định là chính
      // người đang dùng app (đúng thực tế: người thao tác app cũng là người phụ trách khách này).
      leader_phu_trach: result.khach_hang.leader_phu_trach || (customer && customer.leader_phu_trach) || (profile && profile.full_name) || null,
      // nhanh xác định lại mỗi lần tư vấn (dùng đúng phân loại của lượt này); form_hd chỉ AI xuất khi
      // nhanh="D" — giữ lại form_hd cũ nếu lượt này không phải nhánh D/AI không xuất gì mới, tránh mất
      // dữ liệu FORM-HD đã khai thác được từ trước.
      nhanh: result.nhanh || (customer && customer.nhanh) || null,
      form_hd: result.khach_hang.form_hd || (customer && customer.form_hd) || null,
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
