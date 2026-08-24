(function(){
// Trang chủ đổi hẳn sang kiểu checklist "Quy trình dùng app hiệu quả nhất" y hệt nhan-hieu/js/home.js
// (2026-08-24, góp ý Quỳnh: "trang chủ làm y hệt web xây nhân hiệu bây giờ đi") — không còn radar
// Điểm Nghiệp/số liệu tháng nữa, cả khối đó đã DI CHUYỂN hẳn sang tai-chinh/js/thiet-lap-nhanh.js
// (Chấm Điểm Nghiệp Tiền). Trang chủ giờ không hiện trong sidebar (xem NAV ở app-shell.js, cờ
// hidden:true) — vào lại qua bấm logo/"SỔ DÒNG TIỀN TÂM THỨC" ở đầu sidebar, đúng quy ước nhan-hieu.
//
// Thứ tự 5 bước đúng luồng thật của app (khác nhan-hieu ở NỘI DUNG, giữ nguyên CƠ CHẾ): Chấm Điểm
// Nghiệp Tiền (thiết lập ban đầu) → Mục Tiêu & Cam Kết (đặt mục tiêu TRƯỚC khi ghi chép, đúng như
// muc-tieu-cam-ket.js tự nói) → Ghi Chép Hàng Ngày (thói quen lặp lại) → Tổng Kết Tuần → Tổng Kết
// Tháng. Mỗi bước có 1 câu "why" + tick hoàn thành, boot() query đúng bảng module đó ghi vào.
const STEPS = [
  { key:'thiet-lap-nhanh', label:'Chấm Điểm Nghiệp Tiền', why:'Điền sẵn Quỹ Khẩn Cấp/Nợ/Tài Sản ban đầu, đồng thời ra luôn Điểm Nghiệp 5 Trụ Cột và soi khâu tâm thức tiền đang yếu nhất — làm trước tiên để có điểm khởi đầu.' },
  { key:'muc-tieu', label:'Mục Tiêu & Cam Kết', why:'Đặt mục tiêu tháng này TRƯỚC khi ghi chép — đây là nghi thức mở đầu, không phải chuyện nghĩ tới cuối tháng.' },
  { key:'ghi-chep', label:'Ghi Chép Hàng Ngày', why:'Ghi thu chi + chọn Vibe Check mỗi ngày — dữ liệu gốc nuôi mọi tính năng khác, kể cả Điểm Nghiệp.' },
  { key:'tong-ket-tuan', label:'Tổng Kết Tuần', why:'Cuối tuần xem tiền đi đâu nhiều nhất, tự đánh giá thêm vài trục ngoài tài chính.' },
  { key:'tong-ket-thang', label:'Tổng Kết Tháng', why:'Cập nhật tài sản/tiêu sản mỗi tháng — Tài Sản Ròng là con số quan trọng nhất của cuốn sổ này.' },
];

const IMPORTANT_NOTES = [
  { icon:'📈', text:'<b>Điểm Nghiệp không lưu số cố định</b> — luôn tính lại từ đúng dữ liệu bạn vừa ghi, xem ở <a href="#thiet-lap-nhanh" style="color:var(--accent);font-weight:600;">Chấm Điểm Nghiệp Tiền →</a>.' },
  { icon:'💾', text:'<b>Không lo mất dữ liệu khi chuyển trang</b> — mọi tiến trình đang làm dở (số đang gõ, câu vừa chọn...) tự động lưu lại, quay lại vẫn còn nguyên.' },
  { icon:'🌱', text:'<b>Niềm tin cũ chưa chuyển hoá sẽ kéo điểm xuống</b> — ghi lại ở <a href="#tang-thuc" style="color:var(--accent);font-weight:600;">Hạt Giống Phước - Nghiệp →</a> khi thấy 1 Nút Chặn Dòng Tiền lặp lại mãi.' },
  { icon:'💛', text:'<b>Vibe Check mỗi lần ghi chép là bước quan trọng nhất</b> — không phải ô điền cho có, đây là chỗ tâm thức tiền thật sự được nhìn thấy.' },
  { icon:'🔓', text:'<b>Dùng thử miễn phí, mở khoá trọn đời chỉ 1 lần</b> — xem chi tiết ở <a href="#nang-cap" style="color:var(--accent);font-weight:600;">Nâng Cấp →</a>.' },
];

const EXPLORE = [
  { key:'kien-thuc', label:'Kiến Thức Nền Tảng' },
  { key:'tang-thuc', label:'Hạt Giống Phước - Nghiệp' },
  { key:'quan-ly-no', label:'Quản Lý Nợ' },
];

function render(container, ctx){
  const state = { loading:true, done:{} };
  function draw(){ container.innerHTML = html(); bind(); }
  draw();

  async function boot(){
    const month = new Date().toISOString().slice(0,7);
    const [setup, monthRefl, entry, weekly] = await Promise.all([
      ctx.supabase.from('tc_networth_snapshots').select('estimated_income')
        .eq('user_id', ctx.user.id).not('estimated_income', 'is', null).limit(1).maybeSingle(),
      ctx.supabase.from('tc_monthly_reflections').select('*')
        .eq('user_id', ctx.user.id).order('month', { ascending:false }).limit(1).maybeSingle(),
      ctx.supabase.from('tc_finance_entries').select('id').eq('user_id', ctx.user.id).limit(1).maybeSingle(),
      ctx.supabase.from('tc_weekly_reflections').select('id').eq('user_id', ctx.user.id).limit(1).maybeSingle(),
    ]);
    const r = monthRefl.data;
    const hasGoal = !!(r && (Number(r.goal_income)||Number(r.goal_savings)||Number(r.goal_debt_reduction)||Number(r.goal_new_asset)||(r.goal_new_asset_type||'').trim()));
    const hasMonthReflection = !!(r && (r.reflection_regret||r.reflection_worth||r.reflection_blocker||r.reflection_good_habit||r.reflection_bad_habit));
    state.done = {
      'thiet-lap-nhanh': !!setup.data,
      'muc-tieu': hasGoal,
      'ghi-chep': !!entry.data,
      'tong-ket-tuan': !!weekly.data,
      'tong-ket-thang': hasMonthReflection,
    };
    state.loading = false;
    draw();
  }

  function html(){
    const name = (ctx.profile && ctx.profile.full_name) ? ctx.profile.full_name.split(' ').slice(-1)[0] : '';
    const nextIdx = STEPS.findIndex(s => !state.done[s.key]);
    return `
      <div class="page-head">
        <h1>Chào${name?` ${esc(name)}`:''} 👋</h1>
        <p>"Số dư là Quả, rung động là Nhân." Đi lần lượt theo checklist bên dưới nếu chưa biết bắt đầu từ đâu — ghi chép mỗi ngày, tổng kết mỗi tuần/tháng, để nhìn rõ tâm thức nào đang dẫn dắt dòng tiền của bạn.</p>
      </div>

      <div class="card">
        <h3 style="font-family:'IBM Plex Mono',monospace;font-size:13px;color:var(--ink-soft);text-transform:uppercase;letter-spacing:.05em;margin-bottom:14px;">📋 Quy trình dùng app hiệu quả nhất</h3>
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
                <span style="color:var(--ink-soft);font-size:13px;">${esc(s.why)}</span>
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
