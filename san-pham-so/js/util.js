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
