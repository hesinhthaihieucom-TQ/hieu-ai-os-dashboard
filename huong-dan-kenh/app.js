(function () {
  // Cùng dự án Supabase với Xây Nhân Hiệu (URL + publishable key công khai, bảo mật nằm ở RLS).
  // Tiến độ lưu vào user_metadata của chính người đó nên không cần thêm bảng/schema mới.
  const SB_URL = 'https://ltcjlnvceuspnwldsbgi.supabase.co';
  const SB_KEY = 'sb_publishable_j0ohsTIc7Df5_dz5vDiniA_nB5jPYWy';
  const LEGACY_KEY = 'hdk_progress_v1';
  let KEY = LEGACY_KEY, sb = null, me = null, remoteTimer = null;
  const STEPS = window.STEPS, GROUPS = window.GROUPS;
  let state = { checks: {}, done: {} };
  const pushRemote = () => {
    if (!sb || !me) return;
    clearTimeout(remoteTimer);
    remoteTimer = setTimeout(() => { sb.auth.updateUser({ data: { hdk_progress: state } }).catch(() => {}); }, 1200);
  };
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {} pushRemote(); };
  // Server thắng; chưa có thì lấy bản trên máy của riêng tài khoản này, rồi mới tới bản cũ lúc chưa có đăng nhập.
  function loadState(user) {
    KEY = LEGACY_KEY + '_' + user.id;
    let s = user.user_metadata && user.user_metadata.hdk_progress;
    if (!s) { try { s = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) {} }
    if (!s) { try { s = JSON.parse(localStorage.getItem(LEGACY_KEY) || 'null'); } catch (e) {} }
    state = Object.assign({ checks: {}, done: {} }, s || {});
    save();
  }

  const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  // Cho phép <b> trong nội dung do mình viết sẵn (không nhận dữ liệu người dùng)
  const rich = s => s;

  const $ = (s, r = document) => r.querySelector(s);

  // Icon + thời gian làm ước tính (phút) cho từng bước — con số ước lượng cho người mới, không phải đo thật.
  const META = {
    's1-1': ['🧭', 15], 's1-2': ['📦', 10], 's2-1': ['📱', 30], 's2-2': ['✂️', 60], 's2-3': ['📅', 20], 's2-4': ['📸', 20],
    's2-5': ['🎬', 30], 's2-6': ['🗓️', 10], 's2-7': ['🎵', 15], 's3-1': ['🎥', 45], 's3-2': ['📖', 10], 's3-3': ['🚀', 20], 's3-4': ['👥', 20],
    'daily': ['✅', 10], 'confirm': ['❓', 5]
  };
  const metaOf = s => META[s.id] || ['📌', 15];
  const fmtMin = m => m >= 60 ? (m % 60 ? Math.floor(m / 60) + ' giờ ' + (m % 60) + ' phút' : Math.floor(m / 60) + ' giờ') : m + ' phút';
  const doneCount = () => STEPS.filter(s => s.grp !== 'g4' && isDone(s)).length;
  const realCount = () => STEPS.filter(s => s.grp !== 'g4').length;
  const dayKey = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  // Ghi nhận hôm nay có làm bài (chỉ khi tick hoặc bấm xong bước, không tính lúc chỉ mở app)
  function touchToday() {
    const k = dayKey(new Date());
    state.days = state.days || [];
    if (!state.days.includes(k)) state.days.push(k);
  }
  function streak() {
    const days = new Set(state.days || []);
    const d = new Date();
    if (!days.has(dayKey(d))) d.setDate(d.getDate() - 1);
    let n = 0;
    while (days.has(dayKey(d))) { n++; d.setDate(d.getDate() - 1); }
    return n;
  }
  const groupDone = gid => STEPS.filter(s => s.grp === gid).every(isDone);
  function badges() {
    const st = streak();
    return [
      { ic: '🌱', t: 'Gieo hạt', d: 'Xong Bước 1', on: groupDone('g1') },
      { ic: '🌿', t: 'Lên cành', d: 'Xong Bước 2', on: groupDone('g2') },
      { ic: '🌳', t: 'Lên sóng', d: 'Xong Bước 3', on: groupDone('g3') },
      { ic: '🔥', t: '3 ngày liền', d: 'Làm 3 ngày liên tiếp', on: st >= 3 },
      { ic: '🏆', t: '7 ngày liền', d: 'Làm 7 ngày liên tiếp', on: st >= 7 }
    ];
  }
  function toast(msg) {
    const t = document.createElement('div'); t.className = 'toast'; t.textContent = msg;
    document.body.appendChild(t); setTimeout(() => t.classList.add('out'), 2600); setTimeout(() => t.remove(), 3100);
  }
  function confetti() {
    const cols = ['#E3A92B', '#1F6F5C', '#4FB79C', '#B8432F', '#F3D58A'];
    for (let i = 0; i < 46; i++) {
      const p = document.createElement('i'); p.className = 'confetti';
      p.style.left = (10 + Math.random() * 80) + 'vw';
      p.style.background = cols[i % cols.length];
      p.style.animationDelay = (Math.random() * 0.4) + 's';
      p.style.setProperty('--dx', (Math.random() * 160 - 80) + 'px');
      p.style.setProperty('--rot', (Math.random() * 720 - 360) + 'deg');
      document.body.appendChild(p); setTimeout(() => p.remove(), 2400);
    }
  }
  const displayName = () => {
    const m = (me && me.user_metadata) || {};
    return (m.full_name || '').trim().split(/\s+/).slice(-1)[0] || ((me && me.email) || '').split('@')[0] || 'bạn';
  };

  function checkIds(step) {
    const ids = []; let i = 0;
    (function walk(blocks) {
      blocks.forEach(b => {
        if (b.t === 'ck') b.items.forEach(() => ids.push(step.id + ':' + (i++)));
        if (b.t === 'more') walk(b.blocks);
      });
    })(step.blocks);
    return ids;
  }
  function stepRatio(step) {
    const ids = checkIds(step);
    if (!ids.length) return state.done[step.id] ? 1 : 0;
    return ids.filter(id => state.checks[id]).length / ids.length;
  }
  const isDone = s => !!state.done[s.id];
  const overall = () => {
    const real = STEPS.filter(s => s.grp !== 'g4');
    return Math.round(real.filter(isDone).length / real.length * 100);
  };

  /* ---------- render blocks ---------- */
  function renderBlocks(step, blocks, ctr) {
    return blocks.map(b => {
      switch (b.t) {
        case 'p': return `<p>${rich(b.x)}</p>`;
        case 'h': return `<h2>${esc(b.x)}</h2>`;
        case 'ul': return `<ul>${b.items.map(i => `<li>${rich(esc(i))}</li>`).join('')}</ul>`;
        case 'ck': return `<ul class="ck">${b.items.map(it => {
          const id = step.id + ':' + (ctr.i++);
          const on = !!state.checks[id];
          return `<li class="${on ? 'on' : ''}" data-id="${id}"><input type="checkbox" ${on ? 'checked' : ''} aria-label="Đã làm"><span>${esc(it)}</span></li>`;
        }).join('')}</ul>`;
        case 'tbl': return `<div class="tbl-wrap"><table${b.wide ? ' class="wide"' : ''}><thead><tr>${b.head.map(h => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${b.rows.map(r => `<tr>${r.map(c => `<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
        case 'tip': return `<div class="tip">${rich(b.x)}</div>`;
        case 'warn': return `<div class="warn">${rich(b.x)}</div>`;
        case 'note': return `<div class="note">${rich(b.x)}</div>`;
        case 'copy': return `<div class="copy"><div class="ct"><span>${esc(b.title)}</span><button class="btn sm" data-copy>Sao chép</button></div><pre>${esc(b.x)}</pre></div>`;
        case 'svg': return `<figure>${window.ILLUS[b.k]()}<figcaption>${esc(b.cap || '')}</figcaption></figure>`;
        case 'more': return `<details class="more"><summary>${esc(b.title)}</summary>${renderBlocks(step, b.blocks, ctr)}</details>`;
        default: return '';
      }
    }).join('');
  }

  /* ---------- sidebar ---------- */
  function renderSide(cur) {
    const pct = overall();
    let h = `<div class="brand" id="t-brand">Từ Zero → Hero<small>Hướng dẫn xây kênh cho người mới</small></div>
      <div class="prog-wrap" id="t-prog"><div class="prog-top"><span>Tiến độ</span><b>${pct}%</b></div><div class="prog-bar"><i style="width:${pct}%"></i></div></div>
      <div class="nav" id="t-nav"><a href="#/" class="${cur === 'home' ? 'on' : ''}"><span class="dot">⌂</span><span>Bắt đầu từ đây</span></a>`;
    GROUPS.forEach(g => {
      h += `<div class="grp">${esc(g.title)}</div>`;
      STEPS.filter(s => s.grp === g.id).forEach(s => {
        h += `<a href="#/${s.id}" class="${cur === s.id ? 'on' : ''}"><span class="dot ${isDone(s) ? 'done' : ''}">${isDone(s) ? '✓' : ''}</span><span>${s.n ? s.n + ' · ' : ''}${esc(s.title)}</span></a>`;
      });
    });
    h += `</div><div class="side-foot">Đăng nhập: ${esc((me && me.email) || '')}<br>Tiến độ được lưu theo tài khoản.<br><button id="reset">Làm lại từ đầu</button> <button id="logout">Đăng xuất</button></div>`;
    $('#side').innerHTML = h;
    $('#logout').onclick = () => { sb.auth.signOut(); };
    $('#reset').onclick = () => { if (confirm('Xóa toàn bộ tiến độ và làm lại từ đầu?')) { state = { checks: {}, done: {}, days: [] }; save(); route(); } };
  }

  /* ---------- pages ---------- */
  function ring(pct) {
    const r = 54, c = 2 * Math.PI * r, off = c * (1 - pct / 100);
    return `<svg viewBox="0 0 130 130" class="ring" role="img" aria-label="Tiến độ ${pct}%"><circle cx="65" cy="65" r="${r}" class="rg-bg"/><circle cx="65" cy="65" r="${r}" class="rg-fg" stroke-dasharray="${c.toFixed(1)}" stroke-dashoffset="${off.toFixed(1)}" transform="rotate(-90 65 65)"/><text x="65" y="63" text-anchor="middle" class="rg-n">${pct}%</text><text x="65" y="84" text-anchor="middle" class="rg-l">hoàn thành</text></svg>`;
  }
  const badgeRow = () => `<div class="badges">${badges().map(b => `<div class="badge ${b.on ? 'on' : ''}" title="${esc(b.d)}"><span class="bi">${b.ic}</span><b>${esc(b.t)}</b><small>${b.on ? 'Đã đạt' : esc(b.d)}</small></div>`).join('')}</div>`;

  function home() {
    const first = STEPS.find(s => !isDone(s) && s.grp !== 'g4');
    const pct = overall(), st = streak(), nb = badges().filter(b => b.on).length;
    const all = !first;
    return `<div class="page">
      <section class="hero">
        <div class="hero-txt">
          <div class="hi">Chào ${esc(displayName())} 👋</div>
          <p>${all ? 'Bạn đã đi hết hành trình. Giờ chỉ cần đăng đều mỗi ngày theo lịch tuần.' : pct === 0 ? 'Bắt đầu xây kênh từ con số 0. Mỗi ngày làm một chút là đủ.' : 'Bạn đang làm rất tốt. Làm tiếp bước kế tiếp nhé.'}</p>
          ${all ? `<a class="btn gold big" href="#/s2-6">Xem lịch đăng tuần →</a>` : `<a class="btn gold big" href="#/${first.id}">${pct === 0 ? 'Bắt đầu' : 'Tiếp tục'}: ${first.n} ${esc(first.title)} →</a>`}
        </div>
        ${ring(pct)}
      </section>
      <section class="stats">
        <div class="stat"><b>${doneCount()}/${realCount()}</b><span>bước đã xong</span></div>
        <div class="stat"><b>🔥 ${st}</b><span>ngày liên tiếp</span></div>
        <div class="stat"><b>🏅 ${nb}/${badges().length}</b><span>huy hiệu</span></div>
      </section>
      <h2 class="sec">Cây quy trình</h2>
      <figure id="t-mindmap" class="mm">${window.ILLUS.mindmap()}<figcaption>Đi từ gốc lên ngọn, bấm vào ô để mở bước đó (trên điện thoại kéo ngang để xem đủ)</figcaption></figure>
      <h2 class="sec">Huy hiệu của bạn</h2>
      ${badgeRow()}
      <details class="more"><summary>Bạn sẽ làm được gì sau khi đi hết</summary>
        <ul><li>Có 1 kênh Facebook + TikTok hoàn chỉnh, cùng tên và hình.</li><li>Tự quay và dựng được video bằng CapCut.</li><li>Có lịch mỗi ngày trong 28 ngày: 3 video, 1 bài ảnh sản phẩm và 4–6 story.</li><li>Có phễu đưa người xem về nhóm Zalo và buổi Zoom.</li></ul></details>
      <details class="more"><summary>Ba quy tắc cho người mới</summary>
        <ul><li>Làm theo thứ tự, chưa xong bước này thì chưa sang bước sau.</li><li>Bám sát kịch bản và lịch, không tự thêm ý.</li><li>Nội dung sức khỏe chỉ nói "gợi ý", "có thể", "tuỳ cơ địa". Không hứa kết quả.</li></ul></details>
    </div>`;
  }

  function stepCard(s) {
    const [ic, mins] = metaOf(s), ids = checkIds(s), got = ids.filter(id => state.checks[id]).length;
    const done = isDone(s), pct = Math.round(stepRatio(s) * 100);
    const chip = done ? '<span class="chip ok">✓ Xong</span>' : got ? `<span class="chip go">Đang làm ${got}/${ids.length}</span>` : '<span class="chip">Chưa làm</span>';
    return `<a class="scard ${done ? 'done' : ''}" href="#/${s.id}"><span class="sic">${ic}</span>
      <span class="sbody"><span class="sn">${s.n ? 'Bước ' + s.n : 'Dành cho quản lý'}</span><b>${esc(s.title)}</b>
      <span class="smeta">⏱ Khoảng ${fmtMin(mins)}</span><span class="sbar"><i style="width:${done ? 100 : pct}%"></i></span></span>${chip}</a>`;
  }
  function pathPage() {
    return `<div class="page"><div class="crumb">Lộ trình</div><h1>Các bước làm</h1>
      <p class="lead">Làm lần lượt từ trên xuống. Bấm vào thẻ để mở bước.</p>
      ${GROUPS.map(g => `<h2 class="sec">${esc(g.title)}</h2><div class="sgrid">${STEPS.filter(s => s.grp === g.id).map(stepCard).join('')}</div>`).join('')}</div>`;
  }
  function accountPage() {
    const em = (me && me.email) || '', full = ((me && me.user_metadata && me.user_metadata.full_name) || '').trim();
    return `<div class="page"><div class="crumb">Tài khoản</div>
      <section class="acc"><div class="avatar">${esc((full || em || '?').charAt(0).toUpperCase())}</div><div><b>${esc(full || 'Chưa đặt tên')}</b><div class="muted">${esc(em)}</div></div></section>
      <section class="stats"><div class="stat"><b>${doneCount()}/${realCount()}</b><span>bước đã xong</span></div><div class="stat"><b>🔥 ${streak()}</b><span>ngày liên tiếp</span></div><div class="stat"><b>${overall()}%</b><span>hoàn thành</span></div></section>
      <h2 class="sec">Huy hiệu</h2>${badgeRow()}
      <h2 class="sec">Cài app lên điện thoại</h2>
      <div class="card"><b>iPhone (Safari):</b> bấm nút Chia sẻ, chọn "Thêm vào Màn hình chính".<br><b>Android (Chrome):</b> bấm 3 chấm, chọn "Cài đặt ứng dụng".</div>
      <div class="acc-btns"><button class="btn" id="acc-help">❓ Xem hướng dẫn dùng app</button><button class="btn" id="acc-reset">Làm lại từ đầu</button><button class="btn" id="acc-out">Đăng xuất</button></div></div>`;
  }

  function stepPage(step) {
    const ctr = { i: 0 };
    const idx = STEPS.indexOf(step);
    const prev = STEPS[idx - 1], next = STEPS[idx + 1];
    const g = GROUPS.find(x => x.id === step.grp);
    const ids = checkIds(step), got = ids.filter(id => state.checks[id]).length;
    return `<div class="page">
      <div class="crumb">${esc(g.title)}</div>
      <h1>${step.n ? step.n + ' · ' : ''}${esc(step.title)}</h1>
      <p class="lead">${esc(step.lead)}</p>
      <div class="smeta-bar"><span>${metaOf(step)[0]} Khoảng ${fmtMin(metaOf(step)[1])}</span>${ids.length ? `<span>📋 ${ids.length} việc cần tick</span>` : ''}${step.n ? `<span>Bước ${esc(step.n)} / ${realCount()}</span>` : ''}</div>
      ${renderBlocks(step, step.blocks, ctr)}
      <div class="done-bar">
        <span class="step-prog">${ids.length ? `Đã tick ${got}/${ids.length} việc` : 'Bước đọc hiểu'}</span>
        <button class="btn ${isDone(step) ? 'ok' : 'pri'}" id="mark">${isDone(step) ? '✓ Đã xong bước này (bấm để bỏ)' : 'Đã xong bước này'}</button>
      </div>
      <div class="pager">${prev ? `<a class="btn" style="text-decoration:none" href="#/${prev.id}">← ${esc(prev.title)}</a>` : '<span></span>'}${next ? `<a class="btn" style="text-decoration:none" href="#/${next.id}">${esc(next.title)} →</a>` : ''}</div>
    </div>`;
  }

  /* ---------- router ---------- */
  function route() {
    const id = (location.hash.replace(/^#\/?/, '') || '');
    const step = STEPS.find(s => s.id === id);
    const cur = step ? step.id : 'home';
    $('#main-body').innerHTML = step ? stepPage(step) : id === 'lo-trinh' ? pathPage() : id === 'tai-khoan' ? accountPage() : home();
    renderSide(cur);
    const tab = id === 'lo-trinh' ? 'lo-trinh' : id === 'tai-khoan' ? 'tai-khoan' : id === 's2-6' ? 's2-6' : step ? 'lo-trinh' : '';
    document.querySelectorAll('#tabbar a').forEach(x => x.classList.toggle('on', x.dataset.tab === tab || (!tab && x.dataset.tab === 'home')));
    if (id === 'tai-khoan') bindAccount();
    $('#side').classList.remove('open'); $('#scrim').classList.remove('open');
    window.scrollTo(0, 0);
    if (step) bindStep(step);
  }

  function bindAccount() {
    $('#acc-out').onclick = () => sb.auth.signOut();
    $('#acc-help').onclick = tour;
    $('#acc-reset').onclick = () => { if (confirm('Xóa toàn bộ tiến độ và làm lại từ đầu?')) { state = { checks: {}, done: {}, days: [] }; save(); route(); } };
  }

  function bindStep(step) {
    const root = $('#main-body');
    root.querySelectorAll('.ck li').forEach(li => {
      li.onclick = e => {
        const id = li.dataset.id;
        state.checks[id] = !state.checks[id];
        if (state.checks[id]) touchToday();
        save();
        li.classList.toggle('on', !!state.checks[id]);
        li.querySelector('input').checked = !!state.checks[id];
        const ids = checkIds(step), got = ids.filter(x => state.checks[x]).length;
        $('.step-prog', root).textContent = `Đã tick ${got}/${ids.length} việc`;
        e.preventDefault();
      };
    });
    root.querySelectorAll('[data-copy]').forEach(b => {
      b.onclick = () => {
        const txt = b.closest('.copy').querySelector('pre').textContent;
        const ok = () => { b.textContent = 'Đã sao chép ✓'; setTimeout(() => b.textContent = 'Sao chép', 1600); };
        if (navigator.clipboard) navigator.clipboard.writeText(txt).then(ok, ok); else ok();
      };
    });
    $('#mark').onclick = () => {
      const wasDone = !!state.done[step.id];
      state.done[step.id] = !wasDone;
      if (!wasDone) touchToday();
      save();
      if (!wasDone) {
        confetti();
        const left = realCount() - doneCount();
        const chang = STEPS.filter(s => s.grp === step.grp).every(isDone) && step.grp !== 'g4';
        toast(chang ? '🎉 Hoàn thành cả chặng! Bạn nhận được một huy hiệu mới.' : left === 0 ? '🏆 Bạn đã đi hết hành trình!' : '✅ Xong một bước! Còn ' + left + ' bước nữa.');
      }
      renderSide(step.id);
      const m = $('#mark'); m.className = 'btn ' + (isDone(step) ? 'ok' : 'pri');
      m.textContent = isDone(step) ? '✓ Đã xong bước này (bấm để bỏ)' : 'Đã xong bước này';
      if (isDone(step)) { const nx = STEPS[STEPS.indexOf(step) + 1]; if (nx && step.grp !== 'g4') location.hash = '#/' + nx.id; }
    };
  }

  /* ---------- tour ---------- */
  function tour() {
    const stops = [
      ['#t-nav', 'Đây là các bước. Làm lần lượt từ trên xuống. Dấu ✓ vàng là bước đã xong.'],
      ['#t-prog', 'Thanh này cho biết bạn đã đi được bao nhiêu phần trăm.'],
      ['#main-body', 'Mỗi bước có hình minh họa, việc cần làm (ô tick) và mẫu để sao chép. Làm xong thì bấm "Đã xong bước này".']
    ];
    let i = 0;
    const ov = document.createElement('div'); ov.className = 'tour-ov';
    const hole = document.createElement('div'); hole.className = 'tour-hole';
    const box = document.createElement('div'); box.className = 'tour-box';
    document.body.append(ov, hole, box);
    const end = () => { ov.remove(); hole.remove(); box.remove(); };
    ov.onclick = end;
    function show() {
      const s = $('#side'); if (i < 2 && window.innerWidth <= 860) s.classList.add('open'); else s.classList.remove('open');
      const el = $(stops[i][0]); el.scrollIntoView({ block: 'nearest' });
      const r = el.getBoundingClientRect();
      const h = Math.min(r.height, window.innerHeight - 40);
      Object.assign(hole.style, { left: r.left - 6 + 'px', top: Math.max(r.top, 6) - 6 + 'px', width: r.width + 12 + 'px', height: h + 12 + 'px' });
      box.innerHTML = `<div>${esc(stops[i][1])}</div><div class="row"><button class="btn sm" id="tk">Bỏ qua</button><button class="btn sm pri" id="tn">${i === stops.length - 1 ? 'Xong' : 'Tiếp →'}</button></div>`;
      const bx = Math.min(window.innerWidth - 360, Math.max(12, r.right + 18));
      box.style.left = (window.innerWidth <= 860 ? 12 : bx) + 'px';
      box.style.top = (window.innerWidth <= 860 ? window.innerHeight - 190 : Math.min(window.innerHeight - 190, Math.max(12, r.top + 20))) + 'px';
      $('#tk').onclick = end;
      $('#tn').onclick = () => { if (++i >= stops.length) end(); else show(); };
    }
    show();
  }

  /* ---------- đăng nhập / đăng ký ---------- */
  function authShell(inner) {
    $('#app').innerHTML = `<div class="auth-wrap"><div class="auth-card">
      <img src="assets/icon-192.png" alt="" class="auth-logo">
      <div class="crumb">Xây kênh từ Zero → Hero</div>${inner}</div></div>`;
  }
  function renderAuth(mode, msg, ok) {
    const login = mode !== 'signup';
    authShell(`<h1>${login ? 'Đăng nhập' : 'Tạo tài khoản'}</h1>
      <p class="lead">${login ? 'Đăng nhập để mở hướng dẫn và lưu tiến độ của bạn.' : 'Tạo tài khoản miễn phí để dùng hướng dẫn. Tiến độ của bạn được lưu lại, mở trên máy nào cũng thấy.'}</p>
      <div class="auth-tabs"><button class="${login ? 'on' : ''}" data-m="login">Đăng nhập</button><button class="${login ? '' : 'on'}" data-m="signup">Đăng ký</button></div>
      ${msg ? `<div class="${ok ? 'tip' : 'warn'}">${esc(msg)}</div>` : ''}
      <form id="af" novalidate>
        ${login ? '' : '<label>Họ tên<input id="af-name" autocomplete="name" placeholder="Nguyễn Văn A"></label>'}
        <label>Email<input id="af-email" type="email" autocomplete="email" placeholder="ten@email.com"></label>
        <label>Mật khẩu<input id="af-pass" type="password" autocomplete="${login ? 'current-password' : 'new-password'}" placeholder="Ít nhất 6 ký tự"></label>
        ${login ? '' : '<label>Nhập lại mật khẩu<input id="af-pass2" type="password" autocomplete="new-password"></label>'}
        <button class="btn pri" id="af-go" type="submit">${login ? 'Đăng nhập' : 'Tạo tài khoản'}</button>
      </form>
      ${login ? '<p class="auth-sub"><a href="#" id="af-forgot">Quên mật khẩu?</a></p>' : ''}`);
    document.querySelectorAll('.auth-tabs button').forEach(b => b.onclick = () => renderAuth(b.dataset.m));
    const fg = $('#af-forgot');
    if (fg) fg.onclick = async e => {
      e.preventDefault();
      const email = $('#af-email').value.trim();
      if (!email) return renderAuth('login', 'Nhập email vào ô Email rồi bấm "Quên mật khẩu" lại.');
      const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: location.origin + location.pathname });
      renderAuth('login', error ? error.message : 'Đã gửi email đặt lại mật khẩu. Kiểm tra hộp thư (cả mục thư rác).', !error);
    };
    $('#af').onsubmit = async e => {
      e.preventDefault();
      const email = $('#af-email').value.trim(), pass = $('#af-pass').value, btn = $('#af-go');
      if (!email) return renderAuth(mode, 'Vui lòng nhập email.');
      if (pass.length < 6) return renderAuth(mode, 'Mật khẩu cần ít nhất 6 ký tự.');
      try {
        if (login) {
          btn.disabled = true; btn.textContent = 'Đang xử lý…';
          const { error } = await sb.auth.signInWithPassword({ email, password: pass });
          if (error) throw error;
        } else {
          if (pass !== $('#af-pass2').value) return renderAuth('signup', 'Mật khẩu nhập lại không khớp.');
          btn.disabled = true; btn.textContent = 'Đang xử lý…';
          const { data, error } = await sb.auth.signUp({ email, password: pass, options: { data: { full_name: $('#af-name').value.trim() } } });
          if (error) throw error;
          if (!data.session) renderAuth('login', 'Tạo tài khoản thành công! Nếu hệ thống yêu cầu xác nhận email, kiểm tra hộp thư rồi quay lại đăng nhập.', true);
        }
      } catch (err) {
        const m = /Invalid login/i.test(err.message) ? 'Email hoặc mật khẩu chưa đúng.' : /already registered/i.test(err.message) ? 'Email này đã có tài khoản, hãy đăng nhập.' : err.message;
        renderAuth(mode, m);
      }
    };
  }
  function renderNewPass() {
    authShell(`<h1>Đặt mật khẩu mới</h1><p class="lead">Nhập mật khẩu mới cho tài khoản của bạn.</p>
      <form id="af" novalidate><label>Mật khẩu mới<input id="af-pass" type="password" autocomplete="new-password" placeholder="Ít nhất 6 ký tự"></label>
      <button class="btn pri" type="submit">Lưu mật khẩu</button></form>`);
    $('#af').onsubmit = async e => {
      e.preventDefault();
      const p = $('#af-pass').value;
      if (p.length < 6) return;
      const { error } = await sb.auth.updateUser({ password: p });
      if (error) { authShell(`<div class="warn">${esc(error.message)}</div>`); return; }
      history.replaceState(null, '', location.pathname + '#/');
      boot();
    };
  }

  /* ---------- init ---------- */
  function startApp(user) {
    me = user;
    loadState(user);
    $('#app').innerHTML = `<div class="layout"><aside class="side" id="side"></aside><div class="scrim" id="scrim"></div>
      <main class="main"><div class="topbar"><button class="burger" id="burger" aria-label="Mở menu">☰</button><span class="sp"></span><button class="btn sm" id="help">❓ Hướng dẫn</button></div><div id="main-body"></div></main></div>
      <nav class="tabbar" id="tabbar"><a href="#/" data-tab="home"><span>🏠</span>Trang chủ</a><a href="#/lo-trinh" data-tab="lo-trinh"><span>🗺️</span>Lộ trình</a><a href="#/s2-6" data-tab="s2-6"><span>🗓️</span>Lịch tuần</a><a href="#/tai-khoan" data-tab="tai-khoan"><span>👤</span>Tài khoản</a></nav>`;
    $('#burger').onclick = () => { $('#side').classList.add('open'); $('#scrim').classList.add('open'); };
    $('#scrim').onclick = () => { $('#side').classList.remove('open'); $('#scrim').classList.remove('open'); };
    $('#help').onclick = tour;
    route();
  }
  let booting = false, recovering = false;
  async function boot() {
    if (booting) return; booting = true;
    try {
      const { data } = await sb.auth.getSession();
      if (data.session) startApp(data.session.user); else { me = null; renderAuth('login'); }
    } finally { booting = false; }
  }
  document.addEventListener('DOMContentLoaded', () => {
    if (!window.supabase) { authShell('<h1>Không kết nối được</h1><p class="lead">Kiểm tra mạng rồi tải lại trang.</p><button class="btn pri" onclick="location.reload()">Tải lại</button>'); return; }
    sb = window.supabase.createClient(SB_URL, SB_KEY);
    window.addEventListener('hashchange', () => { if (me) route(); });
    sb.auth.onAuthStateChange((ev, session) => {
      if (ev === 'PASSWORD_RECOVERY') { recovering = true; renderNewPass(); return; }
      if (recovering) return;
      if (ev === 'SIGNED_IN' && session && (!me || me.id !== session.user.id)) startApp(session.user);
      if (ev === 'SIGNED_OUT') { me = null; renderAuth('login'); }
    });
    boot();
  });
})();
