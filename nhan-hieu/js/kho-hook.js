(function(){
const CATEGORIES = {
  noi_dau: 'Nỗi đau', su_that_nguoc: 'Sự thật ngược', canh_bao: 'Cảnh báo',
  ket_qua_mong_muon: 'Kết quả mong muốn', tu_khoa_kich_hoat: 'Từ khoá kích hoạt chú ý',
};

const HOOK_GEN_CATEGORIES = [
  { key:'to_mo_bo_ngo', label:'Tò mò bỏ ngỏ' },
  { key:'canh_bao_mat_mat', label:'Cảnh báo / mất mát' },
  { key:'nghich_ly', label:'Nghịch lý / phản trực giác' },
  { key:'cau_hoi_goi_mo', label:'Câu hỏi gợi mở' },
  { key:'con_so_cu_the', label:'Con số cụ thể' },
  { key:'bi_mat_noi_bo', label:'Bí mật / nội bộ ngành' },
  { key:'truoc_sau', label:'So sánh trước - sau' },
  { key:'khan_hiem_thoi_han', label:'Khan hiếm / thời hạn' },
  { key:'thu_nhan_ca_nhan', label:'Thú nhận cá nhân' },
  { key:'loi_sai_pho_bien', label:'Lỗi sai phổ biến' },
  { key:'ket_qua_gay_soc', label:'Kết quả gây sốc / bằng chứng xã hội' },
  { key:'lat_nguoc_niem_tin', label:'Lật ngược niềm tin' },
  { key:'chi_dich_danh', label:'Chỉ đích danh / hiệu ứng gương' },
  { key:'kich_ban_gia_dinh', label:'Kịch bản giả định' },
  { key:'su_that_phu_phang', label:'Sự thật phũ phàng' },
];
const HOOK_GEN_LABEL_BY_KEY = Object.fromEntries(HOOK_GEN_CATEGORIES.map(c=>[c.key, c.label]));

// Trục nội dung (content pillar) để lọc Kho chung theo chủ đề thay vì lướt hết cả kho — cùng
// nhóm với Kho Content, xem thêm supabase/schema_full.sql (backfill tags cho hook cũ).
const HOOK_PILLARS = [
  { key:'tai_chinh', label:'Tài chính' },
  { key:'tam_linh', label:'Tâm linh' },
  { key:'hon_nhan_gia_dinh', label:'Hôn nhân & Gia đình' },
  { key:'phat_trien_ban_than', label:'Phát triển bản thân' },
  { key:'kinh_doanh', label:'Kinh doanh' },
  { key:'suc_khoe_lam_dep', label:'Sức khoẻ & Làm đẹp' },
  { key:'xay_kenh', label:'Xây kênh & Content' },
];

const CONTENT_GOALS = [
  { key:'viral', label:'Viral (tối đa lượt xem)', desc:'Ưu tiên giật mắt, gây tò mò hoặc gây sốc mạnh để nhiều người dừng lại xem.' },
  { key:'uy_tin', label:'Uy tín (xây thẩm quyền)', desc:'Ưu tiên hook cho thấy bạn hiểu sâu, đáng tin — không câu view rẻ tiền.' },
  { key:'case_study', label:'Case study (chứng minh kết quả)', desc:'Ưu tiên hook dẫn vào 1 kết quả/số liệu/câu chuyện thật cụ thể.' },
];
const GOAL_RECOMMENDED_CATS = {
  viral: ['to_mo_bo_ngo','nghich_ly','canh_bao_mat_mat','ket_qua_gay_soc','khan_hiem_thoi_han','chi_dich_danh'],
  uy_tin: ['bi_mat_noi_bo','su_that_phu_phang','lat_nguoc_niem_tin','loi_sai_pho_bien','con_so_cu_the'],
  case_study: ['ket_qua_gay_soc','truoc_sau','con_so_cu_the','thu_nhan_ca_nhan'],
};
function categoryLabel(key){
  return HOOK_GEN_LABEL_BY_KEY[key] || CATEGORIES[key] || key || '';
}

function render(container, ctx){
  const state = {
    tab:'tao-hook', personal:[], shared:[], sharedContent:[], error:null, positioning:null,
    newEntry:{ hook_text:'', note:'', isViral:null, viralViews:'', viralLikes:'' }, addingHook:false, addError:null,
    sharePromptFor:null, shareSubmitting:false, shareDoneFor:null,
    writeFor:null, writeLoading:false, writeIdeas:null, writeError:null, writeQuickContext:'',
    genTopic:'', genGoal:CONTENT_GOALS[0].key, genCategory:GOAL_RECOMMENDED_CATS[CONTENT_GOALS[0].key][0], genQuickContext:'',
    genShowAllCats:false,
    genLoading:false, genError:null, genResult:null, genThumbTitles:null, genSavedIdx:{},
    chungPillar:'all', khoToiPillar:'all',
  };

  function draw(){ container.innerHTML = html(); bind(); }

  async function boot(){
    container.innerHTML = `<div class="loading"><div class="spinner"></div><p>Đang tải…</p></div>`;
    const { data: pos } = await ctx.supabase.from('positioning_results').select('*').eq('user_id', ctx.user.id).maybeSingle();
    state.positioning = pos || null;
    await Promise.all([loadPersonal(), loadShared(), loadSharedContent()]);
    // Đi tới từ Lịch Đăng Bài khi slot đó chưa có bài viết sẵn — mở thẳng đúng trục nội dung trong
    // Kho Hook Viral thay vì bắt người dùng tự lọc lại từ đầu (khớp cách kho-content.js đã làm).
    if(window.PendingPillar){
      state.tab = 'kho-chung';
      state.chungPillar = window.PendingPillar;
      window.PendingPillar = null;
    }
    draw();
  }
  async function loadPersonal(){
    const { data, error } = await ctx.supabase.from('hooks_bank_personal').select('*').eq('user_id', ctx.user.id).order('created_at', { ascending:false });
    if(error) state.error = error.message;
    state.personal = data || [];
  }
  async function loadShared(){
    const { data, error } = await ctx.supabase.from('hooks_bank_shared').select('*').order('created_at', { ascending:false });
    if(error) state.error = error.message;
    state.shared = data || [];
  }
  // Tiêu đề trong Kho Content chung thường CHÍNH LÀ 1 câu hook/headline đã viral — gộp vào Kho Hook
  // chung để không phải mở 2 kho mới tìm được hết hook, không tạo bảng mới, chỉ đọc thêm cột có sẵn.
  async function loadSharedContent(){
    const { data, error } = await ctx.supabase.from('content_bank_shared').select('id,title,tags,created_at').order('created_at', { ascending:false });
    if(error){ state.sharedContent = []; return; }
    state.sharedContent = data || [];
  }

  // Kho chung hiển thị gộp cả 2 nguồn — đánh dấu nguồn gốc (_src) để biết bảng nào cần thao tác khi
  // xem/viết bài từ đúng item, vì 2 bảng gốc (hooks_bank_shared / content_bank_shared) khác cột.
  function combinedShared(){
    return [
      ...state.shared.map(h=>({ id:h.id, hook_text:h.hook_text, category:h.category, note:h.note, tags:h.tags, _src:'shared' })),
      ...state.sharedContent.map(c=>({ id:c.id, hook_text:c.title, category:null, note:null, tags:c.tags, _src:'content' })),
    ];
  }

  function findSourceText(key){
    if(!key) return '';
    const [kind, id] = key.split(':');
    if(kind==='personal') return (state.personal.find(h=>h.id===id)||{}).hook_text || '';
    if(kind==='shared') return (state.shared.find(h=>h.id===id)||{}).hook_text || '';
    if(kind==='content') return (state.sharedContent.find(c=>c.id===id)||{}).title || '';
    return '';
  }

  function html(){
    if(state.error) return `
      <div class="page-head"><h1>Kho Hook</h1></div>
      <div class="error-box">Chưa dùng được mục này: ${esc(state.error)}. Cần chạy file supabase/schema_full.sql trong Supabase SQL Editor trước.</div>`;
    return `
      <div class="page-head"><h1>Kho Hook</h1><p>Nhập chủ đề, chọn loại hook, AI sinh ngay ví dụ đúng chủ đề — hoặc tra cứu kho có sẵn.</p></div>
      <div class="tab-row">
        <div class="tab-btn ${state.tab==='tao-hook'?'active':''}" data-tab="tao-hook">Tạo Hook</div>
        <div class="tab-btn ${state.tab==='kho-toi'?'active':''}" data-tab="kho-toi">Kho của tôi (${state.personal.length})</div>
        <div class="tab-btn ${state.tab==='kho-chung'?'active':''}" data-tab="kho-chung">Kho Hook Viral (${state.shared.length + state.sharedContent.length})</div>
      </div>
      ${state.tab==='tao-hook' ? taoHookTab() : state.tab==='kho-toi' ? khoToiTab() : khoChungTab()}
    `;
  }

  function taoHookTab(){
    const hasPositioning = !!(state.positioning && state.positioning.luot1);
    return `
      <div class="hint-box" style="margin-bottom:14px;">Câu hook (câu mở đầu) quyết định người xem có dừng lại đọc tiếp hay lướt qua — quan trọng ngang bài viết. Nhập chủ đề + chọn đúng mục tiêu, AI sinh ngay 5 hook phù hợp, lưu lại vào <b>Kho của tôi</b> để dùng dần.</div>
      <div class="card">
        <label style="display:block;font-size:13px;font-weight:600;color:var(--ink-soft);margin-bottom:6px;">Chủ đề muốn viết hook</label>
        <textarea id="gen-topic" style="min-height:auto;height:52px;" placeholder="Ví dụ: sai lầm khiến dòng tiền cá nhân bị nghẽn">${esc(state.genTopic)}</textarea>

        ${!hasPositioning ? `
          <label style="display:block;font-size:13px;font-weight:600;color:var(--ink-soft);margin:14px 0 6px;">Ngành/đối tượng (không bắt buộc)</label>
          <textarea id="gen-quick-context" style="min-height:auto;height:44px;" placeholder="Ví dụ: Coach tài chính cá nhân, hướng tới người mới đi làm...">${esc(state.genQuickContext)}</textarea>
        ` : ''}

        <label style="display:block;font-size:13px;font-weight:600;color:var(--ink-soft);margin:14px 0 6px;">Mục tiêu content này là gì?</label>
        <div class="chips">
          ${CONTENT_GOALS.map(g=>`<div class="chip ${state.genGoal===g.key?'selected':''}" data-gen-goal="${g.key}">${esc(g.label)}</div>`).join('')}
        </div>
        <div style="margin-top:6px;font-size:12.5px;color:var(--ink-soft);">${esc((CONTENT_GOALS.find(g=>g.key===state.genGoal)||{}).desc||'')}</div>

        <label style="display:block;font-size:13px;font-weight:600;color:var(--ink-soft);margin:14px 0 6px;">Loại hook phù hợp mục tiêu này</label>
        <div class="chips">
          ${(state.genShowAllCats ? HOOK_GEN_CATEGORIES : HOOK_GEN_CATEGORIES.filter(c=>(GOAL_RECOMMENDED_CATS[state.genGoal]||[]).includes(c.key)))
            .map(c=>`<div class="chip ${state.genCategory===c.key?'selected':''}" data-gen-cat="${c.key}">${esc(c.label)}</div>`).join('')}
        </div>
        <div style="margin-top:6px;">
          <span style="font-size:12px;color:var(--accent);cursor:pointer;font-weight:600;" data-action="toggle-all-cats">${state.genShowAllCats?'Chỉ xem loại phù hợp mục tiêu này':'Xem tất cả 15 loại hook →'}</span>
        </div>

        <div class="btn-row" style="margin-top:14px;"><button class="btn" data-action="generate-hooks" ${state.genLoading?'disabled':''}>${state.genLoading?'Đang sinh hook…':'Tạo 5 hook'}</button></div>
        <div class="hint-box" style="margin-top:10px;">AI cần khoảng 30-40 giây để ra 5 hook + 3 tiêu đề thumbnail.</div>
        ${state.genError?`<div class="error-box">${esc(state.genError)}</div>`:''}
      </div>

      ${state.genResult ? `
        <div style="margin-top:20px;display:flex;flex-direction:column;gap:10px;">
          ${state.genResult.map((h,i)=>`
            <div class="section">
              <div class="body" style="font-weight:600;">${esc(h)}</div>
              <div class="btn-row" style="margin-top:10px;justify-content:flex-start;">
                <button class="btn btn-sm" data-save-gen="${i}" ${state.genSavedIdx[i]?'disabled':''}>${state.genSavedIdx[i]?'Đã lưu ✓':'Lưu vào Kho của tôi'}</button>
                <span class="btn-ghost btn btn-sm" data-write-gen="${i}">Viết content từ hook này →</span>
              </div>
            </div>
          `).join('')}
        </div>
      ` : ''}

      ${state.genThumbTitles ? `
        <h3 style="font-family:'IBM Plex Mono',monospace;font-size:13px;color:var(--ink-soft);text-transform:uppercase;letter-spacing:.05em;margin:22px 0 12px;">Gợi ý tiêu đề ghi lên thumbnail</h3>
        <div style="display:flex;flex-direction:column;gap:10px;">
          ${state.genThumbTitles.map((t,i)=>`
            <div class="section">
              <div class="body" style="font-weight:700;text-transform:uppercase;">${esc(t)}</div>
              <div class="btn-row" style="margin-top:10px;justify-content:flex-start;">
                <span class="btn-ghost btn btn-sm" data-use-thumb="${i}">Dùng làm tiêu đề ảnh →</span>
              </div>
            </div>
          `).join('')}
        </div>
      ` : ''}
    `;
  }

  function writeActionHtml(key){
    const isOpen = state.writeFor === key;
    return `
      <div style="margin-top:10px;">
        <span class="btn-ghost btn btn-sm" data-write-toggle="${key}">${isOpen?'Đóng':'Viết bài từ hook này →'}</span>
        ${isOpen ? writePanelHtml() : ''}
      </div>
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
        <div class="hint-box" style="margin-top:10px;">Chưa có <a href="#dinh-vi">Định Vị</a> đã lưu — điền nhanh ngành/đối tượng bên dưới để vẫn sinh được ý tưởng đúng hướng, hoặc giữ nguyên hook để viết luôn.</div>
        <textarea id="write-quick-context" style="min-height:auto;height:44px;margin-top:8px;" placeholder="Ví dụ: Coach tài chính cá nhân, hướng tới người mới đi làm...">${esc(state.writeQuickContext)}</textarea>
      ` : ''}
      ${state.writeError?`<div class="error-box" style="margin-top:10px;">${esc(state.writeError)}</div>`:''}
      <div class="btn-row" style="margin-top:10px;justify-content:flex-start;">
        <button class="btn btn-sm" data-write-keep="1">Giữ nguyên hook này</button>
        <button class="btn-ghost btn btn-sm" data-write-generate="1">Tạo 5 ý tưởng mới từ đây</button>
      </div>`;
  }

  // Thanh chip lọc theo trục — LUÔN hiển thị cùng danh sách đầy đủ ngay bên dưới, không còn là
  // màn hình chặn phải chọn trục xong mới thấy item.
  function pillarChipsHtml(items, currentKey, dataAttr){
    const chips = HOOK_PILLARS.map(p=>{
      const count = items.filter(h=>(h.tags||[]).includes(p.key)).length;
      if(count===0) return '';
      return `<div class="chip ${currentKey===p.key?'selected':''}" data-${dataAttr}="${p.key}">${esc(p.label)} (${count})</div>`;
    }).join('');
    const noneCount = items.filter(h=>!(h.tags||[]).length).length;
    const noneChip = noneCount ? `<div class="chip ${currentKey==='none'?'selected':''}" data-${dataAttr}="none">Chưa phân loại (${noneCount})</div>` : '';
    return `<div class="chips" style="margin-bottom:16px;">
      <div class="chip ${currentKey==='all'?'selected':''}" data-${dataAttr}="all">Tất cả (${items.length})</div>
      ${chips}${noneChip}
    </div>`;
  }
  function filterByPillar(items, key){
    return key==='all' ? items : key==='none' ? items.filter(h=>!(h.tags||[]).length) : items.filter(h=>(h.tags||[]).includes(key));
  }

  function sharePromptHtml(){
    return `
      <div class="hint-box" style="margin-top:14px;display:flex;flex-direction:column;gap:10px;">
        <div>Bạn vừa thêm 1 hook từ content viral — muốn đề xuất đẩy lên <b>Kho Hook Viral</b> để mọi người cùng dùng không? Admin sẽ xem qua rồi mới duyệt hiển thị công khai.</div>
        <div class="btn-row" style="margin-top:0;justify-content:flex-start;">
          <button class="btn btn-sm" data-share-yes="1" ${state.shareSubmitting?'disabled':''}>${state.shareSubmitting?'Đang gửi…':'Có, đề xuất lên Kho chung'}</button>
          <span class="btn-ghost btn btn-sm" data-share-no="1">Không, giữ riêng</span>
        </div>
      </div>
    `;
  }

  function khoToiTab(){
    const hint = `<div class="hint-box" style="margin-bottom:14px;">Hook hay của riêng bạn — tự nghĩ ra hoặc lưu lại từ hook AI vừa sinh. <b>Đặc biệt nên cập nhật cả hook từ content đang viral bạn tự tìm thấy ở nơi khác</b> — AI sẽ tự chọn đúng trục nội dung và loại hook giúp bạn, không cần tự chọn nữa.</div>`;
    return hint + `
      <div class="card">
        <label style="display:block;font-size:13px;font-weight:600;color:var(--ink-soft);margin-bottom:6px;">Câu hook</label>
        <textarea id="ne-hook" style="min-height:auto;height:56px;">${esc(state.newEntry.hook_text)}</textarea>
        <div style="margin-top:6px;font-size:12px;color:var(--ink-soft);">Không cần chọn loại hook — hệ thống tự nhận diện khi bạn lưu.</div>
        <label style="display:block;font-size:13px;font-weight:600;color:var(--ink-soft);margin:14px 0 6px;">Ghi chú (tuỳ chọn)</label>
        <textarea id="ne-note" style="min-height:auto;height:44px;">${esc(state.newEntry.note)}</textarea>

        <label style="display:block;font-size:13px;font-weight:600;color:var(--ink-soft);margin:14px 0 6px;">Đây có phải hook từ content đang viral bạn tìm thấy ở nơi khác không?</label>
        <div class="chips">
          <div class="chip ${state.newEntry.isViral===true?'selected':''}" data-ne-viral="yes">Có, từ content viral tôi sưu tầm</div>
          <div class="chip ${state.newEntry.isViral===false?'selected':''}" data-ne-viral="no">Không, hook tôi tự nghĩ</div>
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

        <div class="btn-row" style="margin-top:14px;"><button class="btn" data-action="add" ${state.addingHook?'disabled':''}>${state.addingHook?'Đang nhận diện…':'Thêm vào kho của tôi'}</button></div>
        ${state.addError?`<div class="error-box">${esc(state.addError)}</div>`:''}
      </div>
      ${state.sharePromptFor ? sharePromptHtml() : ''}
      ${state.shareDoneFor ? `<div class="hint-box" style="margin-top:14px;">${esc(state.shareDoneFor)}</div>` : ''}
      <div style="margin-top:20px;">
        ${khoToiListHtml()}
      </div>
    `;
  }

  function khoToiListHtml(){
    if(state.personal.length===0) return `<div style="color:var(--ink-soft);font-size:14px;">Kho của bạn đang trống.</div>`;

    const items = filterByPillar(state.personal, state.khoToiPillar);
    return pillarChipsHtml(state.personal, state.khoToiPillar, 'khotoi-pillar') + items.map(h=>`
      <div class="section">
        <div class="meta" style="font-family:'IBM Plex Mono',monospace;font-size:11px;color:var(--ink-soft);text-transform:uppercase;margin-bottom:6px;">${esc(categoryLabel(h.category))}${h.is_viral?' · VIRAL':''}${(h.viral_views||h.viral_likes)?` · ${[h.viral_views&&('view '+h.viral_views), h.viral_likes&&('like '+h.viral_likes)].filter(Boolean).map(esc).join(', ')}`:''}</div>
        <div class="body"><b>${esc(h.hook_text)}</b>${h.note?`<br><span style="color:var(--ink-soft);">${esc(h.note)}</span>`:''}</div>
        <div class="btn-row" style="margin-top:10px;justify-content:space-between;">
          <span style="color:var(--danger);cursor:pointer;font-size:12px;" data-del="${h.id}">Xoá</span>
          ${h.share_status==='pending'?'<span style="font-size:12px;color:var(--gold);">Đang chờ admin duyệt lên Kho chung</span>':h.share_status==='approved'?'<span style="font-size:12px;color:var(--accent);">Đã lên Kho chung ✓</span>':''}
        </div>
        ${writeActionHtml('personal:'+h.id)}
      </div>
    `).join('');
  }

  function khoChungTab(){
    const all = combinedShared();
    const hint = `<div class="hint-box" style="margin-bottom:14px;">Hook <b>đã được kiểm chứng viral</b> — câu mở đầu đã khiến rất nhiều người dừng lại xem — do đội ngũ tuyển chọn và cập nhật liên tục. Dùng làm mẫu để viết hook riêng cho chủ đề của bạn, không phải để copy nguyên văn.</div>`;
    if(all.length===0) return hint + `<div class="card" style="color:var(--ink-soft);">Kho Hook Viral chưa có hook nào — sẽ được cập nhật từ đội ngũ.</div>`;

    const items = filterByPillar(all, state.chungPillar);
    return hint + pillarChipsHtml(all, state.chungPillar, 'chung-pillar') + items.map(h=>`
      <div class="section">
        <div class="meta" style="font-family:'IBM Plex Mono',monospace;font-size:11px;color:var(--ink-soft);text-transform:uppercase;margin-bottom:6px;">${h._src==='content' ? 'Từ Kho Content' : esc(categoryLabel(h.category))}</div>
        <div class="body protected" oncontextmenu="return false;" oncopy="return false;" oncut="return false;"><b>${esc(h.hook_text)}</b>${h.note?`<br><span style="color:var(--ink-soft);">${esc(h.note)}</span>`:''}</div>
        ${writeActionHtml(h._src+':'+h.id)}
      </div>
    `).join('');
  }

  function bind(){
    container.querySelectorAll('[data-tab]').forEach(el=>{ el.onclick = ()=>{ state.tab = el.getAttribute('data-tab'); draw(); }; });
    container.querySelectorAll('[data-chung-pillar]').forEach(el=>{
      el.onclick = ()=>{ state.chungPillar = el.getAttribute('data-chung-pillar'); draw(); };
    });
    container.querySelectorAll('[data-khotoi-pillar]').forEach(el=>{
      el.onclick = ()=>{ state.khoToiPillar = el.getAttribute('data-khotoi-pillar'); draw(); };
    });

    container.querySelectorAll('[data-ne-viral]').forEach(el=>{
      el.onclick = ()=>{
        state.newEntry.isViral = el.getAttribute('data-ne-viral')==='yes';
        draw();
      };
    });

    const gt = container.querySelector('#gen-topic'); if(gt) gt.oninput = ()=>state.genTopic = gt.value;
    const gqc = container.querySelector('#gen-quick-context'); if(gqc) gqc.oninput = ()=>state.genQuickContext = gqc.value;
    container.querySelectorAll('[data-gen-goal]').forEach(el=>{
      el.onclick = ()=>{
        state.genGoal = el.getAttribute('data-gen-goal');
        const recommended = GOAL_RECOMMENDED_CATS[state.genGoal] || [];
        if(!state.genShowAllCats && recommended.length) state.genCategory = recommended[0];
        draw();
      };
    });
    const toggleAllCats = container.querySelector('[data-action="toggle-all-cats"]');
    if(toggleAllCats) toggleAllCats.onclick = ()=>{ state.genShowAllCats = !state.genShowAllCats; draw(); };
    container.querySelectorAll('[data-gen-cat]').forEach(el=>{
      el.onclick = ()=>{ state.genCategory = el.getAttribute('data-gen-cat'); draw(); };
    });
    const genHooksBtn = container.querySelector('[data-action="generate-hooks"]');
    if(genHooksBtn) genHooksBtn.onclick = generateHooksByTopic;
    container.querySelectorAll('[data-save-gen]').forEach(el=>{
      el.onclick = ()=>{ saveGeneratedHook(Number(el.getAttribute('data-save-gen'))); };
    });
    container.querySelectorAll('[data-write-gen]').forEach(el=>{
      el.onclick = ()=>{
        const i = Number(el.getAttribute('data-write-gen'));
        window.PendingTopic = state.genResult[i];
        location.hash = 'viet-content';
      };
    });
    container.querySelectorAll('[data-use-thumb]').forEach(el=>{
      el.onclick = ()=>{
        const i = Number(el.getAttribute('data-use-thumb'));
        window.PendingImageTitle = state.genThumbTitles[i];
        location.hash = 'tao-anh';
      };
    });

    const h = container.querySelector('#ne-hook'); if(h) h.oninput = ()=>state.newEntry.hook_text = h.value;
    const n = container.querySelector('#ne-note'); if(n) n.oninput = ()=>state.newEntry.note = n.value;
    const v1 = container.querySelector('#ne-views'); if(v1) v1.oninput = ()=>state.newEntry.viralViews = v1.value;
    const v2 = container.querySelector('#ne-likes'); if(v2) v2.oninput = ()=>state.newEntry.viralLikes = v2.value;
    const addBtn = container.querySelector('[data-action="add"]');
    if(addBtn) addBtn.onclick = addHook;
    container.querySelectorAll('[data-del]').forEach(el=>{
      el.onclick = async ()=>{
        await ctx.supabase.from('hooks_bank_personal').delete().eq('id', el.getAttribute('data-del'));
        await loadPersonal(); draw();
      };
    });

    const shareYes = container.querySelector('[data-share-yes]');
    if(shareYes) shareYes.onclick = ()=>confirmShare(true);
    const shareNo = container.querySelector('[data-share-no]');
    if(shareNo) shareNo.onclick = ()=>confirmShare(false);

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
      window.PendingTopic = findSourceText(state.writeFor);
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
        location.hash = 'viet-content';
      };
    });
  }

  async function generateHooksByTopic(){
    if(!state.genTopic.trim()) return;
    state.genLoading = true; state.genError = null; state.genResult = null; state.genThumbTitles = null; state.genSavedIdx = {};
    draw();
    const stopProgress = animateProgressButton(container.querySelector('[data-action="generate-hooks"]'), 35, 'Đang sinh hook');
    try{
      const data = await callApi('/api/goi-y-hook-theo-chu-de', {
        topic: state.genTopic,
        category: state.genCategory,
        goal: state.genGoal,
        positioning: (state.positioning && state.positioning.luot1) ? { luot1: state.positioning.luot1, luot2: state.positioning.luot2 } : null,
        quick_context: state.genQuickContext,
      });
      state.genResult = data.result.hooks;
      state.genThumbTitles = data.result.tieu_de_thumbnail;
    } catch(e){ state.genError = e.message; }
    stopProgress();
    state.genLoading = false; draw();
  }

  async function saveGeneratedHook(i){
    const hookText = state.genResult[i];
    const catLabel = (HOOK_GEN_CATEGORIES.find(c=>c.key===state.genCategory)||{}).label || state.genCategory;
    await ctx.supabase.from('hooks_bank_personal').insert({
      user_id: ctx.user.id, hook_text: hookText, category: catLabel, note: `Chủ đề: ${state.genTopic}`,
    });
    state.genSavedIdx[i] = true; draw();
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

  async function addHook(){
    if(!state.newEntry.hook_text.trim() || state.addingHook) return;
    state.addingHook = true; state.addError = null; state.sharePromptFor = null; state.shareDoneFor = null; draw();
    const entry = state.newEntry;
    let category = null;
    let tags = [];
    let classifyWarning = null;
    try{
      const data = await callApi('/api/phan-loai-hook', { hook_text: entry.hook_text });
      category = categoryLabel(data.result.category);
    } catch(e){
      // Không phân loại được (vd lỗi mạng) — vẫn lưu hook, chỉ thiếu nhãn loại, không chặn người dùng.
      classifyWarning = `Không tự nhận diện được loại hook (${e.message}) — đã lưu hook, bạn có thể bỏ qua.`;
    }
    try{
      const data = await callApi('/api/phan-loai-truc', { title: entry.hook_text, content: entry.note || '' });
      if(data.result && data.result.truc) tags = [data.result.truc];
    } catch(e){ /* không phân loại được trục — vẫn lưu, không chặn người dùng */ }

    const { data: row, error } = await ctx.supabase.from('hooks_bank_personal').insert({
      user_id: ctx.user.id, hook_text: entry.hook_text,
      category, note: entry.note || null, tags,
      is_viral: entry.isViral===true, viral_views: entry.isViral===true ? (entry.viralViews||null) : null,
      viral_likes: entry.isViral===true ? (entry.viralLikes||null) : null,
    }).select().single();

    state.addingHook = false;
    if(error){
      state.addError = `Không lưu được: ${error.message}`;
      draw();
      return;
    }
    const wasViral = entry.isViral===true;
    state.newEntry = { hook_text:'', note:'', isViral:null, viralViews:'', viralLikes:'' };
    state.addError = classifyWarning;
    await loadPersonal();
    if(wasViral) state.sharePromptFor = row.id;
    draw();
  }

  async function confirmShare(yes){
    if(!state.sharePromptFor || state.shareSubmitting) return;
    const id = state.sharePromptFor;
    if(yes){
      state.shareSubmitting = true; draw();
      await ctx.supabase.from('hooks_bank_personal').update({ share_status:'pending' }).eq('id', id);
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
window.Modules['kho-hook'] = { title:'Kho Hook', render };
})();
