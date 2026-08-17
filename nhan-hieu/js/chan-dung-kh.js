(function(){
function render(container, ctx){
  async function boot(){
    container.innerHTML = `<div class="loading"><div class="spinner"></div><p>Đang tải…</p></div>`;
    const { data: pos } = await ctx.supabase.from('positioning_results').select('*').eq('user_id', ctx.user.id).maybeSingle();

    if(!pos || !pos.luot1){
      container.innerHTML = `
        <div class="page-head"><h1>Chân Dung Khách Hàng</h1><p>Cần hoàn thành Định Vị trước.</p></div>
        <div class="btn-row"><a class="btn" href="#dinh-vi">Đi tới Định Vị</a></div>`;
      return;
    }
    if(!pos.luot2){
      container.innerHTML = `
        <div class="page-head"><h1>Chân Dung Khách Hàng</h1><p>Cần làm tiếp Lượt 2 (Chiến lược & Dòng tiền) ở bước Định Vị để có chân dung khách hàng đầy đủ.</p></div>
        <div class="btn-row"><a class="btn" href="#dinh-vi">Đi tới Định Vị</a></div>`;
      return;
    }
    const r = pos.luot2;
    container.innerHTML = `
      <div class="page-head"><h1>Chân Dung Khách Hàng</h1><p>Trích từ kết quả Định Vị — cập nhật tự động mỗi khi bạn làm lại Định Vị.</p></div>
      <div class="section"><h3>Là ai</h3><div class="body">${esc(r.chan_dung_khach_hang)}</div></div>
      <div class="section"><h3>Nỗi đau & rào cản (4 tầng)</h3>
        <div class="body"><b>Bề mặt:</b> ${esc(r.noi_dau_rao_can.be_mat)}<br><b>Sâu bên trong:</b> ${esc(r.noi_dau_rao_can.sau_ben_trong)}<br><b>Nỗi sợ:</b> ${esc(r.noi_dau_rao_can.noi_so)}<br><b>Rào cản:</b> ${esc(r.noi_dau_rao_can.rao_can_chua_hanh_dong)}</div></div>
      <div class="section"><h3>Khao khát & mục tiêu</h3><div class="body">${esc(r.khao_khat_muc_tieu)}</div></div>
      <div class="section highlight"><h3>Insight cốt lõi</h3><div class="body">${esc(r.insight_cot_loi)}</div></div>
    `;
  }
  boot();
}
window.Modules = window.Modules || {};
window.Modules['chan-dung-kh'] = { title:'Chân Dung KH', render };
})();
