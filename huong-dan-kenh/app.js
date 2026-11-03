(function () {
  const KEY = 'hdk_progress_v1';
  const STEPS = window.STEPS, GROUPS = window.GROUPS;
  let state = { checks: {}, done: {} };
  try { state = Object.assign(state, JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (e) {}
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {} };

  const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  // Cho phép <b> trong nội dung do mình viết sẵn (không nhận dữ liệu người dùng)
  const rich = s => s;

  const $ = (s, r = document) => r.querySelector(s);

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
    h += `</div><div class="side-foot">Tiến độ được lưu trên máy này.<br><button id="reset">Làm lại từ đầu</button></div>`;
    $('#side').innerHTML = h;
    $('#reset').onclick = () => { if (confirm('Xóa toàn bộ tiến độ và làm lại từ đầu?')) { state = { checks: {}, done: {} }; save(); route(); } };
  }

  /* ---------- pages ---------- */
  function home() {
    const first = STEPS.find(s => !isDone(s) && s.grp !== 'g4') || STEPS[0];
    return `<div class="page">
      <div class="crumb">Xây kênh từ Zero → Hero</div>
      <h1>Hướng dẫn xây kênh cho người chưa biết gì</h1>
      <p class="lead">Làm lần lượt từng bước theo thanh bên trái. Mỗi bước có hình minh họa, việc cần làm và ô tick. Xong bước nào thì bấm "Đã xong bước này".</p>
      <figure id="t-mindmap" class="mm">${window.ILLUS.mindmap()}<figcaption>Bản đồ cả quy trình: bấm vào ô để mở bước đó (trên điện thoại kéo ngang để xem đủ)</figcaption></figure>
      <figure>${window.ILLUS.roadmap()}<figcaption>3 bước lớn của cả hành trình</figcaption></figure>
      <div class="card"><b>Bạn sẽ làm được gì sau khi đi hết:</b>
        <ul style="margin-top:8px"><li>Có 1 kênh Facebook + TikTok hoàn chỉnh, cùng tên và hình.</li><li>Tự quay và dựng được video bằng CapCut.</li><li>Có lịch mỗi ngày trong 28 ngày: 3 video, 1 bài ảnh sản phẩm và 4–6 story.</li><li>Có phễu đưa người xem về nhóm Zalo và buổi Zoom.</li></ul></div>
      <div class="card"><b>Ba quy tắc cho người mới</b>
        <ul style="margin-top:8px"><li>Làm theo thứ tự, chưa xong bước này thì chưa sang bước sau.</li><li>Bám sát kịch bản và lịch, không tự thêm ý.</li><li>Nội dung sức khỏe chỉ nói "gợi ý", "có thể", "tuỳ cơ địa". Không hứa kết quả.</li></ul></div>
      <div class="done-bar"><span class="step-prog">Tiếp theo: ${first.n ? first.n + ' · ' : ''}${esc(first.title)}</span><a class="btn pri" href="#/${first.id}" style="text-decoration:none">Bắt đầu →</a></div>
    </div>`;
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
    $('#main-body').innerHTML = step ? stepPage(step) : home();
    renderSide(cur);
    $('#side').classList.remove('open'); $('#scrim').classList.remove('open');
    window.scrollTo(0, 0);
    if (step) bindStep(step);
  }

  function bindStep(step) {
    const root = $('#main-body');
    root.querySelectorAll('.ck li').forEach(li => {
      li.onclick = e => {
        const id = li.dataset.id;
        state.checks[id] = !state.checks[id];
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
      state.done[step.id] = !state.done[step.id]; save();
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

  /* ---------- init ---------- */
  document.addEventListener('DOMContentLoaded', () => {
    $('#app').innerHTML = `<div class="layout"><aside class="side" id="side"></aside><div class="scrim" id="scrim"></div>
      <main class="main"><div class="topbar"><button class="burger" id="burger" aria-label="Mở menu">☰</button><span class="sp"></span><button class="btn sm" id="help">❓ Hướng dẫn</button></div><div id="main-body"></div></main></div>`;
    $('#burger').onclick = () => { $('#side').classList.add('open'); $('#scrim').classList.add('open'); };
    $('#scrim').onclick = () => { $('#side').classList.remove('open'); $('#scrim').classList.remove('open'); };
    $('#help').onclick = tour;
    window.addEventListener('hashchange', route);
    route();
  });
})();
