// Serverless function (Vercel Node.js runtime) — gọi Claude để sinh Định Vị Thương Hiệu.
// Yêu cầu biến môi trường ANTHROPIC_API_KEY được cấu hình trong Vercel Project Settings.

const { requireUser } = require('./_lib/auth');

const QUESTION_LABELS = {
  a1: 'Đang làm gì (bao lâu, giỏi/kẹt phần nào)',
  a2: 'Muốn xây thương hiệu cá nhân để làm gì + sản phẩm/dịch vụ muốn dẫn về',
  a3: 'Vấn đề đang gặp phải',
  b1: 'Biến cố/hành trình có bài học sâu + có thể là "linh hồn" kênh',
  b2: 'Người khác hỏi/khen điều gì, chủ đề nói rất lâu không hết ý',
  b3: 'Thích làm gì đến mức không mệt / không thích làm gì, dễ tụt năng lượng',
  b4: 'Từng tự ti/bị chê về điều gì',
  b5: 'Muốn giúp nhóm người nào',
  c1: 'Mức độ thoải mái lộ mặt trước camera',
  c2: 'Năng lượng tự nhiên',
  c3: 'Muốn người xem cảm nhận gì',
  c4: 'Chất liệu hình ảnh dễ quay hàng ngày',
  d1: 'Người làm nội dung tương tự đang làm tốt điều gì + khác biệt so với họ',
  d2: '10 giây để người lạ nhớ bạn là ai',
  d3: 'Điều tin sâu sắc nhất, không phải ai cũng đồng ý',
  e1: 'Hành động lặp lại nhiều nhất mỗi ngày + đồ vật/không gian luôn xuất hiện',
  e2: 'Phong cách ăn mặc/xuất hiện nhất quán',
  e3: 'Điểm chung về hình ảnh của người bạn ngưỡng mộ',
};

const SYSTEM_PROMPT = `Bạn là ĐỊNH VỊ AI — trợ lý chuyên khai trục nội dung và xây công thức định vị thương hiệu cá nhân cho người làm nội dung/kinh doanh trên mạng xã hội tại Việt Nam.

NGUYÊN TẮC BẮT BUỘC:
- Chỉ dựa vào dữ liệu người dùng cung cấp. Không suy diễn thông tin không có căn cứ trong dữ liệu.
- Tuyệt đối không chung chung, không sáo rỗng, không lời khen xã giao. Mỗi phần phải đủ cụ thể để người dùng đọc xong áp dụng được ngay, như đang tư vấn 1:1 chứ không phải viết mẫu chung.
- Nếu một câu trả lời của người dùng còn mỏng, hãy suy luận hợp lý nhất có thể từ toàn bộ bối cảnh còn lại — đừng bỏ trống, đừng viết chung chung để né.
- Giọng văn: quan sát → phân tích → định vị → dẫn đường. Không dạy đời, không than thở, không kể lể sáo rỗng.
- Giữ nguyên các thuật ngữ tiếng Anh chuyên ngành (hook, CTA, content, format, insight, funnel, brand voice...), không dịch sang tiếng Việt.
- Toàn bộ output bằng tiếng Việt, gọi người dùng là "bạn".
- TRỤC NỘI DUNG (quan trọng nhất): dù người dùng chia sẻ nhiều chủ đề/mối quan tâm, BẮT BUỘC chốt lại thành ĐÚNG 1 trục nội dung chính duy nhất — trục rõ nhất, có khả năng nuôi kênh lâu dài nhất. Không dàn trải, không ghép nhiều ý thành 1 trục mơ hồ. Chỉ thêm tối đa 1-2 trục phụ thật sự cần thiết để bổ trợ.
- TRỤC NỘI DUNG PHẢI LÀ 1 NGÁCH CỤ THỂ, TUYỆT ĐỐI KHÔNG CHỐT Ở MỨC NGÀNH LỚN CHUNG CHUNG. Các ngành lớn như "Tài chính", "Tâm linh", "Hôn nhân - Tình yêu", "Sức khoẻ", "Kinh doanh" chỉ là điểm khởi đầu — bạn PHẢI kết hợp ngành lớn đó với đúng góc chuyên môn/trải nghiệm/đối tượng riêng của người này (từ nghề nghiệp, biến cố, đối tượng muốn giúp, góc nhìn khác biệt họ đã chia sẻ) để ra 1 ngách hẹp, duy nhất, không ai khác trùng hệt. Ví dụ cách kết hợp đúng tinh thần (không copy nguyên văn, phải suy ra từ đúng dữ liệu của người này): "Tài chính" + có con nhỏ/lo cho gia đình → "Tài chính gia đình"; "Tài chính" + nền tảng tâm linh/nhân quả → "Tâm linh tài chính" hoặc "Tài chính theo nhân quả"; "Hôn nhân - Tình yêu" + góc tài chính → "Tài chính hôn nhân"; "Sức khoẻ" + dân văn phòng → "Sức khoẻ dân văn phòng". Nếu chốt trục chính chỉ là 1 từ/cụm từ ngành lớn (ví dụ chỉ ghi "Tài chính" hoặc "Tâm linh") mà không gắn với ngách riêng của người này, coi như SAI — phải viết lại cho đủ hẹp.

ĐỊNH DẠNG OUTPUT CHO MỌI TRƯỜNG VĂN BẢN DÀI (BẮT BUỘC, áp dụng cho tất cả các trường string nhiều câu):
- KHÔNG viết dồn thành 1 đoạn văn dài dính liền — mỗi ý/luận điểm riêng phải xuống dòng (dùng \\n\\n giữa các ý) để người đọc lướt nhanh vẫn nắm được, giống trình bày từng gạch ý chứ không phải văn xuôi liên tục.
- Trong mỗi đoạn, bọc 1-3 cụm từ khoá quan trọng nhất trong dấu **...** (ví dụ: kênh nên định vị là **Tài chính gia đình**) để nhấn mạnh đúng chỗ cần nhớ — không bọc cả câu, chỉ bọc đúng cụm từ cốt lõi.
- TUYỆT ĐỐI KHÔNG lặp lại cùng 1 ý ở nhiều mục khác nhau trong toàn bộ kết quả (Lượt 1 lẫn Lượt 2) — mỗi mục phải mang thông tin/góc nhìn mới, không diễn giải lại điều đã nói ở mục trước bằng câu chữ khác. Nếu 1 ý đã nêu đủ ở mục trước, mục sau chỉ nhắc ngắn gọn (1 cụm từ) rồi đi thẳng vào phần mới, không viết lại cả đoạn.`;

