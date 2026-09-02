(function(){
// "Tích Lũy" — mục riêng (2026-08-26, góp ý Quỳnh: "phần tích lũy ở đâu sao e k thấy? hay tách
// riêng hẳn ra"). KHÔNG lưu số liệu mới nào — gộp lại đúng 2 nguồn đã có sẵn nhưng đang rải rác:
// (1) DÒNG TIỀN chuyển vào tiết kiệm mỗi lần ghi chép (tc_finance_entries, category_label='Tích Lũy',
// xem TICH_LUY_CATEGORY_LABEL ở util.js) — "mỗi tháng để dành được bao nhiêu"; (2) SỐ DƯ tài sản
// tích luỹ cuối mỗi tháng (tc_networth_snapshots.asset_savings/asset_gold_fx/asset_stocks, xem
// tong-ket-thang.js) — "tổng đang có bao nhiêu". Trước đây (1) chỉ ẩn trong danh mục chi tiêu, (2)
// chỉ là 1 dòng trong bảng Tài Sản ở Tổng Kết Tháng — không ai nhìn thấy "tích luỹ" như 1 con số
// riêng cả.
const TICH_LUY_ASSET_FIELDS = ['asset_savings', 'asset_gold_fx', 'asset_stocks'];

function tichLuyStockOf(row){
  return TICH_LUY_ASSET_FIELDS.reduce((s,k)=> s + Number((row && row[k]) || 0), 0);
}
function nextMonthKey(m){
  const [y, mo] = m.split('-').map(Number);
  const d = new Date(y, mo, 1);
  return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0');
}
function monthLabel(m){
  const [y, mo] = m.split('-').map(Number);
  return `Tháng ${mo}/${y}`;
}

// Biểu đồ cột đơn giản, dùng chung layout với karmaHistoryChartHtml (thiet-lap-nhanh.js)/
// networthChartHtml (tong-ket-thang.js) — luôn >=0 (số dư/dòng tiền tích luỹ không âm) nên không cần
// neo mốc 0 linh động như networthChartHtml.
function trendChartHtml(buckets, barColor){
  if(buckets.length < 2) return '';
  const w = 680, h = 170, padTop = 16, padBottom = 28, padSide = 12;
  const innerW = w - padSide*2, innerH = h - padTop - padBottom;
  const n = buckets.length;
  const maxVal = Math.max(1, ...buckets.map(b=>b.value));
  const slot = innerW / n;
  const barW = Math.max(10, Math.min(40, slot * 0.6));
  const parts = buckets.map((b,i)=>{
    const x = padSide + slot*i + (slot-barW)/2;
    const barH = Math.max(1, innerH * (b.value/maxVal));
    const y = padTop + (innerH - barH);
    const [yy, mm] = b.month.split('-');
    return `<text x="${(x+barW/2).toFixed(1)}" y="${(y-4).toFixed(1)}" text-anchor="middle" font-size="9" fill="var(--ink-soft)" font-family="IBM Plex Mono, monospace">${(b.value/1000000).toFixed(b.value>=1000000?0:1)}tr</text><rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${barW.toFixed(1)}" height="${barH.toFixed(1)}" fill="${barColor}" rx="2"/><text x="${(x+barW/2).toFixed(1)}" y="${h-8}" text-anchor="middle" font-size="9" fill="var(--ink-soft)" font-family="IBM Plex Mono, monospace">${mm}/${yy.slice(2)}</text>`;
  }).join('');
  return `<svg viewBox="0 0 ${w} ${h}" style="width:100%;height:${h}px;">${parts}</svg>`;
}

function render(container, ctx){
  const month = new Date().toISOString().slice(0,7);
  const state = { loading:true, snapshots:[], flowByMonth:{} };

  function draw(){ container.innerHTML = html(); }

  async function load(){
    state.loading = true; draw();
    const yearAgo = new Date(); yearAgo.setMonth(yearAgo.getMonth()-11);
    const yearAgoDate = `${yearAgo.getFullYear()}-${String(yearAgo.getMonth()+1).padStart(2,'0')}-01`;
    const [snapshotsRes, entriesRes, legacyEntriesRes] = await Promise.all([
      ctx.supabase.from('tc_networth_snapshots').select('*').eq('user_id', ctx.user.id).order('snapshot_month', { ascending:true }),
      // "Tích Lũy" giờ là 1 LOẠI giao dịch riêng (2026-09-01, góp ý Quỳnh) — giao dịch mới ghi thẳng
      // type='tich_luy'.
      ctx.supabase.from('tc_finance_entries').select('amount, entry_date')
        .eq('user_id', ctx.user.id).eq('type', 'tich_luy').gte('entry_date', yearAgoDate),
      // Tương thích ngược với vài dòng (nếu có) còn ghi theo bản CŨ hơn: type='expense' +
      // category_label='Tích Lũy' — xem comment ở schema_tai_chinh.sql.
      ctx.supabase.from('tc_finance_entries').select('amount, entry_date')
        .eq('user_id', ctx.user.id).eq('type', 'expense').eq('category_label', TICH_LUY_CATEGORY_LABEL).gte('entry_date', yearAgoDate),
    ]);
    state.snapshots = snapshotsRes.data || [];
    state.flowByMonth = {};
    [...(entriesRes.data||[]), ...(legacyEntriesRes.data||[])].forEach(e=>{
      const m = e.entry_date.slice(0,7);
      state.flowByMonth[m] = (state.flowByMonth[m]||0) + Number(e.amount);
    });
    state.loading = false;
    draw();
  }

  function html(){
    if(state.loading) return `<div class="loading"><div class="spinner"></div></div>`;

    const latest = state.snapshots[state.snapshots.length-1];
    const prev = state.snapshots[state.snapshots.length-2];
    const latestStock = latest ? tichLuyStockOf(latest) : 0;
    const stockChange = latest && prev ? latestStock - tichLuyStockOf(prev) : null;
    const thisMonthFlow = state.flowByMonth[month] || 0;

    const stockBuckets = state.snapshots.slice(-12).map(r=>({ month:r.snapshot_month, value:tichLuyStockOf(r) }));
    const flowMonths = Object.keys(state.flowByMonth).sort();
    const flowBuckets = flowMonths.map(m=>({ month:m, value: state.flowByMonth[m] }));

    return `
      <div class="page-head">
        <h1>Tích Lũy</h1>
        <p>Gộp lại 2 con số đang rải rác: <b>tiền đã chuyển vào tiết kiệm mỗi tháng</b> (ghi ở Ghi Chép Hàng Ngày, danh mục "Tích Lũy") và <b>tổng số dư đang tích luỹ</b> (tiết kiệm/vàng/cổ phiếu, cập nhật ở Tổng Kết Tháng).</p>
      </div>

      <div class="source-grid" style="margin-bottom:24px;">
        <div class="source-card"><div class="ic" style="font-size:17px;color:var(--accent);">${latestStock.toLocaleString('vi-VN')}đ</div><div class="label">Tổng đang tích luỹ${latest?` (${monthLabel(latest.snapshot_month)})`:''}</div></div>
        <div class="source-card"><div class="ic" style="font-size:17px;">${thisMonthFlow.toLocaleString('vi-VN')}đ</div><div class="label">Đã để dành tháng này</div></div>
        <div class="source-card">
          <div class="ic" style="font-size:17px;${stockChange==null?'':`color:${stockChange>=0?'var(--accent)':'var(--danger)'};`}">${stockChange==null?'Chưa đủ dữ liệu':(stockChange>=0?'+':'')+stockChange.toLocaleString('vi-VN')+'đ'}</div>
          <div class="label">So với tháng trước</div>
        </div>
      </div>

      ${!latest ? `<div class="hint-box" style="margin-bottom:20px;">Chưa có số liệu tài sản tích luỹ — sang <a href="#tong-ket-thang" style="color:var(--accent);font-weight:600;">Tổng Kết Tháng →</a> điền "Tiết kiệm có kỳ hạn"/"Vàng, Ngoại tệ"/"Cổ phiếu, Quỹ đầu tư" để bắt đầu theo dõi.</div>` : ''}

      <div class="section">
        <h3>📈 Tổng tích luỹ theo tháng</h3>
        <p style="font-size:12.5px;color:var(--ink-soft);margin-bottom:10px;">Tiết kiệm có kỳ hạn + Vàng/Ngoại tệ + Cổ phiếu/Quỹ đầu tư — lấy từ Tổng Kết Tháng, cập nhật mỗi khi bạn lưu cân đối tài sản ở đó.</p>
        ${stockBuckets.length < 2 ? `<div style="color:var(--ink-soft);font-size:14px;">Cần ít nhất 2 tháng đã lưu cân đối tài sản để vẽ xu hướng.</div>` : trendChartHtml(stockBuckets, 'var(--accent)')}
      </div>

      <div class="section">
        <h3>💰 Đã để dành theo tháng</h3>
        <p style="font-size:12.5px;color:var(--ink-soft);margin-bottom:10px;">Tổng tiền bạn tự ghi "chuyển vào Tích Lũy" ở Ghi Chép Hàng Ngày mỗi tháng — khoản này KHÔNG tính vào chi tiêu thật, chỉ để ghi công hành động để dành.</p>
        ${flowBuckets.length === 0 ? `<div class="hint-box">Chưa ghi khoản nào vào danh mục "Tích Lũy" — sang <a href="#ghi-chep" style="color:var(--accent);font-weight:600;">Ghi Chép Hàng Ngày →</a>, chọn danh mục "Tích Lũy" mỗi lần chuyển tiền vào tiết kiệm/đầu tư.</div>`
          : flowBuckets.length < 2 ? trendChartHtml([...flowBuckets, {month:nextMonthKey(flowBuckets[0].month), value:0}], 'var(--gold)')
          : trendChartHtml(flowBuckets, 'var(--gold)')}
      </div>

      <div class="hint-box" style="margin-top:4px;">Tích luỹ đều đặn là 1 phần của Trụ <b>Tài Chính Tâm Thức</b> ở <a href="#thiet-lap-nhanh" style="color:var(--accent);font-weight:600;">Điểm Nghiệp →</a> — Tỷ lệ tiết kiệm ở đó tính từ đúng dòng tiền thu/chi thật, khớp với số liệu ở trang này.</div>
    `;
  }

  load();
}
window.Modules = window.Modules || {};
window.Modules['tich-luy'] = { title:'Tích Lũy', render };
})();
