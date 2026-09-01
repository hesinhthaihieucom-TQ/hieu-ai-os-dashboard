(function(){
// Tách riêng khỏi "Thành viên" (quan-tri.js) — đây là dashboard tài chính tổng quan (doanh thu/chi
// phí/lợi nhuận ước tính + xu hướng theo tháng), khác mục đích với danh sách quản lý từng tài khoản.
//
// Ước tính chi phí AI dùng giá trung bình/lượt (không tính đúng 100% vì mỗi hành động tốn số lượt
// # khác nhau) — RATE này chỉ để theo dõi xu hướng nhanh, muốn chính xác tuyệt đối thì đối chiếu
// với hoá đơn thật trên Anthropic Console.
const RATE_PER_LUOT = 1000;
// Ngày bắt đầu ghi ai_usage_log (bảng mới thêm) — các tháng TRƯỚC ngày này không có dữ liệu lượt
// chi tiết theo tháng, nên "Chi phí" của các tháng đó sẽ hiện 0 dù thực tế có phát sinh — không phải
// lỗi, chỉ là chưa có log lịch sử. Bảng theo tháng ghi rõ chú thích này.
const LOG_START = '2026-08-20';

// Cộng n tháng vào 1 mã tháng "YYYY-MM" — dùng để rải đều doanh thu gói dài hạn qua các tháng
// gói đó thực sự bao phủ, thay vì dồn hết vào đúng tháng khách trả tiền (xem amortizeRevenue()).
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
    const [{ data: profiles }, { data: txRows }, usageResult] = await Promise.all([
      ctx.supabase.from('profiles').select('id, role, has_paid, trial_ai_uses, paid_ai_uses, paid_ai_month, created_at, full_name, email'),
      ctx.supabase.from('sepay_transactions').select('transfer_amount, created_at, status, days_granted').eq('status', 'matched'),
      ctx.supabase.from('ai_usage_log').select('user_id, weight, created_at'),
    ]);

    const adminIds = new Set((profiles||[]).filter(p=>p.role==='admin').map(p=>p.id));

    // Tổng lượt hiện tại (snapshot, không phải theo tháng) — dùng thử tính trọn đời, trả phí tính
    // đúng CHU KỲ HIỆN TẠI của từng người (chị Quỳnh 2026-09-01: "tính theo tháng kể từ ngày người
    // dùng đăng ký chứ không phải theo tháng trên lịch" — xem currentCycleKey ở util.js), khớp đúng
    // cách hiển thị "Đã dùng: x/y" ở từng thẻ tài khoản.
    state.totalLuot = (profiles||[])
      .filter(p => p.role !== 'admin')
      .reduce((sum,p) => {
        if(p.has_paid){
          return sum + (p.paid_ai_month === currentCycleKey(p.created_at) ? (p.paid_ai_uses||0) : 0);
        }
        return sum + (p.trial_ai_uses||0);
      }, 0);

    const tx = txRows || [];
    state.revenueTotal = tx.reduce((sum,r)=> sum + (r.transfer_amount||0), 0);
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime();
    state.revenueThisMonth = tx.filter(r=> new Date(r.created_at).getTime() >= startOfMonth).reduce((sum,r)=> sum + (r.transfer_amount||0), 0);

    // ai_usage_log có thể chưa tồn tại (chưa chạy schema_full.sql mới) — không để lỗi này chặn cả
    // trang, chỉ hiện chi phí/tháng bằng 0 và ghi chú.
    const usageRows = (usageResult && usageResult.data) || [];

    const byMonth = {};
    function bucket(m){ if(!byMonth[m]) byMonth[m] = { month:m, revenue:0, luot:0 }; return byMonth[m]; }
    // Rải đều doanh thu mỗi giao dịch qua số tháng gói đó bao phủ (vd gói 6 tháng → chia đều 6
    // tháng liên tiếp bắt đầu từ tháng khách trả tiền) — trước đây dồn hết vào đúng 1 tháng, khiến
    // tháng khách mua gói dài hạn bị đội lợi nhuận ảo lên rất cao, còn các tháng sau đó (vẫn tốn
    // chi phí lượt của khách đó) lại bị kéo lợi nhuận âm ảo dù khách vẫn đang sinh lời đều. Giao
    // dịch không rõ gói (days_granted rỗng, vd nạp thêm lượt lẻ) vẫn tính vào đúng 1 tháng như cũ.
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
    // ai_usage_log của THÁNG HIỆN TẠI luôn thiếu (mới bắt đầu ghi giữa tháng LOG_START) — thay vì
    // hiện thiếu/0 kèm chú thích, dùng thẳng số ở thẻ tổng quan phía trên (state.totalLuot, đã khớp
    // đúng cách "Đã dùng: x/y" ở từng tài khoản) cho đúng tháng này — theo phản hồi chị Quỳnh: đã có
    // sẵn số đúng rồi thì dùng luôn, không cần bày thêm chú thích "thiếu dữ liệu".
    bucket(month).luot = state.totalLuot;

    state.monthlyRows = Object.values(byMonth)
      .sort((a,b)=> b.month.localeCompare(a.month))
      .map(row => ({ ...row, cost: row.luot * RATE_PER_LUOT, profit: row.revenue - row.luot * RATE_PER_LUOT }));

    // "cần có mục tính tổng lượt ng dùng đã dùng từ trước tới giờ để có cơ sở tính tiền" (chị Quỳnh
    // 2026-09-01) — TỔNG TRỌN ĐỜI mỗi người, khác hẳn bảng "Theo từng tháng" ở trên (theo calendar,
    // dùng để xem xu hướng). trial_ai_uses là bộ đếm KHÔNG BAO GIỜ reset (giữ nguyên cả sau khi
    // chuyển sang trả phí) nên cộng thẳng được; phần trả phí (paid_ai_uses) tự reset mỗi chu kỳ nên
    // KHÔNG dùng cột đó — phải cộng dồn từ ai_usage_log (chỉ có từ LOG_START trở đi, xem hằng số ở
    // trên — tổng trước ngày đó sẽ thiếu, không phải lỗi tính toán).
    const paidLogByUser = {};
    usageRows.forEach(r=>{
      if(adminIds.has(r.user_id)) return;
      paidLogByUser[r.user_id] = (paidLogByUser[r.user_id]||0) + (r.weight||0);
    });
    state.userTotals = (profiles||[])
      .filter(p => p.role !== 'admin')
      .map(p => {
        const paidLogUsed = paidLogByUser[p.id] || 0;
        const total = (p.trial_ai_uses||0) + paidLogUsed;
        return {
          id: p.id, name: p.full_name || p.email || p.id.slice(0,8),
          trialUsed: p.trial_ai_uses||0, paidLogUsed, total, estCost: total * RATE_PER_LUOT,
        };
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
        <div class="source-card"><div class="ic" style="font-size:16px;">${state.totalLuot.toLocaleString('vi-VN')}</div><div class="label">Tổng lượt đang dùng (trừ admin)</div></div>
        <div class="source-card"><div class="ic" style="font-size:16px;">~${estCost.toLocaleString('vi-VN')}đ</div><div class="label">Ước tính chi phí AI</div></div>
        <div class="source-card"><div class="ic" style="font-size:16px;color:${estProfit>=0?'var(--accent)':'var(--danger)'};">~${estProfit.toLocaleString('vi-VN')}đ</div><div class="label">Ước tính lợi nhuận</div></div>
      </div>
      <div style="font-size:11.5px;color:var(--ink-soft);margin-bottom:24px;">Ước tính dùng giá trung bình ~${RATE_PER_LUOT.toLocaleString('vi-VN')}đ/lượt (dùng thử: tính trọn đời, trả phí: tính tháng này) — so với <b>Tổng doanh thu</b> ở trên. Không chính xác 100% như xem trên Anthropic Console, chỉ để theo dõi xu hướng nhanh. Lợi nhuận có thể âm ở một tháng cụ thể nếu tháng đó nhiều người dùng lượt nhưng chưa có doanh thu mới tương ứng (vd khách dùng thử chưa trả phí) — không phải lỗi tính toán.</div>

      <div style="font-family:'IBM Plex Mono',monospace;font-size:12.5px;letter-spacing:.05em;text-transform:uppercase;color:var(--ink-soft);margin-bottom:10px;">Theo từng tháng</div>
      <div style="font-size:11.5px;color:var(--ink-soft);margin-bottom:10px;">Cột "Doanh thu" ở bảng này là doanh thu <b>phân bổ</b> theo số tháng gói bao phủ (khác với "Doanh thu tháng này" ở thẻ trên — đó là tiền thực nhận trong tháng) — để lợi nhuận từng tháng phản ánh đúng thực tế hơn khi có khách mua gói 6-12 tháng.</div>
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

      <div style="font-family:'IBM Plex Mono',monospace;font-size:12.5px;letter-spacing:.05em;text-transform:uppercase;color:var(--ink-soft);margin:28px 0 10px;">Tổng lượt đã dùng theo từng người (từ trước tới giờ)</div>
      <div style="font-size:11.5px;color:var(--ink-soft);margin-bottom:10px;">Tổng TRỌN ĐỜI, không reset theo tháng/chu kỳ — dùng làm cơ sở tính chi phí/tiền cho từng người. Lượt dùng thử tính đủ; lượt trả phí chỉ tính được từ ${esc(LOG_START)} trở đi (trước đó chưa có log chi tiết).</div>
      ${state.userTotals.length===0 ? `<div style="color:var(--ink-soft);font-size:14px;">Chưa có dữ liệu.</div>` : `
      <div class="card" style="overflow-x:auto;padding:0;">
        <table style="width:100%;border-collapse:collapse;font-size:13.5px;white-space:nowrap;">
          <thead>
            <tr style="text-align:left;border-bottom:1px solid var(--line);">
              <th style="padding:10px 14px;">Người dùng</th>
              <th style="padding:10px 14px;">Lượt dùng thử</th>
              <th style="padding:10px 14px;">Lượt trả phí (từ ${esc(LOG_START.slice(0,7))})</th>
              <th style="padding:10px 14px;">Tổng lượt</th>
              <th style="padding:10px 14px;">Ước tính chi phí</th>
            </tr>
          </thead>
          <tbody>
            ${state.userTotals.map(u => `
              <tr style="border-bottom:1px solid var(--line);">
                <td style="padding:10px 14px;font-weight:600;">${esc(u.name)}</td>
                <td style="padding:10px 14px;">${u.trialUsed.toLocaleString('vi-VN')}</td>
                <td style="padding:10px 14px;">${u.paidLogUsed.toLocaleString('vi-VN')}</td>
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
