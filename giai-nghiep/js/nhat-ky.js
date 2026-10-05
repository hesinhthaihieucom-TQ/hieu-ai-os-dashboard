(function(){
  window.Modules = window.Modules || {};
  window.Modules['nhat-ky'] = {
    title: 'Nhật Ký Của Tôi',
    async render(container, ctx){
      container.innerHTML = `<div class="loading"><div class="spinner"></div><p>Đang tải nhật ký…</p></div>`;
      const days = window.GN_DAYS || [];
      const prog = await gnLoadAllProgress(ctx.supabase, ctx.user.id);
      const filled = days.filter(d=>gnDayHasContent(prog[d.n]));
      container.innerHTML = `
        <div class="page-head">
          <span class="tag">Nhật ký</span>
          <h1>Nhật Ký Của Tôi</h1>
          <p>Tất cả những gì bạn đã viết trong 21 ngày — để nhìn lại mình đã đi qua những gì.</p>
        </div>
        ${filled.length ? filled.map(d=>{
          const a = (prog[d.n].answers)||{};
          const blocks = [];
          (a.jr||[]).forEach((t,i)=>{ if(t && t.trim()) blocks.push(`<div class="gn-q">${esc(d.journal[i]||'')}</div><div class="body" style="white-space:pre-line;font-size:16.5px;line-height:1.7;">${esc(t)}</div>`); });
          (a.ex||[]).forEach((t,i)=>{ if(t && t.trim()) blocks.push(`<div class="gn-q">Bài tập ${i+1} — ${esc((d.exercises[i]||{}).t||'')}</div><div class="body" style="white-space:pre-line;font-size:16.5px;line-height:1.7;">${esc(t)}</div>`); });
          (a.wk||[]).forEach((t,i)=>{ if(t && t.trim()) blocks.push(`<div class="gn-q">Tổng kết tuần — ${i+1}</div><div class="body" style="white-space:pre-line;font-size:16.5px;line-height:1.7;">${esc(t)}</div>`); });
          return `<details class="kt-section"><summary class="kt-summary">Ngày ${d.n} — ${esc(d.title)} ${prog[d.n].done_at?'✓':''}</summary>
            <div style="margin-top:8px;">${blocks.join('') || '<p style="color:var(--ink-soft);">Chưa có ghi chú.</p>'}
            <div class="btn-row" style="justify-content:flex-start;margin-top:14px;"><span class="btn btn-ghost btn-sm" data-open="${d.n}">Mở lại ngày này</span></div></div></details>`;
        }).join('') : `<div class="card">Bạn chưa viết gì. Bắt đầu từ <b>Ngày 1</b> ở mục Hành Trình — mọi thứ bạn viết sẽ tự lưu và hiện ở đây.</div>`}`;
      container.querySelectorAll('[data-open]').forEach(el=>{
        el.onclick = ()=>{ window.PendingGnDay = parseInt(el.getAttribute('data-open'),10); location.hash = 'ngay'; };
      });
    }
  };
})();
