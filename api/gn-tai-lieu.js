// Tải ebook PDF + workbook của 21 Ngày Giải Nghiệp — CHỈ cho tài khoản đã trả phí (gn_has_paid) hoặc admin.
// File KHÔNG để trong thư mục tĩnh (giai-nghiep/) vì ai biết link cũng tải được không cần trả tiền; để trong
// api/_lib/fonts/gn/ — thư mục này đã nằm sẵn trong includeFiles của vercel.json (cho font), nên bundle theo
// function mà không cần sửa cấu hình, và chỉ trả về qua endpoint này sau khi kiểm tra quyền.
const fs = require('fs');
const path = require('path');
const { requireUser } = require('./_lib/auth');
const { supabaseAdmin } = require('./_lib/supabase-admin');

const FILES = {
  ebook:    { file: 'ebook.pdf',    name: '21-Ngay-Giai-Nghiep-Ebook.pdf',    type: 'application/pdf' },
  workbook: { file: 'workbook.docx', name: '21-Ngay-Giai-Nghiep-Workbook.docx', type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' },
};

module.exports = async (req, res) => {
  const user = await requireUser(req);
  if (!user) { res.status(401).json({ error: 'Cần đăng nhập.' }); return; }

  const f = FILES[req.query.f];
  if (!f) { res.status(400).json({ error: 'Không có tài liệu này.' }); return; }

  const profResp = await supabaseAdmin(`profiles?id=eq.${user.id}&select=gn_has_paid,role`);
  const rows = profResp.ok ? await profResp.json() : [];
  const p = rows[0];
  if (!p || !(p.gn_has_paid || p.role === 'admin')) { res.status(403).json({ error: 'Tài liệu dành cho học viên đã kích hoạt.' }); return; }

  let buf;
  try { buf = fs.readFileSync(path.join(__dirname, '_lib', 'fonts', 'gn', f.file)); }
  catch (e) { res.status(500).json({ error: 'Không đọc được tài liệu — báo Quỳnh giúp mình.' }); return; }

  res.setHeader('Content-Type', f.type);
  res.setHeader('Content-Disposition', `attachment; filename="${f.name}"`);
  res.setHeader('Cache-Control', 'private, no-store');
  res.status(200).send(buf);
};
