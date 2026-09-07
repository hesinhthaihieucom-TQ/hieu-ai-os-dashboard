// Gộp "Quản Trị" (Thành viên/quan-tri.js), "Tài chính" (quan-tri-taichinh.js), và "Thông báo"
// (quan-tri-thongbao.js) vào 1 mục sidebar duy nhất, bấm vào mới hiện tab riêng — 2026-09-07, chị
// Quỳnh: "thông báo ở trong mục quản trị luôn mà" + "mục quản trị bên web xây nhân hiệu có gì bên
// crm có đó". Khớp ĐÚNG pattern nhan-hieu/js/quan-tri-hub.js — không sửa lại logic bên trong từng
// module con, chỉ gọi lại render() có sẵn vào 1 vùng con, tránh trùng lặp code.
(function(){
function render(container, ctx){
  const state = { tab:'thanhvien' };

  function draw(){
    container.innerHTML = `
      <div class="page-head"><h1>Quản Trị</h1><p>Quản lý thành viên, xem doanh thu/chi phí, và đăng thông báo tính năng mới.</p></div>
      <div class="chips" style="margin-bottom:18px;">
        <div class="chip ${state.tab==='thanhvien'?'selected':''}" data-tab="thanhvien">Thành viên</div>
        <div class="chip ${state.tab==='taichinh'?'selected':''}" data-tab="taichinh">Tài chính</div>
        <div class="chip ${state.tab==='thongbao'?'selected':''}" data-tab="thongbao">Thông báo</div>
        <div class="chip ${state.tab==='danhgia'?'selected':''}" data-tab="danhgia">Đánh giá</div>
      </div>
      <div id="qt-hub-sub"></div>
    `;
    container.querySelectorAll('[data-tab]').forEach(el=>{
      el.onclick = () => { state.tab = el.getAttribute('data-tab'); draw(); };
    });
    const sub = container.querySelector('#qt-hub-sub');
    const subModuleKey = state.tab === 'thanhvien' ? 'quan-tri' : state.tab === 'taichinh' ? 'quan-tri-taichinh' : state.tab === 'danhgia' ? 'quan-tri-danhgia' : 'quan-tri-thongbao';
    window.Modules[subModuleKey].render(sub, ctx);
  }

  draw();
}
window.Modules = window.Modules || {};
window.Modules['quan-tri-hub'] = { title:'Quản Trị', render };
})();
