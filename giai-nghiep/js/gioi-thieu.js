(function(){
  window.Modules = window.Modules || {};
  // "Bắt Đầu Hành Trình" — 5 bước, đúng thứ tự ebook: (1) Nghiệp là gì → (2) 5 Trụ Cột & 3 tuần → (3) Dành cho ai / Giá trị / Nhịp thực hành
  // → (4) Lời khế ước tâm thức + ký → (5) Sẵn sàng. Chữ chép nguyên văn từ ebook (window.GN_FRONT).
  const P = (s,st)=>`<p style="font-size:17px;line-height:1.75;margin:0 0 12px;${st||''}">${esc(s)}</p>`;

  window.Modules['gioi-thieu'] = {
    title: 'Bắt Đầu Hành Trình',
    async render(container, ctx){
      const F = {}; (window.GN_FRONT||[]).forEach(f=>{ F[f.key] = gnSplitFront(f); });
      const weeks = window.GN_WEEKS || [];
      let step = 0; const STEPS = ['Nghiệp là gì?','5 Trụ Cột','Hành trình này','Lời khế ước','Sẵn sàng'];
      let cv = null;
      try{
        const { data } = await ctx.supabase.from('gn_progress').select('answers').eq('user_id', ctx.user.id).eq('day', 1).maybeSingle();
        cv = data && data.answers && data.answers.covenant;
      } catch(e){}
      if(cv) step = 0;

      const numCards = (f)=> f.items.map(it=>`<div class="eb-num"><i>${esc(it.n)}</i><div><b>${esc(it.t)}</b><div style="color:var(--ink-soft);margin-top:2px;">${esc(it.d)}</div></div></div>`).join('');

      function body(){
        if(step===0){
          const intro = F['loi-mo-dau'];
          return `
            <div class="eb-block">
              <div class="eb-badge"><b>Bước 1</b> Nên nhận thức</div>
              <h2 class="eb-title" style="margin-top:10px;">"Nghiệp" trong hành trình này là gì?</h2>
              <div class="eb-sub">Suy nghĩ + Lời nói + Hành động</div>
              <div class="eb-intro">Là những mô thức được lặp lại đủ lâu để tạo ra kết quả quen thuộc trong tiền bạc, mối quan hệ, công việc và sự nghiệp.</div>
              ${GN_SVG.loop}
              <div class="gn-notcard">
                <div class="no"><small>Không phải</small>định mệnh cố định.</div>
                <div class="no"><small>Không phải</small>sự trừng phạt.</div>
                <div class="yes"><small>Là</small>vòng lặp có thể được nhận diện và điều chỉnh.</div>
              </div>
            </div>
            <div class="eb-block">
              <div class="eb-badge"><b>Lời mở đầu</b></div>
              <h2 style="margin-top:8px;">${esc(intro.sub)}</h2>
              ${intro.intro.map(x=>P(x)).join('')}
            </div>`;
        }
        if(step===1){
          const tc = (window.GN_FRONT||[]).find(f=>f.key==='5-tru-cot');
          const pillars = []; (tc.items||[]).forEach(l=>{
            if(/^TRỤ CỘT \d/.test(l)) pillars.push({n:l.replace('TRỤ CỘT ',''),name:'',lines:[]});
            else if(pillars.length){ const p = pillars[pillars.length-1]; if(!p.name) p.name = l; else p.lines.push(l); }
          });
          return `
            <div class="eb-block">
              <div class="eb-badge"><b>Bước 2</b> Nền tảng của hành trình</div>
              <h2 class="eb-title" style="margin-top:10px;">5 Trụ Cột Năng Lượng Bản Thể</h2>
              <div class="gn-pillars">${pillars.map(p=>`
                <div class="gn-pillar">${GN_SVG.pillar(parseInt(p.n,10))}<div class="pn">TRỤ CỘT ${esc(p.n)}</div><div class="pt">${esc(p.name)}</div><div class="pd">${esc(p.lines.join(' '))}</div></div>`).join('')}
              </div>
            </div>
            <div class="eb-block">
              <h2>3 tuần — 21 ngày</h2>
              ${weeks.map((w,i)=>{
                const theme = (w.lines||[]).filter(l=>/^[A-ZÀ-Ỵ&\s]+$/.test(l) && !/^Trụ/.test(l)).join(' ');
                const desc = gnParas((w.lines||[]).filter(l=>!/^[A-ZÀ-Ỵ&\s]+$/.test(l) && !/^Trụ Cột/.test(l))).join(' ');
                const pil = (w.lines||[]).find(l=>/^Trụ Cột/.test(l))||'';
                return `<div class="gn-weekcard gn-w${i+1}" style="margin-top:${i?10:0}px;">${GN_SVG.week(i+1)}<div><div class="wn">${esc(w.name)} · NGÀY ${w.from}–${w.to} · ${esc(pil)}</div><div class="wt">${esc(theme)}</div><div class="wd">${esc(desc)}</div></div></div>`;
              }).join('')}
            </div>`;
        }
        if(step===2){
          return ['danh-cho-ai','gia-tri','nhip-thuc-hanh'].map((k,i)=>{
            const f = F[k]; if(!f) return '';
            return `<div class="eb-block">
              <div class="eb-badge"><b>${esc(f.h)}</b></div>
              <h2 class="eb-title" style="margin-top:10px;font-size:26px;">${esc(f.sub)}</h2>
              ${f.intro.map(x=>P(x,'color:var(--ink-soft);')).join('')}
              ${numCards(f)}
              ${f.outro.map(x=>P(x,'font-weight:600;color:var(--accent);')).join('')}
            </div>`;
          }).join('');
        }
        if(step===3){
          const f = F['khe-uoc'];
          const blocks = []; let inForm = false;
          (f.intro||[]).forEach(()=>{});
          return `
            <div class="eb-block">
              <div class="eb-badge"><b>Bước 4</b> Lời khế ước tâm thức</div>
              <h2 class="eb-title" style="margin-top:10px;font-size:27px;">${esc(f.sub || 'Hành Trình 21 Ngày Chuyển Hóa Bản Thể')}</h2>
              ${f.intro.filter(x=>!/^3\s?LỜI|^\d\.\s|CAM KẾT|Chữ ký|Tên của tôi/.test(x)).map(x=>P(x,'color:var(--ink-soft);')).join('')}
              <div class="eb-label">3 lời thệ ước tâm thức</div>
              ${covCards()}
            </div>
            <div class="eb-block" id="gn-covenant" style="border-left:4px solid var(--gold);">
              <div class="eb-badge"><b>Cam kết &amp; ký tên</b></div>
              <label style="display:block;font-weight:600;font-size:15px;color:var(--ink-soft);margin-top:14px;">Tên của tôi</label>
              <input id="cv-name" type="text" placeholder="Gõ tên của bạn để ký">
              <label style="display:block;font-weight:600;font-size:15px;color:var(--ink-soft);margin-top:10px;">Ngày bắt đầu hành trình</label>
              <input id="cv-date" type="date">
              <button class="btn btn-full" id="cv-sign">✍️ Ký khế ước</button>
              <div id="cv-msg" style="margin-top:10px;font-size:15px;color:var(--ink-soft);"></div>
            </div>`;
        }
        return `
          <div class="eb-hero" style="text-align:center;">
            <h1>Bạn đã sẵn sàng</h1>
            <p>Mỗi ngày chỉ cần một vòng nhỏ: nhìn rõ hơn, viết thật hơn và chọn một hành động có trách nhiệm hơn. Không cần hoàn hảo. Bạn chỉ cần trung thực. Nếu có ngày bỏ lỡ, hãy quay lại nhẹ nhàng.</p>
            <div class="btn-row"><button class="btn" id="gn-start">Bắt đầu Ngày 1 →</button></div>
          </div>`;
      }
      function covCards(){
        const f = (window.GN_FRONT||[]).find(x=>x.key==='khe-uoc'); const L = (f.items||[]).map(gnDespace);
        const out = []; let cur = null;
        for(const l of L){
          if(/^CAM KẾT|^Chữ ký|^Tên của tôi/.test(l)) break;
          if(/^\d\.\s/.test(l)){ cur = { t:l, q:[] }; out.push(cur); }
          else if(cur) cur.q.push(l);
        }
        return out.map(c=>`<div class="gn-covenant-card"><b>${esc(c.t)}</b>${esc(c.q.join(' '))}</div>`).join('');
      }

      function draw(){
        container.innerHTML = `
          <div class="page-head" style="margin-bottom:10px;">
            <span class="tag">Bắt đầu hành trình</span>
            <div style="margin-top:6px;"><span class="help-btn" id="gn-help">❓ Hướng dẫn</span></div>
          </div>
          <div class="gn-steps-label">Bước ${step+1}/${STEPS.length} · ${esc(STEPS[step])}</div>
          <div class="gn-steps" id="gn-steps">${STEPS.map((s,i)=>`<i class="${i<=step?'on':''}" data-s="${i}" style="cursor:pointer;" title="${esc(s)}"></i>`).join('')}</div>
          <div id="gn-front">${body()}</div>
          <div class="gn-nav">
            ${step>0?'<button class="btn btn-ghost" id="gn-back">← Quay lại</button>':'<span></span>'}
            ${step<STEPS.length-1?'<button class="btn btn-sm" id="gn-next">Tiếp tục →</button>':'<span></span>'}
          </div>`;
        container.querySelectorAll('[data-s]').forEach(el=>{ el.onclick = ()=>{ step = parseInt(el.getAttribute('data-s'),10); draw(); window.scrollTo(0,0); }; });
        const nx = container.querySelector('#gn-next'); if(nx) nx.onclick = ()=>{ step++; draw(); window.scrollTo(0,0); };
        const bk = container.querySelector('#gn-back'); if(bk) bk.onclick = ()=>{ step--; draw(); window.scrollTo(0,0); };
        const st = container.querySelector('#gn-start'); if(st) st.onclick = ()=>{ window.PendingGnDay = 1; location.hash = 'ngay'; };
        container.querySelector('#gn-help').onclick = ()=>{
          if(window.startPageTour) window.startPageTour([
            { selector:'#gn-steps', title:'5 bước', text:'Đi lần lượt qua 5 bước: nghiệp là gì, 5 Trụ Cột, hành trình này, ký khế ước, rồi bắt đầu Ngày 1. Bấm vào thanh để nhảy bước.' },
            { selector:'#gn-front', title:'Nội dung', text:'Đọc chậm, không vội. Đây là phần mở đầu của ebook 21 Ngày Chuyển Hóa Nghiệp.' },
          ]);
        };
        if(step===3){
          const nameEl = container.querySelector('#cv-name'), dateEl = container.querySelector('#cv-date'), msg = container.querySelector('#cv-msg'), btn = container.querySelector('#cv-sign');
          nameEl.value = (cv && cv.name) || (ctx.profile && ctx.profile.full_name) || ''; dateEl.value = (cv && cv.date) || new Date().toISOString().slice(0,10);
          if(cv){ btn.textContent = '✓ Đã ký khế ước — bấm để cập nhật'; msg.textContent = 'Bạn đã ký khế ước ngày ' + (cv.date||'') + '.'; }
          btn.onclick = async ()=>{
            if(!nameEl.value.trim()){ msg.textContent = 'Bạn gõ tên để ký nhé.'; return; }
            btn.disabled = true;
            const { error } = await gnPatchAnswers(ctx.supabase, ctx.user.id, 1, { covenant:{ name:nameEl.value.trim(), date:dateEl.value } });
            btn.disabled = false;
            if(error){ msg.textContent = '⚠️ Chưa lưu được — thử lại giúp mình.'; return; }
            cv = { name:nameEl.value.trim(), date:dateEl.value };
            if(window.gnCovenantSigned) window.gnCovenantSigned();
            msg.textContent = '✓ Đã ký khế ước. Chúc bạn một hành trình bình an.';
            btn.textContent = '✓ Đã ký khế ước — bấm để cập nhật';
          };
        }
      }
      draw();
    }
  };
})();
