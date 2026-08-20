(function(){
function render(container, ctx){
  const state = { screen:'loading', positioning:null, quickContext:'', ideaText:'', ideaId:null, result:null, error:null, generating:false, recentPosts:[], scheduledPostIds:new Set(), savedId:null,
    showExtra:false, channelHandle:'', brands:[], brandChoice:'', assets:[], productChoice:'', groupChoice:'', productNameOther:'', groupNameOther:'',
    score:null, scoring:false, scoreError:null, hookScore:null, hookScoring:false, hookScoreError:null,
    khoGocSource:null, cauChuyenRieng:'', customInstructions:'', extrasLoading:false, extrasError:null,
    showScoreContent:false, showScoreHook:false, showExtras:false, saving:false, pendingSourceRef:null,
    viralPromptFor:null, viralViews:'', viralSubmitting:false, viralDoneFor:null, viralError:null, dinhDangOverride:null };

  function draw(){ container.innerHTML = html(); bind(); }

  const DRAFT_KEY = 'viet-content';
  function draftPayload(){
    return {
      ideaText: state.ideaText, khoGocSource: state.khoGocSource, cauChuyenRieng: state.cauChuyenRieng, customInstructions: state.customInstructions,
      pendingSourceRef: state.pendingSourceRef, result: state.result, savedId: state.savedId,
      score: state.score, hookScore: state.hookScore, dinhDangOverride: state.dinhDangOverride,
    };
  }
  function persistDraft(){ saveModuleDraft(ctx, DRAFT_KEY, draftPayload()); }

  async function boot(){
    draw();
    const { data: pos } = await ctx.supabase.from('positioning_results').select('*').eq('user_id', ctx.user.id).maybeSingle();
    state.positioning = (pos && pos.luot1) ? pos : null;
    state.channelHandle = (ctx.profile && ctx.profile.channel_handle) || '';
    state.cauChuyenRieng = (state.positioning && state.positioning.luot1 && state.positioning.luot1.cau_chuyen_ca_nhan) ? (state.positioning.luot1.cau_chuyen_ca_nhan.cau_chuyen || '') : '';
    const hasPending = !!(window.PendingKhoGoc || window.PendingTopic);
    if(window.PendingKhoGoc){ state.khoGocSource = window.PendingKhoGoc; window.PendingKhoGoc = null; }
    else if(window.PendingTopic){ state.ideaText = window.PendingTopic; window.PendingTopic = null; }
    // Ghi lại bài mới này bắt nguồn từ mục nào trong Kho Content/Kho Hook (nếu đi từ đó sang) — để
    // hiện "✓ Đã dùng viết bài N lần" ngay trên mục đó khi quay lại Kho.
    if(window.PendingSourceRef){ state.pendingSourceRef = window.PendingSourceRef; window.PendingSourceRef = null; }
    // Đến từ nút "Viết lại theo góp ý" ở Chấm Điểm Content — idea_text đã có sẵn nội dung + lỗi cần
    // sửa, chạy luôn không bắt người dùng bấm lại, cho cảm giác liền mạch giữa 2 trang.
    const autoGenerate = !!window.PendingRewriteAuto; window.PendingRewriteAuto = null;
    // Không có nguồn mới rõ ràng (Pending*) truyền sang — khôi phục lại đúng bài/kết quả đang làm
    // dở lần trước, tránh mất trắng chỉ vì lỡ chuyển sang trang khác rồi quay lại.
    if(!hasPending && !autoGenerate){
      const draft = await loadModuleDraft(ctx, DRAFT_KEY);
      if(draft) Object.assign(state, draft);
    }
    await Promise.all([loadRecent(), loadAssets(), loadBrands(), loadScheduledPostIds()]);
    state.screen='main';
    draw();
    if(autoGenerate) generate();
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
      <p>Nhập chủ đề/ý tưởng, hoặc bấm "Viết →" từ 1 ý tưởng ở bước khác — AI sẽ viết bài đầy đủ.</p>
      ${(state.result || state.ideaText || state.khoGocSource) ? `<span class="btn-ghost btn btn-sm" data-action="reset-draft" style="margin-top:8px;">Reset, làm bài mới</span>` : ''}
      </div>
      ${!state.positioning ? `<div class="hint-box">Chưa có Định Vị đã lưu — vẫn viết được bình thường, nhưng nếu <a href="#dinh-vi">làm Định Vị trước</a>, bài viết sẽ đúng giọng văn và đối tượng của bạn hơn.</div>` : ''}
      <div class="card">
        ${state.khoGocSource ? `
          <div class="hint-box">Đang viết từ 1 bài trong <b>Kho Content</b> — sẽ <b>giữ nguyên hook và cấu trúc/trình tự bài gốc</b> (đây là công thức đã kiểm chứng viral), chỉ đổi câu từ ở các đoạn còn lại bằng giọng và câu chuyện của bạn, không sao chép nguyên văn. <span style="cursor:pointer;text-decoration:underline;" data-action="cancel-kho-goc">Huỷ, viết bài mới thay vì giữ nguyên →</span></div>
          ${state.khoGocSource.title ? `<label style="display:block;font-size:13px;font-weight:600;color:var(--ink-soft);margin:14px 0 6px;">Tiêu đề gốc</label>
          <div class="body" style="background:var(--accent-soft);padding:10px 12px;border-radius:8px;font-size:13px;font-weight:600;">${esc(state.khoGocSource.title)}</div>` : ''}
          <label style="display:block;font-size:13px;font-weight:600;color:var(--ink-soft);margin:14px 0 6px;">Bài gốc (tham khảo — hook và cấu trúc sẽ giữ, câu từ ở các đoạn khác sẽ đổi)</label>
          <div class="body" style="background:var(--accent-soft);padding:12px;border-radius:8px;font-size:13px;">${esc(excerpt(state.khoGocSource.content, 180))}</div>
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
        <label style="display:block;font-size:13px;font-weight:600;color:var(--ink-soft);margin:14px 0 6px;">Yêu cầu riêng cho bài này (không bắt buộc)</label>
        <textarea id="custom-instructions" style="min-height:auto;height:52px;" placeholder="Ví dụ: viết ngắn gọn hơn, nhấn mạnh số liệu cụ thể, giọng hài hước hơn, không dùng từ &quot;chắc chắn&quot;...">${esc(state.customInstructions)}</textarea>
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
        <div class="btn-row" style="align-items:center;">
          <button class="btn" data-action="generate" ${state.generating?'disabled':''}>${state.generating?'Đang viết…':(state.khoGocSource?'Cá nhân hoá bài này':'Viết bài')}</button>
          ${!state.generating?`<span style="font-size:11px;color:var(--ink-soft);">(tốn 3 lượt AI)</span>`:''}
          ${state.generating?`<span class="btn-ghost btn btn-sm" data-action="retry-generate">Thử lại ngay</span>`:''}
        </div>
        <div class="hint-box" id="generate-wait-hint" style="margin-top:10px;">Bài viết sẽ hiện ra trong khoảng <b>30-45 giây</b> — hashtag, gợi ý hình ảnh, dạng content và chấm điểm là các bước tiếp theo, bấm xem khi cần.<br><br>Nếu điện thoại tự khoá màn hình hoặc chuyển sang app khác khi đang chờ, quá trình có thể bị tạm dừng — bấm <b>"Thử lại ngay"</b> nếu chờ quá lâu không thấy gì, <b>không cần nhập lại chủ đề</b>.</div>
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
              ${state.viralDoneFor===p.id ? `
                <div style="margin-top:6px;font-size:12px;color:var(--accent);">✓ Đã gửi đề xuất lên Kho Viral, đang chờ admin duyệt</div>
              ` : state.viralPromptFor===p.id ? `
                <div style="margin-top:8px;">
                  <div style="font-size:11.5px;color:var(--ink-soft);margin-bottom:6px;">Chỉ gửi nếu bài <b>đã thực sự đạt tối thiểu 200.000 view thật</b> trên nền tảng bạn đăng — nhập đúng số view hiện có:</div>
                  <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
                    <input type="number" id="viral-views-${p.id}" placeholder="Số view thật, vd 250000" style="width:160px;padding:6px 10px;border:1px solid var(--line);border-radius:6px;font-size:12.5px;">
                    <button class="btn btn-sm" data-confirm-viral="${p.id}" ${state.viralSubmitting?'disabled':''}>${state.viralSubmitting?'Đang gửi…':'Gửi'}</button>
                    <span class="btn-ghost btn btn-sm" data-cancel-viral="1">Huỷ</span>
                  </div>
                  ${state.viralError?`<div style="margin-top:6px;font-size:11.5px;color:var(--danger);">${esc(state.viralError)}</div>`:''}
                </div>
              ` : `
                <span style="display:inline-block;margin-top:8px;padding:6px 12px;background:#FBF0DC;border:1px solid var(--gold);border-radius:20px;color:var(--gold);font-weight:700;font-size:12.5px;cursor:pointer;" data-ask-viral="${p.id}">🔥 Bài này viral (200k+ view) thật? Đóng góp vào Kho Viral →</span>
              `}
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
      <div class="section"><h3>Bản sửa đề xuất (tối ưu hơn)</h3><div class="body">${esc(breakSentences(s.ban_sua_de_xuat))}</div></div>
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
      ${(r.cmt_cta_san_pham && r.cmt_cta_san_pham.length) ? `
        <div class="section"><h3>Bình luận CTA sản phẩm/group</h3>
          ${r.cmt_cta_san_pham.map((c,i)=>`
            <div style="padding:8px 0;border-bottom:1px solid var(--line);display:flex;justify-content:space-between;align-items:center;gap:10px;">
              <div style="font-size:14.5px;">${esc(c)}</div>
              ${copyBtnHtml('cmt_cta_san_pham:'+i)}
            </div>
          `).join('')}
        </div>` : ''}
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
      ${(() => {
        const currentName = state.dinhDangOverride || r.dinh_dang_de_xuat;
        const currentFormat = window.CONTENT_FORMATS ? window.CONTENT_FORMATS.find(f=>f.name===currentName) : null;
        return `
        <div class="section highlight"><h3>Dạng content phù hợp nhất</h3>
          ${window.CONTENT_FORMATS ? `
            <label style="display:block;font-size:12.5px;font-weight:600;color:var(--ink-soft);margin-bottom:6px;">AI gợi ý dạng này — không hợp ý bạn thì chọn dạng khác:</label>
            <select id="dinh-dang-override" style="width:100%;padding:10px 12px;border:1px solid var(--line);border-radius:8px;font-size:14px;margin-bottom:10px;">
              ${window.CONTENT_FORMATS.map(f=>`<option value="${esc(f.name)}" ${f.name===currentName?'selected':''}>${esc(f.name)}</option>`).join('')}
            </select>
          ` : `<div class="body" style="font-weight:700;margin-bottom:6px;">${esc(r.dinh_dang_de_xuat)}</div>`}
          <div class="body">${esc(breakSentences(r.ly_do_dinh_dang))}</div>
        </div>
        <div class="btn-row no-print" style="margin-top:-6px;margin-bottom:10px;">
          ${currentFormat ? `<span class="btn-ghost btn" data-jump-format="${currentFormat.id}">Xem cách làm dạng này →</span>` : `<a class="btn-ghost btn" href="#dinh-dang-content">Xem cách làm dạng này →</a>`}
        </div>
      `;})()}
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
      <div class="page-head" style="margin:26px 0 10px;"><div class="tag">Bước tiếp theo</div></div>
      <div class="btn-row no-print" style="justify-content:flex-start;flex-wrap:wrap;align-items:center;">
        ${!state.khoGocSource ? `<span style="display:inline-flex;align-items:center;gap:4px;"><button class="btn-ghost btn btn-sm" data-action="toggle-score-content">${state.score?'✓ ':''}Chấm điểm Content →</button>${!state.score?`<span style="font-size:11px;color:var(--ink-soft);">(tốn 2 lượt AI)</span>`:''}</span>` : ''}
        ${!state.khoGocSource ? `<span style="display:inline-flex;align-items:center;gap:4px;"><button class="btn-ghost btn btn-sm" data-action="toggle-score-hook">${state.hookScore?'✓ ':''}Chấm điểm Hook →</button>${!state.hookScore?`<span style="font-size:11px;color:var(--ink-soft);">(tốn 1 lượt AI)</span>`:''}</span>` : ''}
        <button class="btn-ghost btn btn-sm" data-action="toggle-extras">${state.result.hashtag?'✓ ':''}Hashtag, hình ảnh, dạng content &amp; caption →</button>
      </div>
      ${state.showScoreContent ? scoreSectionHtml() : ''}
      ${state.showScoreHook ? hookScoreSectionHtml() : ''}
      ${state.showExtras ? extrasSectionHtml() : ''}

      <div class="btn-row no-print" style="margin-top:20px;">
        <button class="btn" data-action="save" ${state.saving?'disabled':''}>${state.savedId?'Đã lưu vào thư viện ✓':state.saving?'Đang lưu…':'Lưu vào thư viện bài viết'}</button>
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
    const customInstructions = container.querySelector('#custom-instructions');
    if(customInstructions) customInstructions.oninput = ()=>{ state.customInstructions = customInstructions.value; persistDraft(); };

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
    // "Thử lại ngay" gọi thẳng generate() lần nữa — KHÔNG cần bấm huỷ rồi bấm viết bài riêng 2 bước;
    // ý tưởng/nguồn đang có sẵn trong state nên không mất gì, generateRequestId tự vô hiệu hoá lượt
    // cũ đang treo (nếu sau đó nó vẫn âm thầm trả lời thì bị bỏ qua, xem generate()).
    const retryGenBtn = container.querySelector('[data-action="retry-generate"]');
    if(retryGenBtn) retryGenBtn.onclick = generate;

    const saveBtn = container.querySelector('[data-action="save"]');
    if(saveBtn) saveBtn.onclick = save;

    const fullHookScoreBtn = container.querySelector('[data-action="full-hook-score"]');
    if(fullHookScoreBtn) fullHookScoreBtn.onclick = ()=>{
      window.PendingHookText = state.result.hook;
      location.hash = 'cham-diem-hook';
    };

    const retryExtrasBtn = container.querySelector('[data-action="retry-extras"]');
    if(retryExtrasBtn) retryExtrasBtn.onclick = loadExtras;

    const dinhDangSelect = container.querySelector('#dinh-dang-override');
    if(dinhDangSelect) dinhDangSelect.onchange = ()=>{ state.dinhDangOverride = dinhDangSelect.value; draw(); };
    const jumpFormatEl = container.querySelector('[data-jump-format]');
    if(jumpFormatEl) jumpFormatEl.onclick = ()=>{
      window.PendingFormatJump = jumpFormatEl.getAttribute('data-jump-format');
      location.hash = 'dinh-dang-content';
    };

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

    container.querySelectorAll('[data-ask-viral]').forEach(el=>{
      el.onclick = ()=>{ state.viralPromptFor = el.getAttribute('data-ask-viral'); state.viralError = null; draw(); };
    });
    const cancelViralBtn = container.querySelector('[data-cancel-viral]');
    if(cancelViralBtn) cancelViralBtn.onclick = ()=>{ state.viralPromptFor = null; state.viralError = null; draw(); };
    const resetDraftBtn = container.querySelector('[data-action="reset-draft"]');
    if(resetDraftBtn) resetDraftBtn.onclick = async ()=>{
      if(!(await confirmModal('Xoá bài đang làm dở và làm bài mới? Không khôi phục lại được.'))) return;
      await clearModuleDraft(ctx, DRAFT_KEY);
      state.ideaText=''; state.khoGocSource=null; state.pendingSourceRef=null;
      state.cauChuyenRieng = (state.positioning && state.positioning.luot1 && state.positioning.luot1.cau_chuyen_ca_nhan) ? (state.positioning.luot1.cau_chuyen_ca_nhan.cau_chuyen || '') : '';
      state.result=null; state.savedId=null; state.score=null; state.hookScore=null; state.dinhDangOverride=null;
      state.error=null; state.showScoreContent=false; state.showScoreHook=false; state.showExtras=false;
      draw();
    };
    container.querySelectorAll('[data-confirm-viral]').forEach(el=>{
      el.onclick = async ()=>{
        const id = el.getAttribute('data-confirm-viral');
        const post = state.recentPosts.find(p=>p.id===id);
        if(!post || state.viralSubmitting) return;
        const viewsInput = container.querySelector(`#viral-views-${id}`);
        const viewsNum = viewsInput ? parseInt(viewsInput.value, 10) : NaN;
        if(!viewsNum || viewsNum < 200000){
          state.viralError = 'Cần nhập đúng số view thật, tối thiểu 200.000 — không được để trống hoặc thấp hơn.';
          draw();
          return;
        }
        const views = String(viewsNum);
        state.viralError = null;
        state.viralSubmitting = true; draw();
        await ctx.supabase.from('content_bank_personal').insert({
          user_id: ctx.user.id, title: post.title || '(không tiêu đề)', content: post.content, tags: post.tags || [],
          is_viral: true, viral_views: views, share_status: 'pending',
        });
        state.viralSubmitting = false; state.viralPromptFor = null; state.viralDoneFor = id;
        draw();
      };
    });
  }

  async function saveChannelHandleIfChanged(){
    const current = (ctx.profile && ctx.profile.channel_handle) || '';
    if(state.channelHandle === current) return;
    const { error } = await ctx.supabase.rpc('update_my_channel_handle', { new_handle: state.channelHandle.trim() || null });
    if(!error && ctx.profile) ctx.profile.channel_handle = state.channelHandle.trim() || null;
  }

  // Đt điện thoại tự khoá màn hình / chuyển app khi đang chờ có thể khiến trình duyệt tạm dừng chạy
  // nền rất lâu (đặc biệt Safari iOS) — request cũ đôi khi vẫn âm thầm hoàn tất sau đó. Đánh số hiệu
  // mỗi lượt generate() để lượt CŨ trả về sau khi đã bấm "Huỷ, thử lại" sẽ tự bỏ qua, không ghi đè
  // lên lượt mới hoặc bật lại trạng thái đang chạy đã bị huỷ.
  let generateRequestId = 0;

  async function generate(){
    if(state.khoGocSource ? !state.khoGocSource.content.trim() : !state.ideaText.trim()) return;
    generateRequestId++;
    const myRequestId = generateRequestId;
    state.generating = true; state.error = null; state.result = null; state.savedId = null;
    state.score = null; state.scoring = false; state.scoreError = null;
    state.hookScore = null; state.hookScoring = false; state.hookScoreError = null;
    state.extrasLoading = false; state.extrasError = null; draw();
    const stopProgress = animateProgressButton(container.querySelector('[data-action="generate"]'), 38, 'Đang viết');
    const stopWaitHint = startWaitReassurance(container.querySelector('#generate-wait-hint'), [
      { atSeconds: 60, html: 'Đã hơn 1 phút — bài này cần AI xử lý nhiều bước hơn bình thường (đọc định vị, viết đúng giọng văn, kiểm tra cấu trúc...) nên có thể lâu hơn dự kiến 1 chút. Cứ tiếp tục chờ, thường sẽ xong trong khoảng 1 phút nữa.' },
      { atSeconds: 120, html: 'Vẫn đang xử lý — nếu quá <b>2 phút</b> mà chưa ra kết quả, bấm <b>"Thử lại ngay"</b> ở trên, <b>không cần nhập lại chủ đề</b>.' },
    ]);
    acquireWakeLock();
    try{
      const endpoint = state.khoGocSource ? '/api/viet-tu-kho-goc' : '/api/viet-content';
      // channel_handle/brand_name KHÔNG gửi ở đây — bước viết bài chính (CORE) không dùng tới 2 mục
      // này (chỉ hashtag/CTA sản phẩm ở bước "Hashtag, hình ảnh..." bên dưới mới cần), gửi thừa từng
      // khiến bước viết chính bị nặng/chậm hơn không cần thiết. product_name/group_name vẫn gửi vì
      // riêng luồng "viết từ Kho Content" cần biết để không giữ lại lời hứa sản phẩm của bài gốc.
      const payload = {
        positioning: state.positioning ? { luot1: state.positioning.luot1, luot2: state.positioning.luot2 } : null,
        quick_context: state.quickContext,
        product_name: resolvedProductName(),
        group_name: resolvedGroupName(),
        custom_instructions: state.customInstructions,
      };
      if(state.khoGocSource){
        payload.source_text = state.khoGocSource.content;
        payload.source_title = state.khoGocSource.title;
        payload.cau_chuyen_rieng = state.cauChuyenRieng;
      } else {
        payload.idea_text = state.ideaText;
      }
      const data = await callApi(endpoint, payload, 280000);
      stopProgress(); stopWaitHint(); releaseWakeLock();
      if(myRequestId !== generateRequestId) return; // đã huỷ/bấm lại — bỏ qua kết quả trễ này, dừng interval của riêng lượt này là đủ
      state.result = data.result;
      state.showScoreContent = false; state.showScoreHook = false; state.showExtras = false;
      state.generating = false; draw();
      persistDraft();
    } catch(e){
      stopProgress(); stopWaitHint(); releaseWakeLock();
      if(myRequestId !== generateRequestId) return;
      state.error = e.message; state.generating = false; draw();
    }
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
      persistDraft();
    } catch(e){ state.extrasError = e.message; }
    state.extrasLoading = false; draw();
  }

  async function scoreContent(){
    if(!state.result) return;
    state.scoring = true; state.scoreError = null; draw();
    const stopProgress = animateProgressButton(container.querySelector('[data-action="toggle-score-content"]'), 55, 'Đang chấm');
    try{
      const data = await callApi('/api/cham-diem-content', {
        content_text: state.result.bai_hoan_chinh,
        positioning: state.positioning && state.positioning.luot1 ? { luot1: state.positioning.luot1 } : null,
      });
      state.score = data.result;
      await ctx.supabase.from('content_scores').insert({ user_id: ctx.user.id, content_text: state.result.bai_hoan_chinh, result: data.result });
      persistDraft();
    } catch(e){ state.scoreError = e.message; }
    stopProgress();
    state.scoring = false; draw();
  }

  // Chấm điểm riêng r.hook (khác content_text ở trên) bằng đúng rubric chuyên sâu của Chấm Điểm Hook,
  // chạy song song với scoreContent() — không phụ thuộc nhau, lỗi 1 bên không chặn bên còn lại.
  async function scoreHook(){
    if(!state.result || !state.result.hook || !state.result.hook.trim()) return;
    state.hookScoring = true; state.hookScoreError = null; draw();
    const stopProgress = animateProgressButton(container.querySelector('[data-action="toggle-score-hook"]'), 35, 'Đang chấm');
    try{
      const data = await callApi('/api/cham-diem-hook', {
        hook_text: state.result.hook,
        positioning: state.positioning && state.positioning.luot1 ? { luot1: state.positioning.luot1 } : null,
      });
      state.hookScore = data.result;
      await ctx.supabase.from('hook_scores').insert({ user_id: ctx.user.id, hook_text: state.result.hook, result: data.result });
      persistDraft();
    } catch(e){ state.hookScoreError = e.message; }
    stopProgress();
    state.hookScoring = false; draw();
  }

  async function save(){
    if(!state.result || state.savedId || state.saving) return;
    state.saving = true; draw();
    const r = state.result;
    // Kế thừa trục nội dung từ bài/hook gốc trong Kho Content nếu viết từ đó. Nếu không có nguồn
    // (ý tưởng mới hoàn toàn), để AI tự phân loại ngay — không còn để trống/"Chưa phân loại" nữa.
    let tags = (state.khoGocSource && state.khoGocSource.tags) || [];
    if(!tags.length){
      try{
        const data = await callApi('/api/phan-loai-truc', { title: r.tieu_de, content: r.bai_hoan_chinh });
        if(data.result && data.result.truc) tags = [data.result.truc];
      } catch(e){ /* không phân loại được (vd lỗi mạng) — vẫn lưu bài, không chặn người dùng */ }
    }
    const { data, error } = await ctx.supabase.from('posts').insert({
      user_id: ctx.user.id,
      idea_id: state.ideaId,
      title: r.tieu_de,
      content: r.bai_hoan_chinh,
      structure: { hook:r.hook, van_de:r.van_de, gia_tri:r.gia_tri, niem_tin:r.niem_tin, cta:r.cta, tu_khoa_cta:r.tu_khoa_cta, cau_cmt_ghim:r.cau_cmt_ghim, cmt_cta_san_pham:r.cmt_cta_san_pham, hashtag:r.hashtag, goi_y_hinh_anh:r.goi_y_hinh_anh, format: r.dinh_dang_de_xuat },
      tags,
      source_table: state.pendingSourceRef ? state.pendingSourceRef.table : null,
      source_id: state.pendingSourceRef ? state.pendingSourceRef.id : null,
    }).select().single();
    state.saving = false;
    if(error){ state.error = error.message; draw(); return; }
    state.savedId = data.id;
    if(state.ideaId) await ctx.supabase.from('ideas').update({ used:true }).eq('id', state.ideaId);
    await loadRecent();
    draw();
    persistDraft();
  }

  boot();
}

window.Modules = window.Modules || {};
window.Modules['viet-content'] = { title:'Viết Content', render };
})();
