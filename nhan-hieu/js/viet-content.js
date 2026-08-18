(function(){
function render(container, ctx){
  const state = { screen:'loading', positioning:null, quickContext:'', ideaText:'', ideaId:null, result:null, error:null, generating:false, recentPosts:[], savedId:null,
    showExtra:false, channelHandle:'', brandName:'', assets:[], productChoice:'', groupChoice:'', productNameOther:'', groupNameOther:'' };

  function draw(){ container.innerHTML = html(); bind(); }

  async function boot(){
    draw();
    const { data: pos } = await ctx.supabase.from('positioning_results').select('*').eq('user_id', ctx.user.id).maybeSingle();
    state.positioning = (pos && pos.luot1) ? pos : null;
    state.channelHandle = (ctx.profile && ctx.profile.channel_handle) || '';
    state.brandName = (ctx.profile && ctx.profile.brand_name) || '';
    if(window.PendingTopic){ state.ideaText = window.PendingTopic; window.PendingTopic = null; }
    await Promise.all([loadRecent(), loadAssets()]);
    state.screen='main';
    draw();
  }

  async function loadAssets(){
    const { data } = await ctx.supabase.from('promo_assets').select('*').eq('user_id', ctx.user.id).order('created_at', { ascending:true });
    state.assets = data || [];
  }

  function resolvedProductName(){
    if(state.productChoice==='other') return state.productNameOther;
    if(state.productChoice) return (state.assets.find(a=>a.id===state.productChoice)||{}).label || '';
    return '';
  }
  function resolvedGroupName(){
    if(state.groupChoice==='other') return state.groupNameOther;
    if(state.groupChoice) return (state.assets.find(a=>a.id===state.groupChoice)||{}).label || '';
    return '';
  }

  async function loadRecent(){
    const { data } = await ctx.supabase.from('posts').select('*').eq('user_id', ctx.user.id).order('created_at', { ascending:false }).limit(10);
    state.recentPosts = data || [];
  }

  function html(){
    if(state.screen==='loading') return `<div class="loading"><div class="spinner"></div><p>Đang tải…</p></div>`;

    return `
      <div class="page-head"><div class="tag">Bước 4 · Viết Content</div><h1>Viết bài tự động</h1>
      <p>Nhập chủ đề/ý tưởng, hoặc bấm "Viết →" từ 1 ý tưởng ở bước khác — AI sẽ viết bài đầy đủ.</p></div>
      ${!state.positioning ? `<div class="hint-box">Chưa có Định Vị đã lưu — vẫn viết được bình thường, nhưng nếu <a href="#dinh-vi">làm Định Vị trước</a>, bài viết sẽ đúng giọng văn và đối tượng của bạn hơn.</div>` : ''}
      <div class="card">
        <label style="display:block;font-size:13px;font-weight:600;color:var(--ink-soft);margin-bottom:6px;">Chủ đề / ý tưởng muốn viết</label>
        <textarea id="idea-input" placeholder="Ví dụ: 3 sai lầm khiến dòng tiền cá nhân bị nghẽn...">${esc(state.ideaText)}</textarea>
        ${!state.positioning ? `
          <label style="display:block;font-size:13px;font-weight:600;color:var(--ink-soft);margin:14px 0 6px;">Ngành/lĩnh vực &amp; đối tượng của bạn (không bắt buộc, giúp bài viết sát hơn)</label>
          <textarea id="quick-context" style="min-height:auto;height:52px;" placeholder="Ví dụ: Coach tài chính cá nhân, hướng tới người mới đi làm...">${esc(state.quickContext)}</textarea>
        ` : ''}
        <div style="margin-top:10px;">
          <span style="color:var(--accent);font-size:13px;cursor:pointer;font-weight:600;" data-action="toggle-extra">${state.showExtra?'▾':'▸'} Tuỳ chọn thêm (tên kênh, sản phẩm, group — để ghép hashtag & CTA chính xác hơn)</span>
        </div>
        ${state.showExtra ? `
          <div style="margin-top:12px;display:flex;flex-direction:column;gap:10px;">
            <div>
              <label style="display:block;font-size:12.5px;font-weight:600;color:var(--ink-soft);margin-bottom:5px;">Tên kênh Facebook/TikTok</label>
              <textarea id="ex-channel" style="min-height:auto;height:40px;" placeholder="Ví dụ: Tú Quỳnh">${esc(state.channelHandle)}</textarea>
              <div style="margin-top:4px;font-size:11.5px;color:var(--ink-soft);">Lưu ở đây sẽ tự cập nhật vào Định Vị luôn, dùng chung cho các bài sau.</div>
            </div>
            ${state.brandName ? `
            <div>
              <label style="display:block;font-size:12.5px;font-weight:600;color:var(--ink-soft);margin-bottom:5px;">Thương hiệu/Tên sản phẩm</label>
              <div style="font-size:13.5px;">${esc(state.brandName)} <a href="#dinh-vi" style="font-size:11.5px;color:var(--ink-soft);">(sửa ở Định Vị)</a></div>
            </div>
            ` : ''}
            <div>
              <label style="display:block;font-size:12.5px;font-weight:600;color:var(--ink-soft);margin-bottom:5px;">Sản phẩm/dịch vụ muốn nhắc (nếu có)</label>
              <select id="ex-product-select">
                <option value="">— Không nhắc —</option>
                ${state.assets.filter(a=>['san_pham_so','aff_cua_toi','aff_nguoi_khac'].includes(a.kind)).map(a=>`<option value="${a.id}" ${state.productChoice===a.id?'selected':''}>${esc(a.label)}</option>`).join('')}
                <option value="other" ${state.productChoice==='other'?'selected':''}>Khác (tự nhập)</option>
              </select>
              ${state.productChoice==='other'?`<textarea id="ex-product-other" style="min-height:auto;height:40px;margin-top:8px;" placeholder="Ví dụ: Sổ tay Dòng Tiền">${esc(state.productNameOther)}</textarea>`:''}
              ${state.assets.length===0?`<div style="margin-top:4px;font-size:11.5px;color:var(--ink-soft);">Chưa có tài sản nào — thêm ở mục <a href="#dinh-vi">Định Vị</a> để lần sau chọn nhanh.</div>`:''}
            </div>
            <div>
              <label style="display:block;font-size:12.5px;font-weight:600;color:var(--ink-soft);margin-bottom:5px;">Group/cộng đồng muốn nhắc (nếu có)</label>
              <select id="ex-group-select">
                <option value="">— Không nhắc —</option>
                ${state.assets.filter(a=>a.kind==='cong_dong').map(a=>`<option value="${a.id}" ${state.groupChoice===a.id?'selected':''}>${esc(a.label)}</option>`).join('')}
                <option value="other" ${state.groupChoice==='other'?'selected':''}>Khác (tự nhập)</option>
              </select>
              ${state.groupChoice==='other'?`<textarea id="ex-group-other" style="min-height:auto;height:40px;margin-top:8px;" placeholder="Ví dụ: Cộng Đồng Tâm Thức Thịnh Vượng">${esc(state.groupNameOther)}</textarea>`:''}
            </div>
          </div>
        ` : ''}
        <div class="btn-row"><button class="btn" data-action="generate" ${state.generating?'disabled':''}>${state.generating?'Đang viết…':'Viết bài'}</button></div>
        ${state.error?`<div class="error-box">${esc(state.error)}</div>`:''}
      </div>

      ${state.result ? resultHtml() : ''}

      <div style="margin-top:28px;">
        <h3 style="font-family:'IBM Plex Mono',monospace;font-size:13px;color:var(--ink-soft);text-transform:uppercase;letter-spacing:.05em;margin-bottom:12px;">Bài đã viết gần đây</h3>
        ${state.recentPosts.length===0?`<div style="color:var(--ink-soft);font-size:14px;">Chưa có bài nào được lưu.</div>`:''}
        ${state.recentPosts.map(p=>`
          <div class="list-item">
            <div class="txt"><b>${esc(p.title||'(không tiêu đề)')}</b><br><span style="color:var(--ink-soft);font-size:13px;">${esc((p.content||'').slice(0,120))}${(p.content||'').length>120?'…':''}</span></div>
            <button class="btn btn-sm" data-schedule="${p.id}">Đưa vào lịch →</button>
          </div>
        `).join('')}
      </div>
    `;
  }

  function resultHtml(){
    const r = state.result;
    return `
      <div class="section highlight"><h3>${esc(r.tieu_de)}</h3><div class="body">${esc(r.bai_hoan_chinh)}</div></div>
      <div class="section"><h3>Cấu trúc bài</h3>
        <div class="body"><b>Hook:</b> ${esc(r.hook)}</div>
        <div class="body" style="margin-top:8px;"><b>Vấn đề:</b> ${esc(r.van_de)}</div>
        <div class="body" style="margin-top:8px;"><b>Giá trị:</b> ${esc(r.gia_tri)}</div>
        <div class="body" style="margin-top:8px;"><b>Niềm tin:</b> ${esc(r.niem_tin)}</div>
        <div class="body" style="margin-top:8px;"><b>CTA:</b> ${esc(r.cta)}${r.tu_khoa_cta?` <span style="display:inline-block;margin-left:4px;padding:2px 9px;border-radius:999px;background:var(--gold);color:#1E2420;font-size:12px;font-weight:700;">${esc(r.tu_khoa_cta)}</span>`:''}</div>
      </div>
      <div class="section"><h3>Bình luận ghim</h3><div class="body">${esc(r.cau_cmt_ghim||'')}</div></div>
      ${(r.cmt_cta_san_pham && r.cmt_cta_san_pham.length) ? `
        <div class="section"><h3>Bình luận CTA sản phẩm/group</h3>
          <ul>${r.cmt_cta_san_pham.map(c=>`<li>${esc(c)}</li>`).join('')}</ul>
        </div>` : ''}
      <div class="section"><h3>Hashtag (5)</h3><div class="body">${(r.hashtag||[]).map(h=>'#'+h.replace(/^#/,'')).join(' ')}</div></div>
      <div class="section"><h3>Gợi ý hình ảnh/video</h3><div class="body">${esc(r.goi_y_hinh_anh)}</div></div>
      <div class="section highlight"><h3>Dạng content phù hợp nhất</h3>
        <div class="body" style="font-weight:700;margin-bottom:6px;">${esc(r.dinh_dang_de_xuat)}</div>
        <div class="body">${esc(r.ly_do_dinh_dang)}</div>
      </div>
      <div class="btn-row no-print" style="margin-top:-6px;margin-bottom:10px;">
        <a class="btn-ghost btn" href="#dinh-dang-content">Xem cách làm dạng này →</a>
      </div>
      <div class="btn-row no-print">
        <button class="btn" data-action="save">${state.savedId?'Đã lưu vào thư viện ✓':'Lưu vào thư viện bài viết'}</button>
        ${state.savedId?`<a class="btn-ghost btn" href="#lich-dang">Đưa vào Lịch Đăng Bài →</a>`:''}
      </div>
    `;
  }

  function bind(){
    const ideaInput = container.querySelector('#idea-input');
    if(ideaInput) ideaInput.oninput = ()=>{ state.ideaText = ideaInput.value; };

    const quickContext = container.querySelector('#quick-context');
    if(quickContext) quickContext.oninput = ()=>{ state.quickContext = quickContext.value; };

    const toggleExtra = container.querySelector('[data-action="toggle-extra"]');
    if(toggleExtra) toggleExtra.onclick = ()=>{ state.showExtra = !state.showExtra; draw(); };

    const exChannel = container.querySelector('#ex-channel');
    if(exChannel) exChannel.oninput = ()=>{ state.channelHandle = exChannel.value; };
    exChannel && exChannel.addEventListener('blur', saveChannelHandleIfChanged);

    const exProductSelect = container.querySelector('#ex-product-select');
    if(exProductSelect) exProductSelect.onchange = ()=>{ state.productChoice = exProductSelect.value; draw(); };
    const exProductOther = container.querySelector('#ex-product-other');
    if(exProductOther) exProductOther.oninput = ()=>{ state.productNameOther = exProductOther.value; };

    const exGroupSelect = container.querySelector('#ex-group-select');
    if(exGroupSelect) exGroupSelect.onchange = ()=>{ state.groupChoice = exGroupSelect.value; draw(); };
    const exGroupOther = container.querySelector('#ex-group-other');
    if(exGroupOther) exGroupOther.oninput = ()=>{ state.groupNameOther = exGroupOther.value; };

    const genBtn = container.querySelector('[data-action="generate"]');
    if(genBtn) genBtn.onclick = generate;

    const saveBtn = container.querySelector('[data-action="save"]');
    if(saveBtn) saveBtn.onclick = save;

    container.querySelectorAll('[data-schedule]').forEach(el=>{
      el.onclick = ()=>{
        const id = el.getAttribute('data-schedule');
        window.PendingPost = state.recentPosts.find(p=>p.id===id);
        location.hash = 'lich-dang';
      };
    });
  }

  async function saveChannelHandleIfChanged(){
    const current = (ctx.profile && ctx.profile.channel_handle) || '';
    if(state.channelHandle === current) return;
    const { error } = await ctx.supabase.rpc('update_my_channel_handle', { new_handle: state.channelHandle.trim() || null });
    if(!error && ctx.profile) ctx.profile.channel_handle = state.channelHandle.trim() || null;
  }

  async function generate(){
    if(!state.ideaText.trim()) return;
    state.generating = true; state.error = null; state.result = null; state.savedId = null; draw();
    try{
      const data = await callApi('/api/viet-content', {
        positioning: state.positioning ? { luot1: state.positioning.luot1, luot2: state.positioning.luot2 } : null,
        quick_context: state.quickContext,
        idea_text: state.ideaText,
        channel_handle: state.channelHandle,
        brand_name: state.brandName,
        product_name: resolvedProductName(),
        group_name: resolvedGroupName(),
      });
      state.result = data.result;
      state.generating = false; draw();
    } catch(e){ state.error = e.message; state.generating = false; draw(); }
  }

  async function save(){
    if(!state.result || state.savedId) return;
    const r = state.result;
    const { data, error } = await ctx.supabase.from('posts').insert({
      user_id: ctx.user.id,
      idea_id: state.ideaId,
      title: r.tieu_de,
      content: r.bai_hoan_chinh,
      structure: { hook:r.hook, van_de:r.van_de, gia_tri:r.gia_tri, niem_tin:r.niem_tin, cta:r.cta, tu_khoa_cta:r.tu_khoa_cta, cau_cmt_ghim:r.cau_cmt_ghim, cmt_cta_san_pham:r.cmt_cta_san_pham, hashtag:r.hashtag, goi_y_hinh_anh:r.goi_y_hinh_anh, format: r.dinh_dang_de_xuat },
    }).select().single();
    if(error){ state.error = error.message; draw(); return; }
    state.savedId = data.id;
    if(state.ideaId) await ctx.supabase.from('ideas').update({ used:true }).eq('id', state.ideaId);
    await loadRecent();
    draw();
  }

  boot();
}

window.Modules = window.Modules || {};
window.Modules['viet-content'] = { title:'Viết Content', render };
})();
