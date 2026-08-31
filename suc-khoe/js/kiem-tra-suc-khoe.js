// Kiểm Tra Sức Khỏe — "Khảo sát sơ bộ" mô phỏng theo hieu-de-khoe-manh.vercel.app (chị Quỳnh yêu cầu
// làm kỹ giống bản gốc, 2026-08-30): 3 nhóm triệu chứng tick-chọn, tính điểm & mức độ ngay khi tick,
// lưu 1 dòng/user (khác bản cũ: chip chọn "vấn đề" rồi bấm nút "Kiểm tra ngay" riêng).
//
// Liên kết sang Thư Viện + Sản Phẩm (2026-08-30, chị Quỳnh yêu cầu "phải có sự liên hệ giữa các mục
// để bán được thêm sản phẩm") — CỐ Ý map CỨNG từng nhóm triệu chứng sang đúng 1-2 mục Thư Viện +
// đúng 1 nhánh Sản Phẩm (thay vì so khớp từ khoá mờ như bản trước, gần như không ra kết quả vì tên
// mục Thư Viện là tên chủ đề chung — "Tích tụ độc tố trong cơ thể" — không chứa các từ triệu chứng cụ
// thể như "mụn"/"rụng tóc"). Vì cả 3 bộ dữ liệu (triệu chứng, mục Thư Viện, nhánh sản phẩm) đều do
// cùng 1 người biên soạn nên map cứng theo Ý NGHĨA đúng hơn nhiều so với so khớp chuỗi.
//
// Sản phẩm gợi ý (2026-08-30, phản hồi thêm của chị Quỳnh):
// - Mỗi sản phẩm hiện lý do NGẮN vì sao liên quan đúng vấn đề này (sk_library_entries.product_notes,
//   không phải short_description chung chung) — bấm vào xổ ra ĐẦY ĐỦ thông tin tại chỗ (skProductDetailHtml),
//   không điều hướng sang trang Sản Phẩm nữa.
// - Sản phẩm priority=true (2-3 sản phẩm) xếp trước, có nhãn "Nên dùng trước" — phòng khi khách
//   không đủ ngân sách mua hết cả nhóm.
// - Khách TỰ chọn sản phẩm muốn đặt (checkbox, KHÔNG tự động chọn hết) — tổng tiền hiện ngay trên
//   thanh cố định cuối trang, giống hệt cách chọn ở trang Sản Phẩm.
const SK_GROUP_LIBRARY_MAP = {
  insulin: ['Rối loạn chuyển hóa đường huyết (kháng Insulin, tiền tiểu đường, Đái tháo đường)'],
  toxin: ['Tích tụ độc tố trong cơ thể'],
  metabolic: ['Rối loạn chuyển hóa đường huyết (kháng Insulin, tiền tiểu đường, Đái tháo đường)', 'Rối loạn chuyển hóa Lipid (mỡ máu)'],
};
const SK_INSULIN_SYMPTOMS = [
  'Mụn', 'Mụn thịt trên da', 'Mỡ bụng', 'Bệnh gout', 'Đường huyết cao', 'Mệt mỏi sau bữa ăn',
  'Tăng cân', 'Đường trong máu thấp', 'Rụng tóc', 'Thèm đồ ngọt', 'Gan nhiễm mỡ',
  'Buồng trứng đa nang', 'Giảm testosterone / cơ thấp', 'Triglyceride hoặc Cholesterol cao',
];
const SK_TOXIN_SYMPTOMS = [
  'Nhức đầu', 'Chóng mặt', 'Đau nhức', 'Mệt mỏi', 'Dị ứng', 'Mau quên', 'Ngứa mũi', 'Tức ngực',
  'Khó thở', 'Hen suyễn', 'Suy yếu', 'Nhạy cảm', 'Nóng nảy', 'U sầu', 'Xanh xao', 'Ngứa mắt',
  'Mắt đỏ', 'Ngứa da', 'Da xấu', 'Đốm trên da', 'Tiêu chảy', 'Bệnh vặt', 'Bệnh kinh niên',
  'Táo bón', 'Hôi miệng', 'Trầm cảm', 'Mất ngủ', 'Béo phì', 'Rối loạn tiêu hóa',
];
const SK_METABOLIC_CRITERIA = [
  { label:'Béo bụng', desc:'Nam ≥ 102cm · Nữ ≥ 88cm' },
  { label:'Triglyceride cao', desc:'≥ 150 mg/dL' },
  { label:'HDL-C thấp', desc:'Nam < 40 · Nữ < 50 mg/dL' },
  { label:'Huyết áp cao', desc:'≥ 130/85 mmHg' },
  { label:'Đường huyết đói cao', desc:'≥ 5,6 mmol/l' },
];

