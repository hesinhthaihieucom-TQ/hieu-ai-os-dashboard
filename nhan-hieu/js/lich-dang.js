(function(){
const SLOTS = [ {key:'sang', label:'Sáng'}, {key:'trua', label:'Trưa'}, {key:'toi', label:'Tối'} ];
const DAY_NAMES = ['CN','Thứ 2','Thứ 3','Thứ 4','Thứ 5','Thứ 6','Thứ 7'];

// Khớp mô tả trục nội dung tự do của AI (vd "Trục chính: Tài chính gia đình") sang đúng key trục
// dùng trong Kho Content — cùng nhóm PILLARS bên kho-content.js — để khi khách chưa có bài viết
// sẵn cho slot này, trỏ thẳng về đúng trục thay vì bắt viết từ số 0.
const PILLAR_KEYWORDS = [
  { key:'tai_chinh', words:['tài chính','tich san','tích sản','tiết kiệm','tín dụng','dòng tiền','nợ'] },
  { key:'tam_linh', words:['tâm linh','phong thuỷ','phong thủy','thần số học','phước khí'] },
  { key:'hon_nhan_gia_dinh', words:['hôn nhân','gia đình','tình yêu','nuôi dạy con'] },
  { key:'phat_trien_ban_than', words:['phát triển bản thân','động lực','tư duy','tâm lý','lối sống'] },
  { key:'kinh_doanh', words:['kinh doanh','bán hàng','chiến lược'] },
  { key:'suc_khoe_lam_dep', words:['sức khoẻ','sức khỏe','chăm sóc da','làm đẹp'] },
  { key:'xay_kenh', words:['xây kênh','content','hook','giao tiếp','quan điểm','video','listicle'] },
];
function matchPillarKey(text){
  const t = (text||'').toLowerCase();
  for(const p of PILLAR_KEYWORDS){ if(p.words.some(w=>t.includes(w))) return p.key; }
  return null;
}

function render(container, ctx){
  const state = {
    screen:'loading', weekStart:startOfWeek(new Date()), entries:[], posts:[], pending:null, pickerFor:null, pickerCustomTitle:'', editingEntryId:null,
    positioning:null, quickContext:'', weeklyGoal:'', postsPerDay:1, aiSuggestions:null, aiLoading:false, aiError:null,
    choosingKhoFor:null,
  };

  function draw(){ container.innerHTML = html(); bind(); }

  async function boot(){
    draw();
    if(window.PendingPost){ state.pending = window.PendingPost; window.PendingPost = null; }
    const { data: pos } = await ctx.supabase.from('positioning_results').select('*').eq('user_id', ctx.user.id).maybeSingle();
    state.positioning = (pos && pos.luot1) ? pos : null;
    await Promise.all([applyDraftForCurrentWeek(), loadEntries(), loadPosts()]);
    state.screen='main';
    draw();
  }

  // Gợi ý AI + mục tiêu tuần lưu ở bảng weekly_ai_drafts (Supabase) — trước đây lưu localStorage
  // nên tạo lịch trên điện thoại xong mở web lại không thấy gì, giờ đồng bộ theo tài khoản.
  async function applyDraftForCurrentWeek(){
    const { data: draft } = await ctx.supabase.from('weekly_ai_drafts').select('*')
      .eq('user_id', ctx.user.id).eq('week_start', isoDate(state.weekStart)).maybeSingle();
    state.aiSuggestions = draft ? draft.ai_suggestions : null;
    state.weeklyGoal = draft ? (draft.weekly_goal || '') : '';
    state.postsPerDay = draft ? (draft.posts_per_day || 1) : 1;
    state.quickContext = draft ? (draft.quick_context || '') : '';
  }

  async function saveDraftForCurrentWeek(){
    await ctx.supabase.from('weekly_ai_drafts').upsert({
      user_id: ctx.user.id, week_start: isoDate(state.weekStart),
      ai_suggestions: state.aiSuggestions, weekly_goal: state.weeklyGoal,
      posts_per_day: state.postsPerDay, quick_context: state.quickContext,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,week_start' });
  }

  async function resetWeekDraft(){
    await ctx.supabase.from('weekly_ai_drafts').delete().eq('user_id', ctx.user.id).eq('week_start', isoDate(state.weekStart));
    state.aiSuggestions = null; state.weeklyGoal = ''; state.postsPerDay = 1; state.quickContext = '';
    draw();
  }

  async function loadEntries(){
    const from = isoDate(state.weekStart);
    const toDate = new Date(state.weekStart); toDate.setDate(toDate.getDate()+6);
    const to = isoDate(toDate);
    const { data } = await ctx.supabase.from('calendar_entries').select('*').eq('user_id', ctx.user.id).gte('scheduled_date', from).lte('scheduled_date', to);
    state.entries = data || [];
  }
  async function loadPosts(){
    const { data } = await ctx.supabase.from('posts').select('*').eq('user_id', ctx.user.id).order('created_at', { ascending:false }).limit(30);
    state.posts = data || [];
  }

  function weekDays(){
    return Array.from({length:7}, (_,i)=>{ const d = new Date(state.weekStart); d.setDate(d.getDate()+i); return d; });
  }

  function entryFor(dateStr, slotKey){
    return state.entries.find(e=> e.scheduled_date===dateStr && e.slot===slotKey);
  }

  function suggestionFor(dayIndex, slotKey){
    if(!state.aiSuggestions) return null;
    return state.aiSuggestions.find(s=> s.thu===dayIndex && s.slot===slotKey) || null;
  }

  // Thanh "hoàn thành tuần" — chỉ đếm những ngày ĐÃ QUA (chưa tính hôm nay, hôm nay vẫn còn có thể
  // hành động) để người dùng thấy đúng thành quả đã làm được, không bị nhắc nhở về những ô trống
  // trong tương lai chưa tới hạn. Đếm theo "posted" (người dùng tự tích xác nhận), KHÔNG còn suy tự
  // động từ việc ngày đã qua — xếp lịch không có nghĩa là đã thực sự đăng.
  function weekCompletionHtml(days, todayStr){
    const pastDays = days.filter(d=>isoDate(d) < todayStr);
    if(!pastDays.length) return '';
    const doneCount = state.entries.filter(e=>e.scheduled_date < todayStr && e.posted).length;
    if(doneCount > 0){
      return `<div class="hint-box" style="margin-bottom:16px;background:var(--accent-soft);border-color:var(--accent);display:flex;align-items:center;gap:10px;">
        <span style="font-size:22px;">🎉</span>
        <span><b>Bạn đã hoàn thành ${doneCount} bài</b> trong những ngày đã qua tuần này — cứ vậy phát huy!</span>
      </div>`;
    }
    return `<div class="hint-box" style="margin-bottom:16px;">Chưa có bài nào được đăng trong những ngày đã qua tuần này — bắt đầu ngay hôm nay để không bỏ lỡ tuần này nhé.</div>`;
  }

  function html(){
    if(state.screen==='loading') return `<div class="loading"><div class="spinner"></div><p>Đang tải…</p></div>`;
    const days = weekDays();
    const todayStr = isoDate(new Date());
    const weekLabel = `${fmtDate(days[0])} – ${fmtDate(days[6])}`;
    return `
      <div class="page-head"><div class="tag">Bước 5 · Lịch Đăng Bài</div><h1>Lịch đăng bài theo tuần</h1></div>

      <div class="card" style="margin-bottom:20px;">
        <label style="display:block;font-size:13px;font-weight:600;color:var(--ink-soft);margin-bottom:6px;">Tuần này bạn muốn đẩy mục tiêu gì nhất?</label>
        <textarea id="weekly-goal" style="min-height:56px;" placeholder="Ví dụ: ra mắt khoá học mới, tăng follow, xây niềm tin trước đợt mở bán...">${esc(state.weeklyGoal)}</textarea>
        <label style="display:block;font-size:13px;font-weight:600;color:var(--ink-soft);margin:14px 0 6px;">Mỗi ngày muốn đăng mấy bài?</label>
        <div class="chips">${[1,2,3].map(n=>`<div class="chip ${state.postsPerDay===n?'selected':''}" data-posts-per-day="${n}">${n} bài/ngày</div>`).join('')}</div>
        ${!state.positioning ? `
          <label style="display:block;font-size:13px;font-weight:600;color:var(--ink-soft);margin:14px 0 6px;">Ngành/lĩnh vực &amp; đối tượng của bạn (không bắt buộc)</label>
          <textarea id="quick-context" style="min-height:auto;height:52px;" placeholder="Ví dụ: Coach tài chính cá nhân, hướng tới người mới đi làm...">${esc(state.quickContext)}</textarea>
        ` : ''}
        <div class="btn-row">
          <button class="btn" data-action="ai-suggest" ${state.aiLoading?'disabled':''}>${state.aiLoading?'Đang lên lịch…':'AI gợi ý lịch tuần'}</button>
          <span style="font-size:11px;color:var(--ink-soft);align-self:center;">(tốn 2 lượt AI)</span>
          ${(state.aiSuggestions || state.weeklyGoal) ? `<span class="btn-ghost btn btn-sm" data-action="reset-week">Reset tuần</span>` : ''}
        </div>
        <div style="margin-top:4px;font-size:11.5px;color:var(--ink-soft);">Mục tiêu và gợi ý AI của tuần này được lưu theo tài khoản — xem lại được trên mọi thiết bị, không mất khi thoát ra rồi quay lại, chỉ mất khi bấm "Reset tuần".</div>
        <div class="hint-box" style="margin-top:10px;">AI cần khoảng 1 phút để xếp xong cả tuần — đừng thoát trang khi đang đợi.</div>
        ${!state.positioning ? `<div class="hint-box">Chưa có <a href="#dinh-vi">Định Vị</a> đã lưu — vẫn gợi ý lịch được bình thường, nhưng làm Định Vị trước sẽ bám đúng trục nội dung của bạn hơn.</div>` : ''}
        ${state.aiError?`<div class="error-box">${esc(state.aiError)}</div>`:''}
      </div>

      ${state.pending ? `
        <div class="hint-box" style="display:flex;justify-content:space-between;align-items:center;">
          <span>Đang xếp lịch cho: <b>${esc(state.pending.title||'(không tiêu đề)')}</b> — bấm 1 khung giờ trống bên dưới để xếp.</span>
          <span style="cursor:pointer;font-weight:600;" data-action="cancel-pending">Huỷ</span>
        </div>` : ''}
      <div style="display:flex;justify-content:space-between;align-items:center;margin:18px 0;">
        <span style="cursor:pointer;color:var(--ink-soft);" data-action="prev-week">← Tuần trước</span>
        <b style="font-family:'IBM Plex Mono',monospace;font-size:13px;">${esc(weekLabel)}</b>
        <span style="cursor:pointer;color:var(--ink-soft);" data-action="next-week">Tuần sau →</span>
      </div>
      ${weekCompletionHtml(days, todayStr)}
      <div class="week-grid">
        ${days.map((d,dayIndex)=>{
          const dateStr = isoDate(d);
          const thu = (d.getDay()+6)%7; // 0=Mon..6=Sun, matches AI schema
          const isPast = dateStr < todayStr;
          return `<div class="week-col">
            <div class="day">${DAY_NAMES[d.getDay()]} ${d.getDate()}/${d.getMonth()+1}</div>
            ${SLOTS.map(s=>{
              const e = entryFor(dateStr, s.key);
              const suggestion = !e ? suggestionFor(thu, s.key) : null;

              // Ngày đã qua mà không có bài: không còn gì để hành động (không thể xếp lịch cho quá
              // khứ) — ẩn bớt gợi ý/khung "+" mời bấm. CHỈ gắn nhãn "Đã bỏ lỡ" khi slot đó thực sự
              // từng nằm trong kế hoạch (AI có gợi ý cho đúng slot này) — nếu lịch chỉ định 1 bài/
              // ngày, 2 buổi còn lại chưa bao giờ được lên kế hoạch, không được tính là "bỏ lỡ".
              if(isPast && !e){
                if(suggestion){
                  return `<div class="week-slot" style="opacity:.55;min-height:auto;padding:6px;text-align:center;border-color:var(--danger);">
                    <div class="slot-label">${s.label}</div>
                    <div style="font-size:10.5px;color:var(--danger);margin-top:2px;">Đã bỏ lỡ</div>
                  </div>`;
                }
                return `<div class="week-slot" style="opacity:.2;min-height:auto;padding:6px;border-style:none;"></div>`;
              }

              if(state.pickerFor && state.pickerFor.date===dateStr && state.pickerFor.slot===s.key){
                return `<div class="week-slot filled">
                  <div class="slot-label">${s.label}</div>
                  ${suggestion?`<div style="font-size:11px;color:var(--accent);margin-bottom:4px;">Gợi ý: ${esc(suggestion.chu_de)}</div>`:''}
                  <select data-picker-select style="width:100%;margin-top:4px;font-size:12px;padding:6px;">
                    <option value="">— Chọn bài đã viết —</option>
                    ${state.posts.map(p=>`<option value="${p.id}" ${e && e.post_id===p.id?'selected':''} title="${esc(p.title||'(không tiêu đề)')}">${esc(p.title||'(không tiêu đề)')}</option>`).join('')}
                  </select>
                  <div style="font-size:10px;color:var(--ink-soft);margin:6px 0 2px;">hoặc tự nhập tên bài</div>
                  <input type="text" data-picker-custom placeholder="Tên bài tự điền..." value="${e && !e.post_id ? esc(e.title||'') : ''}" style="width:100%;font-size:12px;padding:6px;border:1px solid var(--line);border-radius:6px;">
                  <div style="display:flex;gap:6px;margin-top:6px;">
                    <button class="btn btn-sm" data-picker-save="${dateStr}|${s.key}">Lưu</button>
                    <span style="align-self:center;font-size:11px;color:var(--ink-soft);cursor:pointer;" data-picker-cancel="1">Huỷ</span>
                  </div>
                </div>`;
              }
              if(e){
                const linkedPost = e.post_id ? state.posts.find(p=>p.id===e.post_id) : null;
                // Luôn hiện đủ thông tin bài (tiêu đề/dạng content) kể cả sau khi đã tích "đã đăng" —
                // chỉ giữ ĐÚNG 1 chỗ báo trạng thái đã đăng (nhãn trên đầu ô), bỏ hẳn checkbox riêng
                // bên dưới để khỏi lặp 2 nút cùng ý nghĩa. Nhãn trên đầu bấm vào là tự bật/tắt trạng
                // thái đã đăng — không cần checkbox riêng nữa.
                return `<div class="week-slot filled">
                  <div class="slot-label">${s.label} · <span data-toggle-posted="${e.id}" style="cursor:pointer;color:${e.posted?'var(--accent)':'var(--ink-soft)'};text-decoration:underline;text-decoration-style:dotted;" title="${e.posted?'Bấm để bỏ đánh dấu':'Bấm để đánh dấu đã đăng thật'}">${e.posted?'✓ Đã đăng':'Đã chọn bài'}</span></div>
                  <b style="font-size:12.5px;">${esc(e.title||'')}</b>
                  ${e.format?`<div style="color:var(--ink-soft);font-size:11px;margin-top:2px;">${esc(e.format)}</div>`:''}
                  <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:8px;">
                    ${linkedPost?`<span style="color:var(--accent);font-size:11px;cursor:pointer;font-weight:600;" data-view-post="${e.id}">Xem bài →</span>`:''}
                    <span style="color:var(--ink-soft);font-size:11px;cursor:pointer;" data-edit-slot="${dateStr}|${s.key}">Sửa</span>
                    <span style="color:var(--danger);font-size:11px;cursor:pointer;" data-remove="${e.id}">Xoá</span>
                  </div>
                </div>`;
              }
              if(suggestion){
                // Đang cầm sẵn 1 bài cụ thể để xếp lịch (bấm "Đưa vào lịch" từ Viết Content) — ưu
                // tiên xếp đúng bài đó vào đây khi bấm, thay vì chạy theo nhánh gợi ý AI của ô này
                // (trước đây bấm vào sẽ lỡ nhảy sang Kho Content/Viết Content, mất luôn bài đang cầm).
                if(state.pending){
                  return `<div class="week-slot" data-empty="${dateStr}|${s.key}" style="cursor:pointer;border-style:dashed;border-color:var(--gold);background:#FBF6E9;">
                    <div class="slot-label">${s.label} · <span style="color:var(--gold);">Gợi ý AI</span></div>
                    ${suggestion.truc_noi_dung?`<div style="font-size:10px;color:var(--accent);font-weight:600;margin-bottom:3px;">${esc(suggestion.truc_noi_dung)}</div>`:''}
                    <div style="color:var(--accent);font-size:11.5px;font-weight:600;margin-top:6px;">Bấm để xếp bài đang chờ vào đây →</div>
                  </div>`;
                }
                const matchedPost = suggestion.bai_co_san ? state.posts.find(p=>p.title===suggestion.bai_co_san) : null;
                return `<div class="week-slot" style="border-style:dashed;border-color:var(--gold);background:#FBF6E9;">
                  <div class="slot-label">${s.label} · <span style="color:var(--gold);">Gợi ý AI</span></div>
                  ${suggestion.truc_noi_dung?`<div style="font-size:10px;color:var(--accent);font-weight:600;margin-bottom:3px;">${esc(suggestion.truc_noi_dung)}</div>`:''}
                  <b style="font-size:12px;">${esc(matchedPost ? matchedPost.title : (suggestion.chu_de || 'Chưa chọn bài cụ thể'))}</b>
                  ${matchedPost ? `<div style="color:var(--ink-soft);font-size:10.5px;margin-top:2px;">Bài đã viết sẵn</div>` : (suggestion.dinh_dang ? `<div style="color:var(--ink-soft);font-size:10.5px;margin-top:2px;">${esc(suggestion.dinh_dang)}</div>` : '')}
                  <div style="display:flex;gap:6px;margin-top:6px;flex-wrap:wrap;align-items:center;">
                    ${matchedPost
                      ? `<button class="btn btn-sm" data-accept-suggestion="${dateStr}|${s.key}">Dùng bài này</button>`
                      : state.choosingKhoFor===`${dateStr}|${s.key}`
                        ? `<span style="font-size:11px;color:var(--ink-soft);">Tìm ở kho nào?</span>
                           <span class="btn-ghost btn btn-sm" data-write-for-slot="kho-content|${dateStr}|${s.key}">Kho Content</span>
                           <span class="btn-ghost btn btn-sm" data-write-for-slot="kho-hook|${dateStr}|${s.key}">Kho Hook</span>`
                        : `<span class="btn-ghost btn btn-sm" data-choose-kho="${dateStr}|${s.key}">Chọn bài mẫu đúng trục →</span>`
                    }
                    <span style="align-self:center;color:var(--ink-soft);font-size:11px;cursor:pointer;" data-empty="${dateStr}|${s.key}">Chọn khác</span>
                  </div>
                </div>`;
              }
              return `<div class="week-slot" data-empty="${dateStr}|${s.key}" style="cursor:pointer;">
                <div class="slot-label">${s.label}</div>
                <div style="color:var(--ink-soft);font-size:20px;text-align:center;margin-top:4px;">+</div>
              </div>`;
            }).join('')}
          </div>`;
        }).join('')}
      </div>
    `;
  }

  function bind(){
    const goalInput = container.querySelector('#weekly-goal');
    if(goalInput) goalInput.oninput = ()=>{ state.weeklyGoal = goalInput.value; saveDraftForCurrentWeek(); };
    const quickContext = container.querySelector('#quick-context');
    if(quickContext) quickContext.oninput = ()=>{ state.quickContext = quickContext.value; saveDraftForCurrentWeek(); };
    container.querySelectorAll('[data-posts-per-day]').forEach(el=>{
      el.onclick = ()=>{ state.postsPerDay = Number(el.getAttribute('data-posts-per-day')); saveDraftForCurrentWeek(); draw(); };
    });
    const aiBtn = container.querySelector('[data-action="ai-suggest"]');
    if(aiBtn) aiBtn.onclick = fetchAiSchedule;

    const prev = container.querySelector('[data-action="prev-week"]');
    if(prev) prev.onclick = async ()=>{ state.weekStart.setDate(state.weekStart.getDate()-7); await Promise.all([applyDraftForCurrentWeek(), loadEntries()]); draw(); };
    const next = container.querySelector('[data-action="next-week"]');
    if(next) next.onclick = async ()=>{ state.weekStart.setDate(state.weekStart.getDate()+7); await Promise.all([applyDraftForCurrentWeek(), loadEntries()]); draw(); };
    const resetBtn = container.querySelector('[data-action="reset-week"]');
    if(resetBtn) resetBtn.onclick = async ()=>{
      if(!(await confirmModal('Xoá gợi ý AI và mục tiêu của cả tuần này? Không khôi phục được.'))) return;
      resetWeekDraft();
    };
    const cancelPending = container.querySelector('[data-action="cancel-pending"]');
    if(cancelPending) cancelPending.onclick = ()=>{ state.pending = null; draw(); };

    container.querySelectorAll('[data-empty]').forEach(el=>{
      el.onclick = async ()=>{
        const [dateStr, slotKey] = el.getAttribute('data-empty').split('|');
        if(state.pending){
          await ctx.supabase.from('calendar_entries').insert({
            user_id: ctx.user.id, post_id: state.pending.id, scheduled_date: dateStr, slot: slotKey,
            title: state.pending.title, format: (state.pending.structure && state.pending.structure.format) || null,
            cta: (state.pending.structure && state.pending.structure.cta) || null,
          });
          state.pending = null;
          await loadEntries();
          draw();
        } else {
          state.pickerFor = { date:dateStr, slot:slotKey };
          draw();
        }
      };
    });

    container.querySelectorAll('[data-accept-suggestion]').forEach(el=>{
      el.onclick = async ()=>{
        const [dateStr, slotKey] = el.getAttribute('data-accept-suggestion').split('|');
        const thu = (new Date(dateStr).getDay()+6)%7;
        const s = suggestionFor(thu, slotKey);
        if(!s) return;
        const matchedPost = s.bai_co_san ? state.posts.find(p=>p.title===s.bai_co_san) : null;
        await ctx.supabase.from('calendar_entries').insert({
          user_id: ctx.user.id, post_id: matchedPost ? matchedPost.id : null, scheduled_date: dateStr, slot: slotKey,
          title: matchedPost ? matchedPost.title : s.chu_de, format: s.dinh_dang, cta: s.cta,
        });
        await loadEntries();
        draw();
      };
    });
    container.querySelectorAll('[data-choose-kho]').forEach(el=>{
      el.onclick = ()=>{ state.choosingKhoFor = el.getAttribute('data-choose-kho'); draw(); };
    });
    container.querySelectorAll('[data-write-for-slot]').forEach(el=>{
      el.onclick = ()=>{
        const [dest, dateStr, slotKey] = el.getAttribute('data-write-for-slot').split('|');
        const thu = (new Date(dateStr).getDay()+6)%7;
        const s = suggestionFor(thu, slotKey);
        // Chưa có bài viết sẵn cho slot này — trỏ về Kho Content Viral HOẶC Kho Hook Viral tuỳ lựa
        // chọn của người dùng, để tự chọn bài/hook mẫu. Khớp được đúng trục AI gợi ý thì lọc sẵn
        // luôn; không khớp được (mô tả trục lạ, AI viết khác cách) thì vẫn vào màn chọn trục, không
        // rơi về Viết Content nữa.
        window.PendingPillar = matchPillarKey(s && s.truc_noi_dung) || 'all';
        location.hash = dest;
      };
    });

    container.querySelectorAll('[data-picker-cancel]').forEach(el=>{
      el.onclick = ()=>{ state.pickerFor = null; state.editingEntryId = null; draw(); };
    });
    container.querySelectorAll('[data-picker-save]').forEach(el=>{
      el.onclick = async ()=>{
        const [dateStr, slotKey] = el.getAttribute('data-picker-save').split('|');
        const select = container.querySelector('[data-picker-select]');
        const customInput = container.querySelector('[data-picker-custom]');
        const postId = select ? select.value : '';
        const post = state.posts.find(p=>p.id===postId);
        const customTitle = customInput ? customInput.value.trim() : '';
        const fields = {
          post_id: post ? post.id : null,
          title: post ? post.title : (customTitle || 'Bài mới'),
          format: post && post.structure ? (post.structure.format||null) : null,
          cta: post && post.structure ? (post.structure.cta||null) : null,
        };
        // "Sửa" mở lại picker cho 1 ô ĐÃ có bài — cập nhật đúng dòng cũ thay vì tạo thêm 1 dòng mới
        // trùng slot/ngày (state.editingEntryId chỉ được gán khi bấm "Sửa", xem data-edit-slot).
        if(state.editingEntryId){
          await ctx.supabase.from('calendar_entries').update(fields).eq('id', state.editingEntryId);
        } else {
          await ctx.supabase.from('calendar_entries').insert({ user_id: ctx.user.id, scheduled_date: dateStr, slot: slotKey, ...fields });
        }
        state.pickerFor = null;
        state.editingEntryId = null;
        await loadEntries();
        draw();
      };
    });
    container.querySelectorAll('[data-edit-slot]').forEach(el=>{
      el.onclick = ()=>{
        const [dateStr, slotKey] = el.getAttribute('data-edit-slot').split('|');
        const entry = entryFor(dateStr, slotKey);
        state.editingEntryId = entry ? entry.id : null;
        state.pickerFor = { date:dateStr, slot:slotKey };
        draw();
      };
    });
    container.querySelectorAll('[data-toggle-posted]').forEach(el=>{
      el.onclick = async ()=>{
        const id = el.getAttribute('data-toggle-posted');
        const entry = state.entries.find(x=>x.id===id);
        const nextPosted = !(entry && entry.posted);
        await ctx.supabase.from('calendar_entries').update({ posted: nextPosted }).eq('id', id);
        await loadEntries();
        draw();
      };
    });
    container.querySelectorAll('[data-view-post]').forEach(el=>{
      el.onclick = ()=>{
        const entry = state.entries.find(x=>x.id===el.getAttribute('data-view-post'));
        const post = entry && entry.post_id ? state.posts.find(p=>p.id===entry.post_id) : null;
        if(post) openTextModal(post.title, post.content);
      };
    });
    container.querySelectorAll('[data-remove]').forEach(el=>{
      el.onclick = async ()=>{
        const id = el.getAttribute('data-remove');
        if(!(await confirmModal('Xoá bài đã xếp ở ô này?'))) return;
        await ctx.supabase.from('calendar_entries').delete().eq('id', id);
        await loadEntries();
        draw();
      };
    });
  }

  async function fetchAiSchedule(){
    if(state.aiLoading) return;
    state.aiLoading = true; state.aiError = null; draw();
    const stopProgress = animateProgressButton(container.querySelector('[data-action="ai-suggest"]'), 55, 'Đang lên lịch');
    acquireWakeLock();
    try{
      const scheduledPostIds = new Set(state.entries.map(e=>e.post_id).filter(Boolean));
      const unscheduledPosts = state.posts.filter(p=>!scheduledPostIds.has(p.id)).slice(0, 15)
        .map(p=>({ title:p.title, content:p.content }));
      const data = await callApi('/api/goi-y-lich', {
        positioning: state.positioning ? { luot1: state.positioning.luot1, luot2: state.positioning.luot2 } : null,
        quick_context: state.quickContext,
        weekly_goal: state.weeklyGoal,
        posts_per_day: state.postsPerDay,
        existing_posts: unscheduledPosts,
      }, 280000);
      state.aiSuggestions = data.result.lich;
      saveDraftForCurrentWeek();
    } catch(e){ state.aiError = e.message; }
    stopProgress(); releaseWakeLock();
    state.aiLoading = false;
    draw();
  }

  boot();
}

window.Modules = window.Modules || {};
window.Modules['lich-dang'] = { title:'Lịch Đăng Bài', render };
})();
