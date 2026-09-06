// Theo Dõi Sức Khỏe Theo Tuần — "Chỉ số cơ thể" mô phỏng theo hieu-de-khoe-manh.vercel.app (chị Quỳnh
// yêu cầu làm kỹ giống bản gốc, 2026-08-30): 9 mốc cố định (Bắt đầu + Tuần 1-8, KHÔNG phải tuần lịch
// tự động) x 3 nhóm chỉ số, thay cho bản cũ (tuần lịch + 4 chỉ số đơn giản: cân nặng/ngủ/năng lượng/
// tâm trạng). Lưu 1 dòng/user dạng jsonb {metric_key: {mốc: giá trị}} — xem schema_full.sql.
const SK_WEEK_NAMES = ['Bắt đầu','Tuần 1','Tuần 2','Tuần 3','Tuần 4','Tuần 5','Tuần 6','Tuần 7','Tuần 8'];

const SK_METRIC_GROUPS = [
  // 2026-09-06, chị Quỳnh: "bỏ 1 cái ô Eo" (eo1/eo2 trùng ý nhau, chỉ giữ eo1) + "thêm ô BMI và tuổi
  // chuyển hoá" — chieucao thêm mới để TỰ TÍNH BMI (xem computeBMI(), không phải ô nhập tay); "Tuổi
  // chuyển hoá" (metabolic age) cần thuật toán riêng của máy đo BIA (Omron/Tanita...) mà app không
  // có, nên để khách TỰ NHẬP số máy cân của họ hiện ra, không tự tính (tránh suy diễn sai số liệu y
  // khoa không có căn cứ).
  // 2026-09-06, chị Quỳnh: "chỗ vòng eo phải gần với chỗ vòng bụng chứ" — gộp các số đo VÒNG (eo/bụng/
  // mông/đùi/bắp chân) đứng liền nhau thay vì xen ngực/bắp tay ở giữa eo và bụng như trước.
  { title:'Thông số cơ thể (đo theo tuần)', color:'#e8643c', items:[
    ['chieucao','Chiều cao','cm'], ['cannang','Cân nặng','kg'],
    ['eo1','Vòng eo','cm'], ['bung_ron','Bụng (ngang rốn)','cm'], ['bung_duoi','Bụng (dưới rốn, to nhất)','cm'],
    ['mong','Mông','cm'], ['dui','Đùi','cm'], ['bapchan','Bắp chân','cm'],
    ['nguc','Ngực','cm'], ['baptay','Bắp tay','cm'], ['mo','% Mỡ','%'],
    ['kgco','Kg cơ','kg'], ['monoitang','Mỡ nội tạng',''], ['tuoichuyenhoa','Tuổi chuyển hoá (theo máy cân của bạn)','tuổi'],
  ]},
  { title:'Chỉ số xét nghiệm máu (2 tháng / lần)', color:'#c0392b', items:[
    ['glucose','Glucozơ','mmol/l'], ['tg','Triglycerides','mg/dL'], ['hba1c','HbA1c','%'], ['ldl','LDL','mg/dL'],
    ['hdl','HDL','mg/dL'], ['uric','Axit Uric',''], ['chol','Cholesterol','mg/dL'], ['ct34','CT3-4',''],
  ]},
  { title:'Yếu tố cuộc sống (tự đánh giá 1–10)', color:'#1f9bb0', items:[
    ['nangluong','Năng lượng & sức bền','/10'], ['cl_ngu','Chất lượng giấc ngủ','/10'], ['macdo','Tình trạng mặc đồ','/10'],
    ['vandong','Khả năng vận động','/10'], ['damongtoc','Da, móng, tóc','/10'], ['anuong','Chất lượng ăn uống','/10'],
    ['sucben','Sức bền','/10'], ['giaotiep','Giao tiếp, tự tin','/10'], ['chatluongcs','Chất lượng cuộc sống','/10'],
  ]},
  // Siêu Âm Năng Lượng — Tinh/Khí/Thần (2026-08-31, xem kho-tai-lieu/triet-ly-tinh-khi-than-app-suc-khoe.md,
  // chị Quỳnh: "áp dụng chung với nhau" — SONG SONG với khung y học ở trên, không thay thế). Câu hỏi
  // viết lại theo hướng TÍCH CỰC (cao = khoẻ/mạnh) để cùng chiều "càng cao càng tốt" với nhóm "Yếu tố
  // cuộc sống" phía trên — tài liệu gốc hỏi theo hướng triệu chứng (cao = càng hao mòn/uất/tán loạn),
  // nhưng để 2 hướng ngược nhau trong cùng 1 màn hình rất dễ gây nhầm khi nhập liệu.
  //
  // 2026-09-05, chị Quỳnh: "2 phần này đang có nhiều cái trùng lặp" — bỏ câu "Tinh — sức bền lưng
  // gối/tóc/móng, tỉnh táo dù ngủ đủ" (trùng gần như y hệt 4 câu nangluong/cl_ngu/damongtoc/sucben ở
  // "Yếu tố cuộc sống" phía trên) — Tinh giờ TÁI DÙNG 4 câu đó (xem SK_TKT_PILLARS) thay vì hỏi lại,
  // chỉ còn 1 câu MỚI thật sự khác biệt (góc độ tâm thức, không đo được bằng câu nào ở trên).
  { title:'Siêu Âm Năng Lượng — Tinh · Khí · Thần (tự đánh giá 1–10)', color:'#7c6bd4', items:[
    ['tinh_khonggong','Tinh — cho phép bản thân nghỉ khi mệt, không cố gồng giữ hình ảnh','/10'],
    ['khi_thongsuot','Khí — hơi thở sâu, ngực nhẹ nhõm, vai gáy thư giãn','/10'],
    ['khi_dammuon','Khí — dám nhìn thẳng vào tiền bạc, nói thật trong các mối quan hệ','/10'],
    ['than_yen','Thần — tâm trí yên, ít độc thoại nội tâm/bồn chồn','/10'],
    ['than_chapnhan','Thần — chấp nhận bản thân, ít phán xét/mâu thuẫn nội tại','/10'],
  ]},
];

