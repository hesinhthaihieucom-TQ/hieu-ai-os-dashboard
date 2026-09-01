// Sản Phẩm Số — helper dùng chung cho mọi màn (giống vai trò nhan-hieu/js/util.js, nhưng gọn hơn
// nhiều vì app này chỉ có vài màn, không cần theo dõi lượt AI hiển thị optimistic như bên đó).

const SUPABASE_URL = 'https://ltcjlnvceuspnwldsbgi.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_j0ohsTIc7Df5_dz5vDiniA_nB5jPYWy';
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let currentUser = null;
let currentProfile = null;

// Dùng chung giữa "Tìm Sản Phẩm Phù Hợp" (tim-san-pham.js) và "Chọn Loại Sản Phẩm Số" (chon-loai.js).
const NGANH_OPTIONS = ['Tài chính', 'Tâm linh', 'Hôn nhân & Gia đình', 'Phát triển bản thân', 'Kinh doanh', 'Sức khoẻ & Làm đẹp', 'Xây kênh & Content'];
// Khớp đúng enum dinh_dang trong TOOL_TIM_SAN_PHAM/TOOL_TAO_Y_TUONG_TU_LOAI (api/_lib/tim-san-pham-schema.js).
const DINH_DANG_OPTIONS = [
  { value: 'ebook', label: 'Ebook' },
  { value: 'checklist_workbook', label: 'Checklist/Workbook' },
  { value: 'template_file_mau', label: 'Template/File mẫu' },
  { value: 'mini_course', label: 'Mini-course' },
  { value: 'coaching_1_1', label: 'Coaching 1-1' },
  { value: 'cong_dong_tra_phi', label: 'Cộng đồng trả phí' },
  { value: 'webinar', label: 'Webinar' },
];

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
  const timer = setTimeout(() => controller.abort(), timeoutMs || 150000);
  let resp;
  try {
    resp = await fetch(path, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (e) {
    if (e.name === 'AbortError') throw new Error(`Yêu cầu mất quá lâu (quá ${Math.round((timeoutMs || 150000) / 1000)} giây) — server có thể đang quá tải, thử lại giúp mình.`);
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

// product_idea_results — dùng chung giữa Giai đoạn 1 (Tìm Sản Phẩm Phù Hợp/Chọn Loại) và Giai đoạn 2
// (Xây Dựng Nội Dung). Ghi trực tiếp qua RLS (auth.uid()=user_id), không cần qua api/ vì đây chỉ là
// lưu dữ liệu của chính chủ, không cần service role/quota.
//
// 2026-09-01: đổi từ "1 dòng/user" sang MỖI SẢN PHẨM 1 DÒNG (Quỳnh: muốn "lưu tạm" 1 sản phẩm đang
// xây để bắt đầu sản phẩm khác, không bị mất/đè lên nhau — trước đó user chỉ có đúng 1 sản phẩm AI
// active tại 1 thời điểm). Quy ước: TỐI ĐA 1 dòng CHƯA chọn (chosen_index null — "ý tưởng đang cân
// nhắc", quản lý bằng code ở đây, không có ràng buộc DB); có thể NHIỀU dòng ĐÃ chọn (chosen_index
// khác null — mỗi dòng 1 sản phẩm đang xây ở Giai đoạn 2). Xem supabase/schema_san_pham_so.sql (đã
// bỏ unique index theo user_id).

// Dòng "đang cân nhắc" (chưa chọn phương án nào) hiện có của user, nếu có — dùng ở đầu wizard/form để
// biết nên tạo mới hay ghi tiếp lên phiên đang cân nhắc dở.
async function loadPendingIdeaResult() {
  try {
    const { data } = await supabaseClient.from('product_idea_results').select('*').eq('user_id', currentUser.id).is('chosen_index', null).order('updated_at', { ascending: false }).limit(1).maybeSingle();
    return data || null;
  } catch (e) { return null; }
}
// TẤT CẢ sản phẩm ĐÃ CHỌN (đang xây ở Giai đoạn 2) của user, mới cập nhật nhất trước — dùng để hiện
// danh sách "sản phẩm đang dở" khi vào Tìm Sản Phẩm Phù Hợp/Chọn Loại Sản Phẩm Số.
async function listActiveIdeaResults() {
  try {
    const { data } = await supabaseClient.from('product_idea_results').select('*').eq('user_id', currentUser.id).not('chosen_index', 'is', null).order('updated_at', { ascending: false });
    return data || [];
  } catch (e) { return []; }
}
async function loadIdeaResultById(id) {
  try {
    const { data } = await supabaseClient.from('product_idea_results').select('*').eq('user_id', currentUser.id).eq('id', id).maybeSingle();
    return data || null;
  } catch (e) { return null; }
}
// id có -> update đúng dòng đó. id KHÔNG có -> INSERT dòng mới. Luôn trả về dòng đã lưu (kèm id) để
// caller biết id vừa tạo, dùng cho các lần lưu tiếp theo (tránh insert trùng dòng "đang cân nhắc").
async function saveIdeaResult(patch, id) {
  try {
    if (id) {
      const { data } = await supabaseClient.from('product_idea_results').update({ ...patch, updated_at: new Date().toISOString() }).eq('user_id', currentUser.id).eq('id', id).select().maybeSingle();
      return data || null;
    }
    const { data } = await supabaseClient.from('product_idea_results').insert({ user_id: currentUser.id, ...patch, updated_at: new Date().toISOString() }).select().maybeSingle();
    return data || null;
  } catch (e) { return null; }
}
async function clearIdeaResultById(id) {
  try { await supabaseClient.from('product_idea_results').delete().eq('user_id', currentUser.id).eq('id', id); } catch (e) {}
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
