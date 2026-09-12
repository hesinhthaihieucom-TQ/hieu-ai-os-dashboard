// Bộ tiện ích dùng chung — rút gọn từ tai-chinh/js/util.js, CHỈ giữ phần thật sự dùng chung/generic
// (esc, modal, gọi API, lưu draft, biểu đồ cột đơn giản). Bỏ hết nội dung nghiệp vụ riêng của
// tai-chinh (5 Trụ Cột, GLOSSARY, danh mục thu/chi...) vì không áp dụng cho app sức khỏe này.
// esc() phải escape cả " và ' — thiếu escape " từng gây bug thật bên nhan-hieu (nội dung chèn vào
// thuộc tính HTML bọc "..." bị cắt mất khi gặp dấu " trong text), sửa đồng bộ luôn ở đây.
function esc(s){
  return String(s==null?'':s).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

// Phóng to 1 ảnh (vd ảnh sản phẩm) thành lightbox toàn màn hình — đóng bằng bấm ra ngoài hoặc Esc.
function openImageLightbox(src, alt){
  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(20,24,20,.88);display:flex;align-items:center;justify-content:center;padding:24px;cursor:zoom-out;';
  // 2026-09-12, chị Quỳnh: "hiện hình ảnh zoom lên đang bị... ko đc full hinh mà nó còn bé xíu" — với
  // ảnh nguồn có kích thước nhỏ (VD ảnh hướng dẫn chụp 180x180px), max-width/max-height:100% chỉ CO
  // NHỎ LẠI nếu ảnh to hơn khung, không bao giờ phóng to ảnh nhỏ lên — nên ảnh nhỏ vẫn hiện nhỏ giữa
  // khung tối mênh mông. Đổi sang width cố định theo % viewport để LUÔN phóng to đủ lớn, kể cả ảnh gốc
  // nhỏ (chấp nhận hơi mờ khi phóng ảnh nhỏ, còn hơn hiện bé xíu).
  overlay.innerHTML = `<img src="${esc(src)}" alt="${esc(alt||'')}" style="width:min(92vw,560px);max-height:88vh;object-fit:contain;border-radius:10px;box-shadow:0 12px 40px rgba(0,0,0,.4);">`;
  function close(){ overlay.remove(); document.removeEventListener('keydown', onKey); }
  function onKey(e){ if(e.key==='Escape') close(); }
  overlay.onclick = close;
  document.addEventListener('keydown', onKey);
  document.body.appendChild(overlay);
}

// "Nhịp dừng" (Stop-Point Trigger, 2026-08-31 — theo tài liệu triết lý Tinh-Khí-Thần chị Quỳnh gửi,
// xem kho-tai-lieu/triet-ly-tinh-khi-than-app-suc-khoe.md) — màn hình đen ngắn nhắc dừng lại thở khi
// điểm Khí/Thần ở mức thấp lúc lưu Theo Dõi Tuần. Bản gốc tài liệu đề xuất trigger "3 ngày liên tiếp"
// nhưng app hiện chỉ có check-in theo TUẦN (chưa có check-in hàng ngày) nên đơn giản hoá thành: hiện
// ngay khi điểm Khí hoặc Thần của tuần vừa lưu ≤4/10. Tự đóng sau 5 giây hoặc bấm ra ngoài đóng sớm.
function skStopPointOverlay(){
  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;z-index:9999;background:#14201B;display:flex;align-items:center;justify-content:center;padding:24px;cursor:pointer;';
  overlay.innerHTML = `
    <div style="text-align:center;color:#F7F4EC;">
      <div style="font-family:'IBM Plex Mono',monospace;font-size:13px;letter-spacing:.12em;opacity:.7;margin-bottom:14px;">NHỊP DỪNG</div>
      <div style="font-size:22px;font-weight:700;line-height:1.6;">DỪNG LẠI<br>THỞ 3 NHỊP<br>CHỌN LẠI</div>
    </div>
  `;
  function close(){ overlay.remove(); clearTimeout(timer); }
  overlay.onclick = close;
  document.body.appendChild(overlay);
  const timer = setTimeout(close, 5000);
}

// Popup xác nhận trước khi xoá dữ liệu — Promise<boolean>, true nếu người dùng bấm xác nhận.
function confirmModal(message, confirmLabel){
  return new Promise((resolve)=>{
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(20,24,20,.7);display:flex;align-items:center;justify-content:center;padding:20px;';
    overlay.innerHTML = `
      <div style="background:#fff;border-radius:14px;max-width:360px;width:100%;padding:22px;box-shadow:0 12px 40px rgba(0,0,0,.4);text-align:center;" onclick="event.stopPropagation();">
        <div style="font-size:15px;line-height:1.6;color:var(--ink);margin-bottom:20px;">${esc(message)}</div>
        <div style="display:flex;gap:10px;justify-content:center;">
          <span class="btn-ghost btn btn-sm" data-confirm-cancel="1">Huỷ</span>
          <button class="btn btn-sm" style="background:var(--danger);" data-confirm-ok="1">${esc(confirmLabel||'Xác nhận xoá')}</button>
        </div>
      </div>
    `;
    function close(result){ overlay.remove(); document.removeEventListener('keydown', onKey); resolve(result); }
    function onKey(e){ if(e.key==='Escape') close(false); }
    overlay.onclick = ()=>close(false);
    overlay.querySelector('[data-confirm-cancel]').onclick = ()=>close(false);
    overlay.querySelector('[data-confirm-ok]').onclick = ()=>close(true);
    document.addEventListener('keydown', onKey);
    document.body.appendChild(overlay);
  });
}

// Đặt hàng nhanh (2026-08-30, chị Quỳnh yêu cầu cho khách chọn sản phẩm rồi đặt hàng thẳng, có quà
// tặng theo tổng đơn) — modal dùng CHUNG cho mọi trang có gợi ý sản phẩm (Kiểm Tra Sức Khỏe, Theo
// Dõi Tuần, Sản Phẩm Unicity). CHỈ thu thông tin đơn hàng + địa chỉ giao — không thanh toán tự động,
// admin tự liên hệ khách chốt thanh toán (chị Quỳnh chốt 2026-08-30), ghi vào bảng sk_orders.
// Quà tặng tính CỨNG lúc đặt hàng: ≥2 sản phẩm và tổng ≥2 triệu → tặng bình lắc; tổng ≥5 triệu →
// tặng thêm 1 thỏi son Hàn (khách chọn màu, 2026-08-31 chị Quỳnh gửi ảnh thật + yêu cầu cho chọn màu).
const SK_GIFT_SHAKER_IMAGE = 'assets/gift-shaker-bottle.jpg';
const SK_LIPSTICK_COLORS = [
  { key:'503', label:'#503 Hồng Seoul', image:'assets/gift-lipstick-503-hong-seoul.jpg' },
  { key:'505', label:'#505 Cam Cà Rốt', image:'assets/gift-lipstick-505-cam-ca-rot.jpg' },
];
// Tính mức độ nguy cơ từ Kiểm Tra Sức Khỏe (survey_insulin/toxin/metabolic, sk_health_checkins) —
// TÁCH RA dùng chung giữa kiem-tra-suc-khoe.js (hiện kết quả) và lich-trinh.js (2026-09-05, chị
// Quỳnh: "người bình thường thì theo phác đồ của em, người có vấn đề sức khỏe nặng theo nhãn" — dùng
// mức "Cao" ở đây để quyết định hiện liều theo phác đồ combo hay theo đúng nhãn an toàn). GIỮ NGUYÊN
// công thức gốc khi tách ra — không đổi ngưỡng.
function skComputeHealthLevel(insulin, toxin, metabolic){
  const ci = (insulin||[]).length, ct = (toxin||[]).length, cm = (metabolic||[]).length;
  const meta = cm >= 3;
  const score = ci + ct + cm*2;
  let level;
  if(meta || score>=18) level = 'Cao';
  else if(score>=7) level = 'Trung bình';
  else level = 'Thấp';
  return { level, score, meta, ci, ct, cm };
}

// BMI dùng chung — trích từ theo-doi-tuan.js (2026-09-12) vì lich-trinh.js cũng cần biết "tạng người"
// (Gầy/Cân đối/Thừa cân-Béo phì) của khách để cá nhân hoá lịch trình ăn/tập theo đúng khung chị Quỳnh
// chốt (BMI/cân nặng — dùng lại số liệu app đã có, không hỏi thêm khách câu nào mới). Ngưỡng theo WHO
// khu vực Châu Á - Thái Bình Dương (thấp hơn chuẩn phương Tây, phù hợp hơn cho người Việt).
function skBmiFromMeasures(heightCm, weightKg){
  const h = parseFloat(heightCm), w = parseFloat(weightKg);
  if(!isFinite(h) || !isFinite(w) || h<=0) return null;
  const m = h/100;
  return Math.round(w/(m*m)*10)/10;
}
function skBmiCategory(bmi){
  if(bmi==null) return null;
  if(bmi<18.5) return { key:'gay', label:'Thiếu cân', color:'#2f7fc4', concern:false };
  if(bmi<23) return { key:'can_doi', label:'Bình thường', color:'#1f9d63', concern:false };
  if(bmi<25) return { key:'thua_can', label:'Thừa cân', color:'#e8643c', concern:true };
  return { key:'thua_can', label:'Béo phì', color:'#c0392b', concern:true };
}

// Mốc gần nhất có đủ chiều cao + cân nặng để tính BMI, từ sk_weekly_logs.metrics (2026-09-12) — dùng
// chung giữa theo-doi-tuan.js, lich-trinh.js (hiện lịch trình cá nhân hoá) và quan-tri.js (admin xem
// trước "tạng người" của khách khi tuỳ chỉnh lịch trình riêng) — quét từ mốc mới nhất (Tuần 8) lùi về
// "Bắt đầu", không bắt khách đo lại nếu đã có số liệu tuần trước.
function skLatestBmiCategoryFromMetrics(metrics){
  if(!metrics) return null;
  for(let week=8; week>=0; week--){
    const h = metrics.chieucao && metrics.chieucao[week];
    const w = metrics.cannang && metrics.cannang[week];
    if(h && w) return skBmiCategory(skBmiFromMeasures(h, w));
  }
  return null;
}

// 2026-09-12, chị Quỳnh: "lịch trình của khách đã gán gói là 1 lịch trình cụ thể như là sáng uống gì
// ăn gì, trưa uống gì ăn gì, tối... tập giờ nào tập gì" + xác nhận dùng khung BMI/cân nặng làm "tạng
// người" (Gầy - Cân đối - Thừa cân/Béo phì, khớp key của skBmiCategory ở trên — dùng LẠI đúng BMI đã
// tính ở Theo Dõi Tuần, không hỏi thêm khách câu nào mới). Nội dung là kiến thức dinh dưỡng/vận động
// CHUNG (không gắn sản phẩm/không phải công dụng TPCN). Đặt ở util.js (không phải lich-trinh.js) để
// quan-tri.js cũng dùng được làm bản nháp khi admin tuỳ chỉnh lịch trình riêng cho 1 khách.
const SK_DAILY_SCHEDULE_BY_BMI = {
  gay: {
    label:'Thiếu cân — cần tăng cân lành mạnh & tăng cơ',
    sang: { uong:'1 cốc nước ấm ngay khi thức dậy, có thể thêm 1 ly sữa/sinh tố năng lượng cao (chuối, bơ, yến mạch, sữa nguyên kem).', an:'Ăn no đủ 3 nhóm: tinh bột + đạm + chất béo tốt — VD trứng, bánh mì nguyên cám, bơ đậu phộng, sữa chua Hy Lạp.' },
    trua: { uong:'Uống đủ nước trước bữa 30 phút.', an:'Ăn đủ no, đạm NHIỀU HƠN quy tắc bàn tay thông thường (thêm nửa lòng bàn tay đạm), đủ tinh bột, thêm 1 phần chất béo tốt (dầu ô liu, quả bơ).' },
    toi: { uong:'Nước ấm hoặc trà thảo mộc.', an:'Không bỏ bữa tối — vẫn đủ đạm, có thể thêm bữa phụ nhẹ (sữa, các loại hạt) trước ngủ nếu đói.' },
    tap: { gio:'Chiều hoặc tối (17h-19h)', bai:'Tập kháng lực nhẹ (tạ tay/dây kháng lực) 2-3 buổi/tuần — ưu tiên xây cơ, KHÔNG tập cardio cường độ cao kéo dài (dễ đốt thêm năng lượng cần cho tăng cân).' },
  },
  can_doi: {
    label:'Bình thường — duy trì vóc dáng hiện tại',
    sang: { uong:'1 cốc nước ấm ngay khi thức dậy.', an:'Ăn sáng đầy đủ, cân bằng theo quy tắc bàn tay (tinh bột GI thấp + đạm + rau).' },
    trua: { uong:'Uống đủ nước trước bữa.', an:'Theo tỉ lệ 4-3-2-1: rau xanh nhiều nhất — đạm — tinh bột — chất béo.' },
    toi: { uong:'Nước ấm hoặc trà thảo mộc, hạn chế đồ uống có đường.', an:'Ăn nhẹ hơn bữa trưa, ưu tiên đạm + rau, giảm tinh bột, ăn trước 20h và cách giờ ngủ ít nhất 2-3 tiếng.' },
    tap: { gio:'Sáng sớm hoặc chiều tối, tuỳ lịch cá nhân', bai:'30 phút/buổi, 3-4 buổi/tuần — kết hợp cardio nhẹ (đi bộ nhanh, đạp xe) + vận động linh hoạt để duy trì thể lực.' },
  },
  thua_can: {
    label:'Thừa cân/Béo phì — cần giảm mỡ',
    sang: { uong:'1 cốc nước ấm, có thể thêm nước chanh ấm KHÔNG đường.', an:'Đủ đạm + rau, giảm tinh bột tinh chế (tránh xôi/bánh ngọt) — theo đúng nhịp 4-4-12 đã có.' },
    trua: { uong:'Uống đủ nước trước bữa 30 phút để giảm cảm giác đói giả.', an:'Rau xanh nhiều nhất (tỉ lệ 4-3-2-1), đạm nạc, tinh bột GI thấp lượng vừa phải, hạn chế đồ chiên rán.' },
    toi: { uong:'Nước ấm/trà thảo mộc không đường.', an:'Ăn nhẹ, ưu tiên rau + đạm, giảm tối đa tinh bột (tránh nhóm GI cao buổi tối), ăn trước 19-20h, giữ khoảng nhịn đêm 12 tiếng.' },
    tap: { gio:'Sáng sớm (trước ăn sáng, nếu thể lực cho phép) hoặc chiều tối', bai:'30-45 phút/buổi, 4-5 buổi/tuần — kết hợp cardio (đi bộ nhanh, đạp xe, bơi) + bài tập toàn thân nhẹ, tăng dần cường độ theo thời gian.' },
  },
};

function skOrderGift(total, itemCount){
  if(total >= 5000000) return { key:'binh_lac_son', label:'🎁 Tặng 1 bình lắc + 1 thỏi son Hàn — chọn màu bên dưới', images:[SK_GIFT_SHAKER_IMAGE], needsColor:true };
  if(total >= 2000000 && itemCount >= 2) return { key:'binh_lac', label:'🎁 Tặng 1 bình lắc', images:[SK_GIFT_SHAKER_IMAGE], needsColor:false };
  return null;
}

// Preview quà tặng dùng chung ở thanh tổng cuối trang (Kiểm Tra Sức Khỏe/Thư Viện Sức Khỏe) — 2026-09-05,
// chị Quỳnh phản hồi 2 lần: (1) "chưa có hình thỏi son và bình lắc" — trước đây thanh này chỉ hiện
// chữ, giờ hiện kèm ảnh thật; (2) ảnh "rất bé" + nói "chọn màu" mà không thấy màu nào — giờ hiện
// LUÔN cả 2 màu son ở đây (không chỉ bình lắc) để khách thấy trước có màu gì, màu thật chọn ở modal
// Đặt hàng. Bấm vào ảnh xem phóng to (openImageLightbox) — chưa chọn được màu ở đây, chỉ xem trước.
function skGiftPreviewHtml(gift){
  if(!gift) return '';
  const previewImages = (gift.images||[]).concat(gift.needsColor ? SK_LIPSTICK_COLORS.map(c=>c.image) : []);
  return `
    <div style="margin-top:8px;display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
      ${previewImages.map(src=>`<img src="${esc(src)}" alt="" data-zoom="${esc(src)}" style="width:60px;height:60px;object-fit:cover;border-radius:9px;flex-shrink:0;cursor:zoom-in;">`).join('')}
      <span style="font-size:13px;color:#e8643c;font-weight:700;">${esc(gift.label)}</span>
    </div>
  `;
}

function openOrderModal(ctx, products){
  const selected = new Set(products.map(p=>p.id));
  const formValues = { name: (ctx.profile && ctx.profile.full_name) || '', phone:'', address:'' };
  let giftColor = SK_LIPSTICK_COLORS[0].key;
  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(20,24,20,.7);display:flex;align-items:center;justify-content:center;padding:20px;overflow-y:auto;';

  function totals(){
    const chosen = products.filter(p=>selected.has(p.id));
    const total = chosen.reduce((s,p)=>s+Number(p.retail_price||0),0);
    const pv = chosen.reduce((s,p)=>s+Number(p.pv||0),0);
    return { chosen, total, pv, gift: skOrderGift(total, chosen.length) };
  }

  function bodyHtml(step, err){
    if(step==='done'){
      return `
        <div style="text-align:center;padding:10px 0;">
          <div style="font-size:38px;margin-bottom:10px;">✅</div>
          <div style="font-weight:700;font-size:16px;margin-bottom:8px;">Đã gửi yêu cầu đặt hàng</div>
          <div style="font-size:13.5px;color:var(--ink-soft);line-height:1.6;margin-bottom:18px;">Chị Quỳnh sẽ liên hệ bạn qua số điện thoại đã để lại để xác nhận và giao hàng.</div>
          <button class="btn btn-sm" data-order-close="1">Đóng</button>
        </div>`;
    }
    const { chosen, total, pv, gift } = totals();
    return `
      <div style="font-weight:700;font-size:16px;margin-bottom:14px;">Đặt hàng</div>
      <div style="max-height:38vh;overflow-y:auto;margin-bottom:14px;">
        ${products.map(p=>`
          <label style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--line);cursor:pointer;">
            <input type="checkbox" data-order-item="${esc(p.id)}" ${selected.has(p.id)?'checked':''}>
            <span style="flex:1;font-size:13.5px;">${esc(p.name)}</span>
            <span style="font-family:'IBM Plex Mono',monospace;font-size:13px;white-space:nowrap;">${Number(p.retail_price||0).toLocaleString('vi-VN')}đ</span>
          </label>
        `).join('')}
      </div>
      <div style="display:flex;justify-content:space-between;font-weight:700;font-size:15px;margin-bottom:6px;">
        <span>Tổng cộng</span><span style="color:var(--accent);">${total.toLocaleString('vi-VN')}đ</span>
      </div>
      ${gift ? `
        <div class="hint-box" style="margin-bottom:14px;">
          <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
            ${(gift.images||[]).map(src=>`<img src="${esc(src)}" alt="" data-zoom="${esc(src)}" style="width:56px;height:56px;object-fit:cover;border-radius:9px;flex-shrink:0;cursor:zoom-in;">`).join('')}
            <span>${esc(gift.label)}</span>
          </div>
          ${gift.needsColor ? `
            <div style="margin-top:12px;display:flex;gap:12px;flex-wrap:wrap;">
              ${SK_LIPSTICK_COLORS.map(c=>{
                const chosen = giftColor===c.key;
                return `
                <div data-gift-color-card="${esc(c.key)}" style="position:relative;display:flex;flex-direction:column;align-items:center;gap:6px;border:2px solid ${chosen?'var(--accent)':'var(--line)'};border-radius:12px;padding:10px;cursor:pointer;background:${chosen?'#eef6f0':'#fff'};width:96px;">
                  ${chosen ? `<div style="position:absolute;top:-9px;right:-9px;width:26px;height:26px;border-radius:50%;background:var(--accent);color:#fff;display:flex;align-items:center;justify-content:center;font-size:15px;font-weight:700;box-shadow:0 2px 6px rgba(0,0,0,.2);">✓</div>` : ''}
                  <img src="${esc(c.image)}" alt="" data-zoom="${esc(c.image)}" style="width:76px;height:76px;object-fit:cover;border-radius:9px;cursor:zoom-in;">
                  <span style="font-size:12px;font-weight:600;text-align:center;">${esc(c.label)}</span>
                  <span style="font-size:11px;font-weight:700;color:${chosen?'var(--accent)':'var(--ink-soft)'};">${chosen?'✓ Đã chọn':'Bấm để chọn'}</span>
                </div>
              `;}).join('')}
            </div>
            <div style="font-size:11.5px;color:var(--ink-soft);margin-top:8px;">Bấm vào ảnh để xem to hơn — bấm vào khung màu để chọn.</div>
          ` : ''}
        </div>
      ` : `<div style="height:14px;"></div>`}
      <label style="display:block;font-size:13px;font-weight:600;color:var(--ink-soft);">Họ tên người nhận</label>
      <input type="text" id="order-name" placeholder="Tên người nhận hàng" value="${esc(formValues.name)}">
      <label style="display:block;font-size:13px;font-weight:600;color:var(--ink-soft);margin-top:10px;">Số điện thoại</label>
      <input type="tel" id="order-phone" placeholder="09xxxxxxxx" value="${esc(formValues.phone)}">
      <label style="display:block;font-size:13px;font-weight:600;color:var(--ink-soft);margin-top:10px;">Địa chỉ giao hàng</label>
      <textarea id="order-address" placeholder="Số nhà, đường, phường/xã, tỉnh/thành..." style="min-height:60px;">${esc(formValues.address)}</textarea>
      ${err ? `<div style="color:var(--danger);font-size:13px;margin-top:8px;">${esc(err)}</div>` : ''}
      <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:16px;">
        <span class="btn-ghost btn btn-sm" data-order-cancel="1">Huỷ</span>
        <button class="btn btn-sm" data-order-submit="1" ${chosen.length===0?'disabled':''}>Gửi đặt hàng</button>
      </div>`;
  }

  function renderCard(step, err){
    overlay.innerHTML = `<div style="background:#fff;border-radius:14px;max-width:420px;width:100%;padding:24px;box-shadow:0 12px 40px rgba(0,0,0,.4);" onclick="event.stopPropagation();">${bodyHtml(step, err)}</div>`;
    bind(step);
  }

  function bind(step){
    if(step==='done'){
      const closeBtn = overlay.querySelector('[data-order-close]');
      if(closeBtn) closeBtn.onclick = close;
      return;
    }
    overlay.querySelectorAll('[data-order-item]').forEach(el=>{
      el.onchange = (e)=>{
        const id = el.getAttribute('data-order-item');
        if(e.target.checked) selected.add(id); else selected.delete(id);
        renderCard();
      };
    });
    // Bấm cả khung màu (2026-09-05, chị Quỳnh: trước dùng chấm radio nhỏ khó thấy là bấm để CHỌN —
    // bỏ hẳn radio, thay bằng dấu ✓ to + chữ "Đã chọn"/"Bấm để chọn" rõ ràng hơn). Ảnh bên trong khung
    // có handler zoom riêng (stopPropagation) nên bấm ảnh chỉ phóng to, không chọn nhầm màu khác.
    overlay.querySelectorAll('[data-gift-color-card]').forEach(el=>{
      el.onclick = ()=>{ giftColor = el.getAttribute('data-gift-color-card'); renderCard(); };
    });
    overlay.querySelectorAll('[data-zoom]').forEach(el=>{
      el.onclick = (e)=>{ e.preventDefault(); e.stopPropagation(); openImageLightbox(el.getAttribute('data-zoom'), ''); };
    });
    const nameEl = overlay.querySelector('#order-name');
    if(nameEl) nameEl.oninput = ()=>{ formValues.name = nameEl.value; };
    const phoneEl = overlay.querySelector('#order-phone');
    if(phoneEl) phoneEl.oninput = ()=>{ formValues.phone = phoneEl.value; };
    const addressEl = overlay.querySelector('#order-address');
    if(addressEl) addressEl.oninput = ()=>{ formValues.address = addressEl.value; };
    const cancelBtn = overlay.querySelector('[data-order-cancel]');
    if(cancelBtn) cancelBtn.onclick = close;
    const submitBtn = overlay.querySelector('[data-order-submit]');
    if(submitBtn) submitBtn.onclick = submit;
  }

  async function submit(){
    const name = formValues.name.trim();
    const phone = formValues.phone.trim();
    const address = formValues.address.trim();
    if(!name || !phone || !address){ renderCard(null, 'Vui lòng điền đủ tên, số điện thoại và địa chỉ.'); return; }
    const { chosen, total, pv, gift } = totals();
    const { error } = await ctx.supabase.from('sk_orders').insert({
      user_id: ctx.user.id,
      items: chosen.map(p=>({ product_id:p.id, name:p.name, price:Number(p.retail_price||0), pv:Number(p.pv||0) })),
      total_amount: total, total_pv: pv, gift: gift ? gift.key : null,
      gift_color: (gift && gift.needsColor) ? giftColor : null,
      shipping_name: name, shipping_phone: phone, shipping_address: address,
    });
    if(error){ renderCard(null, 'Lỗi khi gửi đơn: ' + error.message); return; }
    renderCard('done');
  }

  function close(){ overlay.remove(); document.removeEventListener('keydown', onKey); }
  function onKey(e){ if(e.key==='Escape') close(); }
  overlay.onclick = close;
  document.addEventListener('keydown', onKey);
  document.body.appendChild(overlay);
  renderCard();
}

