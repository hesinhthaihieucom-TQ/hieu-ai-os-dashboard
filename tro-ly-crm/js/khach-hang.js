// Màn hình CRM khách hàng — thay thế grid Lark Base cũ. Danh sách + lọc + panel chi tiết/sửa,
// đọc/ghi thẳng crm_customers/crm_interactions (RLS đã khoá theo user_id, không cần API riêng).
(function(){
const FILTER_DRAFT_KEY = 'khach-hang-filters'; // chỉ nhớ bộ lọc đang dùng, KHÔNG phải dữ liệu — bảng chính là nguồn sự thật
const DO_NONG_BASE = ['Nóng', 'Ấm', 'Lạnh'];
const GIAI_DOAN_BASE = ['Đang tư vấn', 'Chăm sóc', 'Follow', 'Chốt', 'Đã mua/onboarding', 'Mất'];
const TRANG_THAI_DOI_TAC_BASE = ['Đúng nhịp', 'Chậm nhịp', 'Rớt nhịp'];

// Lộ trình 8 tuần huấn luyện đối tác mới (2026-08-30, chị Quỳnh chốt: follow đối tác kinh doanh
// phải khác follow khách hàng — đối tác cần huấn luyện/nhân bản, không phải chốt sale). Rút gọn từ
// đúng bộ giáo trình thật chị đang dùng cho team (link Sheet chị gửi) — CHỈ giữ chủ đề + đầu việc
// trọng tâm mỗi tuần làm tài liệu tham khảo cho leader, KHÔNG làm checklist tick từng dòng: 1 leader
// bảo trợ hàng trăm đối tác không thể tự tay tick ~80 dòng/người/tuần — thứ leader cần là biết NHANH
// ai đang tuần mấy, ai chậm nhịp cần gọi ngay (xem "Đối tác cần huấn luyện" ở Trang chủ), chứ không
// phải chấm điểm chi tiết từng đầu việc. Nếu sau này cần chấm điểm chi tiết, làm module riêng.
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
    loading: true, customers: [], search: '',
    // Bố cục lại theo góc nhìn CSKH (chị Quỳnh yêu cầu 2026-08-30: quá nhiều nút lọc riêng lẻ, khó
    // nhìn) — thay 2 hàng chip lọc theo đúng giá trị tự do (do_nong/giai_doan, dễ phình ra chục nút
    // vì AI ghi tự do nên nhiều cách viết khác nhau) bằng 4-5 TAB trạng thái cố định, việc CSKH thật
    // sự cần mỗi ngày: khách nào PHẢI follow ngay > khách nào đang chăm sóc > đã chốt > đã mất.
    activeTab: 'follow',
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
      state.activeTab = draft.activeTab || 'follow';
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
    saveModuleDraft(ctx, FILTER_DRAFT_KEY, { search: state.search, activeTab: state.activeTab });
  }

  // Luôn hiện đủ 3 mức "chuẩn" + mọi giá trị khác đang thực sự có trong dữ liệu — vì do_nong/giai_doan
  // là text tự do (không enum ở DB), người dùng có thể đã gõ giá trị khác đi. Vẫn dùng cho gợi ý
  // datalist khi sửa/thêm khách (field tự do vẫn cần gõ đúng chính tả cũ để không phình thêm biến thể).
  function availableDoNong(){
    const present = state.customers.map(c => c.do_nong).filter(Boolean);
    return Array.from(new Set([...DO_NONG_BASE, ...present]));
  }
  function availableGiaiDoan(){
    const present = state.customers.map(c => c.giai_doan).filter(Boolean);
    return Array.from(new Set([...GIAI_DOAN_BASE, ...present]));
  }

  // Gom giai_doan (text tự do, AI có thể viết lệch nhau vài chữ mỗi lần — "Đã mua/onboarding" vs
  // "Đã mua / đang onboarding") về đúng 3 nhóm CỐ ĐỊNH bằng cách dò từ khoá, thay vì lọc khớp chính
  // xác từng chuỗi — tránh phình thành chục nút lọc rời rạc theo đúng cách viết.
  function bucketOf(c){
    const g = (c.giai_doan || '').toLowerCase();
    if(g.includes('mất')) return 'mat';
    if(g.includes('chốt') || g.includes('đã mua') || g.includes('onboarding')) return 'chot';
    return 'cham-soc';
  }

  function isOverdue(c){ return !!c.ngay_follow_tiep && c.ngay_follow_tiep < todayIso(); }
  function isDueToday(c){ return c.ngay_follow_tiep === todayIso(); }
  // Đối tác (la_doi_tac=true) không tính vào nhịp "cần follow" kiểu chốt sale — họ có nhịp huấn
  // luyện riêng (xem tab "Đối tác" + DOI_TAC_TUAN), tránh trộn 2 loại việc rất khác nhau vào 1 tab.
  function needsFollow(c){ return !c.la_doi_tac && !!c.ngay_follow_tiep && c.ngay_follow_tiep <= todayIso() && bucketOf(c) !== 'mat'; }

  function tabCounts(){
    return {
      follow: state.customers.filter(needsFollow).length,
      'cham-soc': state.customers.filter(c => !c.la_doi_tac && bucketOf(c) === 'cham-soc').length,
      chot: state.customers.filter(c => !c.la_doi_tac && bucketOf(c) === 'chot').length,
      'doi-tac': state.customers.filter(c => c.la_doi_tac).length,
      mat: state.customers.filter(c => !c.la_doi_tac && bucketOf(c) === 'mat').length,
      all: state.customers.length,
    };
  }

  function filteredCustomers(){
    const q = state.search.trim().toLowerCase();
    return state.customers.filter(c => {
      if(state.activeTab === 'follow' && !needsFollow(c)) return false;
      else if(state.activeTab === 'doi-tac' && !c.la_doi_tac) return false;
      else if(['cham-soc','chot','mat'].includes(state.activeTab) && (c.la_doi_tac || bucketOf(c) !== state.activeTab)) return false;
      if(q && !(c.ten_khach_hang || '').toLowerCase().includes(q) && !(c.tinh_thanh || '').toLowerCase().includes(q)) return false;
      return true;
    });
  }

  // ===== Panel chi tiết / sửa =====
  function toEditForm(c){
    const fh = c.form_hd || {};
    return {
      ten_khach_hang: c.ten_khach_hang || '', leader_phu_trach: c.leader_phu_trach || '', kenh: c.kenh || '',
      link_lien_he: c.link_lien_he || '', tinh_thanh: c.tinh_thanh || '',
      nhanh: c.nhanh || '', nhom_nhu_cau: (c.nhom_nhu_cau || []).join(', '), nhu_cau_cu_the: c.nhu_cau_cu_the || '',
      van_de_noi_dau: c.van_de_noi_dau || '', giai_doan: c.giai_doan || '', do_nong: c.do_nong || '',
      rao_can: (c.rao_can || []).join(', '), giai_phap_phu_hop: c.giai_phap_phu_hop || '',
      lan_tuong_tac_cuoi: c.lan_tuong_tac_cuoi || '', ngay_follow_tiep: c.ngay_follow_tiep || '',
      hanh_dong_tiep_theo: c.hanh_dong_tiep_theo || '', gia_tri_du_kien: c.gia_tri_du_kien || '',
      ket_qua: c.ket_qua || '', ghi_chu_ai: c.ghi_chu_ai || '',
      // FORM-HD (chỉ có ý nghĩa khi nhanh='D') — tách phẳng 6 field để sửa tay dễ, gộp lại thành
      // object form_hd đúng lúc lưu (xem saveDetail()).
      form_hd_gia_dinh: fh.gia_dinh || '', form_hd_cong_viec: fh.cong_viec || '', form_hd_so_thich_quan_he: fh.so_thich_quan_he || '',
      form_hd_money: fh.money || '', form_hd_suc_khoe: fh.suc_khoe || '', form_hd_mong_muon: fh.mong_muon || '',
      // Theo dõi đối tác kinh doanh (khác follow khách hàng — xem DOI_TAC_TUAN ở trên).
      la_doi_tac: !!c.la_doi_tac, ngay_thanh_doi_tac: c.ngay_thanh_doi_tac || '',
      doi_tac_tuan_hien_tai: c.doi_tac_tuan_hien_tai || 1, doi_tac_diem_tuan: c.doi_tac_diem_tuan != null ? String(c.doi_tac_diem_tuan) : '',
      doi_tac_trang_thai: c.doi_tac_trang_thai || 'Đúng nhịp', doi_tac_ly_do_lam: c.doi_tac_ly_do_lam || '',
      doi_tac_rao_can: c.doi_tac_rao_can || '', doi_tac_hanh_dong_ho_tro: c.doi_tac_hanh_dong_ho_tro || '', doi_tac_ghi_chu: c.doi_tac_ghi_chu || '',
    };
  }

  function convertToPartner(){
    const d = state.detail; if(!d) return;
    const f = d.editForm;
    f.la_doi_tac = true;
    if(!f.ngay_thanh_doi_tac) f.ngay_thanh_doi_tac = todayIso();
    if(!f.doi_tac_tuan_hien_tai) f.doi_tac_tuan_hien_tai = 1;
    if(!f.doi_tac_trang_thai) f.doi_tac_trang_thai = 'Đúng nhịp';
    draw();
  }

  // Số lần TIẾP XÚC tính theo NGÀY KHÁC NHAU (không phải số dòng tương tác) — chị Quỳnh chốt
  // 2026-08-30: nguyên tắc bán hàng cần 4-6 lần chạm khác ngày mới đủ để 1 khách chốt, nên đếm
  // trùng ngày (vd nhắn 5 tin trong cùng 1 buổi) không có ý nghĩa, dễ gây ảo tưởng "đã follow đủ".
  const TOUCHPOINT_TARGET = 6;
  function distinctInteractionDays(interactions){
    const days = new Set();
    (interactions || []).forEach(it => {
      const raw = it.thoi_gian || it.created_at;
      if(raw) days.add(String(raw).slice(0, 10));
    });
    return days.size;
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
    const formHd = {
      gia_dinh: f.form_hd_gia_dinh.trim() || null, cong_viec: f.form_hd_cong_viec.trim() || null,
      so_thich_quan_he: f.form_hd_so_thich_quan_he.trim() || null, money: f.form_hd_money.trim() || null,
      suc_khoe: f.form_hd_suc_khoe.trim() || null, mong_muon: f.form_hd_mong_muon.trim() || null,
    };
    const payload = {
      ten_khach_hang: f.ten_khach_hang.trim(), leader_phu_trach: f.leader_phu_trach.trim() || null, kenh: f.kenh.trim() || null,
      link_lien_he: f.link_lien_he.trim() || null, tinh_thanh: f.tinh_thanh.trim() || null,
      nhom_nhu_cau: f.nhom_nhu_cau.split(',').map(s => s.trim()).filter(Boolean),
      nhu_cau_cu_the: f.nhu_cau_cu_the.trim() || null, van_de_noi_dau: f.van_de_noi_dau.trim() || null,
      giai_doan: f.giai_doan.trim() || null, do_nong: f.do_nong.trim() || null,
      rao_can: f.rao_can.split(',').map(s => s.trim()).filter(Boolean),
      giai_phap_phu_hop: f.giai_phap_phu_hop.trim() || null,
      lan_tuong_tac_cuoi: f.lan_tuong_tac_cuoi || null, ngay_follow_tiep: f.ngay_follow_tiep || null,
      hanh_dong_tiep_theo: f.hanh_dong_tiep_theo.trim() || null, gia_tri_du_kien: f.gia_tri_du_kien.trim() || null,
      ket_qua: f.ket_qua.trim() || null, ghi_chu_ai: f.ghi_chu_ai.trim() || null,
      // Giữ form_hd nếu ít nhất 1 mục có dữ liệu, kể cả khi đang không để nhanh='D' — tránh mất dữ
      // liệu FORM-HD đã khai thác nếu lỡ đổi nhánh tay.
      form_hd: Object.values(formHd).some(Boolean) ? formHd : null,
      la_doi_tac: !!f.la_doi_tac, ngay_thanh_doi_tac: f.ngay_thanh_doi_tac || null,
      doi_tac_tuan_hien_tai: f.la_doi_tac ? (Number(f.doi_tac_tuan_hien_tai) || 1) : null,
      doi_tac_diem_tuan: f.la_doi_tac && f.doi_tac_diem_tuan !== '' ? Number(f.doi_tac_diem_tuan) : null,
      doi_tac_trang_thai: f.la_doi_tac ? (f.doi_tac_trang_thai.trim() || null) : null,
      doi_tac_ly_do_lam: f.doi_tac_ly_do_lam.trim() || null, doi_tac_rao_can: f.doi_tac_rao_can.trim() || null,
      doi_tac_hanh_dong_ho_tro: f.doi_tac_hanh_dong_ho_tro.trim() || null, doi_tac_ghi_chu: f.doi_tac_ghi_chu.trim() || null,
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
    state.newForm = { ten_khach_hang: '', leader_phu_trach: '', kenh: '', link_lien_he: '', tinh_thanh: '', do_nong: '', giai_doan: '', ngay_follow_tiep: '' };
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
      link_lien_he: f.link_lien_he.trim() || null, tinh_thanh: f.tinh_thanh.trim() || null, do_nong: f.do_nong.trim() || null,
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

  // Danh sách dạng THẺ, không kẻ bảng (chị Quỳnh yêu cầu 2026-08-29: dễ nhìn hơn bảng Lark cũ cuộn
  // ngang nhiều cột) — mỗi thẻ chỉ tóm tắt đúng vài ý quan trọng nhất để lướt nhanh, bấm vào thẻ mở
  // ra đúng form chi tiết đầy đủ (detailHtml() bên dưới, đã có sẵn từ trước) để xem/sửa hết mọi field.
  function badgePill(text, bg, color){
    return `<span style="font-family:'IBM Plex Mono',monospace;font-size:11px;padding:4px 10px;border-radius:999px;white-space:nowrap;background:${bg};color:${color};">${esc(text)}</span>`;
  }
  function doNongBadge(v){
    if(!v) return '';
    const map = { 'Nóng':['#FBEAE5','var(--danger)'], 'Ấm':['#FBF6E9','var(--gold)'], 'Lạnh':['var(--accent-soft)','var(--accent)'] };
    const [bg,color] = map[v] || ['var(--line)','var(--ink-soft)'];
    return badgePill(v, bg, color);
  }
  function giaiDoanBadge(v){
    if(!v) return '';
    if(v==='Chốt' || v==='Đã mua/onboarding') return badgePill(v, 'var(--accent-soft)', 'var(--accent)');
    if(v==='Mất') return badgePill(v, '#EDEAE0', 'var(--ink-soft)');
    return badgePill(v, '#FBF6E9', '#8A5A00');
  }
  function truncate(s, n){
    s = String(s||'').trim();
    return s.length > n ? s.slice(0, n).trim() + '…' : s;
  }

  function trangThaiDoiTacBadge(v){
    const t = (v || '').toLowerCase();
    if(t.includes('chậm') || t.includes('rớt') || t.includes('trễ')) return badgePill(v, '#FBEAE5', 'var(--danger)');
    if(t.includes('đúng')) return badgePill(v, 'var(--accent-soft)', 'var(--accent)');
    return v ? badgePill(v, 'var(--line)', 'var(--ink-soft)') : '';
  }

  function customerCardHtml(c){
    if(c.la_doi_tac){
      const tuan = tuanDoiTacInfo(c.doi_tac_tuan_hien_tai);
      return `
        <div class="list-item" data-open="${c.id}" style="cursor:pointer;flex-direction:column;align-items:stretch;gap:0;">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;">
            <div style="font-size:15.5px;font-weight:700;">${esc(c.ten_khach_hang)}</div>
            <div style="display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end;flex-shrink:0;">
              ${badgePill('ĐỐI TÁC', '#EDE6F5', '#6B4FA0')}
              ${trangThaiDoiTacBadge(c.doi_tac_trang_thai)}
            </div>
          </div>
          <div class="meta" style="margin-top:6px;margin-bottom:0;">${[c.kenh, c.leader_phu_trach, c.tinh_thanh].filter(Boolean).map(esc).join(' · ')}</div>
          <div style="font-size:13.5px;color:var(--ink);margin-top:8px;line-height:1.5;">Tuần ${c.doi_tac_tuan_hien_tai || 1}/8 — ${esc(tuan.chu_de)}</div>
          ${c.doi_tac_hanh_dong_ho_tro ? `<div style="font-size:12px;color:var(--ink-soft);margin-top:8px;">→ ${esc(truncate(c.doi_tac_hanh_dong_ho_tro,80))}</div>` : ''}
        </div>
      `;
    }
    const overdue = isOverdue(c), dueToday = isDueToday(c);
    const painOrNeed = c.van_de_noi_dau || c.nhu_cau_cu_the || '';
    const followText = c.ngay_follow_tiep
      ? `${overdue ? '🔴 Quá hạn' : (dueToday ? '🟡 Follow hôm nay' : 'Follow tiếp')} — ${esc(c.ngay_follow_tiep)}`
      : '';
    return `
      <div class="list-item" data-open="${c.id}" style="cursor:pointer;flex-direction:column;align-items:stretch;gap:0;${overdue?'border-color:var(--danger);':(dueToday?'border-color:var(--gold);':'')}">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;">
          <div style="font-size:15.5px;font-weight:700;">${esc(c.ten_khach_hang)}</div>
          <div style="display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end;flex-shrink:0;">
            ${c.nhanh==='D' ? badgePill('FORM-HD', '#EDE6F5', '#6B4FA0') : ''}
            ${giaiDoanBadge(c.giai_doan)}
            ${doNongBadge(c.do_nong)}
          </div>
        </div>
        <div class="meta" style="margin-top:6px;margin-bottom:0;">${[c.kenh, c.leader_phu_trach, c.tinh_thanh].filter(Boolean).map(esc).join(' · ')}</div>
        ${painOrNeed ? `<div style="font-size:13.5px;color:var(--ink);margin-top:8px;line-height:1.5;">${esc(truncate(painOrNeed,140))}</div>` : ''}
        <div style="display:flex;justify-content:space-between;align-items:center;margin-top:10px;flex-wrap:wrap;gap:8px;">
          <div style="font-size:12px;font-family:'IBM Plex Mono',monospace;color:${overdue?'var(--danger)':(dueToday?'var(--gold)':'var(--ink-soft)')};">${followText}</div>
          ${c.hanh_dong_tiep_theo ? `<div style="font-size:12px;color:var(--ink-soft);text-align:right;">→ ${esc(truncate(c.hanh_dong_tiep_theo,60))}</div>` : ''}
        </div>
      </div>
    `;
  }

  function cardListHtml(list){
    return list.map(customerCardHtml).join('');
  }

  // Mỗi nhóm field đóng trong 1 khối ".section" riêng (viền + tiêu đề vàng, đã có sẵn trong
  // style.css) — chị Quỳnh phản hồi 2026-08-30: "các chữ đang cùng 1 màu bị chồng lên nhau khó
  // nhìn" — tách khối rõ ràng theo nhóm ý nghĩa (thay vì 1 lưới field liền mạch) là cách sửa
  // đúng gốc, không xoá field thật đang có dữ liệu.
  function groupBlock(title, innerHtml, opts){
    opts = opts || {};
    return `<div class="section${opts.highlight ? ' highlight' : ''}" style="margin-top:14px;margin-bottom:0;padding:18px 20px;">
      <h3>${esc(title)}</h3>
      ${innerHtml}
      ${opts.footnote ? `<div style="font-size:12px;color:var(--ink-soft);margin-top:4px;">${opts.footnote}</div>` : ''}
    </div>`;
  }

  function doiTacTrainingBlockHtml(f){
    const soTuan = Number(f.doi_tac_tuan_hien_tai) || 1;
    const tuan = tuanDoiTacInfo(soTuan);
    return groupBlock(`Huấn luyện đối tác — Tuần ${soTuan}/8`, `
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
          <input type="text" data-field="doi_tac_trang_thai" value="${esc(f.doi_tac_trang_thai)}" list="kh-trang-thai-doi-tac-options" style="margin-top:6px;">
          <datalist id="kh-trang-thai-doi-tac-options">${TRANG_THAI_DOI_TAC_BASE.map(v => `<option value="${esc(v)}">`).join('')}</datalist>
        </div>
        ${field('ngay_thanh_doi_tac', 'Ngày bắt đầu làm đối tác', f.ngay_thanh_doi_tac, 'date')}
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
    `, { footnote: 'Theo dõi gọn theo tuần — không tick từng đầu việc nhỏ, để không tốn thời gian khi bảo trợ nhiều đối tác cùng lúc.' });
  }

  function detailHtml(){
    const d = state.detail;
    const c = d.customer || {};
    const f = d.editForm;
    const doNongOptions = availableDoNong();
    const giaiDoanOptions = availableGiaiDoan();
    const touchDays = distinctInteractionDays(d.interactions);
    const touchOk = touchDays >= 4;
    return `
      <div id="kh-detail-overlay" style="position:fixed;inset:0;z-index:9998;background:rgba(20,24,20,.6);display:flex;justify-content:center;padding:24px 16px;overflow-y:auto;">
        <div data-modal-box style="background:var(--panel);border-radius:14px;max-width:640px;width:100%;padding:26px 24px;box-shadow:0 12px 40px rgba(0,0,0,.4);height:fit-content;margin:0 auto;">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;margin-bottom:6px;">
            <h2 style="font-family:'Playfair Display',serif;font-size:20px;">${esc(c.ten_khach_hang || 'Khách hàng')}</h2>
            <span id="kh-detail-close" style="cursor:pointer;font-size:20px;color:var(--ink-soft);line-height:1;">✕</span>
          </div>

          ${d.error ? `<div class="error-box">${esc(d.error)}</div>` : ''}

          <!-- Số lần tiếp xúc (theo NGÀY khác nhau, không phải số tin nhắn) — nguyên tắc CSKH: cần
               4-6 lần chạm khác ngày mới đủ để 1 khách chốt. Không áp dụng cho đối tác (nhịp huấn
               luyện khác nhịp chốt sale). -->
          ${!f.la_doi_tac ? `
            <div class="hint-box" style="margin-top:14px;display:flex;justify-content:space-between;align-items:center;gap:10px;${touchOk ? '' : 'background:#FBF6E9;color:#8A5A00;border-color:#E9DEB8;'}">
              <span>🎯 Số lần tiếp xúc (ngày khác nhau): <b>${touchDays}/${TOUCHPOINT_TARGET}</b></span>
              <span style="font-size:12px;">${touchOk ? 'Đủ ngưỡng thường chốt — ưu tiên chốt/đề nghị.' : 'Cần thêm follow — nguyên tắc: 4-6 lần chạm mới đủ để chốt.'}</span>
            </div>
          ` : `
            <div class="hint-box" style="margin-top:14px;">🚀 Đã chuyển thành <b>đối tác kinh doanh</b> — theo dõi bằng nhịp huấn luyện 8 tuần bên dưới, không theo nhịp follow chốt sale nữa.</div>
          `}

          ${groupBlock('Thông tin cơ bản', `
            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:0 14px;">
              ${field('ten_khach_hang', 'Tên khách hàng', f.ten_khach_hang, 'text')}
              ${field('leader_phu_trach', 'Leader phụ trách', f.leader_phu_trach, 'text')}
              ${field('kenh', 'Kênh', f.kenh, 'text')}
              ${field('link_lien_he', 'Link liên hệ', f.link_lien_he, 'text')}
              ${field('tinh_thanh', 'Tỉnh/thành', f.tinh_thanh, 'text')}
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
          `)}

          ${!f.la_doi_tac ? `
            ${groupBlock('Nhu cầu & rào cản', `
              <div style="display:grid;grid-template-columns:1fr;">
                ${field('nhom_nhu_cau', 'Nhóm nhu cầu (cách nhau bởi dấu phẩy)', f.nhom_nhu_cau, 'text', true)}
                ${field('nhu_cau_cu_the', 'Nhu cầu cụ thể', f.nhu_cau_cu_the, 'textarea', true)}
                ${field('van_de_noi_dau', 'Vấn đề / nỗi đau', f.van_de_noi_dau, 'textarea', true)}
                ${field('rao_can', 'Rào cản (cách nhau bởi dấu phẩy)', f.rao_can, 'text', true)}
              </div>
            `)}

            ${groupBlock('Giải pháp & tiến triển', `
              <div style="display:grid;grid-template-columns:1fr;">
                ${field('giai_phap_phu_hop', 'Giải pháp phù hợp', f.giai_phap_phu_hop, 'textarea', true)}
                ${field('hanh_dong_tiep_theo', 'Hành động tiếp theo', f.hanh_dong_tiep_theo, 'textarea', true)}
                ${field('ket_qua', 'Kết quả', f.ket_qua, 'textarea', true)}
                ${field('ghi_chu_ai', 'Ghi chú AI', f.ghi_chu_ai, 'textarea', true)}
              </div>
            `)}
          ` : doiTacTrainingBlockHtml(f)}

          ${f.nhanh === 'D' ? groupBlock('FORM-HD — khung khai thác nhánh Kinh doanh/Đối tác', `
            <div style="display:grid;grid-template-columns:1fr;gap:0;">
              ${field('form_hd_gia_dinh', 'F — Gia đình (hôn nhân, con cái, người phụ thuộc)', f.form_hd_gia_dinh, 'textarea', true)}
              ${field('form_hd_cong_viec', 'O — Công việc (đang làm gì, thu nhập, thời gian rảnh)', f.form_hd_cong_viec, 'textarea', true)}
              ${field('form_hd_so_thich_quan_he', 'R — Sở thích / Quan hệ (sở thích, mạng lưới xã hội)', f.form_hd_so_thich_quan_he, 'textarea', true)}
              ${field('form_hd_money', 'M — Money (khả năng tài chính, mức sẵn sàng đầu tư)', f.form_hd_money, 'textarea', true)}
              ${field('form_hd_suc_khoe', 'H — Sức khỏe (hiện trạng, ảnh hưởng tới khả năng làm việc)', f.form_hd_suc_khoe, 'textarea', true)}
              ${field('form_hd_mong_muon', 'D — Mong muốn (mục tiêu, ước mơ đang tìm kiếm)', f.form_hd_mong_muon, 'textarea', true)}
            </div>
          `, { highlight: true, footnote: 'Mục nào chưa khai thác được sẽ ghi "Chưa có" — AI tự điền dần qua các lần tư vấn, có thể sửa tay ở đây.' }) : ''}

          <div class="btn-row" style="justify-content:flex-start;margin-top:16px;">
            <button class="btn btn-sm" id="kh-detail-save" ${d.saving ? 'disabled' : ''}>${d.saving ? 'Đang lưu…' : 'Lưu'}</button>
            ${!f.la_doi_tac ? `<span class="btn-ghost btn btn-sm" id="kh-detail-to-partner">🚀 Chuyển thành đối tác</span>` : ''}
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
          <label style="display:block;font-size:12.5px;font-weight:600;color:var(--ink-soft);margin-top:12px;">Tỉnh/thành</label>
          <input type="text" data-new-field="tinh_thanh" value="${esc(f.tinh_thanh)}" placeholder="VD: Hà Nội, TP.HCM...">
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
    const counts = tabCounts();
    const TABS = [
      { key:'follow', label:'Cần follow' },
      { key:'cham-soc', label:'Đang chăm sóc' },
      { key:'chot', label:'Đã chốt' },
      { key:'doi-tac', label:'Đối tác' },
      { key:'mat', label:'Mất' },
      { key:'all', label:'Tất cả' },
    ];
    return `
      <div class="page-head">
        <h1>Khách Hàng</h1>
        <p>Toàn bộ hồ sơ khách đang chăm sóc — sắp xếp theo ngày cần follow gần nhất, thay cho bảng Lark cũ.</p>
      </div>

      <div class="btn-row" style="justify-content:flex-start;margin-top:0;margin-bottom:18px;">
        <button class="btn btn-sm" id="kh-new">+ Thêm khách</button>
      </div>

      <input type="text" id="kh-search" placeholder="Tìm theo tên khách..." value="${esc(state.search)}">

      <div class="tab-row" style="margin-top:16px;">
        ${TABS.map(t => `<div class="tab-btn ${state.activeTab===t.key?'active':''}" data-tab="${t.key}">${esc(t.label)}${counts[t.key]?` (${counts[t.key]})`:''}</div>`).join('')}
      </div>

      <div style="margin-top:22px;">
        ${state.loading ? `<div class="loading"><div class="spinner"></div></div>` : (
          list.length === 0
            ? `<div style="color:var(--ink-soft);font-size:14px;">${state.customers.length === 0 ? 'Chưa có khách hàng nào — bấm "+ Thêm khách" để tạo hồ sơ đầu tiên.' : 'Không có khách nào ở mục này.'}</div>`
            : cardListHtml(list)
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

    container.querySelectorAll('[data-tab]').forEach(el => {
      el.onclick = () => {
        state.activeTab = el.getAttribute('data-tab');
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
      const toPartnerBtn = container.querySelector('#kh-detail-to-partner');
      if(toPartnerBtn) toPartnerBtn.onclick = convertToPartner;
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
