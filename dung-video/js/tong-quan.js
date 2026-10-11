(function(){
// Tổng quan — màn đầu tiên (kiểu Calita Cut): trạng thái Máy dựng, số video chờ xem, nút Gửi video,
// vài video gần đây. Màn này chỉ ĐỌC; không có gì cần lưu nháp.
window.Modules = window.Modules || {};
window.Modules['tong-quan'] = {
  title: 'Tổng quan',
  async render(container, ctx){
    container.innerHTML = `<div class="loading"><div class="spinner"></div><p>Đang tải…</p></div>`;
    const draw = async ()=>{
      const [mR, jR, cR] = await Promise.all([
        ctx.supabase.from('dv_machines').select('name,last_seen_at,info').eq('user_id', ctx.user.id).order('last_seen_at', { ascending:false, nullsFirst:false }).limit(1),
        ctx.supabase.from('dv_jobs').select('id,title,source_name,status,created_at,steps').eq('user_id', ctx.user.id).order('created_at', { ascending:false }).limit(5),
        ctx.supabase.from('dv_jobs').select('id', { count:'exact', head:true }).eq('user_id', ctx.user.id).eq('status','review'),
      ]);
      if(!container.isConnected) return;
      const m = (mR.data||[])[0], jobs = jR.data||[], review = cR.count||0;
      const p = ctx.profile || {};
      const name = (p.full_name||'').trim().split(' ').pop() || 'bạn';
      const online = machineOnline(m);
      const machineCard = !m
        ? `<div class="pill off">Chưa kết nối</div><div class="v">Vào Cài đặt để ghép nối Máy dựng.</div>`
        : `<div class="pill ${online?'':'off'}">${online?'Sẵn sàng':'Đang tắt'}</div><div class="v">Máy hỏi lần cuối ${esc(fmtWhen(m.last_seen_at)||'chưa lần nào')}</div>`;
      container.innerHTML = `
        <div class="page-head"><h1>Chào ${esc(name)}</h1>
          <p>Thương hiệu trên bìa: <b>${esc(p.dv_brand_name||'chưa đặt')}</b></p></div>
        <div class="stat-grid">
          <div class="stat-card"><div class="k">Máy dựng</div>${machineCard}</div>
          <div class="stat-card"><div class="k">Bộ quy tắc dựng</div><div class="pill">${esc({phat_trien:'Phát triển bản thân',suc_khoe:'Sức khỏe',khac:'Chung'}[p.dv_channel]||'Chưa chọn')}</div><div class="v">Chữ ký: ${esc(p.dv_signature||'chưa đặt')}</div></div>
        </div>
        ${review ? `<div class="callout" id="go-review"><b>${review} video chờ bạn xem</b><p>Mở để lấy bìa, video và caption đăng ngay.</p></div>` : ''}
        <div class="cta-dark"><h3>Gửi video mới</h3><p>Chọn video quay bằng điện thoại, bấm gửi. Máy dựng sẽ tự cắt, chèn chữ, hình minh hoạ rồi gửi lại cho bạn.</p><button class="btn" id="go-send">+ Gửi video</button></div>
        <h3 style="font-family:'Be Vietnam Pro',sans-serif;font-size:19px;margin:6px 0 12px;">Video gần đây</h3>
        ${jobs.length ? jobs.map(j=>{ const st = DV_STATUS[j.status]||{label:j.status,icon:'🎞️'}; return `
          <div class="job-row" data-id="${j.id}"><div class="th">${st.icon}</div>
            <div class="mid"><div class="t">${esc(j.title||j.source_name||'Video')}</div><div class="s">Nhận ${esc(fmtWhen(j.created_at))}</div></div>
            <span class="st ${j.status}">${esc(st.label)}</span></div>`; }).join('') : `<div class="card" style="color:var(--ink-soft);">Chưa có video nào. Bấm "Gửi video" để bắt đầu.</div>`}
      `;
      const send = container.querySelector('#go-send'); if(send) send.onclick = ()=>{ location.hash = 'gui-video'; };
      const gr = container.querySelector('#go-review'); if(gr) gr.onclick = ()=>{ location.hash = 'video-cua-toi'; };
      container.querySelectorAll('.job-row').forEach(el=>{ el.onclick = ()=>{ window.__dvOpenJob = el.getAttribute('data-id'); location.hash = 'video-cua-toi'; }; });
    };
    await draw();
    // Làm mới nhẹ mỗi 20s để trạng thái Máy dựng / số video chờ xem không bị cũ; dừng khi rời màn.
    const timer = setInterval(()=>{ if(!container.isConnected){ clearInterval(timer); return; } draw(); }, 20000);
  },
};
})();