// Trình bày lại các khối nội dung dài (thành phần/công dụng/nguyên nhân...) cho dễ đọc — chị Quỳnh
// phản hồi 2026-08-30: "chữ đang rít vào nhau", không điểm nhấn, 1 màu từ đầu tới cuối, đọc chán,
// muốn giống các file hướng dẫn có icon/màu/bảng biểu chị hay gửi. KHÔNG viết lại nội dung — chỉ đổi
// cách hiển thị: mỗi mục có icon + màu riêng theo loại, mỗi dòng "• " tách thành gạch đầu dòng thật,
// phần trước dấu "—"/":" đầu dòng được in đậm làm từ khoá.
const SK_SECTION_STYLES = [
  { test:/công dụng/i, icon:'💊', color:'#e8643c' },
  { test:/thành phần/i, icon:'🧪', color:'#1f9bb0' },
  { test:/cơ chế/i, icon:'⚙️', color:'#7c6bd4' },
  { test:/đối tượng|cách dùng/i, icon:'📋', color:'#1f9d63' },
  { test:/nghiên cứu/i, icon:'🔬', color:'#2f7fc4' },
  { test:/lưu ý|cảnh báo/i, icon:'⚠️', color:'#c0392b' },
];
function skSectionMeta(title){
  const hit = SK_SECTION_STYLES.find(s=>s.test.test(title||''));
  return hit || { icon:'📌', color:'var(--gold)' };
}

