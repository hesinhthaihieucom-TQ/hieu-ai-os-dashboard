// Popup thông báo tính năng mới cho NGƯỜI DÙNG THƯỜNG (2026-08-31) — đọc crm_feature_announcements
// admin đăng ở quan-tri-thongbao.js, hiện popup giữa màn hình, xếp thành hàng đợi theo mốc
// profiles.crm_last_seen_announcement_at (thời gian, không phải 1 ID — để không bỏ sót thông báo nào
// đăng xen giữa 2 lần vào app, xem giải thích ở schema_tro_ly_crm.sql). Nếu thông báo có "steps" thì
// cho chọn "Xem hướng dẫn →" để chạy tour spotlight bằng page-tour.js (dùng LẠI đúng engine đã có,
// không viết engine riêng như nhan-hieu/js/feature-tour.js).
(function(){
  let queue = [];
  let ctxRef = null;

  function stepsToTourSteps(steps){
    return (steps || []).map(s => ({
      selector: s.key ? `.sidebar-item[data-key="${s.key}"]` : null,
      title: s.title || '',
      text: s.text || '',
      img: s.img || null,
    }));
  }

  async function markSeenAndAdvance(ann){
    try{
      await ctxRef.supabase.rpc('mark_crm_announcement_seen', { seen_at: ann.created_at });
      if(ctxRef.profile) ctxRef.profile.crm_last_seen_announcement_at = ann.created_at;
    } catch(e){ /* best-effort — lỗi ở đây không nên chặn người dùng dùng app tiếp */ }
    showNext();
  }

  function closePopup(){
    const el = document.getElementById('crm-announcement-overlay');
    if(el) el.remove();
  }

  function showNext(){
    closePopup();
    if(!queue.length) return;
    const ann = queue.shift();
    const hasSteps = Array.isArray(ann.steps) && ann.steps.length > 0;

    const overlay = document.createElement('div');
    overlay.id = 'crm-announcement-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;z-index:99998;background:rgba(20,24,20,.65);display:flex;align-items:center;justify-content:center;padding:20px;';
    overlay.innerHTML = `
      <div style="background:#fff;border-radius:16px;max-width:420px;width:100%;padding:28px 26px;box-shadow:0 16px 44px rgba(0,0,0,.3);text-align:center;">
        <div style="font-size:40px;margin-bottom:10px;">${ann.emoji || '🎉'}</div>
        <h2 style="font-family:'Playfair Display',serif;font-size:19px;margin-bottom:10px;color:#1E2420;">${esc(ann.title)}</h2>
        <div style="font-size:14px;line-height:1.7;color:#5B5F55;white-space:pre-wrap;text-align:left;">${esc(ann.body)}</div>
        <div style="display:flex;flex-direction:column;gap:10px;margin-top:22px;">
          ${hasSteps ? `<span id="crm-ann-tour" style="cursor:pointer;font-weight:600;font-size:14px;color:#fff;background:var(--accent,#2F6F62);padding:12px;border-radius:999px;">Xem hướng dẫn →</span>` : ''}
          <span id="crm-ann-close" style="cursor:pointer;font-size:13.5px;color:${hasSteps?'#9CA396':'#fff'};${hasSteps?'':'font-weight:600;background:var(--accent,#2F6F62);padding:12px;border-radius:999px;'}">${hasSteps ? 'Để sau' : 'Đã hiểu'}</span>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    const tourBtn = overlay.querySelector('#crm-ann-tour');
    if(tourBtn) tourBtn.onclick = ()=>{
      closePopup();
      window.startPageTour(stepsToTourSteps(ann.steps), ()=>markSeenAndAdvance(ann));
    };
    overlay.querySelector('#crm-ann-close').onclick = ()=>markSeenAndAdvance(ann);
  }

  // Gọi 1 lần sau khi app-shell.js đã tải xong profile (cần crm_last_seen_announcement_at) — best-
  // effort, lỗi mạng/DB ở đây không nên chặn người dùng vào app.
  window.checkAndShowCrmAnnouncements = async function(ctx){
    ctxRef = ctx;
    try{
      const sinceAt = (ctx.profile && ctx.profile.crm_last_seen_announcement_at) || '1970-01-01';
      const { data } = await ctx.supabase.from('crm_feature_announcements').select('*')
        .gt('created_at', sinceAt).order('created_at', { ascending:true }).limit(20);
      queue = data || [];
      if(queue.length) showNext();
    } catch(e){ /* im lặng — không thấy thông báo còn hơn chặn cả app vì lỗi phụ */ }
  };
})();
