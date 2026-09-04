// Sản Phẩm Số — "Tài khoản" (route ẩn, vào qua bấm tên ở cuối sidebar). Trọng tâm là hiện rõ lượt AI
// RIÊNG của Sản Phẩm Số (khác hẳn Xây Nhân Hiệu — xem app-shell.js) + đổi mật khẩu. KHÔNG có phần
// sửa tên/ảnh đại diện như nhan-hieu/js/tai-khoan.js — profiles RLS đã khoá update trực tiếp từ
// client cho user thường (chỉ admin), nhan-hieu's trực tiếp .update() hiện đang không có tác dụng
// thật cho user thường; không lặp lại pattern đó ở đây (spawn_task riêng để rà lại bên nhan-hieu).
(function () {

// 5 bài nhạc nền gợi ý cho Heyzine Background Audio (2026-09-04, Quỳnh: "cho list 5 bài đi cho ngta
// chọn" — sau khi đã đổi từ Bensound (cần ghi nguồn) sang Pixabay (không cần)). Mỗi bài đã tự vào
// trang Pixabay xác nhận THẬT có nhãn "Free for use under the Pixabay Content License" (miễn phí,
// không bắt buộc ghi nguồn) trước khi đưa vào đây, không đoán.
const PIXABAY_MUSIC_LIST_HTML = `
  <ul style="margin:6px 0 0;padding-left:18px;">
    <li><a href="https://pixabay.com/music/modern-classical-piano-waltz-elegant-and-graceful-instrumental-music-285601/" target="_blank" rel="noopener">Piano Waltz – Elegant and Graceful</a> — piano nhẹ nhàng, ấm áp</li>
    <li><a href="https://pixabay.com/music/modern-classical-calm-classical-piano-melody-293695/" target="_blank" rel="noopener">Calm Classical Piano Melody</a> — piano cổ điển, êm dịu</li>
    <li><a href="https://pixabay.com/music/acoustic-group-warm-acoustic-guitar-232912/" target="_blank" rel="noopener">Warm Acoustic Guitar</a> — guitar mộc, ấm áp</li>
    <li><a href="https://pixabay.com/music/beautiful-plays-ambient-piano-and-strings-10711/" target="_blank" rel="noopener">Ambient Piano and Strings</a> — piano + dây, sâu lắng</li>
    <li><a href="https://pixabay.com/music/modern-classical-bookshop-afternoon-cozy-reading-573881/" target="_blank" rel="noopener">Bookshop Afternoon Cozy Reading</a> — đúng không khí đọc sách, ấm cúng</li>
  </ul>
`;

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
        <h2 style="font-size:16px;margin-bottom:6px;">📖 Kết nối Heyzine riêng (bắt buộc)</h2>
        <div style="font-size:13px;color:var(--ink-soft);margin-bottom:10px;">Cần kết nối tài khoản Heyzine của riêng bạn (miễn phí) mới tạo được sách lật — mỗi người bán 1 tài khoản riêng để tự chỉnh nhạc nền/tiếng lật trang được sau này. Cũng kết nối được ngay tại màn "Chọn Loại Sản Phẩm Số" hoặc "Viết Nội Dung" lúc tạo sách lật, không nhất thiết phải vào đây trước.</div>
        ${p.sps_heyzine_api_key && p.sps_heyzine_client_id ? `<div class="hint-box" style="margin-bottom:10px;">✓ Đang dùng tài khoản Heyzine riêng của bạn.</div>` : ''}
        <div class="hint-box" style="margin-bottom:12px;">
          <b>Cách lấy API Key + Client ID (miễn phí, khoảng 1 phút):</b>
          <ol style="margin:8px 0 0;padding-left:20px;font-size:13px;line-height:1.7;">
            <li>Mở <a href="https://heyzine.com/developers" target="_blank" rel="noopener">heyzine.com/developers</a> — hoặc vào heyzine.com, bấm icon <b style="color:var(--accent);">☰</b> (menu) góc trên bên trái → chọn <b style="color:var(--accent);">API</b>.</li>
            <li>Chưa có tài khoản: bấm <b style="color:var(--accent);">"register"</b> (Đăng ký). Đã có: bấm <b style="color:var(--accent);">"Login"</b> (Đăng nhập) — miễn phí.</li>
            <li>Đăng nhập xong, trang hiện 2 ô <b style="color:var(--accent);">"This is your Client Id:"</b> (Client ID của bạn) và <b style="color:var(--accent);">"This is your API key:"</b> (API Key của bạn) — không cần bấm icon con mắt để xem, bấm thẳng nút <b style="color:var(--accent);">"Copy"</b> (Sao chép) từng ô là được.</li>
            <li>Quay lại đây, dán vào 2 ô bên dưới rồi bấm "Lưu kết nối".</li>
          </ol>
        </div>
        <label>Client ID</label>
        <input id="tk-heyzine-client" type="text" value="${esc(state.heyzineClientId)}" placeholder="Dán Client ID từ Heyzine">
        <label style="margin-top:10px;">API Key</label>
        <input id="tk-heyzine-key" type="password" value="${esc(state.heyzineApiKey)}" placeholder="Dán API Key từ Heyzine">
        ${state.heyzineError ? `<div class="error-box" style="margin-top:10px;">${esc(state.heyzineError)}</div>` : ''}
        ${state.heyzineSaved ? `<div class="hint-box" style="margin-top:10px;">✓ Đã lưu.</div>` : ''}
        <div class="btn-row">
          <button class="btn" id="tk-save-heyzine" ${state.heyzineSaving ? 'disabled' : ''}>${state.heyzineSaving ? 'Đang lưu…' : 'Lưu kết nối'}</button>
          ${(p.sps_heyzine_api_key && p.sps_heyzine_client_id) ? `<span class="btn-ghost btn" id="tk-disconnect-heyzine">Ngắt kết nối</span>` : ''}
        </div>
        ${(p.sps_heyzine_api_key && p.sps_heyzine_client_id) ? `<div style="font-size:12px;color:var(--ink-soft);margin-top:6px;">Ngắt kết nối sẽ khiến bạn KHÔNG tạo/xuất sách lật được nữa cho tới khi kết nối lại (đã bắt buộc với mọi người bán) — chỉ dùng khi muốn đổi sang tài khoản Heyzine khác.</div>` : ''}
        <div class="hint-box" style="margin-top:12px;">
          <b>Sau khi kết nối, xuất ebook thế nào?</b> Không cần tự tay tải/upload gì lên Heyzine cả — vào <b>"Viết Nội Dung"</b>, chọn sản phẩm, bấm <b>"Xuất thành Ebook"</b> như bình thường, app sẽ TỰ ĐỘNG tạo sách lật NGAY TRONG tài khoản Heyzine của bạn.
        </div>
        <div class="hint-box" style="margin-top:10px;">
          <b>Thêm nhạc nền + tiếng lật trang:</b>
          <ol style="margin:6px 0 0;padding-left:20px;font-size:13px;line-height:1.7;">
            <li>Vào <a href="https://heyzine.com" target="_blank" rel="noopener">heyzine.com</a>, bấm <b style="color:var(--accent);">"Dashboard"</b> → mở đúng cuốn sách vừa tạo → bấm <b style="color:var(--accent);">"Edit"</b> (Chỉnh sửa).</li>
            <li>Thêm nhạc nền: cột <b>STYLE</b> bên trái → bấm <b style="color:var(--accent);">"Background Audio"</b> (Âm thanh nền). 5 bài gợi ý có sẵn (Pixabay, MIỄN PHÍ, KHÔNG cần mua, KHÔNG cần ghi nguồn) — bấm 1 bài, bấm nút <b style="color:var(--accent);">"Download"</b> màu xanh trên trang đó để tải MP3 về máy, rồi tải chính file đó lên "Background Audio":
              ${PIXABAY_MUSIC_LIST_HTML}
              Chọn trang bắt đầu/kết thúc phát, chỉnh âm lượng/lặp lại.
            </li>
            <li>Bật tiếng lật trang: cũng cột STYLE → bấm <b style="color:var(--accent);">"Page Effect"</b> (Hiệu ứng lật trang) → bật công tắc <b style="color:var(--accent);">"Sound on page turn"</b> (Bật âm thanh khi lật trang).</li>
          </ol>
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
