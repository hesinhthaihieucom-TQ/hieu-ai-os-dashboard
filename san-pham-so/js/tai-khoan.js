// Sản Phẩm Số — "Tài khoản" (route ẩn, vào qua bấm tên ở cuối sidebar). Trọng tâm là hiện rõ lượt AI
// RIÊNG của Sản Phẩm Số (khác hẳn Xây Nhân Hiệu — xem app-shell.js) + đổi mật khẩu. KHÔNG có phần
// sửa tên/ảnh đại diện như nhan-hieu/js/tai-khoan.js — profiles RLS đã khoá update trực tiếp từ
// client cho user thường (chỉ admin), nhan-hieu's trực tiếp .update() hiện đang không có tác dụng
// thật cho user thường; không lặp lại pattern đó ở đây (spawn_task riêng để rà lại bên nhan-hieu).
(function () {
function render(container) {
  const p0 = currentProfile || {};
  const state = {
    newPassword: '', confirmPassword: '', passwordSaving: false, passwordSaved: false, passwordError: null,
    // Kết nối Heyzine riêng (2026-09-04) — người bán tự đăng ký Heyzine free của họ, dán API
    // key/client_id vào đây, flipbook xuất ra sẽ thuộc tài khoản của chính họ (tự vào Heyzine chỉnh
    // nhạc nền/style được — thứ tài khoản CHUNG của Quỳnh không cho phép, xem schema_san_pham_so.sql
    // mục 25). Không kết nối thì vẫn dùng tài khoản chung như trước, không bắt buộc.
    heyzineApiKey: p0.sps_heyzine_api_key || '', heyzineClientId: p0.sps_heyzine_client_id || '',
    heyzineSaving: false, heyzineSaved: false, heyzineError: null,
  };
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
        <h2 style="font-size:16px;margin-bottom:6px;">📖 Kết nối Heyzine riêng (tuỳ chọn)</h2>
        <div style="font-size:13px;color:var(--ink-soft);margin-bottom:10px;">Mặc định ebook xuất ra dùng chung tài khoản Heyzine của hệ thống — bạn không tự chỉnh nhạc nền/tiếng lật trang được. Kết nối tài khoản Heyzine riêng của bạn để tự chỉnh được.</div>
        ${p.sps_heyzine_api_key && p.sps_heyzine_client_id ? `<div class="hint-box" style="margin-bottom:10px;">✓ Đang dùng tài khoản Heyzine riêng của bạn.</div>` : ''}
        <div class="hint-box" style="margin-bottom:12px;">
          <b>Cách lấy API Key + Client ID (miễn phí, khoảng 1 phút):</b>
          <ol style="margin:8px 0 0;padding-left:20px;font-size:13px;line-height:1.6;">
            <li>Bấm vào đây → <a href="https://heyzine.com/developers" target="_blank" rel="noopener">heyzine.com/developers</a></li>
            <li>Chưa có tài khoản thì bấm <b>"register"</b> để đăng ký (miễn phí); có rồi thì bấm <b>"Login"</b>.</li>
            <li>Đăng nhập xong, NGAY TRÊN CÙNG TRANG ĐÓ sẽ hiện <b>Client ID</b> và <b>API Key</b> của bạn — copy 2 giá trị này.</li>
            <li>Quay lại đây, dán vào 2 ô bên dưới rồi bấm "Lưu kết nối".</li>
          </ol>
        </div>
        <label>API Key</label>
        <input id="tk-heyzine-key" type="password" value="${esc(state.heyzineApiKey)}" placeholder="Dán API Key từ Heyzine">
        <label style="margin-top:10px;">Client ID</label>
        <input id="tk-heyzine-client" type="text" value="${esc(state.heyzineClientId)}" placeholder="Dán Client ID từ Heyzine">
        ${state.heyzineError ? `<div class="error-box" style="margin-top:10px;">${esc(state.heyzineError)}</div>` : ''}
        ${state.heyzineSaved ? `<div class="hint-box" style="margin-top:10px;">✓ Đã lưu.</div>` : ''}
        <div class="btn-row">
          <button class="btn" id="tk-save-heyzine" ${state.heyzineSaving ? 'disabled' : ''}>${state.heyzineSaving ? 'Đang lưu…' : 'Lưu kết nối'}</button>
          ${(p.sps_heyzine_api_key && p.sps_heyzine_client_id) ? `<span class="btn-ghost btn" id="tk-disconnect-heyzine">Ngắt kết nối, dùng lại tài khoản chung</span>` : ''}
        </div>
        <div class="hint-box" style="margin-top:12px;">
          <b>Sau khi kết nối, xuất ebook thế nào?</b> Không cần tự tay tải/upload gì lên Heyzine cả — vào <b>"Viết Nội Dung"</b>, chọn sản phẩm, bấm <b>"Xuất thành Ebook"</b> như bình thường, app sẽ TỰ ĐỘNG tạo sách lật NGAY TRONG tài khoản Heyzine của bạn. Muốn thêm nhạc nền/đổi kiểu lật trang: vào lại <a href="https://heyzine.com/developers" target="_blank" rel="noopener">heyzine.com</a>, tìm đúng cuốn sách vừa xuất trong danh sách của bạn để chỉnh.
        </div>
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
    const keyEl = container.querySelector('#tk-heyzine-key');
    keyEl.oninput = () => { state.heyzineApiKey = keyEl.value; };
    const clientEl = container.querySelector('#tk-heyzine-client');
    clientEl.oninput = () => { state.heyzineClientId = clientEl.value; };
    container.querySelector('#tk-save-heyzine').onclick = async () => {
      state.heyzineSaved = false; state.heyzineError = null;
      if (!state.heyzineApiKey.trim() || !state.heyzineClientId.trim()) { state.heyzineError = 'Cần nhập đủ cả API Key và Client ID.'; draw(); return; }
      state.heyzineSaving = true; draw();
      const { error } = await supabaseClient.rpc('update_sps_heyzine_credentials', { p_api_key: state.heyzineApiKey.trim(), p_client_id: state.heyzineClientId.trim() });
      state.heyzineSaving = false;
      if (error) { state.heyzineError = error.message; }
      else {
        if (currentProfile) { currentProfile.sps_heyzine_api_key = state.heyzineApiKey.trim(); currentProfile.sps_heyzine_client_id = state.heyzineClientId.trim(); }
        state.heyzineSaved = true;
      }
      draw();
    };
    const disconnectBtn = container.querySelector('#tk-disconnect-heyzine');
    if (disconnectBtn) disconnectBtn.onclick = async () => {
      state.heyzineSaving = true; draw();
      const { error } = await supabaseClient.rpc('update_sps_heyzine_credentials', { p_api_key: null, p_client_id: null });
      state.heyzineSaving = false;
      if (error) { state.heyzineError = error.message; }
      else {
        if (currentProfile) { currentProfile.sps_heyzine_api_key = null; currentProfile.sps_heyzine_client_id = null; }
        state.heyzineApiKey = ''; state.heyzineClientId = ''; state.heyzineSaved = false;
      }
      draw();
    };
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
