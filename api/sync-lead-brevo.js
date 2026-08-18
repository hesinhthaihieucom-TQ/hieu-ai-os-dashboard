// Serverless function — đẩy lead vừa đăng ký sang Brevo để đội ngũ chăm sóc/nuôi dưỡng qua email.
// Gọi ngay sau khi đăng ký thành công (renderAuthScreen) — KHÔNG được để lỗi ở đây chặn luồng đăng
// ký thật, nên luôn trả 200 dù Brevo lỗi/chưa cấu hình, chỉ ghi log phía server để tự kiểm tra sau.
//
// Không yêu cầu đăng nhập (requireUser) vì lúc gọi có thể chưa có session thật (trường hợp bật xác
// nhận email — signUp() chưa trả về session ngay) — endpoint chỉ nhận đúng email vừa đăng ký, không
// có gì nhạy cảm nếu bị gọi lặp (Brevo tự cập nhật thay vì tạo trùng nhờ updateEnabled).

module.exports = async (req, res) => {
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) { res.status(200).json({ skipped: true, reason: 'BREVO_API_KEY chưa cấu hình' }); return; }

  const { email, full_name, is_student } = req.body || {};
  if (!email) { res.status(200).json({ skipped: true, reason: 'Thiếu email' }); return; }

  try {
    const listIdEnv = process.env.BREVO_LIST_ID;
    const body = {
      email,
      attributes: { FULLNAME: full_name || '', IS_STUDENT: !!is_student },
      updateEnabled: true, // email đã có sẵn trong Brevo thì cập nhật, không báo lỗi trùng
    };
    if (listIdEnv) body.listIds = [Number(listIdEnv)];

    const resp = await fetch('https://api.brevo.com/v3/contacts', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'api-key': apiKey },
      body: JSON.stringify(body),
    });
    if (!resp.ok) {
      console.error('Đồng bộ Brevo lỗi:', resp.status, await resp.text());
    }
  } catch (err) {
    console.error('Đồng bộ Brevo lỗi:', err.message);
  }
  res.status(200).json({ success: true });
};
