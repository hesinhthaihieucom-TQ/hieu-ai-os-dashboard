(function(){
const SOURCE_MAP = {
  ca_nhan: 'Câu chuyện cá nhân', case_hoc_vien: 'Case học viên', cau_hoi_kh: 'Câu hỏi khách hàng',
  xu_huong: 'Xu hướng thị trường', quan_diem_nguoc_dong: 'Quan điểm ngược dòng', bai_mau: 'Bài mẫu thật',
  chuyen_gia_viet: 'Mẫu chuyên gia viết', tai_che_viral: 'Tái chế từ bài viral',
};

// Trục nội dung (content pillar) — nhóm các tag chi tiết trong data lại thành nhóm lớn dễ chọn,
// tránh người dùng bị ngộp vì phải lướt qua cả kho chung chưa lọc.
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
  const state = {
    tab:'da-viet', posts:[], personalBank:[], sharedBank:[], positioning:null,
    newEntry:{ title:'', content:'', source_type:'', tags:'' },
    writeFor:null, writeLoading:false, writeIdeas:null, writeError:null, writeQuickContext:'',
    positioningId:null, applyingVoice:null, applyVoiceError:null, applyVoiceErrorFor:null, voiceAppliedFor:null,
    chungPillar:null,
  };

  function draw(){ container.innerHTML = html(); bind(); }

  async function boot(){
    container.innerHTML = `<div class="loading"><div class="spinner"></div><p>Đang tải…</p></div>`;
    const { data: pos } = await ctx.supabase.from('positioning_results').select('*').eq('user_id', ctx.user.id).maybeSingle();
    state.positioning = pos || null;
    state.positioningId = pos ? pos.id : null;
    await Promise.all([loadPosts(), loadPersonal(), loadShared()]);
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

  function html(){
    return `
      <div class="page-head"><h1>Kho Content</h1><p>Bài đã viết, tư liệu bạn tự sưu tầm, và kho chung do đội ngũ cập nhật.</p></div>
      <div class="tab-row">
        <div class="tab-btn ${state.tab==='da-viet'?'active':''}" data-tab="da-viet">Bài đã viết (${state.posts.length})</div>
        <div class="tab-btn ${state.tab==='kho-toi'?'active':''}" data-tab="kho-toi">Kho của tôi (${state.personalBank.length})</div>
        <div class="tab-btn ${state.tab==='kho-chung'?'active':''}" data-tab="kho-chung">Kho chung (${state.sharedBank.length})</div>
      </div>
      ${state.tab==='da-viet' ? daVietTab() : state.tab==='kho-toi' ? khoToiTab() : khoChungTab()}
    `;
  }

  function writeActionHtml(key){
    const isOpen = state.writeFor === key;
    return `
      <div style="margin-top:12px;display:flex;flex-wrap:wrap;gap:10px;align-items:center;">
        <span class="btn-ghost btn btn-sm" data-write-toggle="${key}">${isOpen?'Đóng':'Viết bài từ đây →'}</span>
        <span class="btn-ghost btn btn-sm" data-apply-voice="${key}" ${state.applyingVoice===key?'disabled':''}>${state.applyingVoice===key?'Đang phân tích giọng văn…':'Dùng làm giọng mẫu'}</span>
      </div>
      ${isOpen ? writePanelHtml() : ''}
      ${state.voiceAppliedFor===key?`<div class="hint-box" style="margin-top:10px;">Đã cập nhật giọng điệu &amp; ngôn ngữ vào Định Vị theo bài này.</div>`:''}
      ${state.applyVoiceErrorFor===key?`<div class="error-box" style="margin-top:10px;">${esc(state.applyVoiceError)}</div>`:''}
    `;
  }

  function writePanelHtml(){
    const hasPositioning = !!(state.positioning && state.positioning.luot1);
    if(state.writeLoading) return `<div style="margin-top:10px;font-size:13px;color:var(--ink-soft);">Đang sinh ý tưởng…</div>`;
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
        <button class="btn btn-sm" data-write-keep="1">Giữ nguyên nội dung này</button>
        <button class="btn-ghost btn btn-sm" data-write-generate="1">Tạo 5 ý tưởng mới từ đây</button>
      </div>`;
  }

  function daVietTab(){
    if(state.posts.length===0) return `<div class="card" style="color:var(--ink-soft);">Chưa có bài nào — sang tab <b>Kho chung</b> chọn 1 bài mẫu phù hợp trục nội dung của bạn để viết bài đầu tiên.</div>`;
    return state.posts.map(p=>`
      <div class="section">
        <h3>${esc(p.title||'(không tiêu đề)')}</h3>
        <div class="body">${esc(p.content)}</div>
        <div class="btn-row" style="margin-top:14px;"><button class="btn btn-sm" data-schedule="${p.id}">Đưa vào lịch →</button></div>
        ${writeActionHtml('post:'+p.id)}
      </div>
    `).join('');
  }

  function khoToiTab(){
    return `
      <div class="card">
        <label style="display:block;font-size:13px;font-weight:600;color:var(--ink-soft);margin-bottom:6px;">Tiêu đề</label>
        <textarea id="ne-title" style="min-height:auto;height:44px;">${esc(state.newEntry.title)}</textarea>
        <label style="display:block;font-size:13px;font-weight:600;color:var(--ink-soft);margin:14px 0 6px;">Nội dung</label>
        <textarea id="ne-content">${esc(state.newEntry.content)}</textarea>
        <label style="display:block;font-size:13px;font-weight:600;color:var(--ink-soft);margin:14px 0 6px;">Loại nguồn</label>
        <select id="ne-source">
          <option value="">— Chọn —</option>
          ${Object.entries(SOURCE_MAP).map(([k,v])=>`<option value="${k}" ${state.newEntry.source_type===k?'selected':''}>${esc(v)}</option>`).join('')}
        </select>
        <label style="display:block;font-size:13px;font-weight:600;color:var(--ink-soft);margin:14px 0 6px;">Tags (cách nhau bởi dấu phẩy)</label>
        <textarea id="ne-tags" style="min-height:auto;height:44px;">${esc(state.newEntry.tags)}</textarea>
        <div class="btn-row"><button class="btn" data-action="add-personal">Thêm vào kho của tôi</button></div>
      </div>
      <div style="margin-top:20px;">
        ${state.personalBank.length===0?`<div style="color:var(--ink-soft);font-size:14px;">Kho của bạn đang trống.</div>`:''}
        ${state.personalBank.map(b=>`
          <div class="section">
            <div class="meta" style="font-family:'IBM Plex Mono',monospace;font-size:11px;color:var(--ink-soft);text-transform:uppercase;margin-bottom:6px;">${esc(SOURCE_MAP[b.source_type]||b.source_type||'')}${(b.tags&&b.tags.length)?' · '+b.tags.map(esc).join(', '):''}</div>
            <h3>${esc(b.title)}</h3>
            <div class="body">${esc(b.content)}</div>
            <div class="btn-row" style="margin-top:10px;justify-content:space-between;">
              <span style="color:var(--danger);cursor:pointer;font-size:12px;" data-del-personal="${b.id}">Xoá</span>
            </div>
            ${writeActionHtml('personal:'+b.id)}
          </div>
        `).join('')}
      </div>
    `;
  }

  function khoChungTab(){
    if(state.sharedBank.length===0) return `<div class="card" style="color:var(--ink-soft);">Kho chung chưa có nội dung — sẽ được cập nhật từ đội ngũ.</div>`;

    if(!state.chungPillar){
      return `
        <div class="hint-box" style="margin-bottom:14px;">Chọn 1 trục nội dung bên dưới để xem đúng bài mẫu phù hợp — đỡ phải lướt qua cả kho.</div>
        <div class="chips">
          ${PILLARS.map(p=>{
            const count = state.sharedBank.filter(b=>pillarsForItem(b).includes(p.key)).length;
            if(count===0) return '';
            return `<div class="chip" data-chung-pillar="${p.key}">${esc(p.label)} (${count})</div>`;
          }).join('')}
          <div class="chip" data-chung-pillar="all">Xem tất cả (${state.sharedBank.length})</div>
        </div>
      `;
    }

    const items = state.chungPillar==='all' ? state.sharedBank : state.sharedBank.filter(b=>pillarsForItem(b).includes(state.chungPillar));
    const pillarLabel = state.chungPillar==='all' ? 'Tất cả' : (PILLARS.find(p=>p.key===state.chungPillar)||{}).label;
    return `
      <div style="margin-bottom:14px;display:flex;justify-content:space-between;align-items:center;">
        <div style="font-size:13px;font-weight:600;color:var(--ink-soft);">Trục: ${esc(pillarLabel)} (${items.length} bài)</div>
        <span style="font-size:12.5px;color:var(--accent);cursor:pointer;font-weight:600;" data-action="chung-back">← Chọn trục khác</span>
      </div>
      ${items.map(b=>`
        <div class="section">
          <div class="meta" style="font-family:'IBM Plex Mono',monospace;font-size:11px;color:var(--ink-soft);text-transform:uppercase;margin-bottom:6px;">${esc(SOURCE_MAP[b.source_type]||b.source_type||'')}${(b.tags&&b.tags.length)?' · '+b.tags.map(esc).join(', '):''}</div>
          <h3>${esc(b.title)}</h3>
          <div class="body protected" oncontextmenu="return false;" oncopy="return false;" oncut="return false;">${esc(b.content)}</div>
          ${writeActionHtml('shared:'+b.id)}
        </div>
      `).join('')}
    `;
  }

  function bind(){
    container.querySelectorAll('[data-tab]').forEach(el=>{ el.onclick = ()=>{ state.tab = el.getAttribute('data-tab'); draw(); }; });
    container.querySelectorAll('[data-chung-pillar]').forEach(el=>{
      el.onclick = ()=>{ state.chungPillar = el.getAttribute('data-chung-pillar'); draw(); };
    });
    const chungBackLink = container.querySelector('[data-action="chung-back"]');
    if(chungBackLink) chungBackLink.onclick = ()=>{ state.chungPillar = null; draw(); };

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

    container.querySelectorAll('[data-apply-voice]').forEach(el=>{
      el.onclick = ()=>{
        const key = el.getAttribute('data-apply-voice');
        applyVoice(key);
      };
    });

    const t = container.querySelector('#ne-title'); if(t) t.oninput = ()=>state.newEntry.title = t.value;
    const c = container.querySelector('#ne-content'); if(c) c.oninput = ()=>state.newEntry.content = c.value;
    const s = container.querySelector('#ne-source'); if(s) s.onchange = ()=>state.newEntry.source_type = s.value;
    const tg = container.querySelector('#ne-tags'); if(tg) tg.oninput = ()=>state.newEntry.tags = tg.value;
    const addBtn = container.querySelector('[data-action="add-personal"]');
    if(addBtn) addBtn.onclick = addPersonal;
    container.querySelectorAll('[data-del-personal]').forEach(el=>{
      el.onclick = async ()=>{
        await ctx.supabase.from('content_bank_personal').delete().eq('id', el.getAttribute('data-del-personal'));
        await loadPersonal(); draw();
      };
    });
  }

  async function generateIdeasFromSource(){
    state.writeLoading = true; state.writeError = null; draw();
    try{
      const data = await callApi('/api/goi-y-tu-nguon', {
        source_text: findSourceText(state.writeFor),
        positioning: (state.positioning && state.positioning.luot1) ? { luot1: state.positioning.luot1, luot2: state.positioning.luot2 } : null,
        quick_context: state.writeQuickContext,
      });
      state.writeIdeas = data.result.y_tuong;
    } catch(e){ state.writeError = e.message; }
    state.writeLoading = false; draw();
  }

  async function applyVoice(key){
    const content = findSourceText(key);
    if(!content.trim()) return;
    state.applyingVoice = key; state.applyVoiceError = null; state.applyVoiceErrorFor = null; state.voiceAppliedFor = null; draw();
    try{
      const data = await callApi('/api/goi-y-giong-van', { sample_text: content });
      if(state.positioning){
        const newLuot1 = { ...state.positioning.luot1, giong_dieu_ngon_ngu: data.result.giong_dieu_ngon_ngu };
        const { error } = await ctx.supabase.from('positioning_results').update({ luot1: newLuot1 }).eq('id', state.positioningId);
        if(error) throw error;
        state.positioning.luot1 = newLuot1;
      } else {
        const { data: row, error } = await ctx.supabase.from('positioning_results')
          .upsert({ user_id: ctx.user.id, luot1: { giong_dieu_ngon_ngu: data.result.giong_dieu_ngon_ngu } }, { onConflict:'user_id' })
          .select().single();
        if(error) throw error;
        state.positioning = row;
        state.positioningId = row.id;
      }
      state.voiceAppliedFor = key;
    } catch(e){ state.applyVoiceError = e.message; state.applyVoiceErrorFor = key; }
    state.applyingVoice = null;
    draw();
  }

  async function addPersonal(){
    if(!state.newEntry.title.trim() || !state.newEntry.content.trim()) return;
    const tags = state.newEntry.tags.split(',').map(t=>t.trim()).filter(Boolean);
    await ctx.supabase.from('content_bank_personal').insert({
      user_id: ctx.user.id, title: state.newEntry.title, content: state.newEntry.content,
      source_type: state.newEntry.source_type || null, tags,
    });
    state.newEntry = { title:'', content:'', source_type:'', tags:'' };
    await loadPersonal();
    draw();
  }

  boot();
}
window.Modules = window.Modules || {};
window.Modules['kho-content'] = { title:'Kho Content', render };
})();
