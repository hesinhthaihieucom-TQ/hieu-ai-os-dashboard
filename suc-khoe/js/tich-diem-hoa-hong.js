// Tích Điểm & Hoa Hồng — chỉ ĐỌC cho user thường, admin nhập tay từng dòng qua Quản Trị khi khách
// mua hàng (chưa có luồng đối soát tự động ở bản khung này).
(function(){
function render(container, ctx){
  const state = { loading:true, rows:[] };

  function draw(){ container.innerHTML = html(); }

  async function load(){
    const { data } = await ctx.supabase.from('sk_points_ledger').select('*').eq('user_id', ctx.user.id).order('month', { ascending:false });
    state.rows = data || [];
    state.loading = false;
    draw();
  }

  function html(){
    if(state.loading) return `<div class="loading"><div class="spinner"></div></div>`;
    const thisMonth = new Date().toISOString().slice(0,7);
    const currentRows = state.rows.filter(r=>r.month===thisMonth);
    const totalPointsThisMonth = currentRows.reduce((s,r)=>s+Number(r.points||0),0);
    const totalCommissionThisMonth = currentRows.reduce((s,r)=>s+Number(r.commission||0),0);
    const totalCommissionAllTime = state.rows.reduce((s,r)=>s+Number(r.commission||0),0);

    return `
      <div class="page-head">
        <h1>Tích Điểm & Hoa Hồng</h1>
        <p>Điểm và hoa hồng được ghi nhận theo từng tháng khi bạn mua hàng.</p>
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
