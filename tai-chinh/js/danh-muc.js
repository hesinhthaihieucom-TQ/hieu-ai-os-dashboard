(function(){
// "Quản Lý Danh Mục" — màn thiết lập danh mục thu/chi 1 LẦN, KHÔNG hiện trong sidebar (giống
// trang-chu/tai-khoan, xem NAV ở app-shell.js) — vào qua link "Quản lý danh mục →" ở Ghi Chép Hàng
// Ngày và ở Ngân sách (Mục Tiêu & Cam Kết). 2026-08-24, góp ý Quỳnh: "muốn danh mục là thiết lập ban
// đầu, không phải chọn lúc ghi — để làm ngân sách thì theo đúng cái của người ta luôn". Mỗi danh mục
// CHI TIÊU gắn sẵn CP cố định/CP biến đổi (không ép Tài sản/Tiêu sản, xem lý do ở util.js
// SUGGESTED_EXPENSE_CLASSIFICATION) để ghi-chep.js tự điền sẵn "Phân loại (kế toán)" khi chọn danh
// mục đó, đỡ phải chọn lại mỗi lần.
const CLASSIFICATION_OPTIONS = [
  { key:'cp_co_dinh', label:'CP cố định' },
  { key:'cp_bien_doi', label:'CP biến đổi' },
];

function render(container, ctx){
  const state = {
    loading: true,
    categories: [],
    tab: 'expense', // 'expense' | 'income'
    newLabel: '',
    newClassification: 'cp_bien_doi',
    saving: false,
    error: null,
  };

  function draw(){ container.innerHTML = html(); bind(); }
  draw();

  async function load(){
    state.loading = true; draw();
    await ensureCategoriesSeeded(ctx);
    const { data } = await ctx.supabase.from('tc_categories').select('*')
      .eq('user_id', ctx.user.id).order('type').order('label');
    state.categories = data || [];
    state.loading = false;
    draw();
  }

  async function addCategory(){
    const label = state.newLabel.trim();
    if(!label){ state.error = 'Nhập tên danh mục trước.'; draw(); return; }
    if(state.categories.some(c=>c.type===state.tab && c.label.toLowerCase()===label.toLowerCase())){
      state.error = 'Danh mục này đã có rồi.'; draw(); return;
    }
    state.saving = true; state.error = null; draw();
    const { error } = await ctx.supabase.from('tc_categories').insert({
      user_id: ctx.user.id, type: state.tab, label,
      default_classification: state.tab==='expense' ? state.newClassification : null,
    });
    state.saving = false;
    if(error){ state.error = 'Không lưu được — thử lại.'; draw(); return; }
    state.newLabel = '';
    await load();
  }

  async function updateClassification(id, classification){
    await ctx.supabase.from('tc_categories').update({ default_classification: classification }).eq('id', id);
    await load();
  }

  async function deleteCategory(id, label){
    const ok = await confirmModal(`Xoá danh mục "${label}"? Các giao dịch đã ghi trước đó vẫn giữ nguyên, chỉ không còn chọn được danh mục này lúc ghi mới.`);
    if(!ok) return;
    await ctx.supabase.from('tc_categories').delete().eq('id', id);
    await load();
  }

  function categoryRowHtml(c){
    return `
      <div class="list-item">
        <div class="txt">${esc(c.label)}</div>
        <div style="display:flex;align-items:center;gap:8px;flex-shrink:0;">
          ${c.type==='expense' ? `
            <select data-classification="${c.id}" style="padding:6px 8px;border:1px solid var(--line);border-radius:8px;font-size:12.5px;background:#FDFCF8;color:var(--ink);">
              <option value="" ${!c.default_classification?'selected':''}>— Chưa gắn —</option>
              ${CLASSIFICATION_OPTIONS.map(o=>`<option value="${o.key}" ${c.default_classification===o.key?'selected':''}>${o.label}</option>`).join('')}
            </select>
          ` : ''}
          <span class="btn-ghost btn btn-sm" data-delete-category="${c.id}" data-category-label="${esc(c.label)}" style="padding:5px 10px;font-size:12px;">Xoá</span>
        </div>
      </div>
    `;
  }

  function html(){
    const list = state.categories.filter(c=>c.type===state.tab);
    return `
      <div class="page-head">
        <h1>Quản Lý Danh Mục</h1>
        <p>Thiết lập <b>1 lần</b> danh sách danh mục thu/chi của riêng bạn — Ghi Chép Hàng Ngày và Ngân sách sẽ luôn dùng đúng danh sách này, thay vì mỗi lần ghi lại phải gõ/chọn khác nhau.</p>
      </div>

      <div class="chips" style="margin-bottom:16px;">
        <div class="chip ${state.tab==='expense'?'selected':''}" data-tab="expense">Danh mục chi tiêu</div>
        <div class="chip ${state.tab==='income'?'selected':''}" data-tab="income">Danh mục thu nhập</div>
        <div class="chip ${state.tab==='tich_luy'?'selected':''}" data-tab="tich_luy">Tích Lũy</div>
      </div>

      ${state.tab==='tich_luy' ? `<div id="dm-tich-luy-sub" style="margin-bottom:20px;"></div>` : ''}
      ${state.tab==='expense' ? `<div class="hint-box" style="margin-bottom:14px;">Chọn sẵn ${glossaryWrap('CP cố định', 'cp_co_dinh')} hoặc ${glossaryWrap('CP biến đổi', 'cp_bien_doi')} cho từng danh mục — Ghi Chép Hàng Ngày sẽ tự điền sẵn đúng loại này, không phải chọn lại mỗi lần.</div>` : ''}
      ${state.tab==='tich_luy' ? `<div class="hint-box" style="margin-bottom:14px;">Danh mục con để phân loại RÕ mỗi lần chuyển tiền vào Tích Lũy là đi vào đâu (VD: Tiết kiệm ngân hàng, Vàng, Cổ phiếu, Quỹ đầu tư...) — chọn được ngay ở Ghi Chép Hàng Ngày khi ghi 1 khoản Tích Lũy.</div>` : ''}

      ${state.loading ? `<div class="loading"><div class="spinner"></div></div>` : `
        <div class="section">
          ${list.length===0 ? `<div style="color:var(--ink-soft);font-size:14px;">Chưa có danh mục nào.</div>` : list.map(categoryRowHtml).join('')}

          <div style="display:flex;gap:8px;align-items:flex-start;margin-top:14px;flex-wrap:wrap;">
            <input type="text" id="dm-new-label" value="${esc(state.newLabel)}" placeholder="+ Thêm danh mục mới..." style="flex:1;min-width:160px;padding:10px 12px;border:1px solid var(--line);border-radius:8px;font-size:13.5px;background:#FDFCF8;color:var(--ink);">
            ${state.tab==='expense' ? `
              <select id="dm-new-classification" style="padding:10px 12px;border:1px solid var(--line);border-radius:8px;font-size:13.5px;background:#FDFCF8;color:var(--ink);">
                ${CLASSIFICATION_OPTIONS.map(o=>`<option value="${o.key}" ${state.newClassification===o.key?'selected':''}>${o.label}</option>`).join('')}
              </select>
            ` : ''}
            <button class="btn btn-sm" id="dm-add" ${state.saving?'disabled':''}>${state.saving?'Đang lưu…':'+ Thêm'}</button>
          </div>
          ${state.error ? `<div class="error-box" style="margin-top:10px;">${esc(state.error)}</div>` : ''}
        </div>
      `}
    `;
  }

  function bind(){
    container.querySelectorAll('[data-tab]').forEach(el=>{
      el.onclick = ()=>{ state.tab = el.getAttribute('data-tab'); state.error = null; draw(); };
    });
    // "Tích Lũy" giờ là 1 tab TẠI ĐÂY, không phải mục riêng ở sidebar nữa (2026-08-26, góp ý Quỳnh:
    // "tích lũy ko phải là 1 mục riêng ở taskbar mà là mục riêng chỗ quản lý danh mục á"), VÀ có danh
    // mục con riêng như Chi Tiêu/Thu Nhập (2026-09-01, góp ý Quỳnh: "tích lũy phải có ở những phần mà
    // chi tiêu và thu nhập có chứ nhỉ") — module key/file vẫn tên "tich-luy" (gạch ngang), chỉ riêng
    // GIÁ TRỊ state.tab/tc_categories.type dùng "tich_luy" (gạch dưới, khớp check constraint DB).
    const tichLuySub = container.querySelector('#dm-tich-luy-sub');
    if(tichLuySub && window.Modules && window.Modules['tich-luy']) window.Modules['tich-luy'].render(tichLuySub, ctx);
    container.querySelectorAll('[data-classification]').forEach(el=>{
      el.onchange = ()=>{ updateClassification(el.getAttribute('data-classification'), el.value || null); };
    });
    container.querySelectorAll('[data-delete-category]').forEach(el=>{
      el.onclick = ()=>{ deleteCategory(el.getAttribute('data-delete-category'), el.getAttribute('data-category-label')); };
    });
    const newLabelEl = container.querySelector('#dm-new-label');
    if(newLabelEl) newLabelEl.oninput = (e)=>{ state.newLabel = e.target.value; };
    const newClassEl = container.querySelector('#dm-new-classification');
    if(newClassEl) newClassEl.onchange = (e)=>{ state.newClassification = e.target.value; };
    const addBtn = container.querySelector('#dm-add');
    if(addBtn) addBtn.onclick = addCategory;
  }

  load();
}

window.Modules = window.Modules || {};
window.Modules['danh-muc'] = { title:'Danh Mục', render };
})();
