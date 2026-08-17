(function(){
const QUESTIONS = [
  {id:'a1', group:'A', type:'textarea', q:'Hiện tại bạn đang làm công việc/lĩnh vực gì? Đã làm bao lâu? Việc gì bạn giỏi nhất, việc gì đang thấy kẹt?', placeholder:'Ví dụ: Mình làm coach tài chính cá nhân được 3 năm, giỏi phần lên kế hoạch dòng tiền, còn kẹt ở phần marketing bản thân...'},
  {id:'a2', group:'A', type:'textarea', q:'Bạn muốn xây dựng thương hiệu cá nhân trên mạng xã hội để làm gì?'},
  {id:'a3', group:'A', type:'textarea', q:'Bạn có sản phẩm/dịch vụ/khoá học/cơ hội nào muốn dẫn người xem về không?', placeholder:'Nếu chưa có, ghi "chưa có"'},
  {id:'a4', group:'A', type:'chips', multi:false, allowOther:true, q:'Vấn đề bạn đang gặp phải là gì?', options:['Chưa có kênh','Không rõ mình là ai','Đăng lung tung, không nhất quán','Không biết bắt đầu từ đâu']},
  {id:'b5', group:'B', type:'textarea', q:'Bạn từng trải qua biến cố hoặc hành trình nào để lại bài học sâu sắc?'},
  {id:'b6', group:'B', type:'textarea', q:'Người khác thường tìm đến bạn để hỏi về điều gì?'},
  {id:'b7', group:'B', type:'textarea', q:'Chủ đề nào bạn có thể nói rất lâu mà không hết ý?'},
  {id:'b8', group:'B', type:'textarea', q:'Bạn thích làm việc gì đến mức không thấy mệt?'},
  {id:'b9', group:'B', type:'textarea', q:'Bạn không thích làm gì / việc gì khiến bạn dễ tụt năng lượng?'},
  {id:'b10', group:'B', type:'textarea', q:'Bạn thường được người khác khen về điều gì nhiều nhất?'},
  {id:'b11', group:'B', type:'textarea', q:'Bạn từng tự ti hoặc bị chê về điều gì?'},
  {id:'b12', group:'B', type:'chips', multi:false, allowOther:true, q:'Bạn muốn giúp nhóm người nào?', options:['Mệt - kẹt - gồng','Kiếm tiền tốt hơn','Khoẻ - đẹp','Xây nhân hiệu','Kinh doanh','Chữa lành']},
  {id:'b13', group:'B', type:'textarea', q:'Câu chuyện nào có thể trở thành "linh hồn" cho kênh của bạn?', helper:'Nếu là chuyện nhạy cảm (bệnh nặng, trầm cảm, mất mát...), mình sẽ giúp bạn kể lại có trách nhiệm — không câu view, không hù doạ.'},
  {id:'c14', group:'C', type:'radio', q:'Bạn có thoải mái xuất hiện trước camera không?', options:['Rất thoải mái','Hơi ngại nhưng có thể tập','Không muốn lộ mặt','Chỉ muốn dùng giọng nói','Kết hợp tuỳ lúc']},
  {id:'c15', group:'C', type:'radio', q:'Năng lượng tự nhiên của bạn thiên về hướng nào?', options:['Sâu / chữa lành','Mạnh / động lực','Vui / gần gũi','Sang / chuyên gia','Từng trải','Hài hước','Bình an / tâm linh']},
  {id:'c16', group:'C', type:'chips', multi:true, q:'Bạn muốn người xem cảm nhận gì khi xem nội dung của bạn?', options:['Tin tưởng','Chữa lành','Động lực','Chuyên gia','Gần gũi','Kết quả thật','Chiều sâu']},
  {id:'c17', group:'C', type:'textarea', q:'Chất liệu hình ảnh nào bạn có thể quay dễ dàng mỗi ngày?', helper:'Ví dụ: nơi làm việc, sản phẩm, khách hàng, thiên nhiên quanh bạn...'},
  {id:'d18', group:'D', type:'textarea', q:'Bạn biết ai đang làm nội dung trong lĩnh vực tương tự? Họ đang làm tốt điều gì?'},
  {id:'d19', group:'D', type:'textarea', q:'Bạn khác họ ở điểm nào?'},
  {id:'d20', group:'D', type:'textarea', q:'Nếu chỉ có 10 giây để người lạ nhớ bạn là ai, bạn sẽ nói gì?'},
  {id:'d21', group:'D', type:'textarea', q:'Điều bạn tin sâu sắc nhất về lĩnh vực mình làm — điều không phải ai cũng đồng ý?'},
  {id:'e22', group:'E', type:'textarea', q:'Mỗi ngày bạn làm gì nhiều nhất? Hành động nào lặp đi lặp lại nhiều nhất trong công việc?', helper:'Ví dụ: gặp khách, gõ máy tính, dạy học, tư vấn, di chuyển, cầm đồ vật gì đó, viết lên bảng...'},
  {id:'e23', group:'E', type:'textarea', q:'Có đồ vật nào luôn xuất hiện trong công việc của bạn không?', helper:'Ví dụ: laptop, sổ tay, bút, công cụ nghề, sản phẩm, trang phục đặc trưng...'},
  {id:'e24', group:'E', type:'textarea', q:'Không gian bạn thường xuất hiện nhiều nhất là ở đâu?', helper:'Ví dụ: bàn làm việc, xe hơi, văn phòng, thiên nhiên, hội trường, nhà bếp, ngoài trời...'},
  {id:'e25', group:'E', type:'textarea', q:'Bạn có phong cách ăn mặc / xuất hiện nhất quán không?', helper:'Ví dụ: màu hay mặc, kiểu tóc, phụ kiện đặc trưng, formal hay casual...'},
  {id:'e26', group:'E', type:'textarea', q:'Khi nghĩ về những người có thương hiệu hình ảnh mạnh mà bạn ngưỡng mộ, họ có điểm chung gì về hình ảnh?'},
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
    pasteText:'', pasteError:null, pasteLoading:false };

  function draw(){ container.innerHTML = screenHtml(); bind(); }

  async function boot(){
    draw();
    const { data, error } = await ctx.supabase.from('positioning_results').select('*').eq('user_id', ctx.user.id).maybeSingle();
    if(error){ state.error = error.message; state.screen='intro'; draw(); return; }
    const isComplete = data && data.luot1 && data.luot1.ket_luan_dinh_vi;
    if(data){
      state.savedId = data.id;
      state.answers = data.answers || {};
      state.luot1 = isComplete ? data.luot1 : null;
      state.luot2 = isComplete ? data.luot2 : null;
      state.screen = isComplete ? (data.luot2 ? 'results2' : 'results1') : 'intro';
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
    if(state.screen==='saving1') return loadingHtml('Đang phân tích định vị của bạn…');
    if(state.screen==='saving2') return loadingHtml('Đang xây chiến lược nội dung & dòng tiền…');
    if(state.screen==='parsing') return loadingHtml('Đang đọc kết quả bạn dán vào…');
    if(state.screen==='results1') return results1Html();
    if(state.screen==='results2') return results2Html();
    return '';
  }

  function loadingHtml(msg){
    return `<div class="loading"><div class="spinner"></div><p>${esc(msg)}</p>
      ${state.error?`<div class="error-box">${esc(state.error)}</div><div class="btn-row"><button class="btn" data-action="retry">Thử lại</button></div>`:''}
    </div>`;
  }

  function introHtml(){
    const hasSaved = !!state.luot1;
    return `
      <div class="page-head" style="text-align:center;">
        <div class="tag">Bước 1 · Định Vị</div>
        <h1>Tìm ra định vị thương hiệu chuẩn nhất</h1>
        <p>Trả lời thật 26 câu hỏi trong 5 nhóm — mất khoảng 15-20 phút. AI sẽ phân tích và trả về bản định vị đầy đủ, dùng được ngay.</p>
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
        <p>Copy toàn bộ kết quả từ trợ lý ĐỊNH VỊ AI (ChatGPT) bạn đã dùng trước đây — Lượt 1, hoặc cả Lượt 1 + Lượt 2 — dán nguyên văn vào ô bên dưới. AI sẽ tự sắp xếp lại đúng cấu trúc, không cần làm lại 26 câu hỏi.</p>
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
    return `<div class="section"><h3>${esc(title)}</h3><div class="body">${esc(body)}</div></div>`;
  }

  function results1Html(){
    const r = state.luot1;
    return `
      <div class="page-head" style="text-align:center;">
        <div class="tag">Lượt 1 · Định Vị Cốt Lõi</div>
        <h1>Định vị thương hiệu của bạn</h1>
      </div>
      <div class="section highlight"><h3>Kết luận định vị</h3><div class="body" style="font-family:'Playfair Display',serif;font-size:19px;font-style:italic;">${esc(r.ket_luan_dinh_vi)}</div></div>
      ${sectionHtml('Tổng quan thương hiệu', r.tong_quan_thuong_hieu)}
      ${sectionHtml('Hồ sơ chuyên môn', r.ho_so_chuyen_mon)}
      ${sectionHtml('Lợi thế cạnh tranh', r.loi_the_canh_tranh)}
      ${sectionHtml('Hình ảnh nên xây', r.hinh_anh_nen_xay)}
      ${sectionHtml('Bản sắc thương hiệu', r.ban_sac_thuong_hieu)}
      ${sectionHtml('Giọng điệu & ngôn ngữ', r.giong_dieu_ngon_ngu)}
      <div class="section"><h3>Hook mở đầu</h3><div class="body">${esc(r.hook_mo_dau && r.hook_mo_dau.kieu_hook)}</div>
        <ul>${((r.hook_mo_dau && r.hook_mo_dau.vi_du)||[]).map(h=>`<li>${esc(h)}</li>`).join('')}</ul></div>
      ${sectionHtml('Triết lý thương hiệu', r.triet_ly_thuong_hieu)}
      ${sectionHtml('Không theo đuổi', r.khong_theo_duoi)}
      <div class="section"><h3>Dấu ấn hình ảnh thương hiệu</h3>
        <div class="body"><b>Hành động đặc trưng:</b> ${esc(r.dau_an_hinh_anh && r.dau_an_hinh_anh.hanh_dong_dac_trung)}<br>
        <b>Đồ vật/prop:</b> ${esc(r.dau_an_hinh_anh && r.dau_an_hinh_anh.do_vat_prop)}<br>
        <b>Không gian:</b> ${esc(r.dau_an_hinh_anh && r.dau_an_hinh_anh.khong_gian_signature)}<br>
        <b>Phong cách:</b> ${esc(r.dau_an_hinh_anh && r.dau_an_hinh_anh.phong_cach_xuat_hien)}<br>
        <b>Góc quay POV:</b> ${esc(r.dau_an_hinh_anh && r.dau_an_hinh_anh.goc_quay_pov)}</div>
        <ul>${((r.dau_an_hinh_anh && r.dau_an_hinh_anh.canh_mo_dau)||[]).map(c=>`<li>${esc(c)}</li>`).join('')}</ul>
      </div>
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
        <h1 style="font-size:22px;">${esc(r1.ket_luan_dinh_vi)}</h1>
      </div>
      ${sectionHtml('Chân dung khách hàng', r2.chan_dung_khach_hang)}
      <div class="section"><h3>Nỗi đau & rào cản (4 tầng)</h3>
        <div class="body"><b>Bề mặt:</b> ${esc(r2.noi_dau_rao_can.be_mat)}<br><b>Sâu bên trong:</b> ${esc(r2.noi_dau_rao_can.sau_ben_trong)}<br><b>Nỗi sợ:</b> ${esc(r2.noi_dau_rao_can.noi_so)}<br><b>Rào cản:</b> ${esc(r2.noi_dau_rao_can.rao_can_chua_hanh_dong)}</div></div>
      ${sectionHtml('Khao khát & mục tiêu', r2.khao_khat_muc_tieu)}
      <div class="section highlight"><h3>Insight cốt lõi</h3><div class="body">${esc(r2.insight_cot_loi)}</div></div>
      <div class="section"><h3>Hệ trục nội dung</h3><div class="body" style="margin-bottom:10px;"><b>${esc(r2.he_truc_noi_dung.cong_thuc)}</b></div>
        <div>Trục chính: ${esc(r2.he_truc_noi_dung.truc_chinh)}</div>
        <ul>${r2.he_truc_noi_dung.tru_phu.map(t=>`<li><b>${esc(t.ten)}</b> — ${esc(t.vai_tro)}</li>`).join('')}</ul></div>
      <div class="section"><h3>Style & dạng nội dung</h3><div class="body">${esc(r2.style_dang_noi_dung.style)}</div>
        <div style="margin-top:10px;"><b>Dạng chính:</b> ${(r2.style_dang_noi_dung.dang_chinh||[]).join(', ')}<br><b>Dạng phụ:</b> ${(r2.style_dang_noi_dung.dang_phu||[]).join(', ')}</div>
        <div style="margin-top:10px;"><b>Tỷ lệ test 7 ngày:</b> ${esc(r2.style_dang_noi_dung.ty_le_format_7_ngay)}</div></div>
      <div class="section"><h3>15 chủ đề đầu tiên</h3><ul>${(r2.chu_de_dau_tien||[]).map(c=>`<li><b>[${esc(c.nhom)}]</b> ${esc(c.ten)}</li>`).join('')}</ul></div>
      <div class="section"><h3>Kế hoạch 7 ngày</h3><div style="overflow-x:auto;">
        <table class="plan"><thead><tr><th>Ngày</th><th>Đăng gì</th><th>Format</th><th>Mục tiêu</th><th>Hook</th><th>CTA</th><th>Chỉ số</th></tr></thead>
        <tbody>${(r2.ke_hoach_7_ngay||[]).map(d=>`<tr><td>${esc(d.ngay)}</td><td>${esc(d.dang_gi)}</td><td>${esc(d.format)}</td><td>${esc(d.muc_tieu)}</td><td>${esc(d.hook)}</td><td>${esc(d.cta)}</td><td>${esc(d.chi_so_quan_sat)}</td></tr>`).join('')}</tbody></table>
      </div></div>
      <div class="section"><h3>Dòng tiền phù hợp</h3><div class="body" style="margin-bottom:10px;">${esc(r2.dong_tien_phu_hop.uu_tien)}</div>
        <ul>${(r2.dong_tien_phu_hop.danh_sach||[]).map(d=>`<li><b>${esc(d.ten)}</b> (${esc(d.thoi_han)}) — ${esc(d.ly_do)}</li>`).join('')}</ul></div>
      ${sectionHtml('Lộ trình dẫn về dòng tiền', r2.lo_trinh_dan_ve_dong_tien)}
      <div class="section"><h3>3 phiên bản bio</h3><ul>${(r2.bio_3_phien_ban||[]).map(b=>`<li>${esc(b)}</li>`).join('')}</ul></div>
      ${sectionHtml('Script tự giới thiệu 30 giây', r2.script_gioi_thieu_30s)}
      <div class="section"><h3>Hook cá nhân</h3><ul>${(r2.hook_ca_nhan||[]).map(h=>`<li>${esc(h)}</li>`).join('')}</ul></div>
      <div class="section"><h3>Cần sửa ngay</h3><ul>${(r2.can_sua_ngay||[]).map(h=>`<li>${esc(h)}</li>`).join('')}</ul></div>
      <div class="section"><h3>Cảnh báo</h3><ul>${(r2.canh_bao||[]).map(h=>`<li>${esc(h)}</li>`).join('')}</ul></div>
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

    const goPaste = container.querySelector('[data-action="go-paste"]');
    if(goPaste) goPaste.onclick = ()=>{ state.screen='paste'; state.pasteError=null; draw(); };

    const backToIntro = container.querySelector('[data-action="back-to-intro"]');
    if(backToIntro) backToIntro.onclick = ()=>{ state.screen='intro'; draw(); };

    const pasteInput = container.querySelector('#paste-input');
    if(pasteInput) pasteInput.oninput = ()=>{ state.pasteText = pasteInput.value; };

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
