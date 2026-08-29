function esc(s){
  return String(s==null?'':s).replace(/[&<>]/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
}

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
function openTextModal(title, body, imageDataUrl){
  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(20,24,20,.7);display:flex;align-items:center;justify-content:center;padding:20px;';
  overlay.innerHTML = `
    <div style="background:#fff;border-radius:14px;max-width:560px;width:100%;max-height:85vh;display:flex;flex-direction:column;box-shadow:0 12px 40px rgba(0,0,0,.4);" onclick="event.stopPropagation();">
      <div style="padding:18px 20px 12px;border-bottom:1px solid var(--line);display:flex;justify-content:space-between;align-items:flex-start;gap:12px;">
        <h3 style="margin:0;font-size:16px;">${esc(title||'Bài viết')}</h3>
        <span data-close-text-modal="1" style="cursor:pointer;color:var(--ink-soft);font-size:20px;line-height:1;">&times;</span>
      </div>
      <div style="padding:16px 20px;overflow-y:auto;">
        ${imageDataUrl?`<img src="${imageDataUrl}" alt="Ảnh AI tạo cho bài này" style="width:100%;border-radius:10px;margin-bottom:14px;display:block;">`:''}
        <div style="white-space:pre-line;font-size:14.5px;line-height:1.7;">${esc(body||'')}</div>
      </div>
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

// PushManager.subscribe() cần applicationServerKey dạng Uint8Array, nhưng VAPID public key ta có
// là chuỗi base64url — chuyển đổi qua lại theo đúng chuẩn (thêm padding '=' bị chuẩn base64url bỏ,
// đổi -/_ về +//). Dùng chung cho tai-khoan.js lúc bật thông báo.
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

// Bọc 1 truy vấn Supabase (dạng {data, error}, KHÔNG throw) với trần thời gian chờ — supabase-js
// không tự có timeout, nên khi mạng chập chờn (rất hay gặp trên di động) hoặc Supabase đang quá
// tải, request có thể treo VÔ THỜI HẠN — cả trang đứng ở màn hình "Đang tải…"/vòng xoay mãi mãi,
// không có cách nào thoát hay thử lại (phát hiện 2026-08-24: nhiều khách báo app "quay quay không
// vào được" trên điện thoại). Hết giờ thì coi như lỗi (trả object cùng hình dạng {data:null,
// error}), để chỗ gọi xử lý y hệt mọi lỗi mạng khác, không cần biết riêng đây là do timeout.
function withTimeout(promise, ms, timeoutMessage){
  return Promise.race([
    promise,
    new Promise(resolve => setTimeout(()=> resolve({ data:null, error:{ message: timeoutMessage || 'Kết nối mạng chậm/không ổn định, thử lại giúp mình.' } }), ms)),
  ]);
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
  // opts.gatedWeight: dùng cho endpoint tốn lượt BIẾN THIÊN theo từng lần gọi (vd api/auto-fill-week
  // — số bài viết được + cách lấy nguồn quyết định số lượt, không cố định như GATED_API_WEIGHTS) —
  // truyền 1 hàm (data)=>number để đọc đúng số lượt THẬT server vừa trừ từ response, thay vì tra
  // bảng trọng số cố định theo đường dẫn.
  if(window.onGatedApiSuccess && !(opts && opts.skipGatedCallback)){
    const weight = opts && typeof opts.gatedWeight === 'function' ? opts.gatedWeight(data) : (opts && opts.gatedWeight);
    window.onGatedApiSuccess(relativePath, weight);
  }
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
