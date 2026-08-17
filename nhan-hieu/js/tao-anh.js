(function(){
const CANVAS_W = 1080, CANVAS_H = 1350;
const HIGHLIGHT_COLOR = '#FFC93C';
const DEMO_TITLE = 'Facebook đang **trả lương** ảnh\ncao gấp đôi video?';
const DEMO_HANDLE = '@tenban';

// 4 kiểu bố cục tổng hợp từ các mẫu Canva thực tế (2 link mẫu được gửi).
const TEMPLATES = [
  { key:'bottom-center', label:'Chữ dưới - căn giữa', desc:'Chữ nổi bật đè lên ảnh, căn giữa phía dưới, nền mờ dần — giống mẫu ảnh thời trang/ảnh nói chuyện.', textPos:'bottom', align:'center', decor:'gradient-bottom' },
  { key:'top-center', label:'Chữ trên - căn giữa', desc:'Chữ nằm phía trên ảnh, căn giữa — hợp ảnh có phần trên tối/rộng như ảnh bàn thờ, không gian, phong cảnh.', textPos:'top', align:'center', decor:'gradient-top' },
  { key:'quote-left', label:'Trích dẫn - lề trái', desc:'Chữ lề trái có vạch nhấn màu vàng bên cạnh, kiểu trích dẫn/quan điểm — giống mẫu ảnh triết lý, thông điệp sâu.', textPos:'middle', align:'left', decor:'accent-bar' },
  { key:'caption-bar', label:'Thanh chú thích dưới', desc:'Thanh nền tối liền khối ở đáy ảnh, chữ nằm gọn trong đó — giống mẫu ảnh chân dung, phỏng vấn.', textPos:'bottom', align:'center', decor:'solid-bar' },
];

function parseWords(text){
  const segments = String(text||'').split('**');
  const words = [];
  segments.forEach((seg, i) => {
    const highlight = i % 2 === 1;
    seg.split(/\s+/).filter(Boolean).forEach(w => words.push({ text:w, highlight }));
  });
  return words;
}

function wrapWords(ctx, words, maxWidth){
  const spaceWidth = ctx.measureText(' ').width;
  const lines = [];
  let current = [];
  let currentWidth = 0;
  words.forEach(w => {
    const wWidth = ctx.measureText(w.text).width;
    const addWidth = current.length ? spaceWidth + wWidth : wWidth;
    if(currentWidth + addWidth > maxWidth && current.length){
      lines.push(current);
      current = [w];
      currentWidth = wWidth;
    } else {
      current.push(w);
      currentWidth += addWidth;
    }
  });
  if(current.length) lines.push(current);
  return lines;
}

function drawImageCover(ctx, img, x, y, w, h){
  const imgRatio = img.width / img.height;
  const boxRatio = w / h;
  let sx, sy, sw, sh;
  if(imgRatio > boxRatio){
    sh = img.height; sw = sh * boxRatio; sx = (img.width - sw) / 2; sy = 0;
  } else {
    sw = img.width; sh = sw / boxRatio; sx = 0; sy = (img.height - sh) / 2;
  }
  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
}

function drawLines(ctx, lines, opts){
  const spaceWidth = ctx.measureText(' ').width;
  ctx.shadowColor = 'rgba(0,0,0,0.55)';
  ctx.shadowBlur = 10;
  lines.forEach((line, i) => {
    const y = opts.startY + i * opts.lineHeight;
    if(opts.align === 'center'){
      const totalWidth = line.reduce((sum,w,idx)=> sum + ctx.measureText(w.text).width + (idx>0?spaceWidth:0), 0);
      let x = opts.x - totalWidth/2;
      line.forEach(w => {
        ctx.fillStyle = w.highlight ? HIGHLIGHT_COLOR : '#FFFFFF';
        ctx.fillText(w.text, x, y);
        x += ctx.measureText(w.text).width + spaceWidth;
      });
    } else {
      let x = opts.x;
      line.forEach(w => {
        ctx.fillStyle = w.highlight ? HIGHLIGHT_COLOR : '#FFFFFF';
        ctx.fillText(w.text, x, y);
        x += ctx.measureText(w.text).width + spaceWidth;
      });
    }
  });
  ctx.shadowBlur = 0;
}

function paintTemplate(cx, W, H, tplKey, { title, handle, bgImage }){
  const tpl = TEMPLATES.find(t=>t.key===tplKey) || TEMPLATES[0];
  const scale = W / CANVAS_W;
  const marginX = 64 * scale;

  cx.clearRect(0,0,W,H);
  if(bgImage) drawImageCover(cx, bgImage, 0, 0, W, H);
  else { cx.fillStyle = '#2F6F62'; cx.fillRect(0,0,W,H); }

  const isAccent = tpl.decor === 'accent-bar';
  const fontSize = Math.round((isAccent ? 46 : tpl.decor==='solid-bar' ? 42 : 58) * scale);
  const lineHeight = Math.round((isAccent ? 58 : tpl.decor==='solid-bar' ? 52 : 70) * scale);
  const handleSize = Math.round((tpl.decor==='solid-bar' ? 24 : 30) * scale);

  cx.font = `700 ${fontSize}px 'Oswald', sans-serif`;
  cx.textBaseline = 'alphabetic';
  const maxWidth = W - marginX*2 - (isAccent ? 24*scale : 0);
  const words = parseWords(title);
  const lines = wrapWords(cx, words, maxWidth);

  let anchorY;
  if(tpl.textPos === 'bottom') anchorY = H - (tpl.decor==='solid-bar' ? 74*scale : 120*scale);
  else if(tpl.textPos === 'top') anchorY = 150*scale;
  else anchorY = H * 0.5;

  let startY;
  if(tpl.textPos === 'bottom') startY = anchorY - (lines.length-1)*lineHeight;
  else if(tpl.textPos === 'top') startY = anchorY;
  else startY = anchorY - (lines.length-1)*lineHeight/2;

  // Decor (drawn before text)
  if(tpl.decor === 'gradient-bottom'){
    const gradStart = H * 0.45;
    const grad = cx.createLinearGradient(0, gradStart, 0, H);
    grad.addColorStop(0, 'rgba(0,0,0,0)'); grad.addColorStop(1, 'rgba(0,0,0,0.8)');
    cx.fillStyle = grad; cx.fillRect(0, gradStart, W, H - gradStart);
  } else if(tpl.decor === 'gradient-top'){
    const gradEnd = H * 0.42;
    const grad = cx.createLinearGradient(0, 0, 0, gradEnd);
    grad.addColorStop(0, 'rgba(0,0,0,0.65)'); grad.addColorStop(1, 'rgba(0,0,0,0)');
    cx.fillStyle = grad; cx.fillRect(0, 0, W, gradEnd);
  } else if(tpl.decor === 'solid-bar'){
    const barH = H * 0.26;
    cx.fillStyle = 'rgba(10,12,10,0.9)';
    cx.fillRect(0, H - barH, W, barH);
  } else if(tpl.decor === 'accent-bar'){
    const boxTop = startY - lineHeight*0.7;
    const boxHeight = lines.length*lineHeight + lineHeight*0.35;
    cx.fillStyle = 'rgba(8,10,8,0.5)';
    cx.fillRect(marginX - 22*scale, boxTop, maxWidth + 40*scale, boxHeight);
    cx.fillStyle = HIGHLIGHT_COLOR;
    cx.fillRect(marginX - 22*scale, boxTop, 6*scale, boxHeight);
  }

  const alignX = tpl.align === 'center' ? W/2 : marginX;
  drawLines(cx, lines, { align: tpl.align, x: alignX, startY, lineHeight });

  cx.font = `500 ${handleSize}px 'Be Vietnam Pro', sans-serif`;
  cx.fillStyle = '#E8E4D6';
  cx.shadowColor = 'rgba(0,0,0,0.5)'; cx.shadowBlur = 6*scale;
  const handleY = tpl.textPos==='bottom'
    ? anchorY + lineHeight*0.62
    : tpl.textPos==='top'
      ? startY + lines.length*lineHeight + handleSize*0.2
      : startY + lines.length*lineHeight + handleSize*0.6;
  if(tpl.align === 'center'){
    const hw = cx.measureText(handle).width;
    cx.fillText(handle, W/2 - hw/2, handleY);
  } else {
    cx.fillText(handle, alignX, handleY);
  }
  cx.shadowBlur = 0;
}

function render(container, ctx){
  const state = { bgImage:null, template:'bottom-center', title:DEMO_TITLE, handle:DEMO_HANDLE };

  function draw(){ container.innerHTML = html(); bind(); ensureFontsThenPaint(); }

  async function ensureFontsThenPaint(){
    try{ await Promise.all([
      document.fonts.load("700 56px 'Oswald'"),
      document.fonts.load("500 28px 'Be Vietnam Pro'"),
    ]); } catch(e){}
    paintMain();
    paintThumbs();
  }

  function html(){
    return `
      <div class="page-head"><h1>Tạo Ảnh Thương Hiệu</h1><p>Tải ảnh nền, chọn mẫu bạn thích, điền tiêu đề — ảnh thương hiệu ra ngay, tải PNG dùng luôn.</p></div>
      <div style="display:flex;gap:24px;flex-wrap:wrap;align-items:flex-start;">
        <div class="card" style="flex:1;min-width:280px;">
          <label style="display:block;font-size:13px;font-weight:600;color:var(--ink-soft);margin-bottom:6px;">Ảnh nền</label>
          <input type="file" accept="image/*" id="ta-upload">

          <label style="display:block;font-size:13px;font-weight:600;color:var(--ink-soft);margin:16px 0 8px;">Chọn kiểu bạn thích</label>
          <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:10px;">
            ${TEMPLATES.map(t=>`
              <div data-tpl="${t.key}" style="cursor:pointer;border:2px solid ${state.template===t.key?'var(--accent)':'var(--line)'};border-radius:10px;padding:6px;background:#FDFCF8;">
                <canvas class="ta-thumb" data-thumb-for="${t.key}" width="180" height="225" style="width:100%;height:auto;border-radius:6px;display:block;"></canvas>
                <div style="font-size:11.5px;font-weight:600;text-align:center;margin-top:6px;color:${state.template===t.key?'var(--accent)':'var(--ink)'};">${esc(t.label)}</div>
              </div>
            `).join('')}
          </div>
          <div style="font-size:12.5px;color:var(--ink-soft);margin-top:10px;">${esc((TEMPLATES.find(t=>t.key===state.template)||{}).desc||'')}</div>

          <label style="display:block;font-size:13px;font-weight:600;color:var(--ink-soft);margin:16px 0 6px;">Tiêu đề chính</label>
          <div style="font-size:12.5px;color:var(--ink-soft);margin-bottom:6px;">Bọc từ khoá muốn tô vàng trong dấu **...**, ví dụ: Facebook đang **trả lương** ảnh cao gấp đôi video?</div>
          <textarea id="ta-title" style="min-height:80px;">${esc(state.title)}</textarea>

          <label style="display:block;font-size:13px;font-weight:600;color:var(--ink-soft);margin:16px 0 6px;">Handle thương hiệu</label>
          <input type="text" id="ta-handle" value="${esc(state.handle)}" placeholder="@tenban" style="width:100%;padding:12px 14px;border:1px solid var(--line);border-radius:10px;font-size:14.5px;background:#FDFCF8;">

          <div class="btn-row"><button class="btn" data-action="download">Tải ảnh PNG</button></div>
        </div>
        <div style="flex:0 0 auto;">
          <canvas id="ta-canvas" width="${CANVAS_W}" height="${CANVAS_H}" style="width:320px;height:400px;border-radius:12px;border:1px solid var(--line);background:#ddd;"></canvas>
        </div>
      </div>
    `;
  }

  function paintMain(){
    const canvas = container.querySelector('#ta-canvas');
    if(!canvas) return;
    paintTemplate(canvas.getContext('2d'), CANVAS_W, CANVAS_H, state.template, { title: state.title, handle: state.handle, bgImage: state.bgImage });
  }

  function paintThumbs(){
    container.querySelectorAll('.ta-thumb').forEach(c=>{
      const key = c.getAttribute('data-thumb-for');
      paintTemplate(c.getContext('2d'), c.width, c.height, key, { title: DEMO_TITLE, handle: DEMO_HANDLE, bgImage: state.bgImage });
    });
  }

  function bind(){
    const upload = container.querySelector('#ta-upload');
    if(upload) upload.onchange = () => {
      const file = upload.files[0];
      if(!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => { state.bgImage = img; paintMain(); paintThumbs(); };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    };

    container.querySelectorAll('[data-tpl]').forEach(el=>{
      el.onclick = () => { state.template = el.getAttribute('data-tpl'); draw(); };
    });

    const titleInput = container.querySelector('#ta-title');
    if(titleInput) titleInput.oninput = () => { state.title = titleInput.value; paintMain(); };

    const handleInput = container.querySelector('#ta-handle');
    if(handleInput) handleInput.oninput = () => { state.handle = handleInput.value; paintMain(); };

    const downloadBtn = container.querySelector('[data-action="download"]');
    if(downloadBtn) downloadBtn.onclick = () => {
      const canvas = container.querySelector('#ta-canvas');
      const a = document.createElement('a');
      a.download = 'anh-thuong-hieu.png';
      a.href = canvas.toDataURL('image/png');
      a.click();
    };
  }

  draw();
}

window.Modules = window.Modules || {};
window.Modules['tao-anh'] = { title:'Tạo Ảnh Thương Hiệu', render };
})();
