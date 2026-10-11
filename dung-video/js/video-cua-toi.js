(function(){
// Video của tôi — danh sách + chi tiết 1 video (tiến trình các bước, video/bìa/caption khi xong).
// Bộ lọc trạng thái là dropdown (quy tắc chung: nhóm lọc >4 mục không dùng hàng chip). Thao tác phụ
// (xoá) nằm sau "▾ Tuỳ chọn", không bày phẳng. Caption dài thu gọn, "Đọc thêm" để mở.
// Không cần lưu nháp riêng: mọi dữ liệu đã nằm trong dv_jobs; bộ lọc/video đang mở nhớ qua biến toàn cục.
const FILTERS = [['all','Tất cả'],['building','Đang dựng'],['queued','Đang chờ'],['review','Chờ bạn xem'],['done','Đã nhận'],['failed','Lỗi']];
const FILTER_STATUS = { building:['building'], queued:['queued','uploading'], review:['review'], done:['done'], failed:['failed'] };

window.Modules = window.Modules || {};
window.Modules['video-cua-toi'] = {
  title: 'Video',
  async render(container, ctx){
    const state = { jobs:[], filter: window.__dvFilter || 'all', openId: window.__dvOpenJob || null, capOpen:false, optOpen:false, urls:{} };
    window.__dvOpenJob = null;
    let timer = null;

    async function load(){
      const { data } = await ctx.supabase.from('dv_jobs').select('*').eq('user_id', ctx.user.id).order('created_at', { ascending:false }).limit(100);
      state.jobs = data || [];
      if(window.dvRefreshBadges) window.dvRefreshBadges();
    }
    function active(){ return state.jobs.some(j=>['queued','building','uploading'].includes(j.status)); }
    function startPolling(){
      clearInterval(timer);
      // Có việc đang chạy thì hỏi lại mỗi 8s để tiến trình/kết quả hiện ra không cần tải lại trang.
      timer = setInterval(async ()=>{
        if(!container.isConnected){ clearInterval(timer); return; }
        if(!active() && !(state.openId && state.jobs.find(j=>j.id===state.openId && j.status==='review'))) return;
        const before = JSON.stringify(state.jobs.map(j=>[j.id,j.status,j.steps]));
        await load();
        if(JSON.stringify(state.jobs.map(j=>[j.id,j.status,j.steps])) !== before) draw();
      }, 8000);
    }

    function drawList(){
      const list = state.filter==='all' ? state.jobs : state.jobs.filter(j=>FILTER_STATUS[state.filter].includes(j.status));
      container.innerHTML = `
        <div class="page-head"><h1>Video của tôi</h1><p>Mỗi video chỉ ở một trạng thái. Bấm vào để xem chi tiết.</p></div>
        <select id="flt" style="margin:0 0 16px;">${FILTERS.map(([k,l])=>{ const n = k==='all' ? state.jobs.length : state.jobs.filter(j=>FILTER_STATUS[k].includes(j.status)).length; return `<option value="${k}" ${state.filter===k?'selected':''}>${l} (${n})</option>`; }).join('')}</select>
        ${list.length ? list.map(j=>{ const st = DV_STATUS[j.status]||{label:j.status,icon:'🎞️'}; return `
          <div class="job-row" data-id="${j.id}"><div class="th">${st.icon}</div>
            <div class="mid"><div class="t">${esc(j.title||j.source_name||'Video')}</div>
              <div class="s">Nhận ${esc(fmtWhen(j.created_at))}${j.status==='review'?'<br>Mở để lấy bìa, video, caption':''}</div></div>
            <span class="st ${j.status}">${esc(st.label)}</span></div>`; }).join('')
          : `<div class="card" style="color:var(--ink-soft);">${state.jobs.length?'Không có video nào ở trạng thái này.':'Chưa có video nào. Vào "Gửi video" để bắt đầu.'}</div>`}`;
      container.querySelector('#flt').onchange = (e)=>{ state.filter = e.target.value; window.__dvFilter = state.filter; drawList(); };
      container.querySelectorAll('.job-row').forEach(el=>{ el.onclick = ()=>{ state.openId = el.getAttribute('data-id'); state.capOpen = false; state.optOpen = false; draw(); }; });
    }

    async function ensureUrls(j){
      // Link ký tên hết hạn sau 1 giờ — lấy lại mỗi lần mở chi tiết, chỉ khi video đã xong.
      if(j.status!=='review' && j.status!=='done') return;
      try{
        if(j.result_video_path && !state.urls[j.id+'v']) state.urls[j.id+'v'] = await getFileUrl(j.result_video_path);
        if(j.result_cover_path && !state.urls[j.id+'c']) state.urls[j.id+'c'] = await getFileUrl(j.result_cover_path);
      } catch(e){}
    }

    async function drawDetail(){
      const j = state.jobs.find(x=>x.id===state.openId);
      if(!j){ state.openId = null; drawList(); return; }
      await ensureUrls(j);
      if(!container.isConnected) return;
      const st = DV_STATUS[j.status]||{label:j.status};
      const vUrl = state.urls[j.id+'v'], cUrl = state.urls[j.id+'c'];
      const cap = j.caption || '';
      const longCap = cap.length > 260;
      const fname = (j.title||j.source_name||'video').replace(/\.[^.]+$/,'').replace(/[^\w\- ]+/g,'').trim().slice(0,60) || 'video';
      container.innerHTML = `
        <div class="page-head"><a style="font-size:14.5px;color:var(--ink-soft);cursor:pointer;" id="back">‹ Video của tôi</a>
          <h1 style="margin-top:8px;">${esc(j.title||j.source_name||'Video')}</h1>
          <p>Nhận ${esc(fmtWhen(j.created_at))} · <span class="st ${j.status}">${esc(st.label)}</span></p></div>
        <div class="card"><h3 style="font-family:'Be Vietnam Pro',sans-serif;font-size:17px;">Tiến trình</h3>
          <div class="steps">${(j.steps||[]).map(s=>`<div class="step ${s.state}"><div class="dot">${s.state==='done'?'✓':s.state==='error'?'!':''}</div><span>${esc(s.label)}</span></div>`).join('') || '<div style="color:var(--ink-soft);padding:8px 0;">Đang chờ xếp hàng…</div>'}</div></div>
        ${j.status==='queued'?`<div class="hint-box" style="margin-bottom:16px;">Đang chờ Máy dựng nhận việc. Hãy chắc Máy dựng đang bật (xem ở Cài đặt).</div>`:''}
        ${j.status==='failed'?`<div class="error-box" style="margin-bottom:16px;">${esc(j.error||'Dựng thất bại.')}<div style="margin-top:12px;"><button class="btn btn-sm" id="retry">Gửi dựng lại</button></div></div>`:''}
        ${(j.status==='review'||j.status==='done')?`
          <div class="card" style="margin-bottom:16px;">
            ${vUrl?`<video src="${esc(vUrl)}" controls playsinline style="width:100%;max-width:340px;display:block;margin:0 auto;border-radius:12px;background:#000;"></video>`:'<div style="color:var(--ink-soft);">Không tải được video — thử mở lại trang.</div>'}
            <div class="btn-row" style="margin-top:16px;">
              ${cUrl?`<a class="btn btn-ghost btn-sm" href="${esc(cUrl)}" target="_blank" rel="noopener" style="text-decoration:none;">⬇ Lưu bìa</a>`:''}
              ${vUrl?`<a class="btn btn-sm" href="${esc(vUrl)}" download="${esc(fname)}.mov" style="text-decoration:none;background:#1A1A1A;">⬇ Tải video</a>`:''}
            </div></div>
          ${cap?`<div class="card" style="margin-bottom:16px;"><h3 style="font-family:'Be Vietnam Pro',sans-serif;font-size:17px;margin-bottom:10px;">Caption đăng bài</h3>
            <div style="white-space:pre-line;font-size:16.5px;line-height:1.7;">${esc(longCap&&!state.capOpen?cap.slice(0,260)+'…':cap)}</div>
            ${longCap?`<span class="more-toggle" id="cap-more">${state.capOpen?'Thu gọn':'Đọc thêm'}</span><br>`:''}
            <button class="btn btn-ghost btn-sm" id="cap-copy" style="margin-top:12px;">Sao chép caption</button></div>`:''}
          ${j.status==='review'?`<button class="btn btn-full" id="accept">Đã nhận video này</button>`:''}`:''}
        <div style="margin-top:22px;"><span class="more-toggle" id="opt">${state.optOpen?'▴':'▾'} Tuỳ chọn</span>
          ${state.optOpen?`<div style="margin-top:10px;"><button class="btn btn-ghost btn-sm" id="del" style="color:var(--danger);">Xoá video này</button></div>`:''}</div>`;
      container.querySelector('#back').onclick = ()=>{ state.openId = null; drawList(); };
      const on = (id,fn)=>{ const el = container.querySelector(id); if(el) el.onclick = fn; };
      on('#opt', ()=>{ state.optOpen = !state.optOpen; drawDetail(); });
      on('#cap-more', ()=>{ state.capOpen = !state.capOpen; drawDetail(); });
      on('#cap-copy', async (e)=>{ try{ await navigator.clipboard.writeText(cap); e.target.textContent = 'Đã sao chép ✓'; }catch(err){ e.target.textContent = 'Không sao chép được'; } });
      on('#accept', async ()=>{ await ctx.supabase.rpc('dv_mark_job_seen', { p_job_id:j.id, p_done:true }); await load(); drawDetail(); });
      on('#retry', async ()=>{ await ctx.supabase.rpc('dv_retry_job', { p_job_id:j.id }); await load(); drawDetail(); });
      on('#del', async ()=>{
        if(!await confirmModal('Xoá video này khỏi danh sách? Không khôi phục được.', 'Xoá')) return;
        await ctx.supabase.from('dv_jobs').delete().eq('id', j.id); state.openId = null; await load(); drawList();
      });
      // Lần đầu khách mở video "Chờ bạn xem" thì đánh dấu đã xem (không đổi trạng thái).
      if(j.status==='review' && !j.seen_at) ctx.supabase.rpc('dv_mark_job_seen', { p_job_id:j.id, p_done:false });
    }
    function draw(){ state.openId ? drawDetail() : drawList(); }

    container.innerHTML = `<div class="loading"><div class="spinner"></div><p>Đang tải…</p></div>`;
    await load(); draw(); startPolling();
  },
};
})();
