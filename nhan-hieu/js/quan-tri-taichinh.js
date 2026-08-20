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

function render(container, ctx){
  const state = { screen:'loading', totalLuot:0, revenueTotal:0, revenueThisMonth:0, monthlyRows:[], error:null };

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
      ctx.supabase.from('profiles').select('id, role, has_paid, trial_ai_uses, paid_ai_uses, paid_ai_month'),
      ctx.supabase.from('sepay_transactions').select('transfer_amount, created_at, status').eq('status', 'matched'),
      ctx.supabase.from('ai_usage_log').select('user_id, weight, created_at'),
    ]);

    const adminIds = new Set((profiles||[]).filter(p=>p.role==='admin').map(p=>p.id));

    // Tổng lượt hiện tại (snapshot, không phải theo tháng) — dùng thử tính trọn đời, trả phí tính
    // tháng này, khớp đúng cách hiển thị "Đã dùng: x/y" ở từng thẻ tài khoản.
    const month = new Date().toISOString().slice(0,7);
    state.totalLuot = (profiles||[])
      .filter(p => p.role !== 'admin')
      .reduce((sum,p) => {
        if(p.has_paid){
          return sum + (p.paid_ai_month === month ? (p.paid_ai_uses||0) : 0);
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
    tx.forEach(r=>{ bucket(new Date(r.created_at).toISOString().slice(0,7)).revenue += (r.transfer_amount||0); });
    usageRows.forEach(r=>{
      if(adminIds.has(r.user_id)) return;
      bucket(new Date(r.created_at).toISOString().slice(0,7)).luot += (r.weight||0);
    });

    state.monthlyRows = Object.values(byMonth)
      .sort((a,b)=> b.month.localeCompare(a.month))
      .map(row => ({ ...row, cost: row.luot * RATE_PER_LUOT, profit: row.revenue - row.luot * RATE_PER_LUOT }));
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
      ${state.error?`<div class="error-box">${esc(state.error)}</div>`:''}
      ${state.monthlyRows.length===0 ? `<div style="color:var(--ink-soft);font-size:14px;">Chưa có dữ liệu.</div>` : `
      <div class="card" style="overflow-x:auto;padding:0;">
        <table style="width:100%;border-collapse:collapse;font-size:13.5px;white-space:nowrap;">
          <thead>
            <tr style="text-align:left;border-bottom:1px solid var(--line);">
              <th style="padding:10px 14px;">Tháng</th>
              <th style="padding:10px 14px;">Doanh thu</th>
              <th style="padding:10px 14px;">Lượt dùng</th>
              <th style="padding:10px 14px;">Chi phí ước tính</th>
              <th style="padding:10px 14px;">Lợi nhuận ước tính</th>
            </tr>
          </thead>
          <tbody>
            ${state.monthlyRows.map(row => `
              <tr style="border-bottom:1px solid var(--line);">
                <td style="padding:10px 14px;font-weight:600;">${esc(row.month)}${row.month < LOG_START.slice(0,7) ? ` <span style="font-weight:400;color:var(--ink-soft);font-size:11px;">(chưa có log lượt)</span>` : (row.month === LOG_START.slice(0,7) ? ` <span style="font-weight:400;color:var(--danger);font-size:11px;">(chỉ tính từ ${esc(LOG_START)} trở đi — thiếu số liệu đầu tháng)</span>` : '')}</td>
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
    `;
  }

  boot();
}
window.Modules = window.Modules || {};
window.Modules['quan-tri-taichinh'] = { title:'Tài chính', render };
})();
