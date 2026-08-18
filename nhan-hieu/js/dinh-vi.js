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
    suggestLoading:false, suggestions:null, suggestError:null, suggestForQ:null,
    pasteText:'', pasteError:null, pasteLoading:false,
    channelHandle:'', channelSaving:false, channelSaved:false,
    cauChuyenRieng:'', storySaving:false, storySaved:false,
    assets:[], newAsset:{ label:'', url:'', kind:'san_pham_so' },
    editingAssetId:null, editAsset:{ label:'', url:'', kind:'san_pham_so' },
    brands:[], newBrandName:'', editingBrandId:null, editBrandName:'' };
  const ASSET_KINDS = {
    san_pham_so: 'Sản phẩm số của tôi', khoa_hoc: 'Khoá học của tôi', aff_nguoi_khac: 'Aff sản phẩm người khác',
    aff_cua_toi: 'Aff của tôi', cong_dong: 'Link cộng đồng', khac: 'Khác',
  };

  function draw(){ container.innerHTML = screenHtml(); bind(); }

  async function boot(){
    draw();
    state.channelHandle = (ctx.profile && ctx.profile.channel_handle) || '';
    state.cauChuyenRieng = (ctx.profile && ctx.profile.cau_chuyen_rieng) || '';
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
    if(state.screen==='saving2') return loadingHtml('Đang xây chiến lược nội dung & dòng tiền…', true);
    if(state.screen==='parsing') return loadingHtml('Đang đọc kết quả bạn dán vào…', true);
    if(state.screen==='results1') return results1Html();
    if(state.screen==='results2') return results2Html();
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
      <div class="btn-row" style="justify-content:center;margin-top:14px;">
        <button class="btn" data-action="view-results">Xem kết quả →</button>
        <button class="btn-ghost btn" data-action="redo-from-done">Làm lại từ đầu</button>
      </div>
    `;
  }

  function loadingHtml(msg, showWaitHint){
    return `<div class="loading"><div class="spinner"></div><p>${esc(msg)}</p>
      ${showWaitHint?`<p style="color:var(--ink-soft);font-size:13px;margin-top:6px;">AI cần khoảng 1-2 phút để xử lý — đừng thoát trang, cứ để chờ nhé.</p>`:''}
      ${state.error?`<div class="error-box">${esc(state.error)}</div><div class="btn-row"><button class="btn" data-action="retry">Thử lại</button></div>`:''}
    </div>`;
  }

  function introHtml(){
    const hasSaved = !!state.luot1;
    return `
      <div class="page-head" style="text-align:center;">
        <div class="tag">Bước 1 · Định Vị</div>
        <h1>Tìm ra định vị thương hiệu chuẩn nhất</h1>
        <p>Trả lời thật 18 câu hỏi trong 5 nhóm — mất khoảng 10-12 phút. AI sẽ phân tích và trả về bản định vị đầy đủ, dùng được ngay.</p>
      </div>
      <div class="source-grid">
        ${GROUPS.map((g,i)=>`<div class="source-card"><div class="ic">${i+1}</div><div class="label">${esc(g.title)}</div></div>`).join('')}
      </div>
      <div class="btn-row">
        <button class="btn" data-action="start">${hasSaved?'Làm lại từ đầu':'Bắt đầu'}</button>
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
          <button class="btn" data-action="submit-paste" ${state.pasteLoading?'disabled':''}>${state.pasteLoading?'Đang xử lý…':'Xử lý kết quả đã dán'}</button>
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
        <button class="btn" data-action="next" ${answered?'':'disabled'}>${state.qIndex===QUESTIONS.length-1?'Xem kết quả':'Tiếp tục'}</button>
      </div>
    `;
  }

  function sectionHtml(title, body){
    if(!body || !String(body).trim()) return '';
    return `<div class="section"><h3>${esc(title)}</h3><div class="body">${escBold(body)}</div></div>`;
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

  function results1Html(){
    const r = state.luot1;
    return `
      <div class="page-head" style="text-align:center;">
        <div class="tag">Lượt 1 · Định Vị Cốt Lõi</div>
        <h1>Định vị thương hiệu của bạn</h1>
      </div>
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
        <h3 style="margin-bottom:6px;">Thương hiệu / Tên sản phẩm</h3>
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
          <textarea id="new-brand-input" style="min-height:auto;height:40px;flex:1;min-width:200px;" placeholder="Ví dụ: Sổ Dòng Tiền">${esc(state.newBrandName)}</textarea>
          <button class="btn btn-sm" data-action="add-brand">Thêm thương hiệu</button>
        </div>
      </div>
      <div class="card" style="margin-top:14px;">
        <h3 style="margin-bottom:10px;">Tài sản quảng bá</h3>
        <div style="font-size:12.5px;color:var(--ink-soft);margin-bottom:10px;">Sản phẩm số, link aff, link cộng đồng — lưu 1 lần ở đây, dùng lại ở Viết Content và Đẩy Bài &amp; CTA Comment.</div>
        <div class="hint-box" style="margin-bottom:12px;">Có group/cộng đồng riêng (Facebook, Zalo, Telegram...)? Nhớ thêm vào đây — chọn loại <b>"Link cộng đồng"</b> và dán kèm link đầy đủ, để Viết Content/Đẩy Bài tự gợi ý mời đúng người vào đúng group.</div>
        ${state.assets.length===0?`<div style="color:var(--ink-soft);font-size:13.5px;margin-bottom:10px;">Chưa có tài sản nào.</div>`:''}
        ${state.assets.map(a=>{
          if(state.editingAssetId===a.id){
            return `
              <div style="padding:10px 0;border-bottom:1px solid var(--line);display:flex;flex-direction:column;gap:8px;">
                <textarea id="ea-label" style="min-height:auto;height:40px;">${esc(state.editAsset.label)}</textarea>
                <textarea id="ea-url" style="min-height:auto;height:40px;" placeholder="Link (không bắt buộc)">${esc(state.editAsset.url)}</textarea>
                <select id="ea-kind">
                  ${Object.entries(ASSET_KINDS).map(([k,v])=>`<option value="${k}" ${state.editAsset.kind===k?'selected':''}>${esc(v)}</option>`).join('')}
                </select>
                <div class="btn-row" style="justify-content:flex-start;">
                  <button class="btn btn-sm" data-action="save-edit-asset">Lưu</button>
                  <span class="btn-ghost btn btn-sm" data-action="cancel-edit-asset">Huỷ</span>
                </div>
              </div>
            `;
          }
          return `
          <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid var(--line);font-size:13.5px;">
            <div><b>${esc(a.label)}</b> <span style="color:var(--ink-soft);">(${esc(ASSET_KINDS[a.kind]||a.kind||'')})</span>${a.url?`<br><span style="color:var(--ink-soft);font-size:12px;">${esc(a.url)}</span>`:''}</div>
            <div style="display:flex;gap:12px;">
              <span style="color:var(--accent);cursor:pointer;font-size:12px;" data-edit-asset="${a.id}">Sửa</span>
              <span style="color:var(--danger);cursor:pointer;font-size:12px;" data-del-asset="${a.id}">Xoá</span>
            </div>
          </div>
        `;
        }).join('')}
        <div style="margin-top:14px;display:flex;flex-direction:column;gap:8px;">
          <textarea id="na-label" style="min-height:auto;height:40px;" placeholder="Tên tài sản, ví dụ: Khoá học Sổ Dòng Tiền">${esc(state.newAsset.label)}</textarea>
          <textarea id="na-url" style="min-height:auto;height:40px;" placeholder="Link (không bắt buộc)">${esc(state.newAsset.url)}</textarea>
          <select id="na-kind">
            ${Object.entries(ASSET_KINDS).map(([k,v])=>`<option value="${k}" ${state.newAsset.kind===k?'selected':''}>${esc(v)}</option>`).join('')}
          </select>
          <div class="btn-row" style="margin-top:2px;"><button class="btn btn-sm" data-action="add-asset">Thêm tài sản</button></div>
        </div>
      </div>
      <div class="card" style="margin-top:14px;">
        <h3 style="margin-bottom:6px;">Câu chuyện của bạn</h3>
        <div style="font-size:12.5px;color:var(--ink-soft);margin-bottom:10px;">Kể 1 câu chuyện/trải nghiệm thật cụ thể của bạn (có mốc thời gian, con số, cảm xúc, kết quả) — lưu 1 lần ở đây, dùng lại khi viết bài giữ nguyên cấu trúc từ Kho Content, khỏi phải nhập lại mỗi lần viết.</div>
        <textarea id="story-input" placeholder="Ví dụ: 3 năm trước mình từng...">${esc(state.cauChuyenRieng)}</textarea>
        <div class="btn-row" style="margin-top:8px;"><button class="btn btn-sm" data-action="save-story" ${state.storySaving?'disabled':''}>${state.storySaving?'Đang lưu…':'Lưu'}</button></div>
        ${state.storySaved?`<div style="margin-top:8px;font-size:12.5px;color:var(--accent);">Đã lưu ✓</div>`:''}
      </div>
      <div class="section highlight"><h3>Kết luận định vị</h3><div class="body" style="font-family:'Playfair Display',serif;font-size:18px;font-style:italic;line-height:1.6;">${escBold(breakSentences(r.ket_luan_dinh_vi))}</div></div>
      ${sectionHtml('Tổng quan thương hiệu', r.tong_quan_thuong_hieu)}
      ${sectionHtml('Hồ sơ chuyên môn', r.ho_so_chuyen_mon)}
      ${sectionHtml('Lợi thế cạnh tranh', r.loi_the_canh_tranh)}
      ${sectionHtml('Hình ảnh nên xây', r.hinh_anh_nen_xay)}
      ${sectionHtml('Bản sắc thương hiệu', r.ban_sac_thuong_hieu)}
      ${sectionHtml('Giọng điệu & ngôn ngữ', r.giong_dieu_ngon_ngu)}
      ${(r.hook_mo_dau && (r.hook_mo_dau.kieu_hook || (r.hook_mo_dau.vi_du||[]).length)) ? `
      <div class="section"><h3>Hook mở đầu</h3>${r.hook_mo_dau.kieu_hook?`<div class="body">${escBold(r.hook_mo_dau.kieu_hook)}</div>`:''}
        <ul>${(r.hook_mo_dau.vi_du||[]).filter(Boolean).map(h=>`<li>${escBold(h)}</li>`).join('')}</ul></div>
      ` : ''}
      ${sectionHtml('Triết lý thương hiệu', r.triet_ly_thuong_hieu)}
      ${sectionHtml('Không theo đuổi', r.khong_theo_duoi)}
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
      <div class="btn-row no-print">
        ${!state.luot2 ? `<button class="btn" data-action="get-luot2">Xem tiếp: Chiến lược & Dòng tiền →</button>` : `<button class="btn" data-action="goto-r2">Xem Chiến lược & Dòng tiền →</button>`}
        <button class="btn-ghost btn" data-action="redo">Làm lại định vị</button>
      </div>
    `;
  }

  function results2Html(){
    const r1 = state.luot1, r2 = state.luot2;
    return `
      <div class="page-head" style="text-align:center;">
        <div class="tag">Lượt 2 · Chiến Lược &amp; Dòng Tiền</div>
        <h1 style="font-size:22px;">${escBold(firstSentence(r1.ket_luan_dinh_vi))}</h1>
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
        <h3>Hệ trục nội dung</h3>
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
      </div>
      ${(()=>{
        const dt = r2.dong_tien_phu_hop || {};
        const list = (dt.danh_sach||[]).filter(d=>d && d.ten);
        if(!dt.uu_tien && list.length===0) return '';
        return `<div class="section"><h3>Dòng tiền phù hợp</h3>${dt.uu_tien?`<div class="body" style="margin-bottom:10px;">${esc(dt.uu_tien)}</div>`:''}
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
      ${listSectionHtml('Hook cá nhân', r2.hook_ca_nhan)}
      ${listSectionHtml('Cần sửa ngay', r2.can_sua_ngay)}
      ${listSectionHtml('Cảnh báo', r2.canh_bao)}
      <div class="btn-row no-print">
        <span style="color:var(--ink-soft);font-size:13.5px;cursor:pointer;align-self:center;" data-action="back-to-r1">← Xem lại Định Vị Cốt Lõi</span>
        <button class="btn-ghost btn" data-action="print">Tải PDF / In</button>
      </div>
    `;
  }

  function bind(){
    const q = QUESTIONS[state.qIndex];

    const startBtn = container.querySelector('[data-action="start"]');
    if(startBtn) startBtn.onclick = ()=>{ state.screen='wizard'; state.qIndex=0; state.answers={}; state.luot1=null; state.luot2=null; draw(); };

    const viewResultsBtn = container.querySelector('[data-action="view-results"]');
    if(viewResultsBtn) viewResultsBtn.onclick = ()=>{ state.screen = 'results1'; draw(); };
    const redoFromDoneBtn = container.querySelector('[data-action="redo-from-done"]');
    if(redoFromDoneBtn) redoFromDoneBtn.onclick = ()=>{ state.screen='wizard'; state.qIndex=0; state.answers={}; draw(); };

    const goPaste = container.querySelector('[data-action="go-paste"]');
    if(goPaste) goPaste.onclick = ()=>{ state.screen='paste'; state.pasteError=null; draw(); };

    const backToIntro = container.querySelector('[data-action="back-to-intro"]');
    if(backToIntro) backToIntro.onclick = ()=>{ state.screen='intro'; draw(); };

    const pasteInput = container.querySelector('#paste-input');
    if(pasteInput) pasteInput.oninput = ()=>{ state.pasteText = pasteInput.value; };

    const chInput = container.querySelector('#channel-handle-input');
    if(chInput) chInput.oninput = ()=>{ state.channelHandle = chInput.value; state.channelSaved = false; };
    const saveChBtn = container.querySelector('[data-action="save-channel-handle"]');
    if(saveChBtn) saveChBtn.onclick = saveChannelHandle;

    const storyInput = container.querySelector('#story-input');
    if(storyInput) storyInput.oninput = ()=>{ state.cauChuyenRieng = storyInput.value; state.storySaved = false; };
    const saveStoryBtn = container.querySelector('[data-action="save-story"]');
    if(saveStoryBtn) saveStoryBtn.onclick = saveStory;

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
        await ctx.supabase.from('brands').delete().eq('id', el.getAttribute('data-del-brand'));
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
    container.querySelectorAll('[data-del-asset]').forEach(el=>{
      el.onclick = async ()=>{
        await ctx.supabase.from('promo_assets').delete().eq('id', el.getAttribute('data-del-asset'));
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
    if(viewSaved) viewSaved.onclick = ()=>{ state.screen = state.luot2 ? 'results2' : 'results1'; draw(); };

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
      if(state.screen==='saving1') runLuot1();
      else if(state.screen==='parsing') submitPaste();
      else runLuot2();
    };

    const luot2Btn = container.querySelector('[data-action="get-luot2"]');
    if(luot2Btn) luot2Btn.onclick = ()=>{ state.screen='saving2'; draw(); runLuot2(); };

    const gotoR2 = container.querySelector('[data-action="goto-r2"]');
    if(gotoR2) gotoR2.onclick = ()=>{ state.screen='results2'; draw(); };

    const backR1 = container.querySelector('[data-action="back-to-r1"]');
    if(backR1) backR1.onclick = ()=>{ state.screen='results1'; draw(); };

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
    else { state.screen='saving1'; draw(); runLuot1(); }
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
    try{
      const data = await callApi('/api/dinh-vi-parse', { raw_text: state.pasteText });
      state.luot1 = data.luot1;
      state.luot2 = data.luot2 || null;
      await persist({ luot1: data.luot1, luot2: data.luot2 || null });
      state.pasteLoading = false; state.error = null;
      state.screen = state.luot2 ? 'results2' : 'results1';
      draw();
    } catch(e){
      state.pasteLoading = false;
      state.error = e.message;
      state.pasteError = e.message;
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
    await ctx.supabase.from('brands').insert({ user_id: ctx.user.id, name: state.newBrandName.trim() });
    state.newBrandName = '';
    await loadBrands();
    draw();
  }

  async function saveEditBrand(){
    if(!state.editingBrandId || !state.editBrandName.trim()) return;
    await ctx.supabase.from('brands').update({ name: state.editBrandName.trim() }).eq('id', state.editingBrandId);
    state.editingBrandId = null;
    await loadBrands();
    draw();
  }

  async function addAsset(){
    if(!state.newAsset.label.trim()) return;
    await ctx.supabase.from('promo_assets').insert({
      user_id: ctx.user.id, label: state.newAsset.label, url: state.newAsset.url || null, kind: state.newAsset.kind,
    });
    state.newAsset = { label:'', url:'', kind:'san_pham_so' };
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

  async function saveStory(){
    if(state.storySaving) return;
    state.storySaving = true; state.storySaved = false; draw();
    const { error } = await ctx.supabase.rpc('update_my_story', { new_story: state.cauChuyenRieng.trim() || null });
    if(!error && ctx.profile){ ctx.profile.cau_chuyen_rieng = state.cauChuyenRieng.trim() || null; }
    state.storySaving = false; state.storySaved = !error; state.error = error ? error.message : null;
    draw();
  }

  async function runLuot1(){
    try{
      const data = await callApi('/api/dinh-vi', { luot:1, answers: flattenAnswers() });
      state.luot1 = data.result;
      await persist({ luot1: data.result, luot2: null });
      state.error = null; state.screen='results1'; draw();
    } catch(e){ state.error = e.message; draw(); }
  }

  async function runLuot2(){
    try{
      const data = await callApi('/api/dinh-vi', { luot:2, answers: flattenAnswers(), luot1: state.luot1 });
      state.luot2 = data.result;
      await persist({ luot1: state.luot1, luot2: data.result });
      state.error = null; state.screen='results2'; draw();
    } catch(e){ state.error = e.message; draw(); }
  }

  boot();
}

window.Modules = window.Modules || {};
window.Modules['dinh-vi'] = { title:'Định Vị', render };
})();
