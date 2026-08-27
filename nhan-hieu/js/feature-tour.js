(function(){
// Popup thông báo tính năng mới giữa màn hình + tuỳ chọn hướng dẫn từng bước (2026-08-22, theo yêu
// cầu chị Quỳnh: "hiện kiểu popup giữa màn hình... hỏi ngta có muốn hướng dẫn ko, ấn có thì hướng
// dẫn ngta đến các phần trong app luôn, từng bước luôn, y hệt như hướng dẫn lúc đầu vô app"). Cơ chế
// trỏ sáng từng bước CỐ Ý sao chép lại từ onboarding-tour.js thay vì tái dùng chung — 2 tour có vòng
// đời khác nhau (onboarding chạy 1 lần/tài khoản mãi mãi, cái này chạy lại mỗi khi có thông báo mới),
// tách riêng để sửa cái này không rủi ro ảnh hưởng luồng onboarding đã kiểm chứng.

// ann: 1 dòng từ bảng feature_announcements ({id, title, body, steps}). onDone: gọi khi popup đóng
// (bất kể bấm "Đã hiểu"/"Bỏ qua" hay đi hết các bước) — dùng để lưu last_seen_announcement_at và
// hiện tiếp thông báo kế tiếp trong hàng đợi nếu còn (xem app-shell.js).
function startFeatureAnnouncement(ann, onDone){
  if(!ann) return;
  if(document.getElementById('fa-overlay')) return;
  // Nhường chỗ nếu onboarding tour (hướng dẫn lần đầu vào app) đang chạy — 2 overlay trỏ sáng cùng
  // sidebar chồng lên nhau sẽ rối; popup này sẽ tự hiện lại ở lần điều hướng tiếp theo.
  if(document.getElementById('onboarding-tour-overlay')) return;

  const steps = Array.isArray(ann.steps) ? ann.steps.filter(s => s && s.key && s.text) : [];
  const sidebarEl = document.querySelector('.sidebar');

  const overlay = document.createElement('div');
  overlay.id = 'fa-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;z-index:9999;';
  document.body.appendChild(overlay);

  let idx = 0;
  let finished = false;

  function finish(){
    if(finished) return;
    finished = true;
    if(sidebarEl) sidebarEl.classList.remove('open');
    overlay.remove();
    window.removeEventListener('hashchange', finish);
    if(typeof onDone === 'function') onDone();
  }
  window.addEventListener('hashchange', finish);
  // 2026-08-27, chị Quỳnh báo "bấm vào hướng dẫn xong không thoát ra được để dùng app" — overlay này
  // phủ KÍN toàn màn hình (position:fixed;inset:0), trước đây CHỈ thoát được bằng đúng link "Bỏ qua"
  // nhỏ xíu trong thẻ (hoặc bấm trúng mục sidebar đang trỏ sáng) — bấm ra khoảng tối xung quanh không
  // có tác dụng gì, rất dễ tưởng bị kẹt. Giờ bấm bất kỳ đâu NGOÀI thẻ (data-fa-card) cũng thoát được,
  // giống hành vi bấm ra ngoài để đóng modal thông thường — không ảnh hưởng bấm trúng mục sidebar
  // đang trỏ sáng (phần đó nằm NGOÀI cây DOM của overlay, không đi qua listener này).
  overlay.addEventListener('click', (e)=>{ if(!e.target.closest('[data-fa-card]')) finish(); });

  function renderIntro(){
    overlay.innerHTML = `
      <div style="position:fixed;inset:0;background:rgba(20,24,20,.78);display:flex;align-items:center;justify-content:center;padding:20px;">
        <div data-fa-card style="position:relative;max-width:400px;width:100%;background:#fff;border-radius:14px;padding:26px 24px;text-align:center;box-shadow:0 12px 36px rgba(0,0,0,.3);">
          <span id="fa-close-x" style="position:absolute;top:10px;right:14px;font-size:18px;color:#9CA396;cursor:pointer;line-height:1;">✕</span>
          <div style="font-size:34px;margin-bottom:10px;">${esc(ann.emoji || '🎉')}</div>
          <div style="font-family:'Playfair Display',serif;font-size:20px;color:#1E2420;margin-bottom:10px;">${esc(ann.title)}</div>
          <div style="font-size:14px;line-height:1.6;color:#1E2420;margin-bottom:22px;white-space:pre-wrap;">${esc(ann.body)}</div>
          <div style="display:flex;gap:14px;justify-content:center;align-items:center;flex-wrap:wrap;">
            ${steps.length ? `
              <span id="fa-skip" style="font-size:12.5px;color:#5B5F55;cursor:pointer;">Bỏ qua</span>
              <button id="fa-tour" style="background:var(--accent, #2F6F62);color:#fff;border:none;border-radius:8px;padding:10px 20px;font-size:13.5px;font-weight:600;cursor:pointer;">Xem hướng dẫn →</button>
            ` : `
              <button id="fa-close" style="background:var(--accent, #2F6F62);color:#fff;border:none;border-radius:8px;padding:10px 20px;font-size:13.5px;font-weight:600;cursor:pointer;">Đã hiểu</button>
            `}
          </div>
        </div>
      </div>
    `;
    const skipBtn = overlay.querySelector('#fa-skip');
    if(skipBtn) skipBtn.onclick = finish;
    const closeBtn = overlay.querySelector('#fa-close');
    if(closeBtn) closeBtn.onclick = finish;
    const closeX = overlay.querySelector('#fa-close-x');
    if(closeX) closeX.onclick = finish;
    const tourBtn = overlay.querySelector('#fa-tour');
    if(tourBtn) tourBtn.onclick = ()=>{
      idx = 0;
      if(sidebarEl){
        sidebarEl.classList.add('open');
        // Trên di động, sidebar là ngăn kéo trượt ra (CSS transition .22s) — đo vị trí NGAY sau khi
        // thêm class "open" sẽ bắt trúng lúc ngăn kéo còn đang ở ngoài màn hình, trỏ sáng sai chỗ.
        // Đợi hết animation rồi mới đo.
        setTimeout(renderStep, 240);
      } else {
        renderStep();
      }
    };
  }

  function renderStep(){
    const step = steps[idx];
    const target = document.querySelector(`.sidebar-item[data-key="${step.key}"]`);
    if(!target){ idx++; if(idx < steps.length) renderStep(); else finish(); return; }
    const r = target.getBoundingClientRect();
    const pad = 6;
    // Ảnh minh hoạ (tuỳ chọn, xem quan-tri-thongbao.js) — dùng khi chỗ cần chỉ KHÔNG PHẢI mục sidebar
    // (VD 1 ô nhập chỉ hiện khi đã có dữ liệu cụ thể) — trỏ sáng vẫn dẫn đúng tới trang chứa nó, ảnh
    // bổ sung thêm vị trí chi tiết bên trong trang đó. Thẻ rộng hơn (320px) khi có ảnh để dễ nhìn.
    const cardWidth = step.img ? 320 : 280;
    overlay.innerHTML = `
      <div style="position:fixed;top:${r.top-pad}px;left:${r.left-pad}px;width:${r.width+pad*2}px;height:${r.height+pad*2}px;
        border-radius:10px;box-shadow:0 0 0 9999px rgba(20,24,20,.78);pointer-events:none;transition:all .2s ease;"></div>
      <div data-fa-card style="position:fixed;top:${Math.min(r.top, window.innerHeight-(step.img?380:220))}px;left:${Math.min(r.left+r.width+16, window.innerWidth-cardWidth-40)}px;
        width:${cardWidth}px;background:#fff;border-radius:12px;padding:16px 18px;box-shadow:0 8px 28px rgba(0,0,0,.25);pointer-events:auto;max-height:80vh;overflow-y:auto;">
        <span id="fa-close-x2" style="position:absolute;top:10px;right:14px;font-size:16px;color:#9CA396;cursor:pointer;line-height:1;">✕</span>
        <div style="font-family:'IBM Plex Mono',monospace;font-size:11px;color:var(--ink-soft, #5B5F55);text-transform:uppercase;letter-spacing:.05em;margin-bottom:8px;">Bước ${idx+1}/${steps.length}</div>
        ${step.img ? `<img src="${step.img}" style="width:100%;border-radius:8px;border:1px solid var(--line, #E4DFCF);margin-bottom:12px;display:block;">` : ''}
        <div style="font-size:14px;line-height:1.6;color:#1E2420;margin-bottom:14px;">${esc(step.text)}</div>
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <span id="fa-skip2" style="font-size:12.5px;color:#5B5F55;cursor:pointer;">Bỏ qua</span>
          <button id="fa-next" style="background:var(--accent, #2F6F62);color:#fff;border:none;border-radius:8px;padding:8px 16px;font-size:13px;font-weight:600;cursor:pointer;">${idx===steps.length-1?'Xong':'Tiếp theo →'}</button>
        </div>
      </div>
    `;
    const skip2 = overlay.querySelector('#fa-skip2');
    if(skip2) skip2.onclick = finish;
    const closeX2 = overlay.querySelector('#fa-close-x2');
    if(closeX2) closeX2.onclick = finish;
    const nextBtn = overlay.querySelector('#fa-next');
    if(nextBtn) nextBtn.onclick = ()=>{
      idx++;
      if(idx < steps.length) renderStep(); else finish();
    };
  }

  renderIntro();
}

window.startFeatureAnnouncement = startFeatureAnnouncement;
})();
