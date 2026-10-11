// Bộ tiện ích dùng chung — rút gọn từ suc-khoe/js/util.js (esc, modal xác nhận, gọi API, lưu nháp),
// giữ nguyên bản gốc để các app trong repo đồng bộ; phần cuối là tiện ích riêng của Dựng Video AI.
function esc(s){
  return String(s==null?'':s).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

function confirmModal(message, confirmLabel){
  return new Promise((resolve)=>{
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(20,24,20,.7);display:flex;align-items:center;justify-content:center;padding:20px;';
    overlay.innerHTML = `
      <div style="background:#fff;border-radius:14px;max-width:360px;width:100%;padding:22px;box-shadow:0 12px 40px rgba(0,0,0,.4);text-align:center;" onclick="event.stopPropagation();">
        <div style="font-size:16.5px;line-height:1.6;color:var(--ink);margin-bottom:20px;">${esc(message)}</div>
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

async function callApiOnce(relativePath, body, timeoutMs){
  const { data: sessionData } = await supabaseClient.auth.getSession();
  const token = sessionData && sessionData.session ? sessionData.session.access_token : null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs || 150000);
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
    if(e.name === 'AbortError') throw new Error(`Yêu cầu mất quá lâu (quá ${Math.round((timeoutMs||150000)/1000)} giây) — server có thể đang quá tải, thử lại giúp mình.`);
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

// ===== Riêng Dựng Video AI =====
// Upload THẲNG từ trình duyệt lên link có chữ ký (video quá lớn để đi qua hàm serverless). Dùng XHR vì
// fetch không báo được % đã tải lên — khách gửi video vài trăm MB cần thấy thanh tiến độ chạy thật.
function uploadWithProgress(url, file, onProgress){
  return new Promise((resolve, reject)=>{
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', url);
    xhr.setRequestHeader('content-type', file.type || 'application/octet-stream');
    xhr.upload.onprogress = (e)=>{ if(e.lengthComputable && onProgress) onProgress(e.loaded / e.total); };
    xhr.onload = ()=> (xhr.status >= 200 && xhr.status < 300) ? resolve() : reject(new Error('Upload thất bại — thử lại giúp mình.'));
    xhr.onerror = ()=> reject(new Error('Mất kết nối khi tải lên — kiểm tra mạng rồi thử lại.'));
    xhr.send(file);
  });
}

async function getFileUrl(path, downloadName){
  const r = await callApi('api/dung-video-file', { path, download_name: downloadName });
  return r.url;
}

function fmtSize(b){
  if(!b) return '';
  return b > 1048576 ? (b/1048576).toFixed(b>10485760?0:1)+' MB' : Math.max(1,Math.round(b/1024))+' KB';
}
// "hôm nay 14:58" / "hôm qua 10:45" / "08/10 20:54" — cùng kiểu hiển thị của Calita Cut.
function fmtWhen(iso){
  if(!iso) return '';
  const d = new Date(iso), now = new Date();
  const hm = String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0');
  const day = (x)=>new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((day(now)-day(d))/86400000);
  if(diff===0) return 'hôm nay '+hm;
  if(diff===1) return 'hôm qua '+hm;
  return String(d.getDate()).padStart(2,'0')+'/'+String(d.getMonth()+1).padStart(2,'0')+' '+hm;
}

// Mỗi video chỉ ở MỘT trạng thái (đúng tinh thần Calita: "Mỗi video chỉ ở một trạng thái").
const DV_STATUS = {
  uploading:{ label:'Đang tải lên', icon:'⬆️' },
  queued:{ label:'Đang chờ', icon:'⏳' },
  building:{ label:'Đang dựng', icon:'🎬' },
  review:{ label:'Chờ bạn xem', icon:'👀' },
  done:{ label:'Đã nhận', icon:'✅' },
  failed:{ label:'Lỗi', icon:'⚠️' },
};
// Máy dựng báo "còn sống" bằng heartbeat; quá 3 phút không thấy = coi là tắt.
function machineOnline(m){ return m && m.last_seen_at && (Date.now() - new Date(m.last_seen_at).getTime()) < 3*60*1000; }
