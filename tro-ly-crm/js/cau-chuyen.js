// "Câu Chuyện Của Bạn" — bản rút gọn của nhan-hieu/js/dinh-vi.js (Định Vị AI) cho app Trợ Lý AI Tư
// Vấn & CRM. Cùng bộ 16 câu hỏi, cùng flow Lượt 1/Lượt 2, cùng gọi /api/dinh-vi (backend generic,
// auth qua Bearer token, không thuộc riêng app nào) và cùng ghi vào positioning_results — CHỈ khác ở
// chỗ: vì bảng này dùng CHUNG cho mọi app trong hệ sinh thái HIỂU (khoá theo user_id, không theo
// app), nếu người dùng đã làm phần này ở Xây Nhân Hiệu (hoặc từng làm ở đây rồi) thì không bắt làm
// lại — chỉ hiện bản tóm tắt để xác nhận dùng luôn. Bỏ hẳn các phần chỉ có ý nghĩa bên Xây Nhân Hiệu
// (gợi ý AI theo câu, dán kết quả có sẵn, quản lý thương hiệu/tài sản quảng bá/tên kênh, sửa tay hệ
// trục, cập nhật riêng câu chuyện) — CRM chỉ cần đúng 1 hồ sơ để Tư Vấn AI (api/crm-tuvan.js) đọc.
(function(){

const QUESTIONS = [
  {id:'a1', group:'A', type:'textarea', q:'Bạn muốn xây kênh về lĩnh vực/chủ đề gì? (có thể khác công việc hiện tại) Hiện tại bạn đang làm công việc gì, đã làm bao lâu, giỏi nhất ở đâu, đang kẹt ở đâu?', placeholder:'Ví dụ: Mình muốn xây kênh về tài chính gia đình. Hiện đang làm kế toán doanh nghiệp được 5 năm, giỏi phần lên kế hoạch dòng tiền, còn kẹt ở phần marketing bản thân...', helper:'Trả lời rõ lĩnh vực/chủ đề muốn làm content ngay từ đầu — các câu sau sẽ bám theo đúng lĩnh vực này.'},
  {id:'a2', group:'A', type:'textarea', q:'Bạn muốn thương hiệu cá nhân này giúp bạn đạt được điều gì cụ thể? ("Để kiếm tiền" là chưa đủ rõ — kiếm tiền bằng cách nào: bán sản phẩm/dịch vụ gì, có thêm bao nhiêu khách, được mời hợp tác, hay xây uy tín để chuyển hướng nghề nghiệp?)', placeholder:'Ví dụ: Để mỗi tháng có thêm 15-20 khách mua gói tư vấn 1:1, hoặc để được mời hợp tác, hoặc để xây uy tín rồi ra mắt khoá học riêng...'},
  {id:'a3', group:'A', type:'chips', multi:true, allowOther:true, q:'Vấn đề bạn đang gặp phải là gì?', options:['Chưa có kênh','Không rõ mình là ai','Đăng lung tung, không nhất quán','Không biết bắt đầu từ đâu']},
  {id:'b1', group:'B', type:'textarea', q:'Bạn từng trải qua biến cố hoặc hành trình nào để lại bài học sâu sắc? Câu chuyện đó có thể trở thành "linh hồn" cho kênh của bạn không?', helper:'Nếu là chuyện nhạy cảm (bệnh nặng, trầm cảm, mất mát...), mình sẽ giúp bạn kể lại có trách nhiệm — không câu view, không hù doạ.'},
  {id:'b2', group:'B', type:'textarea', q:'Người khác thường tìm đến bạn để hỏi về điều gì, khen bạn nhiều nhất về điều gì, hoặc chủ đề nào bạn có thể nói rất lâu mà không hết ý?'},
  {id:'b3', group:'B', type:'textarea', q:'Bạn thích làm việc gì đến mức không thấy mệt? Và không thích làm gì / việc gì khiến bạn dễ tụt năng lượng?'},
  {id:'b4', group:'B', type:'textarea', q:'Bạn từng tự ti hoặc bị chê về điều gì?'},
  {id:'b5', group:'B', type:'chips', multi:true, allowOther:true, q:'Bạn muốn giúp nhóm người nào?', options:['Mệt - kẹt - gồng','Kiếm tiền tốt hơn','Khoẻ - đẹp','Xây nhân hiệu','Kinh doanh','Chữa lành']},
  {id:'c1', group:'C', type:'radio', q:'Bạn có thoải mái xuất hiện trước camera không?', options:['Rất thoải mái','Hơi ngại nhưng có thể tập','Không muốn lộ mặt','Chỉ muốn dùng giọng nói','Kết hợp tuỳ lúc']},
  {id:'c2', group:'C', type:'chips', multi:true, q:'Năng lượng tự nhiên của bạn thiên về hướng nào?', options:['Sâu / chữa lành','Mạnh / động lực','Vui / gần gũi','Sang / chuyên gia','Từng trải','Hài hước','Bình an / tâm linh']},
  {id:'c3', group:'C', type:'chips', multi:true, q:'Bạn muốn người xem cảm nhận gì khi xem nội dung của bạn?', options:['Tin tưởng','Chữa lành','Động lực','Chuyên gia','Gần gũi','Kết quả thật','Chiều sâu']},
  {id:'c4', group:'C', type:'textarea', q:'Chất liệu hình ảnh nào bạn có thể quay dễ dàng mỗi ngày?', helper:'Ví dụ: nơi làm việc, sản phẩm, khách hàng, thiên nhiên quanh bạn...'},
  {id:'d1', group:'D', type:'textarea', q:'Bạn biết ai đang làm nội dung trong lĩnh vực tương tự? Họ đang làm tốt điều gì, và bạn khác họ ở điểm nào?'},
  {id:'d2', group:'D', type:'textarea', q:'Nếu chỉ có 10 giây để người lạ nhớ bạn là ai, bạn sẽ nói gì?'},
  {id:'d3', group:'D', type:'textarea', q:'Điều bạn tin sâu sắc nhất về lĩnh vực mình làm — điều không phải ai cũng đồng ý?'},
  {id:'e3', group:'E', type:'textarea', q:'Khi nghĩ về những người có thương hiệu hình ảnh mạnh mà bạn ngưỡng mộ, họ có điểm chung gì về hình ảnh?'},
];

const GROUPS = [
  {key:'A', title:'Công Việc & Mục Tiêu'},
  {key:'B', title:'Chất Liệu Con Người'},
  {key:'C', title:'Style & Năng Lượng'},
  {key:'D', title:'Góc Nhìn & Khác Biệt'},
  {key:'E', title:'Dấu Ấn Hình Ảnh'},
];

function isAnswered(q, val){
  if(q.type==='textarea') return !!(val && val.trim().length>0);
  if(q.type==='radio') return !!val;
  if(q.type==='chips'){
    if(!val) return false;
    const chosen = Array.isArray(val.chosen) ? val.chosen : [];
    const other = (val.other||'').trim();
    return chosen.length>0 || other.length>0;
  }
  return false;
}

// Y hệt normalizeAnswers() của dinh-vi.js — chips phải đúng shape {chosen:[...], other:''} khi nạp
// answers từ nguồn ngoài (DB đã lưu), không thì tô chọn sai và bấm chip có thể ném lỗi JS.
function normalizeAnswers(raw){
  if(!raw) return {};
  const out = {};
  QUESTIONS.forEach(q=>{
    const v = raw[q.id];
    if(v===undefined) return;
    if(q.type!=='chips'){ out[q.id] = v; return; }
    if(v && typeof v==='object'){ out[q.id] = v; return; }
    const str = (v||'').toString().trim();
    if(!str){ out[q.id] = { chosen:[], other:'' }; return; }
    const parts = str.split(',').map(s=>s.trim()).filter(Boolean);
    const chosen = parts.filter(p=>q.options.includes(p));
    const other = parts.filter(p=>!q.options.includes(p)).join(', ');
    out[q.id] = { chosen, other };
  });
  return out;
}

function escBold(s){
  return esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
}

// Copy nguyên từ nhan-hieu/js/util.js — tách xuống dòng theo câu để đoạn dài AI trả về dễ đọc hơn.
function breakSentences(s){
  const str = String(s==null?'':s).replace(/\\n+/g, '\n\n');
  return str.replace(/([.!?]['"'"”]?)\s+(?=[A-ZÀ-Ỹ"'"“])/g, '$1\n\n');
}

function sectionHtml(title, body){
  if(!body || !String(body).trim()) return '';
  return `<div class="section"><h3>${esc(title)}</h3><div class="body">${escBold(breakSentences(body))}</div></div>`;
}

function render(container, ctx){
  const state = {
    screen:'loading', qIndex:0, answers:{}, luot1:null, luot2:null, error:null, saveError:null,
    luot2Loading:false, luot2Error:null, confirmMsg:'',
  };

  // Riêng cho app này, KHÔNG dùng chung key 'dinh-vi-wizard' của Xây Nhân Hiệu — 2 app chỉ cần chia
  // sẻ hồ sơ ĐÃ CHỐT (positioning_results), không cần chia sẻ câu trả lời đang làm dở giữa 2 nơi.
  const WIZARD_DRAFT_KEY = 'cau-chuyen-wizard';
  function persistWizardDraft(){ saveModuleDraft(ctx, WIZARD_DRAFT_KEY, { qIndex: state.qIndex, answers: state.answers }); }

  function draw(){ container.innerHTML = screenHtml(); bind(); }

  async function boot(){
    draw();
    const { data, error } = await ctx.supabase.from('positioning_results').select('*').eq('user_id', ctx.user.id).maybeSingle();
    if(error){ state.error = error.message; state.screen = 'intro'; draw(); return; }
    // "Hoàn chỉnh" nghĩa là đã có Lượt 1 chốt xong — có thể đã được tạo từ Xây Nhân Hiệu (cùng
    // Supabase project, cùng user_id) hoặc từ chính app này ở lần trước.
    const isComplete = data && data.luot1 && data.luot1.ket_luan_dinh_vi;
    if(data){
      state.answers = normalizeAnswers(data.answers);
      state.luot1 = isComplete ? data.luot1 : null;
      state.luot2 = isComplete ? data.luot2 : null;
    }
    if(isComplete){
      state.screen = 'existing';
      draw();
      return;
    }
    // Chưa có hồ sơ hoàn chỉnh — thử khôi phục câu trả lời đang làm dở của RIÊNG app này.
    const draft = await loadModuleDraft(ctx, WIZARD_DRAFT_KEY);
    if(draft && draft.answers && Object.keys(draft.answers).length){
      state.answers = { ...state.answers, ...normalizeAnswers(draft.answers) };
      state.qIndex = Math.min(draft.qIndex || 0, QUESTIONS.length - 1);
      state.screen = 'wizard';
    } else {
      state.screen = 'intro';
    }
    draw();
  }

  function screenHtml(){
    if(state.screen==='loading') return `<div class="loading"><div class="spinner"></div></div>`;
    if(state.screen==='existing') return existingHtml();
    if(state.screen==='intro') return introHtml();
    if(state.screen==='wizard') return wizardHtml();
    if(state.screen==='saving1') return loadingHtml('Đang phân tích câu chuyện của bạn…');
    if(state.screen==='results') return resultsHtml();
    return '';
  }

  function loadingHtml(msg){
    return `<div class="loading">
      <div class="spinner"></div>
      <p style="margin-top:14px;">${esc(msg)}</p>
      <p style="color:var(--ink-soft);font-size:13px;margin-top:6px;">AI cần khoảng 1-2 phút để xử lý — đừng thoát trang, cứ để chờ nhé.</p>
      ${state.error?`<div class="error-box">${esc(state.error)}</div><div class="btn-row"><button class="btn" data-action="retry">Thử lại</button></div>`:''}
    </div>`;
  }

  function existingHtml(){
    const r = state.luot1 || {};
    const r2 = state.luot2 || {};
    const cc = r.cau_chuyen_ca_nhan || {};
    const truc = r2.he_truc_noi_dung || null;
    return `
      <div class="page-head" style="text-align:center;">
        <div class="tag">Câu Chuyện Của Bạn</div>
        <h1>Đã có sẵn hồ sơ của bạn</h1>
        <p>Bạn từng hoàn thành phần này rồi — có thể ở Xây Nhân Hiệu hoặc chính app này trước đó. Tư Vấn AI sẽ tự đọc đúng hồ sơ này để tư vấn khách theo đúng giọng, đúng câu chuyện thật của bạn, không cần làm lại.</p>
      </div>
      ${state.confirmMsg?`<div class="hint-box">${esc(state.confirmMsg)}</div>`:''}
      <div class="section highlight">
        <h3>Định vị của bạn</h3>
        <div class="body" style="font-family:'Playfair Display',serif;font-size:17px;font-style:italic;line-height:1.6;">${escBold(breakSentences(r.ket_luan_dinh_vi||''))}</div>
      </div>
      ${truc && truc.truc_chinh ? `
        <div class="section">
          <h3>Trục nội dung chính</h3>
          ${truc.cong_thuc?`<div class="body" style="color:var(--ink-soft);font-style:italic;margin-bottom:10px;">${escBold(truc.cong_thuc)}</div>`:''}
          <div style="padding:12px 14px;background:var(--accent);border-radius:10px;">
            <div style="color:#fff;font-size:15.5px;font-weight:700;">${esc(truc.truc_chinh)}</div>
          </div>
        </div>
      ` : ''}
      ${cc.cau_chuyen ? `<div class="section"><h3>Câu chuyện cá nhân</h3><div class="body">${escBold(breakSentences(cc.cau_chuyen))}</div></div>` : ''}
      ${sectionHtml('Hồ sơ chuyên môn', r.ho_so_chuyen_mon)}
      <div class="btn-row">
        <button class="btn" data-action="use-existing">Dùng hồ sơ này</button>
        <button class="btn-ghost btn" data-action="redo">Làm lại từ đầu</button>
      </div>
    `;
  }

  function introHtml(){
    return `
      <div class="page-head" style="text-align:center;">
        <div class="tag">Câu Chuyện Của Bạn</div>
        <h1>Kể câu chuyện thật của bạn</h1>
        <p>Trả lời thật 16 câu hỏi trong 5 nhóm — mất khoảng 9-11 phút. AI sẽ tổng hợp thành hồ sơ định vị + câu chuyện cá nhân, để Tư Vấn AI luôn tư vấn khách đúng giọng, đúng câu chuyện thật của bạn.</p>
      </div>
      <div class="source-grid">
        ${GROUPS.map((g,i)=>`<div class="source-card"><div class="ic">${i+1}</div><div class="label">${esc(g.title)}</div></div>`).join('')}
      </div>
      ${state.error?`<div class="error-box">${esc(state.error)}</div>`:''}
      <div class="btn-row">
        <button class="btn" data-action="start">Bắt đầu</button>
      </div>
    `;
  }

  function wizardHtml(){
    const q = QUESTIONS[state.qIndex];
    const groupIndex = GROUPS.findIndex(g=>g.key===q.group);
    const val = state.answers[q.id];
    const answered = isAnswered(q, val);

    let inputHtml = '';
    if(q.type==='textarea'){
      inputHtml = `<textarea id="qinput" placeholder="${esc(q.placeholder||'Trả lời thật, càng cụ thể càng tốt...')}">${esc(val||'')}</textarea>`;
    } else if(q.type==='radio'){
      inputHtml = `<div class="chips">${q.options.map(opt=>`<div class="chip ${val===opt?'selected':''}" data-opt="${esc(opt)}">${esc(opt)}</div>`).join('')}</div>`;
    } else if(q.type==='chips'){
      const selectedList = Array.isArray(val && val.chosen) ? val.chosen : [];
      inputHtml = `<div class="chips">${q.options.map(opt=>`<div class="chip ${selectedList.includes(opt)?'selected':''}" data-chip="${esc(opt)}">${esc(opt)}</div>`).join('')}</div>
        ${q.allowOther ? `<textarea id="qinput-other" placeholder="Khác (ghi cụ thể)...">${esc((val&&val.other)||'')}</textarea>` : ''}`;
    }

    return `
      <div style="display:flex;gap:6px;margin-bottom:10px;">
        ${GROUPS.map((g,i)=>`<span style="flex:1;height:5px;border-radius:3px;background:${i<groupIndex?'var(--accent)':i===groupIndex?'var(--gold)':'var(--line)'};"></span>`).join('')}
      </div>
      <div style="display:flex;justify-content:space-between;font-size:12px;color:var(--ink-soft);font-family:'IBM Plex Mono',monospace;margin-bottom:18px;">
        <span>NHÓM ${groupIndex+1}/5 · ${esc(GROUPS[groupIndex].title)}</span>
        <span>Câu ${state.qIndex+1}/${QUESTIONS.length}</span>
      </div>
      <div class="card">
        <div style="font-family:'IBM Plex Mono',monospace;font-size:12px;color:var(--gold);margin-bottom:10px;">CÂU ${state.qIndex+1}</div>
        <h2 style="font-size:21px;line-height:1.4;">${esc(q.q)}</h2>
        ${q.helper?`<div style="margin-top:10px;font-size:13.5px;color:var(--ink-soft);line-height:1.55;">${esc(q.helper)}</div>`:''}
        ${inputHtml}
      </div>
      <div style="display:flex;justify-content:space-between;align-items:center;margin-top:22px;">
        ${state.qIndex>0 ? `<span style="color:var(--ink-soft);font-size:13.5px;cursor:pointer;" data-action="back">← Câu trước</span>` : `<span></span>`}
        <button class="btn" data-action="next" ${answered?'':'disabled'}>${state.qIndex===QUESTIONS.length-1?'Hoàn tất':'Tiếp tục'}</button>
      </div>
    `;
  }

  function resultsHtml(){
    const r = state.luot1 || {};
    const r2 = state.luot2;
    const cc = r.cau_chuyen_ca_nhan || {};
    return `
      <div class="page-head" style="text-align:center;">
        <div class="tag">Câu Chuyện Của Bạn</div>
        <h1>Hồ sơ của bạn đã sẵn sàng</h1>
        <p>Tư Vấn AI sẽ tự dùng hồ sơ này khi tư vấn khách — không cần làm gì thêm.</p>
      </div>
      ${state.saveError?`<div class="error-box" style="margin-bottom:14px;">${esc(state.saveError)}</div>`:''}
      <div class="section highlight">
        <h3>Kết luận định vị</h3>
        <div class="body" style="font-family:'Playfair Display',serif;font-size:18px;font-style:italic;line-height:1.6;">${escBold(breakSentences(r.ket_luan_dinh_vi))}</div>
      </div>
      ${sectionHtml('Tổng quan thương hiệu', r.tong_quan_thuong_hieu)}
      ${sectionHtml('Hồ sơ chuyên môn', r.ho_so_chuyen_mon)}
      ${sectionHtml('Lợi thế cạnh tranh', r.loi_the_canh_tranh)}
      ${cc.cau_chuyen ? `
        <div class="section">
          <h3>Câu chuyện cá nhân</h3>
          <div class="body">${escBold(breakSentences(cc.cau_chuyen))}</div>
          ${cc.qua_so_sai ? `<div class="hint-box" style="margin-top:12px;">Câu trả lời của bạn ở phần biến cố/hành trình còn hơi chung chung — bấm "Làm lại từ đầu" bên dưới và trả lời kỹ hơn nếu muốn câu chuyện sâu, cụ thể hơn.</div>` : ''}
        </div>
      ` : ''}
      ${r2 ? `
        ${sectionHtml('Chân dung khách hàng', r2.chan_dung_khach_hang)}
        <div class="section highlight"><h3>Insight cốt lõi</h3><div class="body">${escBold(r2.insight_cot_loi)}</div></div>
        ${r2.he_truc_noi_dung ? `
          <div class="section">
            <h3>Hệ trục nội dung</h3>
            ${r2.he_truc_noi_dung.cong_thuc?`<div class="body" style="margin-bottom:14px;color:var(--ink-soft);font-style:italic;">${escBold(r2.he_truc_noi_dung.cong_thuc)}</div>`:''}
            <div style="padding:14px 16px;background:var(--accent);border-radius:10px;">
              <div style="font-size:11px;font-weight:700;color:#DCEAE4;text-transform:uppercase;letter-spacing:.05em;margin-bottom:4px;">Trục chính</div>
              <div style="color:#fff;font-size:16px;font-weight:700;">${esc(r2.he_truc_noi_dung.truc_chinh)}</div>
            </div>
          </div>
        ` : ''}
      ` : state.luot2Loading ? `
        <div class="section" style="text-align:center;color:var(--ink-soft);">
          <div class="spinner" style="margin-bottom:10px;"></div>
          Đang phân tích thêm chân dung khách hàng &amp; hệ trục nội dung…
        </div>
      ` : state.luot2Error ? `
        <div class="section" style="text-align:center;">
          <div class="error-box" style="margin-bottom:12px;">${esc(state.luot2Error)}</div>
          <button class="btn" data-action="get-luot2">Thử phân tích lại</button>
        </div>
      ` : ''}
      <div class="btn-row">
        <button class="btn-ghost btn" data-action="redo">Làm lại từ đầu</button>
        <button class="btn" data-action="done">Xong, về Trang chủ</button>
      </div>
    `;
  }

  function bind(){
    const q = QUESTIONS[state.qIndex];

    const startBtn = container.querySelector('[data-action="start"]');
    if(startBtn) startBtn.onclick = ()=>{ state.qIndex = 0; state.screen='wizard'; draw(); };

    const useExistingBtn = container.querySelector('[data-action="use-existing"]');
    if(useExistingBtn) useExistingBtn.onclick = ()=>{
      state.confirmMsg = 'Đã dùng hồ sơ này ✓ — Tư Vấn AI sẽ tự tham khảo câu chuyện thật của bạn.';
      draw();
      setTimeout(()=>{ state.confirmMsg=''; const el = container.querySelector('.hint-box'); if(el) el.remove(); }, 2600);
    };

    const redoBtn = container.querySelector('[data-action="redo"]');
    if(redoBtn) redoBtn.onclick = async ()=>{
      const ok = await confirmModal('Làm lại từ đầu sẽ ghi đè hồ sơ đã lưu (hồ sơ này dùng chung với Xây Nhân Hiệu, nếu bạn có dùng cả 2 app). Câu trả lời cũ vẫn được điền sẵn để sửa, không mất hết. Tiếp tục?', 'Làm lại');
      if(!ok) return;
      state.qIndex = 0; state.error = null; state.screen='wizard'; draw();
    };

    const backLink = container.querySelector('[data-action="back"]');
    if(backLink) backLink.onclick = ()=>{ state.qIndex = Math.max(0, state.qIndex-1); draw(); persistWizardDraft(); };

    const nextBtn = container.querySelector('[data-action="next"]');
    if(nextBtn) nextBtn.onclick = onNext;

    const retryBtn = container.querySelector('[data-action="retry"]');
    if(retryBtn) retryBtn.onclick = ()=>{ state.error=null; state.screen='saving1'; draw(); runLuot1(); };

    const luot2Btn = container.querySelector('[data-action="get-luot2"]');
    if(luot2Btn) luot2Btn.onclick = runLuot2;

    const doneBtn = container.querySelector('[data-action="done"]');
    if(doneBtn) doneBtn.onclick = ()=>{ location.hash = 'trang-chu'; };

    const qinput = container.querySelector('#qinput');
    if(qinput) qinput.oninput = ()=>{ state.answers[q.id] = qinput.value; updateNextEnabled(); };

    const qinputOther = container.querySelector('#qinput-other');
    if(qinputOther) qinputOther.oninput = ()=>{
      const cur = state.answers[q.id] || {chosen:[], other:''};
      cur.other = qinputOther.value; state.answers[q.id] = cur; updateNextEnabled();
    };

    if(q && q.type==='radio'){
      container.querySelectorAll('[data-opt]').forEach(el=>{
        el.onclick = ()=>{ state.answers[q.id] = el.getAttribute('data-opt'); draw(); persistWizardDraft(); };
      });
    }
    if(q && q.type==='chips'){
      container.querySelectorAll('[data-chip]').forEach(el=>{
        el.onclick = ()=>{
          const opt = el.getAttribute('data-chip');
          // Phòng hờ 1 shape lạ khác (string thay vì object) lọt qua đâu đó — normalizeAnswers() đã
          // xử lý ở mọi điểm nạp answers từ ngoài vào, nhưng thà tự vá còn hơn ném lỗi JS làm kẹt nút
          // "Tiếp tục" (đúng bug từng gặp bên dinh-vi.js, 2026-08-20).
          const curRaw = state.answers[q.id];
          const cur = (curRaw && typeof curRaw==='object' && Array.isArray(curRaw.chosen)) ? curRaw : {chosen:[], other:''};
          const idx = cur.chosen.indexOf(opt);
          if(q.multi){ if(idx>=0) cur.chosen.splice(idx,1); else cur.chosen.push(opt); }
          else { cur.chosen = idx>=0 ? [] : [opt]; }
          state.answers[q.id] = cur; draw(); persistWizardDraft();
        };
      });
    }
  }

  function updateNextEnabled(){
    const nextBtn = container.querySelector('[data-action="next"]');
    if(!nextBtn) return;
    nextBtn.disabled = !isAnswered(QUESTIONS[state.qIndex], state.answers[QUESTIONS[state.qIndex].id]);
  }

  function onNext(){
    if(state.qIndex < QUESTIONS.length-1){ state.qIndex++; draw(); persistWizardDraft(); }
    else { state.screen='saving1'; state.error=null; draw(); runLuot1(); }
  }

  function flattenAnswers(){
    const out = {};
    QUESTIONS.forEach(q=>{
      const val = state.answers[q.id];
      if(q.type==='chips'){
        const chosen = (val && val.chosen) || [];
        const other = (val && val.other) || '';
        out[q.id] = [...chosen, other].filter(Boolean).join(', ');
      } else out[q.id] = val || '';
    });
    return out;
  }

  async function persist(fields){
    const payload = { user_id: ctx.user.id, answers: flattenAnswers(), ...fields, updated_at: new Date().toISOString() };
    const { error } = await ctx.supabase.from('positioning_results').upsert(payload, { onConflict:'user_id' });
    if(error) throw error;
  }

  async function runLuot1(){
    try{
      const data = await callApi('/api/dinh-vi', { luot:1, answers: flattenAnswers() }, 280000);
      state.luot1 = data.result;
      await persist({ luot1: data.result, luot2: null });
      await clearModuleDraft(ctx, WIZARD_DRAFT_KEY);
      state.error = null;
      state.screen = 'results';
      draw();
      runLuot2(); // chạy tiếp Lượt 2 ngầm — hiện Lượt 1 trước, Lượt 2 tự điền thêm vào cùng trang khi xong
    } catch(e){
      state.error = e.message;
      draw();
    }
  }

  async function runLuot2(){
    state.luot2Loading = true; state.luot2Error = null; draw();
    try{
      const data = await callApi('/api/dinh-vi', { luot:2, answers: flattenAnswers(), luot1: state.luot1 }, 280000);
      state.luot2 = data.result;
      await persist({ luot1: state.luot1, luot2: data.result });
      state.luot2Error = null;
    } catch(e){ state.luot2Error = e.message; }
    state.luot2Loading = false;
    state.screen = 'results';
    draw();
  }

  boot();
}

window.Modules = window.Modules || {};
window.Modules['cau-chuyen'] = { title:'Câu Chuyện Của Bạn', render };
})();
