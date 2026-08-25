(function(){
// "Theo Dõi Kết Quả" — TÁCH RIÊNG khỏi Chấm Điểm Nghiệp Tiền (2026-08-25, góp ý Quỳnh: "mục lưu lại
// nên riêng 1 mục... không thì Chấm Điểm Nghiệp Tiền dài quá"). Chỉ đọc từ tc_karma_history — mỗi
// dòng là 1 SNAPSHOT được ghi lại lúc bấm "Xem Kết Quả" ở thiet-lap-nhanh.js (xem logKarmaHistory()
// ở đó), append-only. Route ẨN — vào qua link ở kết quả Chấm Điểm Nghiệp Tiền, không hiện sidebar.

function render(container, ctx){
  const state = { loading: true, rows: [] };

  function draw(){ container.innerHTML = html(); bind(); }
  draw();

  async function load(){
    state.loading = true; draw();
    const { data } = await ctx.supabase.from('tc_karma_history').select('*')
      .eq('user_id', ctx.user.id).order('taken_at', { ascending:false }).limit(50);
    state.rows = data || [];
    state.loading = false;
    draw();
  }
  load();

  function html(){
    return `
      <div class="page-head">
        <h1>Theo Dõi Kết Quả</h1>
        <p>Mỗi lần bấm "Xem Kết Quả" ở <a href="#thiet-lap-nhanh" style="color:var(--accent);font-weight:600;">Chấm Điểm Nghiệp Tiền →</a> đều lưu lại 1 mốc — xem lại đây để thấy tâm thức tiền của bạn đã dịch chuyển ra sao qua thời gian.</p>
      </div>

      ${state.loading ? `<div class="loading"><div class="spinner"></div></div>` : (
        state.rows.length === 0 ? `
          <div class="hint-box">Chưa có lần chấm điểm nào được lưu — sang <a href="#thiet-lap-nhanh" style="color:var(--accent);font-weight:600;">Chấm Điểm Nghiệp Tiền →</a> làm bài để bắt đầu theo dõi.</div>
        ` : `
          <div class="section">
            <p style="font-size:12.5px;color:var(--ink-soft);margin-bottom:12px;">${state.rows.length>=50?'50 lần gần nhất — ':''}Mới nhất ở trên cùng.</p>
            <div style="overflow-x:auto;">
              <table style="width:100%;border-collapse:collapse;font-size:13px;">
                <thead><tr>
                  <th style="text-align:left;padding:6px 8px;border-bottom:1px solid var(--line);font-family:'IBM Plex Mono',monospace;font-size:11px;color:var(--ink-soft);text-transform:uppercase;">Ngày</th>
                  <th style="text-align:right;padding:6px 8px;border-bottom:1px solid var(--line);font-family:'IBM Plex Mono',monospace;font-size:11px;color:var(--ink-soft);text-transform:uppercase;">Điểm Nghiệp Tiền</th>
                  <th style="text-align:left;padding:6px 8px;border-bottom:1px solid var(--line);font-family:'IBM Plex Mono',monospace;font-size:11px;color:var(--ink-soft);text-transform:uppercase;">Khâu yếu nhất</th>
                  <th style="text-align:left;padding:6px 8px;border-bottom:1px solid var(--line);font-family:'IBM Plex Mono',monospace;font-size:11px;color:var(--ink-soft);text-transform:uppercase;">5 Trụ Cột</th>
                </tr></thead>
                <tbody>
                  ${state.rows.map(row=>`
                    <tr>
                      <td style="padding:8px;border-bottom:1px solid var(--line-soft);white-space:nowrap;vertical-align:top;">${esc(new Date(row.taken_at).toLocaleDateString('vi-VN'))}</td>
                      <td style="text-align:right;padding:8px;border-bottom:1px solid var(--line-soft);font-family:'IBM Plex Mono',monospace;font-weight:700;color:var(--accent);vertical-align:top;">${row.vibe_score==null?'—':row.vibe_score+'/100'}</td>
                      <td style="padding:8px;border-bottom:1px solid var(--line-soft);vertical-align:top;">${row.weakest_area && WEAKEST_AREA_INFO[row.weakest_area] ? esc(WEAKEST_AREA_INFO[row.weakest_area].label) : '—'}</td>
                      <td style="padding:8px;border-bottom:1px solid var(--line-soft);font-size:11.5px;color:var(--ink-soft);vertical-align:top;">
                        ${HOUSES.map(h=>`${esc(h.label.replace(/^\S+\s/,''))}: <b>${row[h.key]==null?'—':row[h.key]}</b>`).join(' · ')}
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>
        `
      )}

      <div class="section">
        <div class="btn-row" style="justify-content:flex-start;">
          <span class="btn btn-sm" data-goto="thiet-lap-nhanh">Về Chấm Điểm Nghiệp Tiền →</span>
        </div>
      </div>
    `;
  }

  function bind(){
    container.querySelectorAll('[data-goto]').forEach(el=>{
      el.onclick = ()=>{ location.hash = el.getAttribute('data-goto'); };
    });
  }
}

window.Modules = window.Modules || {};
window.Modules['theo-doi-ket-qua'] = { title:'Theo Dõi Kết Quả', render };
})();
