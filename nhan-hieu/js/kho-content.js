(function(){
// chuyen_gia_viet gộp chung nhãn với bai_mau (trùng ý — cùng là "mẫu tham khảo có sẵn", không phải
// tự viết), tai_che_viral vẫn giữ để hiển thị đúng nhãn cho bài cũ — nhưng cả 2 key này KHÔNG còn
// nằm trong danh sách người dùng tự chọn ở SOURCE_OPTIONS bên dưới, vì tai_che_viral đã được flow
// Tái Chế Viral tự gắn sẵn (xem tai-che-viral.js), không cần chọn tay.
const SOURCE_MAP = {
  ca_nhan: 'Câu chuyện cá nhân', case_hoc_vien: 'Case học viên', cau_hoi_kh: 'Câu hỏi khách hàng',
  xu_huong: 'Xu hướng thị trường', quan_diem_nguoc_dong: 'Quan điểm ngược dòng', bai_mau: 'Bài mẫu tham khảo',
  kien_thuc_nganh: 'Kiến thức ngành', chuyen_gia_viet: 'Bài mẫu tham khảo', tai_che_viral: 'Tái chế từ bài viral',
};
// kien_thuc_nganh (2026-08-21, theo yêu cầu chị Quỳnh): kiến thức chuyên môn/ngành người dùng tự
// gõ vào — Viết Content cho chọn 1 mục cụ thể để lồng vào bài, tạo cảm giác content có chuyên môn
// thật, không phải AI bịa kiến thức chung chung.
const SOURCE_OPTIONS = ['ca_nhan', 'case_hoc_vien', 'cau_hoi_kh', 'xu_huong', 'quan_diem_nguoc_dong', 'bai_mau', 'kien_thuc_nganh'];

// Nhãn 5 mốc lượt xem — khớp đúng MILESTONES ở api/goi-y-day-bai.js (trùng lặp nhỏ, ổn định, không
// đáng để export riêng chỉ vì 5 dòng chữ) — dùng để hiện lại bản đẩy bài ĐÃ CÓ SẴN ngay tại Kho
// Content, không bắt người dùng làm lại (xem postOptionsBodyHtml).
const DAY_BAI_MILESTONE_LABELS = { m1:'Trước 1.000 view', m2:'Đạt 10.000 view', m3:'Đạt 100.000 view', m4:'Đạt 1 triệu view', m5:'Trên 1 triệu view' };

// select mặc định trong style.css bị width:100%/padding:14px (dùng cho form nhập liệu dài) — ép lại
// gọn như 1 chip để dùng làm bộ lọc trục/trạng thái, đỡ chiếm cả hàng ngang dài như trước.
const COMPACT_SELECT_STYLE = 'width:auto;min-width:150px;margin-top:0;padding:8px 30px 8px 12px;font-size:13px;border-radius:999px;';

// Trục nội dung (content pillar) — nhóm các tag chi tiết trong data lại thành nhóm lớn dễ chọn,
// tránh người dùng bị ngộp vì phải lướt qua cả kho chung chưa lọc. Khớp key với api/_lib/pillars.js.
const PILLARS = [
  { key:'tai_chinh', label:'Tài chính', tags:['tai_chinh','tich_san','tiet_kiem','tin_dung','dong_tien','no'] },
  { key:'tam_linh', label:'Tâm linh', tags:['tam_linh','phong_thuy','than_so_hoc','phuoc_khi'] },
  { key:'hon_nhan_gia_dinh', label:'Hôn nhân & Gia đình', tags:['hon_nhan','gia_dinh','tinh_yeu','nuoi_day_con'] },
  { key:'phat_trien_ban_than', label:'Phát triển bản thân', tags:['phat_trien_ban_than','dong_luc','tu_duy','tam_ly','loi_song'] },
  { key:'kinh_doanh', label:'Kinh doanh', tags:['kinh_doanh','ban_hang','chien_luoc'] },
  { key:'suc_khoe_lam_dep', label:'Sức khoẻ & Làm đẹp', tags:['suc_khoe','cham_soc_da','lam_dep'] },
  { key:'xay_kenh', label:'Xây kênh & Content', tags:['xay_kenh','content','hook','giao_tiep','quan_diem','video','pov','listicle','series','tiktok'] },
];
function pillarsForItem(item){
  const tags = item.tags || [];
  return PILLARS.filter(p=>p.tags.some(t=>tags.includes(t))).map(p=>p.key);
}

function render(container, ctx){
  const isAdmin = !!(ctx.profile && ctx.profile.role==='admin');
  const state = {
    tab:'da-viet', posts:[], personalBank:[], sharedBank:[], positioning:null,
    newEntry:{ title:'', content:'', source_type:'', isViral:null, viralViews:'', viralLikes:'', viralScreenshot:null },
    addingPersonal:false, addPersonalError:null, sharePromptFor:null, shareSubmitting:false, shareDoneFor:null,
    writeFor:null, writeLoading:false, writeIdeas:null, writeError:null, writeQuickContext:'',
    positioningId:null, applyingVoice:null, applyVoiceError:null, applyVoiceErrorFor:null, voiceAppliedFor:null,
    chungPillar:'all', daVietPillar:'all', khoToiPillar:'all', expandedIds:new Set(), expandedOptionsIds:new Set(), expandedDayBaiIds:new Set(),
    daVietStatus:'all', daVietSearch:'', khoToiSearch:'', chungSearch:'', scheduledPostIds:new Set(),
    editingPostId:null, editDraft:null, editSaving:false, editSaveError:null,
  };

  function draw(){ container.innerHTML = html(); bind(); }

  // Đánh dấu bài nào đã có trong Lịch Đăng Bài rồi (giống pattern đã có ở viet-content.js) — theo
  // yêu cầu chị Quỳnh 2026-08-26: "content nào đã cho vào lịch thì nút đưa vào lịch phải hiện là
  // đang trong lịch", tránh lỡ tay đưa trùng 1 bài vào lịch nhiều lần mà không hay.
  async function loadScheduledPostIds(){
    const { data } = await ctx.supabase.from('calendar_entries').select('post_id').eq('user_id', ctx.user.id).not('post_id', 'is', null);
    state.scheduledPostIds = new Set((data || []).map(e => e.post_id));
  }

  async function boot(){
    container.innerHTML = `<div class="loading"><div class="spinner"></div><p>Đang tải…</p></div>`;
    const { data: pos } = await ctx.supabase.from('positioning_results').select('*').eq('user_id', ctx.user.id).maybeSingle();
    state.positioning = pos || null;
    state.positioningId = pos ? pos.id : null;
    await Promise.all([loadPosts(), loadPersonal(), loadShared(), loadScheduledPostIds()]);
    // Đi tới từ Lịch Đăng Bài khi slot đó chưa có bài viết sẵn — mở thẳng đúng trục nội dung
    // trong Kho Content Viral thay vì bắt người dùng tự chọn lại từ đầu.
    if(window.PendingPillar){
      state.tab = 'kho-chung';
      state.chungPillar = window.PendingPillar;
      window.PendingPillar = null;
    }
    draw();
  }
  async function loadPosts(){
    const { data } = await ctx.supabase.from('posts').select('*').eq('user_id', ctx.user.id).order('created_at', { ascending:false });
    state.posts = data || [];
  }

  async function savePostEdit(id){
    if(!state.editDraft || !state.editDraft.title.trim()){ state.editSaveError = 'Nhập tiêu đề trước khi lưu.'; draw(); return; }
    state.editSaving = true; draw();
    const { error } = await ctx.supabase.from('posts').update({ title: state.editDraft.title.trim(), content: state.editDraft.content }).eq('id', id);
    state.editSaving = false;
    if(error){ state.editSaveError = error.message; draw(); return; }
    state.editingPostId = null; state.editDraft = null; state.editSaveError = null;
    await loadPosts();
    draw();
  }
  async function loadPersonal(){
    const { data } = await ctx.supabase.from('content_bank_personal').select('*').eq('user_id', ctx.user.id).order('created_at', { ascending:false });
    state.personalBank = data || [];
  }
  async function loadShared(){
    const { data } = await ctx.supabase.from('content_bank_shared').select('*')
      .order('pin_order', { ascending:true, nullsFirst:false })
      .order('created_at', { ascending:false });
    state.sharedBank = data || [];
  }

  function findSourceText(key){
    if(!key) return '';
    const [kind, id] = key.split(':');
    if(kind==='post') return (state.posts.find(p=>p.id===id)||{}).content || '';
    if(kind==='personal') return (state.personalBank.find(b=>b.id===id)||{}).content || '';
    if(kind==='shared') return (state.sharedBank.find(b=>b.id===id)||{}).content || '';
    return '';
  }

  // Bảng gốc thật trong DB ứng với từng loại key — dùng để ghi lại "bài mới viết từ đâu" khi lưu ở
  // Viết Content (posts.source_table/source_id), rồi đếm ngược lại ở đây để hiện "✓ Đã dùng N lần".
  const SOURCE_TABLE_BY_KIND = { post:'posts', personal:'content_bank_personal', shared:'content_bank_shared' };
  function sourceRefForKey(key){
    if(!key) return null;
    const [kind, id] = key.split(':');
    const table = SOURCE_TABLE_BY_KIND[kind];
    return table ? { table, id } : null;
  }
  // Đếm số bài trong "Bài đã viết" đã trỏ nguồn về đúng key này — chỉ cần đọc lại state.posts đã
  // tải sẵn, không cần gọi DB thêm.
  function usageCountFor(key){
    const ref = sourceRefForKey(key);
    if(!ref) return 0;
    return state.posts.filter(p=>p.source_table===ref.table && p.source_id===ref.id).length;
  }
  // Mục đã dùng viết bài rồi thì đẩy xuống cuối danh sách — mục chưa dùng nổi lên trên để dễ chọn
  // tiếp (theo phản hồi chị Quỳnh 21/8), giữ nguyên thứ tự tương đối trong từng nhóm.
  function sortUnusedFirst(items, kindPrefix){
    return items
      .map((item,i)=>({ item, i, used: usageCountFor(kindPrefix+':'+item.id) > 0 }))
      .sort((a,b)=> a.used===b.used ? a.i-b.i : (a.used?1:-1))
      .map(x=>x.item);
  }
  function usageBadgeHtml(key){
    const n = usageCountFor(key);
    return n>0 ? `<span style="color:var(--accent);font-size:12px;font-weight:600;">✓ Đã dùng viết bài ${n} lần</span>` : '';
  }

  // Tiêu đề lưu riêng cột "title" trong DB, tách khỏi "content" (thân bài) — cần lấy đúng cột này
  // khi đưa bài sang Viết Content, nếu không AI sẽ không biết đâu là tiêu đề gốc do admin đặt.
  function findSourceTitle(key){
    if(!key) return '';
    const [kind, id] = key.split(':');
    if(kind==='post') return (state.posts.find(p=>p.id===id)||{}).title || '';
    if(kind==='personal') return (state.personalBank.find(b=>b.id===id)||{}).title || '';
    if(kind==='shared') return (state.sharedBank.find(b=>b.id===id)||{}).title || '';
    return '';
  }

  // Trục nội dung của bài/tư liệu gốc — kế thừa sang bài mới viết từ đây (xem PendingKhoGoc bên
  // dưới) để "Bài đã viết" tự nhóm đúng trục, không bắt người dùng gắn tag lại từ đầu.
  function findSourceTags(key){
    if(!key) return [];
    const [kind, id] = key.split(':');
    if(kind==='post') return (state.posts.find(p=>p.id===id)||{}).tags || [];
    if(kind==='personal') return (state.personalBank.find(b=>b.id===id)||{}).tags || [];
    if(kind==='shared') return (state.sharedBank.find(b=>b.id===id)||{}).tags || [];
    return [];
  }

  function html(){
    return `
      <div class="page-head"><h1>Kho Content</h1><p>Bài đã viết, tư liệu bạn tự sưu tầm, và Kho Content Viral do đội ngũ tuyển chọn.</p></div>
      <div class="tab-row">
        <div class="tab-btn ${state.tab==='da-viet'?'active':''}" data-tab="da-viet">Bài đã viết (${state.posts.length})</div>
        <div class="tab-btn ${state.tab==='kho-toi'?'active':''}" data-tab="kho-toi">Kho của tôi (${state.personalBank.length})</div>
        <div class="tab-btn ${state.tab==='kho-chung'?'active':''}" data-tab="kho-chung">Kho Content Viral (${state.sharedBank.length})</div>
      </div>
      ${state.tab==='da-viet' ? daVietTab() : state.tab==='kho-toi' ? khoToiTab() : khoChungTab()}
    `;
  }

  // Danh sách chọn bài (Bài đã viết/Kho của tôi/Kho Content Viral) chỉ hiện vài dòng đầu — đọc hết
  // cả bài ngay trong lúc lướt chọn khiến trang dài dằng dặc. Bấm "Đọc full" mới xổ ra toàn bộ,
  // "Thu gọn" để đóng lại — trạng thái nhớ theo từng item qua state.expandedIds.
  function contentBodyHtml(key, content, opts){
    const isExpanded = state.expandedIds.has(key);
    const text = content || '';
    const preview = excerpt(text, 160);
    const needsToggle = text.length > preview.length;
    const isProtected = opts && opts.protected;
    const bodyClass = isProtected ? 'body protected' : 'body';
    const protectAttrs = isProtected ? ' oncontextmenu="return false;" oncopy="return false;" oncut="return false;"' : '';
    return `
      <div class="${bodyClass}"${protectAttrs}>${esc(isExpanded ? text : preview)}</div>
      ${needsToggle ? `<span style="display:inline-block;margin-top:6px;color:var(--accent);font-size:12.5px;font-weight:600;cursor:pointer;" data-toggle-full="${key}">${isExpanded?'Thu gọn ↑':'Đọc full →'}</span>` : ''}
    `;
  }

  // Riêng "Bài đã viết" — chỉ hiện TIÊU ĐỀ, không hiện đoạn trích nào cả (khác contentBodyHtml ở
  // trên vẫn hiện 160 ký tự đầu) — theo phản hồi chị Quỳnh 2026-08-24: "chỉ cần để tiêu đề thôi là
  // được, muốn đọc hết thì bấm đọc full, cho gọn" (kho nhiều bài, mỗi bài lộ vài dòng nội dung cộng
  // dồn lại rất dài, tiêu đề đã đủ để nhận ra đúng bài cần tìm). Dùng chung state.expandedIds/
  // data-toggle-full với contentBodyHtml nên không cần thêm binding riêng.
  function titleOnlyBodyHtml(key, content){
    const isExpanded = state.expandedIds.has(key);
    if(!isExpanded){
      return `<span style="color:var(--accent);font-size:12.5px;font-weight:600;cursor:pointer;" data-toggle-full="${key}">Đọc full →</span>`;
    }
    return `
      <div class="body">${esc(content||'')}</div>
      <span style="display:inline-block;margin-top:6px;color:var(--accent);font-size:12.5px;font-weight:600;cursor:pointer;" data-toggle-full="${key}">Thu gọn ↑</span>
    `;
  }

  // Thanh chip lọc theo trục — LUÔN hiển thị cùng danh sách đầy đủ ngay bên dưới, không còn là
  // màn hình chặn phải chọn trục xong mới thấy item (gây khó tìm khi người dùng chưa rõ trục nào).
  function pillarChipsHtml(items, currentKey, dataAttr){
    const chips = PILLARS.map(p=>{
      const count = items.filter(x=>pillarsForItem(x).includes(p.key)).length;
      if(count===0) return '';
      return `<div class="chip ${currentKey===p.key?'selected':''}" data-${dataAttr}="${p.key}">${esc(p.label)} (${count})</div>`;
    }).join('');
    const noneCount = items.filter(x=>pillarsForItem(x).length===0).length;
    const noneChip = noneCount ? `<div class="chip ${currentKey==='none'?'selected':''}" data-${dataAttr}="none">Chưa phân loại (${noneCount})</div>` : '';
    return `<div class="chips" style="margin-bottom:16px;">
      <div class="chip ${currentKey==='all'?'selected':''}" data-${dataAttr}="all">Tất cả (${items.length})</div>
      ${chips}${noneChip}
    </div>`;
  }
  function filterByPillar(items, key){
    return key==='all' ? items : key==='none' ? items.filter(x=>pillarsForItem(x).length===0) : items.filter(x=>pillarsForItem(x).includes(key));
  }

  // Bộ lọc dạng list (thay vì chip) cho "Bài đã viết" — dùng khi số bài nhiều lên, chip dễ tràn dòng
  // khó nhìn hơn hẳn 1 danh sách xổ xuống. Chỉ áp riêng tab này (2026-08-20, theo phản hồi chị Quỳnh).
  function pillarSelectHtml(items, currentKey, dataAttr){
    const options = PILLARS.map(p=>{
      const count = items.filter(x=>pillarsForItem(x).includes(p.key)).length;
      if(count===0) return '';
      return `<option value="${p.key}" ${currentKey===p.key?'selected':''}>${esc(p.label)} (${count})</option>`;
    }).join('');
    const noneCount = items.filter(x=>pillarsForItem(x).length===0).length;
    const noneOption = noneCount ? `<option value="none" ${currentKey==='none'?'selected':''}>Chưa phân loại (${noneCount})</option>` : '';
    return `<select data-${dataAttr} style="${COMPACT_SELECT_STYLE}">
      <option value="all" ${currentKey==='all'?'selected':''}>Tất cả trục (${items.length})</option>
      ${options}${noneOption}
    </select>`;
  }
  function statusSelectHtml(items, currentStatus){
    const postedCount = items.filter(p=>p.posted).length;
    return `<select data-daviet-status style="${COMPACT_SELECT_STYLE}">
      <option value="all" ${currentStatus==='all'?'selected':''}>Tất cả trạng thái (${items.length})</option>
      <option value="posted" ${currentStatus==='posted'?'selected':''}>Đã đăng (${postedCount})</option>
      <option value="not_posted" ${currentStatus==='not_posted'?'selected':''}>Chưa đăng (${items.length-postedCount})</option>
    </select>`;
  }

  // Chỉ 1 giọng mẫu áp dụng tại 1 thời điểm (chọn mới sẽ thay thế cũ) — kiểm tra đúng bài/hook này
  // có phải nguồn giọng mẫu ĐANG DÙNG không, để hiện dấu cố định thay vì nút bấm mù mờ như mọi mục.
  function isCurrentVoiceSample(key){
    const ref = sourceRefForKey(key);
    if(!ref || !state.positioning) return false;
    return state.positioning.voice_sample_source_table===ref.table && state.positioning.voice_sample_source_id===ref.id;
  }

  function writeActionHtml(key){
    const isOpen = state.writeFor === key;
    const isCurrentVoice = isCurrentVoiceSample(key);
    return `
      <div style="margin-top:12px;display:flex;flex-wrap:wrap;gap:10px;align-items:center;">
        <span class="btn-ghost btn btn-sm" data-write-toggle="${key}">${isOpen?'Đóng':'Viết bài từ đây →'}</span>
        ${isCurrentVoice
          ? `<span style="color:var(--accent);font-size:12.5px;font-weight:600;">✓ Đang là giọng mẫu</span>`
          : `<span class="btn-ghost btn btn-sm" data-apply-voice="${key}" ${state.applyingVoice===key?'disabled':''}>${state.applyingVoice===key?'Đang phân tích giọng văn…':'Dùng làm giọng mẫu'}</span>`
        }
        ${usageBadgeHtml(key)}
      </div>
      ${isOpen ? writePanelHtml() : ''}
      ${state.voiceAppliedFor===key?`<div class="hint-box" style="margin-top:10px;">Đã cập nhật giọng điệu &amp; ngôn ngữ vào Định Vị theo bài này — đây giờ là giọng mẫu đang dùng, thay thế giọng mẫu trước đó (nếu có).</div>`:''}
      ${state.applyVoiceErrorFor===key?`<div class="error-box" style="margin-top:10px;">${esc(state.applyVoiceError)}</div>`:''}
    `;
  }

  function writePanelHtml(){
    const hasPositioning = !!(state.positioning && state.positioning.luot1);
    if(state.writeLoading) return `<div class="btn-row" style="margin-top:10px;justify-content:flex-start;"><button class="btn-ghost btn btn-sm" data-write-generate="1" disabled>Đang sinh ý tưởng…</button></div>`;
    if(state.writeIdeas){
      return `<div style="margin-top:10px;display:flex;flex-direction:column;gap:8px;">
        ${state.writeIdeas.map((idea,i)=>`<div style="border:1px solid var(--line);border-radius:8px;padding:10px 12px;background:var(--accent-soft);">
          <div style="font-size:13px;">${esc(idea)}</div>
          <span style="display:inline-block;margin-top:6px;color:var(--accent);font-size:12px;font-weight:600;cursor:pointer;" data-use-idea="${i}">Dùng ý tưởng này →</span>
        </div>`).join('')}
      </div>`;
    }
    return `
      ${!hasPositioning ? `
        <div class="hint-box" style="margin-top:10px;">Chưa có <a href="#dinh-vi">Định Vị</a> đã lưu — điền nhanh ngành/đối tượng bên dưới để vẫn sinh được ý tưởng đúng hướng, hoặc giữ nguyên nội dung để viết luôn.</div>
        <textarea id="write-quick-context" style="min-height:auto;height:44px;margin-top:8px;" placeholder="Ví dụ: Coach tài chính cá nhân, hướng tới người mới đi làm...">${esc(state.writeQuickContext)}</textarea>
      ` : ''}
      ${state.writeError?`<div class="error-box" style="margin-top:10px;">${esc(state.writeError)}</div>`:''}
      <div class="btn-row" style="margin-top:10px;justify-content:flex-start;">
        <button class="btn btn-sm" data-write-keep="1">Viết lại bằng câu chuyện của tôi →</button>
        <button class="btn-ghost btn btn-sm" data-write-generate="1">Tạo 5 ý tưởng mới từ đây</button>
        <span style="font-size:11px;color:var(--ink-soft);align-self:center;">("Tạo 5 ý tưởng" tốn 1 lượt AI)</span>
      </div>
      <div style="margin-top:6px;font-size:11.5px;color:var(--ink-soft);">Bài trong kho là cấu trúc đã được kiểm chứng viral — giữ nguyên hook và cấu trúc/trình tự bài gốc, chỉ đổi câu từ ở các đoạn còn lại bằng giọng và câu chuyện của bạn, không sao chép nguyên văn.</div>`;
  }

  function daVietTab(){
    const hint = `<div class="hint-box" style="margin-bottom:14px;">Toàn bộ bài bạn đã viết và lưu lại — xem lại, sửa tiếp, hoặc đưa vào Lịch Đăng Bài từ đây. AI tự xếp đúng trục nội dung ngay khi bạn lưu bài. Tích "đã đăng thật" ở Lịch Đăng Bài sẽ tự cập nhật trạng thái đã đăng cho đúng bài này.</div>`;
    if(state.posts.length===0) return hint + `<div class="card" style="color:var(--ink-soft);">Chưa có bài nào — sang tab <b>Kho Content Viral</b> chọn 1 bài mẫu phù hợp trục nội dung của bạn để viết bài đầu tiên.</div>`;

    const filterBar = `
      <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin-bottom:16px;">
        ${pillarSelectHtml(state.posts, state.daVietPillar, 'daviet-pillar')}
        ${statusSelectHtml(state.posts, state.daVietStatus)}
        <input type="text" data-daviet-search value="${esc(state.daVietSearch)}" placeholder="Tìm theo tên bài..." style="flex:1;min-width:180px;padding:8px 12px;border:1px solid var(--line);border-radius:8px;font-size:13.5px;">
      </div>
    `;

    let items = filterByPillar(state.posts, state.daVietPillar);
    if(state.daVietStatus==='posted') items = items.filter(p=>p.posted);
    else if(state.daVietStatus==='not_posted') items = items.filter(p=>!p.posted);
    const q = state.daVietSearch.trim().toLowerCase();
    if(q) items = items.filter(p=>(p.title||'').toLowerCase().includes(q));
    // Bài đã đăng đẩy xuống cuối (theo yêu cầu chị Quỳnh 2026-08-26) — bài CHƯA đăng mới cần chú ý
    // tiếp theo (viết lại/đưa vào lịch/sửa), bài đã đăng chỉ còn cần xem lại số liệu thỉnh thoảng.
    items = items
      .map((item,i)=>({ item, i }))
      .sort((a,b)=> (!!a.item.posted)===(!!b.item.posted) ? a.i-b.i : (a.item.posted?1:-1))
      .map(x=>x.item);

    if(items.length===0) return hint + filterBar + `<div style="color:var(--ink-soft);font-size:14px;">Không có bài nào khớp bộ lọc.</div>`;

    return hint + filterBar + items.map(p=>{
      const isEditing = state.editingPostId === p.id;
      return `
      <div class="section">
        ${isEditing ? '' : `<h3>${esc(p.title||'(không tiêu đề)')}${p.posted?` <span style="color:var(--danger);font-size:12px;font-weight:600;vertical-align:middle;">✓ Đã đăng</span>`:''}</h3>`}
        ${isEditing ? '' : (p.posted ? postMetricsHtml(p) : '')}
        ${isEditing ? editPostHtml(p) : titleOnlyBodyHtml('post:'+p.id, p.content)}
        ${isEditing ? '' : postOptionsPanelHtml(p)}
      </div>
    `;}).join('');
  }

  // Kết quả thật (view/like/cmt/share) — hiện + SỬA ĐƯỢC ngay tại đây (2026-08-26, theo yêu cầu chị
  // Quỳnh: "mục view khi điền ở lịch thì cũng auto cập nhật ở kho luôn, sau này muốn sửa view cũng
  // sửa được, mục đích để theo dõi hiệu quả bài đăng") — số liệu lưu ở posts (đồng bộ 2 chiều với
  // calendar_entries.views/likes/comments/shares, xem lich-dang.js + bind() bên dưới), chỉ hiện khi
  // bài đã đăng vì số liệu chỉ có ý nghĩa sau khi đã thật sự đăng.
  function postMetricsHtml(p){
    const field = (key, label, placeholder)=>`
      <div style="flex:1;min-width:70px;">
        <label style="display:block;font-size:10px;color:var(--ink-soft);text-transform:uppercase;letter-spacing:.03em;margin-bottom:3px;">${esc(label)}</label>
        <input type="number" min="0" inputmode="numeric" data-post-metric-field="${key}" data-post-metric-id="${p.id}" value="${p[key]==null?'':p[key]}" placeholder="${esc(placeholder)}" style="width:100%;padding:5px 8px;border-radius:6px;border:1px solid var(--line);font-size:12.5px;">
      </div>
    `;
    return `
      <div style="display:flex;gap:8px;margin-top:8px;flex-wrap:wrap;">
        ${field('views','View','0')}${field('likes','Like','0')}${field('comments','Cmt','0')}${field('shares','Share','0')}
      </div>
    `;
  }

  // Trước đây mỗi hành động (đưa vào lịch, đẩy bài, viết lại, giọng mẫu, tuỳ chọn CTA, sửa, xoá) nằm
  // rải rác thành nhiều hàng/nút riêng ngay trên card, và "Tuỳ chọn bài viết" (CTA/bình luận ghim)
  // chỉ hiện với bài CÓ dữ liệu đó — khiến các card trông khác hình dạng nhau, rối mắt khi kho có
  // nhiều bài (phản hồi chị Quỳnh 2026-08-24: "nhiều content nhìn rối mắt quá... sao vài cái có vài
  // cái không vậy"). Gộp hết vào ĐÚNG 1 khối "Tuỳ chọn ▾" duy nhất mỗi bài — mọi card giờ cùng 1
  // hình dạng ngoài (tiêu đề + preview + 1 nút Tuỳ chọn), khác nhau ở NỘI DUNG bên trong khi mở ra.
  function postOptionsPanelHtml(p){
    const isOpen = state.expandedOptionsIds.has(p.id);
    return `
      <div style="margin-top:12px;padding-top:10px;border-top:1px solid var(--line);">
        <span style="color:var(--accent);font-size:12.5px;font-weight:600;cursor:pointer;" data-toggle-options="${p.id}">${isOpen?'▾':'▸'} Tuỳ chọn</span>
        ${isOpen ? postOptionsBodyHtml(p) : ''}
      </div>
    `;
  }

  // 1 khối "nhãn + nội dung + nút Copy" dùng chung cho mọi mục copy-only trong Tuỳ chọn (CTA/bình
  // luận ghim của bài, và các mục Đẩy Bài đã có sẵn bên dưới) — data-copy-value đã có binding chung.
  function copyRowHtml(label, value){
    if(!value) return '';
    return `
      <div style="background:var(--panel);border:1px solid var(--line);border-radius:8px;padding:8px 10px;display:flex;justify-content:space-between;align-items:flex-start;gap:10px;">
        <div>
          <div style="font-size:10.5px;font-weight:700;color:var(--ink-soft);text-transform:uppercase;letter-spacing:.04em;margin-bottom:3px;">${esc(label)}</div>
          <div style="font-size:13px;">${esc(value)}</div>
        </div>
        <span class="btn-ghost btn btn-sm" style="flex-shrink:0;padding:3px 10px;font-size:11.5px;" data-copy-value="${esc(value)}">Copy</span>
      </div>
    `;
  }

  // Bài ĐÃ từng làm Đẩy Bài (posts.day_bai_plan đã có, xem day-bai.js) — theo phản hồi chị Quỳnh
  // 2026-08-24: "nếu bài đó đã từng làm đẩy bài thì cái nút đấy hiện ra các mục để copy thôi chứ
  // không phải làm lại nữa". Hiện thẳng lại đúng kết quả đã lưu (5 mốc, mỗi mốc có bình luận tự
  // đăng + trả lời từ khoá CTA) để copy tại chỗ, không điều hướng sang trang Đẩy Bài/không gọi AI lại.
  function dayBaiPlanCopyHtml(p){
    const isOpen = state.expandedDayBaiIds.has(p.id);
    return `
      <div>
        <span class="btn-ghost btn btn-sm" data-toggle-daybai="${p.id}">${isOpen?'Đóng':'✓ Xem lại Đẩy Bài & CTA Comment để copy'}</span>
        ${isOpen ? dayBaiPlanBodyHtml(p) : ''}
      </div>
    `;
  }
  function dayBaiPlanBodyHtml(p){
    const plan = p.day_bai_plan;
    if(!plan || !Array.isArray(plan.moc)) return '';
    return `
      <div style="margin-top:10px;display:flex;flex-direction:column;gap:10px;">
        ${plan.moc.map(m=>`
          <div style="border:1px solid var(--line);border-radius:8px;padding:10px 12px;display:flex;flex-direction:column;gap:6px;">
            <div style="font-size:11px;font-weight:700;color:var(--accent);text-transform:uppercase;letter-spacing:.03em;">${esc(DAY_BAI_MILESTONE_LABELS[m.moc]||m.moc)}</div>
            ${copyRowHtml('Bình luận tự đăng', m.cmt_tu_dang)}
            ${copyRowHtml('Trả lời từ khoá CTA', m.tra_loi_tu_khoa_cta)}
          </div>
        `).join('')}
      </div>
    `;
  }

  function postOptionsBodyHtml(p){
    const key = 'post:'+p.id;
    const s = p.structure;
    const ctaParts = [];
    if(s){
      if(s.tu_khoa_cta) ctaParts.push({ label:'Từ khoá CTA', value: s.tu_khoa_cta });
      if(s.cau_cmt_ghim) ctaParts.push({ label:'Bình luận ghim', value: s.cau_cmt_ghim });
      (s.cmt_cta_san_pham||[]).filter(Boolean).forEach((c,i)=>{
        ctaParts.push({ label:`Bình luận CTA sản phẩm/group${(s.cmt_cta_san_pham.length>1)?` #${i+1}`:''}`, value: c });
      });
    }
    return `
      <div style="margin-top:10px;display:flex;flex-direction:column;gap:12px;">
        <div class="btn-row" style="justify-content:flex-start;margin-top:0;">
          ${!p.posted ? `<button class="btn btn-sm" data-schedule="${p.id}">${state.scheduledPostIds.has(p.id)?'✓ Đang trong lịch — Thêm nữa →':'Đưa vào lịch →'}</button>` : ''}
          ${!p.day_bai_plan ? `<span class="btn-ghost btn btn-sm" data-day-bai="${p.id}">Đẩy bài &amp; CTA Comment →</span>` : ''}
        </div>
        ${p.day_bai_plan ? dayBaiPlanCopyHtml(p) : ''}
        ${writeActionHtml(key)}
        ${ctaParts.length ? `
          <div style="display:flex;flex-direction:column;gap:8px;">
            ${ctaParts.map(part=>copyRowHtml(part.label, part.value)).join('')}
          </div>
        ` : ''}
        <div style="display:flex;justify-content:space-between;align-items:center;padding-top:8px;border-top:1px solid var(--line);">
          <span class="btn-ghost btn btn-sm" data-edit-post="${p.id}">Sửa bài</span>
          <span style="color:var(--danger);font-size:12.5px;cursor:pointer;" data-delete-post="${p.id}">Xoá bài</span>
        </div>
      </div>
    `;
  }

  function editPostHtml(p){
    const draft = state.editDraft || { title:p.title||'', content:p.content||'' };
    return `
      <div>
        <label style="display:block;font-size:12.5px;font-weight:600;color:var(--ink-soft);margin-bottom:4px;">Tiêu đề</label>
        <textarea id="edit-title" style="min-height:auto;height:40px;">${esc(draft.title)}</textarea>
        <label style="display:block;font-size:12.5px;font-weight:600;color:var(--ink-soft);margin:10px 0 4px;">Nội dung</label>
        <textarea id="edit-content" style="min-height:220px;">${esc(draft.content)}</textarea>
        ${state.editSaveError?`<div class="error-box" style="margin-top:8px;">${esc(state.editSaveError)}</div>`:''}
        <div class="btn-row" style="margin-top:10px;">
          <button class="btn btn-sm" data-edit-save="${p.id}" ${state.editSaving?'disabled':''}>${state.editSaving?'Đang lưu…':'Lưu'}</button>
          <span class="btn-ghost btn btn-sm" data-edit-cancel="1">Huỷ</span>
        </div>
      </div>
    `;
  }

  function sharePromptHtml(){
    return `
      <div class="hint-box" style="margin-top:14px;display:flex;flex-direction:column;gap:10px;">
        <div>Bạn vừa thêm 1 content viral — muốn đề xuất đẩy lên <b>Kho Content Viral</b> để mọi người cùng dùng không? Admin sẽ xem qua rồi mới duyệt hiển thị công khai.</div>
        <div class="btn-row" style="margin-top:0;justify-content:flex-start;">
          <button class="btn btn-sm" data-share-yes="1" ${state.shareSubmitting?'disabled':''}>${state.shareSubmitting?'Đang gửi…':'Có, đề xuất lên Kho chung'}</button>
          <span class="btn-ghost btn btn-sm" data-share-no="1">Không, giữ riêng</span>
        </div>
      </div>
    `;
  }

  function khoToiTab(){
    const hint = `<div class="hint-box" style="margin-bottom:14px;">Nơi lưu chất liệu của riêng bạn — câu chuyện cá nhân, case học viên, câu hỏi khách hàng hay gặp. <b>Đặc biệt nên cập nhật cả những content đang viral bạn tự tìm thấy ở nơi khác</b> (kênh khác, group khác...) — AI sẽ tự chọn đúng trục nội dung giúp bạn, không cần tự chọn nữa.<br><br>💡 Chọn loại nguồn <b>"Kiến thức ngành"</b> để lưu kiến thức/kinh nghiệm chuyên môn — sang <a href="#viet-content">Viết Content</a> sẽ chọn được lồng thẳng vào bài, giúp content có chuyên môn thật thay vì AI viết chung chung.</div>`;
    return hint + `
      <div class="card">
        <label style="display:block;font-size:13px;font-weight:600;color:var(--ink-soft);margin-bottom:6px;">Tiêu đề</label>
        <textarea id="ne-title" style="min-height:auto;height:44px;">${esc(state.newEntry.title)}</textarea>
        <label style="display:block;font-size:13px;font-weight:600;color:var(--ink-soft);margin:14px 0 6px;">Nội dung</label>
        <textarea id="ne-content">${esc(state.newEntry.content)}</textarea>
        <label style="display:block;font-size:13px;font-weight:600;color:var(--ink-soft);margin:14px 0 6px;">Loại nguồn</label>
        <select id="ne-source">
          <option value="">— Chọn —</option>
          ${SOURCE_OPTIONS.map(k=>`<option value="${k}" ${state.newEntry.source_type===k?'selected':''}>${esc(SOURCE_MAP[k])}</option>`).join('')}
        </select>

        <label style="display:block;font-size:13px;font-weight:600;color:var(--ink-soft);margin:14px 0 6px;">Đây có phải content đang viral bạn tìm thấy ở nơi khác không?</label>
        <div class="chips">
          <div class="chip ${state.newEntry.isViral===true?'selected':''}" data-ne-viral="yes">Có, content viral tôi sưu tầm</div>
          <div class="chip ${state.newEntry.isViral===false?'selected':''}" data-ne-viral="no">Không, câu chuyện/case của tôi</div>
        </div>
        ${state.newEntry.isViral===true ? `
          <div style="display:flex;gap:12px;margin-top:12px;flex-wrap:wrap;">
            <div style="flex:1;min-width:140px;">
              <label style="display:block;font-size:12.5px;font-weight:600;color:var(--ink-soft);margin-bottom:4px;">Số lượt xem (view) — nếu biết</label>
              <input id="ne-views" type="text" value="${esc(state.newEntry.viralViews)}" placeholder="VD: 500k" style="width:100%;padding:12px 14px;border:1px solid var(--line);border-radius:10px;font-size:14.5px;background:#FDFCF8;">
            </div>
            <div style="flex:1;min-width:140px;">
              <label style="display:block;font-size:12.5px;font-weight:600;color:var(--ink-soft);margin-bottom:4px;">Số lượt thích (like) — nếu biết</label>
              <input id="ne-likes" type="text" value="${esc(state.newEntry.viralLikes)}" placeholder="VD: 20k" style="width:100%;padding:12px 14px;border:1px solid var(--line);border-radius:10px;font-size:14.5px;background:#FDFCF8;">
            </div>
          </div>
          <label style="display:block;font-size:12.5px;font-weight:600;color:var(--ink-soft);margin:12px 0 4px;">Ảnh chụp màn hình chứng minh view/like (không bắt buộc, nhưng giúp admin duyệt nhanh hơn)</label>
          ${state.newEntry.viralScreenshot ? `
            <div style="display:flex;align-items:center;gap:10px;">
              <img src="${state.newEntry.viralScreenshot}" style="max-width:160px;max-height:160px;border-radius:8px;border:1px solid var(--line);">
              <span style="color:var(--danger);cursor:pointer;font-size:12.5px;" data-action="clear-viral-screenshot">Xoá ảnh</span>
            </div>
          ` : `<input type="file" accept="image/*" id="ne-screenshot">`}
        ` : ''}

        <div class="btn-row" style="margin-top:14px;"><button class="btn" data-action="add-personal" ${state.addingPersonal?'disabled':''}>${state.addingPersonal?'Đang phân loại…':'Thêm vào kho của tôi'}</button></div>
        ${state.addPersonalError?`<div class="error-box">${esc(state.addPersonalError)}</div>`:''}
      </div>
      ${state.sharePromptFor ? sharePromptHtml() : ''}
      ${state.shareDoneFor ? `<div class="hint-box" style="margin-top:14px;">${esc(state.shareDoneFor)}</div>` : ''}
      <div style="margin-top:20px;">
        ${khoToiListHtml()}
      </div>
    `;
  }

  function khoToiListHtml(){
    if(state.personalBank.length===0) return `<div style="color:var(--ink-soft);font-size:14px;">Kho của bạn đang trống.</div>`;

    let items = filterByPillar(state.personalBank, state.khoToiPillar);
    const q = state.khoToiSearch.trim().toLowerCase();
    if(q) items = items.filter(b=>(b.title||'').toLowerCase().includes(q));
    items = sortUnusedFirst(items, 'personal');
    const searchHtml = `<input type="text" data-khotoi-search value="${esc(state.khoToiSearch)}" placeholder="Tìm theo tiêu đề..." style="width:100%;padding:8px 12px;border:1px solid var(--line);border-radius:8px;font-size:13.5px;margin-bottom:12px;">`;
    if(items.length===0) return pillarChipsHtml(state.personalBank, state.khoToiPillar, 'khotoi-pillar') + searchHtml + `<div style="color:var(--ink-soft);font-size:14px;">Không có bài nào khớp tìm kiếm.</div>`;
    return pillarChipsHtml(state.personalBank, state.khoToiPillar, 'khotoi-pillar') + searchHtml + items.map(b=>`
      <div class="section">
        <div class="meta" style="font-family:'IBM Plex Mono',monospace;font-size:11px;color:var(--ink-soft);text-transform:uppercase;margin-bottom:6px;">${esc(SOURCE_MAP[b.source_type]||b.source_type||'')}${b.is_viral?' · VIRAL':''}${(b.viral_views||b.viral_likes)?` · ${[b.viral_views&&('view '+b.viral_views), b.viral_likes&&('like '+b.viral_likes)].filter(Boolean).map(esc).join(', ')}`:''}</div>
        <h3>${esc(b.title)}</h3>
        ${contentBodyHtml('personal:'+b.id, b.content)}
        ${b.viral_screenshot ? `<img src="${b.viral_screenshot}" style="max-width:140px;max-height:140px;border-radius:8px;border:1px solid var(--line);margin-top:8px;">` : ''}
        <div class="btn-row" style="margin-top:10px;justify-content:space-between;">
          <span style="color:var(--danger);cursor:pointer;font-size:12px;" data-del-personal="${b.id}">Xoá</span>
          ${b.share_status==='pending'?'<span style="font-size:12px;color:var(--gold);">Đang chờ admin duyệt lên Kho chung</span>':b.share_status==='approved'?'<span style="font-size:12px;color:var(--accent);">Đã lên Kho chung ✓</span>':''}
        </div>
        ${writeActionHtml('personal:'+b.id)}
      </div>
    `).join('');
  }

  function khoChungTab(){
    const hint = `<div class="hint-box" style="margin-bottom:14px;">Kho bài mẫu <b>đã được kiểm chứng viral</b>, do đội ngũ tuyển chọn và cập nhật liên tục — dùng làm <b>khung sườn (hook + cấu trúc)</b> để viết lại theo giọng văn và câu chuyện thật của bạn, không phải để sao chép nguyên văn.<br><br>Đây là <b>cách nhanh nhất</b> để bài mới của bạn có nền tảng đã được thị trường kiểm chứng thay vì viết từ số 0.</div>`;
    if(state.sharedBank.length===0) return hint + `<div class="card" style="color:var(--ink-soft);">Kho Content Viral chưa có nội dung — sẽ được cập nhật từ đội ngũ.</div>`;

    let items = filterByPillar(state.sharedBank, state.chungPillar);
    const q = state.chungSearch.trim().toLowerCase();
    if(q) items = items.filter(b=>(b.title||'').toLowerCase().includes(q));
    items = sortUnusedFirst(items, 'shared');
    const searchHtml = `<input type="text" data-chung-search value="${esc(state.chungSearch)}" placeholder="Tìm theo tiêu đề..." style="width:100%;padding:8px 12px;border:1px solid var(--line);border-radius:8px;font-size:13.5px;margin-bottom:12px;">`;
    if(items.length===0) return hint + pillarChipsHtml(state.sharedBank, state.chungPillar, 'chung-pillar') + searchHtml + `<div style="color:var(--ink-soft);font-size:14px;">Không có bài nào khớp tìm kiếm.</div>`;
    return hint + pillarChipsHtml(state.sharedBank, state.chungPillar, 'chung-pillar') + searchHtml + items.map(b=>`
      <div class="section">
        <div class="meta" style="font-family:'IBM Plex Mono',monospace;font-size:11px;color:var(--ink-soft);text-transform:uppercase;margin-bottom:6px;">${esc(SOURCE_MAP[b.source_type]||b.source_type||'')}${(b.tags&&b.tags.length)?' · '+b.tags.map(esc).join(', '):''}</div>
        <h3>${esc(b.title)}</h3>
        ${contentBodyHtml('shared:'+b.id, b.content, { protected:true })}
        ${writeActionHtml('shared:'+b.id)}
      </div>
    `).join('');
  }

  function bind(){
    container.querySelectorAll('[data-copy-value]').forEach(el=>{
      el.onclick = async ()=>{
        try{
          await navigator.clipboard.writeText(el.getAttribute('data-copy-value'));
          const old = el.textContent;
          el.textContent = 'Đã copy ✓';
          setTimeout(()=>{ el.textContent = old; }, 1500);
        } catch(e){}
      };
    });
    container.querySelectorAll('[data-tab]').forEach(el=>{ el.onclick = ()=>{ state.tab = el.getAttribute('data-tab'); draw(); }; });
    container.querySelectorAll('[data-chung-pillar]').forEach(el=>{
      el.onclick = ()=>{ state.chungPillar = el.getAttribute('data-chung-pillar'); draw(); };
    });
    const daVietPillarSelect = container.querySelector('[data-daviet-pillar]');
    if(daVietPillarSelect) daVietPillarSelect.onchange = ()=>{ state.daVietPillar = daVietPillarSelect.value; draw(); };
    const daVietStatusSelect = container.querySelector('[data-daviet-status]');
    if(daVietStatusSelect) daVietStatusSelect.onchange = ()=>{ state.daVietStatus = daVietStatusSelect.value; draw(); };
    const daVietSearchInput = container.querySelector('[data-daviet-search]');
    if(daVietSearchInput) daVietSearchInput.oninput = ()=>{
      state.daVietSearch = daVietSearchInput.value;
      const pos = daVietSearchInput.selectionStart;
      draw();
      // draw() vẽ lại toàn bộ innerHTML nên mất focus — lấy lại đúng ô + vị trí con trỏ, giống
      // pattern data-goal ở tai-khoan.js, không thì gõ mỗi chữ lại phải bấm chuột vào ô lần nữa.
      const newEl = container.querySelector('[data-daviet-search]');
      if(newEl){ newEl.focus(); newEl.setSelectionRange(pos, pos); }
    };
    const khoToiSearchInput = container.querySelector('[data-khotoi-search]');
    if(khoToiSearchInput) khoToiSearchInput.oninput = ()=>{
      state.khoToiSearch = khoToiSearchInput.value;
      const pos = khoToiSearchInput.selectionStart;
      draw();
      const newEl = container.querySelector('[data-khotoi-search]');
      if(newEl){ newEl.focus(); newEl.setSelectionRange(pos, pos); }
    };
    const chungSearchInput = container.querySelector('[data-chung-search]');
    if(chungSearchInput) chungSearchInput.oninput = ()=>{
      state.chungSearch = chungSearchInput.value;
      const pos = chungSearchInput.selectionStart;
      draw();
      const newEl = container.querySelector('[data-chung-search]');
      if(newEl){ newEl.focus(); newEl.setSelectionRange(pos, pos); }
    };
    container.querySelectorAll('[data-khotoi-pillar]').forEach(el=>{
      el.onclick = ()=>{ state.khoToiPillar = el.getAttribute('data-khotoi-pillar'); draw(); };
    });

    container.querySelectorAll('[data-toggle-full]').forEach(el=>{
      el.onclick = ()=>{
        const key = el.getAttribute('data-toggle-full');
        if(state.expandedIds.has(key)) state.expandedIds.delete(key); else state.expandedIds.add(key);
        draw();
      };
    });
    container.querySelectorAll('[data-toggle-options]').forEach(el=>{
      el.onclick = ()=>{
        const id = el.getAttribute('data-toggle-options');
        if(state.expandedOptionsIds.has(id)) state.expandedOptionsIds.delete(id); else state.expandedOptionsIds.add(id);
        draw();
      };
    });
    container.querySelectorAll('[data-toggle-daybai]').forEach(el=>{
      el.onclick = ()=>{
        const id = el.getAttribute('data-toggle-daybai');
        if(state.expandedDayBaiIds.has(id)) state.expandedDayBaiIds.delete(id); else state.expandedDayBaiIds.add(id);
        draw();
      };
    });
    container.querySelectorAll('[data-post-metric-field]').forEach(el=>{
      el.onchange = async ()=>{
        const field = el.getAttribute('data-post-metric-field');
        const id = el.getAttribute('data-post-metric-id');
        const val = el.value.trim() === '' ? null : Math.max(0, parseInt(el.value, 10) || 0);
        await ctx.supabase.from('posts').update({ [field]: val }).eq('id', id);
        const post = state.posts.find(x=>x.id===id);
        if(post) post[field] = val;
        // Đồng bộ ngược lại calendar_entries (mọi ô lịch đang gắn đúng bài này) — để Lịch Đăng Bài
        // cũng thấy đúng số mới nếu sửa từ đây thay vì từ đó (liên kết 2 chiều, theo yêu cầu chị Quỳnh).
        await ctx.supabase.from('calendar_entries').update({ [field]: val }).eq('post_id', id);
      };
    });

    container.querySelectorAll('[data-edit-post]').forEach(el=>{
      el.onclick = ()=>{
        const id = el.getAttribute('data-edit-post');
        const p = state.posts.find(x=>x.id===id);
        if(!p) return;
        state.editingPostId = id;
        state.editDraft = { title: p.title||'', content: p.content||'' };
        state.editSaveError = null;
        draw();
      };
    });
    const editTitle = container.querySelector('#edit-title');
    if(editTitle) editTitle.oninput = ()=>{ state.editDraft.title = editTitle.value; };
    const editContent = container.querySelector('#edit-content');
    if(editContent) editContent.oninput = ()=>{ state.editDraft.content = editContent.value; };
    container.querySelectorAll('[data-edit-cancel]').forEach(el=>{
      el.onclick = ()=>{ state.editingPostId = null; state.editDraft = null; state.editSaveError = null; draw(); };
    });
    container.querySelectorAll('[data-edit-save]').forEach(el=>{
      el.onclick = ()=>{ savePostEdit(el.getAttribute('data-edit-save')); };
    });
    container.querySelectorAll('[data-delete-post]').forEach(el=>{
      el.onclick = async ()=>{
        const id = el.getAttribute('data-delete-post');
        if(!(await confirmModal('Xoá vĩnh viễn bài này khỏi Kho Content? Không khôi phục được — nếu bài đã có trong Lịch Đăng Bài, chỗ đó cũng sẽ mất liên kết tới bài.'))) return;
        await ctx.supabase.from('posts').delete().eq('id', id);
        await loadPosts();
        draw();
      };
    });

    container.querySelectorAll('[data-ne-viral]').forEach(el=>{
      el.onclick = ()=>{
        state.newEntry.isViral = el.getAttribute('data-ne-viral')==='yes';
        draw();
      };
    });

    container.querySelectorAll('[data-schedule]').forEach(el=>{
      el.onclick = ()=>{
        window.PendingPost = state.posts.find(p=>p.id===el.getAttribute('data-schedule'));
        location.hash = 'lich-dang';
      };
    });

    container.querySelectorAll('[data-day-bai]').forEach(el=>{
      el.onclick = ()=>{
        window.PendingPost = state.posts.find(p=>p.id===el.getAttribute('data-day-bai'));
        location.hash = 'day-bai';
      };
    });

    container.querySelectorAll('[data-write-toggle]').forEach(el=>{
      el.onclick = ()=>{
        const key = el.getAttribute('data-write-toggle');
        state.writeFor = state.writeFor===key ? null : key;
        state.writeIdeas = null; state.writeError = null; state.writeLoading = false; state.writeQuickContext = '';
        draw();
      };
    });
    const keepBtn = container.querySelector('[data-write-keep]');
    if(keepBtn) keepBtn.onclick = ()=>{
      window.PendingKhoGoc = { title: findSourceTitle(state.writeFor), content: findSourceText(state.writeFor), tags: findSourceTags(state.writeFor) };
      window.PendingSourceRef = sourceRefForKey(state.writeFor);
      location.hash = 'viet-content';
    };
    const genBtn = container.querySelector('[data-write-generate]');
    if(genBtn) genBtn.onclick = generateIdeasFromSource;
    const wqc = container.querySelector('#write-quick-context');
    if(wqc) wqc.oninput = ()=>{ state.writeQuickContext = wqc.value; };
    container.querySelectorAll('[data-use-idea]').forEach(el=>{
      el.onclick = ()=>{
        const i = Number(el.getAttribute('data-use-idea'));
        window.PendingTopic = state.writeIdeas[i];
        window.PendingSourceRef = sourceRefForKey(state.writeFor);
        location.hash = 'viet-content';
      };
    });

    container.querySelectorAll('[data-apply-voice]').forEach(el=>{
      el.onclick = ()=>{
        const key = el.getAttribute('data-apply-voice');
        applyVoice(key);
      };
    });

    const t = container.querySelector('#ne-title'); if(t) t.oninput = ()=>state.newEntry.title = t.value;
    const c = container.querySelector('#ne-content'); if(c) c.oninput = ()=>state.newEntry.content = c.value;
    const s = container.querySelector('#ne-source'); if(s) s.onchange = ()=>state.newEntry.source_type = s.value;
    const v1 = container.querySelector('#ne-views'); if(v1) v1.oninput = ()=>state.newEntry.viralViews = v1.value;
    const v2 = container.querySelector('#ne-likes'); if(v2) v2.oninput = ()=>state.newEntry.viralLikes = v2.value;
    // Nén/resize ảnh ngay trên trình duyệt trước khi lưu (giống cách Sửa Kênh đang làm với ảnh chụp
    // màn hình kênh) — giữ base64 đủ nhỏ để lưu thẳng vào cột text, không cần Supabase Storage.
    const screenshotInput = container.querySelector('#ne-screenshot');
    if(screenshotInput) screenshotInput.onchange = ()=>{
      const file = screenshotInput.files[0];
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
          state.newEntry.viralScreenshot = c.toDataURL('image/jpeg', 0.82);
          draw();
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    };
    const clearScreenshotBtn = container.querySelector('[data-action="clear-viral-screenshot"]');
    if(clearScreenshotBtn) clearScreenshotBtn.onclick = ()=>{ state.newEntry.viralScreenshot = null; draw(); };
    const addBtn = container.querySelector('[data-action="add-personal"]');
    if(addBtn) addBtn.onclick = addPersonal;
    container.querySelectorAll('[data-del-personal]').forEach(el=>{
      el.onclick = async ()=>{
        const id = el.getAttribute('data-del-personal');
        if(!(await confirmModal('Xoá vĩnh viễn bài này khỏi Kho của tôi? Không khôi phục được.'))) return;
        await ctx.supabase.from('content_bank_personal').delete().eq('id', id);
        await loadPersonal(); draw();
      };
    });

    const shareYes = container.querySelector('[data-share-yes]');
    if(shareYes) shareYes.onclick = ()=>confirmShare(true);
    const shareNo = container.querySelector('[data-share-no]');
    if(shareNo) shareNo.onclick = ()=>confirmShare(false);
  }

  async function generateIdeasFromSource(){
    state.writeLoading = true; state.writeError = null; draw();
    const stopProgress = animateProgressButton(container.querySelector('[data-write-generate]'), 25, 'Đang sinh ý tưởng');
    try{
      const data = await callApi('/api/goi-y-tu-nguon', {
        source_text: findSourceText(state.writeFor),
        positioning: (state.positioning && state.positioning.luot1) ? { luot1: state.positioning.luot1, luot2: state.positioning.luot2 } : null,
        quick_context: state.writeQuickContext,
      });
      state.writeIdeas = data.result.y_tuong;
    } catch(e){ state.writeError = e.message; }
    stopProgress();
    state.writeLoading = false; draw();
  }

  async function applyVoice(key){
    const content = findSourceText(key);
    if(!content.trim()) return;
    state.applyingVoice = key; state.applyVoiceError = null; state.applyVoiceErrorFor = null; state.voiceAppliedFor = null; draw();
    const stopProgress = animateProgressButton(container.querySelector(`[data-apply-voice="${key}"]`), 20, 'Đang phân tích');
    // Ghi lại đúng mục nào đang là giọng mẫu hiện tại (thay thế mục cũ, chỉ 1 giọng áp dụng tại 1
    // thời điểm) — để hiện đúng dấu "✓ Đang là giọng mẫu" trên đúng bài đó, không hiện mù mờ như
    // nhau ở mọi bài trong kho.
    const ref = sourceRefForKey(key);
    try{
      const data = await callApi('/api/goi-y-giong-van', { sample_text: content });
      if(state.positioning){
        const newLuot1 = { ...state.positioning.luot1, giong_dieu_ngon_ngu: data.result.giong_dieu_ngon_ngu };
        const { error } = await ctx.supabase.from('positioning_results').update({
          luot1: newLuot1, voice_sample_source_table: ref ? ref.table : null, voice_sample_source_id: ref ? ref.id : null,
        }).eq('id', state.positioningId);
        if(error) throw error;
        state.positioning.luot1 = newLuot1;
        state.positioning.voice_sample_source_table = ref ? ref.table : null;
        state.positioning.voice_sample_source_id = ref ? ref.id : null;
      } else {
        const { data: row, error } = await ctx.supabase.from('positioning_results')
          .upsert({
            user_id: ctx.user.id, luot1: { giong_dieu_ngon_ngu: data.result.giong_dieu_ngon_ngu },
            voice_sample_source_table: ref ? ref.table : null, voice_sample_source_id: ref ? ref.id : null,
          }, { onConflict:'user_id' })
          .select().single();
        if(error) throw error;
        state.positioning = row;
        state.positioningId = row.id;
      }
      state.voiceAppliedFor = key;
    } catch(e){ state.applyVoiceError = e.message; state.applyVoiceErrorFor = key; }
    stopProgress();
    state.applyingVoice = null;
    draw();
  }

  async function addPersonal(){
    if(state.addingPersonal) return;
    if(!state.newEntry.title.trim() || !state.newEntry.content.trim()){
      state.addPersonalError = 'Cần điền cả tiêu đề và nội dung trước khi thêm.';
      draw();
      return;
    }
    state.addingPersonal = true; state.addPersonalError = null; state.sharePromptFor = null; state.shareDoneFor = null; draw();
    const entry = state.newEntry;
    // AI tự chọn trục nội dung ngay khi thêm — không còn bắt người dùng tự chọn trục thủ công.
    let tags = [];
    try{
      const data = await callApi('/api/phan-loai-truc', { title: entry.title, content: entry.content });
      if(data.result && data.result.truc) tags = [data.result.truc];
    } catch(e){ /* không phân loại được (vd lỗi mạng) — vẫn lưu, chỉ thiếu trục, không chặn người dùng */ }

    const { data: row, error } = await ctx.supabase.from('content_bank_personal').insert({
      // Nội dung dán vào thường dính liền không xuống dòng — tự tách đoạn theo câu (miễn phí, không
      // qua AI) để dễ đọc lại sau này, không bắt người dùng tự chỉnh tay trước khi lưu.
      user_id: ctx.user.id, title: entry.title, content: breakSentences(entry.content),
      source_type: entry.source_type || null, tags,
      is_viral: entry.isViral===true, viral_views: entry.isViral===true ? (entry.viralViews||null) : null,
      viral_likes: entry.isViral===true ? (entry.viralLikes||null) : null,
      viral_screenshot: entry.isViral===true ? (entry.viralScreenshot||null) : null,
    }).select().single();

    state.addingPersonal = false;
    if(error){
      state.addPersonalError = `Không lưu được: ${error.message}`;
      draw();
      return;
    }
    const wasViral = entry.isViral===true;
    state.newEntry = { title:'', content:'', source_type:'', isViral:null, viralViews:'', viralLikes:'', viralScreenshot:null };
    await loadPersonal();
    if(wasViral) state.sharePromptFor = row.id;
    draw();
  }

  async function confirmShare(yes){
    if(!state.sharePromptFor || state.shareSubmitting) return;
    const id = state.sharePromptFor;
    if(yes){
      state.shareSubmitting = true; draw();
      await ctx.supabase.from('content_bank_personal').update({ share_status:'pending' }).eq('id', id);
      state.shareSubmitting = false;
      state.shareDoneFor = 'Đã gửi đề xuất — chờ admin duyệt trước khi hiển thị ở Kho chung.';
      await loadPersonal();
    }
    state.sharePromptFor = null;
    draw();
  }

  boot();
}
window.Modules = window.Modules || {};
window.Modules['kho-content'] = { title:'Kho Content', render };
})();
