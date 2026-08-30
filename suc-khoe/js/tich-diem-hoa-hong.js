// Tích Điểm & Hoa Hồng — 2 nguồn dữ liệu song song:
// 1) sk_points_ledger: admin nhập tay khi khách mua ngoài app (điện thoại, gặp trực tiếp...).
// 2) sk_orders (2026-08-30, mới): PV cộng dồn TỰ ĐỘNG từ đơn đặt hàng qua app, tính theo tháng đặt —
//    chỉ tính đơn admin đã xác nhận (status='da_xac_nhan'), vì đơn "chờ xác nhận" chưa chắc đã mua
//    thật. Mốc thưởng PV/tháng chị Quỳnh chốt 2026-08-30: 200pv → lì xì 200k, 500pv → quyền lợi VIP
//    kinh doanh (10% hoa hồng khi giới thiệu — xử lý riêng ngoài hệ CTV chung của hệ sinh thái, đúng
//    quy định hoa hồng Unicity không gộp chung, xem CLAUDE.md).
const SK_PV_TIERS = [
  { pv:500, label:'Quyền lợi VIP kinh doanh', desc:'Hưởng 10% hoa hồng khi giới thiệu người khác mua hàng.' },
  { pv:200, label:'Lì xì 200.000đ', desc:'Nhận 1 phong bao lì xì trị giá 200.000đ.' },
];

(function(){
function render(container, ctx){
  const state = { loading:true, rows:[], orders:[] };

  function draw(){ container.innerHTML = html(); }

  async function load(){
    const [{ data: rows }, { data: orders }] = await Promise.all([
      ctx.supabase.from('sk_points_ledger').select('*').eq('user_id', ctx.user.id).order('month', { ascending:false }),
      ctx.supabase.from('sk_orders').select('total_pv,total_amount,status,created_at').eq('user_id', ctx.user.id).eq('status', 'da_xac_nhan'),
    ]);
    state.rows = rows || [];
    state.orders = orders || [];
    state.loading = false;
    draw();
  }

  function pvByMonth(){
    const map = {};
    state.orders.forEach(o=>{
      const m = String(o.created_at||'').slice(0,7);
      if(!m) return;
      map[m] = (map[m]||0) + Number(o.total_pv||0);
    });
    return map;
  }

  function html(){
    if(state.loading) return `<div class="loading"><div class="spinner"></div></div>`;
    const thisMonth = new Date().toISOString().slice(0,7);
    const currentRows = state.rows.filter(r=>r.month===thisMonth);
    const totalPointsThisMonth = currentRows.reduce((s,r)=>s+Number(r.points||0),0);
    const totalCommissionThisMonth = currentRows.reduce((s,r)=>s+Number(r.commission||0),0);
    const totalCommissionAllTime = state.rows.reduce((s,r)=>s+Number(r.commission||0),0);

    const pvMap = pvByMonth();
    const pvThisMonth = pvMap[thisMonth] || 0;
    const reachedTier = SK_PV_TIERS.find(t=>pvThisMonth >= t.pv);
    const nextTier = [...SK_PV_TIERS].reverse().find(t=>pvThisMonth < t.pv);

    return `
      <div class="page-head">
        <h1>Tích Điểm & Hoa Hồng</h1>
        <p>Điểm và hoa hồng được ghi nhận theo từng tháng khi bạn mua hàng.</p>
      </div>

      <div class="page-head" style="margin-bottom:12px;"><h2 style="font-size:17px;">PV tháng này (từ đơn đặt hàng qua app)</h2></div>
      <div class="card" style="margin-bottom:24px;">
        <div style="font-size:28px;font-weight:700;color:var(--accent);font-family:'IBM Plex Mono',monospace;">${pvThisMonth} PV</div>
        ${reachedTier ? `<div class="hint-box" style="margin-top:10px;">🎉 Đã đạt mốc <b>${esc(reachedTier.label)}</b> — ${esc(reachedTier.desc)}</div>` : ''}
        ${nextTier ? `<div style="font-size:13px;color:var(--ink-soft);margin-top:10px;">Còn ${nextTier.pv - pvThisMonth} PV nữa để đạt "${esc(nextTier.label)}".</div>` : ''}
        <div style="font-size:12px;color:var(--ink-soft);margin-top:10px;">Chỉ tính đơn đã được xác nhận. Mốc thưởng: 200 PV → lì xì 200.000đ · 500 PV → quyền lợi VIP kinh doanh (10% hoa hồng khi giới thiệu).</div>
      </div>

      <div class="source-grid" style="margin-bottom:24px;">
        <div class="source-card" style="cursor:default;"><div class="ic">${totalPointsThisMonth}</div><div class="label">Điểm tháng này</div></div>
        <div class="source-card" style="cursor:default;"><div class="ic">${totalCommissionThisMonth.toLocaleString('vi-VN')}đ</div><div class="label">Hoa hồng tháng này</div></div>
        <div class="source-card" style="cursor:default;"><div class="ic">${totalCommissionAllTime.toLocaleString('vi-VN')}đ</div><div class="label">Tổng hoa hồng đã nhận</div></div>
      </div>

      <div class="page-head" style="margin-bottom:12px;"><h2 style="font-size:17px;">Lịch sử theo tháng</h2></div>
      ${state.rows.length===0 ? `<div style="color:var(--ink-soft);font-size:14px;">Chưa có dữ liệu — điểm/hoa hồng sẽ hiện ở đây khi bạn có đơn hàng đầu tiên.</div>` : state.rows.map(r=>`
        <div class="section" style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;flex-wrap:wrap;">
          <div>
            <div class="meta">${esc(r.month)}</div>
            <div style="font-weight:600;font-size:14px;">${r.points} điểm · mua ${Number(r.purchase_amount).toLocaleString('vi-VN')}đ</div>
            ${r.note ? `<div style="font-size:13px;color:var(--ink-soft);margin-top:4px;">${esc(r.note)}</div>` : ''}
          </div>
          <div style="font-family:'IBM Plex Mono',monospace;font-weight:700;color:var(--accent);white-space:nowrap;">${Number(r.commission).toLocaleString('vi-VN')}đ</div>
        </div>
      `).join('')}
    `;
  }

  draw();
  load();
}

window.Modules = window.Modules || {};
window.Modules['tich-diem-hoa-hong'] = { title:'Tích Điểm & Hoa Hồng', render };
})();
