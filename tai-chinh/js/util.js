function esc(s){
  return String(s==null?'':s).replace(/[&<>]/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
}

// Khách (chưa đăng nhập) làm Chấm Điểm Nghiệp Tiền TRƯỚC, đăng ký SAU khi muốn lưu (2026-08-26,
// góp ý Quỳnh: "gửi link cho người ta làm bài, người ta ko phải đăng ký, làm xong muốn lưu thì mới
// hiện popup đăng ký") — câu trả lời đang gõ dở lưu tạm vào localStorage (không có user_id để lưu
// module_drafts qua Supabase), dùng CHUNG key này ở cả thiet-lap-nhanh.js (đọc/ghi lúc còn là khách)
// và app-shell.js (đọc lúc vừa đăng ký xong để tự lưu kết quả, không bắt làm lại bài từ đầu).
const TC_GUEST_QUIZ_KEY = 'tc_guest_quiz_v1';

// Phóng to 1 ảnh minh hoạ nhỏ (VD ảnh mẫu ở Dạng Content) thành lightbox toàn màn hình — dùng
// chung cho mọi module cần xem ảnh rõ hơn, đóng bằng cách bấm ra ngoài hoặc nhấn Esc.
function openImageLightbox(src, alt){
  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(20,24,20,.88);display:flex;align-items:center;justify-content:center;padding:24px;cursor:zoom-out;';
  overlay.innerHTML = `<img src="${esc(src)}" alt="${esc(alt||'')}" style="max-width:100%;max-height:100%;border-radius:10px;box-shadow:0 12px 40px rgba(0,0,0,.4);">`;
  function close(){ overlay.remove(); document.removeEventListener('keydown', onKey); }
  function onKey(e){ if(e.key==='Escape') close(); }
  overlay.onclick = close;
  document.addEventListener('keydown', onKey);
  document.body.appendChild(overlay);
}

// Popup xác nhận trước khi xoá dữ liệu đã lưu — rõ ràng, khó bấm nhầm hơn kiểu "bấm 2 lần" trước
// đây. Trả về Promise<boolean> — true nếu người dùng bấm xác nhận, false nếu huỷ/bấm ra ngoài/Esc.
function confirmModal(message, confirmLabel){
  return new Promise((resolve)=>{
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(20,24,20,.7);display:flex;align-items:center;justify-content:center;padding:20px;';
    overlay.innerHTML = `
      <div style="background:#fff;border-radius:14px;max-width:360px;width:100%;padding:22px;box-shadow:0 12px 40px rgba(0,0,0,.4);text-align:center;" onclick="event.stopPropagation();">
        <div style="font-size:15px;line-height:1.6;color:var(--ink);margin-bottom:20px;">${esc(message)}</div>
        <div style="display:flex;gap:10px;justify-content:center;">
          <span class="btn-ghost btn btn-sm" data-confirm-cancel="1">Huỷ</span>
          <button class="btn btn-sm" style="background:var(--danger);" data-confirm-ok="1">${esc(confirmLabel||'Xác nhận xoá')}</button>
        </div>
      </div>
    `;
    function close(result){ overlay.remove(); document.removeEventListener('keydown', onKey); resolve(result); }
    function onKey(e){ if(e.key==='Escape') close(false); }
    overlay.onclick = ()=>close(false);
    overlay.querySelector('[data-confirm-cancel]').onclick = ()=>close(false);
    overlay.querySelector('[data-confirm-ok]').onclick = ()=>close(true);
    document.addEventListener('keydown', onKey);
    document.body.appendChild(overlay);
  });
}

// Xem nhanh nội dung đầy đủ 1 bài đã lưu (VD từ ô đã xếp lịch) mà không cần rời khỏi trang hiện
// tại — có nút copy để tiện dán đi làm ảnh/đăng ngay. Đóng bằng bấm ra ngoài hoặc Esc.
function openTextModal(title, body){
  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(20,24,20,.7);display:flex;align-items:center;justify-content:center;padding:20px;';
  overlay.innerHTML = `
    <div style="background:#fff;border-radius:14px;max-width:560px;width:100%;max-height:85vh;display:flex;flex-direction:column;box-shadow:0 12px 40px rgba(0,0,0,.4);" onclick="event.stopPropagation();">
      <div style="padding:18px 20px 12px;border-bottom:1px solid var(--line);display:flex;justify-content:space-between;align-items:flex-start;gap:12px;">
        <h3 style="margin:0;font-size:16px;">${esc(title||'Bài viết')}</h3>
        <span data-close-text-modal="1" style="cursor:pointer;color:var(--ink-soft);font-size:20px;line-height:1;">&times;</span>
      </div>
      <div style="padding:16px 20px;overflow-y:auto;white-space:pre-line;font-size:14.5px;line-height:1.7;">${esc(body||'')}</div>
      <div style="padding:12px 20px;border-top:1px solid var(--line);display:flex;gap:8px;">
        <button class="btn btn-sm" data-copy-text-modal="1">Copy nội dung</button>
        ${title?`<span class="btn-ghost btn btn-sm" data-copy-title-modal="1">Copy tiêu đề</span>`:''}
      </div>
    </div>
  `;
  function close(){ overlay.remove(); document.removeEventListener('keydown', onKey); }
  function onKey(e){ if(e.key==='Escape') close(); }
  overlay.onclick = close;
  overlay.querySelector('[data-close-text-modal]').onclick = close;
  const copyBtn = overlay.querySelector('[data-copy-text-modal]');
  copyBtn.onclick = async ()=>{
    try{ await navigator.clipboard.writeText(body||''); copyBtn.textContent = 'Đã copy ✓'; setTimeout(()=>{ copyBtn.textContent = 'Copy nội dung'; }, 1500); } catch(e){}
  };
  const copyTitleBtn = overlay.querySelector('[data-copy-title-modal]');
  if(copyTitleBtn) copyTitleBtn.onclick = async ()=>{
    try{ await navigator.clipboard.writeText(title||''); copyTitleBtn.textContent = 'Đã copy ✓'; setTimeout(()=>{ copyTitleBtn.textContent = 'Copy tiêu đề'; }, 1500); } catch(e){}
  };
  document.addEventListener('keydown', onKey);
  document.body.appendChild(overlay);
}

// Escape rồi in đậm các đoạn được AI bọc trong **...** — dùng cho các đoạn giải thích dài
// để nhấn từ khoá quan trọng, đỡ phải đọc hết cả đoạn mới nắm được ý chính.
function escBold(s){
  return esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
}

// Một số bản định vị cũ lưu "kết luận định vị" dạng cả đoạn dài nhiều câu dính liền nhau
// (trước khi siết prompt chỉ còn đúng 1 câu) — tách xuống dòng theo từng câu cho dễ đọc.
// AI đôi khi hiểu nhầm chỉ dẫn "xuống dòng bằng \n\n" theo nghĩa đen và in ra 4 ký tự
// \, n, \, n thay vì 1 dòng mới thật — chuẩn hoá về xuống dòng thật trước khi tách câu.
function breakSentences(s){
  const str = String(s==null?'':s).replace(/\\n+/g, '\n\n');
  return str.replace(/([.!?]['"'"”]?)\s+(?=[A-ZÀ-Ỹ"'"“])/g, '$1\n\n');
}

// Lấy đúng câu đầu tiên — dùng khi cần hiển thị ngắn gọn dạng tiêu đề (vd bản cũ dài nhiều câu).
function firstSentence(s){
  const str = String(s==null?'':s).trim();
  const m = /^[^.!?]*[.!?]/.exec(str);
  return m ? m[0].trim() : str;
}

// Rút gọn nội dung dài cho danh sách duyệt nhanh (vd "Bài đã viết") — không hiện nguyên cả bài,
// tránh trang dài lê thê, người dùng bấm vào mới cần xem đủ (qua Lịch Đăng/chỉnh sửa).
function excerpt(s, maxLen){
  const str = String(s==null?'':s).trim();
  if(str.length <= maxLen) return str;
  return str.slice(0, maxLen).trim() + '…';
}

// Định dạng số tiền có dấu chấm ngăn cách hàng nghìn (8.000.000) NGAY LÚC GÕ, cho dễ nhìn (2026-09-01,
// góp ý chị Quỳnh) — mọi ô nhập số tiền trong app đổi từ type="number" sang type="text"
// inputmode="numeric" (input type="number" của trình duyệt KHÔNG hiển thị được dấu chấm ngăn cách,
// sẽ hiểu nhầm là dấu thập phân) rồi tự format lại value bằng 2 hàm này trong oninput. State vẫn
// LƯU SỐ THÔ không dấu chấm (onlyDigits) — chỉ phần HIỂN THỊ trên input mới có dấu chấm
// (formatThousands), để mọi phép tính/parseFloat ở chỗ khác không bị ảnh hưởng.
function onlyDigits(s){
  return String(s==null?'':s).replace(/[^\d]/g, '');
}
function formatThousands(s){
  const digits = onlyDigits(s);
  return digits ? Number(digits).toLocaleString('vi-VN') : '';
}

// PushManager.subscribe() cần applicationServerKey dạng Uint8Array, nhưng VAPID public key ta có
// là chuỗi base64url — chuyển đổi qua lại theo đúng chuẩn. Copy từ nhan-hieu/js/util.js, dùng chung
// cho tai-khoan.js lúc bật nhắc ghi chép.
function urlBase64ToUint8Array(base64String){
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for(let i = 0; i < rawData.length; i++) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}

function fmtDate(d){
  const dt = (d instanceof Date) ? d : new Date(d);
  return dt.toLocaleDateString('vi-VN', { weekday:'short', day:'2-digit', month:'2-digit' });
}

function isoDate(d){
  const dt = (d instanceof Date) ? d : new Date(d);
  const tzOffset = dt.getTimezoneOffset() * 60000;
  return new Date(dt - tzOffset).toISOString().slice(0,10);
}

// % tiến trình ước lượng cho các màn chờ AI (1-2 phút) — API không stream nên không có % thật từ
// server, tính theo thời gian đã trôi qua so với thời gian trung bình của tác vụ đó. Dừng dưới
// 100% (cap) cho tới khi có kết quả thật, tránh cảm giác "treo" khi phải chờ lâu.
//
// animateProgressButton: chạy % ngay trên nút bấm đang có sẵn (đổi màu nền chạy dần + hiện số %
// trong chữ) — dùng cho các nút "Đang viết…"/"Đang lên lịch…" đã tồn tại, không cần thêm gì mới.
function animateProgressButton(btnEl, estimatedSeconds, baseLabel){
  if(!btnEl) return ()=>{};
  const startedAt = Date.now();
  const cap = 96;
  let dots = 0;
  const tick = ()=>{
    const elapsed = (Date.now() - startedAt) / 1000;
    const pct = Math.min(cap, (elapsed / estimatedSeconds) * cap);
    btnEl.style.background = `linear-gradient(to right, var(--accent) ${pct}%, #DCD8C9 ${pct}%)`;
    // Số % đứng yên ở 96% khi AI mất lâu hơn ước tính (vẫn xảy ra bình thường, nhất là bài dài) dễ
    // bị hiểu nhầm là treo máy — sau khi vượt quá thời gian ước tính, đổi sang chữ chạy dấu chấm để
    // báo vẫn đang xử lý chứ không đứng yên.
    if(elapsed > estimatedSeconds * 1.25){
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

// Đổi nội dung 1 hint-box theo mốc thời gian đã chờ thực tế — chủ động giải thích lý do đang chờ
// lâu thay vì im lặng, đỡ cảm giác "treo máy" khi AI xử lý lâu hơn ước tính (bài dài, nhiều bước,
// server đang tải cao...). "stages" là mảng {atSeconds, html} tăng dần, hiện đúng mốc gần nhất đã
// qua. Dùng chung với animateProgressButton (chạy song song, không thay thế).
function startWaitReassurance(el, stages){
  if(!el) return ()=>{};
  const startedAt = Date.now();
  let shown = -1;
  const tick = ()=>{
    const elapsed = (Date.now() - startedAt) / 1000;
    let idx = -1;
    stages.forEach((s, i) => { if(elapsed >= s.atSeconds) idx = i; });
    if(idx !== shown && idx >= 0){
      shown = idx;
      el.innerHTML = stages[idx].html;
    }
  };
  tick();
  const timer = setInterval(tick, 1000);
  return () => clearInterval(timer);
}

// progressBarHtml/animateProgressBar: thanh ngang cho các màn chờ toàn màn hình (không có nút nào
// để bám vào lúc đó) — thay cho vòng xoay tĩnh, cũng chạy theo % ước lượng như trên.
function progressBarHtml(percent){
  const pct = Math.max(0, Math.min(100, percent));
  return `<div style="width:100%;max-width:280px;margin:0 auto;height:8px;border-radius:999px;background:var(--line);overflow:hidden;">
    <div style="height:100%;width:${pct}%;background:var(--accent);border-radius:999px;"></div>
  </div>
  <div style="margin-top:8px;font-family:'IBM Plex Mono',monospace;font-size:13px;color:var(--accent);font-weight:600;">${Math.round(pct)}%</div>`;
}
function animateProgressBar(el, estimatedSeconds){
  if(!el) return ()=>{};
  const startedAt = Date.now();
  const cap = 96;
  const tick = ()=>{
    const elapsed = (Date.now() - startedAt) / 1000;
    const pct = Math.min(cap, (elapsed / estimatedSeconds) * cap);
    el.innerHTML = progressBarHtml(pct);
  };
  tick();
  const timer = setInterval(tick, 350);
  return () => clearInterval(timer);
}

// Giữ màn hình điện thoại không tự khoá trong lúc đang chờ AI (1-2 phút) — nếu màn hình khoá giữa
// chừng, trình duyệt di động thường tạm dừng/ngắt kết nối mạng của trang đang chạy nền, khiến yêu
// cầu đang chờ bị lỗi khi mở lại máy. Chỉ hỗ trợ trên trình duyệt có Wake Lock API (Safari 16.4+,
// Chrome Android) — trình duyệt cũ hơn thì bỏ qua, không chặn tính năng chính.
let _wakeLock = null;
async function acquireWakeLock(){
  try{
    if('wakeLock' in navigator) _wakeLock = await navigator.wakeLock.request('screen');
  } catch(e){ /* bị từ chối (vd tab không ở foreground) — bỏ qua */ }
}
function releaseWakeLock(){
  if(_wakeLock){ try{ _wakeLock.release(); } catch(e){} _wakeLock = null; }
}

function startOfWeek(d){
  const dt = new Date(d);
  const day = dt.getDay(); // 0=Sun
  const diff = (day === 0 ? -6 : 1) - day; // move to Monday
  dt.setDate(dt.getDate() + diff);
  dt.setHours(0,0,0,0);
  return dt;
}

async function callApiOnce(relativePath, body, timeoutMs){
  const { data: sessionData } = await supabaseClient.auth.getSession();
  const token = sessionData && sessionData.session ? sessionData.session.access_token : null;
  // Không có timeout thì nếu server treo/không phản hồi (vd hết hạn hàm serverless mà kết nối
  // không đóng gọn gàng), trình duyệt sẽ chờ vô thời hạn — màn hình đứng ở "Đang xử lý…" mãi mãi,
  // không báo lỗi, không có cách nào tự thoát. Đặt trần thời gian để luôn có phản hồi cho người dùng.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs || 90000);
  try{
    return await fetch(relativePath, {
      method:'POST',
      headers:{
        'content-type':'application/json',
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch(e){
    if(e.name === 'AbortError') throw new Error(`Yêu cầu mất quá lâu (quá ${Math.round((timeoutMs||90000)/1000)} giây) — server có thể đang quá tải, thử lại giúp mình.`);
    throw new Error('Không kết nối được tới server — kiểm tra lại mạng và thử lại.');
  } finally {
    clearTimeout(timer);
  }
}

async function callApi(path, body, timeoutMs, opts){
  // Đường dẫn tương đối (bỏ dấu "/" đầu) để hoạt động đúng dù web được host ở
  // gốc domain (Vercel) hay dưới 1 thư mục con qua reverse proxy (vd Cloudflare Worker
  // tại hesinhthaihieu.com/webxaynhanhieu) — trình duyệt sẽ tự nối theo đúng thư mục hiện tại.
  const relativePath = path.replace(/^\//, '');
  let resp = await callApiOnce(relativePath, body, timeoutMs);
  if(resp.status === 401){
    // Access token đôi khi hết hạn ngay trước lúc gọi mà SDK chưa kịp tự làm mới (hay gặp sau khi
    // tab đứng yên/nằm nền 1 lúc) — chủ động làm mới phiên rồi thử lại đúng 1 lần, tránh báo "cần
    // đăng nhập" oan trong khi người dùng vẫn đang đăng nhập bình thường.
    await supabaseClient.auth.refreshSession();
    resp = await callApiOnce(relativePath, body, timeoutMs);
  }
  let data;
  try{
    data = await resp.json();
  } catch(e){
    // Server trả về trang lỗi không phải JSON (vd trang 504 timeout của Vercel khi hàm chạy quá
    // lâu) — báo rõ nguyên nhân thay vì để lộ ra lỗi kỹ thuật khó hiểu kiểu "Unexpected token '<'".
    throw new Error(resp.status >= 500
      ? 'Server xử lý quá lâu và bị ngắt giữa chừng — thử lại giúp mình, nếu vẫn vậy báo lại nhé.'
      : 'Không đọc được phản hồi từ server — thử lại giúp mình.');
  }
  if(!resp.ok) throw new Error(data.error || 'Có lỗi xảy ra.');
  // Báo cho app-shell.js biết vừa gọi thành công 1 endpoint để tự cập nhật số lượt còn lại ở
  // sidebar ngay lập tức — không cần đợi load lại trang/chuyển trang mới thấy số mới.
  // opts.skipGatedCallback: dùng khi 1 endpoint được gọi nhiều lần cho CÙNG 1 hành động chỉ trừ
  // lượt 1 lần phía server (vd Lượt 2 của Định Vị, xem api/dinh-vi.js) — nếu không bỏ qua, sidebar
  // sẽ cộng dồn optimistic 2 lần dù server chỉ trừ 1 lần, hiện sai số lượt đã dùng.
  if(window.onGatedApiSuccess && !(opts && opts.skipGatedCallback)) window.onGatedApiSuccess(relativePath);
  return data;
}

// Lưu/đọc/xoá trạng thái đang làm dở của 1 module (kết quả AI, input đang nhập...) vào bảng
// module_drafts — giữ nguyên khi rời trang rồi quay lại, chỉ mất khi module tự gọi clearModuleDraft
// (bấm Reset/"làm cái khác"...). key gợi ý dùng đúng route key của module (vd 'viet-content').
async function loadModuleDraft(ctx, key){
  try{
    const { data } = await ctx.supabase.from('module_drafts').select('data').eq('user_id', ctx.user.id).eq('module_key', key).maybeSingle();
    return data ? data.data : null;
  } catch(e){ return null; }
}
async function saveModuleDraft(ctx, key, data){
  try{
    await ctx.supabase.from('module_drafts').upsert({
      user_id: ctx.user.id, module_key: key, data, updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,module_key' });
  } catch(e){}
}
async function clearModuleDraft(ctx, key){
  try{ await ctx.supabase.from('module_drafts').delete().eq('user_id', ctx.user.id).eq('module_key', key); } catch(e){}
}

// Danh mục CHI TIẾT — cột category_label trên tc_finance_entries vẫn là text tự do (không CHECK
// constraint), nhưng từ 2026-08-23 UI ở ghi-chep.js hiện thành CHIP CỐ ĐỊNH để chọn (không gõ tự do
// nữa) — góp ý Quỳnh: gõ tự do mỗi lần 1 kiểu khiến Tổng Kết không gom nhóm được đang tiêu nhiều
// nhất vào đâu (vd "ăn uống" vs "ăn sáng" vs "cà phê" bị tính thành 3 danh mục khác nhau). Người
// dùng vẫn thêm được danh mục riêng qua nút "+ Khác", nhưng qua đúng 1 cửa, không gõ tràn lan.
// tong-ket-tuan.js/tong-ket-thang.js chỉ hiển thị lại đúng chuỗi đã lưu, không tra bảng key->label.
const SUGGESTED_EXPENSE_CATEGORIES = [
  'Ăn uống', 'Di chuyển / Xăng xe', 'Mua sắm / Quần áo', 'Giải trí / Du lịch',
  'Sức khỏe / Làm đẹp', 'Hoá đơn (điện, nước, mạng)', 'Học phí cho con', 'Thuê nhà',
  'Trả góp nhà / xe', 'Đồ dùng thiết yếu', 'Giáo dục / Sách vở', 'Quà tặng / Việc xã hội',
  'Tích Lũy', 'Trả nợ', 'Khác',
];
// Danh mục RIÊNG cho hành động "chuyển tiền vào tiết kiệm" (2026-09-01, góp ý Quỳnh) — ghi dưới dạng
// 1 dòng chi để có chỗ "ghi công" hành động để dành (giống app Money Lover), NHƯNG không phải tiền
// mất đi thật nên PHẢI loại khỏi Tổng chi tiêu/Tỷ lệ tiết kiệm ở tong-ket-tuan.js/tong-ket-thang.js
// — nếu không loại, tiền để dành bị trừ 2 lần (vừa tính là "chi" vừa không còn nằm trong "thu-chi"),
// làm Tỷ lệ tiết kiệm hiện THẤP hơn thực tế. Vẫn hiện bình thường ở biểu đồ/list theo danh mục.
const TICH_LUY_CATEGORY_LABEL = 'Tích Lũy';
const SUGGESTED_INCOME_CATEGORIES = [
  'Lương', 'Thưởng', 'Hoa hồng kinh doanh', 'Đầu tư / Lãi', 'Được tặng / biếu', 'Khác',
];
// Gợi ý sẵn CP cố định/CP biến đổi cho từng danh mục CHI TIÊU mặc định — dùng lúc seed lần đầu vào
// tc_categories (xem ensureCategoriesSeeded). Không đoán cho "Khác" (quá chung, để trống cho người
// dùng tự chọn) và không đoán Tài sản/Tiêu sản (bản chất khác nhau TỪNG LẦN chi, không cố định theo
// tên danh mục — đúng góp ý Quỳnh chỉ gợi ý CP cố định/biến đổi).
const SUGGESTED_EXPENSE_CLASSIFICATION = {
  'Ăn uống':'cp_bien_doi', 'Di chuyển / Xăng xe':'cp_bien_doi', 'Mua sắm / Quần áo':'cp_bien_doi',
  'Giải trí / Du lịch':'cp_bien_doi', 'Sức khỏe / Làm đẹp':'cp_bien_doi', 'Đồ dùng thiết yếu':'cp_bien_doi',
  'Quà tặng / Việc xã hội':'cp_bien_doi',
  'Hoá đơn (điện, nước, mạng)':'cp_co_dinh', 'Học phí cho con':'cp_co_dinh', 'Thuê nhà':'cp_co_dinh',
  'Trả góp nhà / xe':'cp_co_dinh', 'Giáo dục / Sách vở':'cp_co_dinh', 'Trả nợ':'cp_co_dinh',
};
// Danh mục thu/chi giờ là 1 danh sách THIẾT LẬP SẴN (tc_categories) thay vì "học" dần từ lịch sử ghi
// chép — góp ý Quỳnh 2026-08-24. Lần đầu 1 user chưa có dòng nào trong tc_categories thì seed 1 lần:
// SUGGESTED_* mặc định + mọi category_label họ ĐÃ từng dùng trước đó (không làm "biến mất" dữ liệu
// cũ của người dùng đã dùng app từ trước bản cập nhật này). Idempotent — gọi nhiều lần không sao,
// chỉ seed khi bảng đang trống.
async function ensureCategoriesSeeded(ctx){
  const { data: existing } = await ctx.supabase.from('tc_categories').select('id').eq('user_id', ctx.user.id).limit(1);
  if(existing && existing.length > 0) return;
  const { data: historyRows } = await ctx.supabase.from('tc_finance_entries')
    .select('type, category_label').eq('user_id', ctx.user.id).not('category_label', 'is', null);
  const rows = [];
  const seen = new Set();
  function addRow(type, label, classification){
    const key = type+'|'+label;
    if(seen.has(key) || !label) return;
    seen.add(key);
    rows.push({ user_id: ctx.user.id, type, label, default_classification: classification || null });
  }
  SUGGESTED_EXPENSE_CATEGORIES.forEach(c=>addRow('expense', c, SUGGESTED_EXPENSE_CLASSIFICATION[c]));
  SUGGESTED_INCOME_CATEGORIES.forEach(c=>addRow('income', c, null));
  (historyRows||[]).forEach(r=>addRow(r.type, r.category_label, r.type==='expense' ? 'cp_bien_doi' : null));
  if(rows.length > 0) await ctx.supabase.from('tc_categories').insert(rows);
}

// Gán 1 màu cố định cho mỗi tên danh mục (hash chuỗi) — cùng 1 tên luôn ra cùng 1 màu giữa các lần
// render, dù danh mục giờ là text tự do không còn key cố định.
const CATEGORY_COLOR_PALETTE = ['#3B82F6','#10B981','#F59E0B','#EF4444','#8B5CF6','#14B8A6','#EC4899','#EAB308','#6366F1','#F97316','#06B6D4','#84CC16'];
function categoryColor(name){
  const s = String(name||'Khác');
  let hash = 0;
  for(let i=0;i<s.length;i++){ hash = (hash*31 + s.charCodeAt(i)) >>> 0; }
  return CATEGORY_COLOR_PALETTE[hash % CATEGORY_COLOR_PALETTE.length];
}

// Donut chart SVG thuần (kỹ thuật stroke-dasharray trên nhiều <circle> cùng tâm — không cần tính
// path cung phức tạp, không cần thư viện). rows: [{label, amount}], amount đã > 0.
function donutChartHtml(rows){
  const total = rows.reduce((s,r)=>s+r.amount,0);
  if(total <= 0) return '';
  const size = 140, radius = 52, stroke = 22, cx = size/2, cy = size/2;
  const circumference = 2 * Math.PI * radius;
  let acc = 0;
  const circles = rows.map(r=>{
    const pct = r.amount / total;
    const dash = pct * circumference;
    const gap = circumference - dash;
    const rotation = (acc / total) * 360 - 90;
    acc += r.amount;
    return `<circle cx="${cx}" cy="${cy}" r="${radius}" fill="none" stroke="${categoryColor(r.label)}" stroke-width="${stroke}" stroke-dasharray="${dash.toFixed(1)} ${gap.toFixed(1)}" transform="rotate(${rotation.toFixed(1)} ${cx} ${cy})"/>`;
  }).join('');
  const legend = rows.map(r=>{
    const pct = Math.round(r.amount/total*100);
    return `<div style="display:flex;align-items:center;gap:6px;font-size:12px;margin-bottom:5px;"><span style="width:10px;height:10px;border-radius:50%;background:${categoryColor(r.label)};flex-shrink:0;"></span><span style="flex:1;">${esc(r.label)}</span><b>${pct}%</b><span style="color:var(--ink-soft);margin-left:6px;">${r.amount.toLocaleString('vi-VN')}đ</span></div>`;
  }).join('');
  return `
    <div style="display:flex;gap:18px;align-items:center;flex-wrap:wrap;">
      <svg viewBox="0 0 ${size} ${size}" style="width:130px;height:130px;flex-shrink:0;">${circles}</svg>
      <div style="flex:1;min-width:160px;">${legend}</div>
    </div>
  `;
}

// Biểu đồ cột "Xu hướng" theo từng khoảng thời gian nhỏ hơn (ngày trong tuần, hoặc từng khoảng
// ngày trong tháng) — kiểu Money Lover (2026-08-24, góp ý Quỳnh: "cần biểu đồ như money lover ý").
// buckets: [{label, amount}], amount có thể = 0 (vẫn vẽ cột rỗng để thấy đủ mốc thời gian).
function trendBarChartHtml(buckets, color){
  if(buckets.every(b=>b.amount<=0)) return `<div style="color:var(--ink-soft);font-size:13px;">Chưa có dữ liệu.</div>`;
  const w = 320, h = 170, padTop = 10, padBottom = 26, padSide = 8;
  const innerW = w - padSide*2, innerH = h - padTop - padBottom;
  const maxVal = Math.max(1, ...buckets.map(b=>b.amount));
  const n = buckets.length;
  const slot = innerW/n;
  const barW = Math.max(8, Math.min(34, slot*0.55));
  const bars = buckets.map((b,i)=>{
    const x = padSide + slot*i + (slot-barW)/2;
    const barH = Math.max(1, innerH * (b.amount/maxVal));
    const y = padTop + (innerH - barH);
    const valueLabel = b.amount>0 ? `<text x="${(x+barW/2).toFixed(1)}" y="${(y-4).toFixed(1)}" text-anchor="middle" font-size="9" fill="var(--ink-soft)" font-family="IBM Plex Mono, monospace">${Math.round(b.amount/1000)}k</text>` : '';
    return `${valueLabel}<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${barW.toFixed(1)}" height="${barH.toFixed(1)}" fill="${color}" rx="3"/><text x="${(x+barW/2).toFixed(1)}" y="${h-8}" text-anchor="middle" font-size="10" fill="var(--ink-soft)" font-family="IBM Plex Mono, monospace">${esc(b.label)}</text>`;
  }).join('');
  return `<svg viewBox="0 0 ${w} ${h}" style="width:100%;max-width:360px;height:${h}px;display:block;">${bars}</svg>`;
}

// Khung "Chi tiết" (donut) / "Xu hướng" (cột theo thời gian) dùng chung cho Tổng Kết Tuần/Tháng —
// id để phân biệt nhiều khối trên cùng 1 trang (vd expense/income), tab='chi-tiet'|'xu-huong' do
// module gọi tự quản lý trong state riêng (hàm này chỉ vẽ, không tự đổi tab).
function breakdownToggleHtml(id, tab, groupRows, trendBuckets, color){
  return `
    <div class="chips no-print" style="margin-bottom:12px;">
      <div class="chip ${tab==='chi-tiet'?'selected':''}" data-breakdown-tab="${esc(id)}:chi-tiet">Chi tiết</div>
      <div class="chip ${tab==='xu-huong'?'selected':''}" data-breakdown-tab="${esc(id)}:xu-huong">Xu hướng</div>
    </div>
    ${tab==='xu-huong'
      ? trendBarChartHtml(trendBuckets, color)
      : (groupRows.length===0 ? `<div style="color:var(--ink-soft);font-size:13px;">Chưa có dữ liệu.</div>` : donutChartHtml(groupRows))}
  `;
}

// Radar chart SVG thuần cho Điểm Nghiệp 5 trục. axes: [{label, value}] (value 0-100).
function radarChartHtml(axes){
  const size = 320, cx = size/2, cy = size/2, maxR = 70;
  const n = axes.length;
  const angleFor = i => (Math.PI*2*i/n) - Math.PI/2;
  function pointAt(i, value){
    const a = angleFor(i);
    const r = maxR * (Math.max(0,Math.min(100,value))/100);
    return [cx + r*Math.cos(a), cy + r*Math.sin(a)];
  }
  const rings = [0.25,0.5,0.75,1].map(f=>{
    const pts = axes.map((_,i)=>{
      const a = angleFor(i);
      return `${(cx+maxR*f*Math.cos(a)).toFixed(1)},${(cy+maxR*f*Math.sin(a)).toFixed(1)}`;
    }).join(' ');
    return `<polygon points="${pts}" fill="none" stroke="var(--line)" stroke-width="1"/>`;
  }).join('');
  const axisLines = axes.map((_,i)=>{
    const a = angleFor(i);
    const x = cx+maxR*Math.cos(a), y = cy+maxR*Math.sin(a);
    return `<line x1="${cx}" y1="${cy}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" stroke="var(--line)" stroke-width="1"/>`;
  }).join('');
  const dataPts = axes.map((ax,i)=>pointAt(i, ax.value));
  const dataPtsAttr = dataPts.map(p=>p.map(v=>v.toFixed(1)).join(',')).join(' ');
  // Chấm tròn tại từng đỉnh — nhấn thêm hình dạng thật của trụ đó trên khung, không chỉ dựa vào
  // đường viền mỏng (góp ý Quỳnh 2026-08-24: "cái điểm ở radar nó đang bị chìm" — cả điểm SỐ lẫn
  // hình dạng đều cần nổi bật hơn).
  const dataDots = axes.map((ax,i)=>{
    const [x,y] = dataPts[i];
    return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="4" fill="var(--accent)" stroke="var(--bg)" stroke-width="1.5"/>`;
  }).join('');
  // Neo chữ theo hướng (start/end/middle) tuỳ điểm nằm bên phải/trái/giữa — tránh chữ dài (vd
  // "Mối Quan Hệ") tràn ra ngoài khung SVG khi neo "middle" cố định cho mọi điểm. Nhãn dài hơn 10
  // ký tự (vd "Cội Nguồn Sinh Thành", "Thuận Pháp & Nhân Quả" — tên 5 Trụ Cột dài hơn hẳn nhãn cũ)
  // được bẻ xuống 2 dòng bằng <tspan>, nếu không dòng chữ 1 dòng sẽ tràn ra ngoài viewBox và bị cắt
  // (SVG mặc định overflow:hidden ở phần tử gốc).
  const lineHeight = 11;
  const labels = axes.map((ax,i)=>{
    const a = angleFor(i);
    const cosA = Math.cos(a), sinA = Math.sin(a);
    const dist = maxR + 22;
    const lx = cx + dist*cosA, ly = cy + dist*sinA;
    const anchor = cosA > 0.3 ? 'start' : cosA < -0.3 ? 'end' : 'middle';
    const words = ax.label.split(' ');
    let lines = [ax.label];
    if(ax.label.length > 10 && words.length > 1){
      const mid = Math.ceil(words.length/2);
      lines = [words.slice(0,mid).join(' '), words.slice(mid).join(' ')];
    }
    const yStart = ly - (lines.length-1)*lineHeight/2;
    const labelTspans = lines.map((line,li)=>`<tspan x="${lx.toFixed(1)}" ${li===0?`y="${yStart.toFixed(1)}"`:`dy="${lineHeight}"`}>${esc(line)}</tspan>`).join('');
    // Nhãn có thể bấm vào để xem giải thích trụ đó là gì (nếu axis truyền kèm `key`) — cùng ngôn
    // ngữ hình ảnh gạch chân chấm như glossaryWrap, để người dùng nhận ra ngay đây là chỗ bấm được.
    const clickAttrs = ax.key ? `data-axis-key="${esc(ax.key)}" style="cursor:pointer;text-decoration:underline;text-decoration-style:dotted;text-underline-offset:2px;"` : '';
    const labelText = `<text text-anchor="${anchor}" font-size="10.5" fill="var(--ink-soft)" ${clickAttrs}>${labelTspans}</text>`;

    // Điểm số (0-100) trong 1 viên "pill" đặc màu — trước đây chỉ là 1 dòng chữ nhỏ cùng cỡ với
    // nhãn nên rất dễ bị chìm giữa các đường kẻ của radar. Giờ tách hẳn ra khỏi khối chữ, to hơn,
    // nền đặc + chữ trắng để nổi bật ngay cả khi nhìn lướt, màu nền vẫn theo 3 mức như cũ.
    const scoreBg = ax.value>=70 ? 'var(--accent)' : ax.value>=40 ? 'var(--gold)' : 'var(--danger)';
    const pillW = 30, pillH = 19;
    const pillCy = yStart + (lines.length-1)*lineHeight + lineHeight + 5;
    const pill = `
      <rect x="${(lx-pillW/2).toFixed(1)}" y="${(pillCy-pillH/2).toFixed(1)}" width="${pillW}" height="${pillH}" rx="9.5" fill="${scoreBg}"/>
      <text x="${lx.toFixed(1)}" y="${(pillCy+4.2).toFixed(1)}" text-anchor="middle" font-size="13" font-weight="800" fill="#fff" font-family="'IBM Plex Mono',monospace">${Math.round(ax.value)}</text>
    `;
    return labelText + pill;
  }).join('');
  return `
    <svg viewBox="0 0 ${size} ${size+14}" style="width:100%;max-width:280px;height:auto;display:block;margin:0 auto;font-family:'Be Vietnam Pro',sans-serif;overflow:visible;">
      ${rings}
      ${axisLines}
      <polygon points="${dataPtsAttr}" fill="var(--accent)" fill-opacity="0.25" stroke="var(--accent)" stroke-width="2.5"/>
      ${dataDots}
      ${labels}
    </svg>
  `;
}

// 5 Trụ Cột Năng Lượng Bản Thể (khoá "21 Ngày Giải Nghiệp" của Quỳnh — THAY cho "5 Ngôi Nhà" từ
// 2026-08-21, vì "5 Ngôi Nhà" là khung của Thầy Bùi Quốc Tuấn, không phải của Quỳnh). Dùng chung ở
// muc-tieu-cam-ket.js (chip chọn neo mục tiêu), kien-thuc-nen-tang.js (đọc đầy đủ cả 5), và
// trang-chu.js (Điểm Nghiệp giờ tính đúng theo 5 trụ này thay vì 5 trục chung chung cũ).
const HOUSES = [
  { key:'than_tam_ban_the', label:'🧘 Thân Tâm Bản Thể', desc:'Sức mạnh nội lực cá nhân — nơi dọn dẹp tổn thương tự thân và rác tâm trí tích tụ.' },
  { key:'coi_nguon_sinh_thanh', label:'🙏 Cội Nguồn Sinh Thành', desc:'Sợi dây kết nối cha mẹ — khơi thông nguồn lực phước báu bám rễ từ đấng sinh thành.' },
  { key:'ban_doi_moi_quan_he', label:'💞 Bạn Đời & Mối Quan Hệ Thân Mật', desc:'Sự hoà hợp gia đạo — chuyển hoá năng lượng yêu thương từ áp đặt thành tự do.' },
  { key:'tai_chinh_tam_thuc', label:'💰 Giá Trị Cống Hiến & Tài Chính Tâm Thức', desc:'Sự thịnh vượng bền vững — khai thông tắc nghẽn năng lượng thịnh vượng từ sâu bên trong.' },
  { key:'thuan_phap_nhan_qua', label:'☯️ Tiến Trình Thuận Pháp & Nhân Quả', desc:'Sự bình an toàn vẹn — đón nhận cuộc sống và kiến tạo vận mệnh thong dong.' },
];
const HOUSE_GOAL_ANCHOR = {
  than_tam_ban_the: 'Đây là trụ sức mạnh nội lực cá nhân — nơi dọn dẹp tổn thương tự thân và rác tâm trí. Thanh khoản nợ không phải để oai, mà để chuộc lại sự tự do cho thân — tâm — trí: giải phóng khỏi nỗi ám ảnh con số, giữ nhịp thở bình an dù khoản nợ lớn cỡ nào, đừng lấy lý do "đang nợ" để bỏ bê giấc ngủ/sức khoẻ.',
  coi_nguon_sinh_thanh: 'Đây là sợi dây kết nối với cha mẹ — khơi thông nguồn lực phước báu bám rễ từ đấng sinh thành. Không phải để chứng minh mình giỏi, mà để bố mẹ được an tâm và ngủ ngon. Đừng đợi "đủ giàu" rồi mới báo hiếu — ngay cả khi đang nợ, một khoản nhỏ chăm lo cha mẹ bằng sự hân hoan thật lòng đã là gieo hạt tốt.',
  ban_doi_moi_quan_he: 'Đây là sự hoà hợp gia đạo — chuyển hoá năng lượng yêu thương từ áp đặt thành tự do, ranh giới lành mạnh. Thanh khoản nợ không phải cuộc chiến đơn độc — là sự đồng thuận của cả gia đình. Vợ chồng không đổ lỗi, không phán xét nhau; khi hai người thực sự đồng lòng, áp lực tài chính bên ngoài sẽ nhẹ đi rất nhiều.',
  tai_chinh_tam_thuc: 'Đây là trụ thịnh vượng bền vững — khai thông tắc nghẽn năng lượng thịnh vượng từ sâu bên trong. Người cho bạn vay chính là nguồn lực họ đã tin tưởng trao cho bạn lúc cần. Biết ơn thay vì né tránh, giữ đúng cam kết dù chưa đủ tiền — đó là cách bảo vệ uy tín và mở lại dòng chảy hỗ trợ.',
  thuan_phap_nhan_qua: 'Đây là sự bình an toàn vẹn — đón nhận cuộc sống, kiến tạo vận mệnh thong dong. Khoản nợ chỉ là một điểm trũng tạm thời trong quy luật lên-xuống tự nhiên, không phải bản án. Đón nhận (thay vì chỉ cắn răng chịu đựng) giúp bạn đứng cao hơn vấn đề, đủ bình tĩnh để chủ động tìm giải pháp.',
};
function houseLabel(key){ const f = HOUSES.find(h=>h.key===key); return f ? f.label : ''; }

// Gợi ý mẫu (không phải định nghĩa trụ — HOUSE_GOAL_ANCHOR ở trên đã giải thích trụ là gì, hiện
// riêng ở hint-box phía trên ô này rồi) cho ô "Vì sao trụ này quan trọng với bạn?" — trước đây lấy
// nhầm luôn HOUSE_GOAL_ANCHOR làm placeholder nên ô trống lại hiện y hệt đoạn định nghĩa vừa đọc ở
// trên, thành ra lặp lại vô nghĩa (2026-09-01, chị Quỳnh báo "ghi gợi ý chứ không phải ghi lại định
// nghĩa"). Viết theo giọng NGÔI THỨ NHẤT ("tôi muốn...") để người dùng có thể bấm sửa lại thành đúng
// lý do CỦA HỌ thay vì phải tự nghĩ từ đầu.
const HOUSE_REASON_SUGGESTION = {
  than_tam_ban_the: 'Vì tôi muốn ngủ ngon, không giật mình lúc nửa đêm nghĩ tới khoản nợ — còn sức khoẻ thì mới còn sức đi làm để trả nợ.',
  coi_nguon_sinh_thanh: 'Vì tôi muốn bố mẹ an tâm, không phải giấu chuyện nợ nần với gia đình nữa.',
  ban_doi_moi_quan_he: 'Vì tôi muốn vợ/chồng mình cùng nhìn về một hướng, không còn cãi nhau mỗi khi nhắc tới tiền.',
  tai_chinh_tam_thuc: 'Vì tôi muốn giữ đúng lời hứa với người đã tin tưởng cho tôi vay — để sau này cần, họ vẫn sẵn lòng giúp.',
  thuan_phap_nhan_qua: 'Vì tôi muốn coi đây là một giai đoạn rồi sẽ qua, không phải một bản án đeo bám mình cả đời.',
};

// 4 khâu "Nút Chặn Dòng Tiền" đo được ở Vibe Check (Chấm Điểm Nghiệp Tiền, thiet-lap-nhanh.js).
const WEAKEST_AREA_INFO = {
  income: { label:'Đón Nhận', explain:'Bạn đang khó đón nhận trọn vẹn — mỗi khi tiền về, nỗi lo che mất niềm vui. Đây là gốc rễ dễ tạo ra Dòng Tiền Sợ Hãi lặp lại.', nutChan:2, seedBelief:'Tôi khó đón nhận trọn vẹn khi tiền về — nỗi lo thường che mất niềm vui.' },
  expense: { label:'Chi Dùng', explain:'Bạn đang xót của mỗi khi chi tiền ra — phản ứng này âm thầm nuôi Nút Chặn Dòng Tiền #3 (Khi chính mình chi tiền ra).', nutChan:3, seedBelief:'Tôi hay thấy xót của mỗi khi phải chi tiền ra, dù là chi cho việc cần thiết.' },
  debt: { label:'Đối Diện Nợ', explain:'Bạn đang né tránh đối diện với nợ — điều này dễ khiến gánh nặng tâm lý về khoản nợ càng lúc càng nặng thêm.', nutChan:null, seedBelief:'Tôi đang né tránh đối diện thẳng với khoản nợ của mình.' },
  witness_receive: { label:'Đón Nhận Của Người Khác', explain:'Bạn đang khó vui thật lòng khi người khác nhận được tiền — phản ứng này âm thầm nuôi Nút Chặn Dòng Tiền #1 (Khi thấy người khác nhận tiền), khiến tâm thức tin rằng thịnh vượng là có hạn.', nutChan:1, seedBelief:'Tôi khó vui thật lòng khi thấy người khác nhận được tiền hoặc tin vui tài chính.' },
};

// 4 dạng "Tiếng Lòng" (phản ứng cảm xúc) thường gặp ngay sau khi đặt mục tiêu — dùng ở
// muc-tieu-cam-ket.js (chip tự nhận diện, không bắt buộc) và kien-thuc-nen-tang.js (đọc đầy đủ).
const RESISTANCE_PATTERNS = [
  { key:'hoai_nghi', t:'🤔 Hoài nghi logic', d:'Vừa viết mục tiêu xong, đầu đã tính toán "lương có bằng này, lấy đâu ra?" — sự hoài nghi này khiến bạn dễ bỏ cuộc trước khi thử.' },
  { key:'co_the', t:'😴 Cơ thể phản kháng', d:'Tự nhiên buồn ngủ, mệt mỏi, hoặc ốm vặt ngay sau khi đặt mục tiêu lớn — cơ thể đang "hoảng" vì thấy gánh nặng quá sức, không phải dấu hiệu bạn yếu đuối.' },
  { key:'tui_than', t:'😔 Tủi thân, so sánh', d:'Thở dài, thấy tủi thân "sao đời mình khổ vậy" — cảm xúc này rất thật, chỉ cần nhận diện được nó, không cần phải dẹp bỏ ngay.' },
  { key:'so_hai', t:'😰 Sợ hãi, né tránh', d:'Nghĩ tới mục tiêu lại hiện lên hình ảnh chủ nợ hay cảm giác nhục nhã — động cơ lúc này là "chạy trốn" chứ chưa phải "hướng tới".' },
];

// Chú giải tâm thức — nhiều người không hiểu các khái niệm (Tài sản/Tiêu sản, Dòng Tiền Bình An/Sợ
// Hãi, Nợ Kiến Tạo/Hoảng Loạn, danh xưng tri ân...), nên mỗi khái niệm có giải thích ngắn gọn tại đúng nơi nó
// xuất hiện, bấm vào mới hiện ra (dùng thẻ <details> có sẵn của trình duyệt — không cần JS quản lý
// mở/đóng, sống sót qua mọi lần render lại).
const GLOSSARY = {
  tai_san: { term:'Tài sản', explain:'Thứ mang lại TIỀN cho bạn theo thời gian — tiết kiệm, vàng, cổ phiếu, bất động sản cho thuê... Tài sản càng nhiều, dòng tiền chảy VÀO tương lai của bạn càng lớn. VD dễ nhớ: mua vàng/gửi tiết kiệm/mua cổ phiếu — tiền vẫn của bạn, còn sinh thêm.' },
  tieu_san: { term:'Tiêu sản', explain:'Thứ LẤY TIỀN của bạn theo thời gian — mất giá trị dần, tốn phí duy trì hàng tháng (xe hơi, đồ điện tử, nợ thẻ tín dụng chưa trả...). Không xấu, nhưng cần ý thức rõ nó đang lấy tiền chứ không sinh tiền. VD dễ nhớ: ăn uống/mua quần áo/trả lãi thẻ tín dụng — tiền đã tiêu, không quay lại.' },
  cp_co_dinh: { term:'Chi phí cố định', explain:'Khoản chi lặp lại mỗi tháng gần như không đổi — tiền thuê nhà, bảo hiểm, học phí cố định...' },
  cp_bien_doi: { term:'Chi phí biến đổi', explain:'Khoản chi thay đổi theo thói quen mỗi tháng — ăn uống, mua sắm, giải trí... Đây là nơi dễ điều chỉnh nhất khi muốn tiết kiệm nhiều hơn.' },
  dong_tien_xanh: { term:'Dòng Tiền Bình An', explain:'Tiền kiếm được hoặc chi ra trong sự biết ơn, hoan hỷ, tạo giá trị thặng dư chân chính (lương, bán hàng thật, trả hoá đơn trong sự tri ân...) — mang năng lượng sinh sôi, giúp khơi thông Nút Chặn Dòng Tiền.' },
  dong_tien_do: { term:'Dòng Tiền Sợ Hãi', explain:'Tiền kiếm được hoặc chi ra trong sự sợ hãi, lo âu, xót xa (vay nóng trong hoảng loạn, chi tiêu kèm oán trách, tiếc của...) — mang năng lượng huỷ hoại, tự tay tạo thêm Nút Chặn Dòng Tiền của chính bạn.' },
  no_xanh: { term:'Nợ Kiến Tạo', explain:'Khoản vay từ nguồn chính thống (ngân hàng, tổ chức tín dụng hợp pháp), trong kế hoạch rõ ràng, để tạo ra giá trị thật (mua nhà, đầu tư kinh doanh có tính toán) — đây là "chi phí vận hành cho sự thịnh vượng", không phải gánh nặng.' },
  no_do: { term:'Nợ Hoảng Loạn', explain:'Khoản vay trong hoảng loạn, từ nguồn không lành mạnh (tín dụng đen, vay nóng lãi suất cao, vay để đắp một khoản nợ khác) — sinh ra từ nỗi sợ, thường kéo theo vòng xoáy nợ chồng nợ.' },
  danh_xung_tri_an: { term:'Vì sao đổi tên gọi khoản nợ?', explain:'"Ân Nhân Hỗ Trợ Vốn" (chủ nợ) — người/tổ chức đã tin tưởng trao nguồn lực cho bạn lúc bạn cần. "Nguồn Lực Đã Đón Nhận" (số nợ) — số tiền bạn đã ĐÓN NHẬN, không phải món nợ đè nặng. "Ngày Cam Kết Tri Ân" (hạn trả) — ngày bạn chủ động gửi lại sự tri ân, không phải ngày bị đòi nợ. Đổi tên để tâm thức bạn nhìn khoản nợ bằng sự biết ơn thay vì chỉ thấy áp lực.' },
  ngoi_nha: { term:'5 Trụ Cột Năng Lượng Bản Thể', explain:'Gắn mục tiêu vào 1 trụ cụ thể giúp mục tiêu có ý nghĩa cảm xúc thật, không chỉ là con số khô khan — tâm thức khó "sập nguồn" trước 1 mục tiêu có ý nghĩa rõ ràng.' },
  vibe_check: { term:'Vibe Check', explain:'Câu hỏi "Bạn đang cảm nhận gì lúc này?" mỗi lần ghi thu/chi ở Ghi Chép Hàng Ngày — chọn đúng cảm xúc thật lúc tiền vào/ra (biết ơn, lo âu, hay vô cảm), không phải chỉ ghi con số. Đây là dữ liệu gốc để tính Điểm Nghiệp và soi ra khâu tâm thức tiền đang yếu nhất.' },
  karma_score: { term:'Điểm Nghiệp', explain:'Điểm số phản ánh trạng thái tâm thức của bạn qua đúng 5 Trụ Cột Năng Lượng Bản Thể — không phải để đánh giá đúng/sai, mà để bạn NHÌN THẤY mình đang mạnh ở đâu, cần chăm sóc ở đâu. Trụ Tài Chính Tâm Thức ảnh hưởng nhẹ tới cả 4 trụ còn lại (đúng tinh thần: tài chính bất ổn sẽ kéo theo mọi mặt khác). Điểm luôn tính lại từ dữ liệu bạn ghi chép, không cố định.' },
  tang_thuc: { term:'Tàng Thức & Hạt Giống Phước - Nghiệp là gì?', explain:'Tàng Thức là tầng gốc rễ sâu nhất — nơi cất giữ những "hạt giống" (niềm tin cũ về tiền) hình thành từ ký ức, tuổi thơ, lời người thân từng nói. Mỗi hạt giống âm thầm nuôi các phản ứng cảm xúc lặp lại ở Tâm Thức (vd các Nút Chặn Dòng Tiền), rồi chi phối Tiềm Thức (thói quen hành xử với tiền không cần suy nghĩ), và cuối cùng hiện ra thành kết quả thật ở Ý Thức (số dư, nợ, tài sản — đời sống vật chất). Nhìn thấy hạt giống gốc chính là nơi bắt đầu chữa lành, thay vì chỉ sửa triệu chứng ở bề mặt.' },
};
// Chạm/trỏ vào ĐÚNG chữ tên khái niệm (không phải icon "?" riêng) để mở định nghĩa — góp ý Quỳnh
// 2026-08-21: "chỉ cần trỏ vào cái tên là ra định nghĩa". displayText là chính label/tiêu đề đang
// hiện; keys là 1 hoặc nhiều khái niệm liên quan gộp chung 1 lần mở (vd cả 4 phân loại kế toán).
function glossaryWrap(displayText, ...keys){
  const explains = keys.map(k=>GLOSSARY[k]).filter(Boolean)
    .map(g=>`<div style="margin-bottom:8px;"><b>${esc(g.term)}</b> — ${esc(g.explain)}</div>`).join('');
  if(!explains) return esc(displayText);
  return `<details class="glossary-wrap">
    <summary class="glossary-term">${esc(displayText)}</summary>
    <div class="hint-box" style="margin-top:8px;max-width:420px;">${explains}</div>
  </details>`;
}
