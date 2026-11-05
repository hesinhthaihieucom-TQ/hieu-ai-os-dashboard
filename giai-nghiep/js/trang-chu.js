(function(){
  window.Modules = window.Modules || {};
  window.Modules['trang-chu'] = {
    title: 'Hành Trình 21 Ngày',
    async render(container, ctx){
      container.innerHTML = `<div class="loading"><div class="spinner"></div><p>Đang tải hành trình…</p></div>`;
      const days = window.GN_DAYS || [];
      const weeks = window.GN_WEEKS || [];
      const prog = await gnLoadAllProgress(ctx.supabase, ctx.user.id);
      const doneCount = days.filter(d=>prog[d.n] && prog[d.n].done_at).length;
      // Ngày gợi ý tiếp theo = ngày đầu tiên CHƯA ký cam kết (ebook: bỏ lỡ ngày nào thì quay lại nhẹ nhàng,
      // nên KHÔNG khoá ngày — chỉ gợi ý).
      const next = days.find(d=>!(prog[d.n] && prog[d.n].done_at));
      const name = (ctx.profile && ctx.profile.full_name && ctx.profile.full_name.trim()) || '';
      const pct = Math.round(doneCount/21*100);
      const cell = (d)=>{
        const done = prog[d.n] && prog[d.n].done_at;
        const cur = next && next.n===d.n;
        return `<div class="gn-day ${done?'done':''} ${cur?'current':''}" data-day="${d.n}"><div class="n">NGÀY ${String(d.n).padStart(2,'0')}</div><div class="t">${esc(d.title)}</div></div>`;
      };
      const weekHtml = weeks.map(w=>{
        const theme = (w.lines||[]).filter(l=>/^[A-ZÀ-Ỵ&\s]+$/.test(l) && !/^Trụ/.test(l)).join(' ');
        const pillar = (w.lines||[]).find(l=>/^Trụ Cột/.test(l)) || '';
        const desc = gnParas((w.lines||[]).filter(l=>!/^[A-ZÀ-Ỵ&\s]+$/.test(l) && !/^Trụ Cột/.test(l))).join(' ');
        return `
          <div class="gn-week">
            <div class="gn-week-h"><b>${esc(w.name)}</b> · ${esc(theme)} <span>${esc(pillar)}</span></div>
            ${desc?`<div class="gn-week-d">${esc(desc)}</div>`:''}
          </div>
          <div class="gn-grid">${days.filter(d=>d.n>=w.from && d.n<=w.to).map(cell).join('')}</div>`;
      }).join('');

      container.innerHTML = `
        <div class="page-head">
          <span class="tag">Hành trình</span>
          <h1>${name ? 'Chào '+esc(name)+',' : 'Chào bạn,'} ${doneCount===0?'bắt đầu thôi':doneCount>=21?'bạn đã đi hết 21 ngày':'tiếp tục nhé'}</h1>
          <p>Không cần hoàn hảo, chỉ cần trung thực. Nếu có ngày bỏ lỡ, hãy quay lại nhẹ nhàng.</p>
          <div style="margin-top:10px;display:flex;gap:8px;flex-wrap:wrap;"><span class="help-btn" id="gn-help">❓ Hướng dẫn</span><span class="help-btn" id="gn-intro">📖 Giới thiệu hành trình</span></div>
        </div>
        <div class="card" id="gn-summary">
          <div style="display:flex;justify-content:space-between;align-items:baseline;gap:10px;flex-wrap:wrap;">
            <b style="font-size:18px;">Đã hoàn thành ${doneCount}/21 ngày</b><span style="color:var(--ink-soft);">${pct}%</span>
          </div>
          <div class="gn-progress"><i style="width:${pct}%"></i></div>
          ${next ? `<button class="btn btn-full" id="gn-continue">${doneCount===0?'Bắt đầu Ngày 1':'Tiếp tục Ngày '+next.n} — ${esc(next.title)} →</button>` :
            `<div class="hint-box">🌿 Bạn đã khép lại 21 ngày. Chuyển hóa không phải là xóa hết điều cũ, mà là nhận ra sớm hơn khi mình sắp nghĩ, nói hoặc hành động theo lối cũ — rồi chọn lại.</div>`}
        </div>
        ${(prog[1] && prog[1].answers && prog[1].answers.covenant) ? '' : `<div class="hint-box" id="gn-cv-hint" style="cursor:pointer;margin-bottom:12px;">✍️ Bạn chưa ký <b>Lời khế ước tâm thức</b>. Đọc và ký khế ước trước khi bắt đầu Ngày 1 →</div>`}
        <div class="section" id="gn-gift" style="margin-top:16px;">
          <h3>🎁 Quà tặng của bạn</h3>
          <p style="margin:0 0 12px;color:var(--ink-soft);font-size:16px;line-height:1.6;">Ebook 21 Ngày Chuyển Hóa Nghiệp và Workbook thực hành — tải về để đọc hoặc in ra viết tay.</p>
          <div class="btn-row" style="justify-content:flex-start;margin-top:0;">
            <button class="btn btn-sm" data-dl="ebook">📘 Tải Ebook (PDF)</button>
            <button class="btn btn-ghost btn-sm" data-dl="workbook">📝 Tải Workbook (Word)</button>
          </div>
          <div id="gn-dl-msg" style="margin-top:10px;font-size:15px;color:var(--ink-soft);"></div>
        </div>
        <div id="gn-weeks">${weekHtml}</div>`;

      const open = (n)=>{ window.PendingGnDay = n; location.hash = 'ngay'; };
      container.querySelectorAll('.gn-day').forEach(el=>{ el.onclick = ()=>open(parseInt(el.getAttribute('data-day'),10)); });
      const cont = container.querySelector('#gn-continue'); if(cont) cont.onclick = ()=>open(next.n);
      container.querySelector('#gn-intro').onclick = ()=>{ location.hash = 'gioi-thieu'; };
      const cvh = container.querySelector('#gn-cv-hint'); if(cvh) cvh.onclick = ()=>{ location.hash = 'gioi-thieu'; };
      container.querySelectorAll('[data-dl]').forEach(btn=>{
        btn.onclick = async ()=>{
          const msg = container.querySelector('#gn-dl-msg');
          const old = btn.textContent; btn.disabled = true; btn.textContent = 'Đang tải…'; msg.textContent = '';
          try{
            const { data:{ session } } = await ctx.supabase.auth.getSession();
            const resp = await fetch('api/gn-tai-lieu?f='+btn.getAttribute('data-dl'), { headers:{ Authorization:'Bearer '+(session&&session.access_token) } });
            if(!resp.ok){ const j = await resp.json().catch(()=>({})); throw new Error(j.error || 'Không tải được.'); }
            const blob = await resp.blob();
            const m = /filename="([^"]+)"/.exec(resp.headers.get('Content-Disposition') || '');
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob); a.download = m ? m[1] : 'tai-lieu';
            document.body.appendChild(a); a.click(); a.remove();
            setTimeout(()=>URL.revokeObjectURL(a.href), 4000);
          } catch(e){ msg.textContent = '⚠️ ' + e.message; }
          btn.disabled = false; btn.textContent = old;
        };
      });
      container.querySelector('#gn-help').onclick = ()=>{
        if(!window.startPageTour) return;
        window.startPageTour([
          { selector:'#gn-summary', title:'Tiến độ của bạn', text:'Thanh này cho biết bạn đã hoàn thành bao nhiêu ngày. Một ngày được tính là hoàn thành khi bạn bấm "Ký cam kết" ở cuối bài.' },
          { selector:'#gn-gift', title:'Quà tặng', text:'Tải Ebook PDF và Workbook Word về máy để đọc hoặc in ra viết tay.' },
          { selector:'#gn-weeks', title:'21 ngày chia 3 tuần', text:'Bấm vào bất kỳ ngày nào để học. Không bị khoá ngày — nếu lỡ ngày nào, cứ quay lại làm bù nhẹ nhàng. Ngày có viền đậm là ngày gợi ý tiếp theo.' },
        ]);
      };
    }
  };
})();
