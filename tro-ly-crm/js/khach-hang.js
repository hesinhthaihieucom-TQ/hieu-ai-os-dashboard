// Màn hình CRM khách hàng — thay thế grid Lark Base cũ. Danh sách + lọc + panel chi tiết/sửa,
// đọc/ghi thẳng crm_customers/crm_interactions (RLS đã khoá theo user_id, không cần API riêng).
(function(){
const FILTER_DRAFT_KEY = 'khach-hang-filters'; // chỉ nhớ bộ lọc đang dùng, KHÔNG phải dữ liệu — bảng chính là nguồn sự thật
const DO_NONG_BASE = ['Nóng', 'Ấm', 'Lạnh'];
const GIAI_DOAN_BASE = ['Đang tư vấn', 'Chăm sóc', 'Follow', 'Chốt', 'Đã mua/onboarding', 'Mất'];

function render(container, ctx){
  const state = {
    loading: true, customers: [], search: '', filterDoNong: null, filterGiaiDoan: null,
    detail: null, // { customer, editForm, interactions, loadingInteractions, saving, error }
    showNewForm: false, newForm: null, creating: false, newError: '',
    deleting: false,
  };

  function draw(){ container.innerHTML = html(); bind(); }

  function todayIso(){
    const d = new Date();
    const tzOffset = d.getTimezoneOffset() * 60000;
    return new Date(d - tzOffset).toISOString().slice(0, 10);
  }

  async function boot(){
    const draft = await loadModuleDraft(ctx, FILTER_DRAFT_KEY);
    if(draft){
      state.search = draft.search || '';
      state.filterDoNong = draft.filterDoNong || null;
      state.filterGiaiDoan = draft.filterGiaiDoan || null;
    }
    await load();
    // Điều hướng sâu từ Trang chủ (bấm 1 khách "cần follow hôm nay") — luôn ưu tiên hơn bộ lọc/nhớ cũ.
    if(window.__crmOpenCustomerId){
      const id = window.__crmOpenCustomerId;
      delete window.__crmOpenCustomerId;
      openDetail(id);
    }
  }

  async function load(){
    state.loading = true; draw();
    const { data } = await ctx.supabase.from('crm_customers').select('*')
      .eq('user_id', ctx.user.id)
      .order('ngay_follow_tiep', { ascending: true, nullsFirst: false });
    state.customers = data || [];
    state.loading = false;
    draw();
  }

  function persistFilters(){
    saveModuleDraft(ctx, FILTER_DRAFT_KEY, {
      search: state.search, filterDoNong: state.filterDoNong, filterGiaiDoan: state.filterGiaiDoan,
    });
  }

  // Luôn hiện đủ 3 mức "chuẩn" + mọi giá trị khác đang thực sự có trong dữ liệu — vì do_nong/giai_doan
  // là text tự do (không enum ở DB), người dùng có thể đã gõ giá trị khác đi.
  function availableDoNong(){
    const present = state.customers.map(c => c.do_nong).filter(Boolean);
    return Array.from(new Set([...DO_NONG_BASE, ...present]));
  }
  function availableGiaiDoan(){
    const present = state.customers.map(c => c.giai_doan).filter(Boolean);
    return Array.from(new Set([...GIAI_DOAN_BASE, ...present]));
  }

  function filteredCustomers(){
    const q = state.search.trim().toLowerCase();
    return state.customers.filter(c => {
      if(state.filterDoNong && c.do_nong !== state.filterDoNong) return false;
      if(state.filterGiaiDoan && c.giai_doan !== state.filterGiaiDoan) return false;
      if(q && !(c.ten_khach_hang || '').toLowerCase().includes(q)) return false;
      return true;
    });
  }

  function isOverdue(c){ return !!c.ngay_follow_tiep && c.ngay_follow_tiep < todayIso(); }
  function isDueToday(c){ return c.ngay_follow_tiep === todayIso(); }

  // ===== Panel chi tiết / sửa =====
  function toEditForm(c){
    return {
      ten_khach_hang: c.ten_khach_hang || '', leader_phu_trach: c.leader_phu_trach || '', kenh: c.kenh || '',
      link_lien_he: c.link_lien_he || '', nhom_nhu_cau: (c.nhom_nhu_cau || []).join(', '), nhu_cau_cu_the: c.nhu_cau_cu_the || '',
      van_de_noi_dau: c.van_de_noi_dau || '', giai_doan: c.giai_doan || '', do_nong: c.do_nong || '',
      rao_can: (c.rao_can || []).join(', '), giai_phap_phu_hop: c.giai_phap_phu_hop || '',
      lan_tuong_tac_cuoi: c.lan_tuong_tac_cuoi || '', ngay_follow_tiep: c.ngay_follow_tiep || '',
      hanh_dong_tiep_theo: c.hanh_dong_tiep_theo || '', gia_tri_du_kien: c.gia_tri_du_kien || '',
      ket_qua: c.ket_qua || '', ghi_chu_ai: c.ghi_chu_ai || '',
    };
  }

  async function openDetail(id){
    const existing = state.customers.find(c => c.id === id) || { id };
    state.detail = { customer: existing, editForm: toEditForm(existing), interactions: [], loadingInteractions: true, saving: false, error: '' };
    draw();
    const [{ data: customer }, { data: interactions }] = await Promise.all([
      ctx.supabase.from('crm_customers').select('*').eq('id', id).maybeSingle(),
      ctx.supabase.from('crm_interactions').select('*').eq('customer_id', id).order('created_at', { ascending: false }),
    ]);
    if(!state.detail || state.detail.customer.id !== id) return; // đã đóng hoặc mở khách khác trước khi load xong
    state.detail.customer = customer || existing;
    state.detail.editForm = toEditForm(customer || existing);
    state.detail.interactions = interactions || [];
    state.detail.loadingInteractions = false;
    draw();
  }

  function closeDetail(){ state.detail = null; draw(); }

  async function saveDetail(){
    const d = state.detail; if(!d) return;
    const f = d.editForm;
    if(!f.ten_khach_hang.trim()){ d.error = 'Tên khách hàng không được để trống.'; draw(); return; }
    d.saving = true; d.error = ''; draw();
    const payload = {
      ten_khach_hang: f.ten_khach_hang.trim(), leader_phu_trach: f.leader_phu_trach.trim() || null, kenh: f.kenh.trim() || null,
      link_lien_he: f.link_lien_he.trim() || null,
      nhom_nhu_cau: f.nhom_nhu_cau.split(',').map(s => s.trim()).filter(Boolean),
      nhu_cau_cu_the: f.nhu_cau_cu_the.trim() || null, van_de_noi_dau: f.van_de_noi_dau.trim() || null,
      giai_doan: f.giai_doan.trim() || null, do_nong: f.do_nong.trim() || null,
      rao_can: f.rao_can.split(',').map(s => s.trim()).filter(Boolean),
      giai_phap_phu_hop: f.giai_phap_phu_hop.trim() || null,
      lan_tuong_tac_cuoi: f.lan_tuong_tac_cuoi || null, ngay_follow_tiep: f.ngay_follow_tiep || null,
      hanh_dong_tiep_theo: f.hanh_dong_tiep_theo.trim() || null, gia_tri_du_kien: f.gia_tri_du_kien.trim() || null,
      ket_qua: f.ket_qua.trim() || null, ghi_chu_ai: f.ghi_chu_ai.trim() || null,
    };
    const { error } = await ctx.supabase.from('crm_customers').update(payload).eq('id', d.customer.id);
    d.saving = false;
    if(error){ d.error = error.message; draw(); return; }
    state.detail = null;
    await load();
  }

  async function deleteCustomer(){
    const d = state.detail; if(!d) return;
    if(!(await confirmModal(`Xoá hồ sơ "${d.customer.ten_khach_hang}"? Toàn bộ lịch sử tương tác của khách này cũng sẽ bị xoá.`))) return;
    state.deleting = true; draw();
    await ctx.supabase.from('crm_customers').delete().eq('id', d.customer.id);
    state.deleting = false;
    state.detail = null;
    await load();
  }

  // ===== Form thêm khách mới =====
  function openNewForm(){
    state.showNewForm = true; state.newError = '';
    state.newForm = { ten_khach_hang: '', leader_phu_trach: '', kenh: '', link_lien_he: '', do_nong: '', giai_doan: '', ngay_follow_tiep: '' };
    draw();
  }
  function closeNewForm(){ state.showNewForm = false; state.newForm = null; draw(); }

  async function createCustomer(){
    const f = state.newForm;
    if(!f.ten_khach_hang.trim()){ state.newError = 'Vui lòng nhập tên khách hàng.'; draw(); return; }
    state.creating = true; state.newError = ''; draw();
    const { data, error } = await ctx.supabase.from('crm_customers').insert({
      user_id: ctx.user.id, ten_khach_hang: f.ten_khach_hang.trim(),
      leader_phu_trach: f.leader_phu_trach.trim() || null, kenh: f.kenh.trim() || null,
      link_lien_he: f.link_lien_he.trim() || null, do_nong: f.do_nong.trim() || null,
      giai_doan: f.giai_doan.trim() || null, ngay_follow_tiep: f.ngay_follow_tiep || null,
    }).select().maybeSingle();
    state.creating = false;
    if(error){ state.newError = error.message; draw(); return; }
    state.showNewForm = false; state.newForm = null;
    await load();
    if(data) openDetail(data.id);
  }

  // ===== Render =====
  function field(key, label, value, type, full){
    const inputHtml = type === 'textarea'
      ? `<textarea data-field="${key}" style="min-height:64px;margin-top:6px;">${esc(value)}</textarea>`
      : `<input type="${type}" data-field="${key}" value="${esc(value)}" style="margin-top:6px;">`;
    return `<div style="${full ? 'grid-column:1/-1;' : ''}">
      <label style="display:block;font-size:12px;font-weight:600;color:var(--ink-soft);margin-top:12px;">${esc(label)}</label>
      ${inputHtml}
    </div>`;
  }

  function rowHtml(c){
    const overdue = isOverdue(c);
    const dueToday = isDueToday(c);
    const badge = overdue ? 'Quá hạn' : (dueToday ? 'Hôm nay' : '');
    return `
      <div class="list-item" data-open="${c.id}" style="cursor:pointer;${overdue ? 'border-color:var(--danger);' : (dueToday ? 'border-color:var(--gold);' : '')}">
        <div class="txt">
          <div class="meta">${[c.kenh, c.giai_doan || 'chưa rõ giai đoạn', c.do_nong].filter(Boolean).map(esc).join(' · ')}</div>
          <b>${esc(c.ten_khach_hang)}</b>
          ${c.hanh_dong_tiep_theo ? `<div style="font-size:13px;color:var(--ink-soft);margin-top:4px;">${esc(c.hanh_dong_tiep_theo)}</div>` : ''}
        </div>
        <div style="text-align:right;flex-shrink:0;">
          ${badge ? `<div style="display:inline-block;font-size:11px;font-weight:700;padding:3px 9px;border-radius:999px;background:${overdue ? 'var(--danger)' : 'var(--gold)'};color:#fff;margin-bottom:6px;">${badge}</div>` : ''}
          <div style="font-size:12px;color:var(--ink-soft);">${c.ngay_follow_tiep ? esc(c.ngay_follow_tiep) : 'chưa hẹn'}</div>
        </div>
      </div>
    `;
  }

  function detailHtml(){
    const d = state.detail;
    const c = d.customer || {};
    const f = d.editForm;
    const doNongOptions = availableDoNong();
    const giaiDoanOptions = availableGiaiDoan();
    return `
      <div id="kh-detail-overlay" style="position:fixed;inset:0;z-index:9998;background:rgba(20,24,20,.6);display:flex;justify-content:center;padding:24px 16px;overflow-y:auto;">
        <div data-modal-box style="background:var(--panel);border-radius:14px;max-width:640px;width:100%;padding:26px 24px;box-shadow:0 12px 40px rgba(0,0,0,.4);height:fit-content;margin:0 auto;">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;margin-bottom:6px;">
            <h2 style="font-family:'Playfair Display',serif;font-size:20px;">${esc(c.ten_khach_hang || 'Khách hàng')}</h2>
            <span id="kh-detail-close" style="cursor:pointer;font-size:20px;color:var(--ink-soft);line-height:1;">✕</span>
          </div>

          ${d.error ? `<div class="error-box">${esc(d.error)}</div>` : ''}

          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:0 14px;">
            ${field('ten_khach_hang', 'Tên khách hàng', f.ten_khach_hang, 'text')}
            ${field('leader_phu_trach', 'Leader phụ trách', f.leader_phu_trach, 'text')}
            ${field('kenh', 'Kênh', f.kenh, 'text')}
            ${field('link_lien_he', 'Link liên hệ', f.link_lien_he, 'text')}
            <div>
              <label style="display:block;font-size:12px;font-weight:600;color:var(--ink-soft);margin-top:12px;">Độ nóng</label>
              <input type="text" data-field="do_nong" value="${esc(f.do_nong)}" list="kh-do-nong-options" style="margin-top:6px;">
              <datalist id="kh-do-nong-options">${doNongOptions.map(v => `<option value="${esc(v)}">`).join('')}</datalist>
            </div>
            <div>
              <label style="display:block;font-size:12px;font-weight:600;color:var(--ink-soft);margin-top:12px;">Giai đoạn</label>
              <input type="text" data-field="giai_doan" value="${esc(f.giai_doan)}" list="kh-giai-doan-options" style="margin-top:6px;">
              <datalist id="kh-giai-doan-options">${giaiDoanOptions.map(v => `<option value="${esc(v)}">`).join('')}</datalist>
            </div>
            ${field('lan_tuong_tac_cuoi', 'Lần tương tác cuối', f.lan_tuong_tac_cuoi, 'date')}
            ${field('ngay_follow_tiep', 'Ngày follow tiếp', f.ngay_follow_tiep, 'date')}
            ${field('gia_tri_du_kien', 'Giá trị dự kiến', f.gia_tri_du_kien, 'text')}
          </div>

          <div style="display:grid;grid-template-columns:1fr;">
            ${field('nhom_nhu_cau', 'Nhóm nhu cầu (cách nhau bởi dấu phẩy)', f.nhom_nhu_cau, 'text', true)}
            ${field('nhu_cau_cu_the', 'Nhu cầu cụ thể', f.nhu_cau_cu_the, 'textarea', true)}
            ${field('van_de_noi_dau', 'Vấn đề / nỗi đau', f.van_de_noi_dau, 'textarea', true)}
            ${field('rao_can', 'Rào cản (cách nhau bởi dấu phẩy)', f.rao_can, 'text', true)}
            ${field('giai_phap_phu_hop', 'Giải pháp phù hợp', f.giai_phap_phu_hop, 'textarea', true)}
            ${field('hanh_dong_tiep_theo', 'Hành động tiếp theo', f.hanh_dong_tiep_theo, 'textarea', true)}
            ${field('ket_qua', 'Kết quả', f.ket_qua, 'textarea', true)}
            ${field('ghi_chu_ai', 'Ghi chú AI', f.ghi_chu_ai, 'textarea', true)}
          </div>

          <div class="btn-row" style="justify-content:flex-start;margin-top:16px;">
            <button class="btn btn-sm" id="kh-detail-save" ${d.saving ? 'disabled' : ''}>${d.saving ? 'Đang lưu…' : 'Lưu'}</button>
            <span class="btn-ghost btn btn-sm" style="color:var(--danger);${state.deleting ? 'opacity:.6;pointer-events:none;' : ''}" id="kh-detail-delete">${state.deleting ? 'Đang xoá…' : 'Xoá khách này'}</span>
          </div>

          <div style="margin:26px 0 10px;"><h2 style="font-size:14px;font-family:'IBM Plex Mono',monospace;text-transform:uppercase;letter-spacing:.06em;color:var(--gold);">Lịch sử tương tác</h2></div>
          ${d.loadingInteractions ? `<div class="loading"><div class="spinner"></div></div>` : (
            d.interactions.length === 0 ? `<div style="color:var(--ink-soft);font-size:13.5px;">Chưa có tương tác nào được ghi lại.</div>` :
            d.interactions.map(it => `
              <div class="list-item" style="cursor:default;">
                <div class="txt">
                  <div class="meta">${[it.thoi_gian, it.kenh, it.ten_tuong_tac].filter(Boolean).map(esc).join(' · ')}</div>
                  ${it.noi_dung ? `<div>${esc(it.noi_dung)}</div>` : ''}
                  ${it.ket_qua ? `<div style="font-size:13px;color:var(--ink-soft);margin-top:4px;">Kết quả: ${esc(it.ket_qua)}</div>` : ''}
                  ${it.buoc_tiep_theo ? `<div style="font-size:13px;color:var(--ink-soft);margin-top:2px;">Bước tiếp theo: ${esc(it.buoc_tiep_theo)}</div>` : ''}
                </div>
              </div>
            `).join('')
          )}
        </div>
      </div>
    `;
  }

  function newFormHtml(){
    const f = state.newForm;
    return `
      <div id="kh-new-overlay" style="position:fixed;inset:0;z-index:9998;background:rgba(20,24,20,.6);display:flex;justify-content:center;padding:24px 16px;overflow-y:auto;">
        <div data-modal-box style="background:var(--panel);border-radius:14px;max-width:440px;width:100%;padding:26px 24px;box-shadow:0 12px 40px rgba(0,0,0,.4);height:fit-content;margin:0 auto;">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;margin-bottom:6px;">
            <h2 style="font-family:'Playfair Display',serif;font-size:20px;">Thêm khách mới</h2>
            <span id="kh-new-close" style="cursor:pointer;font-size:20px;color:var(--ink-soft);line-height:1;">✕</span>
          </div>
          ${state.newError ? `<div class="error-box">${esc(state.newError)}</div>` : ''}
          <label style="display:block;font-size:12.5px;font-weight:600;color:var(--ink-soft);margin-top:12px;">Tên khách hàng *</label>
          <input type="text" data-new-field="ten_khach_hang" value="${esc(f.ten_khach_hang)}" placeholder="VD: Chị Lan">
          <label style="display:block;font-size:12.5px;font-weight:600;color:var(--ink-soft);margin-top:12px;">Leader phụ trách</label>
          <input type="text" data-new-field="leader_phu_trach" value="${esc(f.leader_phu_trach)}">
          <label style="display:block;font-size:12.5px;font-weight:600;color:var(--ink-soft);margin-top:12px;">Kênh</label>
          <input type="text" data-new-field="kenh" value="${esc(f.kenh)}" placeholder="VD: Facebook, Zalo...">
          <label style="display:block;font-size:12.5px;font-weight:600;color:var(--ink-soft);margin-top:12px;">Link liên hệ</label>
          <input type="text" data-new-field="link_lien_he" value="${esc(f.link_lien_he)}">
          <label style="display:block;font-size:12.5px;font-weight:600;color:var(--ink-soft);margin-top:12px;">Độ nóng</label>
          <input type="text" data-new-field="do_nong" value="${esc(f.do_nong)}" list="kh-do-nong-options-new">
          <datalist id="kh-do-nong-options-new">${availableDoNong().map(v => `<option value="${esc(v)}">`).join('')}</datalist>
          <label style="display:block;font-size:12.5px;font-weight:600;color:var(--ink-soft);margin-top:12px;">Giai đoạn</label>
          <input type="text" data-new-field="giai_doan" value="${esc(f.giai_doan)}" list="kh-giai-doan-options-new">
          <datalist id="kh-giai-doan-options-new">${availableGiaiDoan().map(v => `<option value="${esc(v)}">`).join('')}</datalist>
          <label style="display:block;font-size:12.5px;font-weight:600;color:var(--ink-soft);margin-top:12px;">Ngày follow tiếp</label>
          <input type="date" data-new-field="ngay_follow_tiep" value="${esc(f.ngay_follow_tiep)}">
          <div class="btn-row" style="justify-content:flex-start;margin-top:18px;">
            <button class="btn btn-sm" id="kh-new-create" ${state.creating ? 'disabled' : ''}>${state.creating ? 'Đang tạo…' : 'Tạo hồ sơ'}</button>
            <span class="btn-ghost btn btn-sm" id="kh-new-cancel">Huỷ</span>
          </div>
        </div>
      </div>
    `;
  }

  function html(){
    const list = filteredCustomers();
    const doNongOptions = availableDoNong();
    const giaiDoanOptions = availableGiaiDoan();
    return `
      <div class="page-head">
        <h1>Khách Hàng</h1>
        <p>Toàn bộ hồ sơ khách đang chăm sóc — sắp xếp theo ngày cần follow gần nhất, thay cho bảng Lark cũ.</p>
      </div>

      <div class="btn-row" style="justify-content:flex-start;margin-top:0;margin-bottom:18px;">
        <button class="btn btn-sm" id="kh-new">+ Thêm khách</button>
      </div>

      <input type="text" id="kh-search" placeholder="Tìm theo tên khách..." value="${esc(state.search)}">

      <div class="chips">
        ${doNongOptions.map(v => `<div class="chip ${state.filterDoNong === v ? 'selected' : ''}" data-filter-do-nong="${esc(v)}">${esc(v)}</div>`).join('')}
      </div>
      <div class="chips">
        ${giaiDoanOptions.map(v => `<div class="chip ${state.filterGiaiDoan === v ? 'selected' : ''}" data-filter-giai-doan="${esc(v)}">${esc(v)}</div>`).join('')}
      </div>

      <div style="margin-top:22px;">
        ${state.loading ? `<div class="loading"><div class="spinner"></div></div>` : (
          list.length === 0
            ? `<div style="color:var(--ink-soft);font-size:14px;">${state.customers.length === 0 ? 'Chưa có khách hàng nào — bấm "+ Thêm khách" để tạo hồ sơ đầu tiên.' : 'Không tìm thấy khách phù hợp bộ lọc.'}</div>`
            : list.map(rowHtml).join('')
        )}
      </div>

      ${state.detail ? detailHtml() : ''}
      ${state.showNewForm ? newFormHtml() : ''}
    `;
  }

  function bind(){
    const newBtn = container.querySelector('#kh-new');
    if(newBtn) newBtn.onclick = openNewForm;

    const searchEl = container.querySelector('#kh-search');
    if(searchEl) searchEl.oninput = (e) => {
      state.search = e.target.value;
      const pos = searchEl.selectionStart;
      persistFilters();
      draw();
      const newEl = container.querySelector('#kh-search');
      if(newEl){ newEl.focus(); newEl.setSelectionRange(pos, pos); }
    };

    container.querySelectorAll('[data-filter-do-nong]').forEach(el => {
      el.onclick = () => {
        const v = el.getAttribute('data-filter-do-nong');
        state.filterDoNong = state.filterDoNong === v ? null : v;
        persistFilters();
        draw();
      };
    });
    container.querySelectorAll('[data-filter-giai-doan]').forEach(el => {
      el.onclick = () => {
        const v = el.getAttribute('data-filter-giai-doan');
        state.filterGiaiDoan = state.filterGiaiDoan === v ? null : v;
        persistFilters();
        draw();
      };
    });

    container.querySelectorAll('[data-open]').forEach(el => {
      el.onclick = () => openDetail(el.getAttribute('data-open'));
    });

    // Modal chi tiết
    const detailOverlay = container.querySelector('#kh-detail-overlay');
    if(detailOverlay){
      detailOverlay.onclick = closeDetail;
      const box = detailOverlay.querySelector('[data-modal-box]');
      if(box) box.onclick = (e) => e.stopPropagation();
      const closeBtn = container.querySelector('#kh-detail-close');
      if(closeBtn) closeBtn.onclick = closeDetail;
      container.querySelectorAll('#kh-detail-overlay [data-field]').forEach(el => {
        el.oninput = (e) => { state.detail.editForm[el.getAttribute('data-field')] = e.target.value; };
      });
      const saveBtn = container.querySelector('#kh-detail-save');
      if(saveBtn) saveBtn.onclick = saveDetail;
      const delBtn = container.querySelector('#kh-detail-delete');
      if(delBtn) delBtn.onclick = deleteCustomer;
    }

    // Modal thêm mới
    const newOverlay = container.querySelector('#kh-new-overlay');
    if(newOverlay){
      newOverlay.onclick = closeNewForm;
      const box = newOverlay.querySelector('[data-modal-box]');
      if(box) box.onclick = (e) => e.stopPropagation();
      const closeBtn = container.querySelector('#kh-new-close');
      if(closeBtn) closeBtn.onclick = closeNewForm;
      const cancelBtn = container.querySelector('#kh-new-cancel');
      if(cancelBtn) cancelBtn.onclick = closeNewForm;
      container.querySelectorAll('#kh-new-overlay [data-new-field]').forEach(el => {
        el.oninput = (e) => { state.newForm[el.getAttribute('data-new-field')] = e.target.value; };
      });
      const createBtn = container.querySelector('#kh-new-create');
      if(createBtn) createBtn.onclick = createCustomer;
    }
  }

  draw();
  boot();
}

window.Modules = window.Modules || {};
window.Modules['khach-hang'] = { title: 'Khách Hàng', render };
})();
