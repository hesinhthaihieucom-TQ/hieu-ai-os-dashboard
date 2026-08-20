(function(){
const STEPS = [
  { key:'dinh-vi', label:'Định Vị thương hiệu', desc:'Trả lời 16 câu hỏi để AI tìm ra định vị chuẩn nhất — mọi bước sau đều dựa vào kết quả này.' },
  { key:'sua-kenh', label:'Sửa Kênh', desc:'Kiểm tra ảnh đại diện, ảnh bìa, bio, profile có khớp định vị chưa, AI chỉ chỗ cần sửa.' },
  { key:'viet-content', label:'Viết bài đầu tiên', desc:'Nhập 1 chủ đề, để AI viết bài hoàn chỉnh theo đúng giọng văn của bạn.' },
  { key:'lich-dang', label:'Lên lịch đăng bài', desc:'Xếp bài vào lịch tuần, đăng đều đặn thay vì nhớ ngày tự đăng tay.' },
];

const IMPORTANT_NOTES = [
  { icon:'🎯', text:'<b>Định Vị luôn làm trước tiên</b> — mọi bài viết/kết quả AI ở các bước sau đều dựa vào kết quả Định Vị, nên trả lời thật kỹ ngay từ đầu.' },
  { icon:'💾', text:'<b>Không lo mất dữ liệu khi chuyển trang</b> — mọi tiến trình đang làm dở (câu trả lời, bài đang viết, ảnh đã tải lên...) tự động lưu lại, quay lại vẫn còn nguyên.' },
  { icon:'⚡', text:'<b>Lượt AI tính theo độ phức tạp</b> — hành động càng nhiều bước AI xử lý thì càng tốn nhiều lượt hơn, không đồng giá. Xem chi tiết và tự lên kế hoạch dùng ở mục <b>Tài khoản</b> (bấm vào ảnh đại diện/tên ở cuối sidebar).' },
  { icon:'⏱️', text:'<b>AI cần khoảng 30 giây - 2 phút để xử lý</b> mỗi lần — đừng thoát app hay khoá màn hình giữa chừng, cứ để chờ.' },
  { icon:'🌐', text:'<b>Kho chung vs Kho của tôi</b> — Kho Content/Kho Hook có phần "chung" (nội dung viral, dùng chung mọi người) và phần "của tôi" (riêng tư, chỉ bạn thấy).' },
];

const EXPLORE = [
  { key:'kho-content', label:'Kho Content' },
  { key:'kho-hook', label:'Kho Hook' },
  { key:'tao-anh', label:'Tạo Ảnh Thương Hiệu' },
  { key:'tro-giup', label:'Hỏi & Trợ Giúp' },
];

function render(container, ctx){
  const state = { loading:true, done:{} };
  function draw(){ container.innerHTML = html(); bind(); }
  draw();

  async function boot(){
    const [pos, audit, posts, cal] = await Promise.all([
      ctx.supabase.from('positioning_results').select('luot1').eq('user_id', ctx.user.id).maybeSingle(),
      ctx.supabase.from('channel_audits').select('id').eq('user_id', ctx.user.id).limit(1).maybeSingle(),
      ctx.supabase.from('posts').select('id').eq('user_id', ctx.user.id).limit(1).maybeSingle(),
      ctx.supabase.from('calendar_entries').select('id').eq('user_id', ctx.user.id).limit(1).maybeSingle(),
    ]);
    state.done = {
      'dinh-vi': !!(pos.data && pos.data.luot1),
      'sua-kenh': !!audit.data,
      'viet-content': !!posts.data,
      'lich-dang': !!cal.data,
    };
    state.loading = false;
    draw();
  }

  function html(){
    const name = (ctx.profile && ctx.profile.full_name) ? ctx.profile.full_name.split(' ').slice(-1)[0] : '';
    const nextIdx = STEPS.findIndex(s => !state.done[s.key]);
    return `
      <div class="page-head">
        <h1>Chào mừng${name?` ${esc(name)}`:''} đến với Xây Nhân Hiệu 👋</h1>
        <p>Đây là nơi bạn đi qua từng bước để xây dựng thương hiệu cá nhân: định vị đúng trục nội dung, tối ưu kênh, để AI viết bài đều đặn theo đúng giọng văn của bạn, và lên lịch đăng không bị đứt quãng. Đi lần lượt theo checklist bên dưới nếu chưa biết bắt đầu từ đâu.</p>
      </div>

      <div class="card">
        <h3 style="font-family:'IBM Plex Mono',monospace;font-size:13px;color:var(--ink-soft);text-transform:uppercase;letter-spacing:.05em;margin-bottom:14px;">Bắt đầu từ đây</h3>
        ${state.loading ? `<div style="color:var(--ink-soft);font-size:14px;">Đang tải tiến độ…</div>` : STEPS.map((s,i)=>{
          const isDone = state.done[s.key];
          const isNext = i===nextIdx;
          return `
          <div class="list-item">
            <div style="display:flex;align-items:flex-start;gap:12px;">
              <div style="flex-shrink:0;width:26px;height:26px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;
                background:${isDone?'var(--accent)':'var(--accent-soft)'};color:${isDone?'#fff':'var(--accent)'};">${isDone?'✓':i+1}</div>
              <div class="txt">
                <b>${esc(s.label)}</b><br>
                <span style="color:var(--ink-soft);font-size:13px;">${esc(s.desc)}</span>
              </div>
            </div>
            <button class="${isNext?'btn':'btn-ghost btn'} btn-sm" data-key="${s.key}">${isDone?'Xem lại →':(isNext?'Bắt đầu →':'→')}</button>
          </div>
        `;}).join('')}
      </div>

      <div class="card" style="margin-top:20px;background:var(--accent-soft);">
        <h3 style="font-family:'IBM Plex Mono',monospace;font-size:13px;color:var(--accent);text-transform:uppercase;letter-spacing:.05em;margin-bottom:14px;">Lưu ý quan trọng</h3>
        ${IMPORTANT_NOTES.map(n=>`
          <div style="display:flex;gap:10px;padding:8px 0;font-size:13.5px;line-height:1.55;">
            <span style="flex-shrink:0;">${n.icon}</span>
            <span>${n.text}</span>
          </div>
        `).join('')}
      </div>

      <div style="margin-top:24px;">
        <h3 style="font-family:'IBM Plex Mono',monospace;font-size:13px;color:var(--ink-soft);text-transform:uppercase;letter-spacing:.05em;margin-bottom:12px;">Khám phá thêm</h3>
        <div class="chips">
          ${EXPLORE.map(e=>`<div class="chip" data-key="${e.key}">${esc(e.label)}</div>`).join('')}
        </div>
      </div>
    `;
  }

  function bind(){
    container.querySelectorAll('[data-key]').forEach(el=>{
      el.onclick = ()=>{ location.hash = el.getAttribute('data-key'); };
    });
  }

  boot();
}

window.Modules = window.Modules || {};
window.Modules['trang-chu'] = { title:'Trang chủ', render };
})();
