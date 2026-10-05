(function(){
  window.Modules = window.Modules || {};
  window.Modules['trang-chu'] = {
    title: 'Hành Trình 21 Ngày',
    async render(container, ctx){
      container.innerHTML = `<div class="loading"><div class="spinner"></div><p>Đang tải hành trình…</p></div>`;
      const days = window.GN_DAYS || [];
      const prog = await gnLoadAllProgress(ctx.supabase, ctx.user.id);
      const doneCount = days.filter(d=>prog[d.n] && prog[d.n].done_at).length;
      // Ngày gợi ý tiếp theo = ngày đầu tiên CHƯA ký cam kết (ebook: bỏ lỡ ngày nào thì quay lại nhẹ nhàng,
      // nên KHÔNG khoá ngày — chỉ gợi ý).
      const next = days.find(d=>!(prog[d.n] && prog[d.n].done_at));
      const name = (ctx.profile && ctx.profile.full_name && ctx.profile.full_name.trim()) || '';
      const pct = Math.round(doneCount/21*100);

      container.innerHTML = `
        <div class="page-head">
          <span class="tag">Hành trình</span>
          <h1>${name ? 'Chào '+esc(name)+',' : 'Chào bạn,'} ${doneCount===0?'bắt đầu thôi':doneCount>=21?'bạn đã đi hết 21 ngày':'tiếp tục nhé'}</h1>
          <p>Không cần hoàn hảo, chỉ cần trung thực. Nếu có ngày bỏ lỡ, hãy quay lại nhẹ nhàng.</p>
          <div style="margin-top:10px;"><span class="help-btn" id="gn-help">❓ Hướng dẫn</span></div>
        </div>
        <div class="card" id="gn-summary">
          <div style="display:flex;justify-content:space-between;align-items:baseline;gap:10px;flex-wrap:wrap;">
            <b style="font-size:18px;">Đã hoàn thành ${doneCount}/21 ngày</b><span style="color:var(--ink-soft);">${pct}%</span>
          </div>
          <div class="gn-progress"><i style="width:${pct}%"></i></div>
          ${next ? `<button class="btn btn-full" id="gn-continue">${doneCount===0?'Bắt đầu Ngày 1':'Tiếp tục Ngày '+next.n} — ${esc(next.title)} →</button>` :
            `<div class="hint-box">🌿 Bạn đã khép lại 21 ngày. Chuyển hóa không phải là xóa hết điều cũ, mà là nhận ra sớm hơn khi mình sắp nghĩ, nói hoặc hành động theo lối cũ — rồi chọn lại.</div>`}
        </div>
        <div class="gn-grid" id="gn-grid">
          ${days.map(d=>{
            const done = prog[d.n] && prog[d.n].done_at;
            const cur = next && next.n===d.n;
            return `<div class="gn-day ${done?'done':''} ${cur?'current':''}" data-day="${d.n}"><div class="n">NGÀY ${String(d.n).padStart(2,'0')}</div><div class="t">${esc(d.title)}</div></div>`;
          }).join('')}
        </div>`;

      const open = (n)=>{ window.PendingGnDay = n; location.hash = 'ngay'; };
      container.querySelectorAll('.gn-day').forEach(el=>{ el.onclick = ()=>open(parseInt(el.getAttribute('data-day'),10)); });
      const cont = container.querySelector('#gn-continue'); if(cont) cont.onclick = ()=>open(next.n);
      container.querySelector('#gn-help').onclick = ()=>{
        if(!window.startPageTour) return;
        window.startPageTour([
          { selector:'#gn-summary', title:'Tiến độ của bạn', text:'Thanh này cho biết bạn đã hoàn thành bao nhiêu ngày. Một ngày được tính là hoàn thành khi bạn bấm "Ký cam kết" ở cuối bài.' },
          { selector:'#gn-grid', title:'21 ngày', text:'Bấm vào bất kỳ ngày nào để học. Không bị khoá ngày — nếu lỡ ngày nào, cứ quay lại làm bù nhẹ nhàng. Ngày có viền đậm là ngày gợi ý tiếp theo.' },
        ]);
      };
    }
  };
})();