// Header dạng dải màu (giống các ô tiêu đề vàng trong file hướng dẫn chị gửi) — dùng cho tiêu đề 1
// mục nội dung dài (detail_sections, Thư Viện...).
function skSectionHeaderHtml(title, color, icon){
  return `<div style="display:inline-flex;align-items:center;gap:7px;background:${color}18;color:${color};border-radius:7px;padding:5px 12px;font-weight:700;font-size:12.5px;margin-bottom:10px;">${icon?`<span>${icon}</span>`:''}${esc(title||'')}</div>`;
}

// Cụm từ nói công dụng cụ thể (vd "giảm táo bón", "tăng cường hệ miễn dịch") được tô nổi bật — chị
// Quỳnh phản hồi 2026-08-31: chữ nói công dụng phải "làm nổi lên" giữa đoạn văn dài, không chỉ có
// từ khoá dẫn đầu dòng mới được in đậm.
const SK_BENEFIT_VERB_RE = /(giảm|tăng cường|hỗ trợ|cải thiện|ngăn ngừa|thúc đẩy|kích thích|điều hòa|điều hoà|thanh lọc|đào thải|phục hồi|làm sạch|làm đẹp|làm dịu|làm chậm|làm lành|nuôi dưỡng|bảo vệ|cân bằng|duy trì|bổ sung|tăng)\s+[^,.;•()\n—]{2,45}/gi;
function skHighlightBenefits(text){
  const s = String(text||'');
  let out = '', last = 0, m;
  SK_BENEFIT_VERB_RE.lastIndex = 0;
  while((m = SK_BENEFIT_VERB_RE.exec(s))){
    out += esc(s.slice(last, m.index));
    out += `<mark style="background:#fff3b0;color:var(--ink);padding:0 3px;border-radius:3px;font-weight:700;">${esc(m[0].trim())}</mark>`;
    last = m.index + m[0].length;
  }
  out += esc(s.slice(last));
  return out;
}

