(function(){
// chuyen_gia_viet gộp chung nhãn với bai_mau (trùng ý — cùng là "mẫu tham khảo có sẵn", không phải
// tự viết), tai_che_viral vẫn giữ để hiển thị đúng nhãn cho bài cũ — nhưng cả 2 key này KHÔNG còn
// nằm trong danh sách người dùng tự chọn ở SOURCE_OPTIONS bên dưới, vì tai_che_viral đã được flow
// Tái Chế Viral tự gắn sẵn (xem tai-che-viral.js), không cần chọn tay.
const SOURCE_MAP = {
  ca_nhan: 'Câu chuyện cá nhân', case_hoc_vien: 'Case học viên', cau_hoi_kh: 'Câu hỏi khách hàng',
  xu_huong: 'Xu hướng thị trường', quan_diem_nguoc_dong: 'Quan điểm ngược dòng', bai_mau: 'Bài mẫu tham khảo',
  chuyen_gia_viet: 'Bài mẫu tham khảo', tai_che_viral: 'Tái chế từ bài viral',
};
const SOURCE_OPTIONS = ['ca_nhan', 'case_hoc_vien', 'cau_hoi_kh', 'xu_huong', 'quan_diem_nguoc_dong', 'bai_mau'];

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
    newEntry:{ title:'', content:'', source_type:'', isViral:null, viralViews:'', viralLikes:'' },
    addingPersonal:false, addPersonalError:null, sharePromptFor:null, shareSubmitting:false, shareDoneFor:null,
    writeFor:null, writeLoading:false, writeIdeas:null, writeError:null, writeQuickContext:'',
    positioningId:null, applyingVoice:null, applyVoiceError:null, applyVoiceErrorFor:null, voiceAppliedFor:null,
    chungPillar:'all', daVietPillar:'all', khoToiPillar:'all', expandedIds:new Set(),
  };

  function draw(){ container.innerHTML = html(); bind(); }

  async function boot(){
    container.innerHTML = `<div class="loading"><div class="spinner"></div><p>Đang tải…</p></div>`;
    const { data: pos } = await ctx.supabase.from('positioning_results').select('*').eq('user_id', ctx.user.id).maybeSingle();
    state.positioning = pos || null;
    state.positioningId = pos ? pos.id : null;
    await Promise.all([loadPosts(), loadPersonal(), loadShared()]);
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
    const hint = `<div class="hint-box" style="margin-bottom:14px;">Toàn bộ bài bạn đã viết và lưu lại — xem lại, sửa tiếp, hoặc đưa vào Lịch Đăng Bài từ đây. AI tự xếp đúng trục nội dung ngay khi bạn lưu bài.</div>`;
    if(state.posts.length===0) return hint + `<div class="card" style="color:var(--ink-soft);">Chưa có bài nào — sang tab <b>Kho Content Viral</b> chọn 1 bài mẫu phù hợp trục nội dung của bạn để viết bài đầu tiên.</div>`;

    const items = filterByPillar(state.posts, state.daVietPillar);
    return hint + pillarChipsHtml(state.posts, state.daVietPillar, 'daviet-pillar') + items.map(p=>`
      <div class="section">
        <h3>${esc(p.title||'(không tiêu đề)')}</h3>
        ${contentBodyHtml('post:'+p.id, p.content)}
        <div class="btn-row" style="margin-top:14px;"><button class="btn btn-sm" data-schedule="${p.id}">Đưa vào lịch →</button></div>
        ${writeActionHtml('post:'+p.id)}
      </div>
    `).join('');
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
    const hint = `<div class="hint-box" style="margin-bottom:14px;">Nơi lưu chất liệu của riêng bạn — câu chuyện cá nhân, case học viên, câu hỏi khách hàng hay gặp. <b>Đặc biệt nên cập nhật cả những content đang viral bạn tự tìm thấy ở nơi khác</b> (kênh khác, group khác...) — AI sẽ tự chọn đúng trục nội dung giúp bạn, không cần tự chọn nữa.</div>`;
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

    const items = filterByPillar(state.personalBank, state.khoToiPillar);
    return pillarChipsHtml(state.personalBank, state.khoToiPillar, 'khotoi-pillar') + items.map(b=>`
      <div class="section">
        <div class="meta" style="font-family:'IBM Plex Mono',monospace;font-size:11px;color:var(--ink-soft);text-transform:uppercase;margin-bottom:6px;">${esc(SOURCE_MAP[b.source_type]||b.source_type||'')}${b.is_viral?' · VIRAL':''}${(b.viral_views||b.viral_likes)?` · ${[b.viral_views&&('view '+b.viral_views), b.viral_likes&&('like '+b.viral_likes)].filter(Boolean).map(esc).join(', ')}`:''}</div>
        <h3>${esc(b.title)}</h3>
        ${contentBodyHtml('personal:'+b.id, b.content)}
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

    const items = filterByPillar(state.sharedBank, state.chungPillar);
    return hint + pillarChipsHtml(state.sharedBank, state.chungPillar, 'chung-pillar') + items.map(b=>`
      <div class="section">
        <div class="meta" style="font-family:'IBM Plex Mono',monospace;font-size:11px;color:var(--ink-soft);text-transform:uppercase;margin-bottom:6px;">${esc(SOURCE_MAP[b.source_type]||b.source_type||'')}${(b.tags&&b.tags.length)?' · '+b.tags.map(esc).join(', '):''}</div>
        <h3>${esc(b.title)}</h3>
        ${contentBodyHtml('shared:'+b.id, b.content, { protected:true })}
        ${writeActionHtml('shared:'+b.id)}
      </div>
    `).join('');
  }

  function bind(){
    container.querySelectorAll('[data-tab]').forEach(el=>{ el.onclick = ()=>{ state.tab = el.getAttribute('data-tab'); draw(); }; });
    container.querySelectorAll('[data-chung-pillar]').forEach(el=>{
      el.onclick = ()=>{ state.chungPillar = el.getAttribute('data-chung-pillar'); draw(); };
    });
    container.querySelectorAll('[data-daviet-pillar]').forEach(el=>{
      el.onclick = ()=>{ state.daVietPillar = el.getAttribute('data-daviet-pillar'); draw(); };
    });
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
    }).select().single();

    state.addingPersonal = false;
    if(error){
      state.addPersonalError = `Không lưu được: ${error.message}`;
      draw();
      return;
    }
    const wasViral = entry.isViral===true;
    state.newEntry = { title:'', content:'', source_type:'', isViral:null, viralViews:'', viralLikes:'' };
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
