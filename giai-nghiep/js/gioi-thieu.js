(function(){
  window.Modules = window.Modules || {};
  // Phần mở đầu của ebook (lời mở đầu, 5 trụ cột, dành cho ai, giá trị, nhịp thực hành, lời khế ước) — chép nguyên văn.
  window.Modules['gioi-thieu'] = {
    title: 'Giới Thiệu Hành Trình',
    async render(container, ctx){
      const front = window.GN_FRONT || [];
      container.innerHTML = `
        <div class="page-head">
          <span class="tag">Giới thiệu</span>
          <h1>21 Ngày Chuyển Hóa Nghiệp</h1>
          <p>Đọc phần mở đầu trước khi bắt đầu Ngày 1.</p>
          <div style="margin-top:10px;"><span class="help-btn" id="gn-help">❓ Hướng dẫn</span></div>
        </div>
        <div id="gn-front">
        ${front.map((f,i)=>`
          <details class="kt-section" ${(i<3||f.key==='khe-uoc')?'open':''}>
            <summary class="kt-summary">${esc(f.h)}</summary>
            <div style="margin-top:8px;">${gnParas(f.items).map(p=>/^0\d\s/.test(p)||/^TRỤ CỘT/.test(p)||/^\d\.\s/.test(p)?`<p style="font-size:16.5px;line-height:1.7;margin:12px 0 2px;"><b>${esc(p)}</b></p>`:`<p style="font-size:16.5px;line-height:1.7;margin:0 0 8px;">${esc(p)}</p>`).join('')}</div>
          </details>`).join('')}
        </div>
        <div class="section highlight" id="gn-covenant" style="margin-top:16px;">
          <h3>Cam kết &amp; ký tên</h3>
          <p style="margin:0;font-size:16.5px;line-height:1.7;">Sau khi đọc Lời khế ước tâm thức ở trên, bạn ký tên để bắt đầu hành trình.</p>
          <label style="display:block;font-weight:600;font-size:15px;color:var(--ink-soft);margin-top:12px;">Tên của tôi</label>
          <input id="cv-name" type="text" placeholder="Gõ tên của bạn để ký">
          <label style="display:block;font-weight:600;font-size:15px;color:var(--ink-soft);margin-top:10px;">Ngày bắt đầu hành trình</label>
          <input id="cv-date" type="date">
          <button class="btn btn-full" id="cv-sign">✍️ Ký khế ước và bắt đầu</button>
          <div id="cv-msg" style="margin-top:10px;font-size:15px;color:var(--ink-soft);"></div>
        </div>
        <div class="btn-row"><button class="btn btn-ghost" id="gn-go">Đến Hành Trình →</button></div>`;
      const nameEl = container.querySelector('#cv-name'), dateEl = container.querySelector('#cv-date'), msg = container.querySelector('#cv-msg'), btn = container.querySelector('#cv-sign');
      nameEl.value = (ctx.profile && ctx.profile.full_name) || ''; dateEl.value = new Date().toISOString().slice(0,10);
      try{
        const { data } = await ctx.supabase.from('gn_progress').select('answers').eq('user_id', ctx.user.id).eq('day', 1).maybeSingle();
        const cv = data && data.answers && data.answers.covenant;
        if(cv){ nameEl.value = cv.name || nameEl.value; dateEl.value = cv.date || dateEl.value; btn.textContent = '✓ Đã ký khế ước — bấm để cập nhật'; msg.textContent = 'Bạn đã ký khế ước ngày ' + (cv.date||'') + '.'; }
      } catch(e){}
      btn.onclick = async ()=>{
        if(!nameEl.value.trim()){ msg.textContent = 'Bạn gõ tên để ký nhé.'; return; }
        btn.disabled = true;
        const { error } = await gnPatchAnswers(ctx.supabase, ctx.user.id, 1, { covenant:{ name:nameEl.value.trim(), date:dateEl.value } });
        btn.disabled = false;
        msg.textContent = error ? '⚠️ Chưa lưu được — thử lại giúp mình.' : '✓ Đã ký khế ước. Chúc bạn một hành trình bình an.';
        if(!error) btn.textContent = '✓ Đã ký khế ước — bấm để cập nhật';
      };
      container.querySelector('#gn-go').onclick = ()=>{ location.hash = 'trang-chu'; };
      container.querySelector('#gn-help').onclick = ()=>{
        if(window.startPageTour) window.startPageTour([{ selector:'#gn-front', title:'Phần mở đầu', text:'Giải thích nghiệp là gì, 5 Trụ Cột và lời khế ước. Bấm vào từng mục để mở ra đọc.' },{ selector:'#gn-covenant', title:'Ký khế ước', text:'Gõ tên, chọn ngày bắt đầu rồi bấm Ký để cam kết bắt đầu hành trình.' }]);
      };
    }
  };
})();