// body dạng text nhiều dòng — mỗi dòng "• "/"- " thành 1 gạch đầu dòng thật (<li>, các dòng liền
// nhau gộp thành 1 <ul>, GIỮ NGUYÊN thứ tự gốc, không dồn hết bullet xuống cuối); phần trước dấu
// "—"/":" xuất hiện SỚM (dưới ~60 ký tự) được in đậm làm từ khoá dẫn, phần còn lại của dòng được tô
// nổi bật ở các cụm nói công dụng cụ thể (skHighlightBenefits). Dòng không có "• " ở đầu render như
// đoạn văn thường (vd câu mở đầu/kết trước khi vào bullet).
function skRichBodyHtml(body){
  const lines = String(body||'').split('\n').map(l=>l.trim()).filter(Boolean);
  function formatLine(l){
    const m = l.match(/^(.{3,60}?)\s*(—|:)\s+(.*)$/);
    if(m) return `<b style="color:var(--ink);">${esc(m[1])}</b>${m[2]==='—' ? ' — ' : ': '}${skHighlightBenefits(m[3])}`;
    return skHighlightBenefits(l);
  }
  let html = '', bulletBuf = [];
  function flushBullets(){
    if(bulletBuf.length===0) return;
    html += `<ul style="margin:0 0 8px;padding-left:20px;">${bulletBuf.map(l=>`<li style="margin-bottom:9px;">${formatLine(l)}</li>`).join('')}</ul>`;
    bulletBuf = [];
  }
  lines.forEach(l=>{
    if(l.startsWith('•') || l.startsWith('-')){ bulletBuf.push(l.replace(/^[•-]\s*/,'')); }
    else { flushBullets(); html += `<p style="margin:0 0 8px;">${formatLine(l)}</p>`; }
  });
  flushBullets();
  return html;
}

