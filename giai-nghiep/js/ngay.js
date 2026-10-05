(function(){
  window.Modules = window.Modules || {};

  // Khối "Tổng kết tuần" (ebook có trang này sau ngày 7 và ngày 14) — 4 ô viết tự do.
  const WEEK_RECAP = {
    7:  { title:'Tổng kết Tuần 1 (Ngày 1–7)' },
    14: { title:'Tổng kết Tuần 2 (Ngày 8–14)' },
  };
  const WEEK_PROMPTS = ['Điều tôi đã nhận ra', 'Mô thức tôi đã bớt lặp', 'Khoảnh khắc tôi chọn khác', 'Tôi muốn tiếp tục điều gì'];

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
        answers: Object.assign({ ex:['','',''], jr:['','',''], wk:['','','',''] }, (row && row.answers) || {}),
        checklist: (row && row.checklist && row.checklist.length) ? row.checklist.slice() : d.checklist.map(()=>false),
        done_at: row && row.done_at,
      };
      ['ex','jr'].forEach(k=>{ while(state.answers[k].length<3) state.answers[k].push(''); });
      while(state.answers.wk.length<4) state.answers.wk.push('');

      const deep = [];
      if(d.manifest && d.manifest.length) deep.push(`<h3 style="margin:16px 0 8px;">Biểu hiện trong đời sống</h3><ul style="padding-left:20px;line-height:1.7;font-size:16.5px;">${d.manifest.map(x=>`<li style="margin-bottom:6px;">${esc(x)}</li>`).join('')}</ul>`);
      if(d.root && d.root.length) deep.push(`<h3 style="margin:18px 0 8px;">Vì sao mô thức này tồn tại?</h3>${d.rootQuote?`<div class="gn-quote" style="font-size:17px;">${esc(d.rootQuote)}</div>`:''}${d.root.map(x=>`<p style="font-size:16.5px;line-height:1.7;margin:0 0 10px;">${esc(x)}</p>`).join('')}`);
      if(d.awTitle) deep.push(`<h3 style="margin:18px 0 8px;">Nhận thức mới</h3><p style="font-size:17px;line-height:1.7;font-weight:600;margin:0 0 8px;">${esc(d.awTitle)}</p>${(d.aw||[]).map(x=>`<p style="font-size:16.5px;line-height:1.7;margin:0 0 10px;">${esc(x)}</p>`).join('')}`);
      if(d.apply && d.apply.length) deep.push(`<h3 style="margin:18px 0 8px;">Ứng dụng vào đời sống</h3><div class="gn-apply">${d.apply.map(a=>`<div><b>${esc(a[0])}</b>${esc(a[1])}</div>`).join('')}</div>`);
      if(d.practice) deep.push(`<h3 style="margin:18px 0 8px;">Thực hành chuyển nghiệp</h3><p style="font-size:16.5px;line-height:1.7;margin:0;">${esc(d.practice)}</p>`);
      const recap = WEEK_RECAP[n];

      container.innerHTML = `
        <div class="page-head">
          <span class="tag">Ngày ${String(n).padStart(2,'0')} · Nhận diện nghiệp cũ</span>
          <h1>Giải nghiệp ${esc(d.title)}</h1>
          <div style="margin-top:10px;"><span class="help-btn" id="gn-help">❓ Hướng dẫn</span></div>
        </div>

        <div class="section" id="gn-read">
          <h3>Hôm nay</h3>
          <div class="body" style="white-space:normal;">${esc(d.intro || d.summary)}</div>
          ${d.pattern ? `<p style="font-size:16.5px;line-height:1.7;margin:12px 0 0;"><b>Mô thức cần quan sát:</b> ${esc(d.pattern)}</p>` : ''}
          <div class="gn-quote">${esc(d.quote)}</div>
          ${deep.length ? `<details class="kt-section"><summary class="kt-summary">Đọc thêm — hiểu sâu mô thức này</summary><div style="margin-top:6px;">${deep.join('')}</div></details>` : ''}
        </div>

        ${d.action ? `<div class="gn-action" id="gn-action"><b>⚡ Bước hành động hôm nay</b>${esc(d.action)}</div>` : ''}

        <div class="section" id="gn-ex" style="margin-top:16px;">
          <h3>Bài tập áp dụng</h3>
          ${d.exercises.map((e,i)=>`
            <div class="gn-ex">
              <div class="gn-ex-t">Bài tập ${i+1} — ${esc(e.t)}</div>
              <div class="gn-ex-d">${esc(e.d)}</div>
              <textarea data-k="ex" data-i="${i}" placeholder="Ghi chú của tôi…">${esc(state.answers.ex[i]||'')}</textarea>
            </div>`).join('')}
        </div>

        <div class="section" id="gn-jr">
          <h3>Gợi ý suy ngẫm — nhật ký hôm nay</h3>
          ${d.journal.map((q,i)=>`
            <div class="gn-q">${i+1}. ${esc(q)}</div>
            <textarea data-k="jr" data-i="${i}" placeholder="Viết thật, không cần hay…">${esc(state.answers.jr[i]||'')}</textarea>`).join('')}
        </div>

        ${recap ? `
        <div class="section" id="gn-wk">
          <h3>${esc(recap.title)}</h3>
          <p style="color:var(--ink-soft);font-size:16px;margin:0;">Nhìn lại không tự trách, ghi nhận không phô trương.</p>
          ${WEEK_PROMPTS.map((q,i)=>`<div class="gn-q">${esc(q)}</div><textarea data-k="wk" data-i="${i}" placeholder="…">${esc(state.answers.wk[i]||'')}</textarea>`).join('')}
        </div>` : ''}

        <div class="section" id="gn-check">
          <h3>Danh sách kiểm tra tiến độ</h3>
          ${d.checklist.map((c,i)=>`<label class="gn-check"><input type="checkbox" data-ci="${i}" ${state.checklist[i]?'checked':''}><span>${esc(c)}</span></label>`).join('')}
        </div>

        <div class="section highlight" id="gn-commit">
          <h3>Cam kết hôm nay</h3>
          <div class="gn-commit">${esc(d.commit)}</div>
          <button class="btn btn-full" id="gn-sign">${state.done_at?'✓ Đã ký cam kết — bấm để bỏ ký':'✍️ Tôi cam kết — hoàn thành Ngày '+n}</button>
          ${state.done_at?`<div class="hint-box">Ngày ${n} đã hoàn thành. Cảm ơn bạn đã trung thực với chính mình.</div>`:''}
        </div>

        <div class="gn-saved" id="gn-saved"></div>
        <div class="gn-nav">
          ${n>1?`<button class="btn btn-ghost" id="gn-prev">← Ngày ${n-1}</button>`:'<span></span>'}
          <button class="btn btn-ghost" id="gn-home">Về hành trình</button>
          ${n<21?`<button class="btn btn-sm" id="gn-next">Ngày ${n+1} →</button>`:'<span></span>'}
        </div>`;

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
        const steps = [
          { selector:'#gn-read', title:'Đọc nội dung hôm nay', text:'Đọc chậm, không vội kết luận đúng sai về bản thân. Bấm "Đọc thêm" nếu muốn hiểu sâu hơn.' },
          { selector:'#gn-ex', title:'Bài tập áp dụng', text:'Làm từng bài tập rồi ghi chú vào ô bên dưới. Tự động lưu — thoát ra vào lại vẫn còn.' },
          { selector:'#gn-jr', title:'Nhật ký 3 câu hỏi', text:'Viết vài dòng đủ thật, không cần hay, không cần hoàn hảo.' },
          { selector:'#gn-check', title:'Checklist', text:'Tick từng việc khi làm xong.' },
          { selector:'#gn-commit', title:'Ký cam kết', text:'Bấm nút này để hoàn thành ngày — ô ngày này trên Hành Trình sẽ hiện dấu ✓.' },
        ];
        window.startPageTour(steps);
      };
    }
  };
})();
