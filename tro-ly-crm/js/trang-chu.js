(function(){
function render(container, ctx){
  const state = {
    loading:true, dueCount:0, dueRows:[], totalCustomers:0,
    // Đối tác cần huấn luyện (2026-08-30) — triage kiểu "Cần follow hôm nay" nhưng cho nhịp huấn
    // luyện đối tác: 1 leader bảo trợ nhiều người không rà tay từng hồ sơ được, cần 1 danh sách
    // "ai đang chậm/rớt nhịp" bật lên ngay ở Trang chủ để gọi hỗ trợ kịp thời.
    coachingRows: [],
    // Hướng dẫn sử dụng (2026-08-30, chị Quỳnh yêu cầu: "1 mục hướng dẫn sử dụng app ở trang chủ
    // thật chi tiết, ấn vào ra popup") — nội dung tĩnh, dùng <details> native để mỗi phần tự
    // đóng/mở, không cần quản lý state riêng cho từng mục.
    showGuide: false,
  };

  function draw(){ container.innerHTML = html(); bind(); }

  async function load(){
    const todayIso = isoDate(new Date());
    const [{ data: due }, { count }, { data: partners }] = await Promise.all([
      ctx.supabase.from('crm_customers').select('id,ten_khach_hang,do_nong,ngay_follow_tiep').eq('user_id', ctx.user.id).lte('ngay_follow_tiep', todayIso).order('ngay_follow_tiep', { ascending:true }).limit(20),
      ctx.supabase.from('crm_customers').select('id', { count:'exact', head:true }).eq('user_id', ctx.user.id),
      ctx.supabase.from('crm_customers').select('id,ten_khach_hang,doi_tac_tuan_hien_tai,doi_tac_trang_thai').eq('user_id', ctx.user.id).eq('la_doi_tac', true),
    ]);
    state.dueRows = due || [];
    state.dueCount = state.dueRows.length;
    state.totalCustomers = count || 0;
    // Chỉ nổi lên đối tác CHƯA đúng nhịp — "đúng nhịp" rồi thì không cần leader chú ý ngay.
    state.coachingRows = (partners || []).filter(p => {
      const t = (p.doi_tac_trang_thai || '').toLowerCase();
      return !t || t.includes('chậm') || t.includes('rớt') || t.includes('trễ');
    });
    state.loading = false;
    draw();
  }

  function isoDate(d){
    const tzOffset = d.getTimezoneOffset() * 60000;
    return new Date(d - tzOffset).toISOString().slice(0,10);
  }

  const QUICK_LINKS = [
    { key:'tu-van', icon:'💬', label:'Tư Vấn AI', desc:'Dán ảnh chụp chat, nhận câu tư vấn dùng ngay' },
    { key:'khach-hang', icon:'📇', label:'Khách Hàng', desc:'Xem/lọc toàn bộ hồ sơ khách đang chăm sóc' },
    { key:'doi-tac', icon:'🚀', label:'Đối Tác', desc:'Theo dõi nhịp huấn luyện đối tác kinh doanh' },
    { key:'case-study', icon:'🗂️', label:'Kho Case Study', desc:'Lưu case khách cũ (hình + câu chuyện) để dùng lại khi tư vấn' },
    { key:'cau-chuyen', icon:'📖', label:'Câu Chuyện Của Bạn', desc:'Hồ sơ giúp AI tư vấn đúng giọng, đúng câu chuyện thật' },
    { key:'nang-cap', icon:'💳', label:'Nâng Cấp', desc:'Xem gói và gia hạn' },
  ];

  function html(){
    const name = (ctx.profile && ctx.profile.full_name) || '';
    return `
      <div class="page-head">
        <h1>Chào ${esc(name || 'bạn')} 👋</h1>
        <p>Trợ Lý AI Tư Vấn &amp; CRM — tư vấn khách hàng đúng quy trình, CRM tự lưu, tự nhắc lịch follow.</p>
      </div>

      <div class="source-card" data-open-guide="1" style="text-align:left;display:flex;align-items:center;gap:14px;margin-bottom:20px;cursor:pointer;">
        <div class="ic" style="margin-bottom:0;">📘</div>
        <div>
          <div class="label" style="font-size:14.5px;">Hướng dẫn sử dụng</div>
          <div style="font-size:12px;color:var(--ink-soft);margin-top:2px;">Xem chi tiết cách dùng từng mục — Tư Vấn AI, Khách Hàng, Đối Tác, Case Study, Câu Chuyện, thông báo...</div>
        </div>
      </div>

      ${state.loading ? `<div class="loading"><div class="spinner"></div></div>` : `
        <div class="section ${state.dueCount>0?'highlight':''}">
          <h3>Cần follow hôm nay${state.dueCount>0?` (${state.dueCount})`:''}</h3>
          ${state.dueRows.length===0
            ? `<div class="body" style="color:var(--ink-soft);">Không có khách nào tới hạn follow hôm nay.</div>`
            : state.dueRows.map(r=>`
              <div class="list-item" data-goto-customer="${r.id}" style="cursor:pointer;">
                <div class="txt">
                  <div class="meta">${r.ngay_follow_tiep ? (new Date(r.ngay_follow_tiep).getTime()<Date.now()-86400000 ? 'Quá hạn' : 'Hôm nay') : ''} · ${esc(r.do_nong||'')}</div>
                  ${esc(r.ten_khach_hang)}
                </div>
              </div>
            `).join('')}
        </div>

        <div class="source-grid" style="margin-bottom:24px;">
          <div class="source-card" style="cursor:default;">
            <div class="ic">📇</div>
            <div class="label">${state.totalCustomers} khách đang quản lý</div>
          </div>
        </div>

        ${state.coachingRows.length > 0 ? `
          <div class="section highlight">
            <h3>Đối tác cần huấn luyện (${state.coachingRows.length})</h3>
            ${state.coachingRows.map(r=>`
              <div class="list-item" data-goto-partner="${r.id}" style="cursor:pointer;">
                <div class="txt">
                  <div class="meta">Tuần ${r.doi_tac_tuan_hien_tai||1}/8 · ${esc(r.doi_tac_trang_thai||'Chưa cập nhật trạng thái')}</div>
                  ${esc(r.ten_khach_hang)}
                </div>
              </div>
            `).join('')}
          </div>
        ` : ''}
      `}

      <div class="page-head" style="margin-bottom:12px;"><h2 style="font-size:17px;">Bắt đầu từ đâu</h2></div>
      <div class="source-grid" style="margin-bottom:24px;">
        ${QUICK_LINKS.map(l=>`
          <div class="source-card" data-goto="${l.key}">
            <div class="ic">${l.icon}</div>
            <div class="label">${esc(l.label)}</div>
            <div style="font-size:11.5px;color:var(--ink-soft);margin-top:4px;">${esc(l.desc)}</div>
          </div>
        `).join('')}
      </div>

      ${state.showGuide ? guideHtml() : ''}
    `;
  }

  // Nội dung tĩnh, không cần gọi AI — viết đủ chi tiết để người mới dùng (leader trong team, không
  // chỉ riêng chị Quỳnh) tự đọc hiểu được hết luồng, không cần hỏi lại.
  function guideSection(icon, title, bodyHtml){
    return `
      <details class="kt-section" style="margin-bottom:10px;">
        <summary class="kt-summary">${icon} ${esc(title)}</summary>
        <div style="margin-top:10px;font-size:13.5px;line-height:1.7;color:var(--ink);">${bodyHtml}</div>
      </details>
    `;
  }

  function guideHtml(){
    return `
      <div id="guide-overlay" style="position:fixed;inset:0;z-index:9998;background:rgba(20,24,20,.6);display:flex;justify-content:center;padding:24px 16px;overflow-y:auto;">
        <div data-modal-box style="background:var(--panel);border-radius:14px;max-width:640px;width:100%;padding:26px 24px;box-shadow:0 12px 40px rgba(0,0,0,.4);height:fit-content;margin:0 auto;">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;margin-bottom:6px;">
            <h2 style="font-family:'Playfair Display',serif;font-size:20px;">Hướng dẫn sử dụng</h2>
            <span id="guide-close" style="cursor:pointer;font-size:20px;color:var(--ink-soft);line-height:1;">✕</span>
          </div>
          <div class="hint-box" style="margin-top:10px;">Luồng dùng hàng ngày gợi ý: nhắn qua lại với khách theo <b>sổ tay ở Tư Vấn AI</b> trước (miễn phí, không tốn lượt AI) → khi đã đủ nội dung mới chụp gộp ảnh gửi AI phân tích 1 lần → kết quả tự lưu vào <b>Khách Hàng</b> → khách chốt gói kinh doanh thì chuyển sang <b>Đối Tác</b> để huấn luyện tiếp.</div>

          ${guideSection('💬', 'Tư Vấn AI', `
            <p><b>1. Dán "Thông tin sản phẩm/dịch vụ" trước</b> (bấm vào mục này ở đầu trang) — gõ đúng tên gói, giá, link đang bán. AI chỉ dùng đúng thông tin ở đây khi chốt giá, không tự bịa số — nên điền càng đủ càng chốt giá chính xác.</p>
            <p><b>2. Khi khách mới nhắn tới:</b> chọn nhánh <b>A — Sức khỏe</b> hoặc <b>D — Kinh doanh/Đối tác</b>, rồi chọn đúng tình huống (VD "Giảm cân/giảm mỡ") để mở sổ tay — danh sách các bước tư vấn kèm câu ví dụ cụ thể, bấm từng bước để xem, bấm "Sao chép" để dán thẳng cho khách. Việc này KHÔNG tốn lượt AI — tự soạn sẵn, dùng lại nhiều lần.</p>
            <p>Một số bước tự động lấy đúng dữ liệu thật của bạn: bước "Kể chuyện bản thân" lấy từ <b>Câu Chuyện Của Bạn</b>, bước "Gửi case tương tự" lấy từ <b>Kho Case Study</b>, bước "Chốt giá" lấy từ "Thông tin sản phẩm/dịch vụ" — chưa điền các mục này thì bước đó sẽ nhắc bạn đi điền trước.</p>
            <p><b>3. Sau khi nhắn đủ theo sổ tay:</b> chụp gộp cả đoạn chat (tối đa 10 ảnh) hoặc viết mô tả ngắn, bấm <b>"Tư vấn ngay"</b> — AI đọc và tự lưu thẳng vào hồ sơ khách trong Khách Hàng (tạo mới nếu chưa có, cập nhật nếu đã có), kèm gợi ý câu nên nhắn tiếp theo.</p>
            <p>Nếu AI không đọc được tên khách trong ảnh, app sẽ hỏi bạn nhập tay tên khách trước khi lưu. Đang nhắn tiếp cùng 1 khách thì app tự "ghim" hồ sơ đó (hiện dòng "Đang tiếp tục hồ sơ") — bấm "Khách mới" nếu muốn bắt đầu khách khác.</p>
          `)}

          ${guideSection('📇', 'Khách Hàng', `
            <p>5 tab lọc theo việc cần làm: <b>Cần follow</b> (khách tới hạn/quá hạn follow hôm nay), <b>Đang chăm sóc</b>, <b>Đã chốt</b>, <b>Mất</b>, <b>Tất cả</b>.</p>
            <p><b>Thêm khách thủ công:</b> bấm nút <b>"+ Thêm khách"</b> ở đầu trang — tự nhập tên, leader phụ trách, kênh, link liên hệ, tỉnh/thành, độ nóng, giai đoạn, ngày follow tiếp mà không cần qua Tư Vấn AI. Dùng khi bạn muốn tạo hồ sơ trước rồi mới tư vấn sau, hoặc khách đến từ nguồn không có ảnh chat.</p>
            <p>Bấm vào 1 thẻ khách để xem/sửa chi tiết đầy đủ — chia theo khối: <b>Thông tin cơ bản</b>, <b>Nhu cầu &amp; rào cản</b>, <b>Giải pháp &amp; tiến triển</b>, và <b>FORM-HD</b> (chỉ hiện với khách nhánh D — khung F/O/R/M/H/D giúp hiểu sâu hoàn cảnh trước khi mời làm đối tác).</p>
            <p>Chỉ số <b>"Số lần tiếp xúc"</b> đếm theo NGÀY KHÁC NHAU đã tương tác (không phải số tin nhắn) — nguyên tắc bán hàng cần 4-6 lần chạm khác ngày mới đủ để 1 khách chốt, nhắn 5 tin trong 1 buổi vẫn chỉ tính 1 lần.</p>
            <p>Khi khách đã chốt gói kinh doanh và trở thành đối tác, bấm <b>"🚀 Chuyển thành đối tác"</b> trong chi tiết khách rồi bấm Lưu — khách sẽ chuyển hẳn sang mục <b>Đối Tác</b>, không còn hiện ở Khách Hàng nữa.</p>
          `)}

          ${guideSection('🚀', 'Đối Tác', `
            <p>Quản lý riêng những người đã trở thành đối tác kinh doanh — nhịp theo dõi khác hẳn khách hàng (huấn luyện/nhân bản, không phải chốt sale).</p>
            <p>Mỗi đối tác theo dõi gọn theo <b>tuần (1-8)</b>, <b>điểm tuần</b>, <b>trạng thái nhịp</b> (Đúng nhịp/Chậm nhịp/Rớt nhịp), lý do họ làm (WHY), rào cản hiện tại, việc bạn cần hỗ trợ tiếp theo. Bấm vào ô "Nội dung tuần X" để xem chủ đề/đầu việc trọng tâm tuần đó.</p>
            <p>Tab <b>"Cần huấn luyện"</b> lọc sẵn ai đang chậm/rớt nhịp hoặc chưa cập nhật trạng thái — ưu tiên gọi/nhắn những người này trước. Mục này cũng tự nổi lên ở Trang chủ.</p>
            <p>Nếu lỡ chuyển nhầm hoặc đối tác ngừng hoạt động kinh doanh nhưng vẫn là khách hàng bình thường, bấm <b>"Chuyển về khách hàng thường"</b> trong chi tiết — dữ liệu huấn luyện vẫn được giữ lại.</p>
          `)}

          ${guideSection('🗂️', 'Kho Case Study', `
            <p>Nơi lưu case khách cũ (câu chuyện + hình ảnh minh chứng) để dùng lại khi tư vấn khách mới, thay vì phải nhớ/tìm lại thủ công mỗi lần.</p>
            <p>Bấm <b>"+ Thêm case study"</b>, viết câu chuyện (trước đây thế nào, dùng giải pháp gì, kết quả ra sao), đính kèm tối đa 4 ảnh. Mục <b>"Nhóm"</b> có thể chọn tay (Giảm cân/giảm mỡ, Vấn đề sức khỏe khác, Khác) — hoặc <b>để trống cho AI tự đọc câu chuyện và tự xếp nhóm</b> khi bạn không chắc/không muốn mất công chọn.</p>
            <p>Case đã lưu sẽ tự xuất hiện đúng lúc ở sổ tay Tư Vấn AI, bước <b>"Gửi case tương tự"</b> — hệ thống tự lấy case mới nhất khớp đúng nhóm khách đang tư vấn, kèm hình ảnh.</p>
          `)}

          ${guideSection('📖', 'Câu Chuyện Của Bạn', `
            <p>Hồ sơ câu chuyện cá nhân — giúp AI (và sổ tay Tư Vấn AI) kể đúng giọng, đúng câu chuyện thật của bạn khi tư vấn khách, thay vì câu chung chung.</p>
            <p>2 cách điền, chọn 1 trong 2: <b>trả lời từng câu hỏi</b> app đã soạn sẵn (không biết bắt đầu kể từ đâu thì chọn cách này), hoặc <b>tự viết tự do</b> 1 đoạn kể lại hành trình của bạn theo đúng cách bạn muốn kể.</p>
            <p>Điền càng chi tiết, bước "Kể chuyện bản thân" trong sổ tay càng tự nhiên và thuyết phục khi gửi cho khách.</p>
          `)}

          ${guideSection('🔔', 'Thông báo nhắc follow', `
            <p>Ở đầu trang <b>Khách Hàng</b>, mục <b>"Thông báo nhắc follow"</b> — bấm <b>"Bật thông báo"</b> và cho phép quyền trình duyệt/thiết bị hỏi. Mỗi sáng khoảng 8h15, nếu có khách hoặc đối tác đến hạn/quá hạn, máy sẽ tự báo — không cần mở app kiểm tra tay.</p>
            <p><b>Trên iPhone:</b> Safari không cho phép thông báo với tab trình duyệt thường — cần bấm nút <b>Chia sẻ</b> trong Safari rồi chọn <b>"Thêm vào Màn hình chính"</b> để cài app trước, sau đó mở app từ màn hình chính rồi mới bật thông báo được.</p>
            <p>Bấm <b>"Gửi thử thông báo"</b> để kiểm tra ngay có hoạt động không, không cần chờ đúng giờ.</p>
          `)}

          ${guideSection('💳', 'Nâng Cấp', `
            <p>Xem gói đang dùng, hạn dùng còn lại và gia hạn khi cần. Gói chưa kích hoạt hoặc đã hết hạn thì các tính năng cần AI (Tư Vấn AI, phân loại Case Study...) sẽ tạm khoá cho tới khi gia hạn.</p>
          `)}
        </div>
      </div>
    `;
  }

  function bind(){
    const openGuideEl = container.querySelector('[data-open-guide]');
    if(openGuideEl) openGuideEl.onclick = ()=>{ state.showGuide = true; draw(); };
    const guideOverlay = container.querySelector('#guide-overlay');
    if(guideOverlay){
      guideOverlay.onclick = ()=>{ state.showGuide = false; draw(); };
      const box = guideOverlay.querySelector('[data-modal-box]');
      if(box) box.onclick = (e) => e.stopPropagation();
      const closeBtn = container.querySelector('#guide-close');
      if(closeBtn) closeBtn.onclick = ()=>{ state.showGuide = false; draw(); };
    }

    container.querySelectorAll('[data-goto]').forEach(el=>{
      el.onclick = ()=>{ location.hash = el.getAttribute('data-goto'); };
    });
    container.querySelectorAll('[data-goto-customer]').forEach(el=>{
      el.onclick = ()=>{ window.__crmOpenCustomerId = el.getAttribute('data-goto-customer'); location.hash = 'khach-hang'; };
    });
    container.querySelectorAll('[data-goto-partner]').forEach(el=>{
      el.onclick = ()=>{ window.__crmOpenCustomerId = el.getAttribute('data-goto-partner'); location.hash = 'doi-tac'; };
    });
  }

  draw();
  load();
}

window.Modules = window.Modules || {};
window.Modules['trang-chu'] = { title:'Trang chủ', render };
})();
