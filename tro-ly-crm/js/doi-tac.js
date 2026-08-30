// Màn hình Đối Tác — tách RIÊNG khỏi Khách Hàng (chị Quỳnh chốt 2026-08-30: "follow đối tác kinh
// doanh sẽ khác khách hàng", ban đầu làm 1 tab con trong Khách Hàng, sau đó chốt lại thành mục riêng
// trên sidebar). Quản lý đúng các khách đã la_doi_tac=true trong crm_customers — chuyển đổi
// (đánh dấu la_doi_tac) vẫn thực hiện từ nút "Chuyển thành đối tác" trong Khách Hàng.
(function(){
const TRANG_THAI_DOI_TAC_BASE = ['Đúng nhịp', 'Chậm nhịp', 'Rớt nhịp'];

const TOUR_STEPS = [
  { selector: '#dt-search', title: 'Tìm đối tác', text: 'Tìm theo tên hoặc tỉnh/thành.' },
  { selector: '.tab-row', title: 'Cần huấn luyện', text: 'Lọc sẵn ai đang chậm/rớt nhịp hoặc chưa cập nhật trạng thái — ưu tiên gọi/nhắn những người này trước.' },
];

// Lộ trình 8 tuần huấn luyện đối tác mới. Rút gọn từ đúng bộ giáo trình thật chị Quỳnh đang dùng cho
// team (link Sheet chị gửi 2026-08-30) — CHỈ giữ chủ đề + đầu việc trọng tâm mỗi tuần làm tài liệu
// tham khảo cho leader, KHÔNG làm checklist tick từng dòng: 1 leader bảo trợ hàng trăm đối tác không
// thể tự tay tick ~80 dòng/người/tuần — thứ leader cần là biết NHANH ai đang tuần mấy, ai chậm nhịp
// cần gọi ngay (xem mục "Cần huấn luyện" bên dưới + ở Trang chủ), chứ không phải chấm điểm chi tiết
// từng đầu việc. Nếu sau này cần chấm điểm chi tiết, làm module riêng.
const DOI_TAC_TUAN = [
  { tuan: 1, chu_de: 'Tư duy & Nền tảng hệ thống',
    hoc: 'Trả lời câu hỏi "tại sao" của bạn · Ước mơ — mục tiêu — sứ mệnh · Tư duy đúng · Xây dựng thương hiệu cá nhân trên Facebook',
    thuc_hanh: 'Vào các nhóm zalo/fb của team giới thiệu bản thân · Đăng mỗi ngày 1 bài về sức khỏe (ăn/tập/dùng sản phẩm) · Đọc sách "Dám Nghĩ Lớn" 30 phút/ngày · Tham gia zoom thực chiến cùng team',
    ket_qua: 'Profile Facebook chuyên nghiệp hoàn chỉnh (ảnh đại diện, ảnh bìa, giới thiệu) · Mục tiêu 60 ngày rõ ràng, có con số, có deadline · Bài thông báo đầu tiên có 10+ lượt tương tác' },
  { tuan: 2, chu_de: 'Sức khỏe & Năng lượng',
    hoc: '11 câu hỏi nóng · Làm quen với "cỗ máy in tiền" (cách vận hành thu nhập) · Kiến thức sản phẩm — thải độc',
    thuc_hanh: 'Đăng mỗi ngày 2 bài về sức khỏe · Tham gia zoom thực chiến · Đọc sách 30 phút/ngày · Cuối tuần cập nhật lại số đo/chỉ số sức khỏe',
    ket_qua: 'Báo cáo cập nhật số đo có so sánh với tuần trước · Bài tập "3 cấp độ cuộc sống" hoàn chỉnh · Bài đăng đầy đủ Ăn/Tập/Dùng sản phẩm' },
  { tuan: 3, chu_de: 'Sản phẩm & Xây dựng Nhân hiệu',
    hoc: '6 Whys · Kỹ năng #1 — Tìm đối tác · Kiến thức sản phẩm (vitamin, protein)',
    thuc_hanh: 'Đăng mỗi ngày 3 bài về sức khỏe · Chép kỹ năng #1 ra sổ để nhớ · Làm bài tập kỹ năng 1 (lập danh sách tên, sở thích/sở trường/sở đoản)',
    ket_qua: 'Sổ ghi chép Kỹ Năng #1 — Tìm Đối Tác (6 bước) · Danh Sách Sống 20+ khách hàng tiềm năng, đã liên hệ 5+ người mức độ quan tâm cao · Bài đăng câu chuyện bản thân có 15+ lượt tương tác' },
  { tuan: 4, chu_de: 'Kỹ năng Bán hàng & Thực chiến',
    hoc: 'Kim Tứ Đồ · Kỹ năng #3 — Trình bày · Kiến thức sản phẩm (miễn dịch, mỡ máu)',
    thuc_hanh: 'Viết 1 bài về câu chuyện bản thân (4 bước: Nền tảng — Vấn đề — Giải pháp — Kết quả — Lời mời) · Thực hành mời & trình bày 3-5 lần, ghi chép lại (Ai, khi nào, kết quả, bài học)',
    ket_qua: 'Sổ ghi chép Kỹ Năng #2 & #3 · Bài viết câu chuyện bản thân đủ 5 phần, có 20+ lượt tương tác · Ít nhất 1-2 lần mời thành công · Bài kiểm tra giữa kỳ đạt 80%+' },
  { tuan: 5, chu_de: 'Kỹ năng Tuyển dụng & Mở rộng hệ thống',
    hoc: 'Kỹ năng #4 — Theo sát, vượt phản kháng',
    thuc_hanh: 'Làm "3/2" với leader (leader tư vấn mẫu 3 lần, tự làm lại 2 lần cho leader xem) · Dùng AI để luyện vượt phản kháng mẫu 3 lần',
    ket_qua: 'Sổ ghi chép Kỹ Năng #4 — Theo sát & vượt phản kháng · Viết được 2 bản "đề cao bảo trợ" (1 cho khách hàng, 1 cho đối tác)' },
  { tuan: 6, chu_de: 'Tối ưu & Tăng tốc (Phần 1)',
    hoc: '7 Bars — 7 nấc thang thành công · Động lực từ bên trong, bài tập khát vọng cháy bỏng · Vì sao phải "Be10"',
    thuc_hanh: 'Viết ước mơ theo Bánh Xe Cuộc Đời',
    ket_qua: 'Sổ ghi chép Kỹ Năng #5 — Chốt (4 câu hỏi chốt: Tiền/Giờ/Tháng/Nếu tôi + bậc thang quan tâm 1-10) · Bản viết Ước mơ & Khát vọng cháy bỏng đủ 5 phần' },
  { tuan: 7, chu_de: 'Tối ưu & Tăng tốc (Phần 2)',
    hoc: 'Cân X cân Y · Ước mơ — mục tiêu · 3 cấp độ Mindset',
    thuc_hanh: 'Làm ảnh Bảng Ước Mơ, dán lên tường/để màn hình điện thoại',
    ket_qua: 'Sổ ghi chép Kỹ Năng #6 — Giúp Đối Tác Bắt Đầu (phỏng vấn kế hoạch, Fast Start, giao việc cụ thể) · Bộ sưu tập 5+ video sức khỏe cá nhân · Bảng ước mơ bằng hình ảnh đủ 6 phần' },
  { tuan: 8, chu_de: 'Tối ưu & Tăng tốc (Phần 3)',
    hoc: 'Học — Làm — Đo lường — Hiệu chỉnh — Đổi mới · Thu nhập các cấp độ và cách chuyển giao',
    thuc_hanh: 'Quay 1 video sức khỏe mỗi ngày',
    ket_qua: 'Sổ ghi chép Kỹ Năng #7 hoàn thành (10+ lần thực hành gặp gỡ/mời/lăng xê sự kiện) · Bộ sưu tập 10+ video sức khỏe · Bài kiểm tra cuối kỳ 80%+ · Tự tin dạy lại được 7 kỹ năng cho người mới' },
];
function tuanDoiTacInfo(soTuan){
  return DOI_TAC_TUAN.find(t => t.tuan === Number(soTuan)) || DOI_TAC_TUAN[0];
}

function render(container, ctx){
  const state = {
    loading: true, partners: [], search: '', onlyCanhBao: false,
    detail: null, // { partner, editForm, interactions, loadingInteractions, saving, error }
  };

  let searchDebounceTimer = null;
  function draw(){ container.innerHTML = html(); bind(); }

  function todayIso(){
    const d = new Date();
    const tzOffset = d.getTimezoneOffset() * 60000;
    return new Date(d - tzOffset).toISOString().slice(0, 10);
  }

  async function boot(){
    await load();
    // Điều hướng sâu từ Trang chủ ("Đối tác cần huấn luyện") — luôn ưu tiên hơn state hiện tại.
    if(window.__crmOpenCustomerId){
      const id = window.__crmOpenCustomerId;
      delete window.__crmOpenCustomerId;
      openDetail(id);
    }
  }

  async function load(){
    state.loading = true; draw();
    const { data } = await ctx.supabase.from('crm_customers').select('*')
      .eq('user_id', ctx.user.id).eq('la_doi_tac', true)
      .order('doi_tac_tuan_hien_tai', { ascending: true, nullsFirst: false });
    state.partners = data || [];
    state.loading = false;
    draw();
  }

  function needsCoaching(p){
    const t = (p.doi_tac_trang_thai || '').toLowerCase();
    return !t || t.includes('chậm') || t.includes('rớt') || t.includes('trễ');
  }

  function filteredPartners(){
    const q = state.search.trim().toLowerCase();
    return state.partners.filter(p => {
      if(state.onlyCanhBao && !needsCoaching(p)) return false;
      if(q && !(p.ten_khach_hang || '').toLowerCase().includes(q) && !(p.tinh_thanh || '').toLowerCase().includes(q)) return false;
      return true;
    });
  }

  // ===== Panel chi tiết / sửa =====
  function toEditForm(p){
    return {
      ten_khach_hang: p.ten_khach_hang || '', leader_phu_trach: p.leader_phu_trach || '', kenh: p.kenh || '',
      link_lien_he: p.link_lien_he || '', tinh_thanh: p.tinh_thanh || '',
      ngay_thanh_doi_tac: p.ngay_thanh_doi_tac || '',
      doi_tac_tuan_hien_tai: p.doi_tac_tuan_hien_tai || 1, doi_tac_diem_tuan: p.doi_tac_diem_tuan != null ? String(p.doi_tac_diem_tuan) : '',
      doi_tac_trang_thai: p.doi_tac_trang_thai || 'Đúng nhịp', doi_tac_ly_do_lam: p.doi_tac_ly_do_lam || '',
      doi_tac_rao_can: p.doi_tac_rao_can || '', doi_tac_hanh_dong_ho_tro: p.doi_tac_hanh_dong_ho_tro || '', doi_tac_ghi_chu: p.doi_tac_ghi_chu || '',
    };
  }

  async function openDetail(id){
    const existing = state.partners.find(p => p.id === id) || { id };
    state.detail = { partner: existing, editForm: toEditForm(existing), interactions: [], loadingInteractions: true, saving: false, error: '' };
    draw();
    const [{ data: partner }, { data: interactions }] = await Promise.all([
      ctx.supabase.from('crm_customers').select('*').eq('id', id).maybeSingle(),
      ctx.supabase.from('crm_interactions').select('*').eq('customer_id', id).order('created_at', { ascending: false }),
    ]);
    if(!state.detail || state.detail.partner.id !== id) return; // đã đóng hoặc mở người khác trước khi load xong
    state.detail.partner = partner || existing;
    state.detail.editForm = toEditForm(partner || existing);
    state.detail.interactions = interactions || [];
    state.detail.loadingInteractions = false;
    draw();
  }

  function closeDetail(){ state.detail = null; draw(); }

  async function saveDetail(){
    const d = state.detail; if(!d) return;
    const f = d.editForm;
    if(!f.ten_khach_hang.trim()){ d.error = 'Tên không được để trống.'; draw(); return; }
    d.saving = true; d.error = ''; draw();
    const payload = {
      ten_khach_hang: f.ten_khach_hang.trim(), leader_phu_trach: f.leader_phu_trach.trim() || null, kenh: f.kenh.trim() || null,
      link_lien_he: f.link_lien_he.trim() || null, tinh_thanh: f.tinh_thanh.trim() || null,
      ngay_thanh_doi_tac: f.ngay_thanh_doi_tac || null,
      doi_tac_tuan_hien_tai: Number(f.doi_tac_tuan_hien_tai) || 1,
      doi_tac_diem_tuan: f.doi_tac_diem_tuan !== '' ? Number(f.doi_tac_diem_tuan) : null,
      doi_tac_trang_thai: f.doi_tac_trang_thai.trim() || null,
      doi_tac_ly_do_lam: f.doi_tac_ly_do_lam.trim() || null, doi_tac_rao_can: f.doi_tac_rao_can.trim() || null,
      doi_tac_hanh_dong_ho_tro: f.doi_tac_hanh_dong_ho_tro.trim() || null, doi_tac_ghi_chu: f.doi_tac_ghi_chu.trim() || null,
    };
    const { error } = await ctx.supabase.from('crm_customers').update(payload).eq('id', d.partner.id);
    d.saving = false;
    if(error){ d.error = error.message; draw(); return; }
    state.detail = null;
    await load();
  }

  // Chuyển ngược về Khách Hàng thường — phòng khi đánh dấu nhầm hoặc đối tác ngừng hoạt động kinh
  // doanh nhưng vẫn còn là khách hàng cần chăm sóc bình thường.
  async function convertBackToCustomer(){
    const d = state.detail; if(!d) return;
    if(!(await confirmModal(`Chuyển "${d.partner.ten_khach_hang}" về lại Khách Hàng thường? Dữ liệu huấn luyện đối tác vẫn được giữ, chỉ ẩn khỏi mục Đối Tác.`))) return;
    d.saving = true; draw();
    const { error } = await ctx.supabase.from('crm_customers').update({ la_doi_tac: false }).eq('id', d.partner.id);
    d.saving = false;
    if(error){ d.error = error.message; draw(); return; }
    state.detail = null;
    await load();
  }

  async function deletePartner(){
    const d = state.detail; if(!d) return;
    if(!(await confirmModal(`Xoá hẳn hồ sơ "${d.partner.ten_khach_hang}"? Toàn bộ lịch sử tương tác cũng sẽ bị xoá.`))) return;
    state.deleting = true; draw();
    await ctx.supabase.from('crm_customers').delete().eq('id', d.partner.id);
    state.deleting = false;
    state.detail = null;
    await load();
  }

  // ===== Render =====
  // linkable=true (2026-08-30, chị Quỳnh yêu cầu: "bấm vào là ra luôn đường dẫn, ko phải copy
  // paste") — hiện thêm 1 link "🔗 Mở" bấm mở thẳng, tự thêm "https://" nếu gõ thiếu.
  function normalizeUrl(u){
    const t = (u||'').trim();
    if(!t) return '';
    return /^https?:\/\//i.test(t) ? t : `https://${t}`;
  }
  function field(key, label, value, type, full, linkable){
    const inputHtml = type === 'textarea'
      ? `<textarea data-field="${key}" style="min-height:64px;margin-top:6px;">${esc(value)}</textarea>`
      : `<input type="${type}" data-field="${key}" value="${esc(value)}" style="margin-top:6px;">`;
    const url = linkable ? normalizeUrl(value) : '';
    return `<div style="${full ? 'grid-column:1/-1;' : ''}">
      <label style="display:block;font-size:12px;font-weight:600;color:var(--ink-soft);margin-top:12px;">${esc(label)}</label>
      ${inputHtml}
      ${url ? `<a href="${esc(url)}" target="_blank" rel="noopener noreferrer" style="display:inline-block;margin-top:6px;font-size:12px;color:var(--accent);font-weight:600;text-decoration:none;">🔗 Mở link</a>` : ''}
    </div>`;
  }

  function badgePill(text, bg, color){
    return `<span style="font-family:'IBM Plex Mono',monospace;font-size:11px;padding:4px 10px;border-radius:999px;white-space:nowrap;background:${bg};color:${color};">${esc(text)}</span>`;
  }

  function trangThaiBadge(v){
    const t = (v || '').toLowerCase();
    if(t.includes('chậm') || t.includes('rớt') || t.includes('trễ')) return badgePill(v, '#FBEAE5', 'var(--danger)');
    if(t.includes('đúng')) return badgePill(v, 'var(--accent-soft)', 'var(--accent)');
    return v ? badgePill(v, 'var(--line)', 'var(--ink-soft)') : badgePill('Chưa cập nhật', 'var(--line)', 'var(--ink-soft)');
  }

  function truncate(s, n){
    s = String(s||'').trim();
    return s.length > n ? s.slice(0, n).trim() + '…' : s;
  }

  function partnerCardHtml(p){
    const tuan = tuanDoiTacInfo(p.doi_tac_tuan_hien_tai);
    return `
      <div class="list-item" data-open="${p.id}" style="cursor:pointer;flex-direction:column;align-items:stretch;gap:0;${needsCoaching(p)?'border-color:var(--danger);':''}">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;">
          <div style="font-size:15.5px;font-weight:700;">${esc(p.ten_khach_hang)}</div>
          ${trangThaiBadge(p.doi_tac_trang_thai)}
        </div>
        <div class="meta" style="margin-top:6px;margin-bottom:0;">${[p.kenh, p.leader_phu_trach, p.tinh_thanh].filter(Boolean).map(esc).join(' · ')}</div>
        <div style="font-size:13.5px;color:var(--ink);margin-top:8px;line-height:1.5;">Tuần ${p.doi_tac_tuan_hien_tai || 1}/8 — ${esc(tuan.chu_de)}</div>
        ${p.doi_tac_hanh_dong_ho_tro ? `<div style="font-size:12px;color:var(--ink-soft);margin-top:8px;">→ ${esc(truncate(p.doi_tac_hanh_dong_ho_tro,80))}</div>` : ''}
      </div>
    `;
  }

  function groupBlock(title, innerHtml, opts){
    opts = opts || {};
    return `<div class="section${opts.highlight ? ' highlight' : ''}" style="margin-top:14px;margin-bottom:0;padding:18px 20px;">
      <h3>${esc(title)}</h3>
      ${innerHtml}
      ${opts.footnote ? `<div style="font-size:12px;color:var(--ink-soft);margin-top:4px;">${opts.footnote}</div>` : ''}
    </div>`;
  }

  function detailHtml(){
    const d = state.detail;
    const p = d.partner || {};
    const f = d.editForm;
    const soTuan = Number(f.doi_tac_tuan_hien_tai) || 1;
    const tuan = tuanDoiTacInfo(soTuan);
    return `
      <div id="dt-detail-overlay" style="position:fixed;inset:0;z-index:9998;background:rgba(20,24,20,.6);display:flex;justify-content:center;padding:24px 16px;overflow-y:auto;">
        <div data-modal-box style="background:var(--panel);border-radius:14px;max-width:640px;width:100%;padding:26px 24px;box-shadow:0 12px 40px rgba(0,0,0,.4);height:fit-content;margin:0 auto;">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;margin-bottom:6px;">
            <h2 style="font-family:'Playfair Display',serif;font-size:20px;">${esc(p.ten_khach_hang || 'Đối tác')}</h2>
            <span id="dt-detail-close" style="cursor:pointer;font-size:20px;color:var(--ink-soft);line-height:1;">✕</span>
          </div>

          ${d.error ? `<div class="error-box">${esc(d.error)}</div>` : ''}

          ${groupBlock('Thông tin cơ bản', `
            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:0 14px;">
              ${field('ten_khach_hang', 'Tên', f.ten_khach_hang, 'text')}
              ${field('leader_phu_trach', 'Leader phụ trách', f.leader_phu_trach, 'text')}
              ${field('kenh', 'Kênh', f.kenh, 'text')}
              ${field('link_lien_he', 'Link liên hệ', f.link_lien_he, 'text', false, true)}
              ${field('tinh_thanh', 'Tỉnh/thành', f.tinh_thanh, 'text')}
              ${field('ngay_thanh_doi_tac', 'Ngày bắt đầu làm đối tác', f.ngay_thanh_doi_tac, 'date')}
            </div>
          `)}

          ${groupBlock(`Huấn luyện đối tác — Tuần ${soTuan}/8`, `
            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:0 14px;">
              <div>
                <label style="display:block;font-size:12px;font-weight:600;color:var(--ink-soft);margin-top:12px;">Tuần hiện tại (1-8)</label>
                <input type="number" min="1" max="8" data-field="doi_tac_tuan_hien_tai" value="${esc(String(soTuan))}" style="margin-top:6px;">
              </div>
              <div>
                <label style="display:block;font-size:12px;font-weight:600;color:var(--ink-soft);margin-top:12px;">Điểm tuần (0-100, không bắt buộc)</label>
                <input type="number" min="0" max="100" data-field="doi_tac_diem_tuan" value="${esc(f.doi_tac_diem_tuan)}" style="margin-top:6px;">
              </div>
              <div>
                <label style="display:block;font-size:12px;font-weight:600;color:var(--ink-soft);margin-top:12px;">Trạng thái nhịp</label>
                <input type="text" data-field="doi_tac_trang_thai" value="${esc(f.doi_tac_trang_thai)}" list="dt-trang-thai-options" style="margin-top:6px;">
                <datalist id="dt-trang-thai-options">${TRANG_THAI_DOI_TAC_BASE.map(v => `<option value="${esc(v)}">`).join('')}</datalist>
              </div>
            </div>
            <details style="margin-top:14px;">
              <summary style="cursor:pointer;font-weight:600;font-size:13.5px;color:var(--accent);">📖 Nội dung tuần ${soTuan}: ${esc(tuan.chu_de)}</summary>
              <div style="font-size:13px;color:var(--ink);line-height:1.7;margin-top:10px;">
                <div><b>Học:</b> ${esc(tuan.hoc)}</div>
                <div style="margin-top:8px;"><b>Thực hành:</b> ${esc(tuan.thuc_hanh)}</div>
                <div style="margin-top:8px;"><b>Kết quả kỳ vọng:</b> ${esc(tuan.ket_qua)}</div>
              </div>
            </details>
            <div style="display:grid;grid-template-columns:1fr;margin-top:4px;">
              ${field('doi_tac_ly_do_lam', 'Lý do họ làm (WHY) — nhắc lại khi họ nản', f.doi_tac_ly_do_lam, 'textarea', true)}
              ${field('doi_tac_rao_can', 'Đang vướng gì (rào cản hiện tại)', f.doi_tac_rao_can, 'textarea', true)}
              ${field('doi_tac_hanh_dong_ho_tro', 'Việc leader cần hỗ trợ tiếp theo', f.doi_tac_hanh_dong_ho_tro, 'textarea', true)}
              ${field('doi_tac_ghi_chu', 'Ghi chú', f.doi_tac_ghi_chu, 'textarea', true)}
            </div>
          `, { footnote: 'Theo dõi gọn theo tuần — không tick từng đầu việc nhỏ, để không tốn thời gian khi bảo trợ nhiều đối tác cùng lúc.' })}

          <div class="btn-row" style="justify-content:flex-start;margin-top:16px;flex-wrap:wrap;">
            <button class="btn btn-sm" id="dt-detail-save" ${d.saving ? 'disabled' : ''}>${d.saving ? 'Đang lưu…' : 'Lưu'}</button>
            <span class="btn-ghost btn btn-sm" id="dt-detail-to-customer">Chuyển về khách hàng thường</span>
            <span class="btn-ghost btn btn-sm" style="color:var(--danger);${state.deleting ? 'opacity:.6;pointer-events:none;' : ''}" id="dt-detail-delete">${state.deleting ? 'Đang xoá…' : 'Xoá hẳn'}</span>
          </div>

          <div style="margin:26px 0 10px;"><h2 style="font-size:14px;font-family:'IBM Plex Mono',monospace;text-transform:uppercase;letter-spacing:.06em;color:var(--gold);">Lịch sử tương tác</h2></div>
          ${d.loadingInteractions ? `<div class="loading"><div class="spinner"></div></div>` : (
            d.interactions.length === 0 ? `<div style="color:var(--ink-soft);font-size:13.5px;">Chưa có tương tác nào được ghi lại.</div>` :
            d.interactions.map(it => `
              <div class="list-item" style="cursor:default;">
                <div class="txt">
                  <div class="meta">${[it.thoi_gian, it.kenh, it.ten_tuong_tac].filter(Boolean).map(esc).join(' · ')}</div>
                  ${it.noi_dung ? `<div>${esc(it.noi_dung)}</div>` : ''}
                </div>
              </div>
            `).join('')
          )}
        </div>
      </div>
    `;
  }

  function html(){
    const list = filteredPartners();
    const canhBaoCount = state.partners.filter(needsCoaching).length;
    return `
      <span class="tour-trigger" id="dt-start-tour">❓ Hướng dẫn</span>
      <div class="page-head">
        <h1>Đối Tác</h1>
        <p>Đối tác kinh doanh đã chốt — theo dõi nhịp huấn luyện 8 tuần, tách riêng khỏi follow Khách Hàng. Chuyển 1 khách sang đây bằng nút "Chuyển thành đối tác" ở Khách Hàng.</p>
      </div>

      <input type="text" id="dt-search" placeholder="Tìm theo tên đối tác..." value="${esc(state.search)}">

      <div class="tab-row" style="margin-top:16px;">
        <div class="tab-btn ${!state.onlyCanhBao?'active':''}" data-tab="all">Tất cả${state.partners.length?` (${state.partners.length})`:''}</div>
        <div class="tab-btn ${state.onlyCanhBao?'active':''}" data-tab="canh-bao">Cần huấn luyện${canhBaoCount?` (${canhBaoCount})`:''}</div>
      </div>

      <div style="margin-top:22px;">
        ${state.loading ? `<div class="loading"><div class="spinner"></div></div>` : (
          list.length === 0
            ? `<div style="color:var(--ink-soft);font-size:14px;">${state.partners.length === 0 ? 'Chưa có đối tác nào — chuyển khách sang đối tác từ mục Khách Hàng.' : 'Không có đối tác nào ở mục này.'}</div>`
            : list.map(partnerCardHtml).join('')
        )}
      </div>

      ${state.detail ? detailHtml() : ''}
    `;
  }

  function bind(){
    const tourBtn = container.querySelector('#dt-start-tour');
    if(tourBtn) tourBtn.onclick = ()=>window.startPageTour(TOUR_STEPS);

    const searchEl = container.querySelector('#dt-search');
    if(searchEl) searchEl.oninput = (e) => {
      state.search = e.target.value;
      // Debounce redraw (2026-08-30, chị Quỳnh báo lỗi gõ tiếng Việt có dấu) — xem giải thích đầy
      // đủ ở khach-hang.js's #kh-search, cùng nguyên nhân.
      clearTimeout(searchDebounceTimer);
      searchDebounceTimer = setTimeout(() => {
        const pos = searchEl.selectionStart;
        draw();
        const newEl = container.querySelector('#dt-search');
        if(newEl){ newEl.focus(); newEl.setSelectionRange(pos, pos); }
      }, 300);
    };

    container.querySelectorAll('[data-tab]').forEach(el => {
      el.onclick = () => { state.onlyCanhBao = el.getAttribute('data-tab') === 'canh-bao'; draw(); };
    });

    container.querySelectorAll('[data-open]').forEach(el => {
      el.onclick = () => openDetail(el.getAttribute('data-open'));
    });

    const detailOverlay = container.querySelector('#dt-detail-overlay');
    if(detailOverlay){
      detailOverlay.onclick = closeDetail;
      const box = detailOverlay.querySelector('[data-modal-box]');
      if(box) box.onclick = (e) => e.stopPropagation();
      const closeBtn = container.querySelector('#dt-detail-close');
      if(closeBtn) closeBtn.onclick = closeDetail;
      container.querySelectorAll('#dt-detail-overlay [data-field]').forEach(el => {
        el.oninput = (e) => { state.detail.editForm[el.getAttribute('data-field')] = e.target.value; };
      });
      const saveBtn = container.querySelector('#dt-detail-save');
      if(saveBtn) saveBtn.onclick = saveDetail;
      const toCustomerBtn = container.querySelector('#dt-detail-to-customer');
      if(toCustomerBtn) toCustomerBtn.onclick = convertBackToCustomer;
      const delBtn = container.querySelector('#dt-detail-delete');
      if(delBtn) delBtn.onclick = deletePartner;
    }
  }

  draw();
  boot();
}

window.Modules = window.Modules || {};
window.Modules['doi-tac'] = { title: 'Đối Tác', render };
})();
