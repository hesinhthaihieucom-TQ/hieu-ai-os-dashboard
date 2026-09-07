// Tài chính (2026-09-07, chị Quỳnh: "quản trị bên xây nhân hiệu có gì bên này có đó") — dashboard
// doanh thu/chi phí AI ước tính/lợi nhuận, mô phỏng ĐÚNG nhan-hieu/js/quan-tri-taichinh.js nhưng
// đơn giản hơn: CRM không có khái niệm "dùng thử" (chỉ trả phí mới dùng được, xem crm_has_paid) nên
// không cần tách trial/paid — chỉ có 1 bộ đếm crm_ai_uses/crm_ai_month/crm_ai_bonus mỗi người.
(function(){
// Ước tính chi phí AI dùng giá trung bình/lượt-trọng-số — CHI PHÍ THẬT đo được lúc chốt trọng số
// (2026-08-30, xem api/_lib/crm-ai-quota.js): crm-tuvan (weight 3) ~1.200-2.500đ/lượt gọi tức
// ~400-830đ/lượt-trọng-số; crm-cap-nhat-ho-so (weight 1) ~600-1.100đ/lượt gọi = 600-1.100đ/lượt-
// trọng-số. Lấy giá trị giữa khoảng làm ước tính nhanh, không chính xác tuyệt đối như hoá đơn thật
// trên Anthropic Console.
const RATE_PER_LUOT = 700;
// Ngày bắt đầu ghi ai_usage_log cho CRM (mới thêm logUsage() ở crm-ai-quota.js cùng ngày xây trang
// này) — các tháng TRƯỚC ngày này không có dữ liệu lượt chi tiết, không phải lỗi.
const LOG_START = '2026-09-07';

function monthKeyAdd(monthKey, n){
  const [y, m] = monthKey.split('-').map(Number);
  const d = new Date(y, m - 1 + n, 1);
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
}

function render(container, ctx){
  const state = { screen:'loading', totalLuot:0, revenueTotal:0, revenueThisMonth:0, monthlyRows:[], userTotals:[], error:null };

  function draw(){ container.innerHTML = html(); }

  async function boot(){
    draw();
    if(!ctx.profile || ctx.profile.role !== 'admin'){
      state.screen = 'denied'; draw(); return;
    }
    await load();
    state.screen = 'main';
    draw();
  }

  async function load(){
    const month = new Date().toISOString().slice(0,7);
    const [{ data: profiles }, { data: txRows }, usageResult] = await Promise.all([
      ctx.supabase.from('profiles').select('id, role, crm_ai_uses, crm_ai_month, full_name, email'),
      // sepay_transactions dùng chung mọi sản phẩm — lọc riêng CRM qua nội dung chuyển khoản luôn
      // có tiền tố "CRM" (xem extractCrmRefCode ở api/sepay-webhook.js), khớp cách quan-tri.js đã làm.
      ctx.supabase.from('sepay_transactions').select('transfer_amount, created_at, status, days_granted, content').eq('status', 'matched').ilike('content', '%CRM%'),
      // action_key 'crm-tuvan'/'crm-cap-nhat-ho-so' không trùng action_key của Xây Nhân Hiệu/Sản
      // Phẩm Số — lọc trực tiếp bằng đúng 2 giá trị này, không cần cột "sản phẩm" riêng.
      ctx.supabase.from('ai_usage_log').select('user_id, weight, created_at').in('action_key', ['crm-tuvan', 'crm-cap-nhat-ho-so']),
    ]);

    const adminIds = new Set((profiles||[]).filter(p=>p.role==='admin').map(p=>p.id));

    // Tổng lượt THÁNG NÀY (snapshot) — khớp đúng cách "Đã dùng: x/y" hiện ở từng thẻ tài khoản
    // (quan-tri.js's crmMonthlyUsage()).
    state.totalLuot = (profiles||[])
      .filter(p => p.role !== 'admin')
      .reduce((sum,p) => sum + (p.crm_ai_month === month ? (p.crm_ai_uses||0) : 0), 0);

    const tx = txRows || [];
    state.revenueTotal = tx.reduce((sum,r)=> sum + (r.transfer_amount||0), 0);
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime();
    state.revenueThisMonth = tx.filter(r=> new Date(r.created_at).getTime() >= startOfMonth).reduce((sum,r)=> sum + (r.transfer_amount||0), 0);

    const usageRows = (usageResult && usageResult.data) || [];

    const byMonth = {};
    function bucket(m){ if(!byMonth[m]) byMonth[m] = { month:m, revenue:0, luot:0 }; return byMonth[m]; }
    // Rải đều doanh thu mỗi giao dịch qua số tháng gói bao phủ (vd gói 6 tháng → chia đều 6 tháng
    // liên tiếp từ tháng khách trả tiền) — khớp cách nhan-hieu tính, tránh dồn hết lợi nhuận ảo vào
    // đúng 1 tháng khách mua gói dài hạn. Giao dịch không rõ gói (nạp thêm lượt lẻ) tính vào 1 tháng.
    tx.forEach(r=>{
      const startMonth = new Date(r.created_at).toISOString().slice(0,7);
      const months = r.days_granted ? Math.max(1, Math.round(r.days_granted / 30)) : 1;
      const perMonth = Math.round((r.transfer_amount||0) / months);
      for(let i=0;i<months;i++){ bucket(monthKeyAdd(startMonth, i)).revenue += perMonth; }
    });
    usageRows.forEach(r=>{
      if(adminIds.has(r.user_id)) return;
      bucket(new Date(r.created_at).toISOString().slice(0,7)).luot += (r.weight||0);
    });
    // Tháng hiện tại luôn thiếu log (mới bắt đầu ghi giữa tháng LOG_START) — dùng thẳng
    // state.totalLuot (đã khớp đúng "Đã dùng: x/y") cho đúng tháng này thay vì hiện thiếu/0.
    bucket(month).luot = state.totalLuot;

    state.monthlyRows = Object.values(byMonth)
      .sort((a,b)=> b.month.localeCompare(a.month))
      .map(row => ({ ...row, cost: row.luot * RATE_PER_LUOT, profit: row.revenue - row.luot * RATE_PER_LUOT }));

    const usedByUser = {};
    usageRows.forEach(r=>{
      if(adminIds.has(r.user_id)) return;
      usedByUser[r.user_id] = (usedByUser[r.user_id]||0) + (r.weight||0);
    });
    state.userTotals = (profiles||[])
      .filter(p => p.role !== 'admin')
      .map(p => {
        const total = usedByUser[p.id] || 0;
        return { id: p.id, name: p.full_name || p.email || p.id.slice(0,8), total, estCost: total * RATE_PER_LUOT };
      })
      .filter(u => u.total > 0)
      .sort((a,b)=> b.total - a.total);
  }

  function html(){
    if(state.screen==='loading') return `<div class="loading"><div class="spinner"></div><p>Đang tải…</p></div>`;
    if(state.screen==='denied') return `<div class="page-head"><h1>Không có quyền truy cập</h1><p>Mục này chỉ dành cho quản trị viên.</p></div>`;

    const estCost = state.totalLuot * RATE_PER_LUOT;
    const estProfit = state.revenueTotal - estCost;

    return `
      <div class="page-head"><h1>Tài chính</h1><p>Doanh thu, chi phí AI ước tính, và lợi nhuận — tổng quan và theo từng tháng.</p></div>

      <div class="source-grid" style="margin-bottom:12px;">
        <div class="source-card"><div class="ic" style="font-size:18px;">${state.revenueTotal.toLocaleString('vi-VN')}đ</div><div class="label">Tổng doanh thu</div></div>
        <div class="source-card"><div class="ic" style="font-size:18px;">${state.revenueThisMonth.toLocaleString('vi-VN')}đ</div><div class="label">Doanh thu tháng này</div></div>
      </div>

      <div class="source-grid" style="margin-bottom:8px;">
        <div class="source-card"><div class="ic" style="font-size:16px;">${state.totalLuot.toLocaleString('vi-VN')}</div><div class="label">Tổng lượt đang dùng tháng này (trừ admin)</div></div>
        <div class="source-card"><div class="ic" style="font-size:16px;">~${estCost.toLocaleString('vi-VN')}đ</div><div class="label">Ước tính chi phí AI</div></div>
        <div class="source-card"><div class="ic" style="font-size:16px;color:${estProfit>=0?'var(--accent)':'var(--danger)'};">~${estProfit.toLocaleString('vi-VN')}đ</div><div class="label">Ước tính lợi nhuận</div></div>
      </div>
      <div style="font-size:11.5px;color:var(--ink-soft);margin-bottom:24px;">Ước tính dùng giá trung bình ~${RATE_PER_LUOT.toLocaleString('vi-VN')}đ/lượt-trọng-số so với <b>Tổng doanh thu</b> ở trên. Không chính xác 100% như xem trên Anthropic Console, chỉ để theo dõi xu hướng nhanh.</div>

      <div style="font-family:'IBM Plex Mono',monospace;font-size:12.5px;letter-spacing:.05em;text-transform:uppercase;color:var(--ink-soft);margin-bottom:10px;">Theo từng tháng</div>
      <div style="font-size:11.5px;color:var(--ink-soft);margin-bottom:10px;">Cột "Doanh thu" ở bảng này là doanh thu <b>phân bổ</b> theo số tháng gói bao phủ (khác "Doanh thu tháng này" ở thẻ trên — đó là tiền thực nhận trong tháng).</div>
      ${state.error?`<div class="error-box">${esc(state.error)}</div>`:''}
      ${state.monthlyRows.length===0 ? `<div style="color:var(--ink-soft);font-size:14px;">Chưa có dữ liệu.</div>` : `
      <div class="card" style="overflow-x:auto;padding:0;">
        <table style="width:100%;border-collapse:collapse;font-size:13.5px;white-space:nowrap;">
          <thead>
            <tr style="text-align:left;border-bottom:1px solid var(--line);">
              <th style="padding:10px 14px;">Tháng</th>
              <th style="padding:10px 14px;">Doanh thu (phân bổ)</th>
              <th style="padding:10px 14px;">Lượt dùng</th>
              <th style="padding:10px 14px;">Chi phí ước tính</th>
              <th style="padding:10px 14px;">Lợi nhuận ước tính</th>
            </tr>
          </thead>
          <tbody>
            ${state.monthlyRows.map(row => `
              <tr style="border-bottom:1px solid var(--line);">
                <td style="padding:10px 14px;font-weight:600;">${esc(row.month)}${row.month < LOG_START.slice(0,7) ? ` <span style="font-weight:400;color:var(--ink-soft);font-size:11px;">(chưa có log lượt)</span>` : ''}</td>
                <td style="padding:10px 14px;">${row.revenue.toLocaleString('vi-VN')}đ</td>
                <td style="padding:10px 14px;">${row.luot.toLocaleString('vi-VN')}</td>
                <td style="padding:10px 14px;">${row.cost.toLocaleString('vi-VN')}đ</td>
                <td style="padding:10px 14px;color:${row.profit>=0?'var(--accent)':'var(--danger)'};font-weight:600;">${row.profit.toLocaleString('vi-VN')}đ</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      `}

      <div style="font-family:'IBM Plex Mono',monospace;font-size:12.5px;letter-spacing:.05em;text-transform:uppercase;color:var(--ink-soft);margin:28px 0 10px;">Tổng lượt đã dùng theo từng người (từ ${esc(LOG_START)})</div>
      <div style="font-size:11.5px;color:var(--ink-soft);margin-bottom:10px;">Chỉ tính được từ ${esc(LOG_START)} trở đi (trước đó chưa ghi log chi tiết) — dùng làm cơ sở tham khảo chi phí/tiền cho từng người.</div>
      ${state.userTotals.length===0 ? `<div style="color:var(--ink-soft);font-size:14px;">Chưa có dữ liệu.</div>` : `
      <div class="card" style="overflow-x:auto;padding:0;">
        <table style="width:100%;border-collapse:collapse;font-size:13.5px;white-space:nowrap;">
          <thead>
            <tr style="text-align:left;border-bottom:1px solid var(--line);">
              <th style="padding:10px 14px;">Người dùng</th>
              <th style="padding:10px 14px;">Tổng lượt</th>
              <th style="padding:10px 14px;">Ước tính chi phí</th>
            </tr>
          </thead>
          <tbody>
            ${state.userTotals.map(u => `
              <tr style="border-bottom:1px solid var(--line);">
                <td style="padding:10px 14px;font-weight:600;">${esc(u.name)}</td>
                <td style="padding:10px 14px;font-weight:600;">${u.total.toLocaleString('vi-VN')}</td>
                <td style="padding:10px 14px;">${u.estCost.toLocaleString('vi-VN')}đ</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      `}
    `;
  }

  boot();
}
window.Modules = window.Modules || {};
window.Modules['quan-tri-taichinh'] = { title:'Tài chính', render };
})();
