// Dựng Video AI — ghép nối "Máy dựng". Khách bấm "Tạo mã ghép nối" ở Cài đặt → trả token gốc ĐÚNG 1
// LẦN (chỉ lưu băm sha256 trong dv_machines), khách dán token vào chương trình Máy dựng trên máy mình.
// Thu hồi = xoá dòng đó, token cũ hết hiệu lực ngay.

const crypto = require('crypto');
const { requireUser } = require('./_lib/auth');
const { supabaseAdmin } = require('./_lib/supabase-admin');

module.exports = async (req, res) => {
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }
  const user = await requireUser(req);
  if (!user) { res.status(401).json({ error: 'Chưa đăng nhập.' }); return; }
  try {
    const { action, name } = req.body || {};
    if (action === 'create') {
      const cnt = await supabaseAdmin(`dv_machines?user_id=eq.${user.id}&select=id`);
      const rows = cnt.ok ? await cnt.json() : [];
      if (rows.length >= 3) { res.status(400).json({ error: 'Mỗi tài khoản ghép nối tối đa 3 máy — xoá bớt máy cũ trước.' }); return; }
      const token = 'dvm_' + crypto.randomBytes(24).toString('hex');
      const hash = crypto.createHash('sha256').update(token).digest('hex');
      const ins = await supabaseAdmin('dv_machines', {
        method: 'POST',
        body: JSON.stringify({ user_id: user.id, name: String(name || 'Máy dựng').slice(0, 40), token_hash: hash }),
      });
      if (!ins.ok) { res.status(500).json({ error: 'Không tạo được mã — thử lại giúp mình.' }); return; }
      res.status(200).json({ token });
      return;
    }
    res.status(400).json({ error: 'Action không hợp lệ.' });
  } catch (e) {
    res.status(500).json({ error: 'Có lỗi xảy ra — thử lại giúp mình.' });
  }
};
