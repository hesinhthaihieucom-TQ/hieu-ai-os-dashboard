(function(){
const MILESTONES = [
  { key:'m1', label:'Trước 1.000 view', hint:'Kích cmt đầu tiên, chưa gắn link' },
  { key:'m2', label:'Đạt 10.000 view', hint:'Bắt đầu dẫn nhẹ' },
  { key:'m3', label:'Đạt 100.000 view', hint:'Dẫn về tài sản có giá trị hơn' },
  { key:'m4', label:'Đạt 1 triệu view', hint:'CTA mạnh, chuyển đổi' },
  { key:'m5', label:'Trên 1 triệu view', hint:'Tối đa hoá chuyển đổi' },
];
const ASSET_KINDS = {
  san_pham_so: 'Sản phẩm số của tôi', aff_nguoi_khac: 'Aff sản phẩm người khác',
  aff_cua_toi: 'Aff của tôi', cong_dong: 'Link cộng đồng', khac: 'Khác',
};

function render(container, ctx){
  const state = {
    screen:'loading', positioning:null, assets:[],
    newAsset:{ label:'', url:'', kind:'san_pham_so' },
    topic:'', milestone:'m1', quickContext:'',
    generating:false, error:null, result:null,
  };

  function draw(){ container.innerHTML = html(); bind(); }

  async function boot(){
    draw();
    const { data: pos } = await ctx.supabase.from('positioning_results').select('*').eq('user_id', ctx.user.id).maybeSingle();
    state.positioning = (pos && pos.luot1) ? pos : null;
    await loadAssets();
    state.screen = 'main';
    draw();
  }

  async function loadAssets(){
    const { data } = await ctx.supabase.from('promo_assets').select('*').eq('user_id', ctx.user.id).order('created_at', { ascending:true });
    state.assets = data || [];
  }

  function html(){
    if(state.screen==='loading') return `<div class="loading"><div class="spinner"></div><p>Đang tải…</p></div>`;
    return `
      <div class="page-head"><h1>Đẩy Bài &amp; CTA Comment</h1><p>Gợi ý bình luận tự đăng, cách trả lời bình luận, và tài sản nên gắn — đúng theo mốc lượt xem bài đang lên.</p></div>

      <div class="card">
        <h3 style="margin-bottom:10px;">Tài sản quảng bá của bạn</h3>
        ${state.assets.length===0?`<div style="color:var(--ink-soft);font-size:13.5px;margin-bottom:12px;">Chưa có tài sản nào — thêm sản phẩm số, link aff, hoặc link cộng đồng để AI gợi ý gắn đúng lúc.</div>`:''}
        ${state.assets.map(a=>`
          <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid var(--line);font-size:13.5px;">
            <div><b>${esc(a.label)}</b> <span style="color:var(--ink-soft);">(${esc(ASSET_KINDS[a.kind]||a.kind||'')})</span>${a.url?`<br><span style="color:var(--ink-soft);font-size:12px;">${esc(a.url)}</span>`:''}</div>
            <span style="color:var(--danger);cursor:pointer;font-size:12px;" data-del-asset="${a.id}">Xoá</span>
          </div>
        `).join('')}
        <div style="margin-top:14px;display:flex;flex-direction:column;gap:8px;">
          <textarea id="na-label" style="min-height:auto;height:40px;" placeholder="Tên tài sản, ví dụ: Khoá học Sổ Dòng Tiền">${esc(state.newAsset.label)}</textarea>
          <textarea id="na-url" style="min-height:auto;height:40px;" placeholder="Link (không bắt buộc)">${esc(state.newAsset.url)}</textarea>
          <select id="na-kind">
            ${Object.entries(ASSET_KINDS).map(([k,v])=>`<option value="${k}" ${state.newAsset.kind===k?'selected':''}>${esc(v)}</option>`).join('')}
          </select>
          <div class="btn-row" style="margin-top:2px;"><button class="btn btn-sm" data-action="add-asset">Thêm tài sản</button></div>
        </div>
      </div>

      <div class="card" style="margin-top:16px;">
        <label style="display:block;font-size:13px;font-weight:600;color:var(--ink-soft);margin-bottom:6px;">Bài đang đẩy (chủ đề/nội dung ngắn gọn)</label>
        <textarea id="db-topic" placeholder="Ví dụ: bài kể chuyện khách hàng thoát nợ 700 triệu nhờ tăng thu nhập">${esc(state.topic)}</textarea>

        ${!(state.positioning) ? `
          <label style="display:block;font-size:13px;font-weight:600;color:var(--ink-soft);margin:14px 0 6px;">Ngành/đối tượng (không bắt buộc)</label>
          <textarea id="db-quick-context" style="min-height:auto;height:44px;" placeholder="Ví dụ: Coach tài chính cá nhân...">${esc(state.quickContext)}</textarea>
        ` : ''}

        <label style="display:block;font-size:13px;font-weight:600;color:var(--ink-soft);margin:14px 0 6px;">Mốc lượt xem hiện tại</label>
        <div class="chips">
          ${MILESTONES.map(m=>`<div class="chip ${state.milestone===m.key?'selected':''}" data-milestone="${m.key}">${esc(m.label)}</div>`).join('')}
        </div>
        <div style="margin-top:8px;font-size:12.5px;color:var(--ink-soft);">${esc((MILESTONES.find(m=>m.key===state.milestone)||{}).hint||'')}</div>

        <div class="btn-row"><button class="btn" data-action="generate" ${state.generating?'disabled':''}>${state.generating?'Đang gợi ý…':'Gợi ý đẩy bài'}</button></div>
        ${state.error?`<div class="error-box">${esc(state.error)}</div>`:''}
      </div>

      ${state.result ? resultHtml() : ''}
    `;
  }

  function resultHtml(){
    const r = state.result;
    return `
      <div class="section highlight"><h3>Trọng tâm mốc này</h3><div class="body">${esc(r.chien_luoc_moc_nay)}</div></div>
      <div class="section"><h3>Bình luận tự đăng / ghim</h3><div class="body">${esc(r.cmt_tu_dang)}</div></div>
      <div class="section"><h3>Gợi ý trả lời bình luận người khác</h3>
        <ul>${r.goi_y_tra_loi_cmt.map(c=>`<li>${esc(c)}</li>`).join('')}</ul>
      </div>
      <div class="section"><h3>Tài sản nên gắn</h3>
        <div class="body">${r.tai_san_de_xuat.label ? `<b>${esc(r.tai_san_de_xuat.label)}</b><br>` : `<i>Chưa nên gắn tài sản nào</i><br>`}${esc(r.tai_san_de_xuat.ly_do)}</div>
      </div>
    `;
  }

  function bind(){
    const nl = container.querySelector('#na-label'); if(nl) nl.oninput = ()=>state.newAsset.label = nl.value;
    const nu = container.querySelector('#na-url'); if(nu) nu.oninput = ()=>state.newAsset.url = nu.value;
    const nk = container.querySelector('#na-kind'); if(nk) nk.onchange = ()=>state.newAsset.kind = nk.value;
    const addAssetBtn = container.querySelector('[data-action="add-asset"]');
    if(addAssetBtn) addAssetBtn.onclick = addAsset;
    container.querySelectorAll('[data-del-asset]').forEach(el=>{
      el.onclick = async ()=>{
        await ctx.supabase.from('promo_assets').delete().eq('id', el.getAttribute('data-del-asset'));
        await loadAssets(); draw();
      };
    });

    const topicEl = container.querySelector('#db-topic'); if(topicEl) topicEl.oninput = ()=>state.topic = topicEl.value;
    const qcEl = container.querySelector('#db-quick-context'); if(qcEl) qcEl.oninput = ()=>state.quickContext = qcEl.value;
    container.querySelectorAll('[data-milestone]').forEach(el=>{
      el.onclick = ()=>{ state.milestone = el.getAttribute('data-milestone'); draw(); };
    });
    const genBtn = container.querySelector('[data-action="generate"]');
    if(genBtn) genBtn.onclick = generate;
  }

  async function addAsset(){
    if(!state.newAsset.label.trim()) return;
    await ctx.supabase.from('promo_assets').insert({
      user_id: ctx.user.id, label: state.newAsset.label, url: state.newAsset.url || null, kind: state.newAsset.kind,
    });
    state.newAsset = { label:'', url:'', kind:'san_pham_so' };
    await loadAssets();
    draw();
  }

  async function generate(){
    if(!state.topic.trim()) return;
    state.generating = true; state.error = null; state.result = null; draw();
    try{
      const data = await callApi('/api/goi-y-day-bai', {
        topic: state.topic,
        milestone: state.milestone,
        assets: state.assets.map(a=>({ label:a.label, url:a.url })),
        positioning: state.positioning ? { luot1: state.positioning.luot1, luot2: state.positioning.luot2 } : null,
        quick_context: state.quickContext,
      });
      state.result = data.result;
    } catch(e){ state.error = e.message; }
    state.generating = false; draw();
  }

  boot();
}
window.Modules = window.Modules || {};
window.Modules['day-bai'] = { title:'Đẩy Bài & CTA Comment', render };
})();
