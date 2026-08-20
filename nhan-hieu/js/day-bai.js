(function(){
const MILESTONES = [
  { key:'m1', label:'Trước 1.000 view' },
  { key:'m2', label:'Đạt 10.000 view' },
  { key:'m3', label:'Đạt 100.000 view' },
  { key:'m4', label:'Đạt 1 triệu view' },
  { key:'m5', label:'Trên 1 triệu view' },
];
const MILESTONE_LABEL = Object.fromEntries(MILESTONES.map(m=>[m.key, m.label]));
const ASSET_KINDS = {
  san_pham_so: 'Sản phẩm số của tôi', khoa_hoc: 'Khoá học của tôi', aff_nguoi_khac: 'Aff sản phẩm người khác',
  aff_cua_toi: 'Aff của tôi', cong_dong: 'Link cộng đồng', khac: 'Khác',
};

function render(container, ctx){
  const state = {
    screen:'loading', positioning:null, assets:[], calendarEntries:[], posts:[],
    postSource:'lich', postChoice:'', topicOther:'', quickContext:'',
    selectedAssetIds: new Set(), generating:false, error:null, result:null,
    savedNotice:false, expandedMoc:'m1',
  };

  const DRAFT_KEY = 'day-bai';
  function draftPayload(){
    return {
      postSource: state.postSource, postChoice: state.postChoice, topicOther: state.topicOther,
      quickContext: state.quickContext, selectedAssetIds: Array.from(state.selectedAssetIds),
      result: state.result,
    };
  }
  function persistDraft(){ saveModuleDraft(ctx, DRAFT_KEY, draftPayload()); }

  function draw(){ container.innerHTML = html(); bind(); }

  async function boot(){
    draw();
    const { data: pos } = await ctx.supabase.from('positioning_results').select('*').eq('user_id', ctx.user.id).maybeSingle();
    state.positioning = (pos && pos.luot1) ? pos : null;
    const hasPending = !!window.PendingPost;
    if(window.PendingPost){
      state.postSource = 'kho'; state.postChoice = window.PendingPost.id; window.PendingPost = null;
    } else {
      const draft = await loadModuleDraft(ctx, DRAFT_KEY);
      if(draft) Object.assign(state, draft, { selectedAssetIds: new Set(draft.selectedAssetIds || []) });
    }
    await Promise.all([loadAssets(), loadCalendarEntries(), loadPosts()]);
    if(hasPending) loadSavedPlanIfAny();
    state.screen = 'main';
    draw();
  }

  async function loadAssets(){
    const { data } = await ctx.supabase.from('promo_assets').select('*').eq('user_id', ctx.user.id).order('created_at', { ascending:true });
    state.assets = data || [];
  }

  async function loadCalendarEntries(){
    const { data } = await ctx.supabase.from('calendar_entries').select('*, posts(title,content,day_bai_plan)').eq('user_id', ctx.user.id).order('scheduled_date', { ascending:false }).limit(30);
    state.calendarEntries = data || [];
  }

  async function loadPosts(){
    const { data } = await ctx.supabase.from('posts').select('*').eq('user_id', ctx.user.id).order('created_at', { ascending:false }).limit(50);
    state.posts = data || [];
  }

  // post_id THẬT sự đứng sau lựa chọn hiện tại (nếu có) — dùng để lưu/đọc day_bai_plan. Nguồn "Khác
  // (dán nội dung)" không gắn với bài nào trong Kho Content nên không có post_id, không lưu được.
  function resolvedPostId(){
    if(state.postSource==='kho') return state.postChoice || null;
    if(state.postSource==='lich'){
      const entry = state.calendarEntries.find(e=>e.id===state.postChoice);
      return entry ? (entry.post_id || null) : null;
    }
    return null;
  }

  function resolvedExistingPlan(){
    if(state.postSource==='kho'){
      const post = state.posts.find(p=>p.id===state.postChoice);
      return post ? (post.day_bai_plan || null) : null;
    }
    if(state.postSource==='lich'){
      const entry = state.calendarEntries.find(e=>e.id===state.postChoice);
      return (entry && entry.posts) ? (entry.posts.day_bai_plan || null) : null;
    }
    return null;
  }

  // Khi vừa chọn 1 bài đã có sẵn kế hoạch đẩy bài đã lưu — hiện lại luôn, không bắt chạy AI lại.
  function loadSavedPlanIfAny(){
    const existing = resolvedExistingPlan();
    if(existing){ state.result = existing; state.savedNotice = false; }
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
      <div class="page-head"><h1>Đẩy Bài &amp; CTA Comment</h1><p>Gợi ý bình luận tự đăng, cách trả lời bình luận, và tài sản nên gắn — cho ĐỦ CẢ 5 mốc lượt xem cùng lúc, 1 lần bấm.</p>
      ${state.result ? `<span class="btn-ghost btn btn-sm" data-action="reset-draft" style="margin-top:8px;">Reset, làm bài mới</span>` : ''}
      </div>

      <div class="hint-box" style="margin-bottom:16px;">
        <b>Vì sao bước này quan trọng?</b> Facebook không chỉ đo lượt xem để quyết định có đẩy bài đi tiếp hay không — nó đo mức độ NGƯỜI TA Ở LẠI TƯƠNG TÁC sau khi xem: bình luận, được trả lời, bình luận tiếp. Bài có <b>bình luận qua lại</b> (đặc biệt là tác giả tự trả lời) được thuật toán hiểu là "nội dung đáng bàn luận" và tiếp tục đẩy cho nhóm người xem mới, thay vì chỉ đứng yên hoặc chết dần sau vài giờ đầu.
        <br><br>
        Về phía người xem: ở mốc view còn thấp, người xem lạ chưa đủ tin tưởng — <b>CTA mạnh</b> (bán/dẫn link) lúc này dễ bị lướt qua hoặc phản tác dụng. Đợi bài đủ view/bình luận (có <b>"bằng chứng xã hội"</b>) rồi mới tăng dần độ mạnh của CTA sẽ tự nhiên và chuyển đổi tốt hơn hẳn — đây là lý do mỗi mốc lượt xem có <b>1 chiến lược bình luận khác nhau</b>, không dùng chung 1 kiểu CTA cho mọi giai đoạn.
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
            ${state.posts.map(p=>`<option value="${p.id}" ${state.postChoice===p.id?'selected':''}>${esc(p.title || '(không tiêu đề)')}${p.day_bai_plan?' ✓ đã có kế hoạch':''}</option>`).join('')}
          </select>
          ${state.posts.length===0?`<div style="margin-top:6px;font-size:11.5px;color:var(--ink-soft);">Chưa có bài nào đã viết — sang <a href="#kho-content">Kho Content</a> hoặc <a href="#viet-content">Viết Content</a> trước.</div>`:''}
        ` : ''}
        ${state.postSource==='other'?`<textarea id="db-topic-other" style="margin-top:8px;" placeholder="Dán chủ đề/nội dung bài đang đẩy...">${esc(state.topicOther)}</textarea><div style="margin-top:6px;font-size:11.5px;color:var(--ink-soft);">Nguồn này không gắn với bài nào trong Kho Content nên không lưu lại được kế hoạch — chỉ dùng để xem nhanh.</div>`:''}

        ${!(state.positioning) ? `
          <label style="display:block;font-size:13px;font-weight:600;color:var(--ink-soft);margin:14px 0 6px;">Ngành/đối tượng (không bắt buộc)</label>
          <textarea id="db-quick-context" style="min-height:auto;height:44px;" placeholder="Ví dụ: Coach tài chính cá nhân...">${esc(state.quickContext)}</textarea>
        ` : ''}
      </div>

      ${assetsCardHtml()}

      <div class="card" style="margin-top:16px;">
        <div class="btn-row"><button class="btn" data-action="generate" ${state.generating?'disabled':''}>${state.generating?'Đang gợi ý…':'Đẩy bài (đủ 5 mốc)'}</button> <span style="font-size:11px;color:var(--ink-soft);align-self:center;">(tốn 2 lượt AI — ra đủ 5 mốc trong 1 lần, không phải bấm lại từng mốc)</span></div>
        <div class="hint-box" style="margin-top:10px;">AI cần khoảng 1-2 phút để ra đủ cả 5 mốc, đừng thoát trang khi đang đợi.</div>
        ${state.error?`<div class="error-box">${esc(state.error)}</div>`:''}
      </div>

      ${state.result ? resultHtml() : ''}
    `;
  }

  function assetsCardHtml(){
    return `
      <div class="card" style="margin-top:16px;">
        <h3 style="margin-bottom:4px;">Tài sản muốn đẩy cho bài này</h3>
        <p style="font-size:12.5px;color:var(--ink-soft);margin-bottom:10px;">Chọn 1 hoặc nhiều tài sản muốn dùng — AI sẽ tự phân bổ hợp lý qua 5 mốc (mốc đầu ít cam kết, mốc cuối giá trị cao hơn). Không chọn gì thì để AI tự chọn từ kho.</p>
        ${state.assets.length===0?`<div style="font-size:11.5px;color:var(--ink-soft);">Chưa có tài sản nào.</div>`: `
        <div style="display:flex;flex-direction:column;gap:6px;">
          ${Object.entries(ASSET_KINDS).map(([kind,label])=>{
            const items = state.assets.filter(a=>a.kind===kind);
            if(items.length===0) return '';
            return `<div style="font-size:11px;color:var(--ink-soft);text-transform:uppercase;margin-top:6px;">${esc(label)}</div>` +
              items.map(a=>`
                <label style="display:flex;align-items:center;gap:8px;font-size:13.5px;cursor:pointer;">
                  <input type="checkbox" data-asset-check="${a.id}" ${state.selectedAssetIds.has(a.id)?'checked':''}>
                  ${esc(a.label)}
                </label>
              `).join('');
          }).join('')}
        </div>
        `}
        <div style="margin-top:10px;"><a href="#dinh-vi" style="font-size:12.5px;color:var(--ink-soft);">Thêm/sửa tài sản ở Định Vị →</a></div>
      </div>
    `;
  }

  // Nút "Copy" dùng chung — tra theo key thay vì nhét thẳng text vào attribute HTML (tránh vỡ
  // attribute khi text có dấu ngoặc kép/xuống dòng), luôn đọc đúng state.result mới nhất lúc bấm.
  function copyBtnHtml(field){
    return `<span class="btn-ghost btn btn-sm" style="padding:4px 10px;font-size:11.5px;" data-copy-field="${field}">Copy</span>`;
  }
  function resolveCopyText(field){
    const mocList = (state.result && state.result.moc) || [];
    const [mocKey, kind, idx] = field.split(':');
    const m = mocList.find(x=>x.moc===mocKey);
    if(!m) return '';
    if(kind==='cmt') return m.cmt_tu_dang || '';
    if(kind==='reply') return (m.goi_y_tra_loi_cmt || [])[Number(idx)] || '';
    return '';
  }

  // Gọn thành accordion — mỗi mốc chỉ hiện tên + 1 dòng chiến lược khi đóng, bấm mới mở ra đủ
  // bình luận/gợi ý trả lời/tài sản. Trước đây xổ hết cả 5 mốc đầy đủ liên tiếp, cuộn rất dài,
  // khó nhìn tổng quan mốc nào cần gì (2026-08-20, theo phản hồi chị Quỳnh).
  function resultHtml(){
    const mocList = (state.result && state.result.moc) || [];
    const postId = resolvedPostId();
    return `
      <div class="page-head" style="margin:26px 0 6px;"><div class="tag">Kết quả — bấm từng mốc để xem chi tiết</div></div>
      ${!postId ? `<div class="hint-box" style="margin-bottom:10px;">Nguồn "Khác (dán nội dung)" không tự lưu được — chọn bài từ Lịch Đăng Bài/Kho Content để kế hoạch này tự lưu vào đúng bài đó.</div>` : ''}
      ${state.savedNotice ? `<div class="hint-box" style="margin-bottom:10px;">✓ Đã tự động lưu vào bài này trong Kho Content — mở lại bài đó bất cứ lúc nào để xem/copy, không cần chạy lại.</div>` : ''}
      <div class="card" style="padding:0;overflow:hidden;">
        ${mocList.map((m,i)=>{
          const isOpen = state.expandedMoc===m.moc;
          return `
          <div style="${i>0?'border-top:1px solid var(--line);':''}">
            <div data-toggle-moc="${m.moc}" style="padding:14px 18px;cursor:pointer;display:flex;justify-content:space-between;align-items:center;gap:10px;">
              <div>
                <b style="font-size:14.5px;">${esc(MILESTONE_LABEL[m.moc] || m.moc)}</b>
                ${!isOpen?`<div style="font-size:12.5px;color:var(--ink-soft);margin-top:2px;">${esc(excerpt(m.chien_luoc_moc_nay, 90))}</div>`:''}
              </div>
              <span style="color:var(--ink-soft);flex-shrink:0;">${isOpen?'▾':'▸'}</span>
            </div>
            ${isOpen ? `
            <div style="padding:0 18px 18px;">
              <div style="font-style:italic;color:var(--ink-soft);font-size:12.5px;line-height:1.55;margin-bottom:14px;">${esc(m.chien_luoc_moc_nay)}</div>

              <div style="font-size:11px;font-weight:700;color:var(--gold);text-transform:uppercase;letter-spacing:.05em;font-family:'IBM Plex Mono',monospace;margin-bottom:6px;">📌 Bình luận tự đăng / ghim</div>
              <div style="background:var(--panel);border:1px solid var(--line);border-radius:10px;padding:12px 14px;margin-bottom:14px;display:flex;justify-content:space-between;align-items:flex-start;gap:12px;">
                <div style="font-size:14.5px;color:var(--ink);line-height:1.55;">${esc(m.cmt_tu_dang)}</div>
                ${copyBtnHtml(m.moc+':cmt')}
              </div>

              <div style="font-size:11px;font-weight:700;color:var(--gold);text-transform:uppercase;letter-spacing:.05em;font-family:'IBM Plex Mono',monospace;margin-bottom:6px;">💬 Gợi ý trả lời bình luận người khác</div>
              ${(m.goi_y_tra_loi_cmt||[]).map((c,ci)=>`
                <div style="background:var(--panel);border:1px solid var(--line);border-radius:10px;padding:10px 14px;margin-bottom:8px;display:flex;justify-content:space-between;align-items:center;gap:12px;">
                  <div style="font-size:14px;color:var(--ink);line-height:1.5;">${esc(c)}</div>
                  ${copyBtnHtml(m.moc+':reply:'+ci)}
                </div>
              `).join('')}

              <div style="font-size:11px;font-weight:700;color:var(--gold);text-transform:uppercase;letter-spacing:.05em;font-family:'IBM Plex Mono',monospace;margin:14px 0 6px;">🎯 Tài sản nên gắn</div>
              <div style="font-size:13.5px;color:var(--ink-soft);line-height:1.55;">${m.tai_san_de_xuat && m.tai_san_de_xuat.label ? `<b style="color:var(--ink);">${esc(m.tai_san_de_xuat.label)}</b><br>` : `<i>Chưa nên gắn tài sản nào</i><br>`}${esc((m.tai_san_de_xuat||{}).ly_do||'')}</div>
            </div>
            ` : ''}
          </div>
        `;}).join('')}
      </div>
    `;
  }

  function bind(){
    const resetDraftBtn = container.querySelector('[data-action="reset-draft"]');
    if(resetDraftBtn) resetDraftBtn.onclick = async ()=>{
      if(!(await confirmModal('Xoá kết quả đang làm dở và làm mới? Không khôi phục lại được.'))) return;
      await clearModuleDraft(ctx, DRAFT_KEY);
      state.postSource='lich'; state.postChoice=''; state.topicOther='';
      state.quickContext=''; state.selectedAssetIds=new Set(); state.result=null; state.error=null; state.savedNotice=false;
      draw();
    };
    container.querySelectorAll('[data-post-source]').forEach(el=>{
      el.onclick = ()=>{ state.postSource = el.getAttribute('data-post-source'); state.postChoice = ''; state.savedNotice=false; draw(); };
    });
    const postSelect = container.querySelector('#db-post-select');
    if(postSelect) postSelect.onchange = ()=>{ state.postChoice = postSelect.value; state.savedNotice=false; loadSavedPlanIfAny(); draw(); };
    const postSelectKho = container.querySelector('#db-post-select-kho');
    if(postSelectKho) postSelectKho.onchange = ()=>{ state.postChoice = postSelectKho.value; state.savedNotice=false; loadSavedPlanIfAny(); draw(); };
    const topicOtherEl = container.querySelector('#db-topic-other');
    if(topicOtherEl) topicOtherEl.oninput = ()=>{ state.topicOther = topicOtherEl.value; };

    const qcEl = container.querySelector('#db-quick-context'); if(qcEl) qcEl.oninput = ()=>state.quickContext = qcEl.value;
    container.querySelectorAll('[data-asset-check]').forEach(el=>{
      el.onchange = ()=>{
        const id = el.getAttribute('data-asset-check');
        if(el.checked) state.selectedAssetIds.add(id); else state.selectedAssetIds.delete(id);
      };
    });

    const genBtn = container.querySelector('[data-action="generate"]');
    if(genBtn) genBtn.onclick = generate;

    container.querySelectorAll('[data-toggle-moc]').forEach(el=>{
      el.onclick = ()=>{
        const key = el.getAttribute('data-toggle-moc');
        state.expandedMoc = state.expandedMoc===key ? null : key;
        draw();
      };
    });

    container.querySelectorAll('[data-copy-field]').forEach(el=>{
      el.onclick = async ()=>{
        const text = resolveCopyText(el.getAttribute('data-copy-field'));
        if(!text) return;
        try{
          await navigator.clipboard.writeText(text);
          const old = el.textContent;
          el.textContent = 'Đã copy ✓';
          setTimeout(()=>{ el.textContent = old; }, 1500);
        } catch(e){}
      };
    });
  }

  async function generate(){
    const topic = resolvedTopic();
    if(!topic.trim()) return;
    state.generating = true; state.error = null; state.result = null; state.savedNotice = false; state.expandedMoc = 'm1'; draw();
    const stopProgress = animateProgressButton(container.querySelector('[data-action="generate"]'), 60, 'Đang gợi ý');
    try{
      const preferredAssets = state.assets.filter(a=>state.selectedAssetIds.has(a.id)).map(a=>a.label);
      const data = await callApi('/api/goi-y-day-bai', {
        topic,
        assets: state.assets.map(a=>({ label:a.label, url:a.url })),
        preferred_assets: preferredAssets,
        positioning: state.positioning ? { luot1: state.positioning.luot1, luot2: state.positioning.luot2 } : null,
        quick_context: state.quickContext,
      }, 280000);
      state.result = data.result;
      persistDraft();
      // Tự động lưu ngay vào đúng bài trong Kho Content — không bắt bấm thêm 1 nút riêng nữa
      // (2026-08-20, theo phản hồi chị Quỳnh: vừa đẩy xong là phải có sẵn luôn ở nút trên bài đó).
      await savePlanSilently();
    } catch(e){ state.error = e.message; }
    stopProgress();
    state.generating = false; draw();
  }

  async function savePlanSilently(){
    const postId = resolvedPostId();
    if(!postId || !state.result) return;
    const { error } = await ctx.supabase.from('posts').update({ day_bai_plan: state.result }).eq('id', postId);
    if(error){ state.error = 'Đã ra kết quả nhưng lưu vào Kho Content bị lỗi: ' + error.message; return; }
    state.savedNotice = true;
    // Cập nhật lại state.posts/calendarEntries tại chỗ để dấu "✓ đã có kế hoạch" hiện đúng ngay,
    // không cần tải lại trang.
    const post = state.posts.find(p=>p.id===postId);
    if(post) post.day_bai_plan = state.result;
    state.calendarEntries.forEach(e=>{ if(e.posts && e.post_id===postId) e.posts.day_bai_plan = state.result; });
  }

  boot();
}
window.Modules = window.Modules || {};
window.Modules['day-bai'] = { title:'Đẩy Bài & CTA Comment', render };
})();
