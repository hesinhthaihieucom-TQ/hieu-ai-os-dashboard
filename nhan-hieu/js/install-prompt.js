(function(){
// Hỏi cài app lên màn hình chính ngay sau khi tour hướng dẫn lần đầu kết thúc — lúc này người
// dùng vừa xem qua hết các bước, đúng thời điểm hợp lý để rủ họ cài thay vì hỏi ngay lúc vừa vào.
// Android/Chrome: dùng đúng sự kiện beforeinstallprompt (bắt sẵn ở index.html) để bật hộp thoại
// cài đặt THẬT của trình duyệt. iOS Safari không có API này — chỉ hiện hướng dẫn thao tác tay.

function isStandalone(){
  return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
}
function isIOS(){
  return /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream;
}

function maybeShowInstallPrompt(){
  if(isStandalone()) return; // đã cài rồi, khỏi hỏi lại
  if(document.getElementById('install-prompt-overlay')) return;

  const hasNativePrompt = !!window.__deferredInstallPrompt;
  const ios = isIOS();
  if(!hasNativePrompt && !ios) return; // không rơi vào trường hợp nào cài được thì thôi, khỏi làm phiền

  const overlay = document.createElement('div');
  overlay.id = 'install-prompt-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(20,24,20,.6);display:flex;align-items:center;justify-content:center;padding:20px;';
  overlay.innerHTML = `
    <div style="max-width:360px;width:100%;background:#fff;border-radius:16px;padding:26px 24px;text-align:center;box-shadow:0 20px 50px rgba(0,0,0,.3);">
      <img src="assets/icon-192.png" alt="" style="width:56px;height:56px;border-radius:14px;margin-bottom:14px;">
      <div style="font-family:'Playfair Display',serif;font-size:20px;color:#1E2420;margin-bottom:8px;">Cài Xây Nhân Hiệu lên màn hình chính?</div>
      ${ios ? `
        <div style="font-size:13.5px;color:#5B5F55;line-height:1.7;margin-bottom:18px;">Mở nhanh như 1 app riêng, không cần mở trình duyệt trước:<br>
          Bấm nút <b>Chia sẻ</b> (hình vuông có mũi tên đi lên) ở thanh dưới Safari → chọn <b>"Thêm vào MH chính"</b>.
        </div>
        <button id="ip-dismiss" style="width:100%;background:var(--accent,#2F6F62);color:#fff;border:none;border-radius:999px;padding:13px;font-size:14.5px;font-weight:600;cursor:pointer;">Đã hiểu</button>
      ` : `
        <div style="font-size:13.5px;color:#5B5F55;line-height:1.7;margin-bottom:18px;">Mở nhanh như 1 app riêng, không cần mở trình duyệt trước — cài mất vài giây.</div>
        <button id="ip-install" style="width:100%;background:var(--accent,#2F6F62);color:#fff;border:none;border-radius:999px;padding:13px;font-size:14.5px;font-weight:600;cursor:pointer;margin-bottom:10px;">Cài đặt ngay</button>
        <span id="ip-later" style="display:inline-block;font-size:13px;color:#5B5F55;cursor:pointer;">Để sau</span>
      `}
    </div>
  `;
  document.body.appendChild(overlay);

  function close(){ overlay.remove(); }
  const dismissBtn = overlay.querySelector('#ip-dismiss');
  if(dismissBtn) dismissBtn.onclick = close;
  const laterBtn = overlay.querySelector('#ip-later');
  if(laterBtn) laterBtn.onclick = close;
  const installBtn = overlay.querySelector('#ip-install');
  if(installBtn) installBtn.onclick = async ()=>{
    const promptEvent = window.__deferredInstallPrompt;
    if(!promptEvent){ close(); return; }
    installBtn.disabled = true;
    promptEvent.prompt();
    try{ await promptEvent.userChoice; } catch(e){}
    window.__deferredInstallPrompt = null;
    close();
  };
}

window.maybeShowInstallPrompt = maybeShowInstallPrompt;
})();
