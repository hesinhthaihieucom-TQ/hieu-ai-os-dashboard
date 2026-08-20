(function(){
// Gộp 2 mục Quản trị (thành viên + kho nội dung) vào 1 mục sidebar duy nhất, bấm vào mới hiện
// 2 tab riêng — sidebar đang dài quá (16 mục) khiến phần đăng nhập/lượt dùng thử bị đẩy khuất
// khỏi màn hình. Không sửa lại logic bên trong quan-tri.js/quan-tri-kho.js, chỉ gọi lại render()
// có sẵn của từng module vào 1 vùng con — tránh trùng lặp code, giữ nguyên hành vi đã kiểm chứng.
function render(container, ctx){
  const state = { tab:'thanhvien' };

  function draw(){
    container.innerHTML = `
      <div class="page-head"><h1>Quản trị</h1><p>Quản lý thành viên và duyệt nội dung đề xuất đẩy vào kho chung.</p></div>
      <div class="chips" style="margin-bottom:18px;">
        <div class="chip ${state.tab==='thanhvien'?'selected':''}" data-tab="thanhvien">Thành viên</div>
        <div class="chip ${state.tab==='taichinh'?'selected':''}" data-tab="taichinh">Tài chính</div>
        <div class="chip ${state.tab==='giaodich'?'selected':''}" data-tab="giaodich">Giao dịch SePay</div>
        <div class="chip ${state.tab==='kho'?'selected':''}" data-tab="kho">Kho nội dung</div>
      </div>
      <div id="qt-hub-sub"></div>
    `;
    container.querySelectorAll('[data-tab]').forEach(el=>{
      el.onclick = () => { state.tab = el.getAttribute('data-tab'); draw(); };
    });
    const sub = container.querySelector('#qt-hub-sub');
    const subModuleKey = state.tab === 'thanhvien' ? 'quan-tri' : state.tab === 'taichinh' ? 'quan-tri-taichinh' : state.tab === 'giaodich' ? 'quan-tri-giaodich' : 'quan-tri-kho';
    window.Modules[subModuleKey].render(sub, ctx);
  }

  draw();
}
window.Modules = window.Modules || {};
window.Modules['quan-tri-hub'] = { title:'Quản trị', render };
})();
