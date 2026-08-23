(function(){
function comingSoon(title, desc){
  return function render(container){
    container.innerHTML = `
      <div class="page-head"><h1>${esc(title)}</h1><p>${esc(desc)}</p></div>
      <div class="card" style="text-align:center;color:var(--ink-soft);padding:50px 24px;">
        Đang được xây dựng — sẽ cập nhật dần trong các bản tiếp theo.
      </div>
    `;
  };
}

// Quy trình LẶP LẠI mỗi tuần khi sản xuất content (khác câu "nên làm theo thứ tự nào" bên dưới —
// đó là thứ tự làm quen app LẦN ĐẦU). Đặt thành khối riêng, nổi bật ở đầu trang, để xem lại được bất
// cứ lúc nào (2026-08-23, chốt cùng chị Quỳnh — thẻ tóm tắt tương ứng đặt ở Trang chủ, trỏ về đây).
const WORKFLOW_GUIDE = [
  { n:1, title:'Định Vị thật chi tiết', why:'Nền tảng cho mọi bước sau — trục nội dung, chân dung khách hàng, giọng văn AI dùng lại xuyên suốt đều lấy từ đây, nên trả lời kỹ ngay từ đầu, đỡ phải sửa lại nhiều lần về sau.' },
  { n:2, title:'Sửa Kênh', why:'Đồng bộ ảnh đại diện/ảnh bìa/bio khớp với định vị vừa chốt. Chỉ cần làm 1 lần (không lặp lại mỗi tuần), nhưng nên làm trước khi đẩy content ra ngoài — bài viral kéo người lạ vào trang mà kênh chưa khớp định vị thì phí mất khách.' },
  { n:3, title:'Lịch Đăng Bài → bấm "AI gợi ý lịch tuần"', why:'Lên khung trục nội dung + định dạng cho cả 7 ngày TRƯỚC khi viết bất kỳ bài nào — tránh viết lan man rồi không biết nhét vào đâu. Nhập mục tiêu tuần này (ra mắt sản phẩm, tăng follow...) để AI ưu tiên đúng chỗ.' },
  { n:4, title:'Viết từng ô lịch theo đúng gợi ý', why:'Ô nào AI đã khớp sẵn 1 bài bạn từng viết — Chấm Điểm Content/Hook nhanh trước khi dùng (1 lượt) để chắc bài đủ chuẩn trước khi lên lịch thật. Ô chưa có bài — bấm "Chọn bài mẫu đúng trục" vào Kho Content/Kho Hook đúng trục để viết; nếu vừa thấy 1 bài viral ở nơi khác thì qua Tái Chế Content Viral thay vì viết từ đầu.' },
  { n:5, title:'Đẩy Bài & CTA Comment khi bài đạt view tốt', why:'Gợi ý mốc trên 1000 view. App cũng tự nhắc theo giờ (3h/6h/24h sau khi đăng) để không quên vào kiểm tra — 2 cái bổ trợ nhau, đừng bỏ qua bước này vì đây là lúc tối ưu hoá đúng bài đang viral, không phải lúc để yên.' },
];

const HELP_SECTIONS = [
  { group:'Bắt đầu từ đâu', items: [
    { q:'Tôi nên làm theo thứ tự nào?', a:'Đi đúng theo thứ tự sidebar từ trên xuống: Định Vị → Sửa Kênh → Dạng Content → Kho Content / Kho Hook → Viết Content → Chấm Điểm → Lịch Đăng Bài. Định Vị luôn là bước đầu tiên vì mọi bước sau đều dựa vào kết quả đó (bao gồm cả chân dung khách hàng và giọng văn). Đó là thứ tự làm quen app lần đầu — còn quy trình sản xuất content HÀNG TUẦN sau khi đã quen thì xem khối "Quy trình dùng app hiệu quả nhất" ngay phía trên.' },
    { q:'Tôi đã làm Định Vị ở một trợ lý GPT khác trước đây rồi, có phải làm lại không?', a:'Không cần làm lại. Ở màn hình Định Vị, bấm "Đã có kết quả Định Vị rồi? Dán vào đây" rồi dán nguyên văn kết quả cũ vào — hệ thống tự sắp xếp lại đúng cấu trúc, không cần trả lời lại 26 câu hỏi.' },
    { q:'Dùng trên điện thoại có cài thành app riêng được không?', a:'Được. Trên Android (Chrome): mở link này, Chrome sẽ tự hiện banner "Thêm vào màn hình chính" — hoặc vào menu (⋮) → "Cài đặt ứng dụng". Trên iPhone (Safari): mở link → bấm nút Chia sẻ (hình vuông có mũi tên đi lên) → "Thêm vào MH chính". Sau khi cài, mở từ icon trên màn hình chính sẽ chạy như 1 app riêng, không còn thanh địa chỉ trình duyệt.' },
  ]},
  { group:'Định Vị & Sửa Kênh', items: [
    { q:'Vì sao các mục sau bắt tôi làm Định Vị trước?', a:'Toàn bộ nội dung AI sinh ra (dạng content, ý tưởng, bài viết, lịch đăng) đều bám theo định vị đã chốt để không bị lệch trục — nên cần có Định Vị trước mới dùng được các bước sau.' },
    { q:'Sửa Kênh dùng để làm gì?', a:'Kiểm tra ảnh đại diện, ảnh bìa, profile, bio và bài ghim trên kênh thật của bạn có khớp với định vị đã chốt không, rồi đưa ra hướng sửa cụ thể — kể cả gợi ý ảnh bìa phù hợp.' },
  ]},
  { group:'Content & Lịch đăng', items: [
    { q:'Kho Content và Kho Hook khác gì nhau?', a:'Kho Content lưu bài viết/mẫu content (của bạn và của đội ngũ). Kho Hook lưu riêng các câu hook hay để tra cứu nhanh khi cần mở đầu bài.' },
    { q:'Làm sao để AI viết đúng giọng văn của tôi?', a:'Ở bất kỳ bài nào trong Kho Content, bấm "Dùng làm giọng mẫu" — hệ thống tự phân tích giọng điệu từ bài đó và cập nhật ngay vào Định Vị, áp dụng cho mọi bài AI viết sau này.' },
    { q:'Dạng Content dùng để làm gì?', a:'Sau khi có Định Vị, trang này tự gợi ý 2-3 dạng content (trong 12 dạng) phù hợp nhất với trục nội dung của bạn, kèm hướng dẫn cách làm cụ thể từng dạng.' },
    { q:'Chấm Điểm Content / Chấm Điểm Hook dùng để làm gì?', a:'Dán 1 bài viết hoặc 1 câu hook vào để AI chấm theo đúng khung chuẩn, chỉ ra chỗ yếu và cách sửa cụ thể — không chỉ khen chê chung chung.' },
    { q:'Lịch Đăng Bài có tự động không?', a:'Có. Nhập mục tiêu tuần này, bấm "AI gợi ý lịch tuần" — hệ thống xếp sẵn 7 ngày theo đúng trục nội dung, bạn chỉ cần bấm "Dùng gợi ý" hoặc tự chọn bài khác.' },
  ]},
  { group:'Dữ liệu & bảo mật', items: [
    { q:'Dữ liệu của tôi có bị người khác xem không?', a:'Không. Mỗi tài khoản chỉ thấy dữ liệu của chính mình, trừ "Kho Content Viral"/"Kho Hook Viral" do đội ngũ quản lý là mọi người đều xem được.' },
    { q:'Tôi đổi máy/điện thoại thì dữ liệu có mất không?', a:'Không mất — dữ liệu lưu trên server theo tài khoản, đăng nhập lại ở bất kỳ thiết bị nào cũng thấy đầy đủ.' },
  ]},
];

function renderHelp(container){
  const state = { question:'', asking:false, answer:null, error:null, freeQuestionUsed:false };
  function draw(){ container.innerHTML = html(); bind(); }

  function html(){
    return `
    <div class="page-head"><h1>Hỏi & Trợ Giúp</h1><p>Câu hỏi thường gặp khi dùng Xây Nhân Hiệu.</p></div>

    <div class="section highlight" style="margin-bottom:24px;">
      <h3>📋 Quy trình dùng app hiệu quả nhất</h3>
      <div class="body" style="margin-bottom:14px;">Quy trình lặp lại mỗi tuần khi sản xuất content — khác checklist làm quen app lần đầu ở Trang chủ.</div>
      ${WORKFLOW_GUIDE.map(s=>`
        <div style="display:flex;gap:12px;padding:10px 0;border-top:1px solid rgba(255,255,255,.12);">
          <div style="flex-shrink:0;width:24px;height:24px;border-radius:50%;background:rgba(255,255,255,.15);display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;">${s.n}</div>
          <div>
            <b>${esc(s.title)}</b>
            <div style="font-size:13px;margin-top:3px;opacity:.9;">${esc(s.why)}</div>
          </div>
        </div>
      `).join('')}
    </div>

    <div class="section highlight" style="margin-bottom:24px;">
      <h3>Hỏi AI trực tiếp</h3>
      <div class="body" style="margin-bottom:10px;">Không thấy câu trả lời ở danh sách bên dưới? Gõ câu hỏi của bạn, AI sẽ trả lời dựa trên cách app hoạt động.</div>
      <textarea id="hd-question" placeholder="Ví dụ: Làm sao để AI viết đúng giọng văn của tôi?" style="min-height:70px;">${esc(state.question)}</textarea>
      <div class="btn-row" style="margin-top:10px;align-items:center;">
        <button class="btn" data-action="ask" ${state.asking?'disabled':''}>${state.asking?'Đang trả lời…':'Hỏi AI'}</button>
        ${!state.asking?`<span style="font-size:11px;color:var(--ink-soft);">(câu đầu tiên trong ngày miễn phí, từ câu thứ 2 tốn 1 lượt AI)</span>`:''}
      </div>
      ${state.error?`<div class="error-box" style="margin-top:10px;">${esc(state.error)}</div>`:''}
      ${state.answer?`<div class="body" style="margin-top:14px;background:var(--accent-soft);padding:12px;border-radius:8px;">${esc(breakSentences(state.answer))}</div>`:''}
      ${state.answer && state.freeQuestionUsed?`<div style="margin-top:8px;font-size:12px;color:var(--accent);font-weight:600;">✓ Câu hỏi này miễn phí, không trừ lượt AI.</div>`:''}
    </div>

    ${HELP_SECTIONS.map(sec=>`
      <div style="margin-top:22px;margin-bottom:10px;font-family:'IBM Plex Mono',monospace;font-size:12.5px;letter-spacing:.05em;text-transform:uppercase;color:var(--ink-soft);">${esc(sec.group)}</div>
      ${sec.items.map(i=>`<div class="section"><h3>${esc(i.q)}</h3><div class="body">${esc(i.a)}</div></div>`).join('')}
    `).join('')}
    <div class="section highlight" style="margin-top:28px;">
      <h3>Liên hệ</h3>
      <div class="body">Cần hỗ trợ thêm hoặc muốn tìm hiểu các sản phẩm khác trong hệ sinh thái HIỂU? Truy cập <a href="https://hesinhthaihieu.com" target="_blank" rel="noopener" style="color:#fff;text-decoration:underline;">hesinhthaihieu.com</a>.</div>
    </div>
  `;
  }

  function bind(){
    const qInput = container.querySelector('#hd-question');
    if(qInput) qInput.oninput = ()=>{ state.question = qInput.value; };
    const askBtn = container.querySelector('[data-action="ask"]');
    if(askBtn) askBtn.onclick = ask;
  }

  async function ask(){
    if(!state.question.trim() || state.asking) return;
    state.asking = true; state.error = null; state.answer = null; state.freeQuestionUsed = false; draw();
    try{
      const data = await callApi('/api/hoi-dap', { question: state.question.trim() });
      state.answer = data.result.tra_loi;
      state.freeQuestionUsed = !!data.free_question_used;
    } catch(e){ state.error = e.message; }
    state.asking = false; draw();
  }

  draw();
}

window.Modules = window.Modules || {};
window.Modules['tro-giup'] = { title:'Hỏi & Trợ Giúp', render: renderHelp };
})();
