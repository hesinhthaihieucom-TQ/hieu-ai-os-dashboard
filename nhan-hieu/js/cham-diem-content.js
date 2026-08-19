(function(){
function render(container, ctx){
  const state = { text:'', result:null, error:null, loading:false, positioning:null, history:[] };

  function draw(){ container.innerHTML = html(); bind(); }

  async function boot(){
    draw();
    const { data: pos } = await ctx.supabase.from('positioning_results').select('*').eq('user_id', ctx.user.id).maybeSingle();
    state.positioning = pos || null;
    const { data: hist } = await ctx.supabase.from('content_scores').select('*').eq('user_id', ctx.user.id).order('created_at', { ascending:false }).limit(5);
    state.history = hist || [];
    // Khôi phục lại kết quả chấm gần nhất khi quay lại trang — bài/hook đã chấm sẵn có trong lịch
    // sử rồi nên không cần bảng lưu riêng, chỉ cần lấy đúng bản mới nhất làm trạng thái hiện tại.
    if(state.history.length){
      state.text = state.history[0].content_text || '';
      state.result = state.history[0].result || null;
    }
    draw();
  }

  function html(){
    return `
      <div class="page-head"><h1>Chấm Điểm Content</h1><p>Dán bài viết vào — AI chấm theo 6 tiêu chí: hook, chất liệu thật, giá trị, CTA, có bị "AI hoá" không${state.positioning&&state.positioning.luot1?', và khớp giọng điệu định vị':''}.</p></div>
      <div class="card">
        <textarea id="score-input" placeholder="Dán nguyên văn bài viết cần chấm vào đây...">${esc(state.text)}</textarea>
        <div class="btn-row"><button class="btn" data-action="score" ${state.loading?'disabled':''}>${state.loading?'Đang chấm…':'Chấm điểm bài này'}</button> <span style="font-size:11px;color:var(--ink-soft);align-self:center;">(tốn 1 lượt AI)</span></div>
        <div class="hint-box" style="margin-top:10px;">AI cần khoảng 1 phút để chấm đủ 6 tiêu chí — đừng thoát trang khi đang đợi.</div>
        ${state.error?`<div class="error-box">${esc(state.error)}</div>`:''}
        ${!state.positioning || !state.positioning.luot1 ? `<div class="hint-box">Chưa có Định Vị — vẫn chấm được, nhưng sẽ bỏ qua tiêu chí "khớp giọng điệu".</div>` : ''}
      </div>
      ${state.result ? resultHtml() : ''}
      ${state.history.length ? `<div style="margin-top:28px;"><h3 style="font-family:'IBM Plex Mono',monospace;font-size:13px;color:var(--ink-soft);text-transform:uppercase;letter-spacing:.05em;margin-bottom:12px;">Lịch sử chấm gần đây</h3>
        ${state.history.map(h=>`<div class="list-item"><div class="txt"><div class="meta">${new Date(h.created_at).toLocaleDateString('vi-VN')} · ${h.result.diem_tong}/100</div>${esc((h.content_text||'').slice(0,100))}…</div><span style="color:var(--danger);cursor:pointer;font-size:12px;white-space:nowrap;" data-del-history="${h.id}">Xoá</span></div>`).join('')}
      </div>` : ''}
    `;
  }

  function resultHtml(){
    const r = state.result;
    return `
      <div class="section highlight"><h3>Điểm tổng</h3><div class="body" style="font-size:32px;font-weight:700;">${r.diem_tong}<span style="font-size:16px;">/100</span></div></div>
      <div class="section"><h3>Phân loại</h3><div class="body"><b>Tầng:</b> ${esc(r.tang_noi_dung)} &nbsp;·&nbsp; <b>Loại content:</b> ${esc(r.loai_content)}</div></div>
      ${r.tieu_chi.map(t=>`
        <div class="section">
          <h3>${esc(t.ten)} — ${t.diem}/10</h3>
          <div class="body">${esc(t.nhan_xet)}</div>
          <div class="body" style="margin-top:8px;background:var(--accent-soft);padding:12px;border-radius:8px;"><b>Gợi ý sửa:</b> ${esc(t.goi_y_sua)}</div>
        </div>
      `).join('')}
      <div class="section"><h3>Câu/đoạn yếu nhất</h3><div class="body">${esc(breakSentences(r.cau_yeu_nhat))}</div></div>
      <div class="section"><h3>Bản sửa đề xuất</h3><div class="body">${esc(breakSentences(r.ban_sua_de_xuat))}</div></div>
      <div class="section"><h3>Kết luận</h3><div class="body">${esc(r.ket_luan)}</div></div>
      <div class="btn-row"><span class="btn-ghost btn" data-action="rewrite">Viết lại theo góp ý này →</span></div>
    `;
  }

  function bind(){
    const input = container.querySelector('#score-input');
    if(input) input.oninput = ()=>{ state.text = input.value; };
    const btn = container.querySelector('[data-action="score"]');
    if(btn) btn.onclick = score;
    const rewriteBtn = container.querySelector('[data-action="rewrite"]');
    if(rewriteBtn) rewriteBtn.onclick = rewrite;
    container.querySelectorAll('[data-del-history]').forEach(el=>{
      el.onclick = async ()=>{
        const id = el.getAttribute('data-del-history');
        if(!(await confirmModal('Xoá mục này khỏi lịch sử chấm điểm?'))) return;
        await ctx.supabase.from('content_scores').delete().eq('id', id);
        state.history = state.history.filter(h=>h.id!==id);
        draw();
      };
    });
  }

  async function score(){
    if(!state.text.trim()) return;
    state.loading = true; state.error = null; draw();
    const stopProgress = animateProgressButton(container.querySelector('[data-action="score"]'), 55, 'Đang chấm');
    try{
      const data = await callApi('/api/cham-diem-content', {
        content_text: state.text,
        positioning: state.positioning && state.positioning.luot1 ? { luot1: state.positioning.luot1 } : null,
      });
      state.result = data.result;
      await ctx.supabase.from('content_scores').insert({ user_id: ctx.user.id, content_text: state.text, result: data.result });
      stopProgress();
      state.loading = false; draw();
    } catch(e){ stopProgress(); state.error = e.message; state.loading = false; draw(); }
  }

  // Trỏ sang Viết Content và tự chạy lại — dùng đúng những gì AI vừa chấm (tiêu chí yếu, câu yếu
  // nhất, bản sửa đề xuất) làm ý tưởng đầu vào, để bài mới đi qua đúng bộ khung viết chuẩn (hook,
  // CTA, cấu trúc...) thay vì chỉ sửa vá thô ngay tại đây — tránh viết trùng 2 nơi 2 kiểu khác nhau.
  function rewrite(){
    const r = state.result;
    const weakBits = (r.tieu_chi||[]).filter(t=>t.diem<8).map(t=>`- ${t.ten} (${t.diem}/10): ${t.nhan_xet} → Cần sửa: ${t.goi_y_sua}`).join('\n');
    window.PendingTopic = `Viết lại HOÀN CHỈNH bài viết dưới đây, sửa ĐÚNG các lỗi đã được AI chỉ ra khi chấm điểm, không lặp lại lỗi cũ:\n${weakBits}\nCâu/đoạn yếu nhất cần sửa: ${r.cau_yeu_nhat}\nHướng sửa gợi ý: ${r.ban_sua_de_xuat}\n\nBÀI GỐC:\n${state.text}`;
    window.PendingRewriteAuto = true;
    location.hash = 'viet-content';
  }

  boot();
}
window.Modules = window.Modules || {};
window.Modules['cham-diem-content'] = { title:'Chấm Điểm Content', render };
})();
