(function(){
const MILESTONES = [
  { key:'m1', label:'Trước 1.000 view', hint:'Kích cmt đầu tiên, chưa gắn link' },
  { key:'m2', label:'Đạt 10.000 view', hint:'Bắt đầu dẫn nhẹ' },
  { key:'m3', label:'Đạt 100.000 view', hint:'Dẫn về tài sản có giá trị hơn' },
  { key:'m4', label:'Đạt 1 triệu view', hint:'CTA mạnh, chuyển đổi' },
  { key:'m5', label:'Trên 1 triệu view', hint:'Tối đa hoá chuyển đổi' },
];
const ASSET_KINDS = {
  san_pham_so: 'Sản phẩm số của tôi', khoa_hoc: 'Khoá học của tôi', aff_nguoi_khac: 'Aff sản phẩm người khác',
  aff_cua_toi: 'Aff của tôi', cong_dong: 'Link cộng đồng', khac: 'Khác',
};

function render(container, ctx){
  const state = {
    screen:'loading', positioning:null, assets:[], calendarEntries:[], posts:[],
    postSource:'lich', postChoice:'', topicOther:'', milestone:'m1', quickContext:'',
    selectedAssetId:'', generating:false, error:null, result:null,
  };

  function draw(){ container.innerHTML = html(); bind(); }

  async function boot(){
    draw();
    const { data: pos } = await ctx.supabase.from('positioning_results').select('*').eq('user_id', ctx.user.id).maybeSingle();
    state.positioning = (pos && pos.luot1) ? pos : null;
    await Promise.all([loadAssets(), loadCalendarEntries(), loadPosts()]);
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

  async function loadPosts(){
    const { data } = await ctx.supabase.from('posts').select('*').eq('user_id', ctx.user.id).order('created_at', { ascending:false }).limit(50);
    state.posts = data || [];
  }

  function resolvedTopic(){
    if(state.postSource==='other') return state.topicOther;
    if(state.postSource==='kho'){
      const post = state.posts.find(p=>p.id===state.postChoice);
      return post ? (post.content || post.title || '') : '';
    }
    const entry = state.calendarEntries.find(e=>e.id===state.postChoice);
    if(!entry) return '';
    return (entry.posts && entry.posts.content) ? entry.posts.content : (entry.title || '');
  }

  function html(){
    if(state.screen==='loading') return `<div class="loading"><div class="spinner"></div><p>Đang tải…</p></div>`;
    return `
      <div class="page-head"><h1>Đẩy Bài &amp; CTA Comment</h1><p>Gợi ý bình luận tự đăng, cách trả lời bình luận, và tài sản nên gắn — đúng theo mốc lượt xem bài đang lên.</p></div>

      <div class="hint-box" style="margin-bottom:16px;">
        <b>Vì sao bước này quan trọng?</b> Facebook không chỉ đo lượt xem để quyết định có đẩy bài đi tiếp hay không — nó đo mức độ NGƯỜI TA Ở LẠI TƯƠNG TÁC sau khi xem: bình luận, được trả lời, bình luận tiếp. Bài có <b>bình luận qua lại</b> (đặc biệt là tác giả tự trả lời) được thuật toán hiểu là "nội dung đáng bàn luận" và tiếp tục đẩy cho nhóm người xem mới, thay vì chỉ đứng yên hoặc chết dần sau vài giờ đầu.
        <br><br>
        Về phía người xem: ở mốc view còn thấp, người xem lạ chưa đủ tin tưởng — <b>CTA mạnh</b> (bán/dẫn link) lúc này dễ bị lướt qua hoặc phản tác dụng. Đợi bài đủ view/bình luận (có <b>"bằng chứng xã hội"</b>) rồi mới tăng dần độ mạnh của CTA sẽ tự nhiên và chuyển đổi tốt hơn hẳn — đây là lý do mỗi mốc lượt xem bên dưới có <b>1 chiến lược bình luận khác nhau</b>, không dùng chung 1 kiểu CTA cho mọi giai đoạn.
      </div>

      <div class="card">
        <label style="display:block;font-size:13px;font-weight:600;color:var(--ink-soft);margin-bottom:6px;">Bài đang đẩy</label>
        <div class="chips" style="margin-bottom:10px;">
          <div class="chip ${state.postSource==='lich'?'selected':''}" data-post-source="lich">Từ Lịch Đăng Bài</div>
          <div class="chip ${state.postSource==='kho'?'selected':''}" data-post-source="kho">Từ Kho Content (bài đã viết)</div>
          <div class="chip ${state.postSource==='other'?'selected':''}" data-post-source="other">Khác (dán nội dung)</div>
        </div>
        ${state.postSource==='lich' ? `
          <select id="db-post-select">
            <option value="">— Chọn bài từ Lịch Đăng Bài —</option>
            ${state.calendarEntries.map(e=>`<option value="${e.id}" ${state.postChoice===e.id?'selected':''}>${esc(new Date(e.scheduled_date).toLocaleDateString('vi-VN'))} — ${esc((e.posts && e.posts.title) || e.title || '(không tiêu đề)')}</option>`).join('')}
          </select>
          ${state.calendarEntries.length===0?`<div style="margin-top:6px;font-size:11.5px;color:var(--ink-soft);">Chưa có bài nào trong Lịch Đăng Bài — chọn "Từ Kho Content" nếu bài đã viết từ lâu, hoặc viết bài ở <a href="#viet-content">Viết Content</a> rồi đưa vào lịch.</div>`:''}
        ` : ''}
        ${state.postSource==='kho' ? `
          <select id="db-post-select-kho">
            <option value="">— Chọn bài đã viết trong Kho Content —</option>
            ${state.posts.map(p=>`<option value="${p.id}" ${state.postChoice===p.id?'selected':''}>${esc(p.title || '(không tiêu đề)')}</option>`).join('')}
          </select>
          ${state.posts.length===0?`<div style="margin-top:6px;font-size:11.5px;color:var(--ink-soft);">Chưa có bài nào đã viết — sang <a href="#kho-content">Kho Content</a> hoặc <a href="#viet-content">Viết Content</a> trước.</div>`:''}
        ` : ''}
        ${state.postSource==='other'?`<textarea id="db-topic-other" style="margin-top:8px;" placeholder="Dán chủ đề/nội dung bài đang đẩy...">${esc(state.topicOther)}</textarea>`:''}

        ${!(state.positioning) ? `
          <label style="display:block;font-size:13px;font-weight:600;color:var(--ink-soft);margin:14px 0 6px;">Ngành/đối tượng (không bắt buộc)</label>
          <textarea id="db-quick-context" style="min-height:auto;height:44px;" placeholder="Ví dụ: Coach tài chính cá nhân...">${esc(state.quickContext)}</textarea>
        ` : ''}
      </div>

      ${assetsCardHtml()}

      <div class="card" style="margin-top:16px;">
        <label style="display:block;font-size:13px;font-weight:600;color:var(--ink-soft);margin:0 0 6px;">Mốc lượt xem hiện tại</label>
        <div class="chips">
          ${MILESTONES.map(m=>`<div class="chip ${state.milestone===m.key?'selected':''}" data-milestone="${m.key}">${esc(m.label)}</div>`).join('')}
        </div>
        <div style="margin-top:8px;font-size:12.5px;color:var(--ink-soft);">${esc((MILESTONES.find(m=>m.key===state.milestone)||{}).hint||'')}</div>

        <div class="btn-row"><button class="btn" data-action="generate" ${state.generating?'disabled':''}>${state.generating?'Đang gợi ý…':'Gợi ý đẩy bài'}</button> <span style="font-size:11px;color:var(--ink-soft);">(tốn 1 lượt AI)</span></div>
        <div class="hint-box" style="margin-top:10px;">Nên bấm "Gợi ý đẩy bài" mỗi khi đổi mốc lượt xem — AI cần khoảng 1 phút để ra bình luận và cách trả lời phù hợp, đừng thoát trang khi đang đợi.</div>
        ${state.error?`<div class="error-box">${esc(state.error)}</div>`:''}
      </div>

      ${state.result ? resultHtml() : ''}
    `;
  }

  function assetsCardHtml(){
    return `
      <div class="card" style="margin-top:16px;">
        <h3 style="margin-bottom:4px;">Tài sản muốn đẩy cho bài này</h3>
        <p style="font-size:12.5px;color:var(--ink-soft);margin-bottom:10px;">Chọn 1 tài sản cụ thể muốn gắn cho bài đang đẩy, hoặc để AI tự gợi ý theo mốc view.</p>
        <select id="db-asset-select">
          <option value="">— Để AI tự gợi ý —</option>
          ${Object.entries(ASSET_KINDS).map(([kind,label])=>{
            const items = state.assets.filter(a=>a.kind===kind);
            if(items.length===0) return '';
            return `<optgroup label="${esc(label)}">${items.map(a=>`<option value="${a.id}" ${state.selectedAssetId===a.id?'selected':''}>${esc(a.label)}</option>`).join('')}</optgroup>`;
          }).join('')}
        </select>
        ${state.assets.length===0?`<div style="margin-top:6px;font-size:11.5px;color:var(--ink-soft);">Chưa có tài sản nào.</div>`:''}
        <div style="margin-top:10px;"><a href="#dinh-vi" style="font-size:12.5px;color:var(--ink-soft);">Thêm/sửa tài sản ở Định Vị →</a></div>
      </div>
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
    container.querySelectorAll('[data-post-source]').forEach(el=>{
      el.onclick = ()=>{ state.postSource = el.getAttribute('data-post-source'); state.postChoice = ''; draw(); };
    });
    const postSelect = container.querySelector('#db-post-select');
    if(postSelect) postSelect.onchange = ()=>{ state.postChoice = postSelect.value; draw(); };
    const postSelectKho = container.querySelector('#db-post-select-kho');
    if(postSelectKho) postSelectKho.onchange = ()=>{ state.postChoice = postSelectKho.value; draw(); };
    const topicOtherEl = container.querySelector('#db-topic-other');
    if(topicOtherEl) topicOtherEl.oninput = ()=>{ state.topicOther = topicOtherEl.value; };

    const qcEl = container.querySelector('#db-quick-context'); if(qcEl) qcEl.oninput = ()=>state.quickContext = qcEl.value;
    const assetSelect = container.querySelector('#db-asset-select');
    if(assetSelect) assetSelect.onchange = ()=>{ state.selectedAssetId = assetSelect.value; };
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
    const stopProgress = animateProgressButton(container.querySelector('[data-action="generate"]'), 30, 'Đang gợi ý');
    try{
      const preferredAsset = state.assets.find(a=>a.id===state.selectedAssetId);
      const data = await callApi('/api/goi-y-day-bai', {
        topic,
        milestone: state.milestone,
        assets: state.assets.map(a=>({ label:a.label, url:a.url })),
        preferred_asset: preferredAsset ? preferredAsset.label : null,
        positioning: state.positioning ? { luot1: state.positioning.luot1, luot2: state.positioning.luot2 } : null,
        quick_context: state.quickContext,
      });
      state.result = data.result;
    } catch(e){ state.error = e.message; }
    stopProgress();
    state.generating = false; draw();
  }

  boot();
}
window.Modules = window.Modules || {};
window.Modules['day-bai'] = { title:'Đẩy Bài & CTA Comment', render };
})();
