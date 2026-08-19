(function(){
const STEPS = [
  { key:'platform', title:'Nền tảng chính bạn đang dùng', type:'choice', options:['Facebook','TikTok'] },
  { key:'anh_dai_dien', title:'Ảnh đại diện', type:'image', helper:'Chụp màn hình ảnh đại diện hiện tại trên kênh của bạn.' },
  { key:'anh_bia', title:'Ảnh bìa', type:'image', helper:'Chụp màn hình ảnh bìa hiện tại trên kênh của bạn.' },
  { key:'profile_day_du', title:'Profile đầy đủ', type:'image', multi:true, helper:'Cần đủ 2 ảnh: 1 ảnh phần giới thiệu ngắn ở đầu trang, 1 ảnh phần công việc/liên kết/highlight bên dưới — giống 2 ảnh mẫu bên dưới.', hasExample:true },
  { key:'bio', title:'Bio', type:'text', helper:'Copy nguyên văn bio hiện tại của bạn vào đây.' },
  { key:'bai_ghim', title:'Bài ghim', type:'image', helper:'Chụp màn hình bài ghim hiện tại trên kênh (nếu có).' },
];

function render(container, ctx){
  const state = {
    screen:'loading', qIndex:0, answers:{ platform:'Facebook' }, positioning:null, quickContext:'',
    result:null, error:null, submitting:false, coverPromptCopied:false,
  };

  function draw(){ container.innerHTML = html(); bind(); }

  async function boot(){
    draw();
    const { data: pos } = await ctx.supabase.from('positioning_results').select('*').eq('user_id', ctx.user.id).maybeSingle();
    state.positioning = (pos && pos.luot1) ? pos : null;

    const { data: audit } = await ctx.supabase.from('channel_audits').select('*').eq('user_id', ctx.user.id).order('created_at', { ascending:false }).limit(1).maybeSingle();
    if(audit){ state.auditId = audit.id; state.answers = { ...state.answers, ...(audit.input||{}) }; state.result = audit.result; state.screen='result'; }
    else state.screen='wizard';
    draw();
  }

  function html(){
    if(state.screen==='loading') return `<div class="loading"><div class="spinner"></div><p>Đang tải…</p></div>`;
    if(state.screen==='wizard') return wizardHtml();
    if(state.screen==='submitting') return `<div class="loading">
      ${state.error ? '' : `<div id="progress-bar-el">${progressBarHtml(0)}</div>`}
      <p style="margin-top:14px;">Đang phân tích ảnh kênh của bạn…</p>
      <p style="color:var(--ink-soft);font-size:13px;margin-top:6px;">AI cần khoảng 1-2 phút để xử lý — đừng thoát trang, cứ để chờ nhé.</p>
      ${state.error?`<div class="error-box">${esc(state.error)}</div><div class="btn-row"><button class="btn" data-action="retry">Thử lại</button></div>`:''}</div>`;
    if(state.screen==='result') return resultHtml();
    return '';
  }

  function wizardHtml(){
    const step = STEPS[state.qIndex];
    const val = state.answers[step.key];

    let inputHtml = '';
    if(step.type==='choice'){
      inputHtml = `<div class="chips">${step.options.map(o=>`<div class="chip ${val===o?'selected':''}" data-choice="${esc(o)}">${esc(o)}</div>`).join('')}</div>`;
    } else if(step.type==='text'){
      inputHtml = `<textarea id="step-text" placeholder="Dán nội dung vào đây...">${esc(val||'')}</textarea>`;
    } else if(step.type==='image' && step.multi){
      const imgs = Array.isArray(val) ? val : [];
      inputHtml = `
        <div style="display:flex;gap:10px;flex-wrap:wrap;">
          ${imgs.map((src,i)=>`
            <div style="position:relative;">
              <img src="${src}" style="width:160px;height:160px;object-fit:cover;border-radius:8px;border:1px solid var(--line);display:block;">
              <span style="position:absolute;top:6px;right:6px;background:#fff;border-radius:999px;padding:2px 8px;font-size:11.5px;color:var(--danger);cursor:pointer;box-shadow:0 1px 3px rgba(0,0,0,.15);" data-action="clear-image-multi" data-idx="${i}">Xoá</span>
            </div>
          `).join('')}
        </div>
        ${imgs.length < 2 ? `<input type="file" accept="image/*" id="step-upload" style="margin-top:12px;">` : `<div style="margin-top:10px;font-size:12.5px;color:var(--ink-soft);">Đã đủ 2 ảnh — xoá 1 ảnh nếu muốn thay.</div>`}
        ${step.hasExample ? `<div style="margin-top:14px;"><div class="k" style="font-size:12px;color:var(--ink-soft);margin-bottom:6px;">Ảnh mẫu nên chụp giống thế này (chụp đủ cả 2 phần: giới thiệu ngắn ở đầu trang, và phần công việc/liên kết/cộng đồng bên dưới):</div>
          <div style="display:flex;gap:10px;flex-wrap:wrap;">
            <img src="assets/sua-kenh-vi-du-1.jpg" style="width:140px;border-radius:8px;border:1px solid var(--line);">
            <img src="assets/sua-kenh-vi-du-2.jpg" style="width:140px;border-radius:8px;border:1px solid var(--line);">
          </div></div>` : ''}
      `;
    } else if(step.type==='image'){
      inputHtml = `
        <input type="file" accept="image/*" id="step-upload">
        ${val ? `<img src="${val}" style="max-width:100%;max-height:260px;border-radius:8px;border:1px solid var(--line);margin-top:12px;display:block;">
          <span style="display:inline-block;margin-top:8px;color:var(--danger);font-size:12.5px;cursor:pointer;" data-action="clear-image">Xoá ảnh, chọn lại</span>` : ''}
        ${step.hasExample ? `<div style="margin-top:14px;"><div class="k" style="font-size:12px;color:var(--ink-soft);margin-bottom:6px;">Ảnh mẫu nên chụp giống thế này (chụp đủ cả 2 phần: giới thiệu ngắn ở đầu trang, và phần công việc/liên kết/cộng đồng bên dưới):</div>
          <div style="display:flex;gap:10px;flex-wrap:wrap;">
            <img src="assets/sua-kenh-vi-du-1.jpg" style="width:140px;border-radius:8px;border:1px solid var(--line);">
            <img src="assets/sua-kenh-vi-du-2.jpg" style="width:140px;border-radius:8px;border:1px solid var(--line);">
          </div></div>` : ''}
      `;
    }

    return `
      <div class="progress-groups" style="display:flex;gap:6px;margin-bottom:10px;">
        ${STEPS.map((s,i)=>`<span style="flex:1;height:5px;border-radius:3px;background:${i<state.qIndex?'var(--accent)':i===state.qIndex?'var(--gold)':'var(--line)'};"></span>`).join('')}
      </div>
      <div style="display:flex;justify-content:space-between;font-size:12px;color:var(--ink-soft);font-family:'IBM Plex Mono',monospace;margin-bottom:18px;">
        <span>SỬA KÊNH</span><span>Bước ${state.qIndex+1}/${STEPS.length}</span>
      </div>
      ${(state.qIndex===0 && !state.positioning) ? `
        <div class="hint-box" style="margin-bottom:16px;">Chưa có <a href="#dinh-vi">Định Vị</a> đã lưu — vẫn audit được bình thường, nhưng nếu làm Định Vị trước, kết quả sẽ sát hơn. Có thể điền nhanh bên dưới thay thế:</div>
        <div class="card" style="margin-bottom:16px;">
          <label style="display:block;font-size:13px;font-weight:600;color:var(--ink-soft);margin-bottom:6px;">Ngành/lĩnh vực &amp; đối tượng của bạn (không bắt buộc)</label>
          <textarea id="quick-context" style="min-height:auto;height:52px;" placeholder="Ví dụ: Coach tài chính cá nhân, hướng tới người mới đi làm...">${esc(state.quickContext||'')}</textarea>
        </div>
      ` : ''}
      <div class="card">
        <h2 style="font-size:21px;line-height:1.4;">${esc(step.title)}</h2>
        ${step.helper?`<div style="margin-top:10px;font-size:13.5px;color:var(--ink-soft);line-height:1.55;">${esc(step.helper)}</div>`:''}
        <div style="margin-top:16px;">${inputHtml}</div>
      </div>
      <div class="nav-row" style="display:flex;justify-content:space-between;align-items:center;margin-top:22px;">
        ${state.qIndex>0 ? `<span style="color:var(--ink-soft);font-size:13.5px;cursor:pointer;" data-action="back">← Bước trước</span>` : `<span></span>`}
        <div style="display:flex;gap:10px;">
          ${step.type!=='choice' ? `<span style="color:var(--ink-soft);font-size:13.5px;cursor:pointer;align-self:center;" data-action="skip">Bỏ qua</span>` : ''}
          <button class="btn" data-action="next">${state.qIndex===STEPS.length-1?'Audit kênh của tôi':'Tiếp tục'}</button>
          ${state.qIndex===STEPS.length-1?`<span style="font-size:11px;color:var(--ink-soft);align-self:center;">(tốn 4 lượt AI)</span>`:''}
        </div>
      </div>
      ${state.error?`<div class="error-box" style="margin-top:16px;">${esc(state.error)}</div>`:''}
    `;
  }

  const PRIORITY_LABEL = { do:'🔴 Sửa ngay', vang:'🟡 Sửa sớm', xanh:'🟢 Cải thiện dần' };

  function resultHtml(){
    const r = state.result;
    // AI đôi khi bỏ sót 1 field dù schema đánh dấu required (API không ép buộc điều này) —
    // dùng giá trị rỗng an toàn thay vì để cả trang crash vì undefined.ly_do/.map trên 1 field thiếu.
    const cover = r.goi_y_anh_bia || {};
    const hangMuc = r.hang_muc || [];
    return `
      <div class="page-head"><div class="tag">Bước 2 · Sửa Kênh</div><h1>Kết quả audit kênh</h1></div>
      <div class="section highlight"><h3>Tổng điểm</h3><div class="body" style="font-size:32px;font-weight:700;">${r.tong_diem}<span style="font-size:16px;">/100</span></div></div>
      <div class="section"><h3>Điểm mạnh</h3><ul>${(r.top_diem_manh||[]).map(x=>`<li>${esc(x)}</li>`).join('')}</ul></div>
      <div class="section"><h3>Điểm nghẽn</h3><ul>${(r.top_diem_nghen||[]).map(x=>`<li>${esc(x)}</li>`).join('')}</ul></div>
      <div class="section"><h3>Thứ tự ưu tiên sửa</h3><ol>${(r.thu_tu_uu_tien||[]).map(x=>`<li>${esc(x)}</li>`).join('')}</ol></div>
      ${hangMuc.map(hm=>`
        <div class="section">
          <h3>${esc(hm.ten)} — ${hm.diem}/20 · ${PRIORITY_LABEL[hm.uu_tien]||''}</h3>
          <div class="body"><b>Hiện tại:</b> ${esc(hm.hien_tai)}</div>
          <div class="body" style="margin-top:8px;"><b>Lệch định vị:</b> ${esc(hm.lech_dinh_vi)}</div>
          <div class="body" style="margin-top:8px;"><b>Cần sửa:</b> ${esc(hm.can_sua)}</div>
          <div class="body" style="margin-top:8px;background:var(--accent-soft);padding:12px;border-radius:8px;"><b>Viết lại:</b> ${esc(hm.viet_lai)}</div>
        </div>
      `).join('')}
      ${cover.prompt_anh_bia ? `
        <div class="section">
          <h3>Gợi ý ảnh bìa phù hợp</h3>
          <div class="body" style="margin-bottom:12px;">${esc(cover.ly_do)}</div>
          <div class="hint-box" style="margin-bottom:12px;">Ảnh bìa này dùng chính <b>ảnh thật của bạn</b> làm gốc, không phải ảnh người lạ AI tự vẽ — làm đúng thứ tự: <b>① Tải lên 1 ảnh chân dung rõ mặt của bạn vào ChatGPT trước</b>, sau đó <b>② dán nguyên văn prompt bên dưới</b> để AI biến ảnh đó thành ảnh bìa mới, có sẵn chữ tiêu đề luôn — không cần tự ghép chữ thêm.</div>
          <div class="body" style="background:var(--accent-soft);padding:12px;border-radius:8px;font-family:'IBM Plex Mono',monospace;font-size:12.5px;white-space:pre-wrap;">${esc(breakSentences(cover.prompt_anh_bia))}</div>
          <div class="btn-row" style="margin-top:14px;justify-content:flex-start;">
            <button class="btn btn-sm" data-action="copy-cover-prompt">${state.coverPromptCopied?'Đã copy ✓':'Copy prompt'}</button>
            <a class="btn-ghost btn btn-sm" href="https://chatgpt.com" target="_blank" rel="noopener">Mở ChatGPT →</a>
          </div>
          <div style="margin-top:6px;font-size:11.5px;color:var(--ink-soft);">Nhớ tải ảnh chân dung của bạn lên ChatGPT trước khi dán prompt.</div>
        </div>
      ` : ''}
      <div class="btn-row no-print">
        <button class="btn-ghost btn" data-action="redo">Audit lại</button> <span style="font-size:11px;color:var(--ink-soft);align-self:center;">(tốn 4 lượt AI)</span>
        <a class="btn" href="#dinh-dang-content">Tiếp tục: Dạng Content →</a>
      </div>
    `;
  }

  function bind(){
    const step = STEPS[state.qIndex];

    container.querySelectorAll('[data-choice]').forEach(el=>{
      el.onclick = ()=>{ state.answers[step.key] = el.getAttribute('data-choice'); draw(); };
    });
    const textInput = container.querySelector('#step-text');
    if(textInput) textInput.oninput = ()=>{ state.answers[step.key] = textInput.value; };
    const quickContext = container.querySelector('#quick-context');
    if(quickContext) quickContext.oninput = ()=>{ state.quickContext = quickContext.value; };
    const upload = container.querySelector('#step-upload');
    if(upload) upload.onchange = ()=>{
      const file = upload.files[0];
      if(!file) return;
      const reader = new FileReader();
      reader.onload = ()=>{
        const img = new Image();
        img.onload = ()=>{
          const maxW = 1000;
          const scale = Math.min(1, maxW / img.width);
          const w = Math.round(img.width * scale), h = Math.round(img.height * scale);
          const c = document.createElement('canvas');
          c.width = w; c.height = h;
          c.getContext('2d').drawImage(img, 0, 0, w, h);
          const dataUrl = c.toDataURL('image/jpeg', 0.82);
          if(step.multi){
            const imgs = Array.isArray(state.answers[step.key]) ? state.answers[step.key] : [];
            state.answers[step.key] = [...imgs, dataUrl].slice(0, 2);
          } else {
            state.answers[step.key] = dataUrl;
          }
          draw();
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    };
    const clearImg = container.querySelector('[data-action="clear-image"]');
    if(clearImg) clearImg.onclick = ()=>{ state.answers[step.key] = null; draw(); };
    container.querySelectorAll('[data-action="clear-image-multi"]').forEach(el=>{
      el.onclick = ()=>{
        const idx = Number(el.getAttribute('data-idx'));
        const imgs = Array.isArray(state.answers[step.key]) ? state.answers[step.key] : [];
        state.answers[step.key] = imgs.filter((_,i)=>i!==idx);
        draw();
      };
    });

    const backLink = container.querySelector('[data-action="back"]');
    if(backLink) backLink.onclick = ()=>{ state.qIndex = Math.max(0, state.qIndex-1); draw(); };
    const skipLink = container.querySelector('[data-action="skip"]');
    if(skipLink) skipLink.onclick = ()=> onNext();
    const nextBtn = container.querySelector('[data-action="next"]');
    if(nextBtn) nextBtn.onclick = onNext;

    const retryBtn = container.querySelector('[data-action="retry"]');
    if(retryBtn) retryBtn.onclick = submit;
    const redoBtn = container.querySelector('[data-action="redo"]');
    if(redoBtn) redoBtn.onclick = ()=>{ state.screen='wizard'; state.qIndex=0; draw(); };
    const copyPromptBtn = container.querySelector('[data-action="copy-cover-prompt"]');
    if(copyPromptBtn) copyPromptBtn.onclick = async ()=>{
      try{ await navigator.clipboard.writeText(state.result.goi_y_anh_bia.prompt_anh_bia); } catch(e){}
      state.coverPromptCopied = true; draw();
    };
  }

  function onNext(){
    if(state.qIndex < STEPS.length-1){ state.qIndex++; state.error=null; draw(); }
    else submit();
  }

  async function submit(){
    state.screen='submitting'; state.error=null; draw();
    const stopProgress = animateProgressBar(container.querySelector('#progress-bar-el'), 90);
    acquireWakeLock();
    try{
      const data = await callApi('/api/sua-kenh', {
        positioning: state.positioning ? { luot1: state.positioning.luot1, luot2: state.positioning.luot2 } : null,
        quick_context: state.quickContext,
        channel: state.answers,
      }, 280000);
      state.result = data.result;
      const payload = { user_id: ctx.user.id, input: state.answers, result: data.result };
      if(state.auditId){
        await ctx.supabase.from('channel_audits').update(payload).eq('id', state.auditId);
      } else {
        const { data: inserted } = await ctx.supabase.from('channel_audits').insert(payload).select().single();
        if(inserted) state.auditId = inserted.id;
      }
      stopProgress(); releaseWakeLock();
      state.screen='result'; draw();
    } catch(e){
      stopProgress(); releaseWakeLock();
      state.error = e.message; state.screen='wizard'; state.qIndex = STEPS.length-1; draw();
    }
  }

  boot();
}

window.Modules = window.Modules || {};
window.Modules['sua-kenh'] = { title:'Sửa Kênh', render };
})();
