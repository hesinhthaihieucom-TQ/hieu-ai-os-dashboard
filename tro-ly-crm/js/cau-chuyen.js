// "Câu Chuyện Của Bạn" — ĐÚNG bộ câu hỏi trong trang-ban-dich-vu.html (Phần 1: Điền thông tin của
// bạn), KHÔNG phải bộ câu hỏi của Định Vị AI (chị Quỳnh chốt 2026-08-29 — 2 hồ sơ phục vụ 2 mục đích
// khác nhau: Định Vị AI để định hướng content/thương hiệu, còn hồ sơ này để Tư Vấn AI kể đúng câu
// chuyện thật khi chốt khách). Lưu THÔ vào crm_story_profiles, KHÔNG qua AI xử lý — đúng luồng gốc
// trên landing page (chỉ thu thập, gửi thẳng). Nếu người dùng đã có positioning_results (Định Vị AI
// bên Xây Nhân Hiệu, cùng Supabase project) thì vẫn cho họ CHỌN dùng luôn câu chuyện cá nhân trong đó
// thay vì bắt điền lại — không bắt buộc.
(function(){

const QUESTIONS = [
  {id:'ten', group:'lien-he', label:'Tên bạn', type:'text', hint:'Để AI xưng hô đúng khi tư vấn thay bạn.'},
  {id:'zalo', group:'lien-he', label:'Số Zalo', type:'text', hint:'Số khách sẽ nhắn khi họ muốn đồng hành cùng bạn (không bắt buộc).'},
  {id:'links', group:'lien-he', label:'Các link bạn đang có (nếu có)', type:'textarea', hint:'Mỗi link 1 dòng — landing page, khóa học, video... Tư Vấn AI sẽ ưu tiên dùng phần "Thông tin sản phẩm/dịch vụ" ở màn Tư Vấn AI, đây chỉ là link tham khảo thêm.'},

  {id:'q1', group:'g1', label:'Bạn đang làm công việc gì?', type:'textarea'},
  {id:'q2', group:'g1', label:'Bạn bắt đầu công việc hiện tại từ năm nào?', type:'text'},
  {id:'q3', group:'g1', label:'Thế mạnh của bạn là gì?', type:'textarea'},

  {id:'q4', group:'g2', label:'Trước đây bạn từng làm công việc/lĩnh vực gì?', type:'textarea'},
  {id:'q5', group:'g2', label:'Có giai đoạn khó khăn nào đáng nhớ không?', type:'textarea'},

  {id:'q6', group:'g3', label:'Mô tả giai đoạn khó khăn nhất — điều gì xảy ra, cảm giác lúc đó ra sao?', type:'textarea'},
  {id:'q7', group:'g3', label:'Bạn từng tự hỏi những câu gì trong giai đoạn đó?', type:'textarea'},

  {id:'q8', group:'g4', label:'Bạn biết đến công việc/người dẫn dắt hiện tại như thế nào?', type:'textarea'},
  {id:'q9', group:'g4', label:'Điều gì khiến bạn ấn tượng/quyết định bắt đầu?', type:'textarea'},

  {id:'q10', group:'g5', label:'Lúc quyết định bắt đầu, tình hình của bạn ra sao?', type:'textarea'},
  {id:'q11', group:'g5', label:'Bạn đã làm gì để nghiêm túc bắt đầu?', type:'textarea'},

  {id:'q12', group:'g6', label:'Kết quả đầu tiên bạn đạt được là gì, sau bao lâu?', type:'textarea'},
  {id:'q13', group:'g6', label:'Những mốc quan trọng tiếp theo (nếu có)?', type:'textarea'},

  {id:'q14', group:'g7', label:'Điều gì thay đổi lớn nhất ở bạn (không chỉ về tiền)?', type:'textarea'},
  {id:'q15', group:'g7', label:'Số liệu hiện tại nếu có (follower, cộng đồng...)', type:'textarea'},

  {id:'q16', group:'g8', label:'Bạn quan tâm/tập trung vào vấn đề sức khỏe nào?', type:'textarea'},
  {id:'q17', group:'g8', label:'Bạn từng đồng hành cùng khách hàng như thế nào, kết quả ra sao?', type:'textarea'},

  {id:'q18', group:'g9', label:'Bạn muốn giúp mọi người đạt được điều gì (không chỉ về tiền)?', type:'textarea'},
  {id:'q19', group:'g9', label:'Bạn muốn giúp những đối tượng khách hàng nào?', type:'textarea'},

  {id:'q20', group:'g10', label:'Nếu khách hỏi "Tại sao nên nghe bạn?" — bạn muốn AI nói gì?', hint:'(không dùng kiểu "hãy tin tôi")', type:'textarea'},
];

const GROUPS = [
  {key:'lien-he', title:'Thông tin liên hệ'},
  {key:'g1', title:'1. Bạn là ai'},
  {key:'g2', title:'2. Trước khi bước vào công việc hiện tại'},
  {key:'g3', title:'3. Giai đoạn khó khăn / điểm gãy'},
  {key:'g4', title:'4. Cơ duyên đến với công việc hiện tại'},
  {key:'g5', title:'5. Thời điểm bắt đầu'},
  {key:'g6', title:'6. Những kết quả đầu tiên'},
  {key:'g7', title:'7. Sự thay đổi của bạn'},
  {key:'g8', title:'8-9. Sức khỏe & khách hàng'},
  {key:'g9', title:'10-14. Tư duy / giá trị cốt lõi'},
  {key:'g10', title:'15. Cách AI nên kể câu chuyện của bạn'},
];

const WIZARD_DRAFT_KEY = 'cau-chuyen-wizard';

function render(container, ctx){
  const state = {
    screen:'loading', qIndex:0, answers:{}, storyProfile:null, positioning:null,
    saving:false, error:null,
    // Tự viết tự do (2026-08-30, chị Quỳnh chốt: "cho người dùng tự viết hoặc trả lời câu hỏi") —
    // free_story có dữ liệu thì ưu tiên dùng thẳng làm câu chuyện cá nhân, tách biệt với answers
    // (chế độ trả lời từng câu) — không bắt buộc dùng cùng lúc, xem schema_full.sql.
    freeStory:'', freeTen:'', freeZalo:'', freeLinks:'',
  };

  function draw(){ container.innerHTML = screenHtml(); bind(); }
  function persistDraft(){ saveModuleDraft(ctx, WIZARD_DRAFT_KEY, { qIndex: state.qIndex, answers: state.answers }); }

  function emptyAnswers(){
    const out = {};
    QUESTIONS.forEach(q=>{ out[q.id] = ''; });
    out.ten = (ctx.profile && ctx.profile.full_name) || '';
    return out;
  }

  async function boot(){
    draw();
    const [{ data: story }, { data: positioning }] = await Promise.all([
      ctx.supabase.from('crm_story_profiles').select('*').eq('user_id', ctx.user.id).maybeSingle(),
      ctx.supabase.from('positioning_results').select('luot1').eq('user_id', ctx.user.id).maybeSingle(),
    ]);
    state.positioning = (positioning && positioning.luot1) ? positioning : null;

    const hasWizardStory = story && story.answers && Object.keys(story.answers).some(k=>String(story.answers[k]||'').trim());
    const hasFreeStory = story && story.free_story && story.free_story.trim();
    if(hasWizardStory || hasFreeStory){
      state.storyProfile = story;
      state.answers = { ten: story.ten||'', zalo: story.zalo||'', links: story.links||'', ...story.answers };
      state.freeStory = story.free_story || '';
      state.freeTen = story.ten || ''; state.freeZalo = story.zalo || ''; state.freeLinks = story.links || '';
      state.screen = 'existing';
      draw();
      return;
    }

    if(state.positioning){
      state.screen = 'offer-dinh-vi';
      draw();
      return;
    }

    const draft = await loadModuleDraft(ctx, WIZARD_DRAFT_KEY);
    if(draft && draft.answers && Object.values(draft.answers).some(v=>String(v||'').trim())){
      state.answers = { ...emptyAnswers(), ...draft.answers };
      state.qIndex = Math.min(draft.qIndex||0, QUESTIONS.length-1);
      state.screen = 'wizard';
    } else {
      state.answers = emptyAnswers();
      state.screen = 'intro';
    }
    draw();
  }

  function startWizard(){
    if(!state.answers || !Object.keys(state.answers).length) state.answers = emptyAnswers();
    state.qIndex = 0;
    state.screen = 'wizard';
    draw();
  }

  function screenHtml(){
    if(state.screen==='loading') return `<div class="loading"><div class="spinner"></div></div>`;
    if(state.screen==='offer-dinh-vi') return offerDinhViHtml();
    if(state.screen==='existing') return existingHtml();
    if(state.screen==='intro') return introHtml();
    if(state.screen==='wizard') return wizardHtml();
    if(state.screen==='free-write') return freeWriteHtml();
    if(state.screen==='done') return doneHtml();
    return '';
  }

  function offerDinhViHtml(){
    const r = state.positioning.luot1 || {};
    const cc = r.cau_chuyen_ca_nhan || {};
    return `
      <div class="page-head" style="text-align:center;">
        <div class="tag">Câu Chuyện Của Bạn</div>
        <h1>Bạn đã có hồ sơ Định Vị bên Xây Nhân Hiệu</h1>
        <p>Trong đó đã có sẵn phần câu chuyện cá nhân. Bạn muốn dùng luôn, hay tự điền riêng 1 bản dành đúng cho việc tư vấn bán hàng ở đây?</p>
      </div>
      ${cc.cau_chuyen ? `<div class="section"><h3>Câu chuyện cá nhân (từ Định Vị AI)</h3><div class="body">${esc(cc.cau_chuyen)}</div></div>` : ''}
      <div class="btn-row">
        <button class="btn" data-action="use-dinh-vi">Dùng hồ sơ Định Vị này</button>
        <button class="btn-ghost btn" data-action="own-story">Tự điền câu chuyện riêng</button>
      </div>
    `;
  }

  function existingHtml(){
    const a = state.answers;
    const isFree = !!(state.storyProfile && state.storyProfile.free_story && state.storyProfile.free_story.trim());
    return `
      <div class="page-head" style="text-align:center;">
        <div class="tag">Câu Chuyện Của Bạn</div>
        <h1>Hồ sơ của bạn đã có sẵn</h1>
        <p>Tư Vấn AI sẽ tự dùng đúng câu chuyện thật này khi tư vấn khách — không cần làm gì thêm.</p>
      </div>
      ${state.confirmMsg?`<div class="hint-box">${esc(state.confirmMsg)}</div>`:''}
      ${isFree
        ? `<div class="section highlight"><h3>Câu chuyện bạn đã viết</h3><div class="body">${esc(state.storyProfile.free_story)}</div></div>`
        : `
          ${a.q1 ? `<div class="section"><h3>1. Bạn là ai</h3><div class="body">${esc(a.q1)}</div></div>` : ''}
          ${a.q6 ? `<div class="section"><h3>3. Giai đoạn khó khăn / điểm gãy</h3><div class="body">${esc(a.q6)}</div></div>` : ''}
          ${a.q20 ? `<div class="section highlight"><h3>15. Cách AI nên kể câu chuyện của bạn</h3><div class="body">${esc(a.q20)}</div></div>` : ''}
        `}
      <div class="btn-row">
        <button class="btn-ghost btn" data-action="edit">Sửa lại</button>
        <button class="btn" data-action="home">Về Trang chủ</button>
      </div>
    `;
  }

  function introHtml(){
    return `
      <div class="page-head" style="text-align:center;">
        <div class="tag">Câu Chuyện Của Bạn</div>
        <h1>Kể câu chuyện thật của bạn</h1>
        <p>Chọn 1 trong 2 cách — đều phục vụ cùng mục đích: cho Tư Vấn AI (và sổ tay tư vấn) dữ liệu thật để kể chuyện khi chốt khách.</p>
      </div>
      ${state.error?`<div class="error-box">${esc(state.error)}</div>`:''}
      <div class="section" style="cursor:pointer;" data-action="start">
        <h3>Trả lời từng câu hỏi (${QUESTIONS.length} câu)</h3>
        <div class="body" style="color:var(--ink-soft);font-size:13.5px;">AI hỏi từng câu 1, bạn chỉ cần trả lời thật — mục nào chưa có thì để trống. Phù hợp nếu chưa biết bắt đầu kể từ đâu.</div>
      </div>
      <div class="section" style="cursor:pointer;" data-action="start-free">
        <h3>Tự viết câu chuyện của mình</h3>
        <div class="body" style="color:var(--ink-soft);font-size:13.5px;">Viết tự do 1 đoạn kể lại hành trình của bạn theo đúng cách bạn muốn kể — phù hợp nếu bạn đã quen kể câu chuyện này rồi.</div>
      </div>
    `;
  }

  function freeWriteHtml(){
    return `
      <div class="page-head" style="text-align:center;">
        <div class="tag">Câu Chuyện Của Bạn</div>
        <h1>Tự viết câu chuyện của bạn</h1>
        <p>Viết tự do — nền tảng trước đây, giai đoạn khó khăn, điều gì khiến bạn bắt đầu, kết quả/sự thay đổi tới giờ... Không cần viết hay, chỉ cần đúng sự thật, càng chi tiết Tư Vấn AI càng kể thuyết phục hơn.</p>
      </div>
      ${state.error?`<div class="error-box">${esc(state.error)}</div>`:''}
      <div class="card">
        <label style="display:block;font-size:13px;font-weight:600;color:var(--ink-soft);margin-bottom:6px;">Tên bạn</label>
        <input type="text" id="fw-ten" value="${esc(state.freeTen)}" placeholder="Để AI xưng hô đúng khi tư vấn thay bạn">
        <label style="display:block;font-size:13px;font-weight:600;color:var(--ink-soft);margin:14px 0 6px;">Số Zalo (không bắt buộc)</label>
        <input type="text" id="fw-zalo" value="${esc(state.freeZalo)}">
        <label style="display:block;font-size:13px;font-weight:600;color:var(--ink-soft);margin:14px 0 6px;">Câu chuyện của bạn</label>
        <textarea id="fw-story" style="min-height:260px;" placeholder="Viết tự do câu chuyện của bạn ở đây...">${esc(state.freeStory)}</textarea>
      </div>
      <div class="btn-row" style="justify-content:flex-start;">
        <button class="btn" data-action="save-free" ${state.saving?'disabled':''}>${state.saving?'Đang lưu…':'Lưu'}</button>
        <span class="btn-ghost btn btn-sm" data-action="switch-to-wizard">Đổi sang trả lời từng câu hỏi</span>
      </div>
    `;
  }

  function doneHtml(){
    return `
      <div class="page-head" style="text-align:center;">
        <div class="tag">Câu Chuyện Của Bạn</div>
        <h1>Đã lưu ✓</h1>
        <p>Tư Vấn AI sẽ tự dùng câu chuyện này khi tư vấn khách của bạn.</p>
      </div>
      <div class="btn-row">
        <button class="btn" data-action="home">Về Trang chủ</button>
      </div>
    `;
  }

  function wizardHtml(){
    const q = QUESTIONS[state.qIndex];
    const groupIndex = GROUPS.findIndex(g=>g.key===q.group);
    const val = state.answers[q.id] || '';
    const inputHtml = q.type==='text'
      ? `<input type="text" id="qinput" value="${esc(val)}" placeholder="${esc(q.placeholder||'')}">`
      : `<textarea id="qinput" placeholder="${esc(q.placeholder||'Mục này chưa có thì để trống...')}">${esc(val)}</textarea>`;

    return `
      <div style="display:flex;gap:4px;margin-bottom:10px;flex-wrap:wrap;">
        ${GROUPS.map((g,i)=>`<span style="flex:1;min-width:8px;height:5px;border-radius:3px;background:${i<groupIndex?'var(--accent)':i===groupIndex?'var(--gold)':'var(--line)'};"></span>`).join('')}
      </div>
      <div style="display:flex;justify-content:space-between;font-size:12px;color:var(--ink-soft);font-family:'IBM Plex Mono',monospace;margin-bottom:18px;">
        <span>${esc(GROUPS[groupIndex].title)}</span>
        <span>Câu ${state.qIndex+1}/${QUESTIONS.length}</span>
      </div>
      <div class="card">
        <h2 style="font-size:19px;line-height:1.4;">${esc(q.label)}</h2>
        ${q.hint?`<div style="margin-top:8px;font-size:13px;color:var(--ink-soft);line-height:1.5;">${esc(q.hint)}</div>`:''}
        ${inputHtml}
      </div>
      <div style="display:flex;justify-content:space-between;align-items:center;margin-top:22px;">
        ${state.qIndex>0 ? `<span style="color:var(--ink-soft);font-size:13.5px;cursor:pointer;" data-action="back">← Câu trước</span>` : `<span></span>`}
        <button class="btn" data-action="next">${state.qIndex===QUESTIONS.length-1?'Hoàn tất':'Tiếp tục'}</button>
      </div>
    `;
  }

  function bind(){
    const useDinhViBtn = container.querySelector('[data-action="use-dinh-vi"]');
    if(useDinhViBtn) useDinhViBtn.onclick = ()=>{
      state.screen = 'existing';
      state.answers = emptyAnswers();
      state.confirmMsg = 'Đã dùng hồ sơ Định Vị ✓ — Tư Vấn AI sẽ tự tham khảo câu chuyện cá nhân trong đó.';
      draw();
    };
    const ownStoryBtn = container.querySelector('[data-action="own-story"]');
    if(ownStoryBtn) ownStoryBtn.onclick = ()=>{ state.screen='intro'; draw(); };

    const startBtn = container.querySelector('[data-action="start"]');
    if(startBtn) startBtn.onclick = startWizard;
    const startFreeBtn = container.querySelector('[data-action="start-free"]');
    if(startFreeBtn) startFreeBtn.onclick = ()=>{ state.screen='free-write'; draw(); };
    const switchToWizardBtn = container.querySelector('[data-action="switch-to-wizard"]');
    if(switchToWizardBtn) switchToWizardBtn.onclick = startWizard;

    const editBtn = container.querySelector('[data-action="edit"]');
    if(editBtn) editBtn.onclick = ()=>{
      const isFree = !!(state.storyProfile && state.storyProfile.free_story && state.storyProfile.free_story.trim());
      if(isFree){ state.screen='free-write'; } else { state.qIndex = 0; state.screen='wizard'; }
      draw();
    };

    const homeBtn = container.querySelector('[data-action="home"]');
    if(homeBtn) homeBtn.onclick = ()=>{ location.hash = 'trang-chu'; };

    const backLink = container.querySelector('[data-action="back"]');
    if(backLink) backLink.onclick = ()=>{ state.qIndex = Math.max(0, state.qIndex-1); draw(); persistDraft(); };

    const nextBtn = container.querySelector('[data-action="next"]');
    if(nextBtn) nextBtn.onclick = onNext;

    const qinput = container.querySelector('#qinput');
    if(qinput) qinput.oninput = ()=>{ state.answers[QUESTIONS[state.qIndex].id] = qinput.value; };

    const fwTen = container.querySelector('#fw-ten');
    if(fwTen) fwTen.oninput = ()=>{ state.freeTen = fwTen.value; };
    const fwZalo = container.querySelector('#fw-zalo');
    if(fwZalo) fwZalo.oninput = ()=>{ state.freeZalo = fwZalo.value; };
    const fwStory = container.querySelector('#fw-story');
    if(fwStory) fwStory.oninput = ()=>{ state.freeStory = fwStory.value; };
    const saveFreeBtn = container.querySelector('[data-action="save-free"]');
    if(saveFreeBtn) saveFreeBtn.onclick = finishFree;
  }

  function onNext(){
    persistDraft();
    if(state.qIndex < QUESTIONS.length-1){ state.qIndex++; draw(); }
    else { finish(); }
  }

  async function finish(){
    state.saving = true; draw();
    const { ten, zalo, links, ...answers } = state.answers;
    const { error } = await ctx.supabase.from('crm_story_profiles').upsert({
      user_id: ctx.user.id, ten: ten||null, zalo: zalo||null, links: links||null,
      answers, updated_at: new Date().toISOString(),
    }, { onConflict:'user_id' });
    state.saving = false;
    if(error){ state.error = error.message; state.screen = 'wizard'; draw(); return; }
    await clearModuleDraft(ctx, WIZARD_DRAFT_KEY);
    state.screen = 'done';
    draw();
  }

  async function finishFree(){
    if(!state.freeStory.trim()){ state.error = 'Viết ít nhất vài dòng trước khi lưu.'; draw(); return; }
    state.saving = true; state.error = null; draw();
    const { error } = await ctx.supabase.from('crm_story_profiles').upsert({
      user_id: ctx.user.id, ten: state.freeTen.trim()||null, zalo: state.freeZalo.trim()||null,
      free_story: state.freeStory.trim(), updated_at: new Date().toISOString(),
    }, { onConflict:'user_id' });
    state.saving = false;
    if(error){ state.error = error.message; draw(); return; }
    state.screen = 'done';
    draw();
  }

  boot();
}

window.Modules = window.Modules || {};
window.Modules['cau-chuyen'] = { title:'Câu Chuyện Của Bạn', render };
})();