(function(){
function render(container, ctx){
  // deselected (KHÔNG phải "selected") — 2026-08-31 chị Quỳnh chốt: mặc định LUÔN chọn hết mọi sản
  // phẩm gợi ý, người dùng tự bỏ bớt nếu không muốn mua. Lưu chiều "đã bỏ" thay vì "đã chọn" để sản
  // phẩm MỚI xuất hiện (khi tick thêm triệu chứng khác) cũng tự động ở trạng thái được chọn luôn,
  // không cần logic đồng bộ riêng.
  const state = { loading:true, insulin:[], toxin:[], metabolic:[], libraryEntries:[], products:[], deselected:new Set() };

  function draw(){ container.innerHTML = html(); bind(); }

  async function load(){
    const [{ data: row }, { data: entries }, { data: products }] = await Promise.all([
      ctx.supabase.from('sk_health_checkins').select('*').eq('user_id', ctx.user.id).maybeSingle(),
      ctx.supabase.from('sk_library_entries').select('id,issue_name,related_product_ids,product_notes').order('issue_name', { ascending:true }),
      ctx.supabase.from('sk_products').select('id,name,category,retail_price,pv,short_description,image_url,detail_sections,benefits'),
    ]);
    state.products = products || [];
    if(row){
      state.insulin = row.survey_insulin || [];
      state.toxin = row.survey_toxin || [];
      state.metabolic = row.survey_metabolic || [];
    }
    state.libraryEntries = entries || [];
    state.loading = false;
    draw();
  }

  async function save(){
    const { error } = await ctx.supabase.from('sk_health_checkins').upsert({
      user_id: ctx.user.id,
      survey_insulin: state.insulin, survey_toxin: state.toxin, survey_metabolic: state.metabolic,
      updated_at: new Date().toISOString(),
    }, { onConflict:'user_id' });
    if(error) alert('Lỗi khi lưu: ' + error.message);
  }

  function toggle(group, label){
    const arr = state[group];
    const i = arr.indexOf(label);
    if(i>=0) arr.splice(i,1); else arr.push(label);
    draw();
    save();
  }

  // Điểm & mức độ tính giống hệt surveyResult() của bản gốc — giữ nguyên ngưỡng và câu chữ vì đây là
  // nội dung tự đánh giá sức khỏe (không phải quảng cáo sản phẩm), chị Quỳnh đã dùng ổn định ở app kia.
  function computeResult(){
    const ci = state.insulin.length, ct = state.toxin.length, cm = state.metabolic.length;
    const meta = cm >= 3;
    const score = ci + ct + cm*2;
    let level, color, bg, bd;
    if(meta || score>=18){ level='Cao'; color='#c0392b'; bg='#fdeee8'; bd='#f3b9a4'; }
    else if(score>=7){ level='Trung bình'; color='#e8643c'; bg='#fff7f0'; bd='#f3d9bf'; }
    else { level='Thấp'; color='#1f9d63'; bg='#eef6f0'; bd='#cfe6d8'; }
    const problems = [];
    if(ci>=5) problems.push('Dấu hiệu kháng insulin rõ rệt — cơ thể khó chuyển hóa đường, dễ tích mỡ và tăng cân.');
    else if(ci>=2) problems.push('Một vài dấu hiệu kháng insulin sớm — cần chú ý chế độ ăn và vận động.');
    if(meta) problems.push('Nguy cơ hội chứng rối loạn chuyển hóa (' + cm + '/5 tiêu chí) — nên làm xét nghiệm máu để đánh giá.');
    else if(cm>0) problems.push('Có ' + cm + '/5 tiêu chí rối loạn chuyển hóa — theo dõi vòng eo, mỡ máu, huyết áp, đường huyết.');
    if(ct>=10) problems.push('Nhiều dấu hiệu tích tụ độc tố và viêm — gan và đường ruột đang quá tải.');
    else if(ct>=4) problems.push('Một số dấu hiệu cơ thể đang quá tải, cần nghỉ ngơi và thải độc.');
    if(problems.length===0) problems.push('Hiện chưa có dấu hiệu đáng lo — cơ thể bạn đang ở trạng thái khá ổn định.');
    let impact, future;
    if(level==='Cao'){
      impact = 'Bạn dễ mệt mỏi, uể oải cả ngày, giấc ngủ và tâm trạng bị ảnh hưởng, giảm tập trung trong công việc và sinh hoạt. Cân nặng, vóc dáng và sự tự tin cũng bị tác động rõ.';
      future = 'Nếu không thay đổi, trong 3–5 năm tới nguy cơ tiến triển thành tiểu đường type 2, gan nhiễm mỡ, rối loạn mỡ máu, cao huyết áp và bệnh tim mạch tăng đáng kể.';
    } else if(level==='Trung bình'){
      impact = 'Bạn có thể thấy thiếu năng lượng buổi chiều, ngủ chưa sâu, đôi lúc khó tập trung. Tích tụ lâu sẽ ảnh hưởng tới vóc dáng và tinh thần.';
      future = 'Nếu giữ nguyên lối sống, sau 3–5 năm các chỉ số có xu hướng xấu dần: tăng cân, mỡ nội tạng, tiền tiểu đường và mệt mỏi mạn tính.';
    } else {
      impact = 'Chất lượng cuộc sống của bạn hiện ở mức tốt. Duy trì thói quen lành mạnh sẽ giúp giữ năng lượng, giấc ngủ và tinh thần ổn định.';
      future = 'Nếu tiếp tục duy trì, sau 3–5 năm bạn nhiều khả năng vẫn giữ được sức khỏe tốt, vóc dáng cân đối và tinh thần tích cực.';
    }
    return { level, color, bg, bd, score, problems, impact, future };
  }

  // Nhóm nào có ít nhất 1 lượt tick mới tính "đang active" — dùng để quyết định gợi ý Thư Viện +
  // Sản Phẩm nào hiện ra (xem SK_GROUP_LIBRARY_MAP ở đầu file).
  function activeGroups(){
    const groups = [];
    if(state.insulin.length>0) groups.push('insulin');
    if(state.toxin.length>0) groups.push('toxin');
    if(state.metabolic.length>0) groups.push('metabolic');
    return groups;
  }

  function matchedLibraryEntries(){
    const groups = activeGroups();
    const names = new Set(groups.flatMap(g=>SK_GROUP_LIBRARY_MAP[g]||[]));
    return state.libraryEntries.filter(e=>names.has(e.issue_name));
  }

  // Chỉ hiện ĐÚNG sản phẩm đã gắn sẵn theo từng mục Thư Viện khớp — kèm lý do riêng (product_notes)
  // và cờ ưu tiên, gộp từ TẤT CẢ mục Thư Viện đang khớp (1 sản phẩm có thể được nhắc tới ở nhiều mục
  // với lý do khác nhau — lấy lý do của mục đầu tiên có ghi). Sắp priority lên trước.
  function matchedProducts(){
    const entries = matchedLibraryEntries();
    const noteByProductId = {};
    entries.forEach(e=>{
      const notes = e.product_notes || {};
      Object.keys(notes).forEach(pid=>{ if(!noteByProductId[pid]) noteByProductId[pid] = notes[pid]; });
    });
    const ids = new Set(entries.flatMap(e=>e.related_product_ids||[]));
    if(ids.size===0) return [];
    return state.products
      .filter(p=>ids.has(p.id))
      .map(p=>({ ...p, _note: (noteByProductId[p.id]||{}).note || null, _priority: !!(noteByProductId[p.id]||{}).priority }))
      .sort((a,b)=> (b._priority - a._priority));
  }

  function chipGroup(group, items){
    return `<div class="chips">${items.map(label=>`
      <div class="chip ${state[group].includes(label)?'selected':''}" data-group="${group}" data-label="${esc(label)}">${esc(label)}</div>
    `).join('')}</div>`;
  }

  function html(){
    if(state.loading) return `<div class="loading"><div class="spinner"></div></div>`;
    const hasAny = state.insulin.length + state.toxin.length + state.metabolic.length > 0;
    const r = hasAny ? computeResult() : null;
    const libMatches = hasAny ? matchedLibraryEntries() : [];
    const productMatches = hasAny ? matchedProducts() : [];
    const cartChosen = productMatches.filter(p=>!state.deselected.has(p.id));
    const cartTotal = cartChosen.reduce((s,p)=>s+Number(p.retail_price||0),0);
    const cartPv = cartChosen.reduce((s,p)=>s+Number(p.pv||0),0);
    const gift = skOrderGift(cartTotal, cartChosen.length);
    return `
      <div class="page-head">
        <h1>Kiểm Tra Sức Khỏe</h1>
        <p>Tick chọn các dấu hiệu bạn đang gặp ở mỗi nhóm — kết quả cập nhật ngay theo từng lượt tick, không cần bấm nộp bài.</p>
      </div>

      <details class="kt-section" open>
        <summary class="kt-summary">Dấu hiệu kháng insulin (${state.insulin.length}/${SK_INSULIN_SYMPTOMS.length})</summary>
        <div style="margin-top:12px;">${chipGroup('insulin', SK_INSULIN_SYMPTOMS)}</div>
      </details>

      <details class="kt-section" open>
        <summary class="kt-summary">Dấu hiệu tích tụ độc tố, viêm (${state.toxin.length}/${SK_TOXIN_SYMPTOMS.length})</summary>
        <div style="margin-top:12px;">${chipGroup('toxin', SK_TOXIN_SYMPTOMS)}</div>
      </details>

      <details class="kt-section" open>
        <summary class="kt-summary">Tiêu chí hội chứng rối loạn chuyển hóa (${state.metabolic.length}/${SK_METABOLIC_CRITERIA.length})</summary>
        <div style="margin-top:12px;">
          <div class="chips">${SK_METABOLIC_CRITERIA.map(c=>`
            <div class="chip ${state.metabolic.includes(c.label)?'selected':''}" data-group="metabolic" data-label="${esc(c.label)}">${esc(c.label)} <span style="opacity:.65;">(${esc(c.desc)})</span></div>
          `).join('')}</div>
        </div>
      </details>

      ${r ? `
        <div class="card" style="margin-top:20px;border:1px solid ${r.bd};background:${r.bg};">
          <div style="font-family:'IBM Plex Mono',monospace;font-size:12.5px;text-transform:uppercase;letter-spacing:.06em;color:${r.color};margin-bottom:6px;">Mức độ nguy cơ</div>
          <div style="font-size:22px;font-weight:700;color:${r.color};margin-bottom:14px;">${esc(r.level)} <span style="font-size:14px;font-weight:400;color:var(--ink-soft);">(điểm ${r.score})</span></div>
          <ul style="margin:0 0 16px;padding-left:20px;font-size:14px;line-height:1.8;">
            ${r.problems.map(p=>`<li style="margin-bottom:8px;">${esc(p)}</li>`).join('')}
          </ul>
          <div style="margin-bottom:12px;">${skSectionHeaderHtml('Ảnh hưởng hiện tại', '#e8643c', '⚡')}<div style="font-size:14px;line-height:1.8;">${esc(r.impact)}</div></div>
          <div>${skSectionHeaderHtml('Nếu không thay đổi', '#c0392b', '⏳')}<div style="font-size:14px;line-height:1.8;">${esc(r.future)}</div></div>
        </div>
      ` : `<div class="hint-box" style="margin-top:20px;">Tick ít nhất 1 dấu hiệu ở trên để xem kết quả.</div>`}

      ${libMatches.length>0 ? `
        <div class="page-head" style="margin:24px 0 12px;"><h2 style="font-size:17px;">Đọc thêm ở Thư Viện Sức Khỏe</h2></div>
        ${libMatches.map(m=>`<div class="list-item" data-open-library="1" style="cursor:pointer;"><div class="txt">${esc(m.issue_name)}</div><span style="color:var(--accent);font-size:13px;">Xem chi tiết →</span></div>`).join('')}
      ` : ''}

      ${productMatches.length>0 ? `
        <div class="page-head" style="margin:24px 0 12px;"><h2 style="font-size:17px;">Sản phẩm Unicity phù hợp với bạn</h2></div>
        <p style="font-size:13.5px;color:var(--ink-soft);margin:-8px 0 14px;line-height:1.6;">✨ Dựa trên các dấu hiệu bạn vừa chọn, đây là những sản phẩm Unicity phù hợp nhất để hỗ trợ đúng vấn đề của bạn ngay từ hôm nay — xem lý do vì sao từng sản phẩm được đề xuất bên dưới, tất cả đã được chọn sẵn trong đơn, bạn có thể bỏ bớt nếu muốn.</p>
        ${productMatches.map(p=>skProductOrderRowHtml(p, !state.deselected.has(p.id))).join('')}

        <div style="position:sticky;bottom:14px;margin-top:16px;background:var(--panel);border:1px solid var(--accent);border-radius:12px;padding:14px 16px;box-shadow:0 6px 20px rgba(0,0,0,.12);">
          <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;">
            <div style="font-size:13.5px;">Đơn hàng: <b>${cartChosen.length}</b> sản phẩm · ${cartPv} PV · <span style="font-family:'IBM Plex Mono',monospace;font-weight:700;color:var(--accent);">${cartTotal.toLocaleString('vi-VN')}đ</span></div>
            <div style="display:flex;gap:8px;">
              <span class="btn-ghost btn btn-sm" id="sk-toggle-all">${cartChosen.length>0 ? 'Bỏ chọn hết' : 'Chọn lại tất cả'}</span>
              <button class="btn btn-sm" id="sk-order-matched" ${cartChosen.length===0?'disabled':''}>Đặt hàng</button>
            </div>
          </div>
          ${gift ? `<div style="margin-top:8px;font-size:13px;color:#e8643c;font-weight:700;">${esc(gift.label)}</div>` : ''}
        </div>
      ` : ''}
    `;
  }

  function bind(){
    container.querySelectorAll('[data-group]').forEach(el=>{
      el.onclick = ()=> toggle(el.getAttribute('data-group'), el.getAttribute('data-label'));
    });
    container.querySelectorAll('[data-open-library]').forEach(el=>{
      el.onclick = ()=>{ location.hash = 'thu-vien-suc-khoe'; };
    });
    container.querySelectorAll('[data-cart-toggle]').forEach(el=>{
      el.onchange = (e)=>{
        const id = el.getAttribute('data-cart-toggle');
        if(e.target.checked) state.deselected.delete(id); else state.deselected.add(id);
        draw();
      };
    });
    const toggleAllBtn = container.querySelector('#sk-toggle-all');
    if(toggleAllBtn) toggleAllBtn.onclick = ()=>{
      const ids = matchedProducts().map(p=>p.id);
      const anySelected = ids.some(id=>!state.deselected.has(id));
      if(anySelected) ids.forEach(id=>state.deselected.add(id));
      else state.deselected.clear();
      draw();
    };
    const orderBtn = container.querySelector('#sk-order-matched');
    if(orderBtn) orderBtn.onclick = ()=>{ openOrderModal(ctx, matchedProducts().filter(p=>!state.deselected.has(p.id))); };
  }

  draw();
  load();
}

window.Modules = window.Modules || {};
window.Modules['kiem-tra-suc-khoe'] = { title:'Kiểm Tra Sức Khỏe', render };
})();