// Nội dung đầy đủ 1 sản phẩm (short_description + detail_sections, dùng chung ở Sản Phẩm và Kiểm
// Tra Sức Khỏe — 2026-08-30, chị Quỳnh yêu cầu bấm vào sản phẩm gợi ý phải hiện luôn đủ thông tin
// tại chỗ, không điều hướng sang trang Sản Phẩm nữa).
function skProductDetailHtml(p){
  const sections = Array.isArray(p.detail_sections) ? p.detail_sections : [];
  return `
    ${p.short_description ? `<div style="font-size:14px;font-weight:600;line-height:1.6;">${esc(p.short_description)}</div>` : ''}
    ${sections.map(sec=>{
      const meta = skSectionMeta(sec.title);
      return `
      <div style="margin-top:18px;border-left:3px solid ${meta.color};padding-left:14px;">
        ${skSectionHeaderHtml(sec.title, meta.color, meta.icon)}
        <div style="font-size:13.5px;line-height:1.8;">${skRichBodyHtml(sec.body)}</div>
      </div>
    `;}).join('')}
    ${sections.length===0 && p.benefits ? `<div style="font-size:13.5px;line-height:1.8;margin-top:10px;">${skRichBodyHtml(p.benefits)}</div>` : ''}
  `;
}

// 1 dòng sản phẩm dạng đơn hàng thật — checkbox (mặc định đã chọn) + ảnh + tên/nhãn ưu tiên + PV/giá,
// tối đa 2 dòng lý do TÓM TẮT vì sao liên quan vấn đề khách đang gặp (p._note, cắt còn 2 dòng bằng
// line-clamp — không phải toàn bộ công dụng), "Xem đầy đủ công dụng" mới mở ra skProductDetailHtml
// (2026-08-31, chị Quỳnh chốt sau vài lần chỉnh: lý do ngắn hiện sẵn, công dụng ĐẦY ĐỦ mới cần bấm mở
// — tránh dài dằng dặc). Dùng chung ở Kiểm Tra Sức Khỏe + Thư Viện Sức Khỏe cho đồng bộ tuyệt đối.
// Fallback khi sản phẩm KHÔNG có ghi chú riêng theo vấn đề (p._note — xem sk_library_entries.
// product_notes, seed_sk_library_product_notes_v1.sql) — 2026-09-05, chị Quỳnh phản hồi thấy sản
// phẩm "chỉ có mỗi tên", đọc không hiểu. Trước đây ẩn hẳn dòng ghi chú nếu thiếu _note — giờ LUÔN
// hiện ít nhất 2 dòng mô tả công dụng (rút từ short_description) để không bao giờ trống trơn, dù
// data product_notes chưa phủ hết mọi sản phẩm/mọi vấn đề.
function skProductNoteFallback(p){
  return p._note || p.short_description || null;
}

