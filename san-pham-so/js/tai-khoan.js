// Sản Phẩm Số — "Tài khoản" (route ẩn, vào qua bấm tên ở cuối sidebar). Trọng tâm là hiện rõ lượt AI
// RIÊNG của Sản Phẩm Số (khác hẳn Xây Nhân Hiệu — xem app-shell.js) + đổi mật khẩu. KHÔNG có phần
// sửa tên/ảnh đại diện như nhan-hieu/js/tai-khoan.js — profiles RLS đã khoá update trực tiếp từ
// client cho user thường (chỉ admin), nhan-hieu's trực tiếp .update() hiện đang không có tác dụng
// thật cho user thường; không lặp lại pattern đó ở đây (spawn_task riêng để rà lại bên nhan-hieu).
(function () {
function render(container) {
  const state = { newPassword: '', confirmPassword: '', passwordSaving: false, passwordSaved: false, passwordError: null };
  draw();

  function draw() { container.innerHTML = html(); bind(); }

  function html() {
    const p = currentProfile || {};
    const active = spsHasActiveAccess();
    return `
      <h2>Tài khoản</h2>
      <div class="card">
        <div style="font-size:15px;font-weight:600;margin-bottom:4px;">${esc(p.full_name || 'Chưa đặt tên')}</div>
        <div style="font-size:13px;color:var(--ink-soft);">Sửa tên/ảnh đại diện ở mục Tài khoản bên Xây Nhân Hiệu (dùng chung 1 hồ sơ).</div>
      </div>

      <div class="card">
        <h2 style="font-size:16px;margin-bottom:10px;">Lượt AI Sản Phẩm Số</h2>
        <div style="font-size:13.5px;margin-bottom:10px;">${spsQuotaHint()}</div>
        ${p.sps_has_paid
          ? `<div style="font-size:13px;color:var(--ink-soft);">Gói đang hoạt động${p.sps_access_until ? `, hết hạn <b>${esc(new Date(p.sps_access_until).toLocaleDateString('vi-VN'))}</b>` : ''}.</div>`
          : `<div style="font-size:13px;color:var(--ink-soft);">Đang dùng thử — chưa mua gói riêng của Sản Phẩm Số.</div>`}
        <div class="btn-row"><span class="btn-ghost btn btn-sm" id="tk-go-nangcap">🔥 Nâng cấp / Mua gói →</span></div>
      </div>

      <div class="card">
        <h2 style="font-size:16px;margin-bottom:10px;">Đổi mật khẩu</h2>
        <label>Mật khẩu mới</label>
        <input id="tk-pass" type="password" value="${esc(state.newPassword)}" placeholder="Ít nhất 6 ký tự">
        <label style="margin-top:10px;">Xác nhận mật khẩu mới</label>
        <input id="tk-pass-confirm" type="password" value="${esc(state.confirmPassword)}">
        ${state.passwordError ? `<div class="error-box" style="margin-top:10px;">${esc(state.passwordError)}</div>` : ''}
        ${state.passwordSaved ? `<div class="hint-box" style="margin-top:10px;">✓ Đã đổi mật khẩu.</div>` : ''}
        <div class="btn-row"><button class="btn" id="tk-save-pass" ${state.passwordSaving ? 'disabled' : ''}>${state.passwordSaving ? 'Đang lưu…' : 'Lưu mật khẩu mới'}</button></div>
      </div>
    `;
  }

  function bind() {
    container.querySelector('#tk-go-nangcap').onclick = () => { location.hash = 'nang-cap'; };
    const passEl = container.querySelector('#tk-pass');
    passEl.oninput = () => { state.newPassword = passEl.value; };
    const passConfirmEl = container.querySelector('#tk-pass-confirm');
    passConfirmEl.oninput = () => { state.confirmPassword = passConfirmEl.value; };
    container.querySelector('#tk-save-pass').onclick = async () => {
      state.passwordSaved = false;
      if (state.newPassword.length < 6) { state.passwordError = 'Mật khẩu mới cần ít nhất 6 ký tự.'; draw(); return; }
      if (state.newPassword !== state.confirmPassword) { state.passwordError = 'Mật khẩu xác nhận không khớp — kiểm tra lại.'; draw(); return; }
      state.passwordSaving = true; state.passwordError = null; draw();
      const { error } = await supabaseClient.auth.updateUser({ password: state.newPassword });
      state.passwordSaving = false;
      if (error) { state.passwordError = error.message; }
      else { state.passwordSaved = true; state.newPassword = ''; state.confirmPassword = ''; }
      draw();
    };
  }
}

window.SanPhamSoScreens = window.SanPhamSoScreens || {};
window.SanPhamSoScreens['tai-khoan'] = render;
})();
