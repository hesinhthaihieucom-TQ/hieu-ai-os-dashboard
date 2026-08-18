(function(){
function render(container, ctx){
  const state = { screen:'loading', positioning:null, quickContext:'', ideaText:'', ideaId:null, result:null, error:null, generating:false, recentPosts:[], scheduledPostIds:new Set(), savedId:null,
    showExtra:false, channelHandle:'', brands:[], brandChoice:'', assets:[], productChoice:'', groupChoice:'', productNameOther:'', groupNameOther:'',
    score:null, scoring:false, scoreError:null, hookScore:null, hookScoring:false, hookScoreError:null,
    khoGocSource:null, cauChuyenRieng:'', extrasLoading:false, extrasError:null,
    showScoreContent:false, showScoreHook:false, showExtras:false };

  function draw(){ container.innerHTML = html(); bind(); }

  async function boot(){
    draw();
    const { data: pos } = await ctx.supabase.from('positioning_results').select('*').eq('user_id', ctx.user.id).maybeSingle();
    state.positioning = (pos && pos.luot1) ? pos : null;
    state.channelHandle = (ctx.profile && ctx.profile.channel_handle) || '';
    state.cauChuyenRieng = (state.positioning && state.positioning.luot1 && state.positioning.luot1.cau_chuyen_ca_nhan) ? (state.positioning.luot1.cau_chuyen_ca_nhan.cau_chuyen || '') : '';
    if(window.PendingKhoGoc){ state.khoGocSource = window.PendingKhoGoc; window.PendingKhoGoc = null; }
    else if(window.PendingTopic){ state.ideaText = window.PendingTopic; window.PendingTopic = null; }
    await Promise.all([loadRecent(), loadAssets(), loadBrands(), loadScheduledPostIds()]);
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

  // Đánh dấu bài nào đã được đưa vào Lịch Đăng Bài rồi — để không phải mở Lịch Đăng mới biết,
  // và tránh lỡ tay đưa trùng 1 bài vào lịch nhiều lần mà không hay.
  async function loadScheduledPostIds(){
    const { data } = await ctx.supabase.from('calendar_entries').select('post_id').eq('user_id', ctx.user.id).not('post_id', 'is', null);
    state.scheduledPostIds = new Set((data || []).map(e => e.post_id));
  }

  function html(){
    if(state.screen==='loading') return `<div class="loading"><div class="spinner"></div><p>Đang tải…</p></div>`;

    return `
      <div class="page-head"><div class="tag">Bước 4 · Viết Content</div><h1>Viết bài tự động</h1>
      <p>Nhập chủ đề/ý tưởng, hoặc bấm "Viết →" từ 1 ý tưởng ở bước khác — AI sẽ viết bài đầy đủ.</p></div>
      ${!state.positioning ? `<div class="hint-box">Chưa có Định Vị đã lưu — vẫn viết được bình thường, nhưng nếu <a href="#dinh-vi">làm Định Vị trước</a>, bài viết sẽ đúng giọng văn và đối tượng của bạn hơn.</div>` : ''}
      <div class="card">
        ${state.khoGocSource ? `
          <div class="hint-box">Đang viết từ 1 bài trong <b>Kho Content</b> — sẽ <b>giữ nguyên hook và cấu trúc/trình tự bài gốc</b> (đây là công thức đã kiểm chứng viral), chỉ đổi câu từ ở các đoạn còn lại bằng giọng và câu chuyện của bạn, không sao chép nguyên văn. <span style="cursor:pointer;text-decoration:underline;" data-action="cancel-kho-goc">Huỷ, viết bài mới thay vì giữ nguyên →</span></div>
          ${state.khoGocSource.title ? `<label style="display:block;font-size:13px;font-weight:600;color:var(--ink-soft);margin:14px 0 6px;">Tiêu đề gốc</label>
          <div class="body" style="background:var(--accent-soft);padding:10px 12px;border-radius:8px;font-size:13px;font-weight:600;">${esc(state.khoGocSource.title)}</div>` : ''}
          <label style="display:block;font-size:13px;font-weight:600;color:var(--ink-soft);margin:14px 0 6px;">Bài gốc (tham khảo — hook và cấu trúc sẽ giữ, câu từ ở các đoạn khác sẽ đổi)</label>
          <div class="body" style="max-height:160px;overflow-y:auto;background:var(--accent-soft);padding:12px;border-radius:8px;font-size:13px;">${esc(state.khoGocSource.content)}</div>
          <label style="display:block;font-size:13px;font-weight:600;color:var(--ink-soft);margin:14px 0 6px;">Câu chuyện riêng của bạn (AI sẽ diễn đạt lại theo giọng bài này, không copy nguyên văn)</label>
          ${state.cauChuyenRieng ? `
            <div class="body" style="background:var(--panel);border:1px solid var(--line);padding:12px;border-radius:8px;font-size:13px;">${esc(state.cauChuyenRieng)}</div>
            <div style="margin-top:4px;font-size:11.5px;color:var(--ink-soft);">AI tổng hợp từ câu trả lời Định Vị của bạn — xem/làm lại ở <a href="#dinh-vi">Định Vị</a> nếu muốn câu chuyện khác.</div>
          ` : `
            <div class="hint-box">Chưa có câu chuyện cá nhân trong kết quả <a href="#dinh-vi">Định Vị</a> — làm Định Vị (hoặc làm lại) trước, rồi quay lại đây bấm tạo lại.</div>
          `}
          ${(!resolvedProductName() && !resolvedGroupName()) ? `
            <div class="hint-box" style="margin-top:14px;">Bạn chưa chọn sản phẩm/group nào ở "Tuỳ chọn thêm" bên dưới — nếu có, CTA sẽ dẫn đúng về đó; nếu không, CTA sẽ chỉ mời bình luận tương tác chung (không hứa gửi tài liệu/quà gì, vì bài gốc trong kho là của người khác, không dùng lại lời hứa đó được).</div>
          ` : ''}
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
        <div class="hint-box" style="margin-top:10px;">Bài viết sẽ hiện ra trong khoảng 30-45 giây — hashtag, gợi ý hình ảnh, dạng content và chấm điểm là các bước tiếp theo, bấm xem khi cần.</div>
        ${state.error?`<div class="error-box">${esc(state.error)}</div>`:''}
      </div>

      ${state.result ? resultHtml() : ''}

      <div style="margin-top:28px;">
        <h3 style="font-family:'IBM Plex Mono',monospace;font-size:13px;color:var(--ink-soft);text-transform:uppercase;letter-spacing:.05em;margin-bottom:12px;">Bài đã viết gần đây</h3>
        ${state.recentPosts.length===0?`<div style="color:var(--ink-soft);font-size:14px;">Chưa có bài nào được lưu.</div>`:''}
        ${state.recentPosts.map(p=>{
          const scheduled = state.scheduledPostIds.has(p.id);
          return `
          <div class="list-item">
            <div class="txt">
              <b>${esc(p.title||'(không tiêu đề)')}</b>${scheduled?` <span style="color:var(--accent);font-weight:600;font-size:12.5px;">✓ Đã có trong lịch</span>`:''}<br>
              <span style="color:var(--ink-soft);font-size:13px;">${esc((p.content||'').slice(0,120))}${(p.content||'').length>120?'…':''}</span>
            </div>
            <button class="btn btn-sm" data-schedule="${p.id}">${scheduled?'Đưa vào lịch thêm →':'Đưa vào lịch →'}</button>
          </div>
        `;}).join('')}
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

  // Chấm điểm hook RIÊNG với bộ rubric chuyên sâu (loại hook, cơ chế tâm lý, dự đoán mức dừng lại,
  // 3 bản cải thiện) — khác với tiêu chí "Hook đúng người dừng lại" chỉ là 1/6 điểm nhỏ trong
  // Chấm Điểm Content tổng, vốn chấm cả bài chứ không đào sâu riêng phần hook.
  function hookScoreSectionHtml(){
    if(state.hookScoring) return `<div class="section" style="text-align:center;color:var(--ink-soft);">Đang chấm điểm hook riêng…</div>`;
    if(state.hookScoreError) return `<div class="error-box">Không chấm điểm hook được: ${esc(state.hookScoreError)}</div>`;
    if(!state.hookScore) return '';
    const h = state.hookScore;
    return `
      <div class="section highlight">
        <h3>Chấm điểm Hook riêng</h3>
        <div class="body" style="font-size:28px;font-weight:700;">${h.diem_tong}<span style="font-size:14px;">/100</span>
          <span style="font-size:13px;font-weight:400;color:var(--ink-soft);margin-left:8px;">${esc(h.loai_hook)} · Dự đoán dừng lại: ${esc(h.du_doan_muc_do_dung_lai)}</span>
        </div>
      </div>
      <div class="section"><h3>Điểm yếu của hook</h3><div class="body">${esc(h.diem_yeu)}</div></div>
      <div class="btn-row no-print"><span class="btn-ghost btn" data-action="full-hook-score">Xem 3 bản cải thiện &amp; phân tích đầy đủ ở Chấm Điểm Hook →</span></div>
    `;
  }

  // Nút "Copy" dùng chung — tra theo key thay vì nhét thẳng text vào attribute HTML (tránh vỡ
  // attribute khi text có dấu ngoặc kép/xuống dòng), luôn đọc đúng state.result mới nhất lúc bấm.
  function copyBtnHtml(field, label){
    return `<span class="btn-ghost btn btn-sm" style="padding:5px 12px;font-size:12px;" data-copy-field="${field}">${label||'Copy'}</span>`;
  }
  function resolveCopyText(field){
    const r = state.result;
    if(!r) return '';
    if(field==='hashtag') return (r.hashtag||[]).map(h=>'#'+h.replace(/^#/,'')).join(' ');
    if(field==='caption_chinh') return (r.goi_y_caption && r.goi_y_caption.caption_chinh) || '';
    if(field.startsWith('caption_platform:')){
      const i = Number(field.split(':')[1]);
      return (r.goi_y_caption && r.goi_y_caption.theo_nen_tang && r.goi_y_caption.theo_nen_tang[i] && r.goi_y_caption.theo_nen_tang[i].caption) || '';
    }
    if(field.startsWith('cmt_cta_san_pham:')){
      const i = Number(field.split(':')[1]);
      return (r.cmt_cta_san_pham && r.cmt_cta_san_pham[i]) || '';
    }
    return r[field] || '';
  }

  // Hashtag/gợi ý hình ảnh/dạng content/caption — tách riêng khỏi core để chỉ tải khi người dùng
  // thực sự bấm xem (bước tiếp theo), đỡ tốn thêm 1 lượt gọi AI nếu họ không cần tới.
  function extrasSectionHtml(){
    const r = state.result;
    if(state.extrasLoading) return `<div class="section" style="text-align:center;color:var(--ink-soft);"><div class="spinner" style="margin:0 auto 12px;"></div>Đang tạo hashtag, gợi ý hình ảnh, dạng content, caption…</div>`;
    if(state.extrasError) return `<div class="error-box">Không tạo được gợi ý bổ sung: ${esc(state.extrasError)}</div><div class="btn-row no-print" style="justify-content:flex-start;"><button class="btn btn-sm" data-action="retry-extras">Thử lại</button></div>`;
    if(!r.hashtag) return '';
    return `
      <div class="section"><h3>Hashtag (5)</h3>
        <div class="body">${(r.hashtag||[]).map(h=>'#'+h.replace(/^#/,'')).join(' ')}</div>
        <div class="btn-row no-print" style="margin-top:10px;justify-content:flex-start;">${copyBtnHtml('hashtag')}</div>
      </div>
      <div class="section"><h3>Gợi ý hình ảnh/video</h3><div class="body">${esc(r.goi_y_hinh_anh)}</div></div>
      ${(r.goi_y_caption && (r.goi_y_caption.caption_chinh || (r.goi_y_caption.theo_nen_tang||[]).length)) ? `
        <div class="section"><h3>Caption gợi ý (khi đăng dạng video)</h3>
          <div class="body">${esc(r.goi_y_caption.caption_chinh)}${r.goi_y_caption.giu_nguyen_tieu_de ? ' <span style="color:var(--ink-soft);font-size:12.5px;">(giữ nguyên tiêu đề thumbnail)</span>' : ''}</div>
          ${r.goi_y_caption.caption_chinh?`<div class="btn-row no-print" style="margin-top:10px;justify-content:flex-start;">${copyBtnHtml('caption_chinh')}</div>`:''}
          ${(r.goi_y_caption.theo_nen_tang||[]).length ? `
            <div style="margin-top:12px;display:flex;flex-direction:column;gap:8px;">
              ${r.goi_y_caption.theo_nen_tang.map((p,i)=>`<div style="border:1px solid var(--line);border-radius:8px;padding:10px 12px;">
                <b>${esc(p.nen_tang)}:</b> ${esc(p.caption)}
                <div class="btn-row no-print" style="margin-top:8px;justify-content:flex-start;">${copyBtnHtml('caption_platform:'+i)}</div>
              </div>`).join('')}
            </div>
          ` : ''}
        </div>
      ` : ''}
      <div class="section highlight"><h3>Dạng content phù hợp nhất</h3>
        <div class="body" style="font-weight:700;margin-bottom:6px;">${esc(r.dinh_dang_de_xuat)}</div>
        <div class="body">${esc(r.ly_do_dinh_dang)}</div>
      </div>
      <div class="btn-row no-print" style="margin-top:-6px;margin-bottom:10px;">
        <a class="btn-ghost btn" href="#dinh-dang-content">Xem cách làm dạng này →</a>
      </div>
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
      <div class="section highlight">
        <h3>Tiêu đề &amp; bài viết (sửa trực tiếp nếu muốn)</h3>
        <div style="display:flex;gap:8px;align-items:center;margin-bottom:10px;">
          <input id="edit-tieu-de" value="${esc(r.tieu_de)}" style="flex:1;font-weight:700;font-size:16px;padding:10px 12px;border:1px solid var(--line);border-radius:8px;background:var(--panel);color:var(--ink);">
          ${copyBtnHtml('tieu_de')}
        </div>
        <textarea id="edit-bai-hoan-chinh" style="min-height:260px;background:var(--panel);">${esc(r.bai_hoan_chinh)}</textarea>
        <div class="btn-row no-print" style="margin-top:10px;justify-content:flex-start;">${copyBtnHtml('bai_hoan_chinh', 'Copy bài viết')}</div>
        ${r.tu_khoa_cta?`<div style="margin-top:8px;font-size:12.5px;color:var(--ink-soft);">Từ khoá CTA: <span style="display:inline-block;margin-left:2px;padding:2px 9px;border-radius:999px;background:var(--gold);color:#1E2420;font-size:12px;font-weight:700;">${esc(r.tu_khoa_cta)}</span></div>`:''}
      </div>
      <div class="section">
        <h3>Bình luận ghim (sửa trực tiếp nếu muốn)</h3>
        <textarea id="edit-cmt-ghim" style="min-height:auto;height:70px;">${esc(r.cau_cmt_ghim||'')}</textarea>
        <div class="btn-row no-print" style="margin-top:10px;justify-content:flex-start;">${copyBtnHtml('cau_cmt_ghim')}</div>
      </div>
      ${(r.cmt_cta_san_pham && r.cmt_cta_san_pham.length) ? `
        <div class="section"><h3>Bình luận CTA sản phẩm/group</h3>
          ${r.cmt_cta_san_pham.map((c,i)=>`
            <div style="padding:8px 0;border-bottom:1px solid var(--line);display:flex;justify-content:space-between;align-items:center;gap:10px;">
              <div style="font-size:14.5px;">${esc(c)}</div>
              ${copyBtnHtml('cmt_cta_san_pham:'+i)}
            </div>
          `).join('')}
        </div>` : ''}

      <div class="page-head" style="margin:26px 0 10px;"><div class="tag">Bước tiếp theo</div></div>
      <div class="btn-row no-print" style="justify-content:flex-start;flex-wrap:wrap;">
        ${!state.khoGocSource ? `<button class="btn-ghost btn btn-sm" data-action="toggle-score-content">${state.score?'✓ ':''}Chấm điểm Content →</button>` : ''}
        ${!state.khoGocSource ? `<button class="btn-ghost btn btn-sm" data-action="toggle-score-hook">${state.hookScore?'✓ ':''}Chấm điểm Hook →</button>` : ''}
        <button class="btn-ghost btn btn-sm" data-action="toggle-extras">${state.result.hashtag?'✓ ':''}Hashtag, hình ảnh, dạng content &amp; caption →</button>
      </div>
      ${state.showScoreContent ? scoreSectionHtml() : ''}
      ${state.showScoreHook ? hookScoreSectionHtml() : ''}
      ${state.showExtras ? extrasSectionHtml() : ''}

      <div class="btn-row no-print" style="margin-top:20px;">
        <button class="btn" data-action="save">${state.savedId?'Đã lưu vào thư viện ✓':'Lưu vào thư viện bài viết'}</button>
        ${state.savedId?`<a class="btn-ghost btn" href="#lich-dang">Đưa vào Lịch Đăng Bài →</a>`:''}
        ${state.savedId?`<a class="btn-ghost btn" href="#day-bai">Đẩy Bài &amp; CTA Comment →</a>`:''}
      </div>
    `;
  }

  function bind(){
    const ideaInput = container.querySelector('#idea-input');
    if(ideaInput) ideaInput.oninput = ()=>{ state.ideaText = ideaInput.value; };

    const cancelKhoGocLink = container.querySelector('[data-action="cancel-kho-goc"]');
    if(cancelKhoGocLink) cancelKhoGocLink.onclick = ()=>{ state.khoGocSource = null; draw(); };

    const editTieuDe = container.querySelector('#edit-tieu-de');
    if(editTieuDe) editTieuDe.oninput = ()=>{ state.result.tieu_de = editTieuDe.value; };
    const editBaiHoanChinh = container.querySelector('#edit-bai-hoan-chinh');
    if(editBaiHoanChinh) editBaiHoanChinh.oninput = ()=>{ state.result.bai_hoan_chinh = editBaiHoanChinh.value; };
    const editCmtGhim = container.querySelector('#edit-cmt-ghim');
    if(editCmtGhim) editCmtGhim.oninput = ()=>{ state.result.cau_cmt_ghim = editCmtGhim.value; };

    container.querySelectorAll('[data-copy-field]').forEach(el=>{
      el.onclick = async ()=>{
        const text = resolveCopyText(el.getAttribute('data-copy-field'));
        if(!text) return;
        try{
          await navigator.clipboard.writeText(text);
          const old = el.textContent;
          el.textContent = 'Đã copy ✓';
          setTimeout(()=>{ el.textContent = old; }, 1500);
        } catch(e){}
      };
    });

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

    const fullHookScoreBtn = container.querySelector('[data-action="full-hook-score"]');
    if(fullHookScoreBtn) fullHookScoreBtn.onclick = ()=>{
      window.PendingHookText = state.result.hook;
      location.hash = 'cham-diem-hook';
    };

    const retryExtrasBtn = container.querySelector('[data-action="retry-extras"]');
    if(retryExtrasBtn) retryExtrasBtn.onclick = loadExtras;

    const toggleScoreContentBtn = container.querySelector('[data-action="toggle-score-content"]');
    if(toggleScoreContentBtn) toggleScoreContentBtn.onclick = ()=>{
      state.showScoreContent = !state.showScoreContent;
      if(state.showScoreContent && !state.score && !state.scoring) scoreContent();
      else draw();
    };

    const toggleScoreHookBtn = container.querySelector('[data-action="toggle-score-hook"]');
    if(toggleScoreHookBtn) toggleScoreHookBtn.onclick = ()=>{
      state.showScoreHook = !state.showScoreHook;
      if(state.showScoreHook && !state.hookScore && !state.hookScoring) scoreHook();
      else draw();
    };

    const toggleExtrasBtn = container.querySelector('[data-action="toggle-extras"]');
    if(toggleExtrasBtn) toggleExtrasBtn.onclick = ()=>{
      state.showExtras = !state.showExtras;
      if(state.showExtras && !state.result.hashtag && !state.extrasLoading) loadExtras();
      else draw();
    };

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
    if(state.khoGocSource ? !state.khoGocSource.content.trim() : !state.ideaText.trim()) return;
    state.generating = true; state.error = null; state.result = null; state.savedId = null;
    state.score = null; state.scoring = false; state.scoreError = null;
    state.hookScore = null; state.hookScoring = false; state.hookScoreError = null;
    state.extrasLoading = false; state.extrasError = null; draw();
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
        payload.source_text = state.khoGocSource.content;
        payload.source_title = state.khoGocSource.title;
        payload.cau_chuyen_rieng = state.cauChuyenRieng;
      } else {
        payload.idea_text = state.ideaText;
      }
      const data = await callApi(endpoint, payload, 280000);
      state.result = data.result;
      state.showScoreContent = false; state.showScoreHook = false; state.showExtras = false;
      state.generating = false; draw();
    } catch(e){ state.error = e.message; state.generating = false; draw(); }
  }

  // Hashtag/gợi ý hình ảnh/dạng content/caption là bước "tiếp theo" sau khi đã có bài viết —
  // tách khỏi lượt viết chính để bài viết hiện ra ngay, không phải chờ đủ mọi thứ mới thấy nội dung.
  async function loadExtras(){
    if(!state.result) return;
    state.extrasLoading = true; state.extrasError = null; draw();
    try{
      const data = await callApi('/api/viet-content-extras', {
        positioning: state.positioning ? { luot1: state.positioning.luot1, luot2: state.positioning.luot2 } : null,
        quick_context: state.quickContext,
        post_text: state.result.bai_hoan_chinh,
        channel_handle: state.channelHandle,
        brand_name: resolvedBrandName(),
        product_name: resolvedProductName(),
        group_name: resolvedGroupName(),
      });
      state.result = { ...state.result, ...data.result };
      state.extrasError = null;
    } catch(e){ state.extrasError = e.message; }
    state.extrasLoading = false; draw();
  }

  async function scoreContent(){
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

  // Chấm điểm riêng r.hook (khác content_text ở trên) bằng đúng rubric chuyên sâu của Chấm Điểm Hook,
  // chạy song song với scoreContent() — không phụ thuộc nhau, lỗi 1 bên không chặn bên còn lại.
  async function scoreHook(){
    if(!state.result || !state.result.hook || !state.result.hook.trim()) return;
    state.hookScoring = true; state.hookScoreError = null; draw();
    try{
      const data = await callApi('/api/cham-diem-hook', {
        hook_text: state.result.hook,
        positioning: state.positioning && state.positioning.luot1 ? { luot1: state.positioning.luot1 } : null,
      });
      state.hookScore = data.result;
      await ctx.supabase.from('hook_scores').insert({ user_id: ctx.user.id, hook_text: state.result.hook, result: data.result });
    } catch(e){ state.hookScoreError = e.message; }
    state.hookScoring = false; draw();
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
      // Kế thừa trục nội dung từ bài/hook gốc trong Kho Content nếu viết từ đó — để "Bài đã viết"
      // tự xếp đúng trục, không có thì để trống (xếp vào "Chưa phân loại").
      tags: (state.khoGocSource && state.khoGocSource.tags) || [],
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
