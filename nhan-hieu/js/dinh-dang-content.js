(function(){
const FORMATS = [
  { id:'text-anh-ai', name:'Text trên ảnh AI',
    ban_chat: 'Dùng hình ảnh AI để truyền tải ý tưởng/cảm xúc trừu tượng. Người xem dừng lại vì ý tưởng được hình ảnh hoá.',
    nganh_phu_hop: ['Tâm thức, triết học, thiền, chữa lành', 'Tài chính, dòng tiền, tư duy giàu', 'Sức khoẻ (não bộ, hormone, tế bào)', 'Khoa học, vũ trụ, công nghệ'],
    nganh_khong_hop: ['Spa','Bất động sản','Mỹ phẩm','Thời trang (cần ảnh thật)'],
    khi_nao_dung: 'Khi cần người xem "hiểu một ý tưởng" hơn là "tin một con người".',
    cach_lam: ['Viết rõ ý tưởng/ẩn dụ muốn truyền tải trước khi tạo ảnh (vd: "phước giống bể chứa, tiền là nước")', 'Dùng công cụ tạo ảnh AI (Midjourney, DALL-E, Canva AI...) mô tả đúng ẩn dụ đó', 'Thêm tiêu đề ngắn, chữ nổi bật đè lên ảnh', 'Giữ phong cách hình ảnh nhất quán qua nhiều bài để nhận diện thương hiệu'],
    ket_luan: 'Mạnh nhất ở giai đoạn thu hút người mới và giáo dục thị trường.' },

  { id:'text-anh-that', name:'Text trên ảnh thật',
    ban_chat: 'Dùng ảnh thật chính chủ + tiêu đề. Người xem ghi nhớ khuôn mặt và năng lượng, ảnh thật bán con người đứng sau ý tưởng.',
    nganh_phu_hop: ['Coach, đào tạo', 'Tài chính, sức khoẻ', 'Phát triển bản thân'],
    nganh_khong_hop: ['F&B','Nội thất','Du lịch'],
    khi_nao_dung: 'Khi người xem cần "tin người chia sẻ" hơn là chỉ "hiểu nội dung".',
    cach_lam: ['Chọn ảnh thật có tính kể chuyện (đang làm việc, đang tương tác) — không cần ảnh tạo dáng đẹp', 'Viết tiêu đề ngắn, đúng 1 ý chính, đặt ở vùng trống của ảnh', 'Tô nổi bật 1-2 từ khoá quan trọng nhất bằng màu khác', 'Ký tên/handle nhỏ ở góc để nhận diện'],
    ket_luan: 'Format mạnh nhất để xây uy tín lâu dài và bán dịch vụ dựa trên con người.' },

  { id:'text-video-ai', name:'Text trên Video AI + Caption',
    ban_chat: 'Dùng video AI (Runway, Kling...) để hình ảnh hoá ý tưởng khó diễn tả bằng máy quay thật. Bán trí tưởng tượng, không bán con người.',
    nganh_phu_hop: ['Tâm thức (luật nhân quả, phước)', 'Tài chính (dòng tiền)', 'Giáo dục', 'Sức khoẻ (não, gan)'],
    nganh_khong_hop: ['Spa','Bất động sản','Review sản phẩm (cần ảnh thật)'],
    khi_nao_dung: 'Khi cần "hình dung ý tưởng" hơn là "làm quen người nói".',
    cach_lam: ['Viết kịch bản 1 ẩn dụ ngắn (vd: "cây khô xanh lại = phước đang được nuôi dưỡng")', 'Tạo video AI minh hoạ đúng ẩn dụ đó', 'Thêm caption/text ngắn giải thích thông điệp', 'Không lạm dụng — xen kẽ với video người thật để giữ kết nối'],
    ket_luan: 'Mạnh nhất để viral, thu hút người mới, biến cái vô hình thành cái nhìn thấy được.' },

  { id:'text-video-that', name:'Text trên Video thật + Caption',
    ban_chat: 'Video quay thật (không cần nói) + text truyền tải thông điệp. Video tạo cảm xúc/tin tưởng, text tạo nhận thức.',
    nganh_phu_hop: ['Coach, đào tạo', 'Sức khoẻ, tài chính', 'Phát triển bản thân', 'Lifestyle'],
    nganh_khong_hop: ['Content quá nhiều bước/biểu đồ phức tạp'],
    khi_nao_dung: 'Khi người xem cần "hiểu bạn là ai" hơn là chỉ kiến thức.',
    cach_lam: ['Quay 1 hành động đời thường liên quan chủ đề (đi bộ, pha đồ uống, đọc sách, đào tạo)', 'Chọn đúng đoạn có cảm xúc/năng lượng phù hợp thông điệp', 'Viết text ngắn gọn, khớp đúng hình ảnh đang chiếu (không nói 1 đằng quay 1 nẻo)', 'Thêm caption dài hơn bên dưới để đào sâu ý'],
    ket_luan: 'Format toàn diện nhất để xây nhân hiệu — lựa chọn ưu tiên số 1 để phát triển kênh bền vững.' },

  { id:'video-ngoi-noi', name:'Video Ngồi Nói',
    ban_chat: 'Xuất hiện trực tiếp, bán chính con người và năng lực. Người xem đánh giá tư duy, thần thái, chuyên môn.',
    nganh_phu_hop: ['Coach, đào tạo', 'Sức khoẻ, tài chính', 'Phát triển bản thân', 'Tuyển dụng'],
    nganh_khong_hop: ['Thời trang','Makeup','Nấu ăn','Review sản phẩm (cần trải nghiệm trực quan)'],
    khi_nao_dung: 'Khi cần "tin vào con người" hơn là chỉ "hiểu nội dung".',
    cach_lam: ['Chọn 1 vấn đề/câu hỏi cụ thể làm chủ đề (không nói chung chung)', 'Mở đầu bằng hook trong 3 giây đầu, không lan man giới thiệu', 'Phân tích sâu, kể chuyện thật hoặc phản biện — tránh biến thành bài giảng', 'Kết bằng 1 CTA rõ ràng, khớp mục tiêu bài'],
    ket_luan: 'Format chuyển đổi mạnh nhất — không thể thiếu nếu muốn xây doanh nghiệp dựa trên nhân hiệu.' },

  { id:'pov', name:'POV (First Person View)',
    ban_chat: 'Quay theo góc nhìn người thực hiện. Người xem "nhập vai" thành bạn thay vì chỉ quan sát.',
    nganh_phu_hop: ['F&B, Beauty', 'Sức khoẻ', 'Nghề thủ công', 'Du lịch, Review (có hành động trực quan)'],
    nganh_khong_hop: ['Ngành thuần nói/tư duy (luật, tài chính, giảng bài chuyên sâu)'],
    khi_nao_dung: 'Khi công việc của bạn có nhiều hành động đáng xem (không phải hỏi "ngành mình hợp không").',
    cach_lam: ['Gắn camera/điện thoại theo góc tay cầm hoặc góc nhìn thẳng', 'Chọn công việc có chuyển động liên tục (pha chế, nấu ăn, đóng gói, setup)', 'Tận dụng âm thanh/màu sắc thật để kích thích giác quan', 'Giữ nhịp cắt nhanh, không dừng quá lâu ở 1 cảnh'],
    ket_luan: 'Mạnh nhất để đưa người xem vào trải nghiệm thực tế, tăng thời gian xem và tỷ lệ giữ chân.' },

  { id:'vlog', name:'Vlog (kể chuyện bằng cuộc sống)',
    ban_chat: 'Hành trình đồng hành cùng người xem qua lăng kính cá nhân — không chỉ quay cảnh mà kể chuyện qua trải nghiệm thật.',
    nganh_phu_hop: ['Chuyên gia/CEO, kinh doanh', 'Sức khoẻ, F&B', 'Giáo dục, Beauty'],
    nganh_khong_hop: ['Chỉ đọc kiến thức, phân tích quá sâu mà thiếu hành động thực tế'],
    khi_nao_dung: 'Khi muốn người xem không chỉ mua sản phẩm mà mua "con người" và "phong cách sống" của bạn.',
    cach_lam: ['Chọn 1 thông điệp xuyên suốt cho cả video — tránh quay mọi thứ không chủ đích', 'Ghép nhiều lát cắt trong ngày/sự kiện thành 1 mạch chuyện (setup - khó khăn - kết quả)', 'Có thể lồng ghép POV, video ngồi nói, timelapse bên trong', 'Kết bằng 1 giá trị/bài học rút ra, không chỉ dừng ở "hết 1 ngày"'],
    ket_luan: 'Là "format mẹ" — nơi có thể lồng ghép nhiều format khác để kể 1 hành trình đầy cảm hứng.' },

  { id:'take-note-ai', name:'Take note viết bằng AI',
    ban_chat: 'Biến kiến thức dài thành ghi chú ngắn gọn, dễ tiêu hoá qua AI — dạng ảnh ghi chú, carousel, slide ngắn hoặc video chữ chạy.',
    nganh_phu_hop: ['Giáo dục, tài chính', 'Sức khoẻ, marketing (checklist, quy trình, framework)'],
    nganh_khong_hop: ['Ngành cần trải nghiệm thị giác (F&B, du lịch, thời trang)'],
    khi_nao_dung: 'Khi muốn hệ thống hoá 1 kiến thức phức tạp thành thứ dùng ngay được.',
    cach_lam: ['Chọn 1 kiến thức/quy trình cụ thể (vd: "5 bước dùng AI viết content")', 'Dùng AI tóm tắt thành các bước/gạch đầu dòng ngắn gọn', 'Trình bày dạng ảnh ghi chú hoặc carousel nhiều slide, 1 trang = 1 ý lớn', 'Tránh viết chung chung như sách giáo khoa — phải dùng được ngay'],
    ket_luan: 'Mạnh để hệ thống hoá tri thức, tăng tỷ lệ lưu bài, khiến người xem quay lại học tiếp.' },

  { id:'ghi-chu-viet-tay-ai', name:'Ghi chú viết tay AI',
    ban_chat: 'Dùng AI tạo hình ảnh giống sổ tay thật: chữ viết, mũi tên, sơ đồ nhỏ — tạo cảm giác thân mật, học thật, ghi chép thật.',
    nganh_phu_hop: ['Giáo dục, tài chính', 'Sức khoẻ, marketing, AI, phát triển bản thân'],
    nganh_khong_hop: ['F&B','Thời trang','Du lịch (cần hình ảnh thực tế cao)'],
    khi_nao_dung: 'Khi muốn tạo cảm giác gần gũi, học thật hơn là ảnh AI trừu tượng thông thường.',
    cach_lam: ['Chọn 1 nội dung dạng checklist/mindmap/công thức/quy trình', 'Mô tả cho AI tạo ảnh phong cách sổ tay viết tay, có mũi tên/khung/gạch chân', 'Giữ 1 trang = 1 ý lớn, chữ to, dễ đọc, có khoảng trắng', 'Đăng kèm caption giải thích ngắn'],
    ket_luan: 'Biến kiến thức thành tài liệu dễ lưu, dễ học — tăng cảm giác gần gũi với người xem.' },

  { id:'case-study', name:'Case Study (chứng minh)',
    ban_chat: 'Dùng kết quả thực tế để chứng minh phương pháp hiệu quả. Khác feedback ở chỗ có phân tích vì sao có kết quả — feedback là chứng thực, case study là chứng minh.',
    nganh_phu_hop: ['Sức khoẻ, coaching', 'Tài chính, kinh doanh', 'Beauty, giáo dục'],
    nganh_khong_hop: ['Triết lý chung chung, tin tức, khoe thành tích đơn thuần'],
    khi_nao_dung: 'Khi cần bằng chứng cụ thể để chuyển đổi người đang phân vân.',
    cach_lam: ['Trả lời 4 câu hỏi: xuất phát điểm là gì, đã thay đổi điều gì, điều gì tạo ra kết quả, người xem học được gì', 'Kể theo trình tự trước - sau, có số liệu hoặc thay đổi cụ thể', 'Phân tích rõ NGUYÊN NHÂN tạo ra kết quả, không chỉ khoe kết quả', 'Kết bằng bài học người xem có thể áp dụng ngay'],
    ket_luan: 'Biến lời hứa thành bằng chứng — chìa khoá chuyển đổi mạnh nhất.' },

  { id:'livestream', name:'Livestream / Mini Q&A',
    ban_chat: 'Tương tác 2 chiều, xử lý câu hỏi thời gian thực. Xây dựng niềm tin mạnh nhất qua tư duy và phản ứng thực tế.',
    nganh_phu_hop: ['Coaching, sức khoẻ', 'Tài chính, kinh doanh', 'Giáo dục, beauty'],
    nganh_khong_hop: ['Giải trí ngắn, meme, video hài, nội dung thư giãn thuần tuý'],
    khi_nao_dung: 'Khi cần xử lý niềm tin và chốt nhu cầu nhanh cho tệp đang phân vân.',
    cach_lam: ['Chuẩn bị 3-5 câu hỏi thường gặp để mở đầu, tránh im lặng lúc mới vào live', 'Giữ tỷ lệ 30% chia sẻ - 70% tương tác/trả lời câu hỏi', 'Tránh biến livestream thành bài giảng 1 chiều', 'Cắt lại đoạn hay thành Reel/Video/Carousel để tái sử dụng sau live'],
    ket_luan: 'Mạnh nhất để xây niềm tin và chuyển đổi thông qua tương tác trực tiếp.' },

  { id:'meme-trend', name:'Meme / Bắt Trend',
    ban_chat: 'Tận dụng xu hướng đang hot để lồng ghép thông điệp riêng. Mục tiêu là dùng trend để nói câu chuyện của mình, không chỉ để có view.',
    nganh_phu_hop: ['Giải trí, creator, KOC', 'Review, giáo dục', 'Sức khoẻ, tài chính'],
    nganh_khong_hop: ['Chuyên gia/bác sĩ (không nên lấy làm chủ lực, ảnh hưởng hình ảnh chuyên môn)'],
    khi_nao_dung: 'Khi muốn tăng nhận diện nhanh, nhưng cần kiểm soát để không lệch định vị.',
    cach_lam: ['Chọn trend đang lên phù hợp giọng thương hiệu, bỏ qua trend không liên quan dù đang hot', 'Lồng ghép góc nhìn/chuyên môn riêng vào trend đó thay vì bắt chước y nguyên', 'Áp dụng theo 4 cấp độ: bắt trend 100% → trend + góc nhìn → trend + chuyên môn → tự tạo trend', 'Giữ tần suất thấp, không để trend chiếm phần lớn lịch đăng bài'],
    ket_luan: 'Trend chỉ là chiếc xe, thông điệp mới là đích đến — dùng để kéo người xem vào sâu hơn, không phải mục tiêu cuối.' },
];

function imgSrc(id){ return `assets/formats/${id}.jpg`; }

function render(container, ctx){
  const state = { query:'', positioning:null, suggestLoading:false, suggestions:null, suggestError:null, chosen:[] };

  function draw(){ container.innerHTML = html(); bind(); }

  // Gợi ý AI được lưu vào positioning_results.format_suggestions, tính đúng 1 lần ngay khi có
  // Định Vị mới — không gọi lại AI mỗi lần mở trang/đăng nhập. Định Vị sẽ tự xoá cache này
  // (đặt về null) mỗi khi Lượt 1 được tạo lại, để lần mở Dạng Content tiếp theo tính lại đúng 1 lần.
  async function boot(){
    draw();
    const { data: pos } = await ctx.supabase.from('positioning_results').select('*').eq('user_id', ctx.user.id).maybeSingle();
    state.positioning = pos || null;
    state.chosen = (pos && pos.chosen_formats) || [];
    if(pos && pos.format_suggestions){
      state.suggestions = pos.format_suggestions;
    }
    draw();
    if(pos && pos.luot1 && !pos.format_suggestions) fetchSuggestions();
    // Đến từ nút "Xem cách làm dạng này" ở Viết Content (đã chọn đúng dạng cụ thể) — cuộn thẳng
    // tới đúng dạng đó thay vì luôn về dạng đầu tiên của danh sách.
    if(window.PendingFormatJump){
      const id = window.PendingFormatJump; window.PendingFormatJump = null;
      setTimeout(()=>{
        const target = container.querySelector(`#fmt-${id}`);
        if(target) target.scrollIntoView({ behavior:'smooth', block:'start' });
      }, 50);
    }
  }

  async function fetchSuggestions(){
    state.suggestLoading = true; state.suggestError = null; draw();
    const stopProgress = animateProgressBar(container.querySelector('#progress-bar-el-fmt'), 25);
    try{
      const data = await callApi('/api/goi-y-dinh-dang', { positioning: { luot1: state.positioning.luot1, luot2: state.positioning.luot2 } });
      state.suggestions = data.result.goi_y;
      await ctx.supabase.from('positioning_results').update({ format_suggestions: state.suggestions }).eq('user_id', ctx.user.id);
    } catch(e){ state.suggestError = e.message; }
    stopProgress();
    state.suggestLoading = false;
    draw();
  }

  async function toggleChosen(id){
    state.chosen = state.chosen.includes(id) ? state.chosen.filter(x=>x!==id) : [...state.chosen, id];
    draw();
    if(!state.positioning) return; // chưa có hàng positioning_results (chưa làm Định Vị) thì chỉ giữ tạm trên màn hình
    await ctx.supabase.from('positioning_results').update({ chosen_formats: state.chosen }).eq('user_id', ctx.user.id);
  }

  function filtered(){
    if(!state.query.trim()) return FORMATS;
    const q = state.query.toLowerCase();
    return FORMATS.filter(f =>
      f.name.toLowerCase().includes(q) ||
      f.nganh_phu_hop.some(n=>n.toLowerCase().includes(q))
    );
  }

  function suggestBlock(){
    if(!state.positioning || !state.positioning.luot1){
      return `<div class="hint-box" style="margin-bottom:20px;">Hoàn thành <a href="#dinh-vi">Định Vị</a> trước để được gợi ý đúng 2-3 dạng content phù hợp nhất với trục nội dung của bạn.</div>`;
    }
    if(state.suggestLoading){
      return `<div class="loading" style="padding:30px 0;"><p>Đang chọn dạng phù hợp với định vị của bạn…</p><div id="progress-bar-el-fmt" style="margin-top:12px;">${progressBarHtml(0)}</div></div>`;
    }
    if(state.suggestError){
      return `<div class="error-box" style="margin-bottom:20px;">${esc(state.suggestError)}</div><div class="btn-row" style="margin-bottom:20px;"><button class="btn" data-action="retry-suggest">Thử lại</button></div>`;
    }
    if(!state.suggestions) return '';
    return `
      <div class="page-head" style="margin-bottom:14px;"><div class="tag">Gợi ý riêng cho bạn</div><h1 style="font-size:20px;">2-3 dạng phù hợp nhất với trục nội dung của bạn</h1></div>
      <div style="display:flex;gap:16px;flex-wrap:wrap;margin-bottom:28px;">
        ${state.suggestions.map(s=>{
          const f = FORMATS.find(x=>x.name===s.dinh_dang);
          return `<div class="section highlight-dark" style="flex:1;min-width:240px;margin-bottom:0;">
            <h3>${esc(s.dinh_dang)}</h3>
            <div class="body">${escBold(breakSentences(s.ly_do))}</div>
            ${f?`<div class="btn-row" style="margin-top:14px;"><a class="btn-ghost btn" style="background:#fff;" href="#fmt-${f.id}" data-jump="${f.id}">Xem cách làm →</a></div>`:''}
          </div>`;
        }).join('')}
      </div>
    `;
  }

  function html(){
    const list = filtered();
    return `
      <div class="page-head"><h1>Dạng Content</h1><p>AI gợi ý 2-3 dạng phù hợp nhất với trục nội dung của bạn — vẫn hiển thị đủ các dạng còn lại để tham khảo, bạn có thể tự bấm "Chọn dạng này" ở bất kỳ dạng nào mình thấy hợp.</p></div>
      ${suggestBlock()}
      <div class="card" style="margin-bottom:20px;">
        <input type="text" id="fmt-search" placeholder="Tìm theo tên dạng content hoặc ngành, ví dụ: sức khoẻ, coach, video..." value="${esc(state.query)}"
          style="width:100%;padding:12px 14px;border:1px solid var(--line);border-radius:10px;font-size:14.5px;background:#FDFCF8;">
      </div>
      ${list.length===0 ? `<div style="color:var(--ink-soft);">Không tìm thấy dạng content phù hợp với từ khoá này.</div>` : ''}
      ${list.map(f=>{
        const isChosen = state.chosen.includes(f.id);
        return `
        <div class="section" id="fmt-${f.id}" style="${isChosen?'border-color:var(--accent);':''}">
          <div style="display:flex;gap:18px;flex-wrap:wrap;">
            <img src="${imgSrc(f.id)}" alt="Ví dụ ${esc(f.name)}" data-zoom-src="${imgSrc(f.id)}" data-zoom-alt="Ví dụ ${esc(f.name)}" title="Bấm để xem ảnh lớn" style="width:130px;border-radius:8px;border:1px solid var(--line);flex-shrink:0;object-fit:cover;cursor:zoom-in;">
            <div style="flex:1;min-width:200px;">
              <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;flex-wrap:wrap;">
                <h3>${esc(f.name)}</h3>
                <span class="${isChosen?'btn':'btn-ghost btn'} btn-sm" style="white-space:nowrap;" data-choose="${f.id}">${isChosen?'✓ Đã chọn':'Chọn dạng này'}</span>
              </div>
              <div class="body">${esc(f.ban_chat)}</div>
            </div>
          </div>
          <div class="sub-grid" style="margin-top:14px;">
            <div><div class="k">Ngành phù hợp</div><div class="v">${f.nganh_phu_hop.map(n=>`<b>${esc(n)}</b>`).join('<br>')}</div></div>
            <div><div class="k">Không phù hợp</div><div class="v">${f.nganh_khong_hop.map(n=>`<b>${esc(n)}</b>`).join('<br>')}</div></div>
          </div>
          <div class="k" style="margin-top:14px;">Khi nào dùng</div>
          <div class="v">${esc(f.khi_nao_dung)}</div>
          <div class="k" style="margin-top:14px;">Cách làm</div>
          <ul>${f.cach_lam.map(s=>`<li>${esc(s)}</li>`).join('')}</ul>
          <div class="body" style="margin-top:10px;background:var(--accent-soft);padding:12px;border-radius:8px;"><b>Kết luận:</b> ${esc(f.ket_luan)}</div>
          ${(f.id==='text-anh-ai' || f.id==='text-anh-that') ? `<div class="btn-row" style="margin-top:14px;"><a class="btn-ghost btn" href="#tao-anh">Tạo ảnh ngay →</a></div>` : ''}
        </div>
      `;
      }).join('')}
    `;
  }

  function bind(){
    const search = container.querySelector('#fmt-search');
    if(search){
      search.oninput = () => { state.query = search.value; draw(); container.querySelector('#fmt-search').focus(); };
    }
    const retry = container.querySelector('[data-action="retry-suggest"]');
    if(retry) retry.onclick = fetchSuggestions;
    container.querySelectorAll('[data-jump]').forEach(el=>{
      el.onclick = (e) => {
        e.preventDefault();
        const target = container.querySelector(`#fmt-${el.getAttribute('data-jump')}`);
        if(target) target.scrollIntoView({ behavior:'smooth', block:'start' });
      };
    });
    container.querySelectorAll('[data-choose]').forEach(el=>{
      el.onclick = () => toggleChosen(el.getAttribute('data-choose'));
    });
    container.querySelectorAll('[data-zoom-src]').forEach(img=>{
      img.onclick = () => openImageLightbox(img.getAttribute('data-zoom-src'), img.getAttribute('data-zoom-alt'));
    });
  }

  boot();
}

window.Modules = window.Modules || {};
window.Modules['dinh-dang-content'] = { title:'12 Dạng Content', render };
window.CONTENT_FORMATS = FORMATS;
})();
