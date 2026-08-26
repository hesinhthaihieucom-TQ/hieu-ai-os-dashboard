// Bộ tiện ích dùng chung — rút gọn từ tai-chinh/js/util.js, CHỈ giữ phần thật sự dùng chung/generic
// (esc, modal, gọi API, lưu draft, biểu đồ cột đơn giản). Bỏ hết nội dung nghiệp vụ riêng của
// tai-chinh (5 Trụ Cột, GLOSSARY, danh mục thu/chi...) vì không áp dụng cho app sức khỏe này.
function esc(s){
  return String(s==null?'':s).replace(/[&<>]/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
}

// Phóng to 1 ảnh (vd ảnh sản phẩm) thành lightbox toàn màn hình — đóng bằng bấm ra ngoài hoặc Esc.
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

function fmtDate(d){
  const dt = (d instanceof Date) ? d : new Date(d);
  return dt.toLocaleDateString('vi-VN', { weekday:'short', day:'2-digit', month:'2-digit' });
}

function isoDate(d){
  const dt = (d instanceof Date) ? d : new Date(d);
  const tzOffset = dt.getTimezoneOffset() * 60000;
  return new Date(dt - tzOffset).toISOString().slice(0,10);
}

function startOfWeek(d){
  const dt = new Date(d);
  const day = dt.getDay(); // 0=Sun
  const diff = (day === 0 ? -6 : 1) - day; // move to Monday
  dt.setDate(dt.getDate() + diff);
  dt.setHours(0,0,0,0);
  return dt;
}

// % tiến trình ước lượng cho màn chờ dài (vd sau này chấm điểm bằng AI) — chưa dùng ở bản khung
// này nhưng giữ lại sẵn theo đúng bộ công cụ chung của mọi app trong hệ sinh thái HIỂU.
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
    if(e.name === 'AbortError') throw new Error(`Yêu cầu mất quá lâu (quá ${Math.round((timeoutMs||90000)/1000)} giây) — server có thể đang quá tải, thử lại giúp mình.`);
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

// Gán 1 màu cố định cho mỗi tên (hash chuỗi) — dùng cho chart/chip cần màu ổn định giữa các lần vẽ.
const CATEGORY_COLOR_PALETTE = ['#3B82F6','#10B981','#F59E0B','#EF4444','#8B5CF6','#14B8A6','#EC4899','#EAB308','#6366F1','#F97316','#06B6D4','#84CC16'];
function categoryColor(name){
  const s = String(name||'Khác');
  let hash = 0;
  for(let i=0;i<s.length;i++){ hash = (hash*31 + s.charCodeAt(i)) >>> 0; }
  return CATEGORY_COLOR_PALETTE[hash % CATEGORY_COLOR_PALETTE.length];
}

// Biểu đồ cột xu hướng đơn giản (SVG thuần) — dùng ở Theo Dõi Sức Khỏe Theo Tuần để vẽ cân
// nặng/năng lượng qua từng tuần. buckets: [{label, amount}], amount có thể = 0.
function trendBarChartHtml(buckets, color){
  if(buckets.length===0 || buckets.every(b=>b.amount<=0)) return `<div style="color:var(--ink-soft);font-size:13px;">Chưa có dữ liệu.</div>`;
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
    const valueLabel = b.amount>0 ? `<text x="${(x+barW/2).toFixed(1)}" y="${(y-4).toFixed(1)}" text-anchor="middle" font-size="9" fill="var(--ink-soft)" font-family="IBM Plex Mono, monospace">${b.amount}</text>` : '';
    return `${valueLabel}<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${barW.toFixed(1)}" height="${barH.toFixed(1)}" fill="${color}" rx="3"/><text x="${(x+barW/2).toFixed(1)}" y="${h-8}" text-anchor="middle" font-size="10" fill="var(--ink-soft)" font-family="IBM Plex Mono, monospace">${esc(b.label)}</text>`;
  }).join('');
  return `<svg viewBox="0 0 ${w} ${h}" style="width:100%;max-width:360px;height:${h}px;display:block;">${bars}</svg>`;
}
