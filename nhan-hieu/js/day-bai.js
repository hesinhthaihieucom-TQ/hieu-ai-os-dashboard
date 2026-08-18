(function(){
const MILESTONES = [
  { key:'m1', label:'Trước 1.000 view', hint:'Kích cmt đầu tiên, chưa gắn link' },
  { key:'m2', label:'Đạt 10.000 view', hint:'Bắt đầu dẫn nhẹ' },
  { key:'m3', label:'Đạt 100.000 view', hint:'Dẫn về tài sản có giá trị hơn' },
  { key:'m4', label:'Đạt 1 triệu view', hint:'CTA mạnh, chuyển đổi' },
  { key:'m5', label:'Trên 1 triệu view', hint:'Tối đa hoá chuyển đổi' },
];
const ASSET_KINDS = {
  san_pham_so: 'Sản phẩm số của tôi', aff_nguoi_khac: 'Aff sản phẩm người khác',
  aff_cua_toi: 'Aff của tôi', cong_dong: 'Link cộng đồng', khac: 'Khác',
};

function render(container, ctx){
  const state = {
    screen:'loading', positioning:null, assets:[], calendarEntries:[],
    postChoice:'', topicOther:'', milestone:'m1', quickContext:'',
    generating:false, error:null, result:null,
  };

  function draw(){ container.innerHTML = html(); bind(); }

  async function boot(){
    draw();
    const { data: pos } = await ctx.supabase.from('positioning_results').select('*').eq('user_id', ctx.user.id).maybeSingle();
    state.positioning = (pos && pos.luot1) ? pos : null;
    await Promise.all([loadAssets(), loadCalendarEntries()]);
    state.screen = 'main';
    draw();
  }

  async function loadAssets(){
    const { data } = await ctx.supabase.from('promo_assets').select('*').eq('user_id', ctx.user.id).order('created_at', { ascending:true });
    state.assets = data || [];
  }

  async function loadCalendarEntries(){
    const { data } = await ctx.supabase.from('calendar_entries').select('*, posts(title,content)').eq('user_id', ctx.user.id).order('scheduled_date', { ascending:false }).limit(30);
    state.calendarEntries = data || [];
  }

  function resolvedTopic(){
    if(state.postChoice==='other') return state.topicOther;
    const entry = state.calendarEntries.find(e=>e.id===state.postChoice);
    if(!entry) return '';
    return (entry.posts && entry.posts.content) ? entry.posts.content : (entry.title || '');
  }

  function html(){
    if(state.screen==='loading') return `<div class="loading"><div class="spinner"></div><p>Đang tải…</p></div>`;
    return `
      <div class="page-head"><h1>Đẩy Bài &amp; CTA Comment</h1><p>Gợi ý bình luận tự đăng, cách trả lời bình luận, và tài sản nên gắn — đúng theo mốc lượt xem bài đang lên.</p></div>

      <div class="card">
        <h3 style="margin-bottom:10px;">Tài sản quảng bá của bạn</h3>
        ${state.assets.length===0
          ? `<div style="color:var(--ink-soft);font-size:13.5px;">Chưa có tài sản nào — thêm ở mục <a href="#dinh-vi">Định Vị</a> (sản phẩm số, link aff, link cộng đồng).</div>`
          : state.assets.map(a=>`
            <div style="padding:6px 0;border-bottom:1px solid var(--line);font-size:13.5px;">
              <b>${esc(a.label)}</b> <span style="color:var(--ink-soft);">(${esc(ASSET_KINDS[a.kind]||a.kind||'')})</span>
            </div>
          `).join('') + `<div style="margin-top:10px;"><a href="#dinh-vi" style="font-size:12.5px;color:var(--ink-soft);">Quản lý tài sản ở Định Vị →</a></div>`
        }
      </div>

      <div class="card" style="margin-top:16px;">
        <label style="display:block;font-size:13px;font-weight:600;color:var(--ink-soft);margin-bottom:6px;">Bài đang đẩy</label>
        <select id="db-post-select">
          <option value="">— Chọn bài từ Lịch Đăng Bài —</option>
          ${state.calendarEntries.map(e=>`<option value="${e.id}" ${state.postChoice===e.id?'selected':''}>${esc(new Date(e.scheduled_date).toLocaleDateString('vi-VN'))} — ${esc((e.posts && e.posts.title) || e.title || '(không tiêu đề)')}</option>`).join('')}
          <option value="other" ${state.postChoice==='other'?'selected':''}>Khác (dán nội dung khác)</option>
        </select>
        ${state.postChoice==='other'?`<textarea id="db-topic-other" style="margin-top:8px;" placeholder="Dán chủ đề/nội dung bài đang đẩy...">${esc(state.topicOther)}</textarea>`:''}
        ${state.calendarEntries.length===0?`<div style="margin-top:6px;font-size:11.5px;color:var(--ink-soft);">Chưa có bài nào trong Lịch Đăng Bài — viết bài ở <a href="#viet-content">Viết Content</a> rồi đưa vào lịch trước.</div>`:''}

        ${!(state.positioning) ? `
          <label style="display:block;font-size:13px;font-weight:600;color:var(--ink-soft);margin:14px 0 6px;">Ngành/đối tượng (không bắt buộc)</label>
          <textarea id="db-quick-context" style="min-height:auto;height:44px;" placeholder="Ví dụ: Coach tài chính cá nhân...">${esc(state.quickContext)}</textarea>
        ` : ''}

        <label style="display:block;font-size:13px;font-weight:600;color:var(--ink-soft);margin:14px 0 6px;">Mốc lượt xem hiện tại</label>
        <div class="chips">
          ${MILESTONES.map(m=>`<div class="chip ${state.milestone===m.key?'selected':''}" data-milestone="${m.key}">${esc(m.label)}</div>`).join('')}
        </div>
        <div style="margin-top:8px;font-size:12.5px;color:var(--ink-soft);">${esc((MILESTONES.find(m=>m.key===state.milestone)||{}).hint||'')}</div>

        <div class="btn-row"><button class="btn" data-action="generate" ${state.generating?'disabled':''}>${state.generating?'Đang gợi ý…':'Gợi ý đẩy bài'}</button></div>
        ${state.error?`<div class="error-box">${esc(state.error)}</div>`:''}
      </div>

      ${state.result ? resultHtml() : ''}
    `;
  }

  function resultHtml(){
    const r = state.result;
    return `
      <div class="section highlight"><h3>Trọng tâm mốc này</h3><div class="body">${esc(r.chien_luoc_moc_nay)}</div></div>
      <div class="section"><h3>Bình luận tự đăng / ghim</h3><div class="body">${esc(r.cmt_tu_dang)}</div></div>
      <div class="section"><h3>Gợi ý trả lời bình luận người khác</h3>
        <ul>${r.goi_y_tra_loi_cmt.map(c=>`<li>${esc(c)}</li>`).join('')}</ul>
      </div>
      <div class="section"><h3>Tài sản nên gắn</h3>
        <div class="body">${r.tai_san_de_xuat.label ? `<b>${esc(r.tai_san_de_xuat.label)}</b><br>` : `<i>Chưa nên gắn tài sản nào</i><br>`}${esc(r.tai_san_de_xuat.ly_do)}</div>
      </div>
    `;
  }

  function bind(){
    const postSelect = container.querySelector('#db-post-select');
    if(postSelect) postSelect.onchange = ()=>{ state.postChoice = postSelect.value; draw(); };
    const topicOtherEl = container.querySelector('#db-topic-other');
    if(topicOtherEl) topicOtherEl.oninput = ()=>{ state.topicOther = topicOtherEl.value; };

    const qcEl = container.querySelector('#db-quick-context'); if(qcEl) qcEl.oninput = ()=>state.quickContext = qcEl.value;
    container.querySelectorAll('[data-milestone]').forEach(el=>{
      el.onclick = ()=>{ state.milestone = el.getAttribute('data-milestone'); draw(); };
    });
    const genBtn = container.querySelector('[data-action="generate"]');
    if(genBtn) genBtn.onclick = generate;
  }

  async function generate(){
    const topic = resolvedTopic();
    if(!topic.trim()) return;
    state.generating = true; state.error = null; state.result = null; draw();
    try{
      const data = await callApi('/api/goi-y-day-bai', {
        topic,
        milestone: state.milestone,
        assets: state.assets.map(a=>({ label:a.label, url:a.url })),
        positioning: state.positioning ? { luot1: state.positioning.luot1, luot2: state.positioning.luot2 } : null,
        quick_context: state.quickContext,
      });
      state.result = data.result;
    } catch(e){ state.error = e.message; }
    state.generating = false; draw();
  }

  boot();
}
window.Modules = window.Modules || {};
window.Modules['day-bai'] = { title:'Đẩy Bài & CTA Comment', render };
})();
