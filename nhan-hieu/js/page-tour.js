// Hướng dẫn kiểu "spotlight" trỏ vị trí từng phần tử NGAY TRONG TRANG (2026-08-31, chị Quỳnh chốt
// làm giống tro-ly-crm/js/page-tour.js cho nhan-hieu) — CÙNG kỹ thuật box-shadow spotlight với
// onboarding-tour.js/feature-tour.js (box-shadow 0 0 0 9999px phủ mờ toàn màn hình, trừ đúng khung
// quanh phần tử đang trỏ tới), nhưng viết thành 1 ENGINE DÙNG CHUNG cho MỌI trang (không chỉ sidebar)
// — mỗi module tự định nghĩa mảng bước {selector, title, text} rồi gọi window.startPageTour(steps)
// khi bấm nút "❓ Hướng dẫn" của trang đó. KHÔNG dùng chung file với onboarding-tour.js/feature-
// tour.js (deliberately copy kỹ thuật chứ không import, giống quy ước 2 file kia đã có sẵn) và KHÔNG
// dùng chung file với tro-ly-crm (khác app).
(function(){
  function renderStep(steps, idx, onDone){
    let overlay = document.getElementById('page-tour-overlay');
    if(!overlay){
      overlay = document.createElement('div');
      overlay.id = 'page-tour-overlay';
      overlay.style.cssText = 'position:fixed;inset:0;z-index:99999;';
      document.body.appendChild(overlay);
    }

    const step = steps[idx];
    const target = step.selector ? document.querySelector(step.selector) : null;

    function draw(){
      overlay.innerHTML = '';
      let rect;
      if(target){
        rect = target.getBoundingClientRect();
      } else {
        // Không tìm thấy phần tử (VD đang ở tab/màn hình khác) — vẫn hiện popup ở giữa màn hình
        // thay vì bỏ qua im lặng, để người dùng không cảm giác tour bị "gãy" giữa chừng.
        rect = { top: window.innerHeight/2 - 40, left: window.innerWidth/2 - 140, width: 280, height: 80 };
      }

      if(target){
        const spot = document.createElement('div');
        spot.style.cssText = `position:fixed;top:${rect.top-6}px;left:${rect.left-6}px;width:${rect.width+12}px;height:${rect.height+12}px;border-radius:10px;box-shadow:0 0 0 9999px rgba(20,24,20,.78);pointer-events:none;transition:all .15s ease;`;
        overlay.appendChild(spot);
      } else {
        const dim = document.createElement('div');
        dim.style.cssText = 'position:fixed;inset:0;background:rgba(20,24,20,.78);';
        overlay.appendChild(dim);
      }

      const cardWidth = 300;
      let top = rect.top;
      let left = rect.left + rect.width + 16;
      if(left + cardWidth + 24 > window.innerWidth){
        left = Math.max(16, rect.left - cardWidth - 16);
        if(left < 16 || left + cardWidth > rect.left){ // vẫn không đủ chỗ 2 bên -> đặt dưới phần tử
          left = Math.min(Math.max(16, rect.left), window.innerWidth - cardWidth - 16);
          top = rect.top + rect.height + 16;
        }
      }
      top = Math.min(Math.max(16, top), window.innerHeight - 200);

      const card = document.createElement('div');
      card.style.cssText = `position:fixed;top:${top}px;left:${left}px;width:${cardWidth}px;background:#fff;border-radius:12px;box-shadow:0 8px 28px rgba(0,0,0,.25);padding:18px;z-index:1;`;
      card.innerHTML = `
        <div style="font-family:'IBM Plex Mono',monospace;font-size:11px;letter-spacing:.06em;color:var(--accent,#2F6F62);text-transform:uppercase;margin-bottom:8px;">Bước ${idx+1}/${steps.length}</div>
        <div style="font-weight:700;font-size:14.5px;margin-bottom:6px;color:#1E2420;">${esc(step.title)}</div>
        <div style="font-size:13px;line-height:1.6;color:#5B5F55;">${esc(step.text)}</div>
        ${step.img ? `<img src="${step.img}" style="max-width:100%;border-radius:8px;margin-top:10px;border:1px solid #E4DFCF;">` : ''}
        <div style="display:flex;justify-content:space-between;align-items:center;margin-top:16px;">
          <span id="pt-skip" style="cursor:pointer;font-size:12.5px;color:#9CA396;">Bỏ qua</span>
          <div style="display:flex;gap:8px;">
            ${idx>0 ? `<span id="pt-back" style="cursor:pointer;font-size:12.5px;color:var(--accent,#2F6F62);padding:6px 10px;">← Trước</span>` : ''}
            <span id="pt-next" style="cursor:pointer;font-size:12.5px;font-weight:600;color:#fff;background:var(--accent,#2F6F62);padding:6px 14px;border-radius:999px;">${idx===steps.length-1?'Xong':'Tiếp →'}</span>
          </div>
        </div>
      `;
      overlay.appendChild(card);

      overlay.querySelector('#pt-skip').onclick = close;
      overlay.querySelector('#pt-next').onclick = ()=>{
        if(idx === steps.length-1) close();
        else go(idx+1);
      };
      const backBtn = overlay.querySelector('#pt-back');
      if(backBtn) backBtn.onclick = ()=>go(idx-1);
    }

    function close(){
      const el = document.getElementById('page-tour-overlay');
      if(el) el.remove();
      if(onDone) onDone();
    }

    if(target){
      target.scrollIntoView({ block:'center', behavior:'instant' });
      setTimeout(draw, 60);
    } else {
      draw();
    }

    function go(newIdx){ renderStep(steps, newIdx, onDone); }
  }

  // steps: [{ selector, title, text, img? }] — selector là CSS selector trỏ tới phần tử cần trỏ vào
  // (để trống nếu muốn hiện popup ở giữa màn hình). onDone (tuỳ chọn): gọi khi tour đóng, bất kể
  // đóng bằng cách nào (Bỏ qua/Xong/đi hết bước).
  window.startPageTour = function(steps, onDone){
    if(!steps || !steps.length) return;
    const existing = document.getElementById('page-tour-overlay');
    if(existing) existing.remove(); // chỉ 1 tour chạy tại 1 thời điểm
    renderStep(steps, 0, onDone);
  };
})();
