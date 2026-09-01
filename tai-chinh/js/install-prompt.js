(function(){
// Copy từ nhan-hieu/js/install-prompt.js (2026-08-23) — Sổ Dòng Tiền Tâm Thức CHƯA có onboarding
// tour riêng nên gọi maybeShowInstallPrompt() thẳng từ app-shell.js sau lần renderApp() ĐẦU TIÊN
// của phiên (không phải sau tour như bên nhan-hieu), xem initApp(). Android/Chrome: dùng đúng sự
// kiện beforeinstallprompt (bắt sẵn ở index.html) để bật hộp thoại cài đặt THẬT của trình duyệt.
// iOS Safari không có API này — chỉ hiện hướng dẫn thao tác tay.

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
      <img src="assets/logo-hieu-hanh.png" alt="" style="width:56px;height:56px;border-radius:14px;margin-bottom:14px;">
      <div style="font-family:'Playfair Display',serif;font-size:20px;color:#1E2420;margin-bottom:8px;">Cài Sổ Dòng Tiền Tâm Thức lên màn hình chính?</div>
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

// Cảnh báo trình duyệt-trong-app (2026-09-01, chị Quỳnh phản ánh: khách bấm link Facebook vào làm
// bài test, thoát ra là mất luôn, không quay lại ghi chép được). Facebook/Instagram/Zalo/Line mở
// link trong 1 webview RIÊNG của chính app đó, không phải Chrome/Safari thật — 2 hệ quả: (1) trên
// Android, KHÔNG BAO GIỜ bắn được sự kiện beforeinstallprompt (hasNativePrompt luôn false) nên
// maybeShowInstallPrompt() ở trên tự động không làm gì được, im lặng vô hiệu; (2) trên iOS, dù nút
// Chia sẻ trong webview này CÓ thể "Thêm vào MH chính" được, phần lớn các bản Facebook/Instagram vẫn
// không cho web push hoạt động ổn định (khác Safari thật). Vì vậy phải chủ động khuyên mở bằng trình
// duyệt ngoài THẬT SỰ, không chỉ dựa vào maybeShowInstallPrompt() như bình thường.
function detectInAppBrowser(){
  const ua = navigator.userAgent || '';
  if(/FBAN|FBAV|FB_IAB|FBIOS/i.test(ua)) return { key:'facebook', label:'Facebook' };
  if(/Instagram/i.test(ua)) return { key:'instagram', label:'Instagram' };
  if(/Zalo/i.test(ua)) return { key:'zalo', label:'Zalo' };
  if(/Line\//i.test(ua)) return { key:'line', label:'Line' };
  return null;
}

const IAB_BANNER_STORAGE_KEY = 'tc_iab_banner_dismissed_at';
function maybeShowInAppBrowserBanner(){
  if(isStandalone()) return; // đang chạy dạng app cài rồi thì chắc chắn không phải webview này nữa
  if(document.getElementById('iab-banner')) return;
  const iab = detectInAppBrowser();
  if(!iab) return;

  // Nhắc lại mỗi ngày (không phải mỗi lần mở trang) — đủ dai để họ thực sự để ý qua vài lần vào lại,
  // nhưng không làm phiền tới mức gây khó chịu ngay trong 1 phiên.
  try{
    const dismissedAt = Number(localStorage.getItem(IAB_BANNER_STORAGE_KEY) || 0);
    if(Date.now() - dismissedAt < 24 * 3600 * 1000) return;
  } catch(e){}

  const ios = isIOS();
  const instruction = ios
    ? `Bấm nút <b>···</b> (góc dưới màn hình) → chọn <b>"Mở bằng Safari"</b>`
    : `Bấm nút <b>⋮</b> (góc trên màn hình) → chọn <b>"Mở bằng Chrome"</b>`;

  const banner = document.createElement('div');
  banner.id = 'iab-banner';
  banner.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:10000;background:#1E2420;color:#fff;padding:14px 16px;font-size:13px;line-height:1.6;box-shadow:0 2px 12px rgba(0,0,0,.3);';
  banner.innerHTML = `
    <div style="max-width:480px;margin:0 auto;">
      ⚠️ Bạn đang mở trong <b>${iab.label}</b> — trình duyệt này không lưu được app lên máy và không gửi được thông báo nhắc ghi chép.<br>
      ${instruction}, hoặc bấm nút bên dưới để copy link rồi tự dán vào trình duyệt.
      <div style="margin-top:10px;display:flex;gap:8px;flex-wrap:wrap;">
        <span id="iab-copy" style="background:var(--accent,#2F6F62);padding:8px 16px;border-radius:999px;font-weight:600;cursor:pointer;">Copy link</span>
        <span id="iab-dismiss" style="padding:8px 16px;color:#C8CFC5;cursor:pointer;">Để sau</span>
      </div>
    </div>
  `;
  document.body.prepend(banner);

  const copyBtn = banner.querySelector('#iab-copy');
  copyBtn.onclick = async ()=>{
    try{ await navigator.clipboard.writeText(location.href); copyBtn.textContent = '✓ Đã copy — dán vào trình duyệt'; }
    catch(e){ copyBtn.textContent = location.href; }
  };
  banner.querySelector('#iab-dismiss').onclick = ()=>{
    try{ localStorage.setItem(IAB_BANNER_STORAGE_KEY, String(Date.now())); } catch(e){}
    banner.remove();
  };
}

window.maybeShowInAppBrowserBanner = maybeShowInAppBrowserBanner;
})();
