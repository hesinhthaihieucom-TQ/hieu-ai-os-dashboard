(function(){
  window.Modules = window.Modules || {};
  // Hành Trình 21 Ngày — GỘP luôn phần giải thích từng loại nghiệp: mỗi ngày là 1 thẻ, bấm mở ra đọc giải thích nghiệp đó
  // (câu giải thích lấy từ ebook, ngày ebook chưa viết thì lấy từ workbook — xem explainSrc ở du-lieu-21-ngay.js) rồi bấm "Học ngày này".
  const short = (s)=>{ s = String(s||''); const m = s.match(/^.{40,160}?[.!?](\s|$)/); return m ? m[0].trim() : (s.length>150 ? s.slice(0,147)+'…' : s); };

  window.Modules['trang-chu'] = {
    title: 'Hành Trình 21 Ngày',
    async render(container, ctx){
      container.innerHTML = `<div class="loading"><div class="spinner"></div><p>Đang tải hành trình…</p></div>`;
      const days = window.GN_DAYS || [];
      const weeks = window.GN_WEEKS || [];
      const prog = await gnLoadAllProgress(ctx.supabase, ctx.user.id);
      const doneCount = days.filter(d=>prog[d.n] && prog[d.n].done_at).length;
      // Ngày gợi ý tiếp theo = ngày đầu tiên CHƯA ký cam kết (ebook: bỏ lỡ ngày nào thì quay lại nhẹ nhàng, nên KHÔNG khoá ngày).
      const next = days.find(d=>!(prog[d.n] && prog[d.n].done_at));
      const name = (ctx.profile && ctx.profile.full_name && ctx.profile.full_name.trim()) || '';
      const pct = Math.round(doneCount/21*100);
      const R = 34, C = 2*Math.PI*R;
      const signed = !!(prog[1] && prog[1].answers && prog[1].answers.covenant);

      const dayCard = (d)=>{
        const done = prog[d.n] && prog[d.n].done_at;
        const cur = next && next.n===d.n;
        return `
        <details class="gn-dayx ${done?'done':''} ${cur?'current':''}" ${cur?'open':''}>
          <summary><span class="gn-dn">${done?'✓':d.n}</span>
            <span class="gn-dt"><b>Nghiệp ${esc(d.title)}</b><span>${esc(short(d.explain))}</span></span><span class="gn-chev">▾</span></summary>
          <div class="gn-dx-body">
            ${d.explain ? `<p style="margin:0 0 8px;">${esc(d.explain)}</p>` : ''}
            ${d.pattern ? `<div class="eb-pattern"><b style="font-style:normal;">Mô thức cần quan sát:</b> ${esc(d.pattern)}</div>` : ''}
            ${d.manifest.length ? `<ul style="padding-left:20px;margin:8px 0;">${d.manifest.map(x=>`<li style="margin-bottom:5px;">${esc(x)}</li>`).join('')}</ul>` : ''}
            <button class="btn btn-sm" data-day="${d.n}" style="margin-top:10px;">${done?'Xem lại':'Học'} Ngày ${d.n} →</button>
          </div>
        </details>`;
      };
      const weekHtml = weeks.map((w,i)=>{
        const theme = (w.lines||[]).filter(l=>/^[A-ZÀ-Ỵ&\s]+$/.test(l) && !/^Trụ/.test(l)).join(' ');
        const pillar = (w.lines||[]).find(l=>/^Trụ Cột/.test(l)) || '';
        const desc = gnParas((w.lines||[]).filter(l=>!/^[A-ZÀ-Ỵ&\s]+$/.test(l) && !/^Trụ Cột/.test(l))).join(' ');
        return `
          <div class="gn-weekcard gn-w${i+1}">${GN_SVG.week(i+1)}<div><div class="wn">${esc(w.name)} · NGÀY ${w.from}–${w.to} · ${esc(pillar)}</div><div class="wt">${esc(theme)}</div><div class="wd">${esc(desc)}</div></div></div>
          ${days.filter(d=>d.n>=w.from && d.n<=w.to).map(dayCard).join('')}`;
      }).join('');

      container.innerHTML = `
        <div class="eb-hero" id="gn-summary">
          <div style="display:flex;gap:16px;align-items:center;">
            <div class="eb-ring"><svg viewBox="0 0 84 84" width="84" height="84"><circle cx="42" cy="42" r="${R}" fill="none" stroke="rgba(255,255,255,.2)" stroke-width="8"/><circle cx="42" cy="42" r="${R}" fill="none" stroke="#E7C97A" stroke-width="8" stroke-linecap="round" stroke-dasharray="${C.toFixed(1)}" stroke-dashoffset="${(C*(1-pct/100)).toFixed(1)}" transform="rotate(-90 42 42)"/></svg><span>${doneCount}/21</span></div>
            <div><h1>${name ? 'Chào '+esc(name) : 'Chào bạn'}${doneCount===0?', bắt đầu thôi':doneCount>=21?', bạn đã đi hết 21 ngày':', tiếp tục nhé'}</h1></div>
          </div>
          <p>Không cần hoàn hảo, chỉ cần trung thực. Nếu có ngày bỏ lỡ, hãy quay lại nhẹ nhàng.</p>
          ${next ? `<div class="btn-row" style="justify-content:flex-start;"><button class="btn" id="gn-continue">${doneCount===0?'Bắt đầu Ngày 1':'Tiếp tục Ngày '+next.n} — Nghiệp ${esc(next.title)} →</button></div>` :
            `<p style="margin-top:14px;">🌿 Chuyển hóa không phải là xóa hết điều cũ, mà là nhận ra sớm hơn khi mình sắp nghĩ, nói hoặc hành động theo lối cũ — rồi chọn lại.</p>`}
        </div>
        ${signed ? '' : `<div class="hint-box" id="gn-cv-hint" style="cursor:pointer;margin:0 0 14px;">✍️ Bạn chưa ký <b>Lời khế ước tâm thức</b>. Đọc phần "Bắt Đầu Hành Trình" và ký khế ước →</div>`}
        <div style="margin:0 0 14px;"><span class="help-btn" id="gn-help">❓ Hướng dẫn</span></div>
        <div class="eb-block" id="gn-gift">
          <h2 style="font-size:20px;">🎁 Quà tặng của bạn</h2>
          <p style="margin:0 0 12px;color:var(--ink-soft);font-size:16px;line-height:1.6;">Ebook 21 Ngày Chuyển Hóa Nghiệp — mở ra đọc như lật sách, có nhạc nhẹ. Workbook thực hành — tải về để in ra viết tay.</p>
          <div class="btn-row" style="justify-content:flex-start;margin-top:0;">
            <!-- Ebook đọc qua link Heyzine (lật trang + nhạc nền) theo yêu cầu chị Quỳnh 2026-11-12; bản PDF vẫn giữ làm phương án dự phòng. -->
            <a class="btn btn-sm" href="https://heyzine.com/flip-book/f8cdf33d49.html" target="_blank" rel="noopener" style="text-decoration:none;">📖 Đọc Ebook (có nhạc)</a>
            <button class="btn btn-ghost btn-sm" data-dl="workbook">📝 Tải Workbook (Word)</button>
            <button class="btn btn-ghost btn-sm" data-dl="ebook">📘 Tải Ebook PDF</button>
          </div>
          <div id="gn-dl-msg" style="margin-top:10px;font-size:15px;color:var(--ink-soft);"></div>
        </div>
        <div id="gn-weeks">${weekHtml}</div>`;

      const open = (n)=>{ window.PendingGnDay = n; location.hash = 'ngay'; };
      container.querySelectorAll('[data-day]').forEach(el=>{ el.onclick = ()=>open(parseInt(el.getAttribute('data-day'),10)); });
      const cont = container.querySelector('#gn-continue'); if(cont) cont.onclick = ()=>open(next.n);
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
          { selector:'#gn-summary', title:'Tiến độ của bạn', text:'Vòng tròn cho biết bạn đã hoàn thành bao nhiêu ngày. Một ngày được tính là hoàn thành khi bạn bấm "Tôi cam kết" ở cuối bài.' },
          { selector:'#gn-gift', title:'Quà tặng', text:'Bấm "Đọc Ebook" để lật sách và nghe nhạc nhẹ như trên Heyzine; Workbook Word tải về để in ra viết tay.' },
          { selector:'#gn-weeks', title:'21 ngày, mỗi ngày một loại nghiệp', text:'Bấm vào từng ngày để đọc giải thích loại nghiệp đó, rồi bấm "Học ngày này". Không bị khoá ngày — lỡ ngày nào cứ quay lại làm bù nhẹ nhàng.' },
        ]);
      };
    }
  };
})();
