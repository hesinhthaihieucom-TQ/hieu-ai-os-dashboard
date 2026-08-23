(function(){
// "Hạt Giống Phước - Nghiệp" (trước gọi "Tàng Thức", đổi tên 2026-08-22) — Sổ Niềm Tin Cũ Về Tiền,
// ứng với tầng Tàng Thức trong triết lý 4 tầng Tàng Thức -> Tâm Thức -> Tiềm Thức -> Ý Thức (xem
// glossaryWrap 'tang_thuc' ở util.js) — mỗi niềm tin cũ là 1 "hạt giống" Phước hoặc Nghiệp đã gieo
// từ ký ức/tuổi thơ. KHÔNG dùng AI để đoán/gợi ý niềm tin thay thế — người dùng tự viết cả niềm tin
// cũ lẫn niềm tin mới, đúng tinh thần "tự nhận diện" xuyên suốt app (giống Tiếng Lòng, Nhật Ký Rắc Rối).
const REFRAME_PROMPTS = [
  'Niềm tin này đã từng bảo vệ bạn thế nào trong quá khứ — dù giờ có thể không còn cần thiết nữa?',
  'Nếu niềm tin này KHÔNG đúng, hôm nay bạn sẽ hành xử với tiền khác đi thế nào?',
  'Niềm tin này có thật sự LÀ BẠN, hay chỉ là thứ bạn học được từ người khác lúc còn nhỏ?',
  'Bạn có sẵn sàng thử sống 1 tuần NHƯ THỂ niềm tin mới bên dưới là đúng, xem điều gì thay đổi?',
];
const NUT_CHAN_LABELS = {
  1: 'Nút Chặn #1 — Khi thấy người khác nhận tiền',
  2: 'Nút Chặn #2 — Khi chính mình nhận tiền',
  3: 'Nút Chặn #3 — Khi chính mình chi tiền',
  4: 'Nút Chặn #4 — Khi thấy người khác chi tiền',
};
// Gợi ý sự kiện gốc thường gặp + PHÂN TÍCH SẴN (không bắt người dùng tự chẩn đoán "đứa trẻ nào bị
// tổn thương" — góp ý 2026-08-22: app phải là bên phân tích, người dùng chỉ cần chọn/mô tả đúng sự
// kiện họ nhớ). Bấm 1 gợi ý sẽ điền sẵn vào ô sự kiện (sửa lại được) + hiện luôn phân tích tương ứng.
const ORIGIN_EVENT_PATTERNS = [
  { key:'cai_nhau', label:'Nghe bố mẹ cãi nhau/than thở về tiền', seed:'Hồi nhỏ hay nghe bố mẹ cãi nhau hoặc than thở vì thiếu tiền.', analysis:'Bạn học được rằng tiền gắn liền với xung đột, bất an trong gia đình — lớn lên dễ né tránh nói chuyện tiền bạc thẳng thắn, hoặc thấy căng thẳng mỗi khi phải bàn chuyện tài chính với người thân.' },
  { key:'so_sanh_ngheo', label:'Bị so sánh/chê bai vì gia đình nghèo hơn người khác', seed:'Bị so sánh hoặc chê bai vì nhà mình nghèo hơn bạn bè/họ hàng.', analysis:'Bạn học được rằng thiếu tiền đồng nghĩa với xấu hổ, kém cỏi — lớn lên dễ tích tiền hoặc mua sắm để chứng minh giá trị bản thân, thay vì vì nhu cầu hay mục đích thật.' },
  { key:'vo_no', label:'Chứng kiến người thân vỡ nợ/mất trắng vì tiền', seed:'Chứng kiến người thân trong nhà vỡ nợ hoặc mất trắng tài sản.', analysis:'Bạn học được rằng tiền có thể biến mất bất cứ lúc nào — lớn lên dễ ôm giữ quá mức, sợ chi tiêu, khó tin vào sự an toàn tài chính dù hiện tại đang ổn định.' },
  { key:'bi_trach_mang', label:'Bị trách mắng/phạt vì tiêu tiền sai ý người lớn', seed:'Từng bị trách mắng hoặc phạt vì tiêu tiền không đúng ý bố mẹ.', analysis:'Bạn học được rằng chi tiền dễ bị phán xét hoặc trừng phạt — lớn lên dễ thấy tội lỗi mỗi khi chi cho bản thân, dù đó là nhu cầu chính đáng.' },
  { key:'phai_nhin', label:'Phải nhịn/thiếu thốn để nhường cho người khác trong nhà', seed:'Từng phải nhịn hoặc thiếu thốn để nhường phần cho anh chị em/người khác trong nhà.', analysis:'Bạn học được rằng nhu cầu của mình không quan trọng bằng người khác — lớn lên dễ hy sinh tài chính bản thân quá mức, hoặc áy náy khi giữ tiền lại cho chính mình.' },
  { key:'tien_dieu_kien', label:'Được cho tiền đi kèm điều kiện/áp lực phải nghe lời', seed:'Được cho tiền nhưng luôn đi kèm điều kiện hoặc áp lực phải nghe lời.', analysis:'Bạn học được rằng tiền gắn liền với sự kiểm soát — lớn lên dễ khó chịu khi phải phụ thuộc tài chính vào ai, hoặc ngược lại, dùng tiền để kiểm soát người khác.' },
];

function render(container, ctx){
  const state = {
    loading: true,
    beliefs: [],
    form: { belief_text:'', origin_note:'', linked_nut_chan:null },
    selectedOriginPattern: null,
    saving: false,
    lastReframe: '',
    justAddedId: null,
    newBeliefDraft: '',
    incomingContext: null,
  };
  const DRAFT_KEY = 'tang-thuc';
  function persistDraft(){ saveModuleDraft(ctx, DRAFT_KEY, { form: state.form, selectedOriginPattern: state.selectedOriginPattern }); }

  // Đến từ nút "Ghi niềm tin gốc..." ở kết quả Chấm Điểm Nghiệp Tiền — 1 điều hướng chủ động luôn
  // thắng, nên đọc và xoá ngay window.Pending* (đúng quy ước dùng ở nhan-hieu/js/cham-diem-hook.js).
  // Điều hướng chủ động này LUÔN thắng draft cũ (xem load() bên dưới) — đúng quy ước chung của app.
  if(window.PendingTangThucContext){
    state.incomingContext = window.PendingTangThucContext;
    state.form.linked_nut_chan = state.incomingContext.nutChan;
    window.PendingTangThucContext = null;
  }

  function draw(){ container.innerHTML = html(); bind(); }
  draw();

  async function load(){
    state.loading = true; draw();
    const { data } = await ctx.supabase.from('tc_core_beliefs')
      .select('*').eq('user_id', ctx.user.id).order('created_at', { ascending:false });
    state.beliefs = data || [];
    // Đang gõ dở 1 niềm tin mà lỡ bấm sang màn khác thì không được mất — trừ khi vừa đến từ 1 điều
    // hướng chủ động (Pending* ở trên), lúc đó ngữ cảnh mới luôn thắng draft cũ (góp ý Quỳnh 2026-08-22).
    if(!state.incomingContext){
      const draft = await loadModuleDraft(ctx, DRAFT_KEY);
      if(draft){
        if(draft.form) Object.assign(state.form, draft.form);
        if(draft.selectedOriginPattern) state.selectedOriginPattern = draft.selectedOriginPattern;
      }
    }
    state.loading = false;
    draw();
  }

  async function submitBelief(){
    const text = state.form.belief_text.trim();
    if(!text) return;
    state.saving = true; draw();
    const { data } = await ctx.supabase.from('tc_core_beliefs').insert({
      user_id: ctx.user.id,
      belief_text: text,
      origin_note: state.form.origin_note.trim() || null,
      linked_nut_chan: state.form.linked_nut_chan,
    }).select().maybeSingle();
    state.lastReframe = REFRAME_PROMPTS[Math.floor(Math.random()*REFRAME_PROMPTS.length)];
    state.justAddedId = data ? data.id : null;
    state.newBeliefDraft = '';
    state.form = { belief_text:'', origin_note:'', linked_nut_chan:null };
    state.selectedOriginPattern = null;
    state.saving = false;
    await clearModuleDraft(ctx, DRAFT_KEY);
    await load();
  }

  async function saveNewBelief(id){
    const text = state.newBeliefDraft.trim();
    if(!text) return;
    await ctx.supabase.from('tc_core_beliefs').update({ new_belief: text, updated_at: new Date().toISOString() }).eq('id', id);
    state.justAddedId = null;
    state.newBeliefDraft = '';
    await load();
  }

  async function markResolved(id){
    await ctx.supabase.from('tc_core_beliefs').update({ still_active:false, updated_at: new Date().toISOString() }).eq('id', id);
    await load();
  }

  async function deleteBelief(id){
    const ok = await confirmModal('Xoá niềm tin này khỏi sổ?');
    if(!ok) return;
    await ctx.supabase.from('tc_core_beliefs').delete().eq('id', id);
    await load();
  }

  function beliefCardHtml(b){
    return `
      <div class="list-item" style="flex-direction:column;align-items:stretch;">
        <div style="display:flex;justify-content:space-between;gap:10px;align-items:flex-start;">
          <div class="txt">
            <div class="meta">${new Date(b.created_at).toLocaleDateString('vi-VN')}${b.linked_nut_chan?' · '+esc(NUT_CHAN_LABELS[b.linked_nut_chan]):''}</div>
            "${esc(b.belief_text)}"
          </div>
          <span style="flex-shrink:0;font-size:11.5px;font-weight:600;padding:3px 9px;border-radius:99px;${b.still_active?'background:#FDF0E0;color:#B5691A;':'background:#E5F0E5;color:#2E7D32;'}">${b.still_active?'Đang chi phối':'Đã chuyển hoá ✓'}</span>
        </div>
        ${b.origin_note?`<div style="font-size:13px;color:var(--ink-soft);font-style:italic;margin-top:6px;">Sự kiện gốc: ${esc(b.origin_note)}</div>`:''}
        ${b.new_belief?`<div class="hint-box" style="margin-top:8px;">🌱 Niềm tin mới: "${esc(b.new_belief)}"</div>`:
          state.justAddedId===b.id ? `
            <div class="hint-box" style="margin-top:10px;">💛 ${esc(state.lastReframe)}</div>
            <label style="display:block;font-size:12.5px;color:var(--ink-soft);margin:8px 0 4px;">Niềm tin MỚI bạn muốn thay vào (viết đúng lời của bạn)</label>
            <textarea data-new-belief-input="${b.id}" placeholder="VD: Tiền đến với tôi dễ dàng khi tôi tạo ra giá trị thật...">${esc(state.newBeliefDraft)}</textarea>
            <button class="btn btn-sm" style="margin-top:8px;" data-save-new-belief="${b.id}">Lưu niềm tin mới</button>
          ` : ''}
        <div style="display:flex;gap:8px;margin-top:10px;">
          ${b.still_active?`<span class="btn-ghost btn btn-sm" data-resolve="${b.id}" style="padding:5px 10px;font-size:12px;">Đánh dấu đã chuyển hoá</span>`:''}
          <span class="btn-ghost btn btn-sm" data-delete-belief="${b.id}" style="padding:5px 10px;font-size:12px;">Xoá</span>
        </div>
      </div>
    `;
  }

  function html(){
    return `
      <div class="page-head">
        <h1>Hạt Giống Phước - Nghiệp</h1>
        <p>${glossaryWrap('Sổ Niềm Tin Cũ Về Tiền', 'tang_thuc')} — nơi ghi lại gốc rễ đang nuôi các Nút Chặn Dòng Tiền bạn hay gặp ở <a href="#kien-thuc" style="color:var(--accent);font-weight:600;">Kiến Thức Nền Tảng →</a>. Mỗi niềm tin còn "Đang chi phối" sẽ kéo nhẹ Trụ Tài Chính Tâm Thức ở <a href="#trang-chu" style="color:var(--accent);font-weight:600;">Điểm Nghiệp Trang chủ →</a> xuống — đánh dấu "Đã chuyển hoá" khi bạn thật sự không còn thấy nó chi phối nữa, để Điểm Nghiệp phản ánh đúng con người bạn bây giờ.</p>
      </div>

      ${state.loading ? `<div class="loading"><div class="spinner"></div></div>` : `
        <div class="section">
          <h3>Ghi lại 1 niềm tin cũ</h3>
          ${state.incomingContext ? `<div class="hint-box" style="margin-bottom:14px;">${state.incomingContext.justSaved ? `✓ Đã tự động lưu 1 hạt giống về khâu <b>${esc(state.incomingContext.areaLabel)}</b> (bài Chấm Điểm Nghiệp Tiền vừa chỉ ra đây là khâu yếu nhất) vào sổ bên dưới — sửa lại câu chữ cho đúng cảm nhận thật của bạn bất cứ lúc nào.` : `Bài Chấm Điểm Nghiệp Tiền vừa chỉ ra khâu <b>${esc(state.incomingContext.areaLabel)}</b> đang yếu nhất — thử viết xem có niềm tin cũ nào từ nhỏ đang đứng sau phản ứng đó không.`}</div>` : ''}
          <label style="display:block;font-size:13px;font-weight:600;color:var(--ink-soft);margin-bottom:6px;">Niềm tin cũ về tiền bạn đang mang là gì?</label>
          <textarea id="tt2-belief" placeholder="VD: Tiền là thứ khó kiếm, phải vất vả cả đời mới có được...">${esc(state.form.belief_text)}</textarea>

          <label style="display:block;font-size:13px;font-weight:600;color:var(--ink-soft);margin:14px 0 6px;">Sự kiện cụ thể nào trong quá khứ khiến bạn tin điều này? <span style="font-weight:400;">(không bắt buộc)</span></label>
          <div style="font-size:12.5px;color:var(--ink-soft);margin-bottom:8px;">Chưa nhớ ra rõ ràng? Bấm thử 1 gợi ý quen thuộc dưới đây để bắt đầu:</div>
          <div class="chips" id="tt2-origin-pattern-chips" style="margin-bottom:10px;">
            ${ORIGIN_EVENT_PATTERNS.map(p=>`<div class="chip ${state.selectedOriginPattern===p.key?'selected':''}" data-origin-pattern="${p.key}">${esc(p.label)}</div>`).join('')}
          </div>
          ${state.selectedOriginPattern ? `<div class="hint-box" style="margin-bottom:10px;">${esc(ORIGIN_EVENT_PATTERNS.find(p=>p.key===state.selectedOriginPattern).analysis)}</div>` : ''}
          <textarea id="tt2-origin" placeholder="VD: Năm 10 tuổi, thấy bố mẹ cãi nhau vì tiền, nghe mẹ nói 'nhà mình nghèo lắm'...">${esc(state.form.origin_note)}</textarea>

          <label style="display:block;font-size:13px;font-weight:600;color:var(--ink-soft);margin:14px 0 6px;">Niềm tin này thường hiện rõ nhất ở đâu? <span style="font-weight:400;">(không bắt buộc)</span></label>
          <div class="chips" id="tt2-nutchan-chips">
            ${[1,2,3,4].map(n=>`<div class="chip ${state.form.linked_nut_chan===n?'selected':''}" data-nutchan="${n}">${esc(NUT_CHAN_LABELS[n])}</div>`).join('')}
          </div>

          <button class="btn btn-full" style="margin-top:16px;" id="tt2-submit" ${state.saving?'disabled':''}>${state.saving?'Đang lưu…':'Ghi lại niềm tin này'}</button>
        </div>

        <div class="section">
          <h3>Sổ niềm tin đã ghi (${state.beliefs.length})</h3>
          ${state.beliefs.length===0 ? `<p style="color:var(--ink-soft);font-size:13.5px;">Chưa có niềm tin nào được ghi lại.</p>` : `
            <div style="display:flex;flex-direction:column;gap:12px;margin-top:12px;">
              ${state.beliefs.map(beliefCardHtml).join('')}
            </div>
          `}
        </div>
      `}
    `;
  }

  function bind(){
    const beliefEl = container.querySelector('#tt2-belief');
    if(beliefEl) beliefEl.oninput = (e)=>{ state.form.belief_text = e.target.value; persistDraft(); };
    const originEl = container.querySelector('#tt2-origin');
    if(originEl) originEl.oninput = (e)=>{ state.form.origin_note = e.target.value; persistDraft(); };
    const originPatternChips = container.querySelector('#tt2-origin-pattern-chips');
    if(originPatternChips) originPatternChips.querySelectorAll('[data-origin-pattern]').forEach(el=>{
      el.onclick = ()=>{
        const key = el.getAttribute('data-origin-pattern');
        state.selectedOriginPattern = key;
        if(!state.form.origin_note.trim()) state.form.origin_note = ORIGIN_EVENT_PATTERNS.find(p=>p.key===key).seed;
        draw();
        persistDraft();
      };
    });
    const nutChanChips = container.querySelector('#tt2-nutchan-chips');
    if(nutChanChips) nutChanChips.querySelectorAll('[data-nutchan]').forEach(el=>{
      el.onclick = ()=>{
        const n = Number(el.getAttribute('data-nutchan'));
        state.form.linked_nut_chan = state.form.linked_nut_chan===n ? null : n;
        draw();
        persistDraft();
      };
    });
    const submitBtn = container.querySelector('#tt2-submit');
    if(submitBtn) submitBtn.onclick = submitBelief;

    container.querySelectorAll('[data-new-belief-input]').forEach(el=>{
      el.oninput = (e)=>{ state.newBeliefDraft = e.target.value; };
    });
    container.querySelectorAll('[data-save-new-belief]').forEach(el=>{
      el.onclick = ()=>{ saveNewBelief(el.getAttribute('data-save-new-belief')); };
    });
    container.querySelectorAll('[data-resolve]').forEach(el=>{
      el.onclick = ()=>{ markResolved(el.getAttribute('data-resolve')); };
    });
    container.querySelectorAll('[data-delete-belief]').forEach(el=>{
      el.onclick = ()=>{ deleteBelief(el.getAttribute('data-delete-belief')); };
    });
  }

  load();
}

window.Modules = window.Modules || {};
window.Modules['tang-thuc'] = { title:'Hạt Giống Phước - Nghiệp', render };
})();
