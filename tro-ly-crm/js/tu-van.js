// Màn hình chính: dán ảnh chụp chat với khách + mô tả ngắn → AI tư vấn câu hỏi/câu chốt dùng ngay,
// đồng thời TỰ ghi vào crm_customers/crm_interactions (xem api/crm-tuvan.js) — không cần qua Lark.
(function(){
const DRAFT_KEY = 'tu-van';
const CONTEXT_DRAFT_KEY = 'tu-van-san-pham'; // riêng, KHÔNG bị xoá sau mỗi lần tư vấn (bối cảnh lâu dài)
// Tăng từ 5 lên 10 (chị Quỳnh yêu cầu 2026-08-29) — gộp nhiều tin nhắn/ảnh rồi gửi 1 lần thay vì
// mỗi tin 1 lần bấm giúp giảm chi phí thật (phần đắt nhất mỗi lượt là AI soạn kết quả, không phải
// đọc ảnh — gộp 10 ảnh vào 1 lượt chỉ soạn kết quả 1 lần thay vì 10 lần).
const MAX_IMAGES = 10;

// Sổ tay tư vấn theo từng nhánh (chị Quỳnh chốt 2026-08-30: mỗi bước cần có sẵn CÂU VÍ DỤ CỤ THỂ để
// copy gửi thẳng, không chỉ tóm tắt ý — bấm vào từng bước mới xoè ra câu ví dụ, gọn khi chưa cần).
// KHÔNG gọi AI cho các câu này — nội dung tĩnh, tự soạn 1 lần dùng lại nhiều lần, AI chỉ bắt đầu tính
// lượt từ khi khách đã trả lời và có ảnh/nội dung thật để phân tích. Đây là bản đầu — chị Quỳnh sẽ
// tự yêu cầu chỉnh từng câu sau khi thấy cơ chế chạy đúng, không cần tự nhiên trọn vẹn ngay từ đầu.
const NHANH_GUIDES = {
  A: { label:'A — Sức khỏe', steps:[
    { title:'Khách đã tự nói rõ vấn đề (VD "em mất ngủ", "em muốn giảm mỡ bụng")', example:'Dạ em hiểu cảm giác đó ạ, để em hỏi thêm vài thông tin để tư vấn đúng cho mình nhé.' },
    { title:'Khách chỉ chào hỏi chung chung, chưa rõ vấn đề gì', example:'Bạn đang có nhu cầu như thế nào về sức khỏe ạ?' },
    { title:'Khách hỏi giá ngay từ đầu', example:'Anh/chị đã tìm hiểu được gì về giải pháp này rồi ạ?' },
    { title:'[Giảm cân/mỡ] Bước 1 — chiều cao/cân nặng', example:'Chị hiện đang cao mét bao nhiêu và nặng bao nhiêu ký ạ?' },
    { title:'[Giảm cân/mỡ] Bước 2 — % mỡ hiện tại/mục tiêu (gửi kèm bảng % mỡ)', example:'Chị xem giúp em mình đang giống hình nào trong bảng này, khoảng bao nhiêu % mỡ ạ? Và chị muốn giảm về còn khoảng bao nhiêu % ạ?' },
    { title:'[Giảm cân/mỡ] Bước 3 — đã dùng phương pháp gì', example:'Chị đã từng dùng phương pháp nào để giảm chưa ạ? Hiệu quả như nào ạ?' },
    { title:'[Giảm cân/mỡ] Bước 4 — ảnh hưởng thế nào', example:'Việc này đang ảnh hưởng thế nào đến sức khỏe/sự tự tin/công việc của chị ạ?' },
    { title:'[Vấn đề sức khỏe khác] Bước 1 — vấn đề gì', example:'Chị đang gặp vấn đề gì về sức khỏe cần em hỗ trợ ạ?' },
    { title:'[Vấn đề sức khỏe khác] Bước 2 — bao lâu rồi', example:'Tình trạng đó diễn ra bao lâu rồi ạ?' },
    { title:'[Vấn đề sức khỏe khác] Bước 3 — ảnh hưởng cuộc sống', example:'Ảnh hưởng như nào đến cuộc sống của chị ạ (công việc/giấc ngủ/tâm trạng...)?' },
    { title:'[Vấn đề sức khỏe khác] Bước 4 — đã dùng phương pháp gì', example:'Chị đã dùng phương pháp nào để cải thiện tình trạng này chưa ạ?' },
    { title:'[Vấn đề sức khỏe khác] Bước 5 — hiệu quả sao', example:'Nếu có thì chị thấy hiệu quả như nào ạ?' },
    { title:'[Kể chuyện & chốt] Bước 1 — xác nhận lại vấn đề + mong muốn', example:'Vậy là chị đang muốn [đúng mục tiêu chị vừa nói] để [đúng mong muốn chị vừa nói], đúng không ạ?' },
    { title:'[Kể chuyện & chốt] Bước 2 — phân tích hệ quả nếu giữ cách cũ', example:'(1-2 câu: nếu chị tiếp tục theo cách cũ chưa hiệu quả này thì về sau sẽ ảnh hưởng thêm thế nào — dựa đúng điều chị vừa kể, không phóng đại)' },
    { title:'[Kể chuyện & chốt] Bước 3 — kể chuyện bản thân', example:'(Kể chuyện thật của mình: trước đây thế nào → từng khó chịu/mệt mỏi gì giống chị → giải pháp đã giúp mình ra sao → kết quả hiện tại — rồi bắc cầu "Nếu [giải pháp]... thì mình có muốn tìm hiểu cùng em không?")' },
    { title:'[Kể chuyện & chốt] Bước 4 — gửi case tương tự', example:'(Gửi ảnh/case kết quả của người có hoàn cảnh giống chị nhất — tuổi, vấn đề, mục tiêu)' },
    { title:'[Kể chuyện & chốt] Bước 5 — chốt giá 3 mức', example:'(Đưa 3 mức Thấp/Trung bình/Cao, mô tả nội dung/mức hỗ trợ tương xứng — tự điền giá khi trao đổi trực tiếp)' },
    { title:'[Kể chuyện & chốt] Bước 6 — hỏi thẳng chốt', example:'Nếu em có giải pháp giúp chị [đúng điều chị mong muốn ở bước 1] thì chị có muốn đồng hành cùng em không ạ?' },
  ] },
  D: { label:'D — Kinh doanh/Đối tác', steps:[
    { title:'Bước 1 — Sàng lọc khách MỚI (bắt buộc nguyên văn, chỉ đổi xưng hô)', example:'Cảm ơn c đã chủ động nhắn cho e nhé. Để e hiểu rõ hơn rồi định hướng đúng cho c, c chia sẻ thêm vài thông tin nha:\n1. Hiện tại c đang làm công việc gì?\n2. Thu nhập trung bình 1 tháng của c đang ở mức khoảng bao nhiêu? Hiện c có tích luỹ được chứ?\n3. Mục tiêu tài chính của c trong 6–12 tháng tới là gì? Muốn tăng thêm bao nhiêu thu nhập mỗi tháng?\n4. C đang quan tâm phát triển nguồn thu theo hướng nào: online, chăm sóc sức khỏe, hay xây hệ thống lâu dài?\nE hỏi kỹ để xem c phù hợp với mô hình nào nhất — vì team của e đang làm trong ngành chăm sóc sức khỏe & đào tạo phát triển con người, có quy trình rõ ràng, hỗ trợ từng bước, ai mới vào cũng làm được nè' },
    { title:'Bước 2 — Nghe cảm xúc (Lớp 1)', example:'Nghe c nói vậy em hiểu c đang khá [đúng cảm xúc chị vừa thể hiện, VD "lo lắng"/"mệt mỏi"] về chuyện này ạ.' },
    { title:'Bước 2 — Đào lý do đằng sau con số (Lớp 2)', example:'C muốn có thêm khoản đó để làm gì ạ, cho gia đình hay cho riêng c vậy ạ?' },
    { title:'Bước 2 — Khen sự chủ động (Lớp 3)', example:'Em thấy c chịu ngồi lại nhìn thẳng vào vấn đề như này là rất chủ động rồi đó ạ.' },
    { title:'Bước 2 — Kể chuyện bản thân (Lớp 4, viết dài đủ cảm xúc)', example:'(Kể đủ dài: nền tảng trước đây → điều từng bất lực/khó chịu giống c → giải pháp đã "cứu" mình ra sao → kết quả/cảm nhận hiện tại — giữ tinh thần "mình cũng từng như vậy")' },
    { title:'Bước 2 — Vẽ nỗi đau (Lớp 5)', example:'(Dựa công việc/thu nhập c vừa kể, phân tích cụ thể việc hiện tại đang khiến c đánh đổi gì — thời gian/sức khỏe/tự do — để đổi lấy mức thu nhập đó)' },
    { title:'Bước 2 — Vẽ viễn cảnh (Lớp 6)', example:'(Nối ngay sau Lớp 5: nếu có thêm nguồn thu ổn định thì cuộc sống c sẽ khác thế nào)' },
    { title:'Bước 2 — Mời Guide (CTA)', example:'Em có 1 Guide "Tìm Hiểu Kinh Doanh" có bài test tài chính 10 phút với cả video tầm nhìn của bên em nữa, c xem thử không ạ?' },
    { title:'Bước 3 — Xin hẹn giờ TRƯỚC khi gửi Guide', example:'Nếu em gửi Guide, c dành thời gian nghiêm túc vào [tối nay/mai] xem được không ạ?' },
    { title:'Bước 3 — Follow sau khi gửi Guide', example:'C xem/làm xong Guide em gửi chưa ạ?' },
    { title:'Bước 6 — Chốt gói, câu hỏi 1/4', example:'Nếu bắt đầu, c mong có thêm thu nhập khoảng bao nhiêu/tháng thì xứng đáng với thời gian mình bỏ ra ạ?' },
    { title:'Bước 6 — Chốt gói, câu hỏi 2/4', example:'C có thể dành ra bao nhiêu giờ mỗi tuần cho việc này ạ?' },
    { title:'Bước 6 — Chốt gói, câu hỏi 3/4', example:'C dự tính làm trong khoảng bao lâu để đạt được mức đó ạ?' },
    { title:'Bước 6 — Chốt gói, câu hỏi 4/4', example:'Nếu em chỉ cho c cách đạt đúng con số đó, trong đúng khoảng thời gian đó, với đúng số giờ đó mỗi tuần — c có sẵn sàng bắt đầu ngay không ạ?' },
  ] },
};

function render(container, ctx){
  const state = {
    images: [], note: '',
    sanPhamText: '', showSanPham: false, cauChuyen: null, submitting: false, result: null, error: '',
    // AI tự đọc tên khách từ ảnh/mô tả rồi server tự khớp/tạo hồ sơ — không cần gõ/tìm tay nữa
    // (chị Quỳnh yêu cầu 2026-08-29: 1 khách nhắn nhiều lượt, mỗi lượt lại chụp ảnh gửi, gõ tên mỗi
    // lần quá mất công). needsName chỉ bật khi AI THẬT SỰ không đọc được tên nào (xem api/crm-tuvan.js).
    needsName: false, manualName: '',
    // "Ghim" khách đang tiếp tục trong phiên này — gửi known_customer_id ở lượt sau để server chỉ cần
    // GỌI CLAUDE ĐÚNG 1 LẦN có sẵn ngữ cảnh, thay vì phải tự đoán lại từ đầu mỗi ảnh (đỡ tốn gấp đôi
    // lượt AI khi nhắn nhiều tin liên tiếp cho cùng 1 khách — chị Quỳnh phản hồi 2026-08-29).
    activeCustomer: null,
    // Sổ tay tư vấn (2026-08-30): chọn nhánh → xem danh sách bước → bấm 1 bước mới xoè ra câu ví dụ
    // để copy, không hiện tràn hết cùng lúc. expandedSteps là Set các INDEX bước đang mở (đổi nhánh
    // thì reset về rỗng, tránh giữ index của nhánh cũ không khớp).
    guideNhanh: null, expandedSteps: new Set(),
  };

  function draw(){ container.innerHTML = html(); bind(); }

  function copyGuideStep(idx){
    const guide = NHANH_GUIDES[state.guideNhanh];
    const step = guide && guide.steps[idx];
    if(!step) return;
    navigator.clipboard.writeText(step.example).catch(()=>{});
  }

  function persistDraft(){
    saveModuleDraft(ctx, DRAFT_KEY, { images: state.images, note: state.note, activeCustomer: state.activeCustomer });
  }

  function startNewCustomer(){
    state.activeCustomer = null;
    draw();
    persistDraft();
  }

  async function boot(){
    // Ưu tiên hồ sơ "Câu Chuyện Của Bạn" riêng của app này (đúng bộ câu hỏi trên landing page) —
    // chỉ dùng lùi về Định Vị AI (positioning_results, dùng chung Xây Nhân Hiệu) nếu chưa điền hồ sơ
    // riêng (xem cau-chuyen.js — 2 nguồn không bắt buộc cùng lúc).
    const [draft, sanPhamDraft, { data: story }, { data: positioning }] = await Promise.all([
      loadModuleDraft(ctx, DRAFT_KEY),
      loadModuleDraft(ctx, CONTEXT_DRAFT_KEY),
      ctx.supabase.from('crm_story_profiles').select('*').eq('user_id', ctx.user.id).maybeSingle(),
      ctx.supabase.from('positioning_results').select('luot1').eq('user_id', ctx.user.id).maybeSingle(),
    ]);
    if(draft){
      state.images = draft.images || [];
      state.note = draft.note || '';
      state.activeCustomer = draft.activeCustomer || null;
    }
    if(sanPhamDraft && sanPhamDraft.text) state.sanPhamText = sanPhamDraft.text;
    const hasStory = story && story.answers && Object.values(story.answers).some(v=>String(v||'').trim());
    if(hasStory) state.cauChuyen = { nguon:'cau-chuyen', ten: story.ten, zalo: story.zalo, links: story.links, answers: story.answers };
    else if(positioning && positioning.luot1) state.cauChuyen = { nguon:'dinh-vi', luot1: positioning.luot1 };
    else state.cauChuyen = null;
    draw();
  }

  function handleFiles(files){
    Array.from(files).slice(0, MAX_IMAGES - state.images.length).forEach((file)=>{
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
          state.images = [...state.images, c.toDataURL('image/jpeg', 0.82)].slice(0, MAX_IMAGES);
          draw();
          persistDraft();
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  function removeImage(idx){
    state.images = state.images.filter((_,i)=>i!==idx);
    draw();
    persistDraft();
  }

  async function submit(){
    if(!state.images.length && !state.note.trim()){ return; }
    if(state.needsName && !state.manualName.trim()){ state.error = 'Nhập giúp tên khách hàng.'; draw(); return; }
    state.submitting = true; state.error = ''; state.result = null; draw();
    const stopProgress = animateProgressButton(container.querySelector('#tv-submit'), 14, 'Đang phân tích');
    try{
      const data = await callApi('/api/crm-tuvan', {
        images: state.images,
        note: state.note,
        // KHÔNG còn chọn/tìm khách tay — server tự đọc tên khách hàng từ ảnh/mô tả rồi tự khớp hồ sơ
        // cũ hoặc tạo mới (xem api/crm-tuvan.js). manual_ten_khach_hang chỉ gửi khi AI đã báo không
        // đọc được tên ở lượt trước và người dùng vừa gõ bổ sung.
        manual_ten_khach_hang: state.needsName ? state.manualName.trim() : undefined,
        // Gửi lại đúng khách đang ghim (nếu có) để server chỉ cần 1 lượt gọi Claude, không tốn thêm
        // lượt "đoán lại từ đầu" cho mỗi ảnh trong cùng 1 buổi nhắn với 1 khách.
        known_customer_id: state.activeCustomer ? state.activeCustomer.id : undefined,
        san_pham_dich_vu: state.sanPhamText,
        cau_chuyen: state.cauChuyen,
      }, 110000);
      if(data.needsName){
        state.needsName = true;
        state.error = '';
        return;
      }
      state.result = data;
      state.needsName = false; state.manualName = '';
      state.images = []; state.note = '';
      state.activeCustomer = data.customer ? { id: data.customer.id, ten_khach_hang: data.customer.ten_khach_hang } : null;
      persistDraft();
    } catch(e){
      state.error = e.message;
    } finally {
      stopProgress();
      state.submitting = false;
      draw();
    }
  }

  function copyCauChot(){
    if(!state.result) return;
    navigator.clipboard.writeText(state.result.advice.cau_hoi_cau_chot).catch(()=>{});
  }

  function html(){
    return `
      <div class="page-head">
        <h1>Tư Vấn AI</h1>
        <p>Dán ảnh chụp đoạn chat với khách (hoặc mô tả nhanh) — AI đọc, tư vấn câu nên nhắn tiếp theo, và tự lưu vào hồ sơ khách.</p>
      </div>

      <div class="section" style="cursor:pointer;" data-toggle-sanpham="1">
        <h3>Thông tin sản phẩm/dịch vụ đang tư vấn ${state.showSanPham?'▾':'▸'}</h3>
        ${!state.showSanPham ? `<div class="body" style="color:var(--ink-soft);font-size:13px;">${state.sanPhamText ? 'Đã có thông tin — bấm để xem/sửa.' : 'Chưa có — bấm để dán tên gói/giá/link (AI chỉ dùng đúng thông tin ở đây, không tự bịa giá).'}</div>` : ''}
      </div>
      ${state.showSanPham ? `
        <div class="card" style="margin-top:-10px;margin-bottom:20px;">
          <textarea id="tv-sanpham" placeholder="VD: Gói Cân Bằng Chuyển Hóa 1 tháng — 20.000.000đ, link: ...&#10;Gói Xây Nhân Hiệu Zoom 6 buổi — 1.990.000đ, link: ...">${esc(state.sanPhamText)}</textarea>
        </div>
      ` : ''}

      ${state.activeCustomer ? `
        <div class="hint-box" style="margin-top:0;margin-bottom:20px;">
          Đang tiếp tục hồ sơ: <b>${esc(state.activeCustomer.ten_khach_hang)}</b>
          <span style="float:right;cursor:pointer;text-decoration:underline;" id="tv-new-customer">Khách mới</span>
        </div>
      ` : `
        <div class="card" style="margin-bottom:20px;">
          <label style="display:block;font-size:13px;font-weight:600;color:var(--ink-soft);margin-bottom:10px;">Khách mới nhắn tới — chọn nhánh để xem sổ tay từng bước (không tốn lượt AI)</label>
          <div class="chips" style="margin-top:0;">
            ${Object.keys(NHANH_GUIDES).map(k=>`<div class="chip ${state.guideNhanh===k?'selected':''}" data-pick-guide-nhanh="${k}">${esc(NHANH_GUIDES[k].label)}</div>`).join('')}
          </div>
          ${state.guideNhanh ? `
            <div style="margin-top:16px;">
              ${NHANH_GUIDES[state.guideNhanh].steps.map((s,i)=>`
                <div style="border:1px solid var(--line);border-radius:10px;margin-bottom:8px;overflow:hidden;">
                  <div data-toggle-guide-step="${i}" style="padding:12px 14px;cursor:pointer;display:flex;justify-content:space-between;align-items:center;gap:10px;font-size:13.5px;font-weight:600;color:var(--ink);">
                    <span>${esc(s.title)}</span>
                    <span style="color:var(--ink-soft);flex-shrink:0;">${state.expandedSteps.has(i)?'▾':'▸'}</span>
                  </div>
                  ${state.expandedSteps.has(i) ? `
                    <div style="padding:0 14px 14px;">
                      <div class="hint-box" style="white-space:pre-line;margin-top:0;">${esc(s.example)}</div>
                      <div class="btn-row" style="justify-content:flex-start;margin-top:8px;">
                        <span class="btn-ghost btn btn-sm" data-copy-guide-step="${i}">Sao chép</span>
                      </div>
                    </div>
                  ` : ''}
                </div>
              `).join('')}
              <div style="font-size:11.5px;color:var(--ink-soft);margin-top:10px;">Nhắn qua lại trực tiếp với khách theo đúng các bước trên trước — xong rồi mới chụp gộp cả đoạn (tối đa ${MAX_IMAGES} ảnh) gửi 1 lần cho AI phân tích, không cần gọi AI sau mỗi câu hỏi.</div>
            </div>
          ` : ''}
        </div>
      `}

      <div class="card" style="margin-bottom:20px;">
        <label style="display:block;font-size:13px;font-weight:600;color:var(--ink-soft);margin-bottom:10px;">Ảnh chụp đoạn chat (tối đa ${MAX_IMAGES} ảnh) — gộp nhiều tin lại rồi gửi 1 lần cho đỡ tốn lượt</label>
        <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:10px;">
          ${state.images.map((src,i)=>`
            <div style="position:relative;width:90px;height:90px;">
              <img src="${src}" data-zoom-img="${i}" style="width:100%;height:100%;object-fit:cover;border-radius:10px;cursor:zoom-in;border:1px solid var(--line);">
              <span data-remove-img="${i}" style="position:absolute;top:-6px;right:-6px;background:var(--danger);color:#fff;width:20px;height:20px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;cursor:pointer;">✕</span>
            </div>
          `).join('')}
          ${state.images.length<MAX_IMAGES ? `<label style="width:90px;height:90px;border:1px dashed var(--line);border-radius:10px;display:flex;align-items:center;justify-content:center;cursor:pointer;color:var(--ink-soft);font-size:24px;">+<input type="file" accept="image/*" multiple id="tv-file" style="display:none;"></label>` : ''}
        </div>
        <label style="display:block;font-size:13px;font-weight:600;color:var(--ink-soft);margin-bottom:6px;">Mô tả/ghi chú thêm ${state.images.length?'(không bắt buộc nếu đã có ảnh)':''}</label>
        <textarea id="tv-note" placeholder="VD: khách hỏi giá gói 1 tháng, có vẻ đang phân vân...">${esc(state.note)}</textarea>
      </div>

      ${state.needsName ? `
        <div class="card" style="margin-bottom:20px;">
          <div class="hint-box" style="margin-top:0;">AI không đọc được tên khách trong ảnh/mô tả — nhập giúp tên khách hàng để lưu đúng hồ sơ.</div>
          <label style="display:block;font-size:13px;font-weight:600;color:var(--ink-soft);margin:14px 0 6px;">Tên khách hàng</label>
          <input type="text" id="tv-manual-name" placeholder="VD: Chị Lan" value="${esc(state.manualName)}">
        </div>
      ` : ''}

      ${state.error ? `<div class="error-box">${esc(state.error)}</div>` : ''}

      <div class="btn-row" style="justify-content:flex-start;">
        <button class="btn" id="tv-submit" ${state.submitting?'disabled':''}>${state.submitting?'Đang phân tích…':(state.needsName?'Xác nhận tên & tư vấn':'Tư vấn ngay')}</button>
      </div>

      ${state.result ? resultHtml() : ''}
    `;
  }

  function resultHtml(){
    const a = state.result.advice;
    const c = state.result.customer;
    return `
      <div class="page-divider" style="margin:32px 0 20px;"></div>
      <div class="section highlight">
        <h3>Câu nên nhắn ngay</h3>
        <div class="body" style="font-size:16px;font-weight:600;">${esc(a.cau_hoi_cau_chot)}</div>
        <div class="btn-row" style="justify-content:flex-start;margin-top:14px;">
          <span class="btn-ghost btn btn-sm" id="tv-copy">Sao chép</span>
        </div>
      </div>
      <div class="section">
        <h3>Phân tích</h3>
        <div class="body">
          <b>${esc(a.tom_tat)}</b><br><br>
          Nhánh: ${esc(a.nhanh)} — ${esc(a.buoc_hien_tai)}<br>
          Nỗi đau: ${esc(a.phan_tich.noi_dau)}<br>
          Mức sẵn sàng: ${esc(a.phan_tich.san_sang)}<br>
          Giai đoạn: ${esc(a.phan_tich.giai_doan)} — Độ nóng: ${esc(a.phan_tich.do_nong)}
        </div>
      </div>
      ${c ? `<div class="hint-box">✓ Đã lưu vào hồ sơ <b>${esc(c.ten_khach_hang)}</b>${c.ngay_follow_tiep ? ` — hẹn follow ngày ${esc(c.ngay_follow_tiep)}` : ''}. <a href="#khach-hang">Xem trong Khách Hàng →</a></div>` : ''}
    `;
  }

  function bind(){
    const toggleSanPham = container.querySelector('[data-toggle-sanpham]');
    if(toggleSanPham) toggleSanPham.onclick = ()=>{ state.showSanPham = !state.showSanPham; draw(); };
    const sanPhamEl = container.querySelector('#tv-sanpham');
    if(sanPhamEl) sanPhamEl.oninput = (e)=>{ state.sanPhamText = e.target.value; saveModuleDraft(ctx, CONTEXT_DRAFT_KEY, { text: state.sanPhamText }); };

    const manualNameEl = container.querySelector('#tv-manual-name');
    if(manualNameEl) manualNameEl.oninput = (e)=>{ state.manualName = e.target.value; };

    const newCustomerBtn = container.querySelector('#tv-new-customer');
    if(newCustomerBtn) newCustomerBtn.onclick = startNewCustomer;

    container.querySelectorAll('[data-pick-guide-nhanh]').forEach(el=>{
      el.onclick = ()=>{
        const k = el.getAttribute('data-pick-guide-nhanh');
        state.guideNhanh = state.guideNhanh===k ? null : k;
        state.expandedSteps = new Set(); // đổi nhánh reset luôn bước đang mở, tránh lệch index
        draw();
      };
    });
    container.querySelectorAll('[data-toggle-guide-step]').forEach(el=>{
      el.onclick = ()=>{
        const i = Number(el.getAttribute('data-toggle-guide-step'));
        if(state.expandedSteps.has(i)) state.expandedSteps.delete(i); else state.expandedSteps.add(i);
        draw();
      };
    });
    container.querySelectorAll('[data-copy-guide-step]').forEach(el=>{
      el.onclick = (e)=>{ e.stopPropagation(); copyGuideStep(Number(el.getAttribute('data-copy-guide-step'))); };
    });

    const fileEl = container.querySelector('#tv-file');
    if(fileEl) fileEl.onchange = ()=>{ if(fileEl.files.length) handleFiles(fileEl.files); };
    container.querySelectorAll('[data-remove-img]').forEach(el=>{
      el.onclick = ()=>removeImage(Number(el.getAttribute('data-remove-img')));
    });
    container.querySelectorAll('[data-zoom-img]').forEach(el=>{
      el.onclick = ()=>openImageLightbox(state.images[Number(el.getAttribute('data-zoom-img'))]);
    });

    const noteEl = container.querySelector('#tv-note');
    if(noteEl) noteEl.oninput = (e)=>{ state.note = e.target.value; persistDraft(); };

    const submitBtn = container.querySelector('#tv-submit');
    if(submitBtn) submitBtn.onclick = submit;

    const copyBtn = container.querySelector('#tv-copy');
    if(copyBtn) copyBtn.onclick = copyCauChot;
  }

  draw();
  boot();
}

window.Modules = window.Modules || {};
window.Modules['tu-van'] = { title:'Tư Vấn AI', render };
})();
