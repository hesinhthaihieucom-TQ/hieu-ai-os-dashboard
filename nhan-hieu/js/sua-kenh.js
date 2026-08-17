(function(){
const FIELDS = [
  {id:'platform', label:'Nền tảng chính đang dùng', type:'chips', options:['Facebook','TikTok'], single:true},
  {id:'bio', label:'Bio hiện tại (copy nguyên văn)', type:'textarea'},
  {id:'anh_dai_dien', label:'Mô tả ảnh đại diện hiện tại', type:'textarea', helper:'Chụp ở đâu, góc nào, ánh sáng, biểu cảm, mặc gì, nền gì.'},
  {id:'anh_bia', label:'Mô tả ảnh bìa hiện tại', type:'textarea', helper:'Có chữ gì trên ảnh, bố cục, màu sắc, có CTA không.'},
  {id:'profile_day_du', label:'Profile đầy đủ', type:'textarea', helper:'Nghề nghiệp, vị trí, học vấn, website/link, SĐT/email, Featured/Story Highlights... — mục nào có điền, mục nào bỏ trống.'},
  {id:'bai_gan_nhat', label:'Mô tả 6-10 bài gần nhất', type:'textarea', helper:'Chủ đề, format, mức tương tác từng bài.'},
  {id:'bai_vien_top', label:'Nội dung 5 bài có tương tác cao nhất', type:'textarea', helper:'Copy nguyên văn nếu là bài chữ, hoặc mô tả kỹ nếu là video.'},
  {id:'bai_ghim', label:'Mô tả bài ghim (nếu có)', type:'textarea'},
];

const PRIORITY_LABEL = { do:'🔴 Sửa ngay', vang:'🟡 Sửa sớm', xanh:'🟢 Cải thiện dần' };

function render(container, ctx){
  const state = { screen:'loading', positioning:null, channel:{}, result:null, error:null, auditId:null };

  function draw(){ container.innerHTML = html(); bind(); }

  async function boot(){
    draw();
    const { data: pos } = await ctx.supabase.from('positioning_results').select('*').eq('user_id', ctx.user.id).maybeSingle();
    if(!pos || !pos.luot1){ state.screen='need-positioning'; draw(); return; }
    state.positioning = pos;

    const { data: audit } = await ctx.supabase.from('channel_audits').select('*').eq('user_id', ctx.user.id).order('created_at', { ascending:false }).limit(1).maybeSingle();
    if(audit){ state.auditId = audit.id; state.channel = audit.input || {}; state.result = audit.result; state.screen='result'; }
    else state.screen='form';
    draw();
  }

  function html(){
    if(state.screen==='loading') return `<div class="loading"><div class="spinner"></div><p>Đang tải…</p></div>`;
    if(state.screen==='need-positioning') return `
      <div class="page-head"><div class="tag">Bước 2 · Sửa Kênh</div><h1>Cần Định Vị trước đã</h1>
      <p>Hoàn thành bước Định Vị trước, sau đó quay lại đây để audit kênh thật so với định vị.</p></div>
      <div class="btn-row"><a class="btn" href="#dinh-vi">Đi tới Định Vị</a></div>`;
    if(state.screen==='form') return formHtml();
    if(state.screen==='saving') return `<div class="loading"><div class="spinner"></div><p>Đang audit kênh của bạn…</p>
      ${state.error?`<div class="error-box">${esc(state.error)}</div><div class="btn-row"><button class="btn" data-action="retry">Thử lại</button></div>`:''}</div>`;
    if(state.screen==='result') return resultHtml();
    return '';
  }

  function formHtml(){
    return `
      <div class="page-head"><div class="tag">Bước 2 · Sửa Kênh</div><h1>Audit kênh thật so với định vị</h1>
      <p>Mô tả càng chi tiết, audit càng chính xác. Nếu chưa quen mô tả bằng chữ, cứ viết thật những gì đang có trên kênh.</p></div>
      <div class="card">
        ${FIELDS.map(f=>{
          if(f.type==='chips'){
            const val = state.channel[f.id];
            return `<label style="display:block;font-size:13px;font-weight:600;color:var(--ink-soft);margin:14px 0 6px;">${esc(f.label)}</label>
              <div class="chips">${f.options.map(o=>`<div class="chip ${val===o?'selected':''}" data-fchip="${f.id}" data-val="${esc(o)}">${esc(o)}</div>`).join('')}</div>`;
          }
          return `<label style="display:block;font-size:13px;font-weight:600;color:var(--ink-soft);margin:14px 0 6px;">${esc(f.label)}</label>
            ${f.helper?`<div style="font-size:12.5px;color:var(--ink-soft);margin-bottom:6px;">${esc(f.helper)}</div>`:''}
            <textarea data-field="${f.id}" style="margin-top:0;">${esc(state.channel[f.id]||'')}</textarea>`;
        }).join('')}
        <div class="btn-row"><button class="btn" data-action="submit">Audit kênh của tôi</button></div>
        ${state.error?`<div class="error-box">${esc(state.error)}</div>`:''}
      </div>
    `;
  }

  function resultHtml(){
    const r = state.result;
    return `
      <div class="page-head"><div class="tag">Bước 2 · Sửa Kênh</div><h1>Kết quả audit kênh</h1></div>
      <div class="section highlight"><h3>Tổng điểm</h3><div class="body" style="font-size:32px;font-weight:700;">${r.tong_diem}<span style="font-size:16px;">/100</span></div></div>
      <div class="section"><h3>Top 3 điểm mạnh</h3><ul>${r.top_diem_manh.map(x=>`<li>${esc(x)}</li>`).join('')}</ul></div>
      <div class="section"><h3>Top 3 điểm nghẽn</h3><ul>${r.top_diem_nghen.map(x=>`<li>${esc(x)}</li>`).join('')}</ul></div>
      <div class="section"><h3>Thứ tự ưu tiên sửa</h3><ol>${r.thu_tu_uu_tien.map(x=>`<li>${esc(x)}</li>`).join('')}</ol></div>
      ${r.hang_muc.map(hm=>`
        <div class="section">
          <h3>${esc(hm.ma)} · ${esc(hm.ten)} — ${hm.diem}/10 · ${PRIORITY_LABEL[hm.uu_tien]||''}</h3>
          <div class="body"><b>Hiện tại:</b> ${esc(hm.hien_tai)}</div>
          <div class="body" style="margin-top:8px;"><b>Lệch định vị:</b> ${esc(hm.lech_dinh_vi)}</div>
          <div class="body" style="margin-top:8px;"><b>Cần sửa:</b> ${esc(hm.can_sua)}</div>
          <div class="body" style="margin-top:8px;background:var(--accent-soft);padding:12px;border-radius:8px;"><b>Viết lại:</b> ${esc(hm.viet_lai)}</div>
        </div>
      `).join('')}
      <div class="btn-row no-print">
        <button class="btn-ghost btn" data-action="redo">Audit lại</button>
        <a class="btn" href="#y-tuong">Tiếp tục: Ý Tưởng →</a>
      </div>
    `;
  }

  function bind(){
    container.querySelectorAll('[data-field]').forEach(el=>{
      el.oninput = ()=>{ state.channel[el.getAttribute('data-field')] = el.value; };
    });
    container.querySelectorAll('[data-fchip]').forEach(el=>{
      el.onclick = ()=>{ state.channel[el.getAttribute('data-fchip')] = el.getAttribute('data-val'); draw(); };
    });
    const submitBtn = container.querySelector('[data-action="submit"]');
    if(submitBtn) submitBtn.onclick = submit;
    const retryBtn = container.querySelector('[data-action="retry"]');
    if(retryBtn) retryBtn.onclick = submit;
    const redoBtn = container.querySelector('[data-action="redo"]');
    if(redoBtn) redoBtn.onclick = ()=>{ state.screen='form'; draw(); };
  }

  async function submit(){
    state.screen='saving'; state.error=null; draw();
    try{
      const data = await callApi('/api/sua-kenh', {
        positioning: { luot1: state.positioning.luot1, luot2: state.positioning.luot2 },
        channel: state.channel,
      });
      state.result = data.result;
      const payload = { user_id: ctx.user.id, input: state.channel, result: data.result };
      if(state.auditId){
        await ctx.supabase.from('channel_audits').update(payload).eq('id', state.auditId);
      } else {
        const { data: inserted } = await ctx.supabase.from('channel_audits').insert(payload).select().single();
        if(inserted) state.auditId = inserted.id;
      }
      state.screen='result'; draw();
    } catch(e){ state.error = e.message; state.screen='form'; draw(); }
  }

  boot();
}

window.Modules = window.Modules || {};
window.Modules['sua-kenh'] = { title:'Sửa Kênh', render };
})();
