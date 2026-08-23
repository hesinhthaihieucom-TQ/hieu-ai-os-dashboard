(function(){
// Hướng dẫn từng bước sau khi đăng nhập lần đầu — copy cơ chế từ nhan-hieu/js/onboarding-tour.js
// (2026-08-23, áp dụng quy tắc bên đó cho Sổ Dòng Tiền Tâm Thức). Làm tối cả web, che phần nội
// dung chính bằng 1 trang chào mừng, trỏ sáng vào từng mục sidebar kèm giải thích ngắn.
// Chỉ hiện đúng 1 lần/tài khoản (đánh dấu ở server qua profiles.tc_onboarding_seen — CỘT RIÊNG,
// không dùng chung onboarding_seen của nhan-hieu) — dùng localStorage (tiền tố RIÊNG "tc_...", khác
// "xnh_..." của nhan-hieu vì 2 app có thể chung 1 origin) chỉ để tránh nháy lại trong lúc chờ RPC.

const STEPS = [
  { key:'ghi-chep', text:'Bắt đầu từ đây mỗi ngày — ghi thu chi + chọn Vibe Check (cảm nhận lúc tiền vào/ra). Đây là dữ liệu gốc cho mọi tính năng khác.' },
  { key:'kien-thuc', text:'Đọc trước Dòng Tiền Bình An/Sợ Hãi, Nút Chặn Dòng Tiền, 5 Trụ Cột Năng Lượng Bản Thể — hiểu gốc rễ trước khi thực hành.' },
  { key:'thiet-lap-nhanh', text:'Làm bài này để điền sẵn Quỹ Khẩn Cấp/Nợ/Tài Sản ban đầu, đồng thời ra luôn Điểm Nghiệp Tiền và soi khâu tâm thức tiền đang yếu nhất.' },
  { key:'tang-thuc', text:'Ghi lại niềm tin cũ về tiền hình thành từ ký ức/tuổi thơ — gốc rễ sâu nhất đang nuôi các Nút Chặn Dòng Tiền bạn hay gặp.' },
  { key:'muc-tieu', text:'Đặt mục tiêu tháng này TRƯỚC khi ghi chép — không phải chuyện cuối tháng mới nghĩ tới.' },
  { key:'tong-ket-tuan', text:'Cuối tuần quay lại đây xem tiền đi đâu nhiều nhất, tự đánh giá vài trục ngoài tài chính.' },
  { key:'tong-ket-thang', text:'Cập nhật tài sản/tiêu sản mỗi tháng — Tài Sản Ròng là con số quan trọng nhất của cuốn sổ này.' },
  { key:'quan-ly-no', text:'Nhập từng khoản nợ để xem chiến lược trả nợ Snowball/Avalanche nào nhanh hơn, tiết kiệm lãi hơn.' },
];

const STORAGE_PREFIX = 'tc_onboarding_seen_';

function hasSeenTourLocally(userId){
  try { return localStorage.getItem(STORAGE_PREFIX + userId) === '1'; } catch(e){ return false; }
}
function markTourSeenLocally(userId){
  try { localStorage.setItem(STORAGE_PREFIX + userId, '1'); } catch(e){}
}

// alreadySeen: cờ profiles.tc_onboarding_seen lấy từ server (nguồn sự thật chính).
// onSeen: callback để gọi RPC đánh dấu đã xem ở server khi tour kết thúc/bị bỏ qua.
function startOnboardingTour(userId, alreadySeen, onSeen){
  if(!userId || alreadySeen || hasSeenTourLocally(userId)) return;
  if(document.getElementById('onboarding-tour-overlay')) return;
  const availableSteps = STEPS.filter(s => document.querySelector(`.sidebar-item[data-key="${s.key}"]`));
  if(availableSteps.length === 0) return;
  const sidebarEl = document.querySelector('.sidebar');
  // Trên điện thoại, sidebar là ngăn kéo ẩn ngoài màn hình theo mặc định — phải mở ra trong lúc
  // chạy tour thì mới trỏ sáng đúng vị trí thật của từng mục (không ảnh hưởng bản desktop).
  if(sidebarEl) sidebarEl.classList.add('open');
  const sidebarWidth = sidebarEl ? sidebarEl.getBoundingClientRect().width : 260;

  let idx = 0;
  const overlay = document.createElement('div');
  overlay.id = 'onboarding-tour-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;z-index:9999;pointer-events:none;';
  overlay.innerHTML = `
    <div id="ot-welcome" style="position:fixed;top:0;left:${sidebarWidth}px;right:0;bottom:0;display:flex;align-items:center;justify-content:center;text-align:center;pointer-events:none;">
      <div style="max-width:420px;padding:0 24px;">
        <div style="font-family:'Playfair Display',serif;font-size:30px;color:#fff;margin-bottom:12px;">Chào mừng đến với Sổ Dòng Tiền Tâm Thức!</div>
        <div style="font-size:14.5px;color:#DCEAE4;line-height:1.6;">Cùng xem nhanh từng bước ở sidebar bên trái trước khi bắt đầu nhé.</div>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  function finish(){
    markTourSeenLocally(userId);
    if(typeof onSeen === 'function') onSeen();
    overlay.remove();
    if(sidebarEl) sidebarEl.classList.remove('open');
    window.removeEventListener('hashchange', finish);
  }
  window.addEventListener('hashchange', finish);

  // Màn chốt sau bước cuối — KHÁC nhan-hieu (cảnh báo lượt AI, không áp dụng ở đây vì app này
  // không dùng AI): nhắc nhẹ về 14 ngày dùng thử + Ghi Chép/Kiến Thức Nền Tảng luôn free.
  function renderClosingWarning(){
    overlay.innerHTML = `
      <div style="position:fixed;inset:0;background:rgba(20,24,20,.82);display:flex;align-items:center;justify-content:center;pointer-events:auto;">
        <div style="max-width:380px;background:#fff;border-radius:14px;padding:26px 24px;text-align:center;box-shadow:0 12px 36px rgba(0,0,0,.3);">
          <div style="font-size:34px;margin-bottom:10px;">🌱</div>
          <div style="font-family:'Playfair Display',serif;font-size:20px;color:#1E2420;margin-bottom:10px;">Trước khi bắt đầu</div>
          <div style="font-size:14px;line-height:1.6;color:#1E2420;margin-bottom:18px;">Ghi Chép Hàng Ngày và Kiến Thức Nền Tảng dùng <b>miễn phí mãi mãi</b>. Các tính năng phân tích sâu hơn có <b>14 ngày dùng thử</b>, sau đó mở khoá trọn đời chỉ 1 lần nếu bạn thấy hữu ích.</div>
          <button id="ot-start" style="background:var(--accent, #2F6F62);color:#fff;border:none;border-radius:8px;padding:10px 20px;font-size:13.5px;font-weight:600;cursor:pointer;">Đã hiểu, bắt đầu dùng →</button>
        </div>
      </div>
    `;
    const startBtn = overlay.querySelector('#ot-start');
    if(startBtn) startBtn.onclick = finish;
  }

  function renderStep(){
    const step = availableSteps[idx];
    const target = document.querySelector(`.sidebar-item[data-key="${step.key}"]`);
    if(!target){ idx++; if(idx < availableSteps.length) renderStep(); else renderClosingWarning(); return; }
    const r = target.getBoundingClientRect();
    const pad = 6;
    const welcomeHtml = overlay.querySelector('#ot-welcome').outerHTML;
    overlay.innerHTML = `
      <div style="position:fixed;top:${r.top-pad}px;left:${r.left-pad}px;width:${r.width+pad*2}px;height:${r.height+pad*2}px;
        border-radius:10px;box-shadow:0 0 0 9999px rgba(20,24,20,.78);pointer-events:none;transition:all .2s ease;"></div>
    ` + welcomeHtml + `
      <div style="position:fixed;top:${Math.min(r.top, window.innerHeight-220)}px;left:${Math.min(r.left+r.width+16, window.innerWidth-320)}px;
        width:280px;background:#fff;border-radius:12px;padding:16px 18px;box-shadow:0 8px 28px rgba(0,0,0,.25);pointer-events:auto;">
        <div style="font-family:'IBM Plex Mono',monospace;font-size:11px;color:var(--ink-soft, #5B5F55);text-transform:uppercase;letter-spacing:.05em;margin-bottom:8px;">Bước ${idx+1}/${availableSteps.length}</div>
        <div style="font-size:14px;line-height:1.6;color:#1E2420;margin-bottom:14px;">${step.text}</div>
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <span id="ot-skip" style="font-size:12.5px;color:#5B5F55;cursor:pointer;">Bỏ qua hướng dẫn</span>
          <button id="ot-next" style="background:var(--accent, #2F6F62);color:#fff;border:none;border-radius:8px;padding:8px 16px;font-size:13px;font-weight:600;cursor:pointer;">${idx===availableSteps.length-1?'Tiếp →':'Tiếp theo →'}</button>
        </div>
      </div>
    `;
    const skipBtn = overlay.querySelector('#ot-skip');
    if(skipBtn) skipBtn.onclick = renderClosingWarning;
    const nextBtn = overlay.querySelector('#ot-next');
    if(nextBtn) nextBtn.onclick = ()=>{
      idx++;
      if(idx < availableSteps.length) renderStep(); else renderClosingWarning();
    };
  }

  renderStep();
}

window.startOnboardingTour = startOnboardingTour;
})();