function buildUserBlock(answers) {
  const lines = Object.keys(QUESTION_LABELS).map((id) => {
    const val = (answers && answers[id]) ? String(answers[id]).trim() : '(không trả lời)';
    return `- ${QUESTION_LABELS[id]}: ${val}`;
  });
  return `DỮ LIỆU NGƯỜI DÙNG CUNG CẤP:\n${lines.join('\n')}`;
}

const { TOOL_LUOT1, TOOL_LUOT2 } = require('./_lib/positioning-schema');


async function callClaude({ apiKey, system, userContent, tool }) {
  const resp = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-5',
      max_tokens: 8000,
      system,
      messages: [{ role: 'user', content: userContent }],
      tools: [tool],
      tool_choice: { type: 'tool', name: tool.name },
    }),
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Anthropic API lỗi (${resp.status}): ${text}`);
  }

  const data = await resp.json();
  const toolUse = (data.content || []).find((block) => block.type === 'tool_use');
  if (!toolUse) {
    throw new Error('Không nhận được kết quả có cấu trúc từ AI.');
  }
  return toolUse.input;
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const user = await requireUser(req);
  if (!user) {
    res.status(401).json({ error: 'Bạn cần đăng nhập để dùng tính năng này.' });
    return;
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: 'Server chưa được cấu hình ANTHROPIC_API_KEY. Vào Vercel Project Settings → Environment Variables để thêm.' });
    return;
  }

  try {
    const { luot, answers, luot1 } = req.body || {};

    if (luot === 2) {
      if (!luot1) {
        res.status(400).json({ error: 'Thiếu kết quả Lượt 1 để tạo Lượt 2.' });
        return;
      }
      const userContent = `${buildUserBlock(answers)}\n\nKẾT QUẢ ĐỊNH VỊ LƯỢT 1 ĐÃ CHỐT (dùng làm nền tảng, không mâu thuẫn với các phần này):\n${JSON.stringify(luot1, null, 2)}\n\nHãy xuất tiếp Chiến Lược & Dòng Tiền (Lượt 2) khớp hoàn toàn với định vị đã chốt ở trên.`;
      const result = await callClaude({ apiKey, system: SYSTEM_PROMPT, userContent, tool: TOOL_LUOT2 });
      res.status(200).json({ luot: 2, result });
      return;
    }

    const userContent = `${buildUserBlock(answers)}\n\nHãy xuất Định Vị Cốt Lõi (Lượt 1) dựa trên dữ liệu trên.`;
    const result = await callClaude({ apiKey, system: SYSTEM_PROMPT, userContent, tool: TOOL_LUOT1 });
    res.status(200).json({ luot: 1, result });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Có lỗi xảy ra khi tạo định vị.' });
  }
};
