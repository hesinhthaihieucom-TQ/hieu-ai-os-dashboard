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
];

// Chiều "tốt hơn" của mỗi chỉ số — dùng để tô màu chênh lệch trong bảng so sánh (giống betterFor của
// bản gốc, kể cả 2 chỗ họ không gán chiều nào — baptay/ct34 — nên bảng so sánh sẽ để màu trung tính).
const SK_BETTER_LOW = { eo1:1, eo2:1, nguc:1, bung_ron:1, bung_duoi:1, mong:1, dui:1, bapchan:1, cannang:1, mo:1, monoitang:1, glucose:1, tg:1, hba1c:1, ldl:1, uric:1, chol:1 };
const SK_BETTER_HIGH = { kgco:1, hdl:1, nangluong:1, cl_ngu:1, macdo:1, vandong:1, damongtoc:1, anuong:1, sucben:1, giaotiep:1, chatluongcs:1 };

(function(){
function render(container, ctx){
  const state = { loading:true, week:0, metrics:{}, saving:false };

  function draw(){ container.innerHTML = html(); bind(); }

  async function load(){
    const { data: row } = await ctx.supabase.from('sk_weekly_logs').select('metrics').eq('user_id', ctx.user.id).maybeSingle();
    state.metrics = (row && row.metrics) || {};
    state.loading = false;
    draw();
  }

  function getVal(key, week){ return (state.metrics[key] && state.metrics[key][week]) || ''; }
  function setVal(key, week, val){
    if(!state.metrics[key]) state.metrics[key] = {};
    if(val==='') delete state.metrics[key][week]; else state.metrics[key][week] = val;
  }

  async function save(){
    state.saving = true; draw();
    const { error } = await ctx.supabase.from('sk_weekly_logs').upsert({
      user_id: ctx.user.id, metrics: state.metrics, updated_at: new Date().toISOString(),
    }, { onConflict:'user_id' });
    state.saving = false;
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

  function html(){
    if(state.loading) return `<div class="loading"><div class="spinner"></div></div>`;
    const summary = summaryRows();
    return `
      <div class="page-head">
        <h1>Theo Dõi Sức Khỏe Theo Tuần</h1>
        <p>Đo & ghi lại theo từng mốc — so sánh "Bắt đầu" với "Tuần 8" để thấy rõ thay đổi sau 2 tháng.</p>
      </div>

      <div class="chips" style="margin-bottom:20px;">
        ${SK_WEEK_NAMES.map((w,i)=>`<div class="chip ${state.week===i?'selected':''}" data-week="${i}">${esc(w)}</div>`).join('')}
      </div>

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
      el.onclick = ()=>{ state.week = Number(el.getAttribute('data-week')); draw(); };
    });
    container.querySelectorAll('[data-metric]').forEach(el=>{
      el.onchange = (e)=>{ setVal(el.getAttribute('data-metric'), state.week, e.target.value); };
    });
    const saveBtn = container.querySelector('#sk-save-week');
    if(saveBtn) saveBtn.onclick = save;
  }

  draw();
  load();
}

window.Modules = window.Modules || {};
window.Modules['theo-doi-tuan'] = { title:'Theo Dõi Sức Khỏe Theo Tuần', render };
})();
