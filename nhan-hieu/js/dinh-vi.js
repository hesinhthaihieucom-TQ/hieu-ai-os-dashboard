(function(){
const QUESTIONS = [
  {id:'a1', group:'A', type:'textarea', q:'Hiện tại bạn đang làm công việc/lĩnh vực gì? Đã làm bao lâu? Việc gì bạn giỏi nhất, việc gì đang thấy kẹt?', placeholder:'Ví dụ: Mình làm coach tài chính cá nhân được 3 năm, giỏi phần lên kế hoạch dòng tiền, còn kẹt ở phần marketing bản thân...'},
  {id:'a2', group:'A', type:'textarea', q:'Bạn muốn xây dựng thương hiệu cá nhân để làm gì, và có sản phẩm/dịch vụ/khoá học nào muốn dẫn người xem về không?', placeholder:'Nếu chưa có sản phẩm, ghi "chưa có"'},
  {id:'a3', group:'A', type:'chips', multi:false, allowOther:true, q:'Vấn đề bạn đang gặp phải là gì?', options:['Chưa có kênh','Không rõ mình là ai','Đăng lung tung, không nhất quán','Không biết bắt đầu từ đâu']},
  {id:'b1', group:'B', type:'textarea', q:'Bạn từng trải qua biến cố hoặc hành trình nào để lại bài học sâu sắc? Câu chuyện đó có thể trở thành "linh hồn" cho kênh của bạn không?', helper:'Nếu là chuyện nhạy cảm (bệnh nặng, trầm cảm, mất mát...), mình sẽ giúp bạn kể lại có trách nhiệm — không câu view, không hù doạ.'},
  {id:'b2', group:'B', type:'textarea', q:'Người khác thường tìm đến bạn để hỏi về điều gì, khen bạn nhiều nhất về điều gì, hoặc chủ đề nào bạn có thể nói rất lâu mà không hết ý?'},
  {id:'b3', group:'B', type:'textarea', q:'Bạn thích làm việc gì đến mức không thấy mệt? Và không thích làm gì / việc gì khiến bạn dễ tụt năng lượng?'},
  {id:'b4', group:'B', type:'textarea', q:'Bạn từng tự ti hoặc bị chê về điều gì?'},
  {id:'b5', group:'B', type:'chips', multi:false, allowOther:true, q:'Bạn muốn giúp nhóm người nào?', options:['Mệt - kẹt - gồng','Kiếm tiền tốt hơn','Khoẻ - đẹp','Xây nhân hiệu','Kinh doanh','Chữa lành']},
  {id:'c1', group:'C', type:'radio', q:'Bạn có thoải mái xuất hiện trước camera không?', options:['Rất thoải mái','Hơi ngại nhưng có thể tập','Không muốn lộ mặt','Chỉ muốn dùng giọng nói','Kết hợp tuỳ lúc']},
  {id:'c2', group:'C', type:'radio', q:'Năng lượng tự nhiên của bạn thiên về hướng nào?', options:['Sâu / chữa lành','Mạnh / động lực','Vui / gần gũi','Sang / chuyên gia','Từng trải','Hài hước','Bình an / tâm linh']},
  {id:'c3', group:'C', type:'chips', multi:true, q:'Bạn muốn người xem cảm nhận gì khi xem nội dung của bạn?', options:['Tin tưởng','Chữa lành','Động lực','Chuyên gia','Gần gũi','Kết quả thật','Chiều sâu']},
  {id:'c4', group:'C', type:'textarea', q:'Chất liệu hình ảnh nào bạn có thể quay dễ dàng mỗi ngày?', helper:'Ví dụ: nơi làm việc, sản phẩm, khách hàng, thiên nhiên quanh bạn...'},
  {id:'d1', group:'D', type:'textarea', q:'Bạn biết ai đang làm nội dung trong lĩnh vực tương tự? Họ đang làm tốt điều gì, và bạn khác họ ở điểm nào?'},
  {id:'d2', group:'D', type:'textarea', q:'Nếu chỉ có 10 giây để người lạ nhớ bạn là ai, bạn sẽ nói gì?'},
  {id:'d3', group:'D', type:'textarea', q:'Điều bạn tin sâu sắc nhất về lĩnh vực mình làm — điều không phải ai cũng đồng ý?'},
  {id:'e1', group:'E', type:'textarea', q:'Mỗi ngày bạn làm gì nhiều nhất trong công việc? Có đồ vật hoặc không gian nào luôn xuất hiện cùng bạn không?', helper:'Ví dụ: gặp khách/dạy học/tư vấn ở bàn làm việc, với laptop/sổ tay/công cụ nghề luôn bên cạnh...'},
  {id:'e2', group:'E', type:'textarea', q:'Bạn có phong cách ăn mặc / xuất hiện nhất quán không?', helper:'Ví dụ: màu hay mặc, kiểu tóc, phụ kiện đặc trưng, formal hay casual...'},
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

function render(container, ctx){
  const state = { screen:'loading', qIndex:0, answers:{}, luot1:null, luot2:null, error:null, savedId:null,
    luot2Loading:false, luot2Error:null,
    suggestLoading:false, suggestions:null, suggestError:null, suggestForQ:null,
    pasteText:'', pasteError:null, pasteLoading:false,
    channelHandle:'', channelSaving:false, channelSaved:false,
    assets:[], newAsset:{ label:'', url:'', kind:'san_pham_so' }, newGroup:{ label:'', url:'' },
    editingAssetId:null, editAsset:{ label:'', url:'', kind:'san_pham_so' },
    brands:[], newBrandName:'', editingBrandId:null, editBrandName:'', saveError:null,
    editingTruc:false, editTrucChinh:'', editTruPhu:[], editTrucSaving:false, editTrucError:null,
    reconstructingAnswers:false, reconstructFailed:false };
  let stopHeavyProgress = null; // dừng vòng tròn % + nhả wake lock khi tác vụ AI nặng xong (thành công hoặc lỗi)
  const ASSET_KINDS = {
    san_pham_so: 'Sản phẩm số của tôi', khoa_hoc: 'Khoá học của tôi', aff_nguoi_khac: 'Aff sản phẩm người khác',
    aff_cua_toi: 'Aff của tôi', cong_dong: 'Link cộng đồng', khac: 'Khác',
  };

  function communityAssets(){ return state.assets.filter(a=>a.kind==='cong_dong'); }
  function promoAssets(){ return state.assets.filter(a=>a.kind!=='cong_dong'); }

  function assetRowHtml(a){
    if(state.editingAssetId===a.id){
      return `
        <div style="padding:10px 0;border-bottom:1px solid var(--line);display:flex;flex-direction:column;gap:8px;">
          <textarea id="ea-label" style="min-height:auto;height:40px;">${esc(state.editAsset.label)}</textarea>
          <textarea id="ea-url" style="min-height:auto;height:40px;" placeholder="Link (không bắt buộc)">${esc(state.editAsset.url)}</textarea>
          ${a.kind!=='cong_dong' ? `<select id="ea-kind">
            ${Object.entries(ASSET_KINDS).filter(([k])=>k!=='cong_dong').map(([k,v])=>`<option value="${k}" ${state.editAsset.kind===k?'selected':''}>${esc(v)}</option>`).join('')}
          </select>` : ''}
          <div class="btn-row" style="justify-content:flex-start;">
            <button class="btn btn-sm" data-action="save-edit-asset">Lưu</button>
            <span class="btn-ghost btn btn-sm" data-action="cancel-edit-asset">Huỷ</span>
          </div>
        </div>
      `;
    }
    return `
      <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid var(--line);font-size:13.5px;">
        <div><b>${esc(a.label)}</b>${a.kind!=='cong_dong'?` <span style="color:var(--ink-soft);">(${esc(ASSET_KINDS[a.kind]||a.kind||'')})</span>`:''}${a.url?`<br><span style="color:var(--ink-soft);font-size:12px;">${esc(a.url)}</span>`:''}</div>
        <div style="display:flex;gap:12px;">
          <span style="color:var(--accent);cursor:pointer;font-size:12px;" data-edit-asset="${a.id}">Sửa</span>
          <span style="color:var(--danger);cursor:pointer;font-size:12px;" data-del-asset="${a.id}">Xoá</span>
        </div>
      </div>
    `;
  }

  function draw(){ container.innerHTML = screenHtml(); bind(); }

  async function boot(){
    draw();
    state.channelHandle = (ctx.profile && ctx.profile.channel_handle) || '';
    await Promise.all([loadAssets(), loadBrands()]);
    const { data, error } = await ctx.supabase.from('positioning_results').select('*').eq('user_id', ctx.user.id).maybeSingle();
    if(error){ state.error = error.message; state.screen='intro'; draw(); return; }
    const isComplete = data && data.luot1 && data.luot1.ket_luan_dinh_vi;
    if(data){
      state.savedId = data.id;
      state.answers = data.answers || {};
      state.luot1 = isComplete ? data.luot1 : null;
      state.luot2 = isComplete ? data.luot2 : null;
      state.screen = isComplete ? 'done' : 'intro';
    } else {
      state.screen = 'intro';
    }
    draw();
  }

  function screenHtml(){
    if(state.screen==='loading') return loadingHtml('Đang tải…');
    if(state.screen==='intro') return introHtml();
    if(state.screen==='paste') return pasteHtml();
    if(state.screen==='wizard') return wizardHtml();
    if(state.screen==='saving1') return loadingHtml('Đang phân tích định vị của bạn…', true);
    if(state.screen==='parsing') return loadingHtml('Đang đọc kết quả bạn dán vào…', true);
    if(state.screen==='results') return resultsHtml();
    if(state.screen==='done') return doneHtml();
    return '';
  }

  function doneHtml(){
    return `
      <div class="page-head" style="text-align:center;">
        <div class="tag">Định Vị</div>
        <h1>Bạn đã hoàn thành Định Vị! 🎉</h1>
        <p>Kết quả đã lưu và đang được dùng cho toàn bộ các bước khác (Sửa Kênh, Viết Content, Lịch Đăng...).</p>
      </div>
      <div class="btn-row" style="justify-content:center;align-items:center;margin-top:14px;">
        <button class="btn" data-action="view-results">Xem kết quả →</button>
        <button class="btn-ghost btn" data-action="redo-from-done" ${state.reconstructingAnswers?'disabled':''}>${state.reconstructingAnswers?'Đang khôi phục câu trả lời…':'Sửa lại câu trả lời'}</button>
        ${!state.reconstructingAnswers?`<span style="font-size:11px;color:var(--ink-soft);">(tốn 5 lượt AI)</span>`:''}
      </div>
      ${state.error?`<div class="error-box" style="margin-top:14px;">${esc(state.error)}</div>`:''}
      <div style="text-align:center;margin-top:18px;">
        <span style="color:var(--ink-soft);font-size:13.5px;cursor:pointer;text-decoration:underline;" data-action="go-paste">Có bản kết quả Định Vị khác muốn dùng thay? Dán vào đây thay vì trả lời lại 18 câu →</span>
      </div>
    `;
  }

  function loadingHtml(msg, showWaitHint){
    return `<div class="loading">
      ${state.error ? '' : (showWaitHint ? `<div id="progress-bar-el">${progressBarHtml(0)}</div>` : `<div class="spinner"></div>`)}
      <p style="margin-top:14px;">${esc(msg)}</p>
      ${showWaitHint?`<p style="color:var(--ink-soft);font-size:13px;margin-top:6px;">AI cần khoảng 1-2 phút để xử lý — đừng thoát trang, cứ để chờ nhé.</p>`:''}
      ${state.error?`<div class="error-box">${esc(state.error)}</div><div class="btn-row"><button class="btn" data-action="retry">Thử lại</button></div>`:''}
    </div>`;
  }

  // Gọi ngay sau draw() vừa hiện màn hình chờ (showWaitHint=true) — bắt đầu vòng tròn % + giữ màn
  // hình không tự khoá. Luôn gọi stopHeavyProgress() (2 lần gọi cũng an toàn) khi tác vụ xong.
  function startHeavyProgress(estimatedSeconds){
    if(stopHeavyProgress) stopHeavyProgress();
    const el = container.querySelector('#progress-bar-el');
    const stopRing = animateProgressBar(el, estimatedSeconds);
    acquireWakeLock();
    stopHeavyProgress = ()=>{ stopRing(); releaseWakeLock(); stopHeavyProgress = null; };
  }

  function introHtml(){
    const hasSaved = !!state.luot1;
    return `
      <div class="page-head" style="text-align:center;">
        <div class="tag">Bước 1 · Định Vị</div>
        <h1>Tìm ra định vị thương hiệu chuẩn nhất</h1>
        <p>Trả lời thật 18 câu hỏi trong 5 nhóm — mất khoảng 10-12 phút. AI sẽ phân tích và trả về bản định vị đầy đủ, dùng được ngay.</p>
        <p style="color:var(--accent);font-size:13.5px;font-weight:600;margin-top:6px;">💡 Nên trả lời kỹ, thật ngay từ đầu — mỗi lần bấm "Sửa lại câu trả lời" để làm lại sẽ tính thêm 5 lượt AI trong số lượt dùng thử của bạn.</p>
      </div>
      <div class="source-grid">
        ${GROUPS.map((g,i)=>`<div class="source-card"><div class="ic">${i+1}</div><div class="label">${esc(g.title)}</div></div>`).join('')}
      </div>
      <div class="btn-row" style="align-items:center;">
        <button class="btn" data-action="start" ${state.reconstructingAnswers?'disabled':''}>${state.reconstructingAnswers?'Đang khôi phục câu trả lời…':(hasSaved?'Sửa lại câu trả lời':'Bắt đầu')}</button>
        ${!state.reconstructingAnswers?`<span style="font-size:11px;color:var(--ink-soft);">(tốn 5 lượt AI)</span>`:''}
        ${hasSaved?`<button class="btn-ghost btn" data-action="view-saved">Xem định vị đã lưu</button>`:''}
      </div>
      <div style="text-align:center;margin-top:18px;">
        <span style="color:var(--ink-soft);font-size:13.5px;cursor:pointer;text-decoration:underline;" data-action="go-paste">Đã có kết quả Định Vị rồi? Dán vào đây thay vì làm lại →</span>
      </div>
    `;
  }

  function pasteHtml(){
    return `
      <div class="page-head" style="text-align:center;">
        <div class="tag">Dán kết quả có sẵn</div>
        <h1>Dán kết quả Định Vị bạn đã làm trước đây</h1>
        <p>Copy toàn bộ kết quả từ trợ lý ĐỊNH VỊ AI (ChatGPT) bạn đã dùng trước đây — Lượt 1, hoặc cả Lượt 1 + Lượt 2 — dán nguyên văn vào ô bên dưới. AI sẽ tự sắp xếp lại đúng cấu trúc, không cần làm lại 18 câu hỏi.</p>
      </div>
      <div class="card">
        <textarea id="paste-input" style="min-height:260px;" placeholder="Dán nguyên văn kết quả định vị vào đây...">${esc(state.pasteText)}</textarea>
        <div class="btn-row">
          <button class="btn" data-action="submit-paste" ${state.pasteLoading?'disabled':''}>${state.pasteLoading?'Đang xử lý…':'Xử lý kết quả đã dán'}</button> <span style="font-size:11px;color:var(--ink-soft);align-self:center;">(tốn 6 lượt AI)</span>
          <button class="btn-ghost btn" data-action="back-to-intro">← Quay lại</button>
        </div>
        ${state.pasteError?`<div class="error-box">${esc(state.pasteError)}</div>`:''}
      </div>
    `;
  }

  function wizardHtml(){
    const q = QUESTIONS[state.qIndex];
    const groupIndex = GROUPS.findIndex(g=>g.key===q.group);
    const val = state.answers[q.id];
    const answered = isAnswered(q, val);

    let inputHtml = '';
    let suggestHtml = '';
    if(q.type==='textarea'){
      inputHtml = `<textarea id="qinput" placeholder="${esc(q.placeholder||'Trả lời thật, càng cụ thể càng tốt...')}">${esc(val||'')}</textarea>
        <div style="margin-top:10px;">
          <span style="color:var(--accent);font-size:13px;cursor:pointer;font-weight:600;" data-action="suggest">${state.suggestLoading?'Đang nghĩ ví dụ…':'💡 Gợi ý câu trả lời cụ thể'}</span>
        </div>`;
      if(state.suggestForQ===state.qIndex){
        if(state.suggestError){
          suggestHtml = `<div class="error-box">${esc(state.suggestError)}</div>`;
        } else if(state.suggestions){
          suggestHtml = `<div style="margin-top:14px;display:flex;flex-direction:column;gap:10px;">
            ${state.suggestions.map((s,i)=>`
              <div style="border:1px solid var(--line);border-radius:10px;padding:14px 16px;background:var(--accent-soft);">
                <div style="font-size:13.5px;line-height:1.6;color:var(--ink);">${esc(s)}</div>
                <span style="display:inline-block;margin-top:8px;color:var(--accent);font-size:12.5px;font-weight:600;cursor:pointer;" data-use-suggestion="${i}">Dùng làm gợi ý →</span>
              </div>
            `).join('')}
          </div>`;
        }
      }
    } else if(q.type==='radio'){
      inputHtml = `<div class="chips">${q.options.map(opt=>`<div class="chip ${val===opt?'selected':''}" data-opt="${esc(opt)}">${esc(opt)}</div>`).join('')}</div>`;
    } else if(q.type==='chips'){
      const selectedList = Array.isArray(val && val.chosen) ? val.chosen : [];
      inputHtml = `<div class="chips">${q.options.map(opt=>`<div class="chip ${selectedList.includes(opt)?'selected':''}" data-chip="${esc(opt)}">${esc(opt)}</div>`).join('')}</div>
        ${q.allowOther ? `<textarea id="qinput-other" placeholder="Khác (ghi cụ thể)...">${esc((val&&val.other)||'')}</textarea>` : ''}`;
    }

    return `
      <div class="progress-groups" style="display:flex;gap:6px;margin-bottom:10px;">
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
        ${suggestHtml}
      </div>
      <div class="nav-row" style="display:flex;justify-content:space-between;align-items:center;margin-top:22px;">
        ${state.qIndex>0 ? `<span style="color:var(--ink-soft);font-size:13.5px;cursor:pointer;" data-action="back">← Câu trước</span>` : `<span></span>`}
        <button class="btn" data-action="next" ${answered?'':'disabled'}>${state.qIndex===QUESTIONS.length-1?'Xem kết quả':'Tiếp tục'}</button>${state.qIndex===QUESTIONS.length-1?' <span style="font-size:11px;color:var(--ink-soft);">(tốn 5 lượt AI)</span>':''}
      </div>
    `;
  }

  // breakSentences() luôn được áp cho mọi thân đoạn dài — không phụ thuộc việc AI có tự chèn \n\n hay không,
  // vì thực tế AI không chèn xuống dòng đều đặn dù đã yêu cầu trong schema.
  function sectionHtml(title, body){
    if(!body || !String(body).trim()) return '';
    return `<div class="section"><h3>${esc(title)}</h3><div class="body">${escBold(breakSentences(body))}</div></div>`;
  }

  // Danh sách (mảng chuỗi) — bỏ qua hẳn cả section nếu mảng rỗng, thay vì hiện tiêu đề với danh sách trống.
  function listSectionHtml(title, items, highlight){
    const list = (items||[]).filter(x=>x && String(x).trim());
    if(list.length===0) return '';
    return `<div class="section${highlight?' highlight':''}"><h3>${esc(title)}</h3><ul>${list.map(x=>`<li>${escBold(x)}</li>`).join('')}</ul></div>`;
  }

  // Ghép các cặp nhãn/giá trị, bỏ qua cặp nào rỗng — dùng cho các section gồm nhiều dòng con.
  function pairsBodyHtml(pairs){
    return pairs.filter(([,v])=>v && String(v).trim()).map(([label,v])=>`<b>${esc(label)}:</b> ${escBold(v)}`).join('<br>');
  }

  function resultsHtml(){
    const r = state.luot1;
    const r2 = state.luot2;
    return `
      <div class="page-head" style="text-align:center;">
        <div class="tag">Định Vị</div>
        <h1>Định vị thương hiệu của bạn</h1>
      </div>
      ${state.saveError?`<div class="error-box" style="margin-bottom:14px;">${esc(state.saveError)}</div>`:''}
      <div class="card">
        <label style="display:block;font-size:13px;font-weight:600;color:var(--ink-soft);margin-bottom:6px;">Tên kênh Facebook/TikTok</label>
        <div style="font-size:12.5px;color:var(--ink-soft);margin-bottom:8px;">Lưu 1 lần ở đây — Viết Content sẽ tự lấy tên kênh này để ghép hashtag, khỏi phải nhập lại mỗi bài.</div>
        <div style="display:flex;gap:10px;flex-wrap:wrap;">
          <textarea id="channel-handle-input" style="min-height:auto;height:40px;flex:1;min-width:200px;" placeholder="Ví dụ: Tú Quỳnh">${esc(state.channelHandle)}</textarea>
          <button class="btn btn-sm" data-action="save-channel-handle" ${state.channelSaving?'disabled':''}>${state.channelSaving?'Đang lưu…':'Lưu'}</button>
        </div>
        ${state.channelSaved?`<div style="margin-top:8px;font-size:12.5px;color:var(--accent);">Đã lưu ✓</div>`:''}
      </div>
      <div class="card" style="margin-top:14px;">
        <h3 style="margin-bottom:6px;">Thương hiệu</h3>
        <div style="font-size:12.5px;color:var(--ink-soft);margin-bottom:10px;">Nếu bạn có nhiều thương hiệu khác tên kênh (ví dụ: Hiểu Hạnh, Hiểu Mạnh, Hiểu Kênh tuỳ content) — thêm hết ở đây, mỗi bài Viết Content sẽ cho chọn dùng đúng thương hiệu nào.</div>
        ${state.brands.length===0?`<div style="color:var(--ink-soft);font-size:13.5px;margin-bottom:10px;">Chưa có thương hiệu nào.</div>`:''}
        ${state.brands.map(b=>{
          if(state.editingBrandId===b.id){
            return `
              <div style="padding:8px 0;border-bottom:1px solid var(--line);display:flex;gap:8px;flex-wrap:wrap;align-items:center;">
                <textarea id="eb-name" style="min-height:auto;height:40px;flex:1;min-width:160px;">${esc(state.editBrandName)}</textarea>
                <button class="btn btn-sm" data-action="save-edit-brand">Lưu</button>
                <span class="btn-ghost btn btn-sm" data-action="cancel-edit-brand">Huỷ</span>
              </div>
            `;
          }
          return `
          <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid var(--line);font-size:13.5px;">
            <b>${esc(b.name)}</b>
            <div style="display:flex;gap:12px;">
              <span style="color:var(--accent);cursor:pointer;font-size:12px;" data-edit-brand="${b.id}">Sửa</span>
              <span style="color:var(--danger);cursor:pointer;font-size:12px;" data-del-brand="${b.id}">Xoá</span>
            </div>
          </div>
        `;
        }).join('')}
        <div style="margin-top:12px;display:flex;gap:10px;flex-wrap:wrap;">
          <textarea id="new-brand-input" style="min-height:auto;height:40px;flex:1;min-width:200px;" placeholder="Ví dụ: Hiểu Hạnh">${esc(state.newBrandName)}</textarea>
          <button class="btn btn-sm" data-action="add-brand">Thêm thương hiệu</button>
        </div>
      </div>
      <div class="card" style="margin-top:14px;">
        <h3 style="margin-bottom:6px;">Cộng đồng / Group</h3>
        <div style="font-size:12.5px;color:var(--ink-soft);margin-bottom:10px;">Group/cộng đồng riêng (Facebook, Zalo, Telegram...) — lưu 1 lần ở đây kèm link đầy đủ, để Viết Content/Đẩy Bài tự gợi ý mời đúng người vào đúng group.</div>
        ${communityAssets().length===0?`<div style="color:var(--ink-soft);font-size:13.5px;margin-bottom:10px;">Chưa có cộng đồng/group nào.</div>`:''}
        ${communityAssets().map(a=>assetRowHtml(a)).join('')}
        <div style="margin-top:14px;display:flex;flex-direction:column;gap:8px;">
          <textarea id="ng-label" style="min-height:auto;height:40px;" placeholder="Tên group, ví dụ: Cộng Đồng Tâm Thức Thịnh Vượng">${esc(state.newGroup.label)}</textarea>
          <textarea id="ng-url" style="min-height:auto;height:40px;" placeholder="Link group">${esc(state.newGroup.url)}</textarea>
          <div class="btn-row" style="margin-top:2px;"><button class="btn btn-sm" data-action="add-group">Thêm group</button></div>
        </div>
      </div>
      <div class="card" style="margin-top:14px;">
        <h3 style="margin-bottom:10px;">Tài sản quảng bá</h3>
        <div style="font-size:12.5px;color:var(--ink-soft);margin-bottom:10px;">Sản phẩm số, khoá học, link aff — lưu 1 lần ở đây, dùng lại ở Viết Content và Đẩy Bài &amp; CTA Comment.</div>
        ${promoAssets().length===0?`<div style="color:var(--ink-soft);font-size:13.5px;margin-bottom:10px;">Chưa có tài sản nào.</div>`:''}
        ${promoAssets().map(a=>assetRowHtml(a)).join('')}
        <div style="margin-top:14px;display:flex;flex-direction:column;gap:8px;">
          <textarea id="na-label" style="min-height:auto;height:40px;" placeholder="Tên tài sản, ví dụ: Khoá học Sổ Dòng Tiền">${esc(state.newAsset.label)}</textarea>
          <textarea id="na-url" style="min-height:auto;height:40px;" placeholder="Link (không bắt buộc)">${esc(state.newAsset.url)}</textarea>
          <select id="na-kind">
            ${Object.entries(ASSET_KINDS).filter(([k])=>k!=='cong_dong').map(([k,v])=>`<option value="${k}" ${state.newAsset.kind===k?'selected':''}>${esc(v)}</option>`).join('')}
          </select>
          <div class="btn-row" style="margin-top:2px;"><button class="btn btn-sm" data-action="add-asset">Thêm tài sản</button></div>
        </div>
      </div>
      <div class="section highlight"><h3>Kết luận định vị</h3><div class="body" style="font-family:'Playfair Display',serif;font-size:18px;font-style:italic;line-height:1.6;">${escBold(breakSentences(r.ket_luan_dinh_vi))}</div></div>
      ${sectionHtml('Tổng quan thương hiệu', r.tong_quan_thuong_hieu)}
      ${sectionHtml('Hồ sơ chuyên môn', r.ho_so_chuyen_mon)}
      ${sectionHtml('Lợi thế cạnh tranh', r.loi_the_canh_tranh)}
      ${sectionHtml('Hình ảnh nên xây', r.hinh_anh_nen_xay)}
      ${sectionHtml('Bản sắc & Triết lý thương hiệu', r.ban_sac_triet_ly_thuong_hieu)}
      ${sectionHtml('Giọng điệu & ngôn ngữ', r.giong_dieu_ngon_ngu)}
      ${sectionHtml('Không theo đuổi', r.khong_theo_duoi)}
      ${(()=>{
        const cc = r.cau_chuyen_ca_nhan;
        if(!cc || !cc.cau_chuyen) return '';
        return `<div class="section"><h3>Câu chuyện cá nhân</h3><div class="body">${escBold(breakSentences(cc.cau_chuyen))}</div>
          ${cc.qua_so_sai && (cc.cau_hoi_lam_ro||[]).length ? `
            <div class="hint-box" style="margin-top:12px;">Câu trả lời của bạn ở phần biến cố/hành trình còn hơi chung chung — trả lời thêm mấy câu này rồi làm lại Định Vị để câu chuyện cụ thể hơn:
              <ul style="margin-top:8px;">${cc.cau_hoi_lam_ro.map(q=>`<li>${esc(q)}</li>`).join('')}</ul>
            </div>
          ` : ''}
        </div>`;
      })()}
      ${(()=>{
        const d = r.dau_an_hinh_anh || {};
        const body = pairsBodyHtml([
          ['Hành động đặc trưng', d.hanh_dong_dac_trung], ['Đồ vật/prop', d.do_vat_prop],
          ['Không gian', d.khong_gian_signature], ['Phong cách', d.phong_cach_xuat_hien], ['Góc quay POV', d.goc_quay_pov],
        ]);
        const canh = (d.canh_mo_dau||[]).filter(Boolean);
        if(!body && canh.length===0) return '';
        return `<div class="section"><h3>Dấu ấn hình ảnh thương hiệu</h3>
          ${body?`<div class="body">${body}</div>`:''}
          ${canh.length?`<ul>${canh.map(c=>`<li>${esc(c)}</li>`).join('')}</ul>`:''}
        </div>`;
      })()}
      ${r2 ? `
        <div style="text-align:center;margin:34px 0 18px;">
          <div class="tag">Chiến Lược &amp; Dòng Tiền</div>
        </div>
        ${sectionHtml('Chân dung khách hàng', r2.chan_dung_khach_hang)}
        ${(()=>{
          const n = r2.noi_dau_rao_can || {};
          const body = pairsBodyHtml([
            ['Bề mặt', n.be_mat], ['Sâu bên trong', n.sau_ben_trong], ['Nỗi sợ', n.noi_so], ['Rào cản', n.rao_can_chua_hanh_dong],
          ]);
          return body ? `<div class="section"><h3>Nỗi đau & rào cản (4 tầng)</h3><div class="body">${body}</div></div>` : '';
        })()}
        ${sectionHtml('Khao khát & mục tiêu', r2.khao_khat_muc_tieu)}
        <div class="section highlight"><h3>Insight cốt lõi</h3><div class="body">${escBold(r2.insight_cot_loi)}</div></div>
        <div class="section">
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <h3 style="margin-bottom:0;">Hệ trục nội dung</h3>
            ${!state.editingTruc ? `<span style="font-size:12px;color:var(--accent);cursor:pointer;font-weight:600;" data-action="edit-truc">✏️ Không hài lòng? Tự sửa</span>` : ''}
          </div>
          ${state.editingTruc ? `
            <div style="margin-top:14px;">
              <label style="display:block;font-size:12.5px;font-weight:600;color:var(--ink-soft);margin-bottom:4px;">Trục chính</label>
              <textarea id="edit-truc-chinh" style="min-height:auto;height:44px;">${esc(state.editTrucChinh)}</textarea>
              <label style="display:block;font-size:12.5px;font-weight:600;color:var(--ink-soft);margin:14px 0 8px;">Trục phụ (bổ trợ)</label>
              ${state.editTruPhu.map((t,i)=>`
                <div style="display:flex;gap:8px;margin-bottom:8px;align-items:flex-start;flex-wrap:wrap;">
                  <input data-edit-truphu-ten="${i}" value="${esc(t.ten)}" placeholder="Tên trục phụ" style="flex:1;min-width:120px;padding:10px 12px;border:1px solid var(--line);border-radius:8px;font-size:13.5px;background:#FDFCF8;">
                  <input data-edit-truphu-vaitro="${i}" value="${esc(t.vai_tro)}" placeholder="Vai trò" style="flex:1;min-width:120px;padding:10px 12px;border:1px solid var(--line);border-radius:8px;font-size:13.5px;background:#FDFCF8;">
                  <span data-edit-truphu-remove="${i}" style="align-self:center;color:var(--danger);cursor:pointer;font-size:12px;">Xoá</span>
                </div>
              `).join('')}
              <span style="font-size:12.5px;color:var(--accent);cursor:pointer;font-weight:600;" data-action="add-truphu">+ Thêm trục phụ</span>
              ${state.editTrucError?`<div class="error-box" style="margin-top:10px;">${esc(state.editTrucError)}</div>`:''}
              <div class="btn-row" style="margin-top:14px;justify-content:flex-start;">
                <button class="btn btn-sm" data-action="save-truc" ${state.editTrucSaving?'disabled':''}>${state.editTrucSaving?'Đang lưu…':'Lưu'}</button>
                <span class="btn-ghost btn btn-sm" data-action="cancel-edit-truc">Huỷ</span>
              </div>
            </div>
          ` : `
            ${r2.he_truc_noi_dung.cong_thuc?`<div class="body" style="margin-bottom:14px;color:var(--ink-soft);font-style:italic;">${escBold(r2.he_truc_noi_dung.cong_thuc)}</div>`:''}
            <div style="padding:14px 16px;background:var(--accent);border-radius:10px;margin-bottom:12px;">
              <div style="font-size:11px;font-weight:700;color:#DCEAE4;text-transform:uppercase;letter-spacing:.05em;margin-bottom:4px;">Trục chính</div>
              <div style="color:#fff;font-size:16px;font-weight:700;">${esc(r2.he_truc_noi_dung.truc_chinh)}</div>
            </div>
            <div style="font-size:11px;font-weight:700;color:var(--ink-soft);text-transform:uppercase;letter-spacing:.05em;margin-bottom:8px;">Trục phụ (bổ trợ)</div>
            ${r2.he_truc_noi_dung.tru_phu.map(t=>`
              <div style="padding:10px 12px;border:1px solid var(--line);border-radius:8px;margin-bottom:8px;">
                <b>${esc(t.ten)}</b><br><span style="font-size:13px;color:var(--ink-soft);">${esc(t.vai_tro)}</span>
              </div>
            `).join('')}
          `}
        </div>
        ${(()=>{
          const dt = r2.dong_tien_phu_hop || {};
          const list = (dt.danh_sach||[]).filter(d=>d && d.ten);
          if(!dt.uu_tien && list.length===0) return '';
          return `<div class="section"><h3>Dòng tiền phù hợp</h3>${dt.uu_tien?`<div class="body" style="margin-bottom:10px;">${esc(breakSentences(dt.uu_tien))}</div>`:''}
          ${list.length?`<ul>${list.map(d=>`<li><b>${esc(d.ten)}</b>${d.thoi_han?` (${esc(d.thoi_han)})`:''}${d.ly_do?` — ${esc(d.ly_do)}`:''}</li>`).join('')}</ul>`:''}</div>`;
        })()}
        <div class="section">
          <h3>Lộ trình dẫn về dòng tiền</h3>
          <div style="display:flex;flex-wrap:wrap;align-items:stretch;gap:0;">
            ${(Array.isArray(r2.lo_trinh_dan_ve_dong_tien)?r2.lo_trinh_dan_ve_dong_tien:[]).map((b,i,arr)=>`
              <div style="display:flex;align-items:center;">
                <div style="min-width:140px;max-width:180px;padding:12px 14px;border:1px solid var(--line);border-radius:10px;background:var(--panel);">
                  <div style="font-size:11px;font-weight:700;color:var(--gold);text-transform:uppercase;letter-spacing:.04em;margin-bottom:4px;">Bước ${i+1}</div>
                  <div style="font-weight:700;font-size:13.5px;margin-bottom:4px;">${esc(b.buoc)}</div>
                  <div style="font-size:12px;color:var(--ink-soft);line-height:1.4;">${esc(b.mo_ta)}</div>
                </div>
                ${i<arr.length-1?`<div style="padding:0 8px;color:var(--ink-soft);font-size:18px;">→</div>`:''}
              </div>
            `).join('')}
          </div>
        </div>
        ${sectionHtml('Script tự giới thiệu 30 giây', r2.script_gioi_thieu_30s)}
        ${listSectionHtml('Cần sửa ngay', r2.can_sua_ngay)}
        ${listSectionHtml('Cảnh báo', r2.canh_bao)}
      ` : state.luot2Loading ? `
        <div class="section" style="text-align:center;color:var(--ink-soft);margin-top:24px;">
          Đang xây tiếp Chiến lược &amp; Dòng tiền…
          <div id="progress-bar-el-luot2" style="margin-top:12px;">${progressBarHtml(0)}</div>
        </div>
      ` : `
        <div class="section" style="text-align:center;margin-top:24px;">
          ${state.luot2Error?`<div class="error-box" style="margin-bottom:12px;">${esc(state.luot2Error)}</div>`:''}
          <button class="btn" data-action="get-luot2">Tạo Chiến lược &amp; Dòng tiền →</button>
        </div>
      `}
      <div class="btn-row no-print" style="margin-top:20px;">
        <button class="btn-ghost btn" data-action="redo">Làm lại định vị</button>
        ${r2?`<button class="btn-ghost btn" data-action="print">Tải PDF / In</button>`:''}
      </div>
    `;
  }

  function bind(){
    const q = QUESTIONS[state.qIndex];

    const startBtn = container.querySelector('[data-action="start"]');
    // Giữ nguyên state.answers khi bấm lại — người dùng đang SỬA câu trả lời cũ, không phải xoá
    // trắng làm lại từ đầu; mỗi câu hỏi tự hiện lại đúng câu trả lời trước đó để điền thêm/sửa.
    if(startBtn) startBtn.onclick = async ()=>{
      await maybeReconstructAnswers();
      state.screen='wizard'; state.qIndex=0; state.luot1=null; state.luot2=null; draw();
    };

    const viewResultsBtn = container.querySelector('[data-action="view-results"]');
    if(viewResultsBtn) viewResultsBtn.onclick = ()=>{ state.screen = 'results'; draw(); };
    const redoFromDoneBtn = container.querySelector('[data-action="redo-from-done"]');
    if(redoFromDoneBtn) redoFromDoneBtn.onclick = async ()=>{
      await maybeReconstructAnswers();
      state.screen='wizard'; state.qIndex=0; draw();
    };

    const goPaste = container.querySelector('[data-action="go-paste"]');
    if(goPaste) goPaste.onclick = ()=>{ state.screen='paste'; state.pasteError=null; draw(); };

    const backToIntro = container.querySelector('[data-action="back-to-intro"]');
    if(backToIntro) backToIntro.onclick = ()=>{ state.screen = state.luot1 ? 'done' : 'intro'; draw(); };

    const editTrucBtn = container.querySelector('[data-action="edit-truc"]');
    if(editTrucBtn) editTrucBtn.onclick = ()=>{
      const truc = (state.luot2 && state.luot2.he_truc_noi_dung) || { truc_chinh:'', tru_phu:[] };
      state.editTrucChinh = truc.truc_chinh || '';
      state.editTruPhu = (truc.tru_phu || []).map(t=>({ ten:t.ten||'', vai_tro:t.vai_tro||'' }));
      state.editTrucError = null;
      state.editingTruc = true;
      draw();
    };
    const cancelEditTrucBtn = container.querySelector('[data-action="cancel-edit-truc"]');
    if(cancelEditTrucBtn) cancelEditTrucBtn.onclick = ()=>{ state.editingTruc = false; draw(); };
    const addTruPhuBtn = container.querySelector('[data-action="add-truphu"]');
    if(addTruPhuBtn) addTruPhuBtn.onclick = ()=>{ state.editTruPhu.push({ ten:'', vai_tro:'' }); draw(); };
    container.querySelectorAll('[data-edit-truphu-remove]').forEach(el=>{
      el.onclick = ()=>{ state.editTruPhu.splice(Number(el.getAttribute('data-edit-truphu-remove')), 1); draw(); };
    });
    const editTrucChinhInput = container.querySelector('#edit-truc-chinh');
    if(editTrucChinhInput) editTrucChinhInput.oninput = ()=>{ state.editTrucChinh = editTrucChinhInput.value; };
    container.querySelectorAll('[data-edit-truphu-ten]').forEach(el=>{
      el.oninput = ()=>{ state.editTruPhu[Number(el.getAttribute('data-edit-truphu-ten'))].ten = el.value; };
    });
    container.querySelectorAll('[data-edit-truphu-vaitro]').forEach(el=>{
      el.oninput = ()=>{ state.editTruPhu[Number(el.getAttribute('data-edit-truphu-vaitro'))].vai_tro = el.value; };
    });
    const saveTrucBtn = container.querySelector('[data-action="save-truc"]');
    if(saveTrucBtn) saveTrucBtn.onclick = saveTruc;

    const pasteInput = container.querySelector('#paste-input');
    if(pasteInput) pasteInput.oninput = ()=>{ state.pasteText = pasteInput.value; };

    const chInput = container.querySelector('#channel-handle-input');
    if(chInput) chInput.oninput = ()=>{ state.channelHandle = chInput.value; state.channelSaved = false; };
    const saveChBtn = container.querySelector('[data-action="save-channel-handle"]');
    if(saveChBtn) saveChBtn.onclick = saveChannelHandle;

    const newBrandInput = container.querySelector('#new-brand-input');
    if(newBrandInput) newBrandInput.oninput = ()=>state.newBrandName = newBrandInput.value;
    const addBrandBtn = container.querySelector('[data-action="add-brand"]');
    if(addBrandBtn) addBrandBtn.onclick = addBrand;
    container.querySelectorAll('[data-edit-brand]').forEach(el=>{
      el.onclick = ()=>{
        const id = el.getAttribute('data-edit-brand');
        const b = state.brands.find(x=>x.id===id);
        if(!b) return;
        state.editingBrandId = id; state.editBrandName = b.name || '';
        draw();
      };
    });
    container.querySelectorAll('[data-del-brand]').forEach(el=>{
      el.onclick = async ()=>{
        const id = el.getAttribute('data-del-brand');
        if(!(await confirmModal('Xoá vĩnh viễn thương hiệu này? Không khôi phục được.'))) return;
        await ctx.supabase.from('brands').delete().eq('id', id);
        await loadBrands(); draw();
      };
    });
    const ebNameEl = container.querySelector('#eb-name');
    if(ebNameEl) ebNameEl.oninput = ()=>state.editBrandName = ebNameEl.value;
    const saveEditBrandBtn = container.querySelector('[data-action="save-edit-brand"]');
    if(saveEditBrandBtn) saveEditBrandBtn.onclick = saveEditBrand;
    const cancelEditBrandBtn = container.querySelector('[data-action="cancel-edit-brand"]');
    if(cancelEditBrandBtn) cancelEditBrandBtn.onclick = ()=>{ state.editingBrandId = null; draw(); };

    const nl = container.querySelector('#na-label'); if(nl) nl.oninput = ()=>state.newAsset.label = nl.value;
    const nu = container.querySelector('#na-url'); if(nu) nu.oninput = ()=>state.newAsset.url = nu.value;
    const nk = container.querySelector('#na-kind'); if(nk) nk.onchange = ()=>state.newAsset.kind = nk.value;
    const addAssetBtn = container.querySelector('[data-action="add-asset"]');
    if(addAssetBtn) addAssetBtn.onclick = addAsset;

    const ngl = container.querySelector('#ng-label'); if(ngl) ngl.oninput = ()=>state.newGroup.label = ngl.value;
    const ngu = container.querySelector('#ng-url'); if(ngu) ngu.oninput = ()=>state.newGroup.url = ngu.value;
    const addGroupBtn = container.querySelector('[data-action="add-group"]');
    if(addGroupBtn) addGroupBtn.onclick = addGroup;
    container.querySelectorAll('[data-del-asset]').forEach(el=>{
      el.onclick = async ()=>{
        const id = el.getAttribute('data-del-asset');
        if(!(await confirmModal('Xoá vĩnh viễn mục này? Không khôi phục được.'))) return;
        await ctx.supabase.from('promo_assets').delete().eq('id', id);
        await loadAssets(); draw();
      };
    });
    container.querySelectorAll('[data-edit-asset]').forEach(el=>{
      el.onclick = ()=>{
        const id = el.getAttribute('data-edit-asset');
        const a = state.assets.find(x=>x.id===id);
        if(!a) return;
        state.editingAssetId = id;
        state.editAsset = { label:a.label||'', url:a.url||'', kind:a.kind||'san_pham_so' };
        draw();
      };
    });
    const ealEl = container.querySelector('#ea-label'); if(ealEl) ealEl.oninput = ()=>state.editAsset.label = ealEl.value;
    const eauEl = container.querySelector('#ea-url'); if(eauEl) eauEl.oninput = ()=>state.editAsset.url = eauEl.value;
    const eakEl = container.querySelector('#ea-kind'); if(eakEl) eakEl.onchange = ()=>state.editAsset.kind = eakEl.value;
    const saveEditBtn = container.querySelector('[data-action="save-edit-asset"]');
    if(saveEditBtn) saveEditBtn.onclick = saveEditAsset;
    const cancelEditBtn = container.querySelector('[data-action="cancel-edit-asset"]');
    if(cancelEditBtn) cancelEditBtn.onclick = ()=>{ state.editingAssetId = null; draw(); };

    const submitPasteBtn = container.querySelector('[data-action="submit-paste"]');
    if(submitPasteBtn) submitPasteBtn.onclick = submitPaste;

    const viewSaved = container.querySelector('[data-action="view-saved"]');
    if(viewSaved) viewSaved.onclick = ()=>{ state.screen = 'results'; draw(); };

    const backLink = container.querySelector('[data-action="back"]');
    if(backLink) backLink.onclick = ()=>{ state.qIndex = Math.max(0, state.qIndex-1); resetSuggestions(); draw(); };

    const suggestBtn = container.querySelector('[data-action="suggest"]');
    if(suggestBtn) suggestBtn.onclick = fetchSuggestions;

    container.querySelectorAll('[data-use-suggestion]').forEach(el=>{
      el.onclick = ()=>{
        const i = Number(el.getAttribute('data-use-suggestion'));
        state.answers[q.id] = state.suggestions[i];
        draw();
      };
    });

    const nextBtn = container.querySelector('[data-action="next"]');
    if(nextBtn) nextBtn.onclick = onNext;

    const retryBtn = container.querySelector('[data-action="retry"]');
    if(retryBtn) retryBtn.onclick = ()=>{
      state.error=null;
      if(state.screen==='parsing') submitPaste();
      else runLuot1();
    };

    const luot2Btn = container.querySelector('[data-action="get-luot2"]');
    if(luot2Btn) luot2Btn.onclick = runLuot2;

    const redoBtn = container.querySelector('[data-action="redo"]');
    if(redoBtn) redoBtn.onclick = ()=>{ state.screen='intro'; draw(); };

    container.querySelectorAll('[data-action="print"]').forEach(b=> b.onclick = ()=> window.print());

    const qinput = container.querySelector('#qinput');
    if(qinput) qinput.oninput = ()=>{ state.answers[q.id] = qinput.value; updateNextEnabled(); };

    const qinputOther = container.querySelector('#qinput-other');
    if(qinputOther) qinputOther.oninput = ()=>{
      const cur = state.answers[q.id] || {chosen:[], other:''};
      cur.other = qinputOther.value; state.answers[q.id] = cur; updateNextEnabled();
    };

    if(q && q.type==='radio'){
      container.querySelectorAll('[data-opt]').forEach(el=>{
        el.onclick = ()=>{ state.answers[q.id] = el.getAttribute('data-opt'); draw(); };
      });
    }
    if(q && q.type==='chips'){
      container.querySelectorAll('[data-chip]').forEach(el=>{
        el.onclick = ()=>{
          const opt = el.getAttribute('data-chip');
          const cur = state.answers[q.id] || {chosen:[], other:''};
          const idx = cur.chosen.indexOf(opt);
          if(q.multi){ if(idx>=0) cur.chosen.splice(idx,1); else cur.chosen.push(opt); }
          else { cur.chosen = idx>=0 ? [] : [opt]; }
          state.answers[q.id] = cur; draw();
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
    if(state.qIndex < QUESTIONS.length-1){ state.qIndex++; resetSuggestions(); draw(); }
    else { state.screen='saving1'; draw(); startHeavyProgress(90); runLuot1(); }
  }

  function resetSuggestions(){
    state.suggestions = null; state.suggestError = null; state.suggestForQ = null; state.suggestLoading = false;
  }

  async function fetchSuggestions(){
    const q = QUESTIONS[state.qIndex];
    state.suggestLoading = true; draw();
    try{
      const data = await callApi('/api/dinh-vi-goi-y', { question: q.q, previousAnswers: flattenAnswers() });
      state.suggestions = data.result.vi_du;
      state.suggestForQ = state.qIndex;
      state.suggestError = null;
    } catch(e){
      state.suggestError = e.message;
      state.suggestForQ = state.qIndex;
    }
    state.suggestLoading = false;
    draw();
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

  // Tài khoản từng dán kết quả có sẵn TRƯỚC KHI tính năng suy luận-lúc-dán ra đời (hoặc vì lý do
  // nào đó answers bị rỗng) sẽ không có gì để điền vào wizard khi bấm sửa — dùng lại chính luot1/
  // luot2 đã lưu để AI suy luận ngược ngay lúc này, không bắt phải dán lại văn bản gốc (thường
  // không còn giữ). Chỉ chạy khi answers thực sự rỗng, không ghi đè answers thật đã có.
  function hasAnyRealAnswer(){
    return Object.values(state.answers||{}).some(v=>{
      if(typeof v === 'string') return v.trim().length>0;
      if(v && typeof v==='object') return (v.chosen&&v.chosen.length>0) || (v.other&&v.other.trim().length>0);
      return false;
    });
  }
  async function maybeReconstructAnswers(){
    if(hasAnyRealAnswer() || !state.luot1) return;
    state.reconstructingAnswers = true; state.reconstructFailed = false; draw();
    try{
      const data = await callApi('/api/dinh-vi-reconstruct-answers', { luot1: state.luot1, luot2: state.luot2 });
      if(data.answers) state.answers = { ...data.answers, ...state.answers };
    } catch(e){ /* lỗi thì thôi, vẫn cho vào sửa bình thường (trống như trước), không chặn người dùng */ }
    // Gọi xong (dù lỗi hay AI trả về toàn chuỗi rỗng vì không suy luận được) mà vẫn không có câu
    // trả lời nào — báo rõ cho người dùng biết đây là "không khôi phục được", không phải bug làm
    // mất dữ liệu, và kết quả Định Vị đã lưu (luot1/luot2) vẫn nguyên vẹn, không mất gì.
    state.reconstructFailed = !hasAnyRealAnswer();
    state.reconstructingAnswers = false;
  }

  async function saveTruc(){
    if(!state.editTrucChinh.trim() || state.editTrucSaving) return;
    state.editTrucSaving = true; state.editTrucError = null; draw();
    try{
      const cleanTruPhu = state.editTruPhu.filter(t=>t.ten.trim() || t.vai_tro.trim());
      const newLuot2 = { ...state.luot2, he_truc_noi_dung: { ...state.luot2.he_truc_noi_dung, truc_chinh: state.editTrucChinh.trim(), tru_phu: cleanTruPhu } };
      await persist({ luot1: state.luot1, luot2: newLuot2 });
      state.luot2 = newLuot2;
      state.editingTruc = false;
    } catch(e){ state.editTrucError = e.message; }
    state.editTrucSaving = false;
    draw();
  }

  async function persist(fields){
    const payload = { user_id: ctx.user.id, answers: flattenAnswers(), ...fields, updated_at: new Date().toISOString() };
    const { data, error } = await ctx.supabase.from('positioning_results').upsert(payload, { onConflict:'user_id' }).select().single();
    if(error) throw error;
    state.savedId = data.id;
  }

  async function submitPaste(){
    if(!state.pasteText.trim()) return;
    state.pasteLoading = true; state.pasteError = null;
    const prevScreen = state.screen;
    state.screen = 'parsing'; draw();
    startHeavyProgress(60);
    try{
      const data = await callApi('/api/dinh-vi-parse', { raw_text: state.pasteText }, 280000);
      state.luot1 = data.luot1;
      state.luot2 = data.luot2 || null;
      // AI suy luận ngược lại 13 câu trả lời dạng textarea từ văn bản đã dán, để khi bấm "Sửa lại
      // câu trả lời" sau này không bị trống trơn — chỉ merge, không ghi đè câu đã có sẵn (dù hiếm
      // khi xảy ra vì đây là lần dán đầu tiên).
      if(data.answers){
        state.answers = { ...data.answers, ...state.answers };
      }
      await persist({ luot1: data.luot1, luot2: data.luot2 || null, format_suggestions: null });
      state.pasteLoading = false; state.error = null;
      if(stopHeavyProgress) stopHeavyProgress();
      state.screen = 'results';
      draw();
    } catch(e){
      state.pasteLoading = false;
      state.error = e.message;
      state.pasteError = e.message;
      if(stopHeavyProgress) stopHeavyProgress();
      state.screen = prevScreen === 'paste' ? 'paste' : 'parsing';
      draw();
    }
  }

  async function loadAssets(){
    const { data } = await ctx.supabase.from('promo_assets').select('*').eq('user_id', ctx.user.id).order('created_at', { ascending:true });
    state.assets = data || [];
  }

  async function loadBrands(){
    const { data } = await ctx.supabase.from('brands').select('*').eq('user_id', ctx.user.id).order('created_at', { ascending:true });
    state.brands = data || [];
  }

  async function addBrand(){
    if(!state.newBrandName.trim()) return;
    const { error } = await ctx.supabase.from('brands').insert({ user_id: ctx.user.id, name: state.newBrandName.trim() });
    if(error){ state.saveError = error.message; draw(); return; }
    state.saveError = null;
    state.newBrandName = '';
    await loadBrands();
    draw();
  }

  async function saveEditBrand(){
    if(!state.editingBrandId || !state.editBrandName.trim()) return;
    const { error } = await ctx.supabase.from('brands').update({ name: state.editBrandName.trim() }).eq('id', state.editingBrandId);
    if(error){ state.saveError = error.message; draw(); return; }
    state.saveError = null;
    state.editingBrandId = null;
    await loadBrands();
    draw();
  }

  async function addAsset(){
    if(!state.newAsset.label.trim()) return;
    const { error } = await ctx.supabase.from('promo_assets').insert({
      user_id: ctx.user.id, label: state.newAsset.label, url: state.newAsset.url || null, kind: state.newAsset.kind,
    });
    if(error){ state.saveError = error.message; draw(); return; }
    state.saveError = null;
    state.newAsset = { label:'', url:'', kind:'san_pham_so' };
    await loadAssets();
    draw();
  }

  async function addGroup(){
    if(!state.newGroup.label.trim()) return;
    const { error } = await ctx.supabase.from('promo_assets').insert({
      user_id: ctx.user.id, label: state.newGroup.label, url: state.newGroup.url || null, kind: 'cong_dong',
    });
    if(error){ state.saveError = error.message; draw(); return; }
    state.saveError = null;
    state.newGroup = { label:'', url:'' };
    await loadAssets();
    draw();
  }

  async function saveEditAsset(){
    if(!state.editingAssetId || !state.editAsset.label.trim()) return;
    await ctx.supabase.from('promo_assets').update({
      label: state.editAsset.label, url: state.editAsset.url || null, kind: state.editAsset.kind,
    }).eq('id', state.editingAssetId);
    state.editingAssetId = null;
    await loadAssets();
    draw();
  }

  async function saveChannelHandle(){
    if(state.channelSaving) return;
    state.channelSaving = true; state.channelSaved = false; draw();
    const { error } = await ctx.supabase.rpc('update_my_channel_handle', { new_handle: state.channelHandle.trim() || null });
    if(!error && ctx.profile){ ctx.profile.channel_handle = state.channelHandle.trim() || null; }
    state.channelSaving = false; state.channelSaved = !error; state.error = error ? error.message : null;
    draw();
  }

  async function runLuot1(){
    try{
      const data = await callApi('/api/dinh-vi', { luot:1, answers: flattenAnswers() }, 280000);
      state.luot1 = data.result;
      await persist({ luot1: data.result, luot2: null, format_suggestions: null });
      state.error = null;
      if(stopHeavyProgress) stopHeavyProgress();
      state.screen='results'; draw();
      runLuot2(); // chạy tiếp Lượt 2 ngầm ngay sau đó — hiện Lượt 1 trước, Lượt 2 tự điền vào cùng trang khi xong
    } catch(e){
      state.error = e.message;
      if(stopHeavyProgress) stopHeavyProgress();
      draw();
    }
  }

  async function runLuot2(){
    state.luot2Loading = true; state.luot2Error = null; draw();
    const stopL2Progress = animateProgressBar(container.querySelector('#progress-bar-el-luot2'), 60);
    try{
      const data = await callApi('/api/dinh-vi', { luot:2, answers: flattenAnswers(), luot1: state.luot1 }, 280000);
      state.luot2 = data.result;
      await persist({ luot1: state.luot1, luot2: data.result });
      state.luot2Error = null;
    } catch(e){ state.luot2Error = e.message; }
    stopL2Progress();
    state.luot2Loading = false;
    state.screen = 'results';
    draw();
  }

  boot();
}

window.Modules = window.Modules || {};
window.Modules['dinh-vi'] = { title:'Định Vị', render };
})();
