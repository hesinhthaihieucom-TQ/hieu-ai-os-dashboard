(function(){
const CANVAS_W = 1080, CANVAS_H = 1350;
const HIGHLIGHT_COLOR = '#FFC93C';

const TEMPLATES = [
  { key:'overlay', label:'Chữ đè lên ảnh', desc:'Chữ nổi bật đè trực tiếp lên ảnh, nền mờ dần phía dưới — giống mẫu ảnh thời trang.' },
  { key:'bar', label:'Thanh chú thích dưới', desc:'Thanh nền tối liền khối ở đáy ảnh, chữ nằm gọn trong đó — giống mẫu ảnh chân dung.' },
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

function drawTitleBlock(ctx, title, opts){
  ctx.font = `700 ${opts.fontSize}px 'Oswald', sans-serif`;
  ctx.textBaseline = 'alphabetic';
  const words = parseWords(title);
  const lines = wrapWords(ctx, words, opts.maxWidth);
  const startY = opts.bottomY - (lines.length - 1) * opts.lineHeight;
  const spaceWidth = ctx.measureText(' ').width;
  ctx.shadowColor = 'rgba(0,0,0,0.55)';
  ctx.shadowBlur = 10;
  lines.forEach((line, i) => {
    let x = opts.leftX;
    const y = startY + i * opts.lineHeight;
    line.forEach(w => {
      ctx.fillStyle = w.highlight ? HIGHLIGHT_COLOR : '#FFFFFF';
      ctx.fillText(w.text, x, y);
      x += ctx.measureText(w.text).width + spaceWidth;
    });
  });
  ctx.shadowBlur = 0;
  return lines.length;
}

function render(container, ctx){
  const state = { bgImage:null, template:'overlay', title:'Facebook đang **trả lương** ảnh\ncao gấp đôi video?', handle:'@tenban', ready:false };

  function draw(){ container.innerHTML = html(); bind(); ensureFontsThenPaint(); }

  async function ensureFontsThenPaint(){
    try{ await Promise.all([
      document.fonts.load("700 56px 'Oswald'"),
      document.fonts.load("500 28px 'Be Vietnam Pro'"),
    ]); } catch(e){}
    paintCanvas();
  }

  function html(){
    return `
      <div class="page-head"><h1>Tạo Ảnh Thương Hiệu</h1><p>Tải ảnh nền, điền tiêu đề, chọn mẫu — ảnh thương hiệu ra ngay, tải PNG dùng luôn.</p></div>
      <div style="display:flex;gap:24px;flex-wrap:wrap;align-items:flex-start;">
        <div class="card" style="flex:1;min-width:280px;">
          <label style="display:block;font-size:13px;font-weight:600;color:var(--ink-soft);margin-bottom:6px;">Ảnh nền</label>
          <input type="file" accept="image/*" id="ta-upload">

          <label style="display:block;font-size:13px;font-weight:600;color:var(--ink-soft);margin:16px 0 6px;">Mẫu bố cục</label>
          <div class="chips">
            ${TEMPLATES.map(t=>`<div class="chip ${state.template===t.key?'selected':''}" data-tpl="${t.key}">${esc(t.label)}</div>`).join('')}
          </div>
          <div style="font-size:12.5px;color:var(--ink-soft);margin-top:6px;">${esc((TEMPLATES.find(t=>t.key===state.template)||{}).desc||'')}</div>

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

  function paintCanvas(){
    const canvas = container.querySelector('#ta-canvas');
    if(!canvas) return;
    const cx = canvas.getContext('2d');
    cx.clearRect(0,0,CANVAS_W,CANVAS_H);

    if(state.bgImage) drawImageCover(cx, state.bgImage, 0, 0, CANVAS_W, CANVAS_H);
    else { cx.fillStyle = '#2F6F62'; cx.fillRect(0,0,CANVAS_W,CANVAS_H); }

    const marginX = 64;

    if(state.template === 'overlay'){
      const gradStart = CANVAS_H * 0.45;
      const grad = cx.createLinearGradient(0, gradStart, 0, CANVAS_H);
      grad.addColorStop(0, 'rgba(0,0,0,0)');
      grad.addColorStop(1, 'rgba(0,0,0,0.8)');
      cx.fillStyle = grad;
      cx.fillRect(0, gradStart, CANVAS_W, CANVAS_H - gradStart);

      drawTitleBlock(cx, state.title, { fontSize:58, maxWidth:CANVAS_W - marginX*2, leftX:marginX, bottomY:CANVAS_H - 120, lineHeight:70 });
      cx.font = "500 30px 'Be Vietnam Pro', sans-serif";
      cx.fillStyle = '#E8E4D6';
      cx.shadowColor = 'rgba(0,0,0,0.5)'; cx.shadowBlur = 6;
      cx.fillText(state.handle, marginX, CANVAS_H - 60);
      cx.shadowBlur = 0;
    } else {
      const barH = CANVAS_H * 0.26;
      cx.fillStyle = 'rgba(10,12,10,0.9)';
      cx.fillRect(0, CANVAS_H - barH, CANVAS_W, barH);

      drawTitleBlock(cx, state.title, { fontSize:42, maxWidth:CANVAS_W - marginX*2, leftX:marginX, bottomY:CANVAS_H - 74, lineHeight:52 });
      cx.font = "500 24px 'Be Vietnam Pro', sans-serif";
      cx.fillStyle = '#E8E4D6';
      cx.fillText(state.handle, marginX, CANVAS_H - 34);
    }
  }

  function bind(){
    const upload = container.querySelector('#ta-upload');
    if(upload) upload.onchange = () => {
      const file = upload.files[0];
      if(!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => { state.bgImage = img; paintCanvas(); };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    };

    container.querySelectorAll('[data-tpl]').forEach(el=>{
      el.onclick = () => { state.template = el.getAttribute('data-tpl'); draw(); };
    });

    const titleInput = container.querySelector('#ta-title');
    if(titleInput) titleInput.oninput = () => { state.title = titleInput.value; paintCanvas(); };

    const handleInput = container.querySelector('#ta-handle');
    if(handleInput) handleInput.oninput = () => { state.handle = handleInput.value; paintCanvas(); };

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
