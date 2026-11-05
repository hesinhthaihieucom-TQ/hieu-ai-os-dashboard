(function(){
  window.Modules = window.Modules || {};

  // Nội dung đọc của ngày — chép nguyên văn ebook, đúng thứ tự và tên mục trong ebook. Khối nào trống thì bỏ qua.
  const P = (s)=>`<p style="font-size:16.5px;line-height:1.7;margin:0 0 10px;">${esc(s)}</p>`;
  const H = (s)=>`<h3 style="margin:18px 0 8px;">${esc(s)}</h3>`;

  window.Modules['ngay'] = {
    title: 'Bài Học Hôm Nay',
    async render(container, ctx){
      const days = window.GN_DAYS || [];
      let n = window.PendingGnDay;
      window.PendingGnDay = null;
      // Không có tín hiệu mở ngày mới (vd F5 hoặc vào lại từ sidebar) → quay về ngày đang xem gần nhất.
      if(!n){ try{ n = parseInt(sessionStorage.getItem('gn_last_day'),10); }catch(e){} }
      if(!n || n<1 || n>21) n = 1;
      try{ sessionStorage.setItem('gn_last_day', String(n)); }catch(e){}
      const d = days[n-1];
      if(!d){ container.innerHTML = `<div class="card">Không tìm thấy nội dung ngày này.</div>`; return; }

      container.innerHTML = `<div class="loading"><div class="spinner"></div><p>Đang tải…</p></div>`;
      let row = null;
      try{
        const { data } = await ctx.supabase.from('gn_progress').select('answers,checklist,done_at').eq('user_id', ctx.user.id).eq('day', n).maybeSingle();
        row = data;
      } catch(e){}
      const state = {
        answers: Object.assign({ ex:[], jr:[], sign:{} }, (row && row.answers) || {}),
        checklist: (row && row.checklist && row.checklist.length) ? row.checklist.slice() : d.checklist.map(()=>false),
        done_at: row && row.done_at,
      };
      ['ex','jr'].forEach(k=>{ state.answers[k] = state.answers[k] || []; });

      const wk = (d.n<=7?1:d.n<=14?2:3);
      const P = (x)=>`<p style="font-size:16.5px;line-height:1.75;margin:0 0 10px;">${esc(x)}</p>`;
      const parts = [];
      // --- Bố cục theo ebook: badge → tên → intro → mô thức → biểu hiện → ví dụ → hệ quả → bản chất → gốc rễ → nhận thức mới → ứng dụng → thực hành
      parts.push(`<div class="eb-badge"><b>${String(n).padStart(2,'0')}</b> Nhận diện nghiệp cũ</div>
        <h1 class="eb-title">Giải nghiệp ${esc(d.title)}</h1>
        <div class="eb-sub">Quan sát · Hiểu · Chuyển hóa</div>`);
      if(d.explain) parts.push(`<div class="eb-label">Nghiệp ${esc(d.title)} là gì?</div><div class="eb-intro">${esc(d.explain)}</div>`);
      if(d.pattern) parts.push(`<div class="eb-label">Mô thức cần quan sát</div><div class="eb-pattern">${esc(d.pattern)}</div>`);
      if(d.manifest.length) parts.push(`<div class="eb-label">Biểu hiện trong đời sống</div>${d.manifest.map((x,i)=>`<div class="eb-num"><i>${String(i+1).padStart(2,'0')}</i><div>${esc(x)}</div></div>`).join('')}`);
      const deep = [];
      d.ex.forEach((x,i)=>{ if(x) deep.push(`<div class="eb-ex"><div class="eb-card-label">Ví dụ thực tế ${i+1}</div>${esc(x)}</div>`); });
      if(d.conseq) deep.push(`<div class="eb-conseq"><div class="eb-card-label">⚡ Hệ quả của nghiệp</div>${esc(d.conseq)}</div>`);
      if(d.essence) deep.push(`<div class="eb-essence"><div class="eb-card-label">🔍 Bản chất tâm thức</div>${esc(d.essence)}</div>`);
      if(d.essenceQuote) deep.push(`<div class="eb-quote-or">“${esc(d.essenceQuote)}”</div>`);
      if(d.root.length) deep.push(`<div class="eb-label">Gốc rễ &amp; phân tích sâu</div><div class="eb-essence"><div class="eb-card-label">🌱 Tại sao mô thức này tồn tại?</div>${d.root.map(P).join('')}</div>`);
      if(d.awTitle || d.aw.length) deep.push(`<div class="eb-label">Nhận thức mới</div><div class="eb-dark"><b>Góc nhìn cần cài lại</b>${esc(d.awTitle||'')}${d.aw.map(x=>`<div style="margin-top:8px;font-size:16.5px;opacity:.95;">${esc(x)}</div>`).join('')}</div>`);
      if(d.apply.length) deep.push(`<div class="eb-label">Ứng dụng vào đời sống</div><div class="eb-apply">${d.apply.map((a,i)=>`<div><b>${['💰','💚','🌿'][i]||''} ${esc(a[0])}</b>${esc(a[1])}</div>`).join('')}</div>`);
      if(d.practice) deep.push(`<div class="eb-label">Thực hành chuyển nghiệp</div><div class="eb-pattern" style="font-style:normal;">${esc(d.practice)}</div>`);
      if(deep.length) parts.push(`<details class="kt-section" style="margin-top:18px;" open><summary class="kt-summary">Nội dung đầy đủ của ngày ${n}</summary><div style="margin-top:6px;">${deep.join('')}</div></details>`);

      const upsell = (n===21 && window.GN_UPSELL && window.GN_UPSELL.length)
        ? `<details class="kt-section" style="margin-top:16px;"><summary class="kt-summary">${esc(window.GN_UPSELL[0])}</summary><div style="margin-top:8px;">${gnParas(window.GN_UPSELL.slice(1)).map(P).join('')}</div></details>` : '';

      container.innerHTML = `
        <div class="gn-jump" id="gn-jump">
          <a href="#" data-go="gn-read">📖 Đọc</a><a href="#" data-go="gn-act">⚡ Hành động</a><a href="#" data-go="gn-ex">✍️ Bài tập</a><a href="#" data-go="gn-jr">📔 Nhật ký</a><a href="#" data-go="gn-commit">🖊️ Cam kết</a>
        </div>
        <div style="margin:0 0 10px;display:flex;gap:8px;flex-wrap:wrap;"><span class="help-btn" id="gn-home-top">← Hành trình</span><span class="help-btn" id="gn-help">❓ Hướng dẫn</span></div>

        <div class="eb-block" id="gn-read">${parts.join('')}</div>

        <div id="gn-act">
        ${d.action ? `<div class="gn-action"><b>⚡ Bước hành động hôm nay</b>${esc(d.action)}</div>` : ''}
        ${d.proof ? `<div class="gn-action" style="margin-top:10px;"><b>⚡ Hành động thực chứng hôm nay</b>${esc(d.proof)}</div>` : ''}
        </div>

        <div class="eb-block" id="gn-ex" style="margin-top:16px;">
          <h2>Bài tập áp dụng</h2>
          ${d.exercises.map((e,i)=>`
            <div class="gn-ex">
              <div class="gn-ex-t">Bài tập ${i+1} — ${esc(e.t)}</div>
              <div class="gn-ex-d">${esc(e.d)}</div>
              <textarea data-k="ex" data-i="${i}" placeholder="Ghi chú của tôi…">${esc(state.answers.ex[i]||'')}</textarea>
            </div>`).join('')}
        </div>

        <div class="eb-block" id="gn-jr">
          <h2>Gợi ý suy ngẫm — nhật ký hôm nay</h2>
          ${d.journal.map((q,i)=>`
            <div class="gn-q">${i+1}. ${esc(q)}</div>
            <textarea data-k="jr" data-i="${i}" placeholder="Viết thật, không cần hay…">${esc(state.answers.jr[i]||'')}</textarea>`).join('')}
        </div>

        <div class="eb-block" id="gn-check">
          <h2>Danh sách kiểm tra tiến độ — Ngày ${String(n).padStart(2,'0')}</h2>
          ${d.checklist.map((c,i)=>`<label class="gn-check"><input type="checkbox" data-ci="${i}" ${state.checklist[i]?'checked':''}><span>${esc(c)}</span></label>`).join('')}
        </div>

        <div class="eb-block" id="gn-commit" style="border-left:4px solid var(--gold);">
          <h2>Cam kết hôm nay</h2>
          <div class="gn-commit">${esc(d.commit)}</div>
          <label style="display:block;font-weight:600;font-size:15px;color:var(--ink-soft);margin-top:14px;">Chữ ký</label>
          <input id="gn-sign-name" type="text" placeholder="Gõ tên của bạn để ký" value="${esc((state.answers.sign&&state.answers.sign.name) || ((ctx.profile&&ctx.profile.full_name)||''))}">
          <label style="display:block;font-weight:600;font-size:15px;color:var(--ink-soft);margin-top:10px;">Ngày</label>
          <input id="gn-sign-date" type="date" value="${esc((state.answers.sign&&state.answers.sign.date) || new Date().toISOString().slice(0,10))}">
          <button class="btn btn-full" id="gn-sign">${state.done_at?'✓ Đã ký cam kết — bấm để bỏ ký':'✍️ Tôi cam kết — hoàn thành Ngày '+n}</button>
          ${state.done_at?`<div class="hint-box">Ngày ${n} đã hoàn thành. Cảm ơn bạn đã trung thực với chính mình.</div>`:''}
        </div>
        ${upsell}

        <div class="gn-saved" id="gn-saved"></div>
        <div class="gn-nav">
          ${n>1?`<button class="btn btn-ghost" id="gn-prev">← Ngày ${n-1}</button>`:'<span></span>'}
          <button class="btn btn-ghost" id="gn-home">Về hành trình</button>
          ${n<21?`<button class="btn btn-sm" id="gn-next">Ngày ${n+1} →</button>`:'<span></span>'}
        </div>`;

      container.querySelectorAll('[data-go]').forEach(a=>{ a.onclick = (e)=>{ e.preventDefault(); const t = container.querySelector('#'+a.getAttribute('data-go')); if(t) t.scrollIntoView({behavior:'smooth',block:'start'}); }; });
      container.querySelector('#gn-home-top').onclick = ()=>{ location.hash = 'trang-chu'; };

      const savedEl = container.querySelector('#gn-saved');
      let saving = false, dirty = false;
      async function save(){
        if(saving){ dirty = true; return; }
        saving = true; savedEl.textContent = 'Đang lưu…';
        const { error } = await ctx.supabase.from('gn_progress').upsert({
          user_id: ctx.user.id, day: n, answers: state.answers, checklist: state.checklist,
          done_at: state.done_at || null, updated_at: new Date().toISOString(),
        }, { onConflict:'user_id,day' });
        saving = false;
        savedEl.textContent = error ? '⚠️ Chưa lưu được — kiểm tra mạng rồi gõ lại 1 chữ để thử lại.' : '✓ Đã lưu';
        if(dirty){ dirty = false; save(); }
      }
      const saveSoon = debounce(save, 800);

      container.querySelectorAll('textarea[data-k]').forEach(t=>{
        t.oninput = ()=>{ state.answers[t.getAttribute('data-k')][parseInt(t.getAttribute('data-i'),10)] = t.value; saveSoon(); };
      });
      container.querySelectorAll('input[data-ci]').forEach(c=>{
        c.onchange = ()=>{ state.checklist[parseInt(c.getAttribute('data-ci'),10)] = c.checked; save(); };
      });
      container.querySelector('#gn-sign').onclick = async ()=>{
        state.answers.sign = { name: container.querySelector('#gn-sign-name').value.trim(), date: container.querySelector('#gn-sign-date').value };
        state.done_at = state.done_at ? null : new Date().toISOString();
        await save();
        window.PendingGnDay = n; window.Modules['ngay'].render(container, ctx);
      };
      const go = (m)=>{ window.PendingGnDay = m; window.Modules['ngay'].render(container, ctx); window.scrollTo(0,0); };
      const prev = container.querySelector('#gn-prev'); if(prev) prev.onclick = ()=>go(n-1);
      const next = container.querySelector('#gn-next'); if(next) next.onclick = ()=>go(n+1);
      container.querySelector('#gn-home').onclick = ()=>{ location.hash = 'trang-chu'; };
      container.querySelector('#gn-help').onclick = ()=>{
        if(!window.startPageTour) return;
        window.startPageTour([
          { selector:'#gn-read', title:'Đọc nội dung hôm nay', text:'Đọc chậm, không vội kết luận đúng sai về bản thân. Bấm "Đọc thêm" để xem đầy đủ biểu hiện, ví dụ, gốc rễ và ứng dụng.' },
          { selector:'#gn-ex', title:'Bài tập áp dụng', text:'Làm từng bài tập rồi ghi chú vào ô bên dưới. Tự động lưu — thoát ra vào lại vẫn còn.' },
          { selector:'#gn-jr', title:'Nhật ký 3 câu hỏi', text:'Viết vài dòng đủ thật, không cần hay, không cần hoàn hảo.' },
          { selector:'#gn-check', title:'Checklist', text:'Tick từng việc khi làm xong.' },
          { selector:'#gn-commit', title:'Ký cam kết', text:'Bấm nút này để hoàn thành ngày — ô ngày này trên Hành Trình sẽ hiện dấu ✓.' },
        ]);
      };
    }
  };
})();
