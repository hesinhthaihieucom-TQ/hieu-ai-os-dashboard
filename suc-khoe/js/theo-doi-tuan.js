// Theo Dõi Sức Khỏe Theo Tuần — "Chỉ số cơ thể" mô phỏng theo hieu-de-khoe-manh.vercel.app (chị Quỳnh
// yêu cầu làm kỹ giống bản gốc, 2026-08-30): 9 mốc cố định (Bắt đầu + Tuần 1-8, KHÔNG phải tuần lịch
// tự động) x 3 nhóm chỉ số, thay cho bản cũ (tuần lịch + 4 chỉ số đơn giản: cân nặng/ngủ/năng lượng/
// tâm trạng). Lưu 1 dòng/user dạng jsonb {metric_key: {mốc: giá trị}} — xem schema_full.sql.
const SK_WEEK_NAMES = ['Bắt đầu','Tuần 1','Tuần 2','Tuần 3','Tuần 4','Tuần 5','Tuần 6','Tuần 7','Tuần 8'];

const SK_METRIC_GROUPS = [
  { title:'Thông số cơ thể (đo theo tuần)', color:'#e8643c', items:[
    ['eo1','Vòng eo','cm'], ['baptay','Bắp tay','cm'], ['nguc','Ngực','cm'], ['eo2','Eo (vị trí 2)','cm'],
    ['bung_ron','Bụng (ngang rốn)','cm'], ['bung_duoi','Bụng (dưới rốn, to nhất)','cm'], ['mong','Mông','cm'],
    ['dui','Đùi','cm'], ['bapchan','Bắp chân','cm'], ['cannang','Cân nặng','kg'], ['mo','% Mỡ','%'],
    ['kgco','Kg cơ','kg'], ['monoitang','Mỡ nội tạng',''],
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
const SK_BETTER_LOW = { eo1:1, eo2:1, nguc:1, bung_ron:1, bung_duoi:1, mong:1, dui:1, bapchan:1, cannang:1, mo:1, monoitang:1, glucose:1, tg:1, hba1c:1, ldl:1, uric:1, chol:1 };
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
  eo1:'giam_mo', eo2:'giam_mo', bung_ron:'giam_mo', bung_duoi:'giam_mo', cannang:'giam_mo', mo:'giam_mo', monoitang:'giam_mo', kgco:'tang_de_khang',
  glucose:'giam_mo', tg:'giam_mo', hba1c:'giam_mo', ldl:'giam_mo', chol:'giam_mo', uric:'thai_doc',
  nangluong:'tang_de_khang', cl_ngu:'thai_doc', vandong:'xuong_khop', damongtoc:'lam_dep_da', anuong:'thai_doc', sucben:'tang_de_khang',
  tinh_khonggong:'thai_doc', khi_thongsuot:'thai_doc', khi_dammuon:'thai_doc',
};
const SK_ABSOLUTE_CONCERN = {
  glucose: v => v >= 5.6,
  tg: v => v >= 150,
  hba1c: v => v >= 5.7,
};

(function(){
function render(container, ctx){
  const state = { loading:true, week:0, weekAuto:true, metrics:{}, saving:false, products:[], justSaved:false };

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
      ctx.supabase.from('sk_weekly_logs').select('metrics').eq('user_id', ctx.user.id).maybeSingle(),
      ctx.supabase.from('sk_products').select('id,name,category,retail_price,pv,short_description,image_url').not('category', 'is', null),
    ]);
    state.metrics = (row && row.metrics) || {};
    state.products = products || [];
    state.week = currentWeekFromPackage();
    state.loading = false;
    draw();
  }

  function getVal(key, week){ return (state.metrics[key] && state.metrics[key][week]) || ''; }
  function setVal(key, week, val){
    if(!state.metrics[key]) state.metrics[key] = {};
    if(val==='') delete state.metrics[key][week]; else state.metrics[key][week] = val;
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
      user_id: ctx.user.id, metrics: state.metrics, updated_at: new Date().toISOString(),
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
      if(concern) flags.push({ key, label, category:cat });
    }));
    return flags;
  }

  // Có nhập ít nhất 1 chỉ số nào ở mốc này chưa — để biết có nên hiện "kết quả chẩn đoán" hay
  // nhắc trống trơn (2026-09-05, chị Quỳnh: "cần có kết quả chuẩn đoán của app cho người dùng").
  function weekHasData(week){
    return SK_METRIC_GROUPS.some(g=>g.items.some(([key])=>getVal(key, week)!==''));
  }

  // Kết quả chẩn đoán tổng quan của mốc đang xem — dựa trên số chỉ số đáng chú ý (flaggedMetrics) và
  // điểm Tinh/Khí/Thần trung bình (tktScores), cùng phong cách với "Mức độ nguy cơ" ở Kiểm Tra Sức
  // Khỏe cho quen mắt. KHÔNG tính điểm y khoa mới — chỉ tổng hợp lại dữ liệu đã có ở trang này.
  function weeklyDiagnosis(){
    const flags = flaggedMetrics();
    const n = flags.length;
    const scores = tktScores(state.week).filter(s=>s.score!=null);
    const avgTkt = scores.length ? scores.reduce((s,x)=>s+x.score,0)/scores.length : null;
    let level, color, bg, bd;
    if(n>=5 || (avgTkt!=null && avgTkt<=4)){ level='Cần chú ý nhiều'; color='#c0392b'; bg='#fdeee8'; bd='#f3b9a4'; }
    else if(n>=2 || (avgTkt!=null && avgTkt<7)){ level='Cần theo dõi'; color='#e8643c'; bg='#fff7f0'; bd='#f3d9bf'; }
    else { level='Đang ổn định'; color='#1f9d63'; bg='#eef6f0'; bd='#cfe6d8'; }
    let summary = n>0
      ? `Có ${n} chỉ số đang ở mức cần chú ý (${flags.map(f=>f.label).join(', ')}).`
      : 'Chưa có chỉ số nào ở mức đáng lo trong các chỉ số đã nhập.';
    if(avgTkt!=null) summary += ` Năng lượng Tinh/Khí/Thần trung bình: ${avgTkt.toFixed(1)}/10.`;
    return { level, color, bg, bd, summary, n };
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
      <div style="font-size:12px;color:var(--ink-soft);margin-bottom:${weekDateRange(state.week)?'4px':'20px'};">● Mốc hiện tại theo ngày bắt đầu gói của bạn</div>
      ${weekDateRange(state.week) ? `<div style="font-size:12.5px;color:var(--accent);font-weight:600;margin-bottom:20px;">📅 ${esc(SK_WEEK_NAMES[state.week])}: ${weekDateRange(state.week)}</div>` : ''}

      ${weekHasData(state.week) ? (()=>{
        const d = weeklyDiagnosis();
        return `
        <div class="card" style="margin-bottom:18px;border:1px solid ${d.bd};background:${d.bg};">
          <div style="font-family:'IBM Plex Mono',monospace;font-size:12.5px;text-transform:uppercase;letter-spacing:.06em;color:${d.color};margin-bottom:6px;">Kết quả chẩn đoán — ${esc(SK_WEEK_NAMES[state.week])}</div>
          <div style="font-size:19px;font-weight:700;color:${d.color};margin-bottom:8px;">${esc(d.level)}</div>
          <div style="font-size:13.5px;line-height:1.8;">${esc(d.summary)}</div>
        </div>
      `;})() : `<div class="hint-box" style="margin-bottom:18px;">Chưa có dữ liệu cho mốc "${esc(SK_WEEK_NAMES[state.week])}" — nhập ít nhất 1 chỉ số bên dưới để xem kết quả chẩn đoán.</div>`}

      ${(() => {
        const scores = tktScores(state.week);
        if(scores.every(s=>s.score==null)) return '';
        return `
        <div class="card" style="margin-bottom:18px;background:linear-gradient(135deg,#14201B,#1f2e26);color:#F7F4EC;">
          <h3 style="font-family:'IBM Plex Mono',monospace;font-size:12.5px;text-transform:uppercase;letter-spacing:.06em;opacity:.75;margin-bottom:14px;">🔮 Siêu Âm Năng Lượng — ${esc(SK_WEEK_NAMES[state.week])}</h3>
          <div style="display:flex;gap:14px;flex-wrap:wrap;">
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

      ${SK_METRIC_GROUPS.map(g=>`
        <div class="card" style="margin-bottom:18px;">
          <h3 style="font-family:'IBM Plex Mono',monospace;font-size:12.5px;text-transform:uppercase;letter-spacing:.06em;color:${g.color};margin-bottom:14px;">${esc(g.title)}</h3>
          <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:12px;">
            ${g.items.map(([key,label,unit])=>`
              <div>
                <label style="display:block;font-size:12.5px;color:var(--ink-soft);margin-bottom:4px;">${esc(label)}${unit?` (${esc(unit)})`:''}</label>
                <input type="number" step="0.1" data-metric="${key}" value="${esc(getVal(key, state.week))}" placeholder="—">
              </div>
            `).join('')}
          </div>
        </div>
      `).join('')}

      <button class="btn" id="sk-save-week" ${state.saving?'disabled':''}>${state.saving?'Đang lưu…':'Lưu ' + esc(SK_WEEK_NAMES[state.week])}</button>

      ${products.length>0 ? `
        <div class="hint-box" style="margin-top:16px;">
          Chỉ số ${flags.map(f=>esc(f.label)).join(', ')} đang ở mức cần chú ý — dưới đây là sản phẩm Unicity liên quan tới nhóm này.
        </div>
        ${products.map(p=>`
          <div class="section" data-open-product="1" style="cursor:pointer;margin-top:10px;display:flex;gap:14px;align-items:flex-start;">
            ${p.image_url ? `<img src="${esc(p.image_url)}" alt="" style="width:56px;height:56px;object-fit:cover;border-radius:8px;flex-shrink:0;">` : ''}
            <div style="flex:1;min-width:0;">
              <div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;">
                <div style="font-weight:700;font-size:14.5px;">${esc(p.name)}</div>
                ${p.retail_price!=null ? `<div style="font-family:'IBM Plex Mono',monospace;font-weight:700;color:var(--accent);white-space:nowrap;">${Number(p.retail_price).toLocaleString('vi-VN')}đ</div>` : ''}
              </div>
              ${p.short_description ? `<div style="font-size:13px;color:var(--ink-soft);margin-top:4px;">${esc(p.short_description)}</div>` : ''}
            </div>
          </div>
        `).join('')}
        <button class="btn btn-sm" id="sk-order-flagged" style="margin-top:6px;">Đặt hàng</button>
      ` : ''}

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
    const saveBtn = container.querySelector('#sk-save-week');
    if(saveBtn) saveBtn.onclick = save;
    container.querySelectorAll('[data-open-product]').forEach(el=>{
      el.onclick = ()=>{ location.hash = 'san-pham'; };
    });
    const orderBtn = container.querySelector('#sk-order-flagged');
    if(orderBtn) orderBtn.onclick = (e)=>{ e.stopPropagation(); openOrderModal(ctx, recommendedProducts().products); };
  }

  draw();
  load();
}

window.Modules = window.Modules || {};
window.Modules['theo-doi-tuan'] = { title:'Theo Dõi Sức Khỏe Theo Tuần', render };
})();