// Nhóm các câu tự đánh giá ở trên (kể cả tái dùng từ "Yếu tố cuộc sống") thành điểm trung bình 3 trụ
// Tinh/Khí/Thần (Energy-Meter) — trả về null cho trụ nào chưa nhập đủ TẤT CẢ câu ở mốc đang xem,
// không tự suy diễn từ 1 phần. Tinh dùng 4 câu đã có sẵn (nangluong/cl_ngu/damongtoc/sucben) + 1 câu
// mới (tinh_khonggong) — không hỏi lại những gì đã hỏi ở "Yếu tố cuộc sống".
const SK_TKT_PILLARS = [
  { key:'tinh', label:'Tinh', color:'#c0392b', icon:'🕯️', items:['nangluong','cl_ngu','damongtoc','sucben','tinh_khonggong'] },
  { key:'khi', label:'Khí', color:'#2f7fc4', icon:'🌬️', items:['khi_thongsuot','khi_dammuon'] },
  { key:'than', label:'Thần', color:'#7c6bd4', icon:'✨', items:['than_yen','than_chapnhan'] },
];

// Chiều "tốt hơn" của mỗi chỉ số — dùng để tô màu chênh lệch trong bảng so sánh (giống betterFor của
// bản gốc, kể cả 2 chỗ họ không gán chiều nào — baptay/ct34 — nên bảng so sánh sẽ để màu trung tính).
const SK_BETTER_LOW = { eo1:1, nguc:1, bung_ron:1, bung_duoi:1, mong:1, dui:1, bapchan:1, cannang:1, mo:1, monoitang:1, tuoichuyenhoa:1, glucose:1, tg:1, hba1c:1, ldl:1, uric:1, chol:1 };
const SK_BETTER_HIGH = { kgco:1, hdl:1, nangluong:1, cl_ngu:1, macdo:1, vandong:1, damongtoc:1, anuong:1, sucben:1, giaotiep:1, chatluongcs:1, tinh_khonggong:1, khi_thongsuot:1, khi_dammuon:1, than_yen:1, than_chapnhan:1 };

// Liên kết sang Sản Phẩm (2026-08-30, chị Quỳnh yêu cầu "cần có sự liên hệ giữa các mục để bán được
// thêm sản phẩm", giống cơ chế vừa thêm ở Kiểm Tra Sức Khỏe) — mỗi chỉ số gán 1 nhánh sản phẩm liên
// quan nhất (null = không có nhánh nào phù hợp, bỏ qua). Ngưỡng tuyệt đối dùng đúng mốc y khoa đã
// dùng ở Kiểm Tra Sức Khỏe (glucose/tg/hba1c) để có gợi ý ngay từ mốc "Bắt đầu", không cần đợi có dữ
// liệu 2 mốc để so sánh xu hướng.
// tinh_*/khi_* gán 'thai_doc' đúng theo bảng "Chốt chặn vật lý" trong tài liệu triết lý (Tinh<4→Thải
// độc ruột, Khí<4→Thải độc ký sinh trùng — cả 2 đều thuộc nhánh Thải độc trong sk_products.category).
// than_* không gán nhánh nào — tài liệu gốc không đề xuất SKU cụ thể cho Thần, để null.
const SK_METRIC_CATEGORY = {
  eo1:'giam_mo', bung_ron:'giam_mo', bung_duoi:'giam_mo', cannang:'giam_mo', mo:'giam_mo', monoitang:'giam_mo', kgco:'tang_de_khang',
  glucose:'giam_mo', tg:'giam_mo', hba1c:'giam_mo', ldl:'giam_mo', chol:'giam_mo', uric:'thai_doc',
  nangluong:'tang_de_khang', cl_ngu:'thai_doc', vandong:'xuong_khop', damongtoc:'lam_dep_da', anuong:'thai_doc', sucben:'tang_de_khang',
  tinh_khonggong:'thai_doc', khi_thongsuot:'thai_doc', khi_dammuon:'thai_doc',
};
// 2026-09-06, chị Quỳnh: "chưa chuẩn đoán phần thông số cơ thể mà chỉ ở phần năng lượng" — trước đây
// nhóm "Thông số cơ thể" chỉ được flag khi SO SÁNH với mốc "Bắt đầu" (xấu đi), nên ở đúng mốc "Bắt
// đầu" (chưa có gì để so) không bao giờ bị flag dù số liệu đã đáng lo ngay từ đầu. Thêm ngưỡng tuyệt
// đối cho monoitang (mỡ nội tạng — hầu hết máy cân gia dụng như Omron/Tanita coi ≥10 là mức cao) để
// có flag ngay từ mốc đầu tiên, không cần đợi mốc sau.
const SK_ABSOLUTE_CONCERN = {
  glucose: v => v >= 5.6,
  tg: v => v >= 150,
  hba1c: v => v >= 5.7,
  monoitang: v => v >= 10,
};