function skProductOrderRowHtml(p, checked){
  const note = skProductNoteFallback(p);
  return `
    <div class="section" style="background:#fff;display:flex;gap:14px;align-items:flex-start;${checked?'':'opacity:.55;'}">
      <input type="checkbox" data-cart-toggle="${esc(p.id)}" ${checked?'checked':''} style="width:20px;height:20px;flex-shrink:0;margin-top:3px;cursor:pointer;accent-color:var(--accent);">
      ${p.image_url ? `<img src="${esc(p.image_url)}" alt="" style="width:72px;height:72px;object-fit:cover;border-radius:10px;flex-shrink:0;">` : ''}
      <div style="flex:1;min-width:0;">
        <div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;">
          <div style="font-weight:700;font-size:14px;">${esc(p.name)}${p._priority ? ` <span style="font-size:10.5px;font-weight:700;color:#fff;background:#e8643c;border-radius:5px;padding:2px 6px;vertical-align:middle;">⭐ Nên dùng trước</span>` : ''}</div>
          <div style="text-align:right;white-space:nowrap;">
            ${p.retail_price!=null ? `<div style="font-family:'IBM Plex Mono',monospace;font-weight:700;color:var(--accent);">${Number(p.retail_price).toLocaleString('vi-VN')}đ</div>` : ''}
            ${p.pv!=null ? `<div style="font-size:11px;color:var(--ink-soft);">${p.pv} PV</div>` : ''}
          </div>
        </div>
        ${note ? `<div style="font-size:13px;color:var(--ink-soft);margin-top:5px;line-height:1.5;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;">${esc(note)}</div>` : ''}
        <details style="margin-top:6px;">
          <summary style="cursor:pointer;font-size:12.5px;color:var(--accent);list-style:none;">Xem đầy đủ công dụng →</summary>
          <div style="margin-top:10px;">${skProductDetailHtml(p)}</div>
        </details>
      </div>
    </div>
  `;
}

