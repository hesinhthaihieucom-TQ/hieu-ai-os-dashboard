// Bộ tiện ích dùng chung — rút gọn từ suc-khoe/js/util.js, bỏ phần biểu đồ/màu danh mục (không
// dùng ở app này), giữ đúng phần chung cho mọi app trong hệ sinh thái HIỂU (esc, modal, gọi API,
// lưu draft, ảnh xem to).
function esc(s){
  return String(s==null?'':s).replace(/[&<>]/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
}

// PushManager.subscribe() cần applicationServerKey dạng Uint8Array, nhưng VAPID public key ta có
// là chuỗi base64url — chuyển đổi qua lại theo đúng chuẩn (copy nguyên từ nhan-hieu/js/util.js,
// dùng chung khi bật thông báo nhắc follow khách ở trang-chu.js).
function urlBase64ToUint8Array(base64String){
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for(let i = 0; i < rawData.length; i++) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}

// Phóng to 1 ảnh (vd ảnh chụp màn hình chat) thành lightbox toàn màn hình — đóng bằng bấm ra ngoài
// hoặc Esc.
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

// Popup xác nhận trước khi xoá dữ liệu — Promise<boolean>, true nếu người dùng bấm xác nhận.
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

// % tiến trình ước lượng cho màn chờ dài (vd đợi AI phân tích ảnh chat) — copy nguyên từ
// suc-khoe/js/util.js, dùng chung cho mọi module gọi AI trong app này.
function animateProgressButton(btnEl, estimatedSeconds, baseLabel){
  if(!btnEl) return ()=>{};
  const startedAt = Date.now();
  const cap = 96;
  let dots = 0;
  const tick = ()=>{
    const elapsed = (Date.now() - startedAt) / 1000;
    const pct = Math.min(cap, (elapsed / estimatedSeconds) * cap);
    btnEl.style.background = `linear-gradient(to right, var(--accent) ${pct}%, #DCD8C9 ${pct}%)`;
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

async function callApiOnce(relativePath, body, timeoutMs){
  const { data: sessionData } = await supabaseClient.auth.getSession();
  const token = sessionData && sessionData.session ? sessionData.session.access_token : null;
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
    if (e.name === 'AbortError') throw new Error(`Yêu cầu mất quá lâu (quá ${Math.round((timeoutMs||90000)/1000)} giây) — server có thể đang quá tải, thử lại giúp mình.`);
    throw new Error('Không kết nối được tới server — kiểm tra lại mạng và thử lại.');
  } finally {
    clearTimeout(timer);
  }
}

async function callApi(path, body, timeoutMs){
  // Đường dẫn tương đối (bỏ dấu "/" đầu) để hoạt động đúng dù web được host ở gốc domain (Vercel)
  // hay dưới 1 thư mục con qua reverse proxy (vd Cloudflare Worker tại hesinhthaihieu.com).
  const relativePath = path.replace(/^\//, '');
  let resp = await callApiOnce(relativePath, body, timeoutMs);
  if(resp.status === 401){
    await supabaseClient.auth.refreshSession();
    resp = await callApiOnce(relativePath, body, timeoutMs);
  }
  let data;
  try{
    data = await resp.json();
  } catch(e){
    throw new Error(resp.status >= 500
      ? 'Server xử lý quá lâu và bị ngắt giữa chừng — thử lại giúp mình, nếu vẫn vậy báo lại nhé.'
      : 'Không đọc được phản hồi từ server — thử lại giúp mình.');
  }
  if(!resp.ok) throw new Error(data.error || 'Có lỗi xảy ra.');
  return data;
}

// Lưu/đọc/xoá trạng thái đang làm dở của 1 module vào bảng module_drafts (dùng CHUNG với mọi app
// trong hệ sinh thái HIỂU) — giữ nguyên khi rời trang rồi quay lại.
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