(function(){
function render(container, ctx){
  const state = { loading:true, week:0, weekAuto:true, metrics:{}, photos:{}, saving:false, products:[], justSaved:false, deselected:new Set() };

  function draw(){ container.innerHTML = html(); bind(); }

  // Mốc hiện tại theo ngày bắt đầu gói (profiles.sk_package_started_at, đã dùng cho Lịch Trình Của
  // Bạn) — chưa gán gói/chưa có ngày bắt đầu thì mặc định "Bắt đầu" như trước.
  function currentWeekFromPackage(){
    const started = ctx.profile && ctx.profile.sk_package_started_at;
    if(!started) return 0;
    const days = Math.floor((Date.now() - new Date(started).getTime()) / 86400000);
    return Math.max(0, Math.min(8, Math.floor(days/7)));
  }

  // Khoảng ngày của 1 mốc tuần (2026-09-05, chị Quỳnh: "cần có thời gian tính theo tuần từ ngày nào
  // đến ngày nào" — VD chốt: "bắt đầu dùng từ hôm nay thứ 7 5/9 thì 1 tuần là tới thứ 7 tuần sau",
  // tức tính theo ĐÚNG THỨ trong tuần (cùng thứ, 1 tuần sau), không phải "6 ngày sau" — mốc cuối của
  // Tuần N trùng luôn mốc đầu của Tuần N+1 vì đây là các CHECKPOINT đo cùng 1 ngày mỗi tuần, không
  // phải chia kỳ không chồng lấn). "Bắt đầu" = đúng ngày bắt đầu gói. null nếu chưa có ngày bắt đầu
  // gói (chưa được gán gói).
  function weekDateRange(weekIndex){
    const started = ctx.profile && ctx.profile.sk_package_started_at;
    if(!started) return null;
    const startDate = new Date(started);
    if(weekIndex===0) return esc(fmtDate(startDate));
    const rangeStart = new Date(startDate); rangeStart.setDate(rangeStart.getDate() + (weekIndex-1)*7);
    const rangeEnd = new Date(startDate); rangeEnd.setDate(rangeEnd.getDate() + weekIndex*7);
    return `${esc(fmtDate(rangeStart))} – ${esc(fmtDate(rangeEnd))}`;
  }

  async function load(){
    const [{ data: row }, { data: products }] = await Promise.all([
      ctx.supabase.from('sk_weekly_logs').select('metrics,photos').eq('user_id', ctx.user.id).maybeSingle(),
      ctx.supabase.from('sk_products').select('id,name,category,retail_price,pv,short_description,image_url').not('category', 'is', null),
    ]);
    state.metrics = (row && row.metrics) || {};
    state.photos = (row && row.photos) || {};
    state.products = products || [];
    state.week = currentWeekFromPackage();
    state.loading = false;
    draw();
  }

  // Ảnh tiến trình — nén giống hệt pattern sk_success_stories (xem quan-tri.js handleFiles) thay vì
  // dùng Supabase Storage riêng. Tối đa 4 ảnh/mốc (đủ cho: toàn thân, mặt, số đo vòng, 1 ảnh tự do).
  const SK_WEEK_MAX_PHOTOS = 4;
  function handleWeekPhotoFiles(files){
    const list = state.photos[state.week] || (state.photos[state.week] = []);
    Array.from(files).slice(0, SK_WEEK_MAX_PHOTOS - list.length).forEach((file)=>{
      const reader = new FileReader();
      reader.onload = ()=>{
        const img = new Image();
        img.onload = ()=>{
          const maxW = 1000;
          const scale = Math.min(1, maxW / img.width);
          const w = Math.round(img.width * scale), h = Math.round(img.height * scale);
          const c = document.createElement('canvas');
          c.width = w; c.height = h;
          c.getContext('2d').drawImage(img, 0, 0, w, h);
          state.photos[state.week] = [...(state.photos[state.week]||[]), c.toDataURL('image/jpeg', 0.82)].slice(0, SK_WEEK_MAX_PHOTOS);
          draw();
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }
  function removeWeekPhoto(idx){
    state.photos[state.week] = (state.photos[state.week]||[]).filter((_,i)=>i!==idx);
    draw();
  }

  // 2026-09-06, chị Quỳnh gửi mẫu slide "ĐẦU VÀO — Ảnh chụp" (toàn thân 3 mặt/mặt/số đo vòng) +
  // "e cần có chỗ cho ng dùng tải lên cái hình bản thân họ giống như này. Chèn cái hình hướng dẫn cho
  // họ chụp như nào luôn" — khu vực upload riêng + hướng dẫn tư thế/ánh sáng đúng tinh thần mẫu đó.
  function skWeekPhotosHtml(week){
    const photos = state.photos[week] || [];
    return `
      <div class="card" style="margin-bottom:18px;">
        <h3 style="font-family:'IBM Plex Mono',monospace;font-size:12.5px;text-transform:uppercase;letter-spacing:.06em;color:var(--accent);margin-bottom:10px;">📸 Ảnh tiến trình — ${esc(SK_WEEK_NAMES[week])}</h3>
        <details style="margin-bottom:14px;">
          <summary style="cursor:pointer;font-size:12.5px;color:var(--accent);font-weight:600;">🖼️ Xem hướng dẫn cách chụp</summary>
          <div style="margin-top:10px;padding:14px;background:var(--surface-soft,#f5f5f5);border-radius:10px;display:flex;gap:16px;align-items:center;flex-wrap:wrap;">
            <svg viewBox="0 0 180 90" style="width:160px;height:auto;flex-shrink:0;">
              ${[20,90,160].map((cx,i)=>`
                <g opacity=".7">
                  <ellipse cx="${cx}" cy="14" rx="9" ry="10" fill="none" stroke="currentColor" stroke-width="2"/>
                  <path d="M${cx} 24 L${cx} 55 M${cx} 30 L${cx-14} 40 M${cx} 30 L${cx+14} 40 M${cx} 55 L${cx-10} 84 M${cx} 55 L${cx+10} 84" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                </g>
                <text x="${cx}" y="90" text-anchor="middle" font-size="9" fill="currentColor" opacity=".6">${['Trước','Nghiêng','Sau'][i]}</text>
              `).join('')}
            </svg>
            <div style="font-size:11.5px;color:var(--ink-soft);line-height:1.8;min-width:160px;flex:1;">
              — Chụp đủ <b>3 mặt</b>: trước, nghiêng, sau<br>
              — Phông nền sạch sẽ, ít đồ vật xung quanh<br>
              — Mặc đồ tập hở bụng/tay/vai để nhìn rõ dáng<br>
              — Đứng cùng 1 vị trí, cùng khoảng cách camera mỗi tuần để so sánh chuẩn<br>
              — Có thể chụp thêm ảnh mặt hoặc ảnh đo vòng bằng thước dây nếu muốn theo dõi kỹ hơn
            </div>
          </div>
        </details>
        <div style="display:flex;gap:10px;flex-wrap:wrap;">
          ${photos.map((src,i)=>`
            <div style="position:relative;width:84px;height:84px;">
              <img src="${esc(src)}" data-zoom="${esc(src)}" style="width:84px;height:84px;object-fit:cover;border-radius:10px;cursor:zoom-in;">
              <span data-remove-photo="${i}" style="position:absolute;top:-6px;right:-6px;width:20px;height:20px;border-radius:50%;background:#c0392b;color:#fff;font-size:12px;display:flex;align-items:center;justify-content:center;cursor:pointer;">✕</span>
            </div>
          `).join('')}
          ${photos.length<SK_WEEK_MAX_PHOTOS ? `
            <label style="width:84px;height:84px;border:1px dashed var(--line);border-radius:10px;display:flex;align-items:center;justify-content:center;cursor:pointer;color:var(--ink-soft);font-size:24px;">
              +<input type="file" accept="image/*" multiple id="sk-week-photo-file" style="display:none;">
            </label>
          ` : ''}
        </div>
        <div style="font-size:11px;opacity:.6;margin-top:8px;">Tối đa ${SK_WEEK_MAX_PHOTOS} ảnh/mốc. Ảnh được lưu cùng lúc bấm nút "Lưu ${esc(SK_WEEK_NAMES[week])}" bên dưới.</div>
      </div>
    `;
  }

  function getVal(key, week){ return (state.metrics[key] && state.metrics[key][week]) || ''; }
  function setVal(key, week, val){
    if(!state.metrics[key]) state.metrics[key] = {};
    if(val==='') delete state.metrics[key][week]; else state.metrics[key][week] = val;
  }

  // BMI tự tính từ chiều cao + cân nặng cùng mốc (2026-09-06, chị Quỳnh: "thêm ô BMI") — KHÔNG phải
  // ô nhập tay, luôn tính lại từ 2 số đã có sẵn để không bao giờ lệch nhau. Phân loại theo chuẩn WHO
  // khu vực Châu Á - Thái Bình Dương (ngưỡng thấp hơn chuẩn phương Tây, phù hợp hơn cho người Việt).
  function computeBMI(week){
    const h = parseFloat(getVal('chieucao', week));
    const w = parseFloat(getVal('cannang', week));
    if(!isFinite(h) || !isFinite(w) || h<=0) return null;
    const m = h/100;
    return Math.round(w/(m*m)*10)/10;
  }
  function bmiCategory(bmi){
    if(bmi==null) return null;
    if(bmi<18.5) return { label:'Thiếu cân', color:'#2f7fc4', concern:false };
    if(bmi<23) return { label:'Bình thường', color:'#1f9d63', concern:false };
    if(bmi<25) return { label:'Thừa cân', color:'#e8643c', concern:true };
    return { label:'Béo phì', color:'#c0392b', concern:true };
  }

  // Hình minh hoạ cây nến cho Siêu Âm Năng Lượng (2026-09-06, chị Quỳnh: "phần siêu âm năng lượng
  // nên là hình minh hoạ cây nến trong Tinh - Khí - Thần") — đúng ẩn dụ gốc trong tài liệu triết lý
  // (kho-tai-lieu/triet-ly-tinh-khi-than-app-suc-khoe.md): Tinh = sáp và bấc nến, Khí = ngọn lửa,
  // Thần = ánh sáng toả ra. Kích thước/độ sáng từng phần tỉ lệ theo điểm 1-10 của đúng trụ đó — điểm
  // càng cao, phần đó càng "đầy" (sáp cao hơn, lửa to hơn, quầng sáng rộng hơn). Chưa điền đủ câu
  // (score=null) thì phần đó vẽ mờ/nhạt để phân biệt với "điểm thấp thật".
  function skCandleIllustrationHtml(scores){
    const tinh = scores.find(s=>s.key==='tinh');
    const khi = scores.find(s=>s.key==='khi');
    const than = scores.find(s=>s.key==='than');
    const norm = s => s.score==null ? 0.35 : Math.max(0.15, s.score/10);
    const tinhR = norm(tinh), khiR = norm(khi), thanR = norm(than);
    const waxH = 40 + tinhR*90, waxW = 34;
    const waxX = 100 - waxW/2, waxY = 200 - waxH;
    const flameW = 10 + khiR*22, flameH = 20 + khiR*34;
    const glowR = 30 + thanR*55, glowOpacity = 0.15 + thanR*0.35;
    const dim = s => s.score==null;
    return `
      <svg viewBox="0 0 200 220" style="width:100%;max-width:180px;height:auto;display:block;margin:0 auto;">
        <defs>
          <radialGradient id="skGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stop-color="#ffe9a8" stop-opacity="${glowOpacity}"/>
            <stop offset="100%" stop-color="#ffe9a8" stop-opacity="0"/>
          </radialGradient>
          <linearGradient id="skFlame" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stop-color="#e8643c"/>
            <stop offset="60%" stop-color="#f7a94c"/>
            <stop offset="100%" stop-color="#fff3b0"/>
          </linearGradient>
        </defs>
        <circle cx="100" cy="${waxY-10}" r="${glowR}" fill="url(#skGlow)"/>
        <ellipse cx="100" cy="${waxY - flameH*0.55}" rx="${flameW/2}" ry="${flameH/2}" fill="url(#skFlame)" opacity="${dim(khi)?0.35:1}"/>
        <rect x="98" y="${waxY-8}" width="4" height="10" fill="#5a4630"/>
        <rect x="${waxX}" y="${waxY}" width="${waxW}" height="${waxH}" rx="6" fill="${dim(tinh)?'#6b6558':'#F7F4EC'}" stroke="#d8cfb8" stroke-width="1.5" opacity="${dim(tinh)?0.5:1}"/>
        <rect x="${waxX-14}" y="200" width="${waxW+28}" height="10" rx="3" fill="#3a2f22"/>
      </svg>
      <div style="display:flex;justify-content:space-around;font-size:11px;opacity:.75;margin-top:6px;flex-wrap:wrap;gap:4px;">
        <span>🕯️ Tinh = sáp nến</span><span>🔥 Khí = ngọn lửa</span><span>✨ Thần = ánh sáng toả ra</span>
      </div>
    `;
  }

  // Hình minh hoạ vị trí đo cho nhóm "Thông số cơ thể" (2026-09-06, chị Quỳnh: "app sức khoẻ thêm
  // phần chèn ảnh vào các tuần") — không có ảnh thật để chèn nên vẽ sơ đồ cơ thể đơn giản, chỉ đúng
  // các vị trí app đang hỏi (eo/bắp tay/ngực/bụng/mông/đùi/bắp chân), gấp gọn trong <details> để
  // không chiếm chỗ mặc định (đúng quy ước "Đọc thêm" cho nội dung dài đã chốt trước đây).
  function skBodyMeasureGuideHtml(){
    return `
      <details style="margin-bottom:14px;">
        <summary style="cursor:pointer;font-size:12.5px;color:var(--accent,#e8643c);font-weight:600;">🖼️ Xem hình minh hoạ vị trí đo</summary>
        <div style="display:flex;align-items:center;justify-content:center;gap:18px;flex-wrap:wrap;margin-top:12px;padding:16px;background:var(--surface-soft,#f5f5f5);border-radius:10px;">
          <svg viewBox="0 0 120 260" style="width:110px;height:auto;flex-shrink:0;">
            <ellipse cx="60" cy="24" rx="16" ry="18" fill="none" stroke="currentColor" stroke-width="2" opacity=".55"/>
            <path d="M60 42 L60 100 M60 55 L30 50 L20 95 M60 55 L90 50 L100 95 M60 100 L38 110 L40 175 L46 250 M60 100 L82 110 L80 175 L74 250 M38 110 L82 110" fill="none" stroke="currentColor" stroke-width="2" opacity=".55" stroke-linejoin="round" stroke-linecap="round"/>
            <line x1="18" y1="62" x2="102" y2="62" stroke="var(--accent,#e8643c)" stroke-width="1.5" stroke-dasharray="3 2"/>
            <line x1="34" y1="105" x2="86" y2="105" stroke="var(--accent,#e8643c)" stroke-width="1.5" stroke-dasharray="3 2"/>
            <line x1="36" y1="122" x2="84" y2="122" stroke="var(--accent,#e8643c)" stroke-width="1.5" stroke-dasharray="3 2"/>
            <line x1="37" y1="150" x2="83" y2="150" stroke="var(--accent,#e8643c)" stroke-width="1.5" stroke-dasharray="3 2"/>
            <line x1="38" y1="178" x2="82" y2="178" stroke="var(--accent,#e8643c)" stroke-width="1.5" stroke-dasharray="3 2"/>
            <line x1="41" y1="215" x2="79" y2="215" stroke="var(--accent,#e8643c)" stroke-width="1.5" stroke-dasharray="3 2"/>
          </svg>
          <div style="display:flex;flex-direction:column;gap:14px;font-size:11.5px;color:var(--ink-soft);min-width:140px;">
            <div>— <b>Vòng eo</b>: ngang rốn, thả lỏng bụng</div>
            <div>— <b>Bụng (dưới rốn)</b>: đo ở điểm to nhất, thường thấp hơn rốn 3-5cm</div>
            <div>— <b>Mông</b>: ngang điểm nhô nhất của mông</div>
            <div>— <b>Đùi</b>: ngang điểm to nhất, sát dưới mông</div>
            <div>— <b>Bắp chân</b>: ngang điểm to nhất của bắp chân</div>
            <div>— <b>Ngực/Bắp tay</b>: ngang nách, qua điểm nhô nhất của ngực</div>
          </div>
        </div>
        <div style="font-size:11px;opacity:.6;margin-top:6px;">Đo cùng 1 thời điểm trong ngày (khuyên buổi sáng, chưa ăn) và cùng tư thế mỗi tuần để số liệu so sánh chính xác.</div>
      </details>
    `;
  }

  // Energy-Meter: điểm trung bình mỗi trụ Tinh/Khí/Thần ở mốc đang xem — null nếu chưa nhập đủ 2 câu.
  function tktScores(week){
    return SK_TKT_PILLARS.map(p=>{
      const vals = p.items.map(k=>parseFloat(getVal(k, week))).filter(isFinite);
      const score = vals.length===p.items.length ? Math.round(vals.reduce((s,v)=>s+v,0)/vals.length*10)/10 : null;
      return { ...p, score };
    });
  }

  async function save(){
    state.saving = true; draw();
    const { error } = await ctx.supabase.from('sk_weekly_logs').upsert({
      user_id: ctx.user.id, metrics: state.metrics, photos: state.photos, updated_at: new Date().toISOString(),
    }, { onConflict:'user_id' });
    state.saving = false;
    state.justSaved = !error;
    if(!error){
      // Nhịp dừng (Stop-Point Trigger) — Khí hoặc Thần tuần này ≤4/10 (xem util.js skStopPointOverlay
      // để biết vì sao đơn giản hoá ngưỡng "3 ngày liên tiếp" trong tài liệu gốc thành theo tuần).
      const scores = tktScores(state.week);
      const low = scores.find(s=>(s.key==='khi'||s.key==='than') && s.score!=null && s.score<=4);
      if(low) skStopPointOverlay();
    }
    if(error) alert('Lỗi khi lưu: ' + error.message);
    draw();
  }

  function summaryRows(){
    const out = [];
    SK_METRIC_GROUPS.forEach(g=>g.items.forEach(([key,label,unit])=>{
      const b = parseFloat(getVal(key,0)), e = parseFloat(getVal(key,8));
      if(isFinite(b) && isFinite(e)){
        const d = Math.round((e-b)*10)/10;
        let good = null;
        if(d!==0){
          if(SK_BETTER_LOW[key]) good = d<0;
          else if(SK_BETTER_HIGH[key]) good = d>0;
        }
        out.push({ label, unit, base:b, end:e, delta:d, good });
      }
    }));
    return out;
  }

  // Chỉ số nào ở mốc ĐANG XEM đáng chú ý — theo ngưỡng tuyệt đối (glucose/tg/hba1c) hoặc tự đánh giá
  // thấp (yếu tố cuộc sống ≤4/10), hoặc xấu đi so với mốc "Bắt đầu" (khi đang xem 1 mốc sau đó và đã
  // có số liệu để so sánh). Dùng để gợi ý đúng nhánh sản phẩm liên quan — không tự ý gán công dụng.
  function flaggedMetrics(){
    const flags = [];
    SK_METRIC_GROUPS.forEach(g=>g.items.forEach(([key,label,unit])=>{
      const cat = SK_METRIC_CATEGORY[key];
      if(!cat) return;
      const raw = getVal(key, state.week);
      if(raw==='') return;
      const v = parseFloat(raw);
      if(!isFinite(v)) return;
      let concern = false;
      if(SK_ABSOLUTE_CONCERN[key]) concern = SK_ABSOLUTE_CONCERN[key](v);
      else if(g.title.startsWith('Yếu tố') || g.title.startsWith('Siêu Âm Năng Lượng')) concern = v <= 4;
      else if(state.week>0){
        const base = parseFloat(getVal(key,0));
        if(isFinite(base) && base!==v){
          if(SK_BETTER_LOW[key]) concern = v>base; else if(SK_BETTER_HIGH[key]) concern = v<base;
        }
      }
      if(concern) flags.push({ key, label, category:cat, group:g.title });
    }));
    // BMI là chỉ số TÍNH RA (không nằm trong SK_METRIC_GROUPS), thêm riêng vào đây.
    const bmiCat = bmiCategory(computeBMI(state.week));
    if(bmiCat && bmiCat.concern) flags.push({ key:'bmi', label:`BMI (${bmiCat.label})`, category:'giam_mo', group:'Thông số cơ thể (đo theo tuần)' });
    return flags;
  }

  // Có nhập ít nhất 1 chỉ số nào ở mốc này chưa — để biết có nên hiện "kết quả chẩn đoán" hay
  // nhắc trống trơn (2026-09-05, chị Quỳnh: "cần có kết quả chuẩn đoán của app cho người dùng").
  function weekHasData(week){
    return SK_METRIC_GROUPS.some(g=>g.items.some(([key])=>getVal(key, week)!==''));
  }

  // Kết quả chẩn đoán tổng quan của mốc đang xem — dựa trên số chỉ số đáng chú ý (flaggedMetrics,
  // TÁCH RIÊNG nhóm Thông số cơ thể/Xét nghiệm máu khỏi nhóm Năng lượng tự đánh giá — 2026-09-06,
  // chị Quỳnh: "kết quả chuẩn đoán đang bị hời hợt" + "chưa chuẩn đoán phần thông số cơ thể mà chỉ ở
  // phần năng lượng") và điểm Tinh/Khí/Thần trung bình (tktScores). KHÔNG tính điểm y khoa mới — chỉ
  // tổng hợp lại dữ liệu đã có ở trang này, cùng cấu trúc 4 phần (mức độ → chi tiết → ảnh hưởng →
  // nếu không thay đổi) với "Mức độ nguy cơ" ở Kiểm Tra Sức Khỏe cho quen mắt.
  function weeklyDiagnosis(){
    const flags = flaggedMetrics();
    const bodyFlags = flags.filter(f=>f.group!=='Yếu tố cuộc sống (tự đánh giá 1–10)' && !f.group.startsWith('Siêu Âm Năng Lượng'));
    const energyFlags = flags.filter(f=>!bodyFlags.includes(f));
    const n = flags.length;
    const scores = tktScores(state.week).filter(s=>s.score!=null);
    const avgTkt = scores.length ? scores.reduce((s,x)=>s+x.score,0)/scores.length : null;
    const bmi = computeBMI(state.week);
    const bmiCat = bmiCategory(bmi);

    let level, color, bg, bd;
    if(bodyFlags.length>=2 || n>=5 || (avgTkt!=null && avgTkt<=4)){ level='Cần chú ý nhiều'; color='#c0392b'; bg='#fdeee8'; bd='#f3b9a4'; }
    else if(n>=2 || (avgTkt!=null && avgTkt<7)){ level='Cần theo dõi'; color='#e8643c'; bg='#fff7f0'; bd='#f3d9bf'; }
    else { level='Đang ổn định'; color='#1f9d63'; bg='#eef6f0'; bd='#cfe6d8'; }

    const problems = [];
    if(bodyFlags.length>0) problems.push(`Thông số cơ thể/xét nghiệm: ${bodyFlags.map(f=>f.label).join(', ')} đang ở mức cần chú ý.`);
    if(bmiCat) problems.push(`BMI hiện tại ${bmi} (${bmiCat.label}).`);
    if(energyFlags.length>0) problems.push(`Năng lượng: ${energyFlags.map(f=>f.label).join(', ')} đang thấp.`);
    if(avgTkt!=null) problems.push(`Năng lượng Tinh/Khí/Thần trung bình ${avgTkt.toFixed(1)}/10.`);
    if(problems.length===0) problems.push('Chưa có chỉ số nào ở mức đáng lo trong các chỉ số đã nhập.');

    let impact, future;
    if(level==='Cần chú ý nhiều'){
      impact = 'Cơ thể đang phải xử lý nhiều điểm nghẽn cùng lúc (cả thông số vật lý lẫn năng lượng) — dễ mệt mỏi kéo dài, khó thấy kết quả rõ dù đang cố gắng, tinh thần cũng dễ nản.';
      future = 'Nếu các chỉ số này không cải thiện trong vài tuần tới, tiến trình chuyển hoá sẽ chậm lại và các dấu hiệu khó chịu có xu hướng tăng dần thay vì giảm.';
    } else if(level==='Cần theo dõi'){
      impact = 'Một vài chỉ số đang lệch khỏi mức tốt — chưa đáng lo nhưng nên theo dõi sát mốc tuần sau để biết đang cải thiện hay đang xấu đi.';
      future = 'Duy trì đúng lộ trình sản phẩm/ăn uống/tập luyện tuần này thường sẽ thấy chỉ số cải thiện rõ ở 1-2 mốc tiếp theo.';
    } else {
      impact = 'Các chỉ số tuần này khá cân bằng, cả về thông số cơ thể lẫn năng lượng.';
      future = 'Tiếp tục duy trì đúng lộ trình hiện tại để giữ đà này ở các mốc tiếp theo.';
    }
    return { level, color, bg, bd, problems, impact, future, n };
  }

  function recommendedProducts(){
    const flags = flaggedMetrics();
    if(flags.length===0) return { flags, products:[] };
    const counts = {};
    flags.forEach(f=>{ counts[f.category] = (counts[f.category]||0)+1; });
    const topCount = Math.max(...Object.values(counts));
    const topCategories = Object.keys(counts).filter(c=>counts[c]===topCount);
    return { flags, products: state.products.filter(p=>topCategories.includes(p.category)) };
  }

  function html(){
    if(state.loading) return `<div class="loading"><div class="spinner"></div></div>`;
    // 2026-09-06, chị Quỳnh: "phần theo dõi kết quả theo tuần vẫn chưa có ngày tháng năm" — weekDateRange
    // chỉ hiện được khi đã gán gói (có sk_package_started_at); nhiều khách chưa/không có gói vẫn cần ghi
    // rõ ngày đo THỰC TẾ của mốc đang xem. Seed sẵn hôm nay nếu ô này còn trống, để dù khách không đụng
    // vào ô ngày, bấm "Lưu" vẫn lưu kèm ngày — không bắt buộc phải tự gõ mới lưu được.
    if(!getVal('_ngaydo', state.week)) setVal('_ngaydo', state.week, isoDate(new Date()));
    const summary = summaryRows();
    const autoWeek = currentWeekFromPackage();
    const { flags, products } = state.justSaved ? recommendedProducts() : { flags:[], products:[] };
    return `
      <div class="page-head">
        <h1>Theo Dõi Sức Khỏe Theo Tuần</h1>
        <p>Đo & ghi lại theo từng mốc — so sánh "Bắt đầu" với "Tuần 8" để thấy rõ thay đổi sau 2 tháng.</p>
      </div>

      <div class="chips" style="margin-bottom:8px;">
        ${SK_WEEK_NAMES.map((w,i)=>`<div class="chip ${state.week===i?'selected':''}" data-week="${i}" style="position:relative;">${esc(w)}${i===autoWeek?' <span style="opacity:.7;">●</span>':''}</div>`).join('')}
      </div>
      ${weekDateRange(state.week) ? `<div style="font-size:12px;color:var(--ink-soft);margin-bottom:6px;">● Theo lịch gói: ${weekDateRange(state.week)}</div>` : ''}
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:20px;flex-wrap:wrap;">
        <label style="font-size:12.5px;color:var(--ink-soft);">📅 Ngày đo thực tế:</label>
        <input type="date" data-metric="_ngaydo" value="${esc(getVal('_ngaydo', state.week))}">
      </div>

      ${weekHasData(state.week) ? (()=>{
        const d = weeklyDiagnosis();
        return `
        <div class="card" style="margin-bottom:18px;border:1px solid ${d.bd};background:${d.bg};">
          <div style="font-family:'IBM Plex Mono',monospace;font-size:12.5px;text-transform:uppercase;letter-spacing:.06em;color:${d.color};margin-bottom:6px;">Kết quả chẩn đoán — ${esc(SK_WEEK_NAMES[state.week])}</div>
          <div style="font-size:19px;font-weight:700;color:${d.color};margin-bottom:14px;">${esc(d.level)}</div>
          <ul style="margin:0 0 16px;padding-left:20px;font-size:14px;line-height:1.8;">
            ${d.problems.map(p=>`<li style="margin-bottom:8px;">${esc(p)}</li>`).join('')}
          </ul>
          <div style="margin-bottom:12px;">${skSectionHeaderHtml('Ảnh hưởng hiện tại', '#e8643c', '⚡')}<div style="font-size:14px;line-height:1.8;">${esc(d.impact)}</div></div>
          <div>${skSectionHeaderHtml('Nếu không thay đổi', '#c0392b', '⏳')}<div style="font-size:14px;line-height:1.8;">${esc(d.future)}</div></div>
        </div>
      `;})() : `<div class="hint-box" style="margin-bottom:18px;">Chưa có dữ liệu cho mốc "${esc(SK_WEEK_NAMES[state.week])}" — nhập ít nhất 1 chỉ số bên dưới để xem kết quả chẩn đoán.</div>`}

      ${(() => {
        const scores = tktScores(state.week);
        if(scores.every(s=>s.score==null)) return '';
        return `
        <div class="card" style="margin-bottom:18px;background:linear-gradient(135deg,#14201B,#1f2e26);color:#F7F4EC;">
          <h3 style="font-family:'IBM Plex Mono',monospace;font-size:12.5px;text-transform:uppercase;letter-spacing:.06em;opacity:.75;margin-bottom:14px;">🔮 Siêu Âm Năng Lượng — ${esc(SK_WEEK_NAMES[state.week])}</h3>
          ${skCandleIllustrationHtml(scores)}
          <div style="display:flex;gap:14px;flex-wrap:wrap;margin-top:14px;">
            ${scores.map(s=>`
              <div style="flex:1;min-width:100px;text-align:center;">
                <div style="font-size:20px;">${s.icon}</div>
                <div style="font-family:'IBM Plex Mono',monospace;font-size:26px;font-weight:700;margin:4px 0;color:${s.score==null?'rgba(247,244,236,.4)':(s.score<=4?'#e8643c':'#F7F4EC')};">${s.score==null?'—':s.score}</div>
                <div style="font-size:12px;opacity:.75;">${esc(s.label)}</div>
              </div>
            `).join('')}
          </div>
          <div style="font-size:11.5px;opacity:.6;margin-top:12px;">Điền đủ các câu của mỗi trụ (Tinh dùng lại 4 câu ở "Yếu tố cuộc sống" phía dưới + 1 câu mới, Khí/Thần mỗi trụ 2 câu ở nhóm "Siêu Âm Năng Lượng") để ra điểm — điểm càng cao càng khoẻ.</div>
        </div>
      `;})()}

      ${skWeekPhotosHtml(state.week)}

      ${SK_METRIC_GROUPS.map(g=>{
        const isBodyGroup = g.title.startsWith('Thông số cơ thể');
        const bmi = isBodyGroup ? computeBMI(state.week) : null;
        const bmiCat = bmiCategory(bmi);
        return `
        <div class="card" style="margin-bottom:18px;">
          <h3 style="font-family:'IBM Plex Mono',monospace;font-size:12.5px;text-transform:uppercase;letter-spacing:.06em;color:${g.color};margin-bottom:14px;">${esc(g.title)}</h3>
          ${isBodyGroup ? `
            <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px;padding:10px 14px;background:var(--surface-soft,#f5f5f5);border-radius:10px;">
              <span style="font-size:12.5px;color:var(--ink-soft);">BMI (tự tính từ chiều cao + cân nặng):</span>
              ${bmi!=null ? `<b style="font-family:'IBM Plex Mono',monospace;font-size:16px;color:${bmiCat.color};">${bmi}</b><span style="font-size:12.5px;font-weight:700;color:${bmiCat.color};">${esc(bmiCat.label)}</span>` : `<span style="font-size:12.5px;color:var(--ink-soft);">— (nhập đủ Chiều cao + Cân nặng để tính)</span>`}
            </div>
            ${skBodyMeasureGuideHtml()}
          ` : ''}
          <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:12px;">
            ${g.items.map(([key,label,unit])=>`
              <div>
                <label style="display:block;font-size:12.5px;color:var(--ink-soft);margin-bottom:4px;">${esc(label)}${unit?` (${esc(unit)})`:''}</label>
                <input type="number" step="0.1" data-metric="${key}" value="${esc(getVal(key, state.week))}" placeholder="—">
              </div>
            `).join('')}
          </div>
        </div>
      `;}).join('')}

      <button class="btn" id="sk-save-week" ${state.saving?'disabled':''}>${state.saving?'Đang lưu…':'Lưu ' + esc(SK_WEEK_NAMES[state.week])}</button>

      ${products.length>0 ? (()=>{
        // Đồng bộ giao diện với Kiểm Tra Sức Khỏe/Thư Viện Sức Khỏe/Sản Phẩm Unicity (2026-09-05,
        // chị Quỳnh: "các phần nào có sản phẩm cũng phải làm tương tự") — dùng chung
        // skProductOrderRowHtml (checkbox, ảnh to, công dụng, mở full) + thanh tổng + quà tặng.
        const cartChosen = products.filter(p=>!state.deselected.has(p.id));
        const cartTotal = cartChosen.reduce((s,p)=>s+Number(p.retail_price||0),0);
        const cartPv = cartChosen.reduce((s,p)=>s+Number(p.pv||0),0);
        const gift = skOrderGift(cartTotal, cartChosen.length);
        return `
        <div class="hint-box" style="margin-top:16px;margin-bottom:10px;">
          Chỉ số ${flags.map(f=>esc(f.label)).join(', ')} đang ở mức cần chú ý — dưới đây là sản phẩm Unicity liên quan tới nhóm này.
        </div>
        ${products.map(p=>skProductOrderRowHtml(p, !state.deselected.has(p.id))).join('')}
        <div style="position:sticky;bottom:14px;margin-top:16px;background:var(--panel);border:1px solid var(--accent);border-radius:12px;padding:14px 16px;box-shadow:0 6px 20px rgba(0,0,0,.12);">
          <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;">
            <div style="font-size:13.5px;">Đơn hàng: <b>${cartChosen.length}</b> sản phẩm · ${cartPv} PV · <span style="font-family:'IBM Plex Mono',monospace;font-weight:700;color:var(--accent);">${cartTotal.toLocaleString('vi-VN')}đ</span></div>
            <div style="display:flex;gap:8px;">
              <span class="btn-ghost btn btn-sm" id="sk-toggle-all-flagged">${cartChosen.length>0 ? 'Bỏ chọn hết' : 'Chọn lại tất cả'}</span>
              <button class="btn btn-sm" id="sk-order-flagged" ${cartChosen.length===0?'disabled':''}>Đặt hàng</button>
            </div>
          </div>
          ${skGiftPreviewHtml(gift)}
        </div>
      `;})() : ''}

      ${summary.length>0 ? `
        <div class="page-head" style="margin:28px 0 12px;"><h2 style="font-size:17px;">So sánh Bắt đầu → Tuần 8</h2></div>
        <div class="card">
          ${summary.map(s=>`
            <div class="list-item">
              <div class="txt">${esc(s.label)}: ${s.base}${esc(s.unit)} → ${s.end}${esc(s.unit)}</div>
              <span style="font-family:'IBM Plex Mono',monospace;font-weight:600;color:${s.good===true?'#1f9d63':(s.good===false?'#c0392b':'var(--ink-soft)')};white-space:nowrap;">${s.delta>0?'+':''}${s.delta}</span>
            </div>
          `).join('')}
        </div>
      ` : `<div class="hint-box" style="margin-top:8px;">Điền cả mốc "Bắt đầu" và "Tuần 8" cho cùng 1 chỉ số để thấy so sánh ở đây.</div>`}
    `;
  }

  function bind(){
    container.querySelectorAll('[data-week]').forEach(el=>{
      el.onclick = ()=>{ state.week = Number(el.getAttribute('data-week')); state.justSaved = false; draw(); };
    });
    container.querySelectorAll('[data-metric]').forEach(el=>{
      el.onchange = (e)=>{ setVal(el.getAttribute('data-metric'), state.week, e.target.value); };
    });
    const photoFileEl = container.querySelector('#sk-week-photo-file');
    if(photoFileEl) photoFileEl.onchange = (e)=>{ if(e.target.files.length) handleWeekPhotoFiles(e.target.files); };
    container.querySelectorAll('[data-remove-photo]').forEach(el=>{
      el.onclick = ()=> removeWeekPhoto(Number(el.getAttribute('data-remove-photo')));
    });
    container.querySelectorAll('[data-zoom]').forEach(el=>{
      el.onclick = (e)=>{ e.preventDefault(); e.stopPropagation(); openImageLightbox(el.getAttribute('data-zoom'), ''); };
    });
    const saveBtn = container.querySelector('#sk-save-week');
    if(saveBtn) saveBtn.onclick = save;
    container.querySelectorAll('[data-cart-toggle]').forEach(el=>{
      el.onchange = (e)=>{
        const id = el.getAttribute('data-cart-toggle');
        if(e.target.checked) state.deselected.delete(id); else state.deselected.add(id);
        draw();
      };
    });
    const toggleAllBtn = container.querySelector('#sk-toggle-all-flagged');
    if(toggleAllBtn) toggleAllBtn.onclick = ()=>{
      const ids = recommendedProducts().products.map(p=>p.id);
      const anySelected = ids.some(id=>!state.deselected.has(id));
      if(anySelected) ids.forEach(id=>state.deselected.add(id));
      else ids.forEach(id=>state.deselected.delete(id));
      draw();
    };
    const orderBtn = container.querySelector('#sk-order-flagged');
    if(orderBtn) orderBtn.onclick = ()=>{
      const chosen = recommendedProducts().products.filter(p=>!state.deselected.has(p.id));
      openOrderModal(ctx, chosen);
    };
  }

  draw();
  load();
}

window.Modules = window.Modules || {};
window.Modules['theo-doi-tuan'] = { title:'Theo Dõi Sức Khỏe Theo Tuần', render };
})();
