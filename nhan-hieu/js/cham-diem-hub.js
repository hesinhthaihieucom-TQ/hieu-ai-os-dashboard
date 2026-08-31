(function(){
// Gộp Chấm Điểm Content + Chấm Điểm Hook vào 1 mục sidebar duy nhất, bấm vào mới hiện 2 tab riêng
// — sidebar đang dài (13 mục cho user thường), theo phản hồi chị Quỳnh 2026-08-27 "có nhiều tính
// năng quá không". Y hệt cách quan-tri-hub.js đã gộp các trang Quản trị cùng lý do sidebar dài quá
// — không sửa lại logic bên trong cham-diem-content.js/cham-diem-hook.js, chỉ gọi lại render() có
// sẵn của từng module vào 1 vùng con, tránh trùng lặp code, giữ nguyên hành vi đã kiểm chứng.
// Trỏ vào DOM do 2 sub-module con tự vẽ (#score-input/[data-action="score"] là của cham-diem-
// content.js) — KHÔNG đổi logic bên trong sub-module, chỉ query lại kết quả render của nó, giữ đúng
// nguyên tắc "không sửa lại logic bên trong cham-diem-content.js/cham-diem-hook.js" đã ghi ở trên.
const TOUR_STEPS = [
  { selector: '.chips', title: '2 tab chấm điểm', text: 'Tab "Content" chấm cả bài viết theo 6 tiêu chí. Tab "Hook" chấm riêng câu mở đầu với bộ tiêu chí chuyên sâu hơn.' },
  { selector: '#score-input', title: 'Dán bài cần chấm', text: 'Dán nguyên văn bài viết vào đây.' },
  { selector: '[data-action="score"]', title: 'Chấm điểm', text: 'AI chấm theo 6 tiêu chí (hook, chất liệu thật, giá trị, CTA, có bị "AI hoá" không, khớp giọng điệu định vị) kèm gợi ý sửa cụ thể — tốn 2 lượt AI.' },
];

function render(container, ctx){
  // Vào từ nút "Xem chi tiết đầy đủ ở Chấm Điểm Content" (viet-content.js, href="#cham-diem-hub")
  // mặc định đúng là tab content nên không cần tín hiệu riêng. Vào từ nút "Chấm điểm hook đầy đủ"
  // (viet-content.js) gán window.PendingChamDiemTab='hook' trước khi đổi hash — đọc lại ở đây.
  const initialTab = window.PendingChamDiemTab === 'hook' ? 'hook' : 'content';
  window.PendingChamDiemTab = null;
  const state = { tab: initialTab };

  function draw(){
    container.innerHTML = `
      <span class="tour-trigger" id="cd-start-tour">❓ Hướng dẫn</span>
      <div class="page-head"><h1>Chấm Điểm</h1><p>Chấm điểm AI cho bài viết hoặc riêng câu hook, kèm gợi ý sửa cụ thể.</p></div>
      <div class="chips" style="margin-bottom:18px;">
        <div class="chip ${state.tab==='content'?'selected':''}" data-tab="content">Content</div>
        <div class="chip ${state.tab==='hook'?'selected':''}" data-tab="hook">Hook</div>
      </div>
      <div id="cd-hub-sub"></div>
    `;
    container.querySelectorAll('[data-tab]').forEach(el=>{
      el.onclick = () => { state.tab = el.getAttribute('data-tab'); draw(); };
    });
    const sub = container.querySelector('#cd-hub-sub');
    const subModuleKey = state.tab === 'hook' ? 'cham-diem-hook' : 'cham-diem-content';
    window.Modules[subModuleKey].render(sub, ctx);

    const tourBtn = container.querySelector('#cd-start-tour');
    if(tourBtn) tourBtn.onclick = ()=>{ if(state.tab!=='content'){ state.tab='content'; draw(); } window.startPageTour(TOUR_STEPS); };
  }

  draw();
}
window.Modules = window.Modules || {};
window.Modules['cham-diem-hub'] = { title:'Chấm Điểm', render };
})();
