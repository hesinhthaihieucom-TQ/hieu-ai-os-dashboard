(function(){
function render(container, ctx){
  const state = {
    loading:true, dueCount:0, dueRows:[], totalCustomers:0,
    // Thông báo nhắc follow (2026-08-29, theo yêu cầu chị Quỳnh: "AI có tự đặt lịch thông báo đến
    // ngày follow khách được không") — copy đúng pattern nhan-hieu/js/lich-dang.js, dùng chung
    // push_subscriptions/notification_log/api/push-subscribe.js sẵn có (không app nào riêng cả),
    // chỉ khác nội dung thông báo (xem api/cron/send-reminders.js checkCrmFollowReminders).
    pushSupported: !!(window.PushManager && navigator.serviceWorker && window.Notification),
    pushSubscribed:false, pushBusy:false, pushError:null,
    testPushBusy:false, testPushResult:null,
  };

  function draw(){ container.innerHTML = html(); bind(); }

  async function checkPushSubscription(){
    if(!state.pushSupported) { draw(); return; }
    try{
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      state.pushSubscribed = !!sub;
    } catch(e){ state.pushSubscribed = false; }
    draw();
  }

  async function enablePush(){
    if(state.pushBusy) return;
    state.pushBusy = true; state.pushError = null; draw();
    try{
      if(!state.pushSupported) throw new Error('Trình duyệt này không hỗ trợ thông báo đẩy.');
      const permission = await Notification.requestPermission();
      if(permission !== 'granted') throw new Error('Bạn chưa cấp quyền thông báo — vào cài đặt trình duyệt/điện thoại để bật lại nếu muốn thử lại.');
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });
      await callApi('/api/push-subscribe', sub.toJSON());
      state.pushSubscribed = true;
    } catch(e){
      state.pushError = e.message || 'Không bật được thông báo — thử lại giúp mình.';
    }
    state.pushBusy = false; draw();
  }

  async function disablePush(){
    if(state.pushBusy) return;
    state.pushBusy = true; state.pushError = null; draw();
    try{
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if(sub){
        await callApi('/api/push-unsubscribe', { endpoint: sub.endpoint });
        await sub.unsubscribe();
      }
      state.pushSubscribed = false;
    } catch(e){
      state.pushError = e.message || 'Không tắt được thông báo — thử lại giúp mình.';
    }
    state.pushBusy = false; draw();
  }

  async function testPush(){
    if(state.testPushBusy) return;
    state.testPushBusy = true; state.testPushResult = null; draw();
    try{
      const data = await callApi('/api/test-push', {});
      state.testPushResult = { ok: data.ok, message: data.message };
    } catch(e){
      state.testPushResult = { ok:false, message: e.message || 'Không gửi được — thử lại giúp mình.' };
    }
    state.testPushBusy = false; draw();
  }

  async function load(){
    const todayIso = isoDate(new Date());
    const [{ data: due }, { count }] = await Promise.all([
      ctx.supabase.from('crm_customers').select('id,ten_khach_hang,do_nong,ngay_follow_tiep').eq('user_id', ctx.user.id).lte('ngay_follow_tiep', todayIso).order('ngay_follow_tiep', { ascending:true }).limit(20),
      ctx.supabase.from('crm_customers').select('id', { count:'exact', head:true }).eq('user_id', ctx.user.id),
    ]);
    state.dueRows = due || [];
    state.dueCount = state.dueRows.length;
    state.totalCustomers = count || 0;
    state.loading = false;
    draw();
  }

  function isoDate(d){
    const tzOffset = d.getTimezoneOffset() * 60000;
    return new Date(d - tzOffset).toISOString().slice(0,10);
  }

  const QUICK_LINKS = [
    { key:'tu-van', icon:'💬', label:'Tư Vấn AI', desc:'Dán ảnh chụp chat, nhận câu tư vấn dùng ngay' },
    { key:'khach-hang', icon:'📇', label:'Khách Hàng', desc:'Xem/lọc toàn bộ hồ sơ khách đang chăm sóc' },
    { key:'cau-chuyen', icon:'📖', label:'Câu Chuyện Của Bạn', desc:'Hồ sơ giúp AI tư vấn đúng giọng, đúng câu chuyện thật' },
    { key:'nang-cap', icon:'💳', label:'Nâng Cấp', desc:'Xem gói và gia hạn' },
  ];

  function html(){
    const name = (ctx.profile && ctx.profile.full_name) || '';
    return `
      <div class="page-head">
        <h1>Chào ${esc(name || 'bạn')} 👋</h1>
        <p>Trợ Lý AI Tư Vấn &amp; CRM — tư vấn khách hàng đúng quy trình, CRM tự lưu, tự nhắc lịch follow.</p>
      </div>

      ${state.loading ? `<div class="loading"><div class="spinner"></div></div>` : `
        <div class="section ${state.dueCount>0?'highlight':''}">
          <h3>Cần follow hôm nay${state.dueCount>0?` (${state.dueCount})`:''}</h3>
          ${state.dueRows.length===0
            ? `<div class="body" style="color:var(--ink-soft);">Không có khách nào tới hạn follow hôm nay.</div>`
            : state.dueRows.map(r=>`
              <div class="list-item" data-goto-customer="${r.id}" style="cursor:pointer;">
                <div class="txt">
                  <div class="meta">${r.ngay_follow_tiep ? (new Date(r.ngay_follow_tiep).getTime()<Date.now()-86400000 ? 'Quá hạn' : 'Hôm nay') : ''} · ${esc(r.do_nong||'')}</div>
                  ${esc(r.ten_khach_hang)}
                </div>
              </div>
            `).join('')}
        </div>

        <div class="source-grid" style="margin-bottom:24px;">
          <div class="source-card" style="cursor:default;">
            <div class="ic">📇</div>
            <div class="label">${state.totalCustomers} khách đang quản lý</div>
          </div>
        </div>
      `}

      <div class="page-head" style="margin-bottom:12px;"><h2 style="font-size:17px;">Bắt đầu từ đâu</h2></div>
      <div class="source-grid" style="margin-bottom:24px;">
        ${QUICK_LINKS.map(l=>`
          <div class="source-card" data-goto="${l.key}">
            <div class="ic">${l.icon}</div>
            <div class="label">${esc(l.label)}</div>
            <div style="font-size:11.5px;color:var(--ink-soft);margin-top:4px;">${esc(l.desc)}</div>
          </div>
        `).join('')}
      </div>

      <div class="card">
        <h3 style="margin-bottom:6px;">Thông báo nhắc follow</h3>
        <div class="hint-box" style="margin-bottom:14px;">Bật để mỗi sáng nhận thông báo ngay trên máy nếu có khách đến hạn/quá hạn follow — không cần mở app kiểm tra tay. Trên iPhone: cần <b>"Thêm vào Màn hình chính"</b> trước (bấm nút Chia sẻ trên Safari) — Safari không hỗ trợ thông báo cho tab trình duyệt thường.</div>
        ${!state.pushSupported ? `
          <div class="error-box">Trình duyệt/thiết bị này không hỗ trợ thông báo đẩy.</div>
        ` : state.pushSubscribed ? `
          <button class="btn-ghost btn btn-sm" data-action="disable-push" ${state.pushBusy?'disabled':''}>${state.pushBusy?'Đang tắt…':'✓ Đã bật — bấm để tắt'}</button>
        ` : `
          <button class="btn btn-sm" data-action="enable-push" ${state.pushBusy?'disabled':''}>${state.pushBusy?'Đang bật…':'Bật thông báo'}</button>
        `}
        ${state.pushError?`<div class="error-box" style="margin-top:10px;">${esc(state.pushError)}</div>`:''}
        ${state.pushSupported ? `
          <div style="margin-top:12px;padding-top:12px;border-top:1px solid var(--line);">
            <span class="btn-ghost btn btn-sm" data-action="test-push" ${state.testPushBusy?'disabled':''}>${state.testPushBusy?'Đang gửi…':'Gửi thử thông báo'}</span>
            <div style="font-size:11.5px;color:var(--ink-soft);margin-top:4px;">Bấm để kiểm tra ngay thông báo có hoạt động không, không cần chờ đúng 8h15 sáng.</div>
            ${state.testPushResult ? `<div class="${state.testPushResult.ok?'hint-box':'error-box'}" style="margin-top:8px;">${esc(state.testPushResult.message)}</div>` : ''}
          </div>
        ` : ''}
      </div>
    `;
  }

  function bind(){
    container.querySelectorAll('[data-goto]').forEach(el=>{
      el.onclick = ()=>{ location.hash = el.getAttribute('data-goto'); };
    });
    container.querySelectorAll('[data-goto-customer]').forEach(el=>{
      el.onclick = ()=>{ window.__crmOpenCustomerId = el.getAttribute('data-goto-customer'); location.hash = 'khach-hang'; };
    });

    const enablePushBtn = container.querySelector('[data-action="enable-push"]');
    if(enablePushBtn) enablePushBtn.onclick = enablePush;
    const disablePushBtn = container.querySelector('[data-action="disable-push"]');
    if(disablePushBtn) disablePushBtn.onclick = disablePush;
    const testPushBtn = container.querySelector('[data-action="test-push"]');
    if(testPushBtn) testPushBtn.onclick = testPush;
  }

  draw();
  load();
  checkPushSubscription();
}

window.Modules = window.Modules || {};
window.Modules['trang-chu'] = { title:'Trang chủ', render };
})();