// PushManager.subscribe() cần applicationServerKey dạng Uint8Array, nhưng VAPID public key ta có
// là chuỗi base64url — chuyển đổi qua lại theo đúng chuẩn (thêm padding '=' bị chuẩn base64url bỏ,
// đổi -/_ về +//). Dùng chung cho tai-khoan.js lúc bật thông báo (2026-08-31, chị Quỳnh yêu cầu bản
// tin sức khỏe mỗi ngày qua thông báo đẩy — copy nguyên hàm từ nhan-hieu/js/util.js).
function urlBase64ToUint8Array(base64String){
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for(let i = 0; i < rawData.length; i++) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}

function fmtDate(d){
  const dt = (d instanceof Date) ? d : new Date(d);
  return dt.toLocaleDateString('vi-VN', { weekday:'short', day:'2-digit', month:'2-digit' });
}

function isoDate(d){
  const dt = (d instanceof Date) ? d : new Date(d);
  const tzOffset = dt.getTimezoneOffset() * 60000;
  return new Date(dt - tzOffset).toISOString().slice(0,10);
}

function startOfWeek(d){
  const dt = new Date(d);
  const day = dt.getDay(); // 0=Sun
  const diff = (day === 0 ? -6 : 1) - day; // move to Monday
  dt.setDate(dt.getDate() + diff);
  dt.setHours(0,0,0,0);
  return dt;
}

// % tiến trình ước lượng cho màn chờ dài (vd sau này chấm điểm bằng AI) — chưa dùng ở bản khung
// này nhưng giữ lại sẵn theo đúng bộ công cụ chung của mọi app trong hệ sinh thái HIỂU.
function animateProgressButton(btnEl, estimatedSeconds, baseLabel){
  if(!btnEl) return ()=>{};
  const startedAt = Date.now();
  const cap = 96;
  let dots = 0;
  const tick = ()=>{
    const elapsed = (Date.now() - startedAt) / 1000;
    const pct = Math.min(cap, (elapsed / estimatedSeconds) * cap);
    btnEl.style.background = `linear-gradient(to right, var(--accent) ${pct}%, #DCD8C9 ${pct}%)`;
    if(elapsed > estimatedSeconds * 1.25){
      dots = (dots + 1) % 4;
      btnEl.textContent = `${baseLabel} — vẫn đang xử lý${'.'.repeat(dots)}`;
    } else {
      btnEl.textContent = `${baseLabel} ${Math.round(pct)}%`;
    }
  };
  tick();
  const timer = setInterval(tick, 500);
  return () => clearInterval(timer);
}

