(function(){
function render(container, ctx){
  const state = { screen:'loading', positioning:null, quickContext:'', ideaText:'', ideaId:null, result:null, error:null, generating:false, recentPosts:[], savedId:null,
    showExtra:false, channelHandle:'', brands:[], brandChoice:'', assets:[], productChoice:'', groupChoice:'', productNameOther:'', groupNameOther:'',
    score:null, scoring:false, scoreError:null, khoGocSource:null, cauChuyenRieng:'' };

  function draw(){ container.innerHTML = html(); bind(); }

  async function boot(){
    draw();
    const { data: pos } = await ctx.supabase.from('positioning_results').select('*').eq('user_id', ctx.user.id).maybeSingle();
    state.positioning = (pos && pos.luot1) ? pos : null;
    state.channelHandle = (ctx.profile && ctx.profile.channel_handle) || '';
    state.cauChuyenRieng = (ctx.profile && ctx.profile.cau_chuyen_rieng) || '';
    if(window.PendingKhoGoc){ state.khoGocSource = window.PendingKhoGoc; window.PendingKhoGoc = null; }
    else if(window.PendingTopic){ state.ideaText = window.PendingTopic; window.PendingTopic = null; }
    await Promise.all([loadRecent(), loadAssets(), loadBrands()]);
    state.screen='main';
    draw();
  }

  async function loadAssets(){
    const { data } = await ctx.supabase.from('promo_assets').select('*').eq('user_id', ctx.user.id).order('created_at', { ascending:true });
    state.assets = data || [];
  }

  async function loadBrands(){
    const { data } = await ctx.supabase.from('brands').select('*').eq('user_id', ctx.user.id).order('created_at', { ascending:true });
    state.brands = data || [];
    if(state.brands.length===1) state.brandChoice = state.brands[0].id;
  }

  function resolvedBrandName(){
    const b = state.brands.find(x=>x.id===state.brandChoice);
    return b ? b.name : '';
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
        ${state.khoGocSource ? `
          <div class="hint-box">Đang viết từ 1 bài trong <b>Kho Content</b> — sẽ <b>giữ nguyên hook, tiêu đề và cấu trúc gốc</b> (đây là cấu trúc đã kiểm chứng viral), chỉ cá nhân hoá ~20% bằng câu chuyện của bạn. <span style="cursor:pointer;text-decoration:underline;" data-action="cancel-kho-goc">Huỷ, viết bài mới thay vì giữ nguyên →</span></div>
          <label style="display:block;font-size:13px;font-weight:600;color:var(--ink-soft);margin:14px 0 6px;">Bài gốc (tham khảo, sẽ không đổi hook/tiêu đề)</label>
          <div class="body" style="max-height:160px;overflow-y:auto;background:var(--accent-soft);padding:12px;border-radius:8px;font-size:13px;">${esc(state.khoGocSource)}</div>
          <label style="display:block;font-size:13px;font-weight:600;color:var(--ink-soft);margin:14px 0 6px;">Câu chuyện riêng của bạn (chèn ~20% vào bài)</label>
          ${state.cauChuyenRieng ? `
            <div class="body" style="background:var(--panel);border:1px solid var(--line);padding:12px;border-radius:8px;font-size:13px;">${esc(state.cauChuyenRieng)}</div>
            <div style="margin-top:4px;font-size:11.5px;color:var(--ink-soft);">Lấy từ <a href="#dinh-vi">Định Vị</a> — sửa ở đó nếu muốn dùng câu chuyện khác.</div>
          ` : `
            <div class="hint-box">Chưa có câu chuyện nào được lưu — sang <a href="#dinh-vi">Định Vị</a> điền mục "Câu chuyện của bạn" trước, rồi quay lại đây bấm tạo lại.</div>
          `}
        ` : `
        <label style="display:block;font-size:13px;font-weight:600;color:var(--ink-soft);margin-bottom:6px;">Chủ đề / ý tưởng muốn viết</label>
        <textarea id="idea-input" placeholder="Ví dụ: 3 sai lầm khiến dòng tiền cá nhân bị nghẽn...">${esc(state.ideaText)}</textarea>
        `}
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
            ${state.brands.length ? `
            <div>
              <label style="display:block;font-size:12.5px;font-weight:600;color:var(--ink-soft);margin-bottom:5px;">Thương hiệu dùng cho bài này</label>
              <select id="ex-brand-select">
                <option value="">— Không ghép thương hiệu —</option>
                ${state.brands.map(b=>`<option value="${b.id}" ${state.brandChoice===b.id?'selected':''}>${esc(b.name)}</option>`).join('')}
              </select>
              <div style="margin-top:4px;font-size:11.5px;color:var(--ink-soft);">Thêm/sửa thương hiệu ở <a href="#dinh-vi">Định Vị</a>.</div>
            </div>
            ` : ''}
            <div>
              <label style="display:block;font-size:12.5px;font-weight:600;color:var(--ink-soft);margin-bottom:5px;">Sản phẩm/dịch vụ muốn nhắc (nếu có)</label>
              <select id="ex-product-select">
                <option value="">— Không nhắc —</option>
                ${state.assets.filter(a=>['san_pham_so','khoa_hoc','aff_cua_toi','aff_nguoi_khac'].includes(a.kind)).map(a=>`<option value="${a.id}" ${state.productChoice===a.id?'selected':''}>${esc(a.label)}</option>`).join('')}
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
        <div class="btn-row"><button class="btn" data-action="generate" ${state.generating?'disabled':''}>${state.generating?'Đang viết…':(state.khoGocSource?'Cá nhân hoá bài này':'Viết bài')}</button></div>
        <div class="hint-box" style="margin-top:10px;">AI viết xong sẽ tự chấm điểm &amp; gợi ý bản tối ưu hơn ngay bên dưới — tổng thời gian khoảng 1-2 phút, đừng thoát trang khi đang đợi.</div>
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

  function scoreSectionHtml(){
    if(state.scoring) return `<div class="section" style="text-align:center;color:var(--ink-soft);">Đang chấm điểm &amp; tìm chỗ tối ưu…</div>`;
    if(state.scoreError) return `<div class="error-box">Không chấm điểm được: ${esc(state.scoreError)}</div>`;
    if(!state.score) return '';
    const s = state.score;
    return `
      <div class="section highlight">
        <h3>Chấm điểm &amp; tối ưu tự động</h3>
        <div class="body" style="font-size:28px;font-weight:700;">${s.diem_tong}<span style="font-size:14px;">/100</span>
          <span style="font-size:13px;font-weight:400;color:var(--ink-soft);margin-left:8px;">${esc(s.tang_noi_dung)} · ${esc(s.loai_content)}</span>
        </div>
      </div>
      ${(s.tieu_chi||[]).filter(t=>t.diem<8).map(t=>`
        <div class="section"><h3>${esc(t.ten)} — ${t.diem}/10</h3>
          <div class="body">${esc(t.nhan_xet)}</div>
          <div class="body" style="margin-top:8px;background:var(--accent-soft);padding:12px;border-radius:8px;"><b>Gợi ý sửa:</b> ${esc(t.goi_y_sua)}</div>
        </div>
      `).join('')}
      <div class="section"><h3>Bản sửa đề xuất (tối ưu hơn)</h3><div class="body">${esc(s.ban_sua_de_xuat)}</div></div>
      <div class="btn-row no-print"><a class="btn-ghost btn" href="#cham-diem-content">Xem chi tiết đầy đủ ở Chấm Điểm Content →</a></div>
    `;
  }

  function resultHtml(){
    const r = state.result;
    return `
      ${(r.cau_chuyen_qua_chung_chung && (r.cau_hoi_lam_ro||[]).length) ? `
        <div class="section highlight-dark">
          <h3>Câu chuyện của bạn còn hơi chung chung</h3>
          <div class="body">AI vẫn viết bài bên dưới, nhưng để bài cá nhân hoá thật hơn, thử trả lời mấy câu này rồi sửa lại phần "Câu chuyện riêng của bạn" ở trên và bấm tạo lại:</div>
          <ul>${r.cau_hoi_lam_ro.map(q=>`<li>${esc(q)}</li>`).join('')}</ul>
        </div>
      ` : ''}
      <div class="section highlight"><h3>${esc(r.tieu_de)}</h3><div class="body">${esc(r.bai_hoan_chinh)}</div></div>
      ${scoreSectionHtml()}
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

    const cancelKhoGocLink = container.querySelector('[data-action="cancel-kho-goc"]');
    if(cancelKhoGocLink) cancelKhoGocLink.onclick = ()=>{ state.khoGocSource = null; draw(); };

    const quickContext = container.querySelector('#quick-context');
    if(quickContext) quickContext.oninput = ()=>{ state.quickContext = quickContext.value; };

    const toggleExtra = container.querySelector('[data-action="toggle-extra"]');
    if(toggleExtra) toggleExtra.onclick = ()=>{ state.showExtra = !state.showExtra; draw(); };

    const exChannel = container.querySelector('#ex-channel');
    if(exChannel) exChannel.oninput = ()=>{ state.channelHandle = exChannel.value; };
    exChannel && exChannel.addEventListener('blur', saveChannelHandleIfChanged);

    const exBrandSelect = container.querySelector('#ex-brand-select');
    if(exBrandSelect) exBrandSelect.onchange = ()=>{ state.brandChoice = exBrandSelect.value; };

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
    if(state.khoGocSource ? !state.khoGocSource.trim() : !state.ideaText.trim()) return;
    state.generating = true; state.error = null; state.result = null; state.savedId = null;
    state.score = null; state.scoring = false; state.scoreError = null; draw();
    try{
      const endpoint = state.khoGocSource ? '/api/viet-tu-kho-goc' : '/api/viet-content';
      const payload = {
        positioning: state.positioning ? { luot1: state.positioning.luot1, luot2: state.positioning.luot2 } : null,
        quick_context: state.quickContext,
        channel_handle: state.channelHandle,
        brand_name: resolvedBrandName(),
        product_name: resolvedProductName(),
        group_name: resolvedGroupName(),
      };
      if(state.khoGocSource){
        payload.source_text = state.khoGocSource;
        payload.cau_chuyen_rieng = state.cauChuyenRieng;
      } else {
        payload.idea_text = state.ideaText;
      }
      const data = await callApi(endpoint, payload);
      state.result = data.result;
      state.generating = false; draw();
      scoreResult();
    } catch(e){ state.error = e.message; state.generating = false; draw(); }
  }

  async function scoreResult(){
    if(!state.result) return;
    state.scoring = true; state.scoreError = null; draw();
    try{
      const data = await callApi('/api/cham-diem-content', {
        content_text: state.result.bai_hoan_chinh,
        positioning: state.positioning && state.positioning.luot1 ? { luot1: state.positioning.luot1 } : null,
      });
      state.score = data.result;
      await ctx.supabase.from('content_scores').insert({ user_id: ctx.user.id, content_text: state.result.bai_hoan_chinh, result: data.result });
    } catch(e){ state.scoreError = e.message; }
    state.scoring = false; draw();
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
