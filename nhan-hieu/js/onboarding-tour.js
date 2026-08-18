(function(){
// Hướng dẫn từng bước sau khi đăng ký — làm tối cả web, trỏ sáng vào từng mục sidebar,
// kèm 1 ô giải thích ngắn. Chỉ hiện 1 lần/tài khoản (lưu cờ vào localStorage).

const STEPS = [
  { key:'dinh-vi', text:'Bắt đầu từ đây — trả lời 18 câu hỏi để AI định vị thương hiệu của bạn. Mọi bước sau đều dựa vào kết quả này.' },
  { key:'sua-kenh', text:'Kiểm tra ảnh đại diện, ảnh bìa, bio... trên kênh thật có khớp định vị vừa chốt không.' },
  { key:'dinh-dang-content', text:'AI gợi ý 2-3 dạng content phù hợp nhất với bạn trong 12 dạng, kèm hướng dẫn cách làm.' },
  { key:'kho-content', text:'Kho bài mẫu theo trục nội dung — chọn 1 bài phù hợp để viết bài đầu tiên, đỡ phải nghĩ từ đầu.' },
  { key:'kho-hook', text:'Cần câu mở đầu hay? Nhập chủ đề, chọn mục tiêu (viral/uy tín/case study), AI sinh hook ngay.' },
  { key:'viet-content', text:'Viết bài hoàn chỉnh từ 1 ý tưởng — AI tự chấm điểm và gợi ý bản tối ưu hơn ngay sau khi viết xong.' },
  { key:'tai-che-viral', text:'Thấy bài viral của người khác? Dán vào đây để phân tích và tái chế đúng giọng văn của bạn.' },
  { key:'cham-diem-content', text:'Dán 1 bài viết vào — AI chấm theo 6 tiêu chí, chỉ ra chỗ yếu và cách sửa.' },
  { key:'cham-diem-hook', text:'Dán 1 câu hook — AI phân tích và gợi ý 3 bản cải thiện.' },
  { key:'lich-dang', text:'Xếp lịch đăng cả tuần — AI tự gợi ý, ưu tiên dùng luôn các bài bạn đã viết.' },
  { key:'day-bai', text:'Sau khi đăng, quay lại đây để biết nên bình luận gì và gắn tài sản nào theo từng mốc lượt xem.' },
  { key:'tao-anh', text:'Tạo ảnh bìa/thumbnail thương hiệu ngay trên web, không cần công cụ thiết kế.' },
];

const STORAGE_PREFIX = 'xnh_onboarding_seen_';

function hasSeenTour(userId){
  try { return localStorage.getItem(STORAGE_PREFIX + userId) === '1'; } catch(e){ return true; }
}
function markTourSeen(userId){
  try { localStorage.setItem(STORAGE_PREFIX + userId, '1'); } catch(e){}
}

function startOnboardingTour(userId){
  if(!userId || hasSeenTour(userId)) return;
  if(document.getElementById('onboarding-tour-overlay')) return;
  const availableSteps = STEPS.filter(s => document.querySelector(`.sidebar-item[data-key="${s.key}"]`));
  if(availableSteps.length === 0) return;

  let idx = 0;
  const overlay = document.createElement('div');
  overlay.id = 'onboarding-tour-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;z-index:9999;pointer-events:none;';
  document.body.appendChild(overlay);

  function finish(){
    markTourSeen(userId);
    overlay.remove();
    window.removeEventListener('hashchange', finish);
  }
  window.addEventListener('hashchange', finish);

  function renderStep(){
    const step = availableSteps[idx];
    const target = document.querySelector(`.sidebar-item[data-key="${step.key}"]`);
    if(!target){ idx++; if(idx < availableSteps.length) renderStep(); else finish(); return; }
    const r = target.getBoundingClientRect();
    const pad = 6;
    overlay.innerHTML = `
      <div style="position:fixed;top:${r.top-pad}px;left:${r.left-pad}px;width:${r.width+pad*2}px;height:${r.height+pad*2}px;
        border-radius:10px;box-shadow:0 0 0 9999px rgba(20,24,20,.78);pointer-events:none;transition:all .2s ease;"></div>
      <div style="position:fixed;top:${Math.min(r.top, window.innerHeight-220)}px;left:${Math.min(r.left+r.width+16, window.innerWidth-320)}px;
        width:280px;background:#fff;border-radius:12px;padding:16px 18px;box-shadow:0 8px 28px rgba(0,0,0,.25);pointer-events:auto;">
        <div style="font-family:'IBM Plex Mono',monospace;font-size:11px;color:var(--ink-soft, #5B5F55);text-transform:uppercase;letter-spacing:.05em;margin-bottom:8px;">Bước ${idx+1}/${availableSteps.length}</div>
        <div style="font-size:14px;line-height:1.6;color:#1E2420;margin-bottom:14px;">${step.text}</div>
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <span id="ot-skip" style="font-size:12.5px;color:#5B5F55;cursor:pointer;">Bỏ qua hướng dẫn</span>
          <button id="ot-next" style="background:var(--accent, #2F6F62);color:#fff;border:none;border-radius:8px;padding:8px 16px;font-size:13px;font-weight:600;cursor:pointer;">${idx===availableSteps.length-1?'Xong':'Tiếp theo →'}</button>
        </div>
      </div>
    `;
    const skipBtn = overlay.querySelector('#ot-skip');
    if(skipBtn) skipBtn.onclick = finish;
    const nextBtn = overlay.querySelector('#ot-next');
    if(nextBtn) nextBtn.onclick = ()=>{
      idx++;
      if(idx < availableSteps.length) renderStep(); else finish();
    };
  }

  renderStep();
}

window.startOnboardingTour = startOnboardingTour;
})();
