(function(){
// Tách riêng khỏi "Thành viên" (quan-tri.js) — để đó thì danh sách giao dịch dài dần theo thời
// gian sẽ đẩy toàn bộ danh sách thành viên xuống rất xa, khó dùng.
function render(container, ctx){
  const state = { transactions:[], q:'' };

  function draw(){ container.innerHTML = html(); bind(); }

  async function boot(){
    draw();
    await load();
    draw();
  }

  async function load(){
    const { data } = await ctx.supabase.from('sepay_transactions').select('*').order('created_at', { ascending:false }).limit(100);
    state.transactions = data || [];
  }

  function filtered(){
    const q = state.q.trim().toLowerCase();
    if(!q) return state.transactions;
    return state.transactions.filter(t =>
      (t.ref_code_found||'').toLowerCase().includes(q) ||
      String(t.transfer_amount||'').includes(q) ||
      (t.content||'').toLowerCase().includes(q)
    );
  }

  function html(){
    const list = filtered();
    return `
      <div class="page-head"><h1>Giao dịch SePay</h1><p>100 giao dịch gần nhất, cả tự động khớp lẫn admin ghi tay.</p></div>
      <div class="card" style="margin-bottom:20px;">
        <input id="gd-search" type="text" placeholder="Tìm theo mã tham chiếu, số tiền, hoặc nội dung..." value="${esc(state.q)}"
          style="width:100%;padding:12px 14px;border:1px solid var(--line);border-radius:10px;font-size:14.5px;background:#FDFCF8;">
      </div>
      ${list.length===0 ? `<div style="color:var(--ink-soft);font-size:14px;">Chưa có giao dịch nào.</div>` : ''}
      ${list.map(t=>{
        const ok = t.status === 'matched';
        const isManual = t.gateway === 'manual';
        return `<div class="section" style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;">
          <span style="font-size:13px;">${esc(new Date(t.created_at).toLocaleString('vi-VN'))} — ${esc((t.transfer_amount||0).toLocaleString('vi-VN'))}đ — <span style="font-family:'IBM Plex Mono',monospace;">${isManual ? '(admin ghi tay)' : esc(t.ref_code_found||'(không tìm thấy mã)')}</span></span>
          <span style="font-size:11.5px;font-weight:600;padding:3px 9px;border-radius:999px;
            background:${ok?'var(--accent-soft)':'#FBEAE4'};color:${ok?'var(--accent)':'var(--danger)'};">
            ${isManual ? '✓ Admin ghi nhận tay' : ok?`Đã cộng ${t.days_granted} ngày`:t.status==='unmatched_code'?'Không tìm thấy mã':'Sai số tiền — cần xử lý tay'}
          </span>
        </div>`;
      }).join('')}
    `;
  }

  function bind(){
    const search = container.querySelector('#gd-search');
    if(search) search.oninput = ()=>{ state.q = search.value; draw(); search.focus(); search.selectionStart = search.selectionEnd = search.value.length; };
  }

  boot();
}
window.Modules = window.Modules || {};
window.Modules['quan-tri-giaodich'] = { title:'Giao dịch SePay', render };
})();
