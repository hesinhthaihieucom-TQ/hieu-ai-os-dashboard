// Màn hình Nâng Cấp — chọn gói/xem QR/chuyển khoản, giống hệt cách làm ở nhan-hieu/js/nang-cap.js
// nhưng đơn giản hơn nhiều: không có giá học viên/flash-sale/giảm giá giới thiệu, chỉ 3 gói cố
// định. Dùng CHUNG đúng 1 tài khoản ngân hàng (PAYMENT_BANK) với mọi sản phẩm khác trong hệ sinh
// thái HIỂU — SePay chỉ theo dõi 1 tài khoản này, phân biệt sản phẩm/khách bằng nội dung chuyển
// khoản (prefix SEVQR + ref code riêng của từng sản phẩm).
(function(){
// Đúng số tài khoản/tên chủ TK đang dùng ở nhan-hieu/js/app-shell.js (PAYMENT_BANK) — KHÔNG được
// đổi khác, vì SePay chỉ theo dõi đúng 1 tài khoản Vietinbank này cho toàn bộ hệ sinh thái HIỂU.
const PAYMENT_BANK = { code:'vietinbank', account:'199339288888', accountName:'LE TU QUYNH' };

const PLANS = [
  { key:'1m', label:'Theo tháng', amount:499000 },
  { key:'6m', label:'6 tháng', amount:2490000, recommended:true },
  { key:'12m', label:'Theo năm', amount:3990000 },
];

// Giá giới thiệu (2026-09-01, "làm tương tự như web xây nhân hiệu") — giảm 15% so giá thường, CHỈ
// hiện cho người có profiles.referred_by_ref_code (đăng ký qua link giới thiệu, gán 1 lần lúc đăng
// ký ở handle_new_user, xem supabase/schema_core.sql — dùng CHUNG ecosystem-wide, không riêng gì
// tro-ly-crm). Khớp đúng CRM_AMOUNT_TO_DAYS/CRM_REFERRAL_AMOUNTS ở api/sepay-webhook.js.
const PLANS_REFERRAL = [
  { key:'1m_ref', label:'1 tháng (giá giới thiệu)', amount:424000, note:'Giảm 15% nhờ qua link giới thiệu — còn 424.000đ so với giá thường 499.000đ.' },
  { key:'6m_ref', label:'6 tháng (giá giới thiệu)', amount:2116000, recommended:true, note:'Giảm 15% nhờ qua link giới thiệu — còn 2.116.000đ so với giá thường 2.490.000đ.' },
  { key:'12m_ref', label:'12 tháng (giá giới thiệu)', amount:3392000, note:'Giảm 15% nhờ qua link giới thiệu — còn 3.392.000đ so với giá thường 3.990.000đ.' },
];
function currentPlans(ctx){ return (ctx.profile && ctx.profile.referred_by_ref_code) ? PLANS_REFERRAL : PLANS; }

// "Mua thêm lượt" (2026-08-30, chị Quỳnh chốt "tính tiền như web xây nhân hiệu") — CỐ Ý dùng lại
// đúng giá của nhan-hieu (AMOUNT_TO_TOPUP_LUOT) vì webhook phân biệt qua tiền tố "CRM" trong nội
// dung chuyển khoản, không phải qua số tiền — an toàn dùng chung giá dù trùng số tiền (xem
// api/sepay-webhook.js). Mua càng nhiều giá/lượt càng rẻ, khớp CRM_AMOUNT_TO_TOPUP_LUOT ở đó.
const TOPUP_PACKS = [
  { key:'100', amount:150000, luot:100 },
  { key:'300', amount:420000, luot:300 },
  { key:'600', amount:780000, luot:600 },
];

function render(container, ctx){
  const plans = currentPlans(ctx);
  const state = {
    loading:true, refCode:null, selectedPlanKey: (plans.find(p=>p.recommended)||plans[0]).key, checking:false, checkedOnce:false, error:'',
    selectedTopupKey: TOPUP_PACKS[1].key, topupChecking:false, topupCheckedOnce:false,
  };

  function draw(){ container.innerHTML = html(); bind(); }

  async function boot(){
    try{
      // RPC này tự tạo mã CRM${...} cho user nếu chưa có, luôn trả về đúng 1 mã ổn định — an toàn
      // gọi lại nhiều lần, không sinh mã mới mỗi lần vào trang.
      const { data, error } = await ctx.supabase.rpc('get_or_create_crm_ref_code');
      if(error) throw error;
      state.refCode = data;
    } catch(e){
      state.error = 'Không lấy được mã tham chiếu chuyển khoản — thử tải lại trang.';
    }
    state.loading = false;
    draw();
  }

  async function recheckStatus(){
    state.checking = true; draw();
    try{
      const { data } = await ctx.supabase.from('profiles').select('crm_has_paid,crm_access_until').eq('id', ctx.user.id).maybeSingle();
      if(data){
        ctx.profile.crm_has_paid = data.crm_has_paid;
        ctx.profile.crm_access_until = data.crm_access_until;
      }
    } catch(e){}
    state.checking = false;
    state.checkedOnce = true;
    draw();
  }

  async function recheckTopup(){
    state.topupChecking = true; draw();
    try{
      const { data } = await ctx.supabase.from('profiles').select('crm_ai_uses,crm_ai_month,crm_ai_bonus').eq('id', ctx.user.id).maybeSingle();
      if(data){
        ctx.profile.crm_ai_uses = data.crm_ai_uses;
        ctx.profile.crm_ai_month = data.crm_ai_month;
        ctx.profile.crm_ai_bonus = data.crm_ai_bonus;
        // Cập nhật ngay số lượt hiển thị ở sidebar, không cần tải lại trang (giống onGatedApiSuccess
        // ở app-shell.js — sidebarFootHtml là hàm global, không module-scoped, xem CLAUDE.md).
        const el = document.getElementById('sidebar-foot-info');
        if(el) el.innerHTML = sidebarFootHtml();
      }
    } catch(e){}
    state.topupChecking = false;
    state.topupCheckedOnce = true;
    draw();
  }

  function statusHtml(){
    const p = ctx.profile || {};
    if(p.crm_has_paid && p.crm_access_until && new Date(p.crm_access_until).getTime() > Date.now()){
      return `<div class="hint-box">✓ Đang hoạt động — hạn dùng tới <b>${esc(new Date(p.crm_access_until).toLocaleString('vi-VN'))}</b>.</div>`;
    }
    if(p.crm_has_paid && p.crm_access_until){
      return `<div class="error-box">Đã hết hạn từ <b>${esc(new Date(p.crm_access_until).toLocaleString('vi-VN'))}</b> — mua thêm gói bên dưới để tiếp tục dùng.</div>`;
    }
    return `<div class="hint-box">Chưa kích hoạt — chọn gói và chuyển khoản bên dưới, hệ thống tự kích hoạt sau 1-2 phút.</div>`;
  }

  function html(){
    if(state.loading) return `<div class="loading"><div class="spinner"></div></div>`;

    const plans = currentPlans(ctx);
    const plan = plans.find(pl => pl.key === state.selectedPlanKey) || plans[0];
    const transferContent = state.refCode ? `SEVQR ${state.refCode}` : null;
    const qrUrl = state.refCode
      ? `https://img.vietqr.io/image/${PAYMENT_BANK.code}-${PAYMENT_BANK.account}-compact2.png?amount=${plan.amount}&addInfo=${encodeURIComponent(transferContent)}&accountName=${encodeURIComponent(PAYMENT_BANK.accountName)}`
      : null;

    return `
      <div class="page-head">
        <h1>Nâng Cấp</h1>
        <p>Chọn gói phù hợp — thanh toán xong hệ thống tự kích hoạt, không cần chờ duyệt tay.</p>
      </div>

      ${statusHtml()}

      ${state.error ? `<div class="error-box">${esc(state.error)}</div>` : ''}

      <div class="card" style="max-width:460px;margin-top:16px;">
        <label style="display:block;font-size:13px;font-weight:600;color:var(--ink-soft);margin-bottom:8px;">Chọn gói muốn mua</label>
        <div class="chips" id="plan-chips">
          ${plans.map(pl => `<div class="chip ${pl.key===state.selectedPlanKey?'selected':''}" data-plan="${pl.key}">${esc(pl.label)} — ${pl.amount.toLocaleString('vi-VN')}đ${pl.recommended?` <span style="opacity:.72;font-size:11.5px;">(khuyên dùng)</span>`:''}</div>`).join('')}
        </div>
        ${plan.note ? `<div class="hint-box" style="margin-top:10px;">🎉 ${esc(plan.note)}</div>` : ''}

        ${qrUrl ? `
          <div style="text-align:center;margin-top:18px;">
            <img src="${qrUrl}" alt="Mã VietQR" style="max-width:260px;width:100%;border-radius:12px;border:1px solid var(--line);">
            <div style="margin-top:8px;">
              <a href="${qrUrl}" download="vietqr-thanh-toan.png" target="_blank" rel="noopener" style="font-size:12.5px;color:var(--accent);font-weight:600;text-decoration:none;">📥 Tải ảnh mã QR về máy</a>
            </div>
          </div>
          <div style="margin-top:14px;font-size:13.5px;line-height:1.7;">
            <div><b>Ngân hàng:</b> Vietinbank</div>
            <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;"><b>Số tài khoản:</b> ${esc(PAYMENT_BANK.account)} <span class="btn-ghost btn btn-sm" style="padding:3px 10px;font-size:11.5px;" data-copy-value="${esc(PAYMENT_BANK.account)}">Copy</span></div>
            <div><b>Chủ tài khoản:</b> ${esc(PAYMENT_BANK.accountName)}</div>
            <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;"><b>Số tiền:</b> ${plan.amount.toLocaleString('vi-VN')}đ <span class="btn-ghost btn btn-sm" style="padding:3px 10px;font-size:11.5px;" data-copy-value="${plan.amount}">Copy</span></div>
            <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;"><b>Nội dung CK (bắt buộc giữ nguyên):</b> <span style="font-family:'IBM Plex Mono',monospace;background:var(--accent-soft);padding:2px 8px;border-radius:6px;">${esc(transferContent)}</span> <span class="btn-ghost btn btn-sm" style="padding:3px 10px;font-size:11.5px;" data-copy-value="${esc(transferContent)}">Copy</span></div>
          </div>
          <div class="hint-box" style="margin-top:14px;">Quét mã hoặc chuyển khoản đúng số tiền + giữ nguyên nội dung <b>${esc(transferContent)}</b> (bắt buộc có chữ SEVQR ở đầu thì ngân hàng mới báo về hệ thống được) — hệ thống tự đối chiếu và kích hoạt, không cần nội dung nào khác.</div>
        ` : `
          <div class="error-box" style="margin-top:14px;">Chưa có mã tài khoản để đối chiếu tự động — thử tải lại trang.</div>
        `}

        <div class="btn-row" style="justify-content:flex-start;margin-top:18px;">
          <button class="btn btn-sm" id="crm-recheck" ${state.checking?'disabled':''}>${state.checking?'Đang kiểm tra…':'Tôi đã chuyển khoản — kiểm tra lại'}</button>
        </div>
        ${state.checkedOnce && !state.checking ? `<div style="font-size:12.5px;color:var(--ink-soft);margin-top:8px;">Nếu chưa thấy cập nhật, đợi thêm 1-2 phút rồi bấm lại — nếu vẫn chưa thấy sau vài phút, báo lại để kích hoạt tay.</div>` : ''}
      </div>

      ${topupHtml()}
    `;
  }

  // "Mua thêm lượt" — dành cho tháng dùng vượt trần 300 lượt/tháng (xem CRM_MONTHLY_AI_LIMIT ở
  // app-shell.js), không cần chờ đầu tháng sau. Cộng thẳng vào crm_ai_bonus của tháng hiện tại,
  // không ảnh hưởng hạn dùng gói (crm_access_until).
  function topupHtml(){
    const p = ctx.profile || {};
    const { used, limit } = crmMonthlyUsage(p);
    const pack = TOPUP_PACKS.find(pk => pk.key === state.selectedTopupKey) || TOPUP_PACKS[0];
    const transferContent = state.refCode ? `SEVQR ${state.refCode}` : null;
    const topupQrUrl = state.refCode
      ? `https://img.vietqr.io/image/${PAYMENT_BANK.code}-${PAYMENT_BANK.account}-compact2.png?amount=${pack.amount}&addInfo=${encodeURIComponent(transferContent)}&accountName=${encodeURIComponent(PAYMENT_BANK.accountName)}`
      : null;
    return `
      <div class="card" style="max-width:460px;margin-top:20px;">
        <label style="display:block;font-size:13px;font-weight:600;color:var(--ink-soft);margin-bottom:8px;">Mua thêm lượt AI</label>
        <div class="hint-box" style="margin-bottom:12px;">Tháng này bạn đã dùng <b>${used}/${limit} lượt</b>. Nếu cần dùng nhiều hơn mức bình thường, mua thêm lượt dùng ngay trong tháng, không cần chờ đầu tháng sau. Mua càng nhiều, giá/lượt càng rẻ.</div>
        <div class="chips" id="topup-chips">
          ${TOPUP_PACKS.map(pk => {
            const pricePerLuot = pk.amount / pk.luot;
            const basePricePerLuot = TOPUP_PACKS[0].amount / TOPUP_PACKS[0].luot;
            const pct = Math.round((1 - pricePerLuot/basePricePerLuot) * 100);
            return `<div class="chip ${pk.key===state.selectedTopupKey?'selected':''}" data-topup="${pk.key}">+${pk.luot} lượt — ${pk.amount.toLocaleString('vi-VN')}đ${pct>0?` <span style="opacity:.72;font-size:11.5px;">(giảm ${pct}%)</span>`:''}</div>`;
          }).join('')}
        </div>

        ${topupQrUrl ? `
          <div style="text-align:center;margin-top:18px;">
            <img src="${topupQrUrl}" alt="Mã VietQR mua thêm lượt" style="max-width:220px;width:100%;border-radius:12px;border:1px solid var(--line);">
            <div style="margin-top:8px;"><a href="${topupQrUrl}" download="vietqr-mua-them-luot.png" target="_blank" rel="noopener" style="font-size:12.5px;color:var(--accent);font-weight:600;text-decoration:none;">📥 Tải ảnh mã QR về máy</a></div>
          </div>
          <div style="margin-top:14px;font-size:13.5px;line-height:1.7;">
            <div><b>Ngân hàng:</b> Vietinbank</div>
            <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;"><b>Số tài khoản:</b> ${esc(PAYMENT_BANK.account)} <span class="btn-ghost btn btn-sm" style="padding:3px 10px;font-size:11.5px;" data-copy-value="${esc(PAYMENT_BANK.account)}">Copy</span></div>
            <div><b>Chủ tài khoản:</b> ${esc(PAYMENT_BANK.accountName)}</div>
            <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;"><b>Số tiền:</b> ${pack.amount.toLocaleString('vi-VN')}đ <span class="btn-ghost btn btn-sm" style="padding:3px 10px;font-size:11.5px;" data-copy-value="${pack.amount}">Copy</span></div>
            <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;"><b>Nội dung CK (bắt buộc giữ nguyên):</b> <span style="font-family:'IBM Plex Mono',monospace;background:var(--accent-soft);padding:2px 8px;border-radius:6px;">${esc(transferContent)}</span> <span class="btn-ghost btn btn-sm" style="padding:3px 10px;font-size:11.5px;" data-copy-value="${esc(transferContent)}">Copy</span></div>
          </div>
          <div class="hint-box" style="margin-top:14px;">Quét mã hoặc chuyển khoản đúng số tiền + giữ nguyên nội dung <b>${esc(transferContent)}</b> — lượt được cộng thẳng trong vài phút, dùng được ngay, không ảnh hưởng tới hạn gói đang có.</div>
        ` : `
          <div class="error-box" style="margin-top:14px;">Chưa có mã tài khoản để đối chiếu tự động — thử tải lại trang.</div>
        `}

        <div class="btn-row" style="justify-content:flex-start;margin-top:18px;">
          <button class="btn btn-sm" id="crm-topup-recheck" ${state.topupChecking?'disabled':''}>${state.topupChecking?'Đang kiểm tra…':'Tôi đã chuyển khoản — kiểm tra lại'}</button>
        </div>
        ${state.topupCheckedOnce && !state.topupChecking ? `<div style="font-size:12.5px;color:var(--ink-soft);margin-top:8px;">Nếu chưa thấy cập nhật, đợi thêm 1-2 phút rồi bấm lại — nếu vẫn chưa thấy sau vài phút, báo lại để cộng tay.</div>` : ''}
      </div>
    `;
  }

  function bind(){
    container.querySelectorAll('[data-plan]').forEach(el=>{
      el.onclick = ()=>{ state.selectedPlanKey = el.getAttribute('data-plan'); draw(); };
    });
    container.querySelectorAll('[data-copy-value]').forEach(el=>{
      el.onclick = async ()=>{
        try{
          await navigator.clipboard.writeText(el.getAttribute('data-copy-value'));
          const old = el.textContent;
          el.textContent = 'Đã copy ✓';
          setTimeout(()=>{ el.textContent = old; }, 1500);
        } catch(e){}
      };
    });
    const recheckBtn = container.querySelector('#crm-recheck');
    if(recheckBtn) recheckBtn.onclick = recheckStatus;

    container.querySelectorAll('[data-topup]').forEach(el=>{
      el.onclick = ()=>{ state.selectedTopupKey = el.getAttribute('data-topup'); draw(); };
    });
    const topupRecheckBtn = container.querySelector('#crm-topup-recheck');
    if(topupRecheckBtn) topupRecheckBtn.onclick = recheckTopup;
  }

  draw();
  boot();
}

window.Modules = window.Modules || {};
window.Modules['nang-cap'] = { title:'Nâng Cấp', render };
})();
