// Dựng Video AI — cổng cho "Máy dựng" (chương trình chạy trên máy tính khách hoặc server của mình).
// Máy dựng KHÔNG có phiên Supabase Auth: nó gửi token ghép nối (dvm_...) ở header Authorization, ta
// băm sha256 rồi tra dv_machines. Mọi thao tác dùng service_role nhưng LUÔN bị ép theo user_id của
// máy đó — 1 máy chỉ thấy/nhận việc của chủ nó.
// Actions: heartbeat | claim | upload_url | report

const crypto = require('crypto');
const { supabaseAdmin, SUPABASE_URL } = require('./_lib/supabase-admin');

const STALE_BUILDING_MS = 3 * 60 * 60 * 1000; // việc 'building' quá 3 giờ (máy tắt giữa chừng) → cho nhận lại

async function signedUrl(kind, path, expiresIn) {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const base = kind === 'download' ? 'object/sign' : 'object/upload/sign';
  const r = await fetch(`${SUPABASE_URL}/storage/v1/${base}/dung-video/${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
    body: JSON.stringify(kind === 'download' ? { expiresIn } : {}),
  });
  if (!r.ok) return null;
  const d = await r.json();
  return `${SUPABASE_URL}/storage/v1${d.signedURL || d.url}`;
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) { res.status(500).json({ error: 'Server chưa cấu hình SUPABASE_SERVICE_ROLE_KEY.' }); return; }
  const token = String(req.headers['authorization'] || '').replace(/^Bearer\s+/i, '');
  if (!/^dvm_[a-f0-9]{48}$/.test(token)) { res.status(401).json({ error: 'Token Máy dựng không hợp lệ.' }); return; }
  const hash = crypto.createHash('sha256').update(token).digest('hex');

  try {
    const mr = await supabaseAdmin(`dv_machines?token_hash=eq.${hash}&select=id,user_id`);
    const machine = (mr.ok ? await mr.json() : [])[0];
    if (!machine) { res.status(401).json({ error: 'Token đã bị thu hồi hoặc sai.' }); return; }
    const { action } = req.body || {};
    const uid = machine.user_id;

    if (action === 'heartbeat') {
      const info = req.body.info && typeof req.body.info === 'object' ? req.body.info : {};
      await supabaseAdmin(`dv_machines?id=eq.${machine.id}`, { method: 'PATCH', body: JSON.stringify({ last_seen_at: new Date().toISOString(), info }) });
      res.status(200).json({ ok: true });
      return;
    }

    if (action === 'claim') {
      await supabaseAdmin(`dv_machines?id=eq.${machine.id}`, { method: 'PATCH', body: JSON.stringify({ last_seen_at: new Date().toISOString() }) });
      const staleBefore = new Date(Date.now() - STALE_BUILDING_MS).toISOString();
      const qr = await supabaseAdmin(`dv_jobs?user_id=eq.${uid}&or=(status.eq.queued,and(status.eq.building,started_at.lt.${staleBefore}))&order=queued_at.asc&limit=1&select=id,status`);
      const cand = (qr.ok ? await qr.json() : [])[0];
      if (!cand) { res.status(200).json({ job: null }); return; }
      // Nhận việc nguyên tử: PATCH kèm lại điều kiện trạng thái cũ — chỉ 1 máy thắng nếu 2 máy cùng tranh.
      const pr = await supabaseAdmin(`dv_jobs?id=eq.${cand.id}&status=eq.${cand.status}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'building', machine_id: machine.id, started_at: new Date().toISOString(), error: null }),
      });
      const won = (pr.ok ? await pr.json() : [])[0];
      if (!won) { res.status(200).json({ job: null }); return; }
      const sourceUrl = won.source_path ? await signedUrl('download', won.source_path, 6 * 3600) : null;
      const extra = [];
      for (const p of (won.extra_paths || [])) extra.push({ path: p, url: await signedUrl('download', p, 6 * 3600) });
      const pf = await supabaseAdmin(`profiles?id=eq.${uid}&select=dv_brand_name,dv_signature,dv_channel`);
      const prof = (pf.ok ? await pf.json() : [])[0] || {};
      res.status(200).json({
        job: { id: won.id, kind: won.kind, title: won.title, source_name: won.source_name, source_url: sourceUrl, extra, steps: won.steps },
        settings: { brand: prof.dv_brand_name || '', signature: prof.dv_signature || '', channel: prof.dv_channel || 'khac' },
      });
      return;
    }

    if (action === 'upload_url') {
      const { job_id, part } = req.body;   // part: video | cover
      if (!['video', 'cover'].includes(part)) { res.status(400).json({ error: 'part phải là video hoặc cover.' }); return; }
      const jr = await supabaseAdmin(`dv_jobs?id=eq.${job_id}&user_id=eq.${uid}&machine_id=eq.${machine.id}&select=id`);
      if (!((jr.ok ? await jr.json() : [])[0])) { res.status(404).json({ error: 'Không tìm thấy việc của máy này.' }); return; }
      const ext = part === 'video' ? 'mov' : 'jpg';
      const path = `${uid}/result/${job_id}-${part}-${Date.now()}.${ext}`;
      const url = await signedUrl('upload', path);
      if (!url) { res.status(500).json({ error: 'Không tạo được link upload.' }); return; }
      res.status(200).json({ uploadUrl: url, path });
      return;
    }

    if (action === 'report') {
      const { job_id, steps, status, plan, caption, result_video_path, result_cover_path, error } = req.body;
      const patch = {};
      if (Array.isArray(steps)) patch.steps = steps.slice(0, 12).map(s => ({ key: String(s.key).slice(0, 20), label: String(s.label).slice(0, 60), state: ['pending', 'active', 'done', 'error'].includes(s.state) ? s.state : 'pending' }));
      if (plan && typeof plan === 'object') patch.plan = plan;
      if (typeof caption === 'string') patch.caption = caption.slice(0, 5000);
      const ok = (p) => typeof p === 'string' && p.startsWith(`${uid}/result/`) && !p.includes('..');
      if (ok(result_video_path)) patch.result_video_path = result_video_path;
      if (ok(result_cover_path)) patch.result_cover_path = result_cover_path;
      if (status === 'review') { patch.status = 'review'; patch.finished_at = new Date().toISOString(); }
      else if (status === 'failed') { patch.status = 'failed'; patch.error = String(error || 'Dựng thất bại').slice(0, 500); patch.finished_at = new Date().toISOString(); }
      if (status === 'review' && !patch.result_video_path) { res.status(400).json({ error: 'Báo hoàn tất phải kèm result_video_path.' }); return; }
      // Chỉ cập nhật việc đang 'building' của đúng máy này — máy khác/việc đã xong không bị ghi đè.
      const pr = await supabaseAdmin(`dv_jobs?id=eq.${job_id}&user_id=eq.${uid}&machine_id=eq.${machine.id}&status=eq.building`, { method: 'PATCH', body: JSON.stringify(patch) });
      const rows = pr.ok ? await pr.json() : [];
      if (!rows[0]) { res.status(409).json({ error: 'Việc không còn ở trạng thái đang dựng của máy này.' }); return; }
      res.status(200).json({ ok: true });
      return;
    }

    res.status(400).json({ error: 'Action không hợp lệ.' });
  } catch (e) {
    res.status(500).json({ error: 'Có lỗi xảy ra.' });
  }
};
