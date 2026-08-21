(function(){
function render(container, ctx){
  const isAdmin = !!(ctx.profile && ctx.profile.role === 'admin');
  const state = { screen:'loading', pendingContent:[], pendingHooks:[], profilesById:{}, actingId:null, error:null,
    fixingLineBreaks:false, fixResult:null, rewardMsg:null };

  function draw(){ container.innerHTML = html(); bind(); }

  async function boot(){
    if(!isAdmin){ state.screen = 'denied'; draw(); return; }
    draw();
    await loadPending();
    state.screen = 'main';
    draw();
  }

  async function loadPending(){
    const [{ data: pc }, { data: ph }] = await Promise.all([
      ctx.supabase.from('content_bank_personal').select('*').eq('share_status','pending').order('created_at', { ascending:true }),
      ctx.supabase.from('hooks_bank_personal').select('*').eq('share_status','pending').order('created_at', { ascending:true }),
    ]);
    state.pendingContent = pc || [];
    state.pendingHooks = ph || [];
    const userIds = [...new Set([...state.pendingContent, ...state.pendingHooks].map(x=>x.user_id))];
    if(userIds.length){
      const { data: profs } = await ctx.supabase.from('profiles').select('id,email,full_name').in('id', userIds);
      state.profilesById = Object.fromEntries((profs||[]).map(p=>[p.id, p]));
    }
  }

  function submitterLabel(userId){
    const p = state.profilesById[userId];
    if(!p) return userId;
    return p.full_name ? `${p.full_name} (${p.email||''})` : (p.email || userId);
  }

  function viralMetaHtml(item){
    if(!item.is_viral) return '';
    const stats = [item.viral_views && `view ${item.viral_views}`, item.viral_likes && `like ${item.viral_likes}`].filter(Boolean).join(', ');
    return `<span style="color:var(--gold);font-weight:600;">VIRAL${stats?` · ${esc(stats)}`:''}</span>`;
  }

  function html(){
    if(state.screen==='loading') return `<div class="loading"><div class="spinner"></div><p>Đang tải…</p></div>`;
    if(state.screen==='denied') return `<div class="page-head"><h1>Không có quyền truy cập</h1><p>Mục này chỉ dành cho quản trị viên.</p></div>`;

    const total = state.pendingContent.length + state.pendingHooks.length;
    return `
      <div class="page-head"><h1>Quản trị Kho nội dung</h1><p>Duyệt content/hook do người dùng đề xuất đẩy từ Kho của tôi lên Kho chung — chỉ hiển thị công khai sau khi được duyệt ở đây.</p></div>
      ${state.error?`<div class="error-box">${esc(state.error)}</div>`:''}
      ${state.rewardMsg?`<div class="hint-box">${esc(state.rewardMsg)}</div>`:''}

      <div class="card" style="margin-bottom:20px;">
        <label style="display:block;font-size:13px;font-weight:600;color:var(--ink-soft);margin-bottom:8px;">Dọn xuống dòng cho bài cũ trong Kho</label>
        <div class="hint-box" style="margin-bottom:10px;">Chạy lại hàm tách đoạn tự động (miễn phí, không qua AI) cho các bài đã lưu từ trước khi tính năng này ra đời — chỉ sửa bài nào thực sự đang dính liền chữ, không đụng bài đã ổn. Bấm 1 lần là đủ, chạy lại nhiều lần cũng không sao (không tách trùng).</div>
        <button class="btn btn-sm" data-action="fix-linebreaks" ${state.fixingLineBreaks?'disabled':''}>${state.fixingLineBreaks?'Đang dọn…':'Dọn xuống dòng cho Kho Content'}</button>
        ${state.fixResult?`<div style="margin-top:10px;font-size:13px;color:var(--accent);">${esc(state.fixResult)}</div>`:''}
      </div>
      ${total===0 ? `<div class="card" style="color:var(--ink-soft);">Không có đề xuất nào đang chờ duyệt.</div>` : ''}

      ${state.pendingContent.length ? `
        <h3 style="font-family:'IBM Plex Mono',monospace;font-size:13px;color:var(--ink-soft);text-transform:uppercase;letter-spacing:.05em;margin:20px 0 12px;">Đề xuất Content (${state.pendingContent.length})</h3>
        ${state.pendingContent.map(item=>`
          <div class="section">
            <div class="meta" style="font-family:'IBM Plex Mono',monospace;font-size:11px;color:var(--ink-soft);text-transform:uppercase;margin-bottom:6px;">
              ${esc(submitterLabel(item.user_id))} · ${new Date(item.created_at).toLocaleDateString('vi-VN')} ${viralMetaHtml(item)?' · '+viralMetaHtml(item):''}
            </div>
            <h3>${esc(item.title||'(không tiêu đề)')}</h3>
            <div class="body">${esc(excerpt(item.content||'', 400))}</div>
            <div class="btn-row" style="margin-top:14px;justify-content:flex-start;">
              <button class="btn btn-sm" data-approve-content="${item.id}" ${state.actingId===item.id?'disabled':''}>${state.actingId===item.id?'Đang xử lý…':'Duyệt lên Kho chung'}</button>
              <span class="btn-ghost btn btn-sm" data-reject-content="${item.id}">Từ chối</span>
            </div>
          </div>
        `).join('')}
      ` : ''}

      ${state.pendingHooks.length ? `
        <h3 style="font-family:'IBM Plex Mono',monospace;font-size:13px;color:var(--ink-soft);text-transform:uppercase;letter-spacing:.05em;margin:20px 0 12px;">Đề xuất Hook (${state.pendingHooks.length})</h3>
        ${state.pendingHooks.map(item=>`
          <div class="section">
            <div class="meta" style="font-family:'IBM Plex Mono',monospace;font-size:11px;color:var(--ink-soft);text-transform:uppercase;margin-bottom:6px;">
              ${esc(submitterLabel(item.user_id))} · ${new Date(item.created_at).toLocaleDateString('vi-VN')} ${viralMetaHtml(item)?' · '+viralMetaHtml(item):''}
            </div>
            <div class="body"><b>${esc(item.hook_text)}</b>${item.note?`<br><span style="color:var(--ink-soft);">${esc(item.note)}</span>`:''}</div>
            <div class="btn-row" style="margin-top:14px;justify-content:flex-start;">
              <button class="btn btn-sm" data-approve-hook="${item.id}" ${state.actingId===item.id?'disabled':''}>${state.actingId===item.id?'Đang xử lý…':'Duyệt lên Kho chung'}</button>
              <span class="btn-ghost btn btn-sm" data-reject-hook="${item.id}">Từ chối</span>
            </div>
          </div>
        `).join('')}
      ` : ''}
    `;
  }

  function bind(){
    container.querySelectorAll('[data-approve-content]').forEach(el=>{
      el.onclick = ()=>approveContent(el.getAttribute('data-approve-content'));
    });
    container.querySelectorAll('[data-reject-content]').forEach(el=>{
      el.onclick = ()=>rejectItem('content_bank_personal', el.getAttribute('data-reject-content'));
    });
    container.querySelectorAll('[data-approve-hook]').forEach(el=>{
      el.onclick = ()=>approveHook(el.getAttribute('data-approve-hook'));
    });
    container.querySelectorAll('[data-reject-hook]').forEach(el=>{
      el.onclick = ()=>rejectItem('hooks_bank_personal', el.getAttribute('data-reject-hook'));
    });
    const fixBtn = container.querySelector('[data-action="fix-linebreaks"]');
    if(fixBtn) fixBtn.onclick = fixLineBreaksBulk;
  }

  // Chạy 1 lần cho bài lưu TRƯỚC KHI kho-content.js tự tách đoạn lúc lưu — chỉ sửa được Kho chung
  // (content_bank_shared, có quyền ghi admin) và đúng Kho của tôi của chính tài khoản đang đăng
  // nhập (content_bank_personal chỉ cho chủ sở hữu ghi theo RLS, không sửa được của user khác).
  async function fixLineBreaksBulk(){
    if(state.fixingLineBreaks) return;
    state.fixingLineBreaks = true; state.fixResult = null; draw();
    let sharedChecked = 0, sharedFixed = 0, personalChecked = 0, personalFixed = 0;
    try{
      const { data: shared } = await ctx.supabase.from('content_bank_shared').select('id,content');
      for(const row of (shared||[])){
        sharedChecked++;
        const fixed = breakSentences(row.content||'');
        if(fixed !== row.content){
          await ctx.supabase.from('content_bank_shared').update({ content: fixed }).eq('id', row.id);
          sharedFixed++;
        }
      }
      const { data: personal } = await ctx.supabase.from('content_bank_personal').select('id,content').eq('user_id', ctx.user.id);
      for(const row of (personal||[])){
        personalChecked++;
        const fixed = breakSentences(row.content||'');
        if(fixed !== row.content){
          await ctx.supabase.from('content_bank_personal').update({ content: fixed }).eq('id', row.id);
          personalFixed++;
        }
      }
      state.fixResult = `Xong — Kho chung: sửa ${sharedFixed}/${sharedChecked} bài. Kho của tôi (tài khoản này): sửa ${personalFixed}/${personalChecked} bài.`;
    } catch(e){
      state.fixResult = `Có lỗi xảy ra: ${e.message}`;
    }
    state.fixingLineBreaks = false;
    draw();
  }

  // Thưởng cho người đóng góp content VIRAL (is_viral=true) được duyệt thành công — theo yêu cầu chị
  // Quỳnh 21/8, thưởng lúc ADMIN BẤM DUYỆT (không phải lúc user gửi) để tránh gửi bừa farm lượt, vì
  // gửi thôi chưa được gì, phải qua được vòng duyệt tay này mới tính. Không áp cho content thường
  // (case học viên, câu chuyện cá nhân...) hay cho hook — chỉ đúng "content viral" như đã chốt.
  const LUOT_THUONG_VIRAL = 5;
  async function creditViralBonus(userId){
    const { data: rows } = await ctx.supabase.from('profiles')
      .select('has_paid,trial_ai_uses,paid_ai_uses,paid_ai_month,paid_ai_bonus,email,full_name').eq('id', userId);
    const p = rows && rows[0];
    if(!p) return null;
    if(p.has_paid){
      const month = new Date().toISOString().slice(0,7);
      const sameMonth = p.paid_ai_month === month;
      const patch = sameMonth
        ? { paid_ai_bonus: (p.paid_ai_bonus||0) + LUOT_THUONG_VIRAL }
        : { paid_ai_month: month, paid_ai_uses: 0, paid_ai_bonus: LUOT_THUONG_VIRAL };
      await ctx.supabase.from('profiles').update(patch).eq('id', userId);
    } else {
      await ctx.supabase.from('profiles').update({ trial_ai_uses: Math.max(0, (p.trial_ai_uses||0) - LUOT_THUONG_VIRAL) }).eq('id', userId);
    }
    return p.full_name ? `${p.full_name} (${p.email||''})` : (p.email || userId);
  }

  async function approveContent(id){
    const item = state.pendingContent.find(x=>x.id===id);
    if(!item || state.actingId) return;
    state.actingId = id; state.error = null; state.rewardMsg = null; draw();
    const { error: insertError } = await ctx.supabase.from('content_bank_shared').insert({
      created_by: item.user_id, title: item.title, content: item.content, source_type: item.source_type, tags: item.tags,
    });
    if(insertError){ state.error = insertError.message; state.actingId = null; draw(); return; }
    await ctx.supabase.from('content_bank_personal').update({ share_status:'approved', reviewed_at: new Date().toISOString() }).eq('id', id);
    if(item.is_viral){
      const who = await creditViralBonus(item.user_id);
      if(who) state.rewardMsg = `Đã cộng +${LUOT_THUONG_VIRAL} lượt AI cho ${who} (content viral vừa duyệt).`;
    }
    state.actingId = null;
    await loadPending();
    draw();
  }

  async function approveHook(id){
    const item = state.pendingHooks.find(x=>x.id===id);
    if(!item || state.actingId) return;
    state.actingId = id; state.error = null; draw();
    const { error: insertError } = await ctx.supabase.from('hooks_bank_shared').insert({
      created_by: item.user_id, hook_text: item.hook_text, category: item.category, note: item.note, tags: item.tags,
    });
    if(insertError){ state.error = insertError.message; state.actingId = null; draw(); return; }
    await ctx.supabase.from('hooks_bank_personal').update({ share_status:'approved', reviewed_at: new Date().toISOString() }).eq('id', id);
    state.actingId = null;
    await loadPending();
    draw();
  }

  async function rejectItem(table, id){
    if(state.actingId) return;
    state.actingId = id; draw();
    await ctx.supabase.from(table).update({ share_status:'rejected', reviewed_at: new Date().toISOString() }).eq('id', id);
    state.actingId = null;
    await loadPending();
    draw();
  }

  boot();
}
window.Modules = window.Modules || {};
window.Modules['quan-tri-kho'] = { title:'Quản trị Kho nội dung', render };
})();
