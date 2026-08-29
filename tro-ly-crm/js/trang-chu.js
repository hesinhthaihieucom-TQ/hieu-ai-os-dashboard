(function(){
function render(container, ctx){
  const state = { loading:true, dueCount:0, dueRows:[], totalCustomers:0 };

  function draw(){ container.innerHTML = html(); bind(); }

  async function load(){
    const todayIso = isoDate(new Date());
    const [{ data: due }, { count }] = await Promise.all([
      ctx.supabase.from('crm_customers').select('id,ten_khach_hang,do_nong,ngay_follow_tiep').eq('user_id', ctx.user.id).lte('ngay_follow_tiep', todayIso).order('ngay_follow_tiep', { ascending:true }).limit(20),
      ctx.supabase.from('crm_customers').select('id', { count:'exact', head:true }).eq('user_id', ctx.user.id),
    ]);
    state.dueRows = due || [];
    state.dueCount = state.dueRows.length;
    state.totalCustomers = count || 0;
    state.loading = false;
    draw();
  }

  function isoDate(d){
    const tzOffset = d.getTimezoneOffset() * 60000;
    return new Date(d - tzOffset).toISOString().slice(0,10);
  }

  const QUICK_LINKS = [
    { key:'tu-van', icon:'💬', label:'Tư Vấn AI', desc:'Dán ảnh chụp chat, nhận câu tư vấn dùng ngay' },
    { key:'khach-hang', icon:'📇', label:'Khách Hàng', desc:'Xem/lọc toàn bộ hồ sơ khách đang chăm sóc' },
    { key:'cau-chuyen', icon:'📖', label:'Câu Chuyện Của Bạn', desc:'Hồ sơ giúp AI tư vấn đúng giọng, đúng câu chuyện thật' },
    { key:'nang-cap', icon:'💳', label:'Nâng Cấp', desc:'Xem gói và gia hạn' },
  ];

  function html(){
    const name = (ctx.profile && ctx.profile.full_name) || '';
    return `
      <div class="page-head">
        <h1>Chào ${esc(name || 'bạn')} 👋</h1>
        <p>Trợ Lý AI Tư Vấn &amp; CRM — tư vấn khách hàng đúng quy trình, CRM tự lưu, tự nhắc lịch follow.</p>
      </div>

      ${state.loading ? `<div class="loading"><div class="spinner"></div></div>` : `
        <div class="section ${state.dueCount>0?'highlight':''}">
          <h3>Cần follow hôm nay${state.dueCount>0?` (${state.dueCount})`:''}</h3>
          ${state.dueRows.length===0
            ? `<div class="body" style="color:var(--ink-soft);">Không có khách nào tới hạn follow hôm nay.</div>`
            : state.dueRows.map(r=>`
              <div class="list-item" data-goto-customer="${r.id}" style="cursor:pointer;">
                <div class="txt">
                  <div class="meta">${r.ngay_follow_tiep ? (new Date(r.ngay_follow_tiep).getTime()<Date.now()-86400000 ? 'Quá hạn' : 'Hôm nay') : ''} · ${esc(r.do_nong||'')}</div>
                  ${esc(r.ten_khach_hang)}
                </div>
              </div>
            `).join('')}
        </div>

        <div class="source-grid" style="margin-bottom:24px;">
          <div class="source-card" style="cursor:default;">
            <div class="ic">📇</div>
            <div class="label">${state.totalCustomers} khách đang quản lý</div>
          </div>
        </div>
      `}

      <div class="page-head" style="margin-bottom:12px;"><h2 style="font-size:17px;">Bắt đầu từ đâu</h2></div>
      <div class="source-grid">
        ${QUICK_LINKS.map(l=>`
          <div class="source-card" data-goto="${l.key}">
            <div class="ic">${l.icon}</div>
            <div class="label">${esc(l.label)}</div>
            <div style="font-size:11.5px;color:var(--ink-soft);margin-top:4px;">${esc(l.desc)}</div>
          </div>
        `).join('')}
      </div>
    `;
  }

  function bind(){
    container.querySelectorAll('[data-goto]').forEach(el=>{
      el.onclick = ()=>{ location.hash = el.getAttribute('data-goto'); };
    });
    container.querySelectorAll('[data-goto-customer]').forEach(el=>{
      el.onclick = ()=>{ window.__crmOpenCustomerId = el.getAttribute('data-goto-customer'); location.hash = 'khach-hang'; };
    });
  }

  draw();
  load();
}

window.Modules = window.Modules || {};
window.Modules['trang-chu'] = { title:'Trang chủ', render };
})();
