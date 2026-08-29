(function(){
// Hướng dẫn từng bước sau khi đăng nhập lần đầu — làm tối cả web, che phần nội dung chính
// bằng 1 trang chào mừng, trỏ sáng vào từng mục sidebar kèm giải thích ngắn.
// Chỉ hiện đúng 1 lần/tài khoản (đánh dấu ở server qua profiles.onboarding_seen, không phải
// theo trình duyệt) — dùng localStorage chỉ để tránh nháy lại trong lúc chờ gọi API đánh dấu.

const STEPS = [
  { key:'dinh-vi', text:'Bắt đầu từ đây — trả lời 16 câu hỏi để AI định vị thương hiệu của bạn. Mọi bước sau đều dựa vào kết quả này.' },
  { key:'sua-kenh', text:'Kiểm tra ảnh đại diện, ảnh bìa, bio... trên kênh thật có khớp định vị vừa chốt không.' },
  { key:'dinh-dang-content', text:'AI gợi ý 2-3 dạng content phù hợp nhất với bạn trong 12 dạng, kèm hướng dẫn cách làm.' },
  { key:'kho-content', text:'Kho bài mẫu theo trục nội dung — chọn 1 bài phù hợp để viết bài đầu tiên, đỡ phải nghĩ từ đầu.' },
  { key:'kho-hook', text:'Cần câu mở đầu hay? Nhập chủ đề, chọn mục tiêu (viral/uy tín/case study), AI sinh hook ngay.' },
  { key:'viet-content', text:'Viết bài hoàn chỉnh từ 1 ý tưởng — AI tự chấm điểm và gợi ý bản tối ưu hơn ngay sau khi viết xong.' },
  { key:'tai-che-viral', text:'Thấy bài viral của người khác? Dán vào đây để phân tích và tái chế đúng giọng văn của bạn.' },
  { key:'cham-diem-hub', text:'Dán bài viết hoặc riêng câu hook vào — AI chấm điểm chi tiết, chỉ ra chỗ yếu và cách sửa (2 tab Content/Hook).' },
  { key:'lich-dang', text:'Xếp lịch đăng cả tuần — AI tự gợi ý, ưu tiên dùng luôn các bài bạn đã viết.' },
  { key:'day-bai', text:'Sau khi đăng, quay lại đây để biết nên bình luận gì và gắn tài sản nào theo từng mốc lượt xem.' },
  { key:'tao-anh', text:'Tạo ảnh có chữ để đăng content (không phải ảnh bìa) — chọn bố cục, font, màu ngay trên web.' },
];

const STORAGE_PREFIX = 'xnh_onboarding_seen_';

function hasSeenTourLocally(userId){
  try { return localStorage.getItem(STORAGE_PREFIX + userId) === '1'; } catch(e){ return false; }
}
function markTourSeenLocally(userId){
  try { localStorage.setItem(STORAGE_PREFIX + userId, '1'); } catch(e){}
}

// alreadySeen: cờ profiles.onboarding_seen lấy từ server (nguồn sự thật chính).
// onSeen: callback để gọi RPC đánh dấu đã xem ở server khi tour kết thúc/bị bỏ qua.
function startOnboardingTour(userId, alreadySeen, onSeen){
  if(!userId || alreadySeen || hasSeenTourLocally(userId)) return;
  if(document.getElementById('onboarding-tour-overlay')) return;
  const availableSteps = STEPS.filter(s => document.querySelector(`.sidebar-item[data-key="${s.key}"]`));
  if(availableSteps.length === 0) return;
  const sidebarEl = document.querySelector('.sidebar');
  // Trên điện thoại, sidebar giờ là ngăn kéo ẩn ngoài màn hình theo mặc định — phải mở ra trong
  // lúc chạy tour thì mới trỏ sáng đúng vị trí thật của từng mục (không ảnh hưởng bản desktop,
  // class "open" chỉ có tác dụng trong media query mobile).
  if(sidebarEl) sidebarEl.classList.add('open');
  const sidebarWidth = sidebarEl ? sidebarEl.getBoundingClientRect().width : 260;

  let idx = 0;
  const overlay = document.createElement('div');
  overlay.id = 'onboarding-tour-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;z-index:9999;pointer-events:none;';
  overlay.innerHTML = `
    <div id="ot-welcome" style="position:fixed;top:0;left:${sidebarWidth}px;right:0;bottom:0;display:flex;align-items:center;justify-content:center;text-align:center;pointer-events:none;">
      <div style="max-width:420px;padding:0 24px;">
        <div style="font-family:'Playfair Display',serif;font-size:30px;color:#fff;margin-bottom:12px;">Chào mừng đến với Xây Nhân Hiệu!</div>
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

  // Màn chốt sau bước cuối — cảnh báo rõ trước khi họ bấm lung tung: mỗi hành động AI (viết bài,
  // chấm điểm, sinh hook...) trong lúc dùng thử sẽ trừ vào số lượt miễn phí có hạn.
  function renderClosingWarning(){
    overlay.innerHTML = `
      <div style="position:fixed;inset:0;background:rgba(20,24,20,.82);display:flex;align-items:center;justify-content:center;pointer-events:auto;">
        <div style="max-width:380px;background:#fff;border-radius:14px;padding:26px 24px;text-align:center;box-shadow:0 12px 36px rgba(0,0,0,.3);">
          <div style="font-size:34px;margin-bottom:10px;">🎁</div>
          <div style="font-family:'Playfair Display',serif;font-size:20px;color:#1E2420;margin-bottom:10px;">Lưu ý trước khi bắt đầu</div>
          <div style="font-size:14px;line-height:1.6;color:#1E2420;margin-bottom:18px;">Bạn có <b>${typeof TRIAL_AI_LIMIT!=='undefined'?TRIAL_AI_LIMIT:100} lượt dùng AI miễn phí</b> trong thời gian dùng thử. Mỗi lần bấm để AI viết bài, chấm điểm, sinh hook... sẽ trừ 1 lượt (có hành động tốn nhiều hơn 1 lượt) — nên làm kỹ, tránh bấm thử lung tung kẻo hết lượt sớm nhé!</div>
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
