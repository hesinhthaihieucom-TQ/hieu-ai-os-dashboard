// Gửi email giao dịch (transactional) qua Resend — dùng chung cho MỌI app trong hệ sinh thái, chỉ
// cần truyền to/subject/html. Cần biến môi trường RESEND_API_KEY trên Vercel — CHƯA có thì no-op
// im lặng (trả về {skipped:true}), KHÔNG làm vỡ luồng webhook/kích hoạt tài khoản chính nào đang gọi
// hàm này — gửi email chỉ là tiện ích phụ, không bao giờ là điều kiện để kích hoạt tài khoản.
const RESEND_FROM = process.env.RESEND_FROM_EMAIL || 'Hệ Sinh Thái HIỂU <onboarding@resend.dev>';

async function sendEmail({ to, subject, html }) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return { skipped: true, reason: 'RESEND_API_KEY chưa được cấu hình' };
  try {
    const resp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' },
      body: JSON.stringify({ from: RESEND_FROM, to, subject, html }),
    });
    if (!resp.ok) {
      const errText = await resp.text().catch(() => '');
      return { ok: false, status: resp.status, error: errText };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

// Thoát HTML tối thiểu cho nội dung chèn vào email (vd full_name) — tránh vỡ layout nếu lỡ có ký tự
// đặc biệt, không phải chống XSS trình duyệt (email không chạy JS) nhưng vẫn là thói quen an toàn.
function escHtml(s) {
  return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

module.exports = { sendEmail, escHtml };