async function callApiOnce(relativePath, body, timeoutMs){
  const { data: sessionData } = await supabaseClient.auth.getSession();
  const token = sessionData && sessionData.session ? sessionData.session.access_token : null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs || 150000);
  try{
    return await fetch(relativePath, {
      method:'POST',
      headers:{
        'content-type':'application/json',
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch(e){
    if(e.name === 'AbortError') throw new Error(`Yêu cầu mất quá lâu (quá ${Math.round((timeoutMs||150000)/1000)} giây) — server có thể đang quá tải, thử lại giúp mình.`);
    throw new Error('Không kết nối được tới server — kiểm tra lại mạng và thử lại.');
  } finally {
    clearTimeout(timer);
  }
}

async function callApi(path, body, timeoutMs){
  // Đường dẫn tương đối (bỏ dấu "/" đầu) để hoạt động đúng dù web được host ở gốc domain (Vercel)
  // hay dưới 1 thư mục con qua reverse proxy (vd Cloudflare Worker tại hesinhthaihieu.com).
  const relativePath = path.replace(/^\//, '');
  let resp = await callApiOnce(relativePath, body, timeoutMs);
  if(resp.status === 401){
    await supabaseClient.auth.refreshSession();
    resp = await callApiOnce(relativePath, body, timeoutMs);
  }
  let data;
  try{
    data = await resp.json();
  } catch(e){
    throw new Error(resp.status >= 500
      ? 'Server xử lý quá lâu và bị ngắt giữa chừng — thử lại giúp mình, nếu vẫn vậy báo lại nhé.'
      : 'Không đọc được phản hồi từ server — thử lại giúp mình.');
  }
  if(!resp.ok) throw new Error(data.error || 'Có lỗi xảy ra.');
  return data;
}

// Lưu/đọc/xoá trạng thái đang làm dở của 1 module vào bảng module_drafts (dùng CHUNG với mọi app
// trong hệ sinh thái HIỂU) — giữ nguyên khi rời trang rồi quay lại.
async function loadModuleDraft(ctx, key){
  try{
    const { data } = await ctx.supabase.from('module_drafts').select('data').eq('user_id', ctx.user.id).eq('module_key', key).maybeSingle();
    return data ? data.data : null;
  } catch(e){ return null; }
}
async function saveModuleDraft(ctx, key, data){
  try{
    await ctx.supabase.from('module_drafts').upsert({
      user_id: ctx.user.id, module_key: key, data, updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,module_key' });
  } catch(e){}
}
async function clearModuleDraft(ctx, key){
  try{ await ctx.supabase.from('module_drafts').delete().eq('user_id', ctx.user.id).eq('module_key', key); } catch(e){}
}

// Gán 1 màu cố định cho mỗi tên (hash chuỗi) — dùng cho chart/chip cần màu ổn định giữa các lần vẽ.
const CATEGORY_COLOR_PALETTE = ['#3B82F6','#10B981','#F59E0B','#EF4444','#8B5CF6','#14B8A6','#EC4899','#EAB308','#6366F1','#F97316','#06B6D4','#84CC16'];
function categoryColor(name){
  const s = String(name||'Khác');
  let hash = 0;
  for(let i=0;i<s.length;i++){ hash = (hash*31 + s.charCodeAt(i)) >>> 0; }
  return CATEGORY_COLOR_PALETTE[hash % CATEGORY_COLOR_PALETTE.length];
}

// Biểu đồ cột xu hướng đơn giản (SVG thuần) — dùng ở Theo Dõi Sức Khỏe Theo Tuần để vẽ cân
// nặng/năng lượng qua từng tuần. buckets: [{label, amount}], amount có thể = 0.
function trendBarChartHtml(buckets, color){
  if(buckets.length===0 || buckets.every(b=>b.amount<=0)) return `<div style="color:var(--ink-soft);font-size:13px;">Chưa có dữ liệu.</div>`;
  const w = 320, h = 170, padTop = 10, padBottom = 26, padSide = 8;
  const innerW = w - padSide*2, innerH = h - padTop - padBottom;
  const maxVal = Math.max(1, ...buckets.map(b=>b.amount));
  const n = buckets.length;
  const slot = innerW/n;
  const barW = Math.max(8, Math.min(34, slot*0.55));
  const bars = buckets.map((b,i)=>{
    const x = padSide + slot*i + (slot-barW)/2;
    const barH = Math.max(1, innerH * (b.amount/maxVal));
    const y = padTop + (innerH - barH);
    const valueLabel = b.amount>0 ? `<text x="${(x+barW/2).toFixed(1)}" y="${(y-4).toFixed(1)}" text-anchor="middle" font-size="9" fill="var(--ink-soft)" font-family="IBM Plex Mono, monospace">${b.amount}</text>` : '';
    return `${valueLabel}<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${barW.toFixed(1)}" height="${barH.toFixed(1)}" fill="${color}" rx="3"/><text x="${(x+barW/2).toFixed(1)}" y="${h-8}" text-anchor="middle" font-size="10" fill="var(--ink-soft)" font-family="IBM Plex Mono, monospace">${esc(b.label)}</text>`;
  }).join('');
  return `<svg viewBox="0 0 ${w} ${h}" style="width:100%;max-width:360px;height:${h}px;display:block;">${bars}</svg>`;
}
