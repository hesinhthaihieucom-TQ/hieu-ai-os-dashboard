(function(){
function render(container, ctx){
  async function boot(){
    container.innerHTML = `<div class="loading"><div class="spinner"></div><p>Đang tải…</p></div>`;
    const { data: pos } = await ctx.supabase.from('positioning_results').select('*').eq('user_id', ctx.user.id).maybeSingle();

    if(!pos || !pos.luot1){
      container.innerHTML = `
        <div class="page-head"><h1>Giọng Văn</h1><p>Cần hoàn thành Định Vị trước.</p></div>
        <div class="btn-row"><a class="btn" href="#dinh-vi">Đi tới Định Vị</a></div>`;
      return;
    }
    const r = pos.luot1;
    container.innerHTML = `
      <div class="page-head"><h1>Giọng Văn</h1><p>Đây là "kim chỉ nam" giọng văn của bạn — dùng để tự kiểm tra khi viết tay, hoặc đối chiếu khi AI viết hộ.</p></div>
      <div class="section highlight"><h3>Kết luận định vị</h3><div class="body" style="font-family:'Playfair Display',serif;font-size:18px;font-style:italic;">${esc(r.ket_luan_dinh_vi)}</div></div>
      <div class="section"><h3>Giọng điệu & ngôn ngữ</h3><div class="body">${esc(r.giong_dieu_ngon_ngu)}</div></div>
      <div class="section"><h3>Bản sắc thương hiệu</h3><div class="body">${esc(r.ban_sac_thuong_hieu)}</div></div>
      <div class="section"><h3>Triết lý thương hiệu</h3><div class="body">${esc(r.triet_ly_thuong_hieu)}</div></div>
      <div class="section"><h3>Không theo đuổi</h3><div class="body">${esc(r.khong_theo_duoi)}</div></div>
      <div class="section"><h3>Kiểu hook phù hợp</h3><div class="body">${esc(r.hook_mo_dau && r.hook_mo_dau.kieu_hook)}</div>
        <ul>${((r.hook_mo_dau && r.hook_mo_dau.vi_du)||[]).map(h=>`<li>${esc(h)}</li>`).join('')}</ul></div>
      <div class="btn-row"><a class="btn-ghost btn" href="#dinh-vi">Xem toàn bộ Định Vị →</a></div>
    `;
  }
  boot();
}
window.Modules = window.Modules || {};
window.Modules['giong-van'] = { title:'Giọng Văn', render };
})();
