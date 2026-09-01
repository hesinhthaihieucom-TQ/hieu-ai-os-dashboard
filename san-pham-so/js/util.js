// Sản Phẩm Số — helper dùng chung cho mọi màn (giống vai trò nhan-hieu/js/util.js, nhưng gọn hơn
// nhiều vì app này chỉ có vài màn, không cần theo dõi lượt AI hiển thị optimistic như bên đó).

const SUPABASE_URL = 'https://ltcjlnvceuspnwldsbgi.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_j0ohsTIc7Df5_dz5vDiniA_nB5jPYWy';
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let currentUser = null;
let currentProfile = null;

function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
}

// Đường dẫn TƯƠNG ĐỐI ("api/...", không phải "/api/...") — tự khớp đúng dù app chạy ở gốc Vercel
// hay dưới tiền tố hesinhthaihieu.com/apptaosanphamso sau này (xem CLAUDE.md).
//
// fetch() mặc định KHÔNG có giới hạn thời gian chờ — nếu server bị kẹt/quá tải, trang có thể đứng
// im ở màn "Đang xử lý…" vô thời hạn thay vì báo lỗi cho người dùng biết mà thử lại (phát hiện
// 2026-08-25: wizard Tìm Sản Phẩm Phù Hợp bị đứng ở "Đang tổng hợp kết quả…"). Đặt trần 90s giống
// nhan-hieu/js/util.js.
async function callApi(path, body, timeoutMs) {
  const { data: sessionData } = await supabaseClient.auth.getSession();
  const token = sessionData && sessionData.session ? sessionData.session.access_token : null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs || 90000);
  let resp;
  try {
    resp = await fetch(path, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (e) {
    if (e.name === 'AbortError') throw new Error(`Yêu cầu mất quá lâu (quá ${Math.round((timeoutMs || 90000) / 1000)} giây) — server có thể đang quá tải, thử lại giúp mình.`);
    throw new Error('Không kết nối được tới server — kiểm tra lại mạng và thử lại.');
  } finally {
    clearTimeout(timer);
  }
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) throw new Error(data.error || 'Có lỗi xảy ra.');
  return data;
}

// key: phân biệt draft của từng màn (vd 'san-pham-so' cho danh sách, 'tim-san-pham-wizard' cho
// wizard Giai đoạn 1) — giống module_drafts.module_key ở nhan-hieu, cùng 1 bảng dùng chung.
async function loadDraft(key) {
  try {
    const { data } = await supabaseClient.from('module_drafts').select('data').eq('user_id', currentUser.id).eq('module_key', key).maybeSingle();
    return data ? data.data : null;
  } catch (e) { return null; }
}
async function saveDraft(key, d) {
  try { await supabaseClient.from('module_drafts').upsert({ user_id: currentUser.id, module_key: key, data: d, updated_at: new Date().toISOString() }, { onConflict: 'user_id,module_key' }); } catch (e) {}
}
async function clearDraft(key) {
  try { await supabaseClient.from('module_drafts').delete().eq('user_id', currentUser.id).eq('module_key', key); } catch (e) {}
}

// product_idea_results — 1 dòng/user, dùng chung giữa Giai đoạn 1 (Tìm Sản Phẩm Phù Hợp) và Giai
// đoạn 2 (Xây Dựng Nội Dung). Ghi trực tiếp qua RLS (auth.uid()=user_id), không cần qua api/ vì đây
// chỉ là lưu dữ liệu của chính chủ, không cần service role/quota.
async function loadIdeaResult() {
  try {
    const { data } = await supabaseClient.from('product_idea_results').select('*').eq('user_id', currentUser.id).maybeSingle();
    return data || null;
  } catch (e) { return null; }
}
async function saveIdeaResult(patch) {
  try {
    await supabaseClient.from('product_idea_results').upsert(
      { user_id: currentUser.id, ...patch, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' }
    );
  } catch (e) {}
}
async function clearIdeaResult() {
  try { await supabaseClient.from('product_idea_results').delete().eq('user_id', currentUser.id); } catch (e) {}
}

// Port nguyên xi từ nhan-hieu/js/util.js (2026-09-01, Quỳnh: "áp dụng với tất cả các web app làm
// sau này") — thanh % tiến trình thay cho vòng xoay tĩnh ở MỌI màn chờ AI, để cảm giác app đang
// chạy chứ không đứng im, nhất là các lệnh gọi có thể mất 1-2 phút.
function progressBarHtml(percent) {
  const pct = Math.max(0, Math.min(100, percent));
  return `<div style="width:100%;max-width:280px;margin:0 auto;height:8px;border-radius:999px;background:var(--line);overflow:hidden;">
    <div style="height:100%;width:${pct}%;background:var(--accent);border-radius:999px;"></div>
  </div>
  <div style="margin-top:8px;font-family:'IBM Plex Mono',monospace;font-size:13px;color:var(--accent);font-weight:600;">${Math.round(pct)}%</div>`;
}
function animateProgressBar(el, estimatedSeconds) {
  if (!el) return () => {};
  const startedAt = Date.now();
  const cap = 96;
  const tick = () => {
    const elapsed = (Date.now() - startedAt) / 1000;
    const pct = Math.min(cap, (elapsed / estimatedSeconds) * cap);
    el.innerHTML = progressBarHtml(pct);
  };
  tick();
  const timer = setInterval(tick, 350);
  return () => clearInterval(timer);
}
// Dùng khi màn chờ bám vào 1 nút bấm cụ thể (VD nút "Lập kế hoạch"/"Viết caption" trong 1 thẻ sản
// phẩm) thay vì chiếm cả màn hình — gradient chạy trong nền nút + % ngay trên chữ nút.
function animateProgressButton(btnEl, estimatedSeconds, baseLabel) {
  if (!btnEl) return () => {};
  const startedAt = Date.now();
  const cap = 96;
  let dots = 0;
  const tick = () => {
    const elapsed = (Date.now() - startedAt) / 1000;
    const pct = Math.min(cap, (elapsed / estimatedSeconds) * cap);
    btnEl.style.background = `linear-gradient(to right, var(--accent) ${pct}%, #DCD8C9 ${pct}%)`;
    if (elapsed > estimatedSeconds * 1.25) {
      dots = (dots + 1) % 4;
      btnEl.textContent = `${baseLabel} — vẫn đang xử lý${'.'.repeat(dots)}`;
    } else {
      btnEl.textContent = `${baseLabel} ${Math.round(pct)}%`;
    }
  };
  tick();
  const timer = setInterval(tick, 500);
  return () => clearInterval(timer);
}
