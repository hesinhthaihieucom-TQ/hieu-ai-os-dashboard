(function(){
function render(container, ctx){
  const state = { loading:true, packageName:null, latestLog:null, pointsThisMonth:null };

  function draw(){ container.innerHTML = html(); bind(); }

  async function load(){
    const tasks = [];
    if(ctx.profile && ctx.profile.sk_package_id){
      tasks.push(ctx.supabase.from('sk_packages').select('name').eq('id', ctx.profile.sk_package_id).maybeSingle()
        .then(({data})=>{ state.packageName = data ? data.name : null; }));
    }
    tasks.push(ctx.supabase.from('sk_weekly_logs').select('*').eq('user_id', ctx.user.id).order('week_start', { ascending:false }).limit(1).maybeSingle()
      .then(({data})=>{ state.latestLog = data || null; }));
    const thisMonth = new Date().toISOString().slice(0,7);
    tasks.push(ctx.supabase.from('sk_points_ledger').select('points,commission').eq('user_id', ctx.user.id).eq('month', thisMonth)
      .then(({data})=>{
        const rows = data || [];
        state.pointsThisMonth = { points: rows.reduce((s,r)=>s+Number(r.points||0),0), commission: rows.reduce((s,r)=>s+Number(r.commission||0),0) };
      }));
    await Promise.all(tasks);
    state.loading = false;
    draw();
  }

  const QUICK_LINKS = [
    { key:'kiem-tra-suc-khoe', icon:'🩺', label:'Kiểm Tra Sức Khỏe', desc:'Chọn nhanh vấn đề bạn đang gặp' },
    { key:'theo-doi-tuan', icon:'📈', label:'Theo Dõi Tuần', desc:'Ghi lại cân nặng, giấc ngủ, năng lượng' },
    { key:'lich-trinh', icon:'🗓️', label:'Lịch Trình Của Bạn', desc:'Theo đúng gói bạn đang dùng' },
    { key:'thu-vien-suc-khoe', icon:'📚', label:'Thư Viện Sức Khỏe', desc:'Tra cứu nguyên nhân, cách xử lý' },
    { key:'san-pham', icon:'🛍️', label:'Sản Phẩm Unicity', desc:'Công dụng và giá bán lẻ' },
    { key:'tich-diem-hoa-hong', icon:'🎁', label:'Tích Điểm & Hoa Hồng', desc:'Xem điểm và hoa hồng tháng này' },
  ];

  function html(){
    const name = (ctx.profile && ctx.profile.full_name) || '';
    return `
      <div class="page-head">
        <h1>Chào ${esc(name || 'bạn')} 👋</h1>
        <p>Hiểu Để Khoẻ Mạnh — đồng hành cùng bạn theo dõi sức khỏe mỗi tuần.</p>
      </div>

      ${state.loading ? `<div class="loading"><div class="spinner"></div></div>` : `
        <div class="section">
          <h3>Gói đang dùng</h3>
          ${state.packageName
            ? `<div class="body">${esc(state.packageName)}</div>`
            : `<div class="body" style="color:var(--ink-soft);">Chưa được gán gói — liên hệ để được kích hoạt gói sản phẩm/chương trình bạn đã mua.</div>`}
        </div>

        <div class="source-grid" style="margin-bottom:24px;">
          <div class="source-card" style="cursor:default;">
            <div class="ic">⚖️</div>
            <div class="label">${state.latestLog && state.latestLog.weight!=null ? `${state.latestLog.weight} kg` : '—'}</div>
          </div>
          <div class="source-card" style="cursor:default;">
            <div class="ic">😴</div>
            <div class="label">${state.latestLog && state.latestLog.sleep_hours!=null ? `${state.latestLog.sleep_hours} giờ ngủ` : '—'}</div>
          </div>
          <div class="source-card" style="cursor:default;">
            <div class="ic">⚡</div>
            <div class="label">${state.latestLog && state.latestLog.energy_level!=null ? `Năng lượng ${state.latestLog.energy_level}/5` : '—'}</div>
          </div>
          <div class="source-card" style="cursor:default;">
            <div class="ic">🎁</div>
            <div class="label">${state.pointsThisMonth ? `${state.pointsThisMonth.points} điểm tháng này` : '—'}</div>
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
  }

  draw();
  load();
}

window.Modules = window.Modules || {};
window.Modules['trang-chu'] = { title:'Trang chủ', render };
})();
