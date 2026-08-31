(function(){
const SLOTS = [ {key:'sang', label:'Sáng'}, {key:'trua', label:'Trưa'}, {key:'toi', label:'Tối'} ];
// Giờ mặc định nếu profile chưa có (chưa chạy migrate/tài khoản cũ) — PHẢI khớp tay với default ở
// cột profiles.slot_time_* trong schema_full.sql.
const DEFAULT_SLOT_TIME = { sang:'08:00', trua:'12:00', toi:'19:00' };
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

// Chỉ trỏ vào tab "Lịch" (mặc định khi vào trang) — tab "Thông báo & giờ đăng" đơn giản hơn nhiều,
// không cần tour riêng.
const TOUR_STEPS = [
  { selector: '.tab-row', title: '2 tab của trang này', text: 'Tab "Lịch" xem/xếp lịch đăng bài theo tuần. Tab "Thông báo & giờ đăng" chỉnh giờ đăng mặc định mỗi buổi và bật nhắc nhở.' },
  { selector: '.week-grid', title: 'Lịch tuần', text: 'Mỗi cột là 1 ngày, mỗi ô là 1 buổi (Sáng/Trưa/Tối). Bấm vào ô trống để chọn bài đã viết xếp vào, hoặc bấm "Gợi ý AI" (nếu có) để xếp nhanh theo gợi ý.' },
  { selector: '#goal-card', title: 'AI gợi ý lịch tuần', text: 'Nói mục tiêu tuần này, AI gợi ý CHỦ ĐỀ cho từng ô trống — bạn vẫn tự vào Kho Content chọn/viết bài cho từng ô.' },
  { selector: '#autofill-card', title: 'AI tự viết + xếp cả tuần', text: 'Khác với gợi ý chủ đề ở trên — cái này AI viết bài HOÀN CHỈNH và xếp thẳng vào ô trống luôn, đỡ công nhất.' },
  { selector: '#recording-card', title: 'Lịch công việc content', text: 'Đặt lịch nhắc việc content sắp tới (quay video, họp nhóm, deadline...) — không chỉ riêng buổi quay, không giới hạn buổi trong ngày như lịch đăng bài ở trên.' },
];

function render(container, ctx){
  const state = {
    screen:'loading', weekStart:startOfWeek(new Date()), entries:[], posts:[], pending:null, pickerFor:null, pickerCustomTitle:'', editingEntryId:null,
    positioning:null, quickContext:'', weeklyGoal:'', postsPerDay:1, aiSuggestions:null, aiLoading:false, aiError:null,
    choosingKhoFor:null,
    regenWeekLoading:false, regenWeekError:null,
    autoFillMode:'kho', autoFillBusy:false, autoFillError:null, autoFillResult:null, autoFillCustomInstructions:'',
    recordingSchedule:[], newRecordingTitle:'', newRecordingDate:'', newRecordingTime:'', recordingSaving:false, recordingError:null,
    tab:'lich', weekLoadError:null, highlightAutoFill:false,
    // Bố cục mới (2026-08-29, theo phản hồi chị Quỳnh "khó nhìn quá, rối"): 3 khối công cụ (mục tiêu
    // tuần, AI tự viết cả tuần, lịch công việc content) thu gọn mặc định, chỉ hiện 1 dòng tóm tắt —
    // bấm mới bung ra. Luôn thu gọn lại từ đầu mỗi lần vào trang, không nhớ qua lần sau — đơn giản
    // hơn thêm 1 tầng lưu trữ chỉ để nhớ trạng thái mở/đóng của UI.
    toolsExpanded: { goal:false, autofill:false, recording:false },
    // 2 lane độc lập trong cùng calendar_entries (cột channel) — 'ca_nhan' mặc định cho MỌI user
    // (kế hoạch FB cá nhân, tự đăng tay, cách dùng gốc); 'fanpage' chỉ admin chuyển sang được, dùng
    // cho lane auto-đăng Fanpage (xem toggle ở calendarTabHtml). Không lưu draft — luôn mở lại về
    // 'ca_nhan', tránh admin quên đang ở lane nào giữa các lần vào lại trang.
    channel:'ca_nhan',
    pushSupported: !!(window.PushManager && navigator.serviceWorker && window.Notification),
    pushPermission: window.Notification ? Notification.permission : 'denied',
    pushSubscribed: false, pushBusy: false, pushError: null,
    testPushBusy: false, testPushResult: null,
    slotTimeSang: (ctx.profile && ctx.profile.slot_time_sang) || '08:00',
    slotTimeTrua: (ctx.profile && ctx.profile.slot_time_trua) || '12:00',
    slotTimeToi: (ctx.profile && ctx.profile.slot_time_toi) || '19:00',
    slotTimeSaving: false, slotTimeSaved: false,
  };

  function draw(){ container.innerHTML = html(); bind(); }

  // Trước đây các truy vấn Supabase dưới đây KHÔNG có giới hạn thời gian chờ — mạng chập chờn (rất
  // hay gặp trên di động) khiến trang treo ở màn hình "Đang tải…" MÃI MÃI, không cách nào thoát hay
  // thử lại (phát hiện 2026-08-24: nhiều khách báo Lịch Đăng Bài "quay quay không vào được" trên
  // điện thoại). Bọc withTimeout() (util.js) ở TỪNG hàm tải riêng — vừa sửa được boot() lần đầu vào
  // trang, vừa sửa luôn các lần bấm "Tuần trước/Tuần sau" (gọi lại đúng các hàm này).
  async function boot(){
    state.screen = 'loading'; draw();
    if(window.PendingPost){ state.pending = window.PendingPost; window.PendingPost = null; }
    // Tới đây từ nút "Xếp lịch cả tuần ngay" ở màn hình kết quả Định Vị (nhan-hieu/js/dinh-vi.js) —
    // đưa thẳng về tab Lịch (đã là mặc định) rồi cuộn + nháy sáng đúng khối "AI tự viết + xếp cả
    // tuần" thay vì tự bấm hộ (vẫn để khách tự chọn Cách 1/Cách 2 và tự bấm, vì thao tác này TỐN LƯỢT
    // THẬT — không nên tự ý bấm thay).
    const pendingAutoFill = !!window.PendingAutoFillWeek;
    if(pendingAutoFill) window.PendingAutoFillWeek = null;
    try{
      const { data: pos, error } = await withTimeout(
        ctx.supabase.from('positioning_results').select('*').eq('user_id', ctx.user.id).maybeSingle(),
        12000, 'Kết nối mạng chậm/không ổn định — không tải được trang. Kiểm tra mạng rồi thử lại.'
      );
      if(error) throw new Error(error.message);
      state.positioning = (pos && pos.luot1) ? pos : null;
      await Promise.all([applyDraftForCurrentWeek(), loadEntries(), loadPosts(), loadRecordingSchedule()]);
      state.screen='main';
    } catch(e){
      state.screen='error';
      state.bootError = e.message;
    }
    if(pendingAutoFill && state.screen==='main'){ revealAutoFillCard(); } else { draw(); }
  }

  // Bung + cuộn + nháy sáng khối "AI tự viết + xếp cả tuần" — dùng chung cho 2 lối vào: (1) nút "Xếp
  // lịch cả tuần ngay" từ Định Vị (window.PendingAutoFillWeek, xem boot()), (2) gợi ý ngay trong khối
  // "AI gợi ý lịch tuần" khi khách chọn 2-3 bài/ngày (2026-08-30, theo phản hồi khách Thu Oanh: chọn
  // 2-3 bài/ngày ở nút KIA chỉ ra chủ đề, vẫn phải tự chọn bài — nhiều khách không biết có nút này).
  function revealAutoFillCard(){
    state.tab='lich'; state.highlightAutoFill = true; state.toolsExpanded.autofill = true;
    draw();
    const card = document.getElementById('autofill-card');
    if(card) card.scrollIntoView({ behavior:'smooth', block:'center' });
    setTimeout(()=>{ state.highlightAutoFill = false; draw(); }, 4000);
  }

  // Tải lại đúng dữ liệu của tuần đang xem khi bấm "Tuần trước/Tuần sau" — tách khỏi onclick trực
  // tiếp để bọc try/catch (applyDraftForCurrentWeek()/loadEntries() giờ NÉM LỖI khi timeout, xem
  // withTimeout ở util.js) — không bọc thì lỗi mạng làm nút bấm coi như không phản hồi gì, không có
  // cách nào biết vì sao.
  async function changeWeek(){
    state.weekLoadError = null; draw();
    try{
      await Promise.all([applyDraftForCurrentWeek(), loadEntries()]);
    } catch(e){
      state.weekLoadError = e.message;
    }
    draw();
  }

  // Gợi ý AI + mục tiêu tuần lưu ở bảng weekly_ai_drafts (Supabase) — trước đây lưu localStorage
  // nên tạo lịch trên điện thoại xong mở web lại không thấy gì, giờ đồng bộ theo tài khoản.
  async function applyDraftForCurrentWeek(){
    const { data: draft, error } = await withTimeout(
      ctx.supabase.from('weekly_ai_drafts').select('*').eq('user_id', ctx.user.id).eq('week_start', isoDate(state.weekStart)).maybeSingle(),
      12000, 'Kết nối mạng chậm/không ổn định — không tải được mục tiêu tuần. Kiểm tra mạng rồi thử lại.'
    );
    if(error) throw new Error(error.message);
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
    const { data, error } = await withTimeout(
      ctx.supabase.from('calendar_entries').select('*').eq('user_id', ctx.user.id).gte('scheduled_date', from).lte('scheduled_date', to),
      12000, 'Kết nối mạng chậm/không ổn định — không tải được lịch tuần này. Kiểm tra mạng rồi thử lại.'
    );
    if(error) throw new Error(error.message);
    state.entries = data || [];
  }
  async function loadPosts(){
    // KHÔNG select('*') — posts.image_data (ảnh case study AI ghép, mỗi ảnh vài trăm KB) sẽ cộng dồn
    // theo cả 30 bài gần nhất mỗi lần vào trang, dễ vượt 12s timeout dù mạng vẫn ổn (phát hiện
    // 2026-08-30: chị Quỳnh báo "đang quay kêu lỗi mạng nhưng không phải" — đúng lúc cron case study
    // đã tạo đủ nhiều ảnh để payload nặng lên rõ rệt). Chỉ lấy đúng cột thật sự dùng ở trang này — ảnh
    // được tải riêng, đúng 1 bài, ngay lúc bấm "Xem bài" (xem data-view-post ở bind()).
    const { data, error } = await withTimeout(
      ctx.supabase.from('posts').select('id,title,content,structure,posted').eq('user_id', ctx.user.id).order('created_at', { ascending:false }).limit(30),
      12000, 'Kết nối mạng chậm/không ổn định — không tải được danh sách bài. Kiểm tra mạng rồi thử lại.'
    );
    if(error) throw new Error(error.message);
    state.posts = data || [];
  }

  // Giờ đăng bài do NGƯỜI DÙNG TỰ CHỌN (2026-08-21, theo phản hồi chị Quỳnh) — đọc từ profile, sửa
  // ở Tài khoản. api/cron/send-reminders.js đọc đúng 3 cột này để tính lúc nào nhắc "đến giờ đăng
  // bài" cho từng người, không còn 1 giờ chung cho tất cả.
  function slotTimeFor(slotKey){
    const p = ctx.profile;
    return (p && p['slot_time_'+slotKey]) || DEFAULT_SLOT_TIME[slotKey];
  }

  // Lịch công việc content — nhắc theo THỜI ĐIỂM cụ thể (khác lịch đăng theo slot sáng/trưa/tối),
  // dùng cho MỌI việc chuẩn bị content nói chung (quay video, lên kịch bản, họp nhóm, deadline...),
  // không riêng buổi quay (đổi tên hiển thị 23/8 theo phản hồi chị Quỳnh: "chỗ phần này k phải là
  // lên lịch quay mà lên lịch cho các hoạt động làm content nói chung" — tên bảng/biến trong code vẫn
  // giữ "recording"/"quay" cho khỏi phải đổi schema, chỉ đổi chữ hiển thị cho người dùng).
  // Lọc theo "done" (người dùng tự tích xác nhận, giống hệt pattern calendar_entries.posted) — KHÔNG
  // tự ẩn chỉ vì đã qua giờ (sửa 22/8 theo phản hồi chị Quỳnh: "nó phải có mục tích đã làm để mình
  // tích xong mới mất chứ").
  async function loadRecordingSchedule(){
    // Không throw khi lỗi/timeout (khác các hàm load khác ở trên) — hàm này được gọi lại sau nhiều
    // thao tác nhỏ (tích đã làm/thêm/xoá) KHÔNG bọc try/catch, throw ở đây sẽ làm draw() sau đó
    // không chạy, giao diện đứng yên không cập nhật dù thao tác đã lưu thành công. Chỉ cần đảm bảo
    // KHÔNG treo vô thời hạn (xem withTimeout) — lỗi thật thì coi như rỗng, không nghiêm trọng bằng
    // lịch/bài viết chính.
    const { data } = await withTimeout(
      ctx.supabase.from('recording_schedule').select('*').eq('user_id', ctx.user.id).eq('done', false).order('scheduled_at', { ascending:true }),
      12000
    );
    state.recordingSchedule = data || [];
  }

  async function markRecordingDone(id){
    await ctx.supabase.from('recording_schedule').update({ done:true }).eq('id', id);
    await loadRecordingSchedule();
    draw();
  }

  async function addRecordingSchedule(){
    if(state.recordingSaving) return;
    if(!state.newRecordingDate || !state.newRecordingTime){
      state.recordingError = 'Chọn đủ ngày và giờ.';
      draw();
      return;
    }
    const scheduledAt = new Date(`${state.newRecordingDate}T${state.newRecordingTime}:00`);
    if(isNaN(scheduledAt.getTime()) || scheduledAt.getTime() < Date.now() - 60000){
      state.recordingError = 'Thời điểm phải ở tương lai.';
      draw();
      return;
    }
    state.recordingSaving = true; state.recordingError = null; draw();
    const { error } = await ctx.supabase.from('recording_schedule').insert({
      user_id: ctx.user.id, title: state.newRecordingTitle.trim() || null, scheduled_at: scheduledAt.toISOString(),
    });
    state.recordingSaving = false;
    if(error){ state.recordingError = error.message; draw(); return; }
    state.newRecordingTitle = ''; state.newRecordingDate = ''; state.newRecordingTime = '';
    await loadRecordingSchedule();
    draw();
  }

  async function deleteRecordingSchedule(id){
    await ctx.supabase.from('recording_schedule').delete().eq('id', id);
    await loadRecordingSchedule();
    draw();
  }

  function weekDays(){
    return Array.from({length:7}, (_,i)=>{ const d = new Date(state.weekStart); d.setDate(d.getDate()+i); return d; });
  }

  function entryFor(dateStr, slotKey){
    return state.entries.find(e=> e.scheduled_date===dateStr && e.slot===slotKey && (e.channel||'ca_nhan')===state.channel);
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
    const doneCount = state.entries.filter(e=>e.scheduled_date < todayStr && e.posted && (e.channel||'ca_nhan')===state.channel).length;
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
    if(state.screen==='error') return `<div class="loading">
      <p style="color:var(--danger);padding:0 20px 18px;">${esc(state.bootError||'Có lỗi xảy ra.')}</p>
      <button class="btn" data-action="retry-boot">Thử lại</button>
    </div>`;
    return `
      <span class="tour-trigger" id="ld-start-tour">❓ Hướng dẫn</span>
      <div class="page-head"><div class="tag">Bước 5 · Lịch Đăng Bài</div><h1>Lịch đăng bài theo tuần</h1></div>
      <div class="tab-row">
        <div class="tab-btn ${state.tab==='lich'?'active':''}" data-tab="lich">Lịch</div>
        <div class="tab-btn ${state.tab==='thong-bao'?'active':''}" data-tab="thong-bao">Thông báo &amp; giờ đăng</div>
      </div>
      ${state.tab==='lich' ? calendarTabHtml() : settingsTabHtml()}
    `;
  }

  function calendarTabHtml(){
    // Auto-đăng Fanpage (2026-08-27) chỉ dùng cho Fanpage riêng của chị Quỳnh (1 token cấu hình ở
    // biến môi trường server, không phải OAuth theo từng user) — nên chỉ admin mới thấy toggle này,
    // khách thường bấm vào cũng không có Page nào để đăng.
    const isAdmin = ctx.profile && ctx.profile.role === 'admin';
    const days = weekDays();
    const todayStr = isoDate(new Date());
    const weekLabel = `${fmtDate(days[0])} – ${fmtDate(days[6])}`;
    // "Giảm nỗ lực khởi động mỗi lần vào app" (2026-08-29, theo yêu cầu chị Quỳnh) — số ô trống
    // TUẦN ĐANG XEM của lane hiện tại, dùng để hiện trước chi phí lượt AI thật sự sẽ tốn nếu bấm nút
    // "AI tự viết + xếp cả tuần" (api/auto-fill-week.js), KHÔNG phải cron nền miễn phí của admin.
    const emptySlotCount = days.reduce((sum,d)=> sum + SLOTS.filter(s => !entryFor(isoDate(d), s.key)).length, 0);
    const autoFillPerPostCost = state.autoFillMode==='new_hook' ? 4 : 3; // new_hook = 1 (sinh hook) + 3 (viết) lượt/bài
    const autoFillToFillCount = Math.min(emptySlotCount, 9); // MAX_FILL_PER_CLICK ở api/auto-fill-week.js

    // "sắp xếp lại bố cục ... khó nhìn, rối" (2026-08-29, theo phản hồi chị Quỳnh) — LỊCH TUẦN mới là
    // thứ quan trọng nhất/xem nhiều nhất của trang này, nhưng trước đây bị chôn dưới 3 khối công cụ
    // (mục tiêu tuần, AI tự viết cả tuần, lịch công việc content) luôn mở sẵn full nội dung. Giờ lịch
    // lên NGAY ĐẦU trang, 3 khối công cụ dồn xuống dưới dạng thẻ THU GỌN (chỉ hiện 1 dòng tóm tắt),
    // bấm mới bung ra — vẫn còn nguyên chức năng, chỉ đỡ rối mắt khi không cần dùng tới.
    function toolCardHtml(key, icon, title, bodyHtml, collapsedHint, opts){
      opts = opts || {};
      const expanded = !!state.toolsExpanded[key];
      return `
        <div ${opts.id?`id="${opts.id}"`:''} class="card${opts.pulse?' autofill-pulse':''}" style="margin-bottom:14px;${opts.bg?`background:${opts.bg};`:''}">
          <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;cursor:pointer;" data-toggle-tool="${key}">
            <h3 style="margin:0;font-size:15px;">${icon} ${title}</h3>
            <span style="color:var(--accent);font-size:12px;font-weight:600;white-space:nowrap;">${expanded?'Thu gọn ▴':'Mở rộng ▾'}</span>
          </div>
          ${expanded ? `<div style="margin-top:14px;">${bodyHtml}</div>` : `<div style="margin-top:6px;font-size:12.5px;color:var(--ink-soft);">${collapsedHint}</div>`}
        </div>
      `;
    }

    const goalCardBody = `
        <label style="display:block;font-size:13px;font-weight:600;color:var(--ink-soft);margin-bottom:6px;">Tuần này bạn muốn đẩy mục tiêu gì nhất?</label>
        <textarea id="weekly-goal" style="min-height:56px;" placeholder="Ví dụ: ra mắt khoá học mới, tăng follow, xây niềm tin trước đợt mở bán...">${esc(state.weeklyGoal)}</textarea>
        <label style="display:block;font-size:13px;font-weight:600;color:var(--ink-soft);margin:14px 0 6px;">Mỗi ngày muốn đăng mấy bài?</label>
        <div class="chips">${[1,2,3].map(n=>`<div class="chip ${state.postsPerDay===n?'selected':''}" data-posts-per-day="${n}">${n} bài/ngày</div>`).join('')}</div>
        ${state.postsPerDay > 1 ? `<div class="hint-box" style="margin-top:8px;background:var(--accent-soft);">Chọn ${state.postsPerDay} bài/ngày thì nút bên dưới chỉ gợi ý CHỦ ĐỀ cho từng ô, bạn vẫn phải tự vào Kho Content chọn bài cho từng ô. Muốn AI viết SẴN toàn bộ bài cho mọi ô trống, dùng <span style="text-decoration:underline;cursor:pointer;font-weight:600;" data-action="jump-autofill">"AI tự viết + xếp cả tuần"</span> bên dưới thay vì nút này.</div>` : ''}
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
    `;
    const goalCardHint = state.weeklyGoal ? `Mục tiêu: "${esc(excerpt(state.weeklyGoal, 60))}"` : (state.aiSuggestions ? 'Đã có gợi ý AI cho tuần này.' : 'Chưa đặt mục tiêu cho tuần này.');

    const autoFillCardBody = `
        <div class="hint-box" style="margin-bottom:12px;">Khác với "AI gợi ý lịch tuần" ở trên (chỉ ra chủ đề, bạn vẫn phải tự viết) — cái này AI viết bài HOÀN CHỈNH và xếp thẳng vào ô trống luôn. Bấm "Xem chi tiết" trong lịch để đọc lại/sửa trước khi đăng.</div>
        <label style="display:block;font-size:13px;font-weight:600;color:var(--ink-soft);margin-bottom:6px;">Chọn cách AI lấy nguồn để viết</label>
        <div class="chips" style="margin-bottom:12px;">
          <div class="chip ${state.autoFillMode==='kho'?'selected':''}" data-autofill-mode="kho">Cách 1: Dùng Kho Content/Hook viral đúng trục của bạn</div>
          <div class="chip ${state.autoFillMode==='new_hook'?'selected':''}" data-autofill-mode="new_hook">Cách 2: Tự tạo hook mới theo ngành của bạn rồi viết</div>
        </div>
        <label style="display:block;font-size:13px;font-weight:600;color:var(--ink-soft);margin-bottom:6px;">Yêu cầu thêm (không bắt buộc)</label>
        <textarea id="autofill-custom-instructions" style="min-height:auto;height:52px;margin-bottom:12px;" placeholder="Ví dụ: viết ngắn gọn hơn, nhấn mạnh sản phẩm X, giọng hài hước hơn, không dùng từ &quot;chắc chắn&quot;...">${esc(state.autoFillCustomInstructions)}</textarea>
        ${emptySlotCount===0 ? `<div style="font-size:13px;color:var(--ink-soft);">Tuần này đã kín lịch — không còn ô trống nào để AI điền.</div>` : `
        <div class="btn-row">
          <button class="btn" data-action="auto-fill-week" ${state.autoFillBusy?'disabled':''}>${state.autoFillBusy?'Đang viết…':'Bắt đầu viết'}</button>
          <span style="font-size:11px;color:var(--ink-soft);align-self:center;">Điền ${autoFillToFillCount} ô lần này (tốn khoảng ${autoFillToFillCount*autoFillPerPostCost} lượt AI)${emptySlotCount>9?`, còn ${emptySlotCount-9} ô nữa — bấm thêm lần nữa sau khi xong`:''}</span>
        </div>
        <div class="hint-box" style="margin-top:10px;">Có thể mất vài phút (AI viết từng bài một, không phải cùng lúc) — đừng thoát trang khi đang đợi.</div>
        `}
        ${!state.positioning ? `<div class="hint-box" style="margin-top:10px;">Chưa có <a href="#dinh-vi">Định Vị</a> đã lưu — cần làm Định Vị trước để dùng được tính năng này.</div>` : ''}
        ${state.autoFillError?`<div class="error-box" style="margin-top:10px;">${esc(state.autoFillError)}</div>`:''}
        ${state.autoFillResult?`<div class="hint-box" style="margin-top:10px;">${esc(state.autoFillResult)}</div>`:''}
    `;
    const autoFillCardHint = emptySlotCount===0 ? 'Tuần này đã kín lịch.' : `Còn ${emptySlotCount} ô trống — bấm để AI viết luôn.`;

    const recordingCardBody = `
        <div class="hint-box" style="margin-bottom:12px;">Đặt lịch cho việc content sắp tới — quay video, lên kịch bản, họp nhóm, deadline bất kỳ... không chỉ riêng buổi quay. Nếu đã <span style="text-decoration:underline;cursor:pointer;" data-tab="thong-bao">bật thông báo</span>, bạn sẽ được nhắc ngay khi đến giờ.</div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:flex-end;">
          <div style="flex:2;min-width:160px;">
            <label style="display:block;font-size:12px;font-weight:600;color:var(--ink-soft);margin-bottom:4px;">Tên công việc (không bắt buộc)</label>
            <input id="rec-title" type="text" value="${esc(state.newRecordingTitle)}" placeholder="Vd: Quay 5 video tuần này, Lên kịch bản..." style="width:100%;padding:9px 10px;border:1px solid var(--line);border-radius:8px;font-size:13.5px;">
          </div>
          <div style="min-width:130px;">
            <label style="display:block;font-size:12px;font-weight:600;color:var(--ink-soft);margin-bottom:4px;">Ngày</label>
            <input id="rec-date" type="date" value="${esc(state.newRecordingDate)}" style="width:100%;padding:9px 10px;border:1px solid var(--line);border-radius:8px;font-size:13.5px;">
          </div>
          <div style="min-width:100px;">
            <label style="display:block;font-size:12px;font-weight:600;color:var(--ink-soft);margin-bottom:4px;">Giờ</label>
            <input id="rec-time" type="time" value="${esc(state.newRecordingTime)}" style="width:100%;padding:9px 10px;border:1px solid var(--line);border-radius:8px;font-size:13.5px;">
          </div>
          <button class="btn btn-sm" data-action="add-recording" ${state.recordingSaving?'disabled':''}>${state.recordingSaving?'Đang lưu…':'Thêm lịch'}</button>
        </div>
        ${state.recordingError?`<div class="error-box" style="margin-top:10px;">${esc(state.recordingError)}</div>`:''}
        ${state.recordingSchedule.length ? `
          <div style="margin-top:14px;display:flex;flex-direction:column;gap:8px;">
            ${state.recordingSchedule.map(r=>{
              const isOverdue = new Date(r.scheduled_at).getTime() < Date.now();
              return `
              <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid var(--line);gap:10px;flex-wrap:wrap;">
                <span style="font-size:13.5px;${isOverdue?'color:var(--gold);':''}">${isOverdue?'⏰ ':''}<b>${esc(new Date(r.scheduled_at).toLocaleString('vi-VN', { weekday:'short', day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit' }))}</b>${r.title?` — ${esc(r.title)}`:''}</span>
                <span style="display:flex;gap:12px;align-items:center;">
                  <span data-mark-recording-done="${r.id}" style="cursor:pointer;display:inline-flex;align-items:center;gap:5px;color:var(--ink-soft);font-size:13px;" title="Bấm để đánh dấu đã làm xong — chưa bấm thì vẫn coi là chưa làm">
                    <span style="width:13px;height:13px;border-radius:3px;border:1.5px solid var(--ink-soft);background:transparent;display:inline-flex;flex-shrink:0;"></span>
                    Đã làm
                  </span>
                  <span style="color:var(--danger);cursor:pointer;font-size:12px;" data-del-recording="${r.id}">Xoá</span>
                </span>
              </div>
            `;}).join('')}
          </div>
        ` : `<div style="margin-top:10px;font-size:13px;color:var(--ink-soft);">Chưa có việc nào sắp tới.</div>`}
    `;
    const recordingCardHint = state.recordingSchedule.length ? `${state.recordingSchedule.length} việc sắp tới.` : 'Chưa có việc nào sắp tới.';

    return `
      ${isAdmin ? `
        <div class="chips" style="margin-bottom:16px;">
          <div class="chip ${state.channel==='ca_nhan'?'selected':''}" data-channel="ca_nhan">Cá nhân</div>
          <div class="chip ${state.channel==='fanpage'?'selected':''}" data-channel="fanpage">Fanpage</div>
        </div>
      ` : ''}
      ${isAdmin && state.channel==='ca_nhan' ? `<div class="hint-box" style="margin-bottom:16px;">Hệ thống cũng tự động viết + xếp <b>3 bài/ngày</b> (Sáng/Trưa/Tối) vào ô trống mỗi sáng sớm — Tối luôn là "Video Ngồi Nói", Trưa luôn là bài case study, Sáng là bài thường. Chị chỉ cần tự đăng tay lên Facebook (không thể tự đăng hộ trang cá nhân).</div>` : ''}

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
      ${state.weekLoadError ? `<div class="error-box">${esc(state.weekLoadError)}</div>` : ''}
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
              const suggestion = (!e && state.channel==='ca_nhan') ? suggestionFor(thu, s.key) : null;

              // Ngày đã qua mà không có bài: không còn gì để hành động (không thể xếp lịch cho quá
              // khứ) — ẩn bớt gợi ý/khung "+" mời bấm. CHỈ gắn nhãn "Đã bỏ lỡ" khi slot đó thực sự
              // từng nằm trong kế hoạch (AI có gợi ý cho đúng slot này) — nếu lịch chỉ định 1 bài/
              // ngày, 2 buổi còn lại chưa bao giờ được lên kế hoạch, không được tính là "bỏ lỡ".
              if(isPast && !e){
                if(suggestion){
                  return `<div class="week-slot" style="opacity:.55;min-height:auto;padding:6px;text-align:center;border-color:var(--danger);">
                    <div class="slot-label">${s.label} <span style="opacity:.6;font-weight:400;">${slotTimeFor(s.key)}</span></div>
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
                    ${state.posts.filter(p=>!p.posted || (e && e.post_id===p.id)).map(p=>`<option value="${p.id}" ${e && e.post_id===p.id?'selected':''} title="${esc(p.title||'(không tiêu đề)')}">${esc(p.title||'(không tiêu đề)')}${p.posted?' (đã đăng)':''}</option>`).join('')}
                  </select>
                  <div style="font-size:10px;color:var(--ink-soft);margin-top:2px;">Bài đã đăng rồi không hiện ở đây nữa, đỡ chọn nhầm.</div>
                  <div style="font-size:10px;color:var(--ink-soft);margin:6px 0 2px;">hoặc tự nhập tên bài</div>
                  <input type="text" data-picker-custom placeholder="Tên bài tự điền..." value="${e && !e.post_id ? esc(e.title||'') : ''}" style="width:100%;font-size:12px;padding:6px;border:1px solid var(--line);border-radius:6px;">
                  <div style="font-size:10px;color:var(--ink-soft);margin:6px 0 2px;">Giờ đăng bài này</div>
                  <input type="time" data-picker-time value="${esc((e && e.scheduled_time) || slotTimeFor(s.key))}" style="width:100%;font-size:12px;padding:6px;border:1px solid var(--line);border-radius:6px;">
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
                // Ô đã đăng dùng nền đậm khác hẳn ô mới chọn bài (nền nhạt mặc định) — phân biệt
                // ngay bằng mắt trên lịch cả tuần, không phải đọc chữ mới biết bài nào xong rồi.
                return `<div class="week-slot filled" ${e.posted?'style="background:var(--accent);border-color:var(--accent);"':''}>
                  <div class="slot-label" style="${e.posted?'color:#fff;opacity:.85;':''}">${s.label} <input type="time" data-inline-time="${e.id}" value="${esc(e.scheduled_time || slotTimeFor(s.key))}" style="border:none;background:transparent;font-family:inherit;font-size:inherit;opacity:.75;font-weight:400;padding:0;width:72px;cursor:pointer;${e.posted?'color:#fff;':''}" title="Bấm để đổi giờ đăng bài này"> · <span ${e.posted?'':`data-toggle-posted="${e.id}"`} style="${e.posted?'':'cursor:pointer;'}display:inline-flex;align-items:center;gap:5px;vertical-align:middle;${e.posted?'color:#fff;font-weight:700;':'color:var(--ink-soft);'}" title="${e.posted?'Đã đánh dấu đăng rồi':'Bấm để đánh dấu đã đăng thật'}"><span style="width:13px;height:13px;border-radius:3px;border:1.5px solid ${e.posted?'#fff':'var(--ink-soft)'};background:${e.posted?'#fff':'transparent'};display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;">${e.posted?`<span style="color:var(--accent);font-size:10px;line-height:1;font-weight:900;">✓</span>`:''}</span>Đã đăng</span></div>
                  <b style="font-size:12.5px;${e.posted?'color:#fff;':''}">${esc(e.title||'')}</b>
                  ${e.format?`<div style="font-size:11px;margin-top:2px;${e.posted?'color:#fff;opacity:.8;':'color:var(--ink-soft);'}">${esc(e.format)}</div>`:''}
                  ${isAdmin && state.channel==='fanpage' && e.post_id && (e.fb_publish_status || !isPast) ? `
                    <div style="margin-top:8px;padding-top:8px;border-top:1px solid ${e.posted?'rgba(255,255,255,.25)':'var(--line)'};">
                      ${e.fb_publish_status==='published' ? `
                        <div style="font-size:10.5px;font-weight:600;${e.posted?'color:#fff;':'color:var(--accent);'}">✅ Đã tự động đăng lên Fanpage${e.fb_post_id?` · <a href="https://facebook.com/${e.fb_post_id}" target="_blank" style="color:inherit;text-decoration:underline;">Xem bài</a>`:''}</div>
                      ` : e.fb_publish_status==='failed' ? `
                        <div style="font-size:10.5px;color:var(--danger);">❌ Đăng tự động thất bại: ${esc(e.fb_publish_error||'')}</div>
                        <span style="font-size:10.5px;cursor:pointer;color:var(--accent);text-decoration:underline;" data-retry-fb="${e.id}">Thử lại</span>
                      ` : `
                        <label style="font-size:10.5px;display:flex;align-items:center;gap:5px;cursor:pointer;${e.posted?'color:#fff;opacity:.85;':'color:var(--ink-soft);'}">
                          <input type="checkbox" data-toggle-auto-fb="${e.id}" ${e.auto_publish_fb?'checked':''}>
                          Tự động đăng lên Fanpage${e.fb_publish_status==='pending'?' (đang xử lý...)':''}
                        </label>
                      `}
                    </div>
                  ` : ''}
                  ${e.posted ? `
                    <div style="margin-top:8px;padding-top:8px;border-top:1px solid rgba(255,255,255,.25);">
                      <div style="font-size:9.5px;color:#fff;opacity:.75;text-transform:uppercase;letter-spacing:.03em;margin-bottom:4px;">Kết quả (không bắt buộc)</div>
                      <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;">
                        <input type="number" min="0" inputmode="numeric" data-metric-field="views" data-metric-id="${e.id}" value="${e.views==null?'':e.views}" placeholder="View" style="width:100%;padding:4px 6px;border-radius:5px;border:1px solid rgba(255,255,255,.35);background:rgba(255,255,255,.14);color:#fff;font-size:11px;">
                        <input type="number" min="0" inputmode="numeric" data-metric-field="likes" data-metric-id="${e.id}" value="${e.likes==null?'':e.likes}" placeholder="Like" style="width:100%;padding:4px 6px;border-radius:5px;border:1px solid rgba(255,255,255,.35);background:rgba(255,255,255,.14);color:#fff;font-size:11px;">
                        <input type="number" min="0" inputmode="numeric" data-metric-field="comments" data-metric-id="${e.id}" value="${e.comments==null?'':e.comments}" placeholder="Cmt" style="width:100%;padding:4px 6px;border-radius:5px;border:1px solid rgba(255,255,255,.35);background:rgba(255,255,255,.14);color:#fff;font-size:11px;">
                        <input type="number" min="0" inputmode="numeric" data-metric-field="shares" data-metric-id="${e.id}" value="${e.shares==null?'':e.shares}" placeholder="Share" style="width:100%;padding:4px 6px;border-radius:5px;border:1px solid rgba(255,255,255,.35);background:rgba(255,255,255,.14);color:#fff;font-size:11px;">
                      </div>
                    </div>
                  ` : ''}
                  <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:8px;">
                    ${linkedPost?`<span style="font-size:11px;cursor:pointer;font-weight:600;${e.posted?'color:#fff;':'color:var(--accent);'}" data-view-post="${e.id}">Xem bài →</span>`:''}
                    <span style="font-size:11px;cursor:pointer;${e.posted?'color:#fff;opacity:.85;':'color:var(--ink-soft);'}" data-edit-slot="${dateStr}|${s.key}">Sửa</span>
                    <span style="font-size:11px;cursor:pointer;${e.posted?'color:#fff;':'color:var(--danger);'}" data-remove="${e.id}">Xoá</span>
                  </div>
                </div>`;
              }
              if(suggestion){
                // Đang cầm sẵn 1 bài cụ thể để xếp lịch (bấm "Đưa vào lịch" từ Viết Content) — ưu
                // tiên xếp đúng bài đó vào đây khi bấm, thay vì chạy theo nhánh gợi ý AI của ô này
                // (trước đây bấm vào sẽ lỡ nhảy sang Kho Content/Viết Content, mất luôn bài đang cầm).
                if(state.pending){
                  return `<div class="week-slot" data-empty="${dateStr}|${s.key}" style="cursor:pointer;border-style:dashed;border-color:var(--gold);background:#FBF6E9;">
                    <div class="slot-label">${s.label} <span style="opacity:.6;font-weight:400;">${slotTimeFor(s.key)}</span> · <span style="color:var(--gold);">Gợi ý AI</span></div>
                    ${suggestion.truc_noi_dung?`<div style="font-size:10px;color:var(--accent);font-weight:600;margin-bottom:3px;">${esc(suggestion.truc_noi_dung)}</div>`:''}
                    <div style="color:var(--accent);font-size:11.5px;font-weight:600;margin-top:6px;">Bấm để xếp bài đang chờ vào đây →</div>
                  </div>`;
                }
                const matchedPost = suggestion.bai_co_san ? state.posts.find(p=>p.title===suggestion.bai_co_san) : null;
                return `<div class="week-slot" style="border-style:dashed;border-color:var(--gold);background:#FBF6E9;">
                  <div class="slot-label">${s.label} <span style="opacity:.6;font-weight:400;">${slotTimeFor(s.key)}</span> · <span style="color:var(--gold);">Gợi ý AI</span></div>
                  ${suggestion.truc_noi_dung?`<div style="font-size:10px;color:var(--accent);font-weight:600;margin-bottom:3px;">${esc(suggestion.truc_noi_dung)}</div>`:''}
                  <b style="font-size:12px;">${esc(matchedPost ? matchedPost.title : (suggestion.chu_de || 'Chưa chọn bài cụ thể'))}</b>
                  ${matchedPost ? `<div style="color:var(--ink-soft);font-size:10.5px;margin-top:2px;">Bài đã viết sẵn</div>` : (suggestion.dinh_dang ? `<div style="color:var(--ink-soft);font-size:10.5px;margin-top:2px;">${esc(suggestion.dinh_dang)}</div>` : '')}
                  <div style="display:flex;gap:6px;margin-top:6px;flex-wrap:wrap;align-items:center;">
                    ${matchedPost ? `<button class="btn btn-sm" data-accept-suggestion="${dateStr}|${s.key}">Dùng bài này</button>` : ''}
                    ${!matchedPost && suggestion.chu_de ? `<span class="btn-ghost btn btn-sm" data-write-new-for-slot="${dateStr}|${s.key}">Viết bài mới cho gợi ý này →</span>` : ''}
                    ${state.choosingKhoFor===`${dateStr}|${s.key}`
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
                <div class="slot-label">${s.label} <span style="opacity:.6;font-weight:400;">${slotTimeFor(s.key)}</span></div>
                <div style="color:var(--ink-soft);font-size:20px;text-align:center;margin-top:4px;">+</div>
              </div>`;
            }).join('')}
          </div>`;
        }).join('')}
      </div>

      <div style="margin:26px 0 10px;font-size:12px;font-weight:700;color:var(--ink-soft);text-transform:uppercase;letter-spacing:.05em;">🛠️ Công cụ lên lịch</div>
      ${state.channel==='ca_nhan' ? `
        ${toolCardHtml('goal', '🎯', 'AI gợi ý lịch tuần', goalCardBody, goalCardHint, { id:'goal-card' })}
        ${toolCardHtml('autofill', '🪄', 'AI tự viết + xếp cả tuần', autoFillCardBody, autoFillCardHint, { id:'autofill-card', bg:'var(--accent-soft)', pulse: state.highlightAutoFill })}
      ` : `
        <div class="hint-box" style="margin-bottom:14px;">
          <div style="margin-bottom:10px;">Lane Fanpage — hệ thống tự chọn hook/content viral, tự viết bài, tự xếp vào ô trống mỗi sáng sớm rồi tự đăng đúng giờ. Vẫn bấm được ô trống để tự xếp bài tay nếu muốn.</div>
          <div class="btn-row">
            <button class="btn btn-sm" data-action="regen-week" ${state.regenWeekLoading?'disabled':''}>${state.regenWeekLoading?'Đang viết lại…':'Làm lại cả tuần này'}</button>
            <span style="font-size:11px;color:var(--ink-soft);align-self:center;">Xoá hết bài Fanpage tuần đang xem rồi viết lại từ đầu (tốn tối đa ~14 lượt AI cho 7 ngày)</span>
          </div>
          <div style="margin-top:4px;font-size:11.5px;color:var(--ink-soft);">Có thể mất 1-2 phút — đừng thoát trang khi đang đợi.</div>
          ${state.regenWeekError?`<div class="error-box" style="margin-top:10px;">${esc(state.regenWeekError)}</div>`:''}
        </div>
      `}
      ${toolCardHtml('recording', '🎬', 'Lịch công việc content', recordingCardBody, recordingCardHint, { id:'recording-card' })}
    `;
  }

  // Giờ đăng bài mặc định + bật thông báo — chuyển từ Tài khoản sang đây theo phản hồi chị Quỳnh
  // 21/8: "nên ở luôn trong lịch đăng bài ý, như kiểu tạo ra 1 mục thứ 2 bên cạnh mục lịch".
  function settingsTabHtml(){
    return `
      <div class="card" style="margin-bottom:20px;">
        <h3 style="margin-bottom:6px;">Giờ đăng bài mặc định</h3>
        <div class="hint-box" style="margin-bottom:14px;">Áp dụng khi tạo mới 1 ô lịch ở tab "Lịch" (đỡ phải gõ tay mỗi lần) — mỗi bài vẫn sửa được giờ riêng ngay tại ô lịch của nó. Nếu đã bật thông báo, đây cũng là giờ mặc định bạn sẽ được nhắc "đến giờ đăng bài".</div>
        <div style="display:flex;gap:12px;flex-wrap:wrap;">
          <div>
            <label style="display:block;font-size:12.5px;font-weight:600;color:var(--ink-soft);margin-bottom:4px;">Sáng</label>
            <input id="ld-slot-sang" type="time" value="${esc(state.slotTimeSang)}" style="padding:9px 10px;border:1px solid var(--line);border-radius:8px;font-size:13.5px;">
          </div>
          <div>
            <label style="display:block;font-size:12.5px;font-weight:600;color:var(--ink-soft);margin-bottom:4px;">Trưa</label>
            <input id="ld-slot-trua" type="time" value="${esc(state.slotTimeTrua)}" style="padding:9px 10px;border:1px solid var(--line);border-radius:8px;font-size:13.5px;">
          </div>
          <div>
            <label style="display:block;font-size:12.5px;font-weight:600;color:var(--ink-soft);margin-bottom:4px;">Tối</label>
            <input id="ld-slot-toi" type="time" value="${esc(state.slotTimeToi)}" style="padding:9px 10px;border:1px solid var(--line);border-radius:8px;font-size:13.5px;">
          </div>
          <button class="btn btn-sm" data-action="save-slot-times" style="align-self:flex-end;" ${state.slotTimeSaving?'disabled':''}>${state.slotTimeSaving?'Đang lưu…':'Lưu giờ'}</button>
        </div>
        ${state.slotTimeSaved?`<div style="color:var(--accent);font-size:12.5px;margin-top:8px;">✓ Đã lưu</div>`:''}
      </div>

      <div class="card" style="margin-bottom:20px;">
        <h3 style="margin-bottom:6px;">Thông báo nhắc lịch</h3>
        <div class="hint-box" style="margin-bottom:14px;">Bật để nhận thông báo ngay trên máy khi <b>đến giờ đăng bài</b>, <b>đã đăng được 3h/6h/24h</b> (nhắc kiểm tra view ở Đẩy Bài), và <b>đến giờ công việc content</b> đã đặt lịch. Trên iPhone: cần <b>"Thêm vào Màn hình chính"</b> (bấm nút Chia sẻ trên Safari) trước khi bật được — Safari không hỗ trợ thông báo cho tab trình duyệt thường.</div>
        ${!state.pushSupported ? `
          <div class="error-box">Trình duyệt/thiết bị này không hỗ trợ thông báo đẩy.</div>
        ` : state.pushSubscribed ? `
          <button class="btn-ghost btn btn-sm" data-action="disable-push" ${state.pushBusy?'disabled':''}>${state.pushBusy?'Đang tắt…':'✓ Đã bật — bấm để tắt'}</button>
        ` : `
          <button class="btn btn-sm" data-action="enable-push" ${state.pushBusy?'disabled':''}>${state.pushBusy?'Đang bật…':'Bật thông báo'}</button>
        `}
        ${state.pushError?`<div class="error-box" style="margin-top:10px;">${esc(state.pushError)}</div>`:''}
        ${state.pushSupported ? `
          <div style="margin-top:12px;padding-top:12px;border-top:1px solid var(--line);">
            <span class="btn-ghost btn btn-sm" data-action="test-push" ${state.testPushBusy?'disabled':''}>${state.testPushBusy?'Đang gửi…':'Gửi thử thông báo'}</span>
            <div style="font-size:11.5px;color:var(--ink-soft);margin-top:4px;">Bấm để kiểm tra ngay thông báo có hoạt động không, không cần chờ đúng lúc có sự kiện thật.</div>
            ${state.testPushResult ? `<div class="${state.testPushResult.ok?'hint-box':'error-box'}" style="margin-top:8px;">${esc(state.testPushResult.message)}</div>` : ''}
          </div>
        ` : ''}
      </div>
    `;
  }

  function bind(){
    const tourBtn = container.querySelector('#ld-start-tour');
    if(tourBtn) tourBtn.onclick = ()=>{ if(state.tab!=='lich'){ state.tab='lich'; draw(); } window.startPageTour(TOUR_STEPS); };

    const retryBtn = container.querySelector('[data-action="retry-boot"]');
    if(retryBtn) retryBtn.onclick = boot;

    container.querySelectorAll('[data-tab]').forEach(el=>{
      el.onclick = ()=>{ state.tab = el.getAttribute('data-tab'); draw(); };
    });
    container.querySelectorAll('[data-toggle-tool]').forEach(el=>{
      el.onclick = ()=>{
        const key = el.getAttribute('data-toggle-tool');
        state.toolsExpanded[key] = !state.toolsExpanded[key];
        if(key==='autofill') state.highlightAutoFill = false; // bấm mở tay thì tắt hẳn nháy sáng, khỏi lặp 2 hiệu ứng
        draw();
      };
    });

    const slotSangInput = container.querySelector('#ld-slot-sang');
    if(slotSangInput) slotSangInput.oninput = ()=>{ state.slotTimeSang = slotSangInput.value; state.slotTimeSaved = false; };
    const slotTruaInput = container.querySelector('#ld-slot-trua');
    if(slotTruaInput) slotTruaInput.oninput = ()=>{ state.slotTimeTrua = slotTruaInput.value; state.slotTimeSaved = false; };
    const slotToiInput = container.querySelector('#ld-slot-toi');
    if(slotToiInput) slotToiInput.oninput = ()=>{ state.slotTimeToi = slotToiInput.value; state.slotTimeSaved = false; };
    const saveSlotTimesBtn = container.querySelector('[data-action="save-slot-times"]');
    if(saveSlotTimesBtn) saveSlotTimesBtn.onclick = saveSlotTimes;
    const enablePushBtn = container.querySelector('[data-action="enable-push"]');
    if(enablePushBtn) enablePushBtn.onclick = enablePush;
    const disablePushBtn = container.querySelector('[data-action="disable-push"]');
    if(disablePushBtn) disablePushBtn.onclick = disablePush;
    const testPushBtn = container.querySelector('[data-action="test-push"]');
    if(testPushBtn) testPushBtn.onclick = testPush;

    const goalInput = container.querySelector('#weekly-goal');
    if(goalInput) goalInput.oninput = ()=>{ state.weeklyGoal = goalInput.value; saveDraftForCurrentWeek(); };
    const quickContext = container.querySelector('#quick-context');
    if(quickContext) quickContext.oninput = ()=>{ state.quickContext = quickContext.value; saveDraftForCurrentWeek(); };
    container.querySelectorAll('[data-posts-per-day]').forEach(el=>{
      el.onclick = ()=>{ state.postsPerDay = Number(el.getAttribute('data-posts-per-day')); saveDraftForCurrentWeek(); draw(); };
    });
    // Chuyển lane Cá nhân/Fanpage — cả 2 lane đã cùng nằm trong state.entries của tuần đang xem
    // (loadEntries() không lọc theo channel), không cần gọi lại DB. Reset trạng thái thao tác dở
    // dang để khỏi lẫn giữa 2 lane (vd đang mở picker ở ô lane này mà chuyển sang lane kia).
    container.querySelectorAll('[data-channel]').forEach(el=>{
      el.onclick = ()=>{
        state.channel = el.getAttribute('data-channel');
        state.pickerFor = null; state.editingEntryId = null; state.pending = null;
        draw();
      };
    });
    const aiBtn = container.querySelector('[data-action="ai-suggest"]');
    if(aiBtn) aiBtn.onclick = fetchAiSchedule;
    const jumpAutoFillEl = container.querySelector('[data-action="jump-autofill"]');
    if(jumpAutoFillEl) jumpAutoFillEl.onclick = revealAutoFillCard;
    container.querySelectorAll('[data-autofill-mode]').forEach(el=>{
      el.onclick = ()=>{ state.autoFillMode = el.getAttribute('data-autofill-mode'); draw(); };
    });
    const autoFillCustomInstructionsInput = container.querySelector('#autofill-custom-instructions');
    if(autoFillCustomInstructionsInput) autoFillCustomInstructionsInput.oninput = ()=>{ state.autoFillCustomInstructions = autoFillCustomInstructionsInput.value; };
    const autoFillBtn = container.querySelector('[data-action="auto-fill-week"]');
    if(autoFillBtn) autoFillBtn.onclick = autoFillWeek;
    const regenBtn = container.querySelector('[data-action="regen-week"]');
    if(regenBtn) regenBtn.onclick = regenFanpageWeek;

    const prev = container.querySelector('[data-action="prev-week"]');
    if(prev) prev.onclick = ()=>{ state.weekStart.setDate(state.weekStart.getDate()-7); changeWeek(); };
    const next = container.querySelector('[data-action="next-week"]');
    if(next) next.onclick = ()=>{ state.weekStart.setDate(state.weekStart.getDate()+7); changeWeek(); };
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
            channel: state.channel, auto_publish_fb: state.channel==='fanpage',
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
          channel: state.channel, auto_publish_fb: state.channel==='fanpage',
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
    // "Viết bài mới cho gợi ý này" (2026-08-27, đòn bẩy lớn nhất để tăng tỉ lệ từ "có kế hoạch"
    // thành "có bài thật" — trước đây chỉ có đường "chọn bài mẫu đúng trục" trong kho, không dùng
    // được thẳng chủ đề/hook/CTA cụ thể mà AI đã nghĩ riêng cho đúng slot này) — nhảy sang Viết
    // Content với chủ đề gợi ý điền sẵn, y hệt cơ chế window.PendingTopic đã dùng cho Kho Hook/Tái
    // Chế Content Viral. ideaIsHook=false vì đây là Ý TƯỞNG để AI viết tự do, không phải hook đã
    // chốt cần giữ nguyên câu chữ. Viết xong bấm "Đưa vào lịch" (nút có sẵn) quay lại đúng chỗ này,
    // state.pending sẽ nhận đúng bài vừa viết khi bấm lại ô này.
    container.querySelectorAll('[data-write-new-for-slot]').forEach(el=>{
      el.onclick = ()=>{
        const [dateStr, slotKey] = el.getAttribute('data-write-new-for-slot').split('|');
        const thu = (new Date(dateStr).getDay()+6)%7;
        const s = suggestionFor(thu, slotKey);
        if(!s) return;
        window.PendingTopic = [s.chu_de, s.hook_goi_y ? `Hook gợi ý: ${s.hook_goi_y}` : '', s.cta ? `CTA: ${s.cta}` : ''].filter(Boolean).join('\n');
        window.PendingIsHook = false;
        location.hash = 'viet-content';
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
        const timeInput = container.querySelector('[data-picker-time]');
        const postId = select ? select.value : '';
        const post = state.posts.find(p=>p.id===postId);
        const customTitle = customInput ? customInput.value.trim() : '';
        const fields = {
          post_id: post ? post.id : null,
          title: post ? post.title : (customTitle || 'Bài mới'),
          format: post && post.structure ? (post.structure.format||null) : null,
          cta: post && post.structure ? (post.structure.cta||null) : null,
          scheduled_time: timeInput && timeInput.value ? timeInput.value : null,
        };
        // "Sửa" mở lại picker cho 1 ô ĐÃ có bài — cập nhật đúng dòng cũ thay vì tạo thêm 1 dòng mới
        // trùng slot/ngày (state.editingEntryId chỉ được gán khi bấm "Sửa", xem data-edit-slot).
        if(state.editingEntryId){
          await ctx.supabase.from('calendar_entries').update(fields).eq('id', state.editingEntryId);
        } else {
          await ctx.supabase.from('calendar_entries').insert({ user_id: ctx.user.id, scheduled_date: dateStr, slot: slotKey, channel: state.channel, auto_publish_fb: state.channel==='fanpage', ...fields });
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
    const recTitleInput = container.querySelector('#rec-title');
    if(recTitleInput) recTitleInput.oninput = ()=>{ state.newRecordingTitle = recTitleInput.value; };
    const recDateInput = container.querySelector('#rec-date');
    if(recDateInput) recDateInput.oninput = ()=>{ state.newRecordingDate = recDateInput.value; };
    const recTimeInput = container.querySelector('#rec-time');
    if(recTimeInput) recTimeInput.oninput = ()=>{ state.newRecordingTime = recTimeInput.value; };
    const addRecordingBtn = container.querySelector('[data-action="add-recording"]');
    if(addRecordingBtn) addRecordingBtn.onclick = addRecordingSchedule;
    container.querySelectorAll('[data-mark-recording-done]').forEach(el=>{
      el.onclick = ()=>markRecordingDone(el.getAttribute('data-mark-recording-done'));
    });
    container.querySelectorAll('[data-del-recording]').forEach(el=>{
      el.onclick = ()=>deleteRecordingSchedule(el.getAttribute('data-del-recording'));
    });

    // Sửa giờ NGAY tại ô lịch, không phải bấm "Sửa" mở form mới thấy — theo phản hồi chị Quỳnh 21/8:
    // "nếu giờ sửa trong đó người ta sẽ không để ý". Lưu ngay khi đổi (blur/change), không cần nút
    // Lưu riêng.
    container.querySelectorAll('[data-inline-time]').forEach(el=>{
      el.onclick = (ev)=>ev.stopPropagation();
      el.onchange = async ()=>{
        if(!el.value) return;
        const id = el.getAttribute('data-inline-time');
        await ctx.supabase.from('calendar_entries').update({ scheduled_time: el.value }).eq('id', id);
        const entry = state.entries.find(x=>x.id===id);
        if(entry) entry.scheduled_time = el.value;
        draw();
      };
    });

    // Bật/tắt "Tự động đăng lên Fanpage" (2026-08-27, chỉ admin thấy — xem isAdmin ở calendarTabHtml).
    // Cron api/cron/auto-publish-fb.js quét cột này, không cần gọi API riêng ở đây.
    container.querySelectorAll('[data-toggle-auto-fb]').forEach(el=>{
      el.onclick = (ev)=>ev.stopPropagation();
      el.onchange = async ()=>{
        const id = el.getAttribute('data-toggle-auto-fb');
        await ctx.supabase.from('calendar_entries').update({ auto_publish_fb: el.checked }).eq('id', id);
        const entry = state.entries.find(x=>x.id===id);
        if(entry) entry.auto_publish_fb = el.checked;
      };
    });
    // "Thử lại" chỉ xoá trạng thái lỗi — cron sẽ tự nhặt lại ở lượt chạy kế tiếp (không gọi Graph API
    // trực tiếp từ trình duyệt vì access token chỉ nằm ở server, không lộ ra client).
    container.querySelectorAll('[data-retry-fb]').forEach(el=>{
      el.onclick = async (ev)=>{
        ev.stopPropagation();
        const id = el.getAttribute('data-retry-fb');
        await ctx.supabase.from('calendar_entries').update({ fb_publish_status: null, fb_publish_error: null }).eq('id', id);
        const entry = state.entries.find(x=>x.id===id);
        if(entry){ entry.fb_publish_status = null; entry.fb_publish_error = null; }
        draw();
      };
    });

    // Kết quả thật (view/like/cmt/share) — TỰ NGUYỆN, lưu ngay khi đổi (blur/change), để trống thì
    // lưu null (khác 0 thật) — dùng cho fetchAiSchedule() ưu tiên lặp lại công thức đang hiệu quả
    // (xem 2026-08-23, theo đề xuất chị Quỳnh).
    container.querySelectorAll('[data-metric-field]').forEach(el=>{
      el.onclick = (ev)=>ev.stopPropagation();
      el.onchange = async ()=>{
        const field = el.getAttribute('data-metric-field');
        const id = el.getAttribute('data-metric-id');
        const val = el.value.trim() === '' ? null : Math.max(0, parseInt(el.value, 10) || 0);
        await ctx.supabase.from('calendar_entries').update({ [field]: val }).eq('id', id);
        const entry = state.entries.find(x=>x.id===id);
        if(entry) entry[field] = val;
        // Đồng bộ sang posts (2026-08-26, theo yêu cầu chị Quỳnh) — để Kho Content xem/sửa lại được
        // số liệu này lâu dài, không mất khi ô lịch bị xoá. Chỉ khi ô này gắn 1 bài cụ thể.
        if(entry && entry.post_id){
          await ctx.supabase.from('posts').update({ [field]: val }).eq('id', entry.post_id);
        }
      };
    });

    // Đánh dấu "đã đăng" là hành động 1 CHIỀU (theo phản hồi chị Quỳnh 21/8: "nút tích luôn là đã
    // đăng... không tích lại được") — bấm xong đổi màu xác nhận luôn, không có đường bấm lại để bỏ
    // đánh dấu (phần tử này chỉ được gắn data-toggle-posted khi CHƯA posted, xem html() ở trên).
    container.querySelectorAll('[data-toggle-posted]').forEach(el=>{
      el.onclick = async ()=>{
        const id = el.getAttribute('data-toggle-posted');
        const entry = state.entries.find(x=>x.id===id);
        await ctx.supabase.from('calendar_entries').update({ posted: true, posted_at: new Date().toISOString() }).eq('id', id);
        // Đồng bộ ngược sang đúng bài trong Kho Content (nếu ô này gắn 1 bài đã viết cụ thể) — để
        // Kho Content chia được đã đăng/chưa đăng, và picker chọn bài tự loại bài đã đăng rồi.
        if(entry && entry.post_id){
          await ctx.supabase.from('posts').update({ posted: true }).eq('id', entry.post_id);
          await loadPosts();
        }
        await loadEntries();
        draw();
      };
    });
    container.querySelectorAll('[data-view-post]').forEach(el=>{
      el.onclick = async ()=>{
        const entry = state.entries.find(x=>x.id===el.getAttribute('data-view-post'));
        const post = entry && entry.post_id ? state.posts.find(p=>p.id===entry.post_id) : null;
        if(!post) return;
        // Bài case study (slot Trưa, tự viết + ghép ảnh qua api/cron/auto-fill-schedule.js) có sẵn
        // ảnh THẬT trong posts.image_data (base64 JPEG) — theo yêu cầu chị Quỳnh 2026-08-29: "cho
        // hiện luôn cái hình mà AI làm". Tải ảnh RIÊNG đúng lúc bấm xem (không nằm trong loadPosts()
        // nữa — xem lý do ở loadPosts()), nên chỉ tốn payload của đúng 1 ảnh, không phải cả 30 bài.
        const { data } = await ctx.supabase.from('posts').select('image_data').eq('id', post.id).maybeSingle();
        const imgRaw = data && data.image_data;
        const imageDataUrl = imgRaw ? `data:image/jpeg;base64,${imgRaw.replace(/^data:image\/\w+;base64,/, '')}` : null;
        openTextModal(post.title, post.content, imageDataUrl);
      };
    });
    container.querySelectorAll('[data-remove]').forEach(el=>{
      el.onclick = async ()=>{
        const id = el.getAttribute('data-remove');
        if(!(await confirmModal('Xoá bài đã xếp ở ô này?'))) return;
        const entry = state.entries.find(x=>x.id===id);
        await ctx.supabase.from('calendar_entries').delete().eq('id', id);
        // Ô vừa xoá đã tích "Đã đăng" và có gắn bài cụ thể — trả lại đúng trạng thái "chưa đăng" cho
        // bài đó ở Kho Content, TRỪ KHI bài này còn "đã đăng" qua 1 ô lịch KHÁC chưa xoá (1 bài có
        // thể được xếp vào nhiều ô, xem "Đưa vào lịch thêm" ở Viết Content) — trước đây xoá nhầm 1 ô
        // đã tích đã đăng thì Kho Content vĩnh viễn hiện sai "Đã đăng" cho bài chưa từng đăng thật
        // (phản hồi chị Quỳnh 2026-08-24: "liên kết linh hoạt giữa các phần").
        if(entry && entry.posted && entry.post_id){
          const { data: stillPosted } = await ctx.supabase.from('calendar_entries')
            .select('id').eq('post_id', entry.post_id).eq('posted', true).neq('id', id).limit(1);
          if(!stillPosted || !stillPosted.length){
            await ctx.supabase.from('posts').update({ posted: false }).eq('id', entry.post_id);
            await loadPosts();
          }
        }
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
      // Loại bài ĐÃ DÙNG khỏi danh sách đưa cho AI — KHÔNG chỉ bài đã xếp trong tuần ĐANG XEM
      // (state.entries chỉ tải đúng 7 ngày của tuần hiện tại, xem loadEntries()) mà cả bài đã xếp ở
      // TUẦN KHÁC (quá khứ/tương lai) và bài đã đăng thật rồi (posted=true) — trước đây thiếu 2 vế
      // này nên AI gợi ý lại cả bài đã dùng/đã đăng (phản hồi chị Quỳnh 23/8: "AI gợi ý tất cả các
      // bài dù đã làm hay chưa làm luôn, thế ko đc").
      const { data: allEntries } = await ctx.supabase.from('calendar_entries').select('post_id').eq('user_id', ctx.user.id);
      const usedPostIds = new Set((allEntries||[]).map(e=>e.post_id).filter(Boolean));
      const unscheduledPosts = state.posts.filter(p=>!p.posted && !usedPostIds.has(p.id)).slice(0, 15)
        .map(p=>({ title:p.title, content:p.content }));
      // Bài đã đăng có ĐIỀN số view thật (tự nguyện, xem [data-metric-field] ở bind()) — ưu tiên lấy
      // top bài hiệu quả nhất cho AI "học" công thức đang chạy tốt của CHÍNH người này, thay vì chỉ
      // dựa quy tắc chung (2026-08-23, theo đề xuất chị Quỳnh: "ai điền thì sẽ có lợi cho lịch các
      // tuần tiếp theo, ai ko điền thì thôi" — nên mảng này RỖNG nếu người dùng chưa từng điền, AI
      // vẫn chạy bình thường theo quy tắc chung).
      const { data: performedEntries } = await ctx.supabase.from('calendar_entries')
        .select('title,format,cta,views,likes,comments,shares').eq('user_id', ctx.user.id)
        .eq('posted', true).not('views', 'is', null).order('views', { ascending:false }).limit(6);
      const performanceData = (performedEntries||[]).map(e=>({
        title:e.title, format:e.format, cta:e.cta, views:e.views, likes:e.likes, comments:e.comments, shares:e.shares,
      }));
      const data = await callApi('/api/goi-y-lich', {
        positioning: state.positioning ? { luot1: state.positioning.luot1, luot2: state.positioning.luot2 } : null,
        quick_context: state.quickContext,
        weekly_goal: state.weeklyGoal,
        posts_per_day: state.postsPerDay,
        existing_posts: unscheduledPosts,
        performance_data: performanceData,
      }, 280000);
      state.aiSuggestions = data.result.lich;
      saveDraftForCurrentWeek();
    } catch(e){ state.aiError = e.message; }
    stopProgress(); releaseWakeLock();
    state.aiLoading = false;
    draw();
  }

  // "AI tự viết + xếp cả tuần" (2026-08-29, theo yêu cầu chị Quỳnh: "giảm nỗ lực khởi động mỗi lần
  // vào app") — KHÁC fetchAiSchedule() ở trên (chỉ gợi ý chủ đề) và KHÁC hẳn cron nền của admin
  // (api/cron/auto-fill-schedule.js, miễn phí, chỉ chạy cho admin) — đây là nút TỰ BẤM cho MỌI
  // khách, viết bài HOÀN CHỈNH và TRỪ LƯỢT THẬT theo từng bài (xem api/auto-fill-week.js).
  async function autoFillWeek(){
    if(state.autoFillBusy) return;
    state.autoFillBusy = true; state.autoFillError = null; state.autoFillResult = null; draw();
    const stopProgress = animateProgressButton(container.querySelector('[data-action="auto-fill-week"]'), 150, 'Đang viết');
    acquireWakeLock();
    try{
      // gatedWeight: endpoint này tốn lượt biến thiên (1-9 bài x 3, hoặc x4 nếu Cách 2) — không có
      // trọng số cố định trong GATED_API_WEIGHTS, phải đọc đúng số lượt THẬT server vừa trừ
      // (data.luot_used) để sidebar cộng đúng ngay, không đợi tải lại trang.
      const data = await callApi('/api/auto-fill-week', { week_start: isoDate(state.weekStart), mode: state.autoFillMode, custom_instructions: state.autoFillCustomInstructions }, 280000, { gatedWeight: (d)=>d.luot_used });
      const filledCount = (data.filled||[]).length;
      const parts = [];
      if(filledCount) parts.push(`✓ Đã viết và xếp ${filledCount} bài mới vào lịch`);
      if(data.quota_blocked) parts.push(data.quota_blocked);
      if(data.skipped_cap) parts.push(`còn ${data.skipped_cap} ô trống nữa — bấm "Bắt đầu viết" thêm lần nữa để tiếp tục`);
      if(data.skipped_no_candidate && data.skipped_no_candidate.length) parts.push(`${data.skipped_no_candidate.length} ô không tìm được nguồn phù hợp nên bỏ qua`);
      // Số liệu chẩn đoán nguồn (2026-08-31, theo phản hồi chị Quỳnh "kho content viral còn đầy mà,
      // ai kêu hết nguồn" — hiện số liệu thật thay vì chỉ giải thích suông) — chỉ hiện khi pool đúng
      // trục thật sự nhỏ (<5 bài chưa dùng), để không làm nhiễu thông báo lúc bình thường mọi thứ ổn.
      if(typeof data.pool_unused_size === 'number' && data.pool_unused_size < 5){
        parts.push(`⚠️ nguồn đúng trục "${data.truc||'—'}" hiện chỉ còn ${data.pool_unused_size} bài/hook chưa dùng (trong ${data.pool_matched_truc_size} bài khớp trục, ${data.pool_all_size} bài toàn kho) — dễ lặp lại chủ đề, cân nhắc bổ sung thêm nguồn cho trục này`);
      }
      state.autoFillResult = parts.length ? parts.join(' — ') : (data.message || 'Không có gì để điền.');
      await loadEntries();
    } catch(e){ state.autoFillError = e.message; }
    stopProgress(); releaseWakeLock();
    state.autoFillBusy = false;
    draw();
  }

  // "Làm lại cả tuần" (2026-08-28, theo yêu cầu chị Quỳnh) — xoá hết bài Fanpage đã lên lịch trong
  // TUẦN ĐANG XEM rồi viết lại từ đầu qua api/regen-fanpage-week.js (dùng lại đúng logic cron, áp
  // prompt case study mới nhất). Khác fetchAiSchedule() ở chỗ đây là XOÁ + GHI ĐÈ nên cần xác nhận
  // trước — bài gốc ở Kho Content không mất, chỉ gỡ khỏi lịch.
  async function regenFanpageWeek(){
    if(state.regenWeekLoading) return;
    if(!(await confirmModal('Xoá hết bài Fanpage đã lên lịch trong tuần đang xem rồi viết lại từ đầu? Bài gốc vẫn còn trong Kho Content, chỉ gỡ khỏi lịch tuần này.'))) return;
    state.regenWeekLoading = true; state.regenWeekError = null; draw();
    const stopProgress = animateProgressButton(container.querySelector('[data-action="regen-week"]'), 90, 'Đang viết lại');
    acquireWakeLock();
    try{
      // "bấm nút ai tự động trên lịch là ko làm đc nha, lỗi hoài" (chị Quỳnh 2026-08-31) — trước đây
      // gửi CẢ 7 NGÀY trong 1 lần gọi, mỗi ngày cần ít nhất 2 lượt AI tuần tự nên rất dễ vượt quá 300s
      // (timeout server) và lỗi gần như luôn luôn. Server giờ chỉ xử lý tối đa 3 ngày/lần gọi, trả về
      // remaining_dates — tự lặp lại gọi cho tới hết, chị vẫn chỉ cần bấm 1 lần, chỉ là chờ lâu hơn
      // (mỗi đợt cập nhật lịch ngay để thấy tiến độ dần, không phải chờ xong hết mới thấy gì).
      let dates = weekDays().map(isoDate);
      while(dates.length){
        const data = await callApi('/api/regen-fanpage-week', { dates }, 280000);
        dates = data.remaining_dates || [];
        await loadEntries(); draw();
      }
    } catch(e){ state.regenWeekError = e.message; }
    stopProgress(); releaseWakeLock();
    state.regenWeekLoading = false;
    draw();
  }

  async function saveSlotTimes(){
    if(state.slotTimeSaving) return;
    state.slotTimeSaving = true; state.slotTimeSaved = false; draw();
    const patch = { slot_time_sang: state.slotTimeSang, slot_time_trua: state.slotTimeTrua, slot_time_toi: state.slotTimeToi };
    const { error } = await ctx.supabase.from('profiles').update(patch).eq('id', ctx.user.id);
    state.slotTimeSaving = false;
    if(!error){
      state.slotTimeSaved = true;
      // Cập nhật ngay AppState.profile (ctx.profile CHÍNH LÀ nó, xem app-shell.js) — thấy giờ mới
      // ngay lần sau, không cần tải lại trang.
      if(ctx.profile) Object.assign(ctx.profile, patch);
    }
    draw();
  }

  // Kiểm tra đã có subscription push sẵn chưa (vd đã bật ở thiết bị này trước đó) — không tự hỏi
  // quyền, chỉ đọc trạng thái hiện có để hiện đúng nút Bật/Tắt.
  async function checkPushSubscription(){
    if(!state.pushSupported) { draw(); return; }
    try{
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      state.pushSubscribed = !!sub;
    } catch(e){ state.pushSubscribed = false; }
    draw();
  }

  // Bật thông báo: xin quyền trình duyệt → đăng ký PushManager → gửi lên server lưu lại. Trên
  // iPhone CHỈ hoạt động nếu đã cài app qua "Thêm vào Màn hình chính" (Safari không hỗ trợ Web Push
  // cho tab trình duyệt thường) — báo rõ lý do nếu subscribe thất bại vì việc này rất dễ hiểu nhầm
  // là "app bị lỗi" trong khi thực ra là do chưa cài app.
  async function enablePush(){
    if(state.pushBusy) return;
    state.pushBusy = true; state.pushError = null; draw();
    try{
      if(!state.pushSupported) throw new Error('Trình duyệt này không hỗ trợ thông báo đẩy.');
      const permission = await Notification.requestPermission();
      state.pushPermission = permission;
      if(permission !== 'granted') throw new Error('Bạn chưa cấp quyền thông báo — vào cài đặt trình duyệt/điện thoại để bật lại nếu muốn thử lại.');
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });
      await callApi('/api/push-subscribe', sub.toJSON());
      state.pushSubscribed = true;
    } catch(e){
      state.pushError = e.message || 'Không bật được thông báo — thử lại giúp mình.';
    }
    state.pushBusy = false; draw();
  }

  async function disablePush(){
    if(state.pushBusy) return;
    state.pushBusy = true; state.pushError = null; draw();
    try{
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if(sub){
        await callApi('/api/push-unsubscribe', { endpoint: sub.endpoint });
        await sub.unsubscribe();
      }
      state.pushSubscribed = false;
    } catch(e){
      state.pushError = e.message || 'Không tắt được thông báo — thử lại giúp mình.';
    }
    state.pushBusy = false; draw();
  }

  // Gửi ngay 1 thông báo test, không chờ đúng sự kiện thật — trả lời trực tiếp câu hỏi chị Quỳnh
  // 23/8 "sao e vẫn chưa thấy cái mục thông báo nó hoạt động nhỉ": server báo rõ đang vướng ở đâu
  // (chưa cấu hình VAPID, hay máy này chưa đăng ký nhận) thay vì im lặng không biết lý do.
  async function testPush(){
    if(state.testPushBusy) return;
    state.testPushBusy = true; state.testPushResult = null; draw();
    try{
      const data = await callApi('/api/test-push', {});
      state.testPushResult = { ok: data.ok, message: data.message };
    } catch(e){
      state.testPushResult = { ok:false, message: e.message || 'Không gửi được — thử lại giúp mình.' };
    }
    state.testPushBusy = false; draw();
  }

  boot();
  checkPushSubscription();
}

window.Modules = window.Modules || {};
window.Modules['lich-dang'] = { title:'Lịch Đăng Bài', render };
})();
