// App học Edit Video Bằng AI. Nội dung bài lấy từ ../api/edit-ai-hoc (chỉ trả khi sđt đã chuyển khoản).
// Tiến độ + ô tự kiểm tra lưu localStorage theo sđt (quy tắc "tự lưu trạng thái": F5 hay mở lại vẫn giữ chỗ đang học).
(function(){
  const $ = id => document.getElementById(id);
  const LS_PHONE = 'editai_hoc_phone';
  let phone = '', data = null, prog = { done:{}, checks:{}, last:'' };

  const lsGet = k => { try { return localStorage.getItem(k); } catch(e){ return null; } };
  const lsSet = (k,v) => { try { localStorage.setItem(k,v); } catch(e){} };
  const lsDel = k => { try { localStorage.removeItem(k); } catch(e){} };
  const progKey = () => 'editai_hoc_prog_' + phone;
  const saveProg = () => lsSet(progKey(), JSON.stringify(prog));
  function el(tag, attrs, kids){
    const n = document.createElement(tag);
    for (const k in (attrs||{})) { if (k === 'text') n.textContent = attrs[k]; else if (k === 'class') n.className = attrs[k]; else n.setAttribute(k, attrs[k]); }
    (kids||[]).forEach(c => n.appendChild(typeof c === 'string' ? document.createTextNode(c) : c));
    return n;
  }
  const flat = () => data.modules.flatMap(m => m.lessons.map(l => Object.assign({ mod:m }, l)));

  function showMsg(t){ const m = $('msg'); m.textContent = t; m.hidden = false; }

  async function enter(p){
    $('msg').hidden = true; $('go').disabled = true; $('go').textContent = 'Đang kiểm tra…';
    try {
      const r = await fetch('../api/edit-ai-hoc?phone=' + encodeURIComponent(p));
      const d = await r.json();
      if (!r.ok) { showMsg(d.error || 'Có lỗi, bạn thử lại nhé.'); return; }
      if (!d.paid) { showMsg('Chưa thấy khoản chuyển khoản của số này. Nếu bạn vừa chuyển, đợi 1–2 phút rồi thử lại. Cần hỗ trợ thì nhắn Zalo 0866 849 193.'); return; }
      phone = p; data = d; lsSet(LS_PHONE, p);
      try { prog = Object.assign({ done:{}, checks:{}, last:'' }, JSON.parse(lsGet(progKey()) || '{}')); } catch(e){}
      $('login').hidden = true; $('app').hidden = false;
      buildMenu(); openLesson(prog.last || '');
    } catch(e){ showMsg('Không kết nối được. Bạn kiểm tra mạng rồi thử lại.'); }
    finally { $('go').disabled = false; $('go').textContent = 'Vào học →'; }
  }

  function updateProgress(){
    const all = flat(), n = all.filter(l => prog.done[l.id]).length, pct = all.length ? Math.round(n / all.length * 100) : 0;
    $('barfill').style.width = pct + '%'; $('progtxt').textContent = pct + '%';
    document.querySelectorAll('#menu a.les').forEach(a => a.classList.toggle('done', !!prog.done[a.dataset.id]));
    document.querySelectorAll('#menu a.les .dot').forEach(d => { d.textContent = prog.done[d.parentNode.dataset.id] ? '✓' : ''; });
  }

  function buildMenu(){
    const menu = $('menu'); menu.textContent = '';
    const tog = el('button', { class:'ghost mnu-toggle', type:'button', text:'📚 Danh sách bài' });
    tog.onclick = () => menu.classList.toggle('collapsed');
    const inner = el('div', { id:'menuinner' });
    data.modules.forEach((m, i) => {
      const d = el('details'); if (i === 0) d.open = true; d.dataset.mod = m.id;
      d.appendChild(el('summary', {}, [ document.createTextNode('Module ' + (i+1) + ': ' + m.title), el('small', { text: m.desc }) ]));
      m.lessons.forEach(l => {
        const a = el('a', { class:'les', href:'#'+l.id }, [ el('span', { class:'dot' }), document.createTextNode(l.title) ]);
        a.dataset.id = l.id; a.onclick = ev => { ev.preventDefault(); openLesson(l.id); if (window.innerWidth <= 820) menu.classList.add('collapsed'); };
        d.appendChild(a);
      });
      inner.appendChild(d);
    });
    menu.appendChild(tog); menu.appendChild(inner);
    if (window.innerWidth <= 820) menu.classList.add('collapsed');
    updateProgress();
  }

  // Đổi link video (YouTube / Vimeo / Google Drive) thành link nhúng; link lạ hoặc để trống → không nhúng.
  function embedUrl(u){
    u = String(u || '').trim(); if (!u) return '';
    let m;
    if ((m = u.match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/))) return 'https://www.youtube-nocookie.com/embed/' + m[1] + '?rel=0';
    if ((m = u.match(/vimeo\.com\/(?:video\/)?(\d+)/))) return 'https://player.vimeo.com/video/' + m[1];
    if ((m = u.match(/drive\.google\.com\/file\/d\/([\w-]+)/))) return 'https://drive.google.com/file/d/' + m[1] + '/preview';
    return '';
  }
  function videoBox(l){
    const src = embedUrl(l.video);
    if (!src) return el('div', { class:'video empty' }, [ el('div', { text:'🎬 Video bài này đang được cập nhật' }), el('small', { text:'Bạn có thể làm theo các bước bên dưới trước.' }) ]);
    const f = el('iframe', { src:src, title:'Video bài: ' + l.title, loading:'lazy', allow:'accelerometer; autoplay; clipboard-write; encrypted-media; picture-in-picture; fullscreen', allowfullscreen:'' });
    return el('div', { class:'video' }, [ f ]);
  }

  function kitBox(){
    const kit = data.kitUrl
      ? el('a', { class:'btn', href:data.kitUrl, target:'_blank', rel:'noopener', text:'📦 Tải bộ kit' })
      : el('span', { class:'meta', text:'Bộ kit được gửi trong nhóm Zalo lớp học.' });
    const grp = el('a', { class:'ghost', href:data.group, target:'_blank', rel:'noopener', text:'💬 Vào nhóm Zalo lớp học' });
    return el('div', { class:'box kit' }, [ el('p', { text:'Bộ kit Hiểu Kênh Edit Video AI và nhóm hỗ trợ của lớp.' }), kit, grp ]);
  }

  function openLesson(id){
    const all = flat(); const i = all.findIndex(l => l.id === id);
    const main = $('main'); main.textContent = '';
    if (i < 0) {   // màn chào: chưa chọn bài thì gợi ý bài kế tiếp chưa học
      const next = all.find(l => !prog.done[l.id]) || all[0];
      main.appendChild(el('div', { class:'welcome' }, [
        el('div', { class:'crumb', text:'Chào mừng bạn' }), el('h2', { text:'Làm chủ edit video bằng AI, từng bước một' }),
        el('p', { class:'meta', text:data.modules.length + ' module · ' + all.length + ' bài ngắn. Làm theo thứ tự, mỗi bài có các bước cụ thể và danh sách tự kiểm tra.' }),
        kitBox(),
        (() => { const b = el('button', { class:'btn', type:'button', text:'Bắt đầu: ' + next.title + ' →' }); b.onclick = () => openLesson(next.id); return b; })()
      ]));
      document.querySelectorAll('#menu a.les').forEach(a => a.classList.remove('on')); return;
    }
    const l = all[i]; prog.last = id; saveProg();
    document.querySelectorAll('#menu a.les').forEach(a => a.classList.toggle('on', a.dataset.id === id));
    const mi = data.modules.indexOf(l.mod);
    document.querySelectorAll('#menu details').forEach(d => { if (d.dataset.mod === l.mod.id) d.open = true; });
    main.appendChild(el('div', { class:'crumb', text:'Module ' + (mi+1) + ' · ' + l.mod.title }));
    main.appendChild(el('h2', { text:l.title }));
    main.appendChild(el('div', { class:'meta', text:'⏱ khoảng ' + l.min + ' phút' }));
    if (i === 0) main.appendChild(kitBox());
    main.appendChild(videoBox(l));
    main.appendChild(el('div', { class:'box goal' }, [ el('h3', { text:'🎯 Sau bài này bạn có' }), el('p', { text:l.goal }) ]));
    main.appendChild(el('div', { class:'box' }, [ el('details', {}, [ el('summary', { text:'💡 Vì sao quan trọng' }), el('p', { text:l.why }) ]) ]));
    const ol = el('ol', { class:'steps' }); l.steps.forEach(s => ol.appendChild(el('li', { text:s })));
    main.appendChild(el('div', { class:'box' }, [ el('h3', { text:'🛠️ Các bước làm' }), ol ]));
    const saved = prog.checks[id] || [];
    const chk = el('div', { class:'checks' });
    l.check.forEach((c, k) => {
      const cb = el('input', { type:'checkbox' }); cb.checked = !!saved[k];
      cb.onchange = () => { const arr = (prog.checks[id] || []).slice(); arr[k] = cb.checked; prog.checks[id] = arr; saveProg(); };
      chk.appendChild(el('label', {}, [ cb, document.createTextNode(c) ]));
    });
    main.appendChild(el('div', { class:'box' }, [ el('h3', { text:'✅ Tự kiểm tra' }), chk ]));
    if (l.note) main.appendChild(el('div', { class:'note' }, [ el('b', { text:'🧠 Nhớ một điều: ' }), document.createTextNode(l.note) ]));
    const done = el('button', { class:'btn done-btn' + (prog.done[id] ? ' is-done' : ''), type:'button', text: prog.done[id] ? '✓ Đã học xong (bấm để bỏ)' : 'Đã học xong bài này' });
    done.onclick = () => { prog.done[id] = !prog.done[id]; saveProg(); updateProgress(); openLesson(id); };
    main.appendChild(done);
    const pg = el('div', { class:'pager' });
    if (i > 0) { const b = el('button', { class:'ghost', type:'button', text:'← ' + all[i-1].title }); b.onclick = () => openLesson(all[i-1].id); pg.appendChild(b); }
    if (i < all.length - 1) { const b = el('button', { class:'ghost', type:'button', text:all[i+1].title + ' →' }); b.onclick = () => openLesson(all[i+1].id); pg.appendChild(b); }
    main.appendChild(pg);
    window.scrollTo({ top:0 });
  }

  $('go').onclick = () => { const p = $('phone').value.replace(/[\s.\-]/g, ''); if (!/^0\d{9}$/.test(p)) { showMsg('Số điện thoại cần đủ 10 số, bắt đầu bằng 0.'); return; } enter(p); };
  $('phone').addEventListener('keydown', e => { if (e.key === 'Enter') $('go').click(); });
  $('logout').onclick = () => { lsDel(LS_PHONE); location.reload(); };
  $('helpbtn').onclick = () => { $('help').hidden = false; };
  $('helpclose').onclick = () => { $('help').hidden = true; lsSet('editai_hoc_help_seen', '1'); };

  const saved = lsGet(LS_PHONE);
  if (saved) { $('phone').value = saved; enter(saved).then(() => { if (!$('app').hidden && !lsGet('editai_hoc_help_seen')) $('help').hidden = false; }); }
  else { $('phone').focus(); }
})();
