// Kiểm Tra Sức Khỏe — bước "chẩn đoán mồi" nhẹ nhàng: khách chọn nhanh (các) vấn đề đang gặp, app
// đối chiếu ngay sang Thư Viện Sức Khỏe (sk_library_entries) để gợi ý nguyên nhân/cách xử lý/sản
// phẩm liên quan — không chấm điểm bằng AI ở bản khung này (khác Chấm Điểm Nghiệp Tiền bên tai-chinh),
// đối chiếu bằng cách so khớp từ khoá đơn giản (client-side), đủ dùng khi thư viện còn ít mục.
const SK_COMMON_ISSUES = [
  'Mất ngủ', 'Đau khớp / đau lưng', 'Tiêu hóa kém', 'Căng thẳng, stress',
  'Thừa cân', 'Thiếu năng lượng, mệt mỏi', 'Da / tóc kém', 'Huyết áp, tim mạch',
  'Đường huyết', 'Miễn dịch kém, hay ốm vặt', 'Khác',
];

(function(){
function render(container, ctx){
  const state = { selected:[], note:'', saving:false, history:[], libraryEntries:[], matches:null };

  function draw(){ container.innerHTML = html(); bind(); }

  async function load(){
    const [{ data: history }, { data: entries }] = await Promise.all([
      ctx.supabase.from('sk_health_checkins').select('*').eq('user_id', ctx.user.id).order('created_at', { ascending:false }).limit(10),
      ctx.supabase.from('sk_library_entries').select('id,issue_name').order('issue_name', { ascending:true }),
    ]);
    state.history = history || [];
    state.libraryEntries = entries || [];
    draw();
  }

  function toggle(issue){
    const i = state.selected.indexOf(issue);
    if(i>=0) state.selected.splice(i,1); else state.selected.push(issue);
  }

  function findMatches(issues){
    const words = issues.join(' ').toLowerCase().split(/[\s,\/]+/).filter(w=>w.length>2);
    return state.libraryEntries.filter(e=>{
      const name = (e.issue_name||'').toLowerCase();
      return words.some(w=>name.includes(w));
    });
  }

  async function submit(){
    if(state.selected.length===0) return;
    state.saving = true; draw();
    const { error } = await ctx.supabase.from('sk_health_checkins').insert({
      user_id: ctx.user.id, flagged_issues: state.selected, note: state.note.trim() || null,
    });
    state.saving = false;
    if(error){ alert('Lỗi khi lưu: ' + error.message); draw(); return; }
    state.matches = findMatches(state.selected);
    await load();
  }

  function html(){
    return `
      <div class="page-head">
        <h1>Kiểm Tra Sức Khỏe</h1>
        <p>Chọn (các) vấn đề bạn đang gặp — app sẽ đối chiếu ngay sang Thư Viện Sức Khỏe để bạn biết nguyên nhân và cách xử lý.</p>
      </div>

      <div class="card" style="margin-bottom:24px;">
        <div class="chips">
          ${SK_COMMON_ISSUES.map(issue=>`
            <div class="chip ${state.selected.includes(issue)?'selected':''}" data-issue="${esc(issue)}">${esc(issue)}</div>
          `).join('')}
        </div>
        <textarea id="kt-note" placeholder="Mô tả thêm (không bắt buộc)...">${esc(state.note)}</textarea>
        <button class="btn" style="margin-top:16px;" id="kt-submit" ${state.selected.length===0 || state.saving ? 'disabled' : ''}>
          ${state.saving ? 'Đang lưu…' : 'Kiểm tra ngay'}
        </button>
      </div>

      ${state.matches ? `
        <div class="page-head" style="margin-bottom:12px;"><h2 style="font-size:17px;">Gợi ý từ Thư Viện Sức Khỏe</h2></div>
        ${state.matches.length===0
          ? `<div class="hint-box">Thư viện chưa có mục nào khớp — chị Quỳnh sẽ bổ sung thêm dần. Bạn vẫn có thể xem toàn bộ ở mục "Thư Viện Sức Khỏe".</div>`
          : state.matches.map(m=>`<div class="list-item" data-open-library="${esc(m.id)}" style="cursor:pointer;"><div class="txt">${esc(m.issue_name)}</div><span style="color:var(--accent);font-size:13px;">Xem chi tiết →</span></div>`).join('')}
      ` : ''}

      ${state.history.length>0 ? `
        <div class="page-head" style="margin:28px 0 12px;"><h2 style="font-size:17px;">Lịch sử kiểm tra</h2></div>
        ${state.history.map(h=>`
          <div class="section">
            <div class="meta">${esc(new Date(h.created_at).toLocaleDateString('vi-VN'))}</div>
            <div class="body">${esc((h.flagged_issues||[]).join(', '))}</div>
            ${h.note ? `<div style="font-size:13px;color:var(--ink-soft);margin-top:6px;">${esc(h.note)}</div>` : ''}
          </div>
        `).join('')}
      ` : ''}
    `;
  }

  function bind(){
    container.querySelectorAll('[data-issue]').forEach(el=>{
      el.onclick = ()=>{ toggle(el.getAttribute('data-issue')); draw(); };
    });
    const noteEl = container.querySelector('#kt-note');
    if(noteEl) noteEl.oninput = (e)=>{ state.note = e.target.value; };
    const submitBtn = container.querySelector('#kt-submit');
    if(submitBtn) submitBtn.onclick = submit;
    container.querySelectorAll('[data-open-library]').forEach(el=>{
      el.onclick = ()=>{ location.hash = 'thu-vien-suc-khoe'; };
    });
  }

  draw();
  load();
}

window.Modules = window.Modules || {};
window.Modules['kiem-tra-suc-khoe'] = { title:'Kiểm Tra Sức Khỏe', render };
})();
