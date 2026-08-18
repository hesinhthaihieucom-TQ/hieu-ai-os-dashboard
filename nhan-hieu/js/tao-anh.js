(function(){
const CANVAS_W = 1080, CANVAS_H = 1350;
const DEMO_TITLE = 'Facebook đang **trả lương** ảnh\ncao gấp đôi video?';
const DEMO_HANDLE = '@tenban';

// Bố cục chữ — vị trí/căn lề/kiểu nền, tổng hợp từ các mẫu Canva thực tế.
const LAYOUTS = [
  { key:'bottom-center', label:'Chữ dưới - căn giữa', desc:'Chữ đè lên ảnh, căn giữa phía dưới, nền mờ dần — giống mẫu ảnh thời trang/ảnh nói chuyện.', textPos:'bottom', align:'center', decor:'gradient-bottom' },
  { key:'top-center', label:'Chữ trên - căn giữa', desc:'Chữ nằm phía trên ảnh, căn giữa — hợp ảnh có phần trên tối/rộng như ảnh bàn thờ, không gian, phong cảnh.', textPos:'top', align:'center', decor:'gradient-top' },
  { key:'quote-left', label:'Trích dẫn - lề trái', desc:'Chữ lề trái có vạch nhấn bên cạnh, kiểu trích dẫn/quan điểm — giống mẫu ảnh triết lý, thông điệp sâu.', textPos:'middle', align:'left', decor:'accent-bar' },
  { key:'caption-bar', label:'Thanh chú thích dưới', desc:'Thanh nền tối liền khối ở đáy ảnh, chữ nằm gọn trong đó — giống mẫu ảnh chân dung, phỏng vấn.', textPos:'bottom', align:'center', decor:'solid-bar' },
];

// Font chữ — 3 kiểu, đều hỗ trợ tiếng Việt có dấu.
const FONTS = [
  { key:'oswald', label:'Đậm, gọn', family:'Oswald', weight:700 },
  { key:'playfair', label:'Thanh lịch', family:'Playfair Display', weight:800 },
  { key:'bevietnam', label:'Tròn, gần gũi', family:'Be Vietnam Pro', weight:700 },
];

// Màu nhấn — áp cho từ khoá tô nổi bật (**...**) và vạch trang trí.
const COLORS = [
  { key:'yellow', label:'Vàng cam', hex:'#FFC93C' },
  { key:'pink', label:'Hồng', hex:'#FF7FAE' },
  { key:'blue', label:'Xanh dương', hex:'#4FC3F7' },
  { key:'orange', label:'Đỏ cam', hex:'#FF6B4A' },
  { key:'green', label:'Xanh lá', hex:'#8BD17C' },
];

// Tách theo **...** để biết từ nào tô màu nhấn — giữ nguyên chữ hoa/thường người dùng gõ.
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

// Tôn trọng dấu xuống dòng (Enter) người dùng gõ: mỗi đoạn xuống dòng riêng, chỉ tự wrap trong đoạn đó.
function wrapTitle(ctx, title, maxWidth){
  const paragraphs = String(title||'').split('\n');
  const lines = [];
  paragraphs.forEach(p => {
    const words = parseWords(p);
    if(words.length === 0) lines.push([]);
    else lines.push(...wrapWords(ctx, words, maxWidth));
  });
  return lines;
}

// Tự co cỡ chữ để khối chữ luôn nằm vừa trong vùng cao tối đa cho phép — tránh chữ tràn ra ngoài/đè lên vùng khác.
function fitTitle(ctx, title, { maxWidth, maxHeight, baseFontSize, minFontSize, lineHeightRatio, fontFamily, fontWeight }){
  let fontSize = baseFontSize;
  let lines, lineHeight;
  while(true){
    ctx.font = `${fontWeight} ${fontSize}px '${fontFamily}', sans-serif`;
    lines = wrapTitle(ctx, title, maxWidth);
    lineHeight = Math.round(fontSize * lineHeightRatio);
    const blockHeight = Math.max(lines.length, 1) * lineHeight;
    if(blockHeight <= maxHeight || fontSize <= minFontSize) break;
    fontSize -= 2;
  }
  return { fontSize, lineHeight, lines };
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
    let x = opts.align === 'center'
      ? opts.x - line.reduce((sum,w,idx)=> sum + ctx.measureText(w.text).width + (idx>0?spaceWidth:0), 0) / 2
      : opts.x;
    line.forEach(w => {
      ctx.fillStyle = w.highlight ? opts.highlightColor : '#FFFFFF';
      ctx.fillText(w.text, x, y);
      x += ctx.measureText(w.text).width + spaceWidth;
    });
  });
  ctx.shadowBlur = 0;
}

function paintDesign(cx, W, H, { layoutKey, fontKey, colorKey, title, handle, bgImage }){
  const layout = LAYOUTS.find(l=>l.key===layoutKey) || LAYOUTS[0];
  const font = FONTS.find(f=>f.key===fontKey) || FONTS[0];
  const color = COLORS.find(c=>c.key===colorKey) || COLORS[0];
  const scale = W / CANVAS_W;
  const marginX = 64 * scale;
  const handleGap = 14 * scale;
  const isAccent = layout.decor === 'accent-bar';

  cx.clearRect(0,0,W,H);
  if(bgImage) drawImageCover(cx, bgImage, 0, 0, W, H);
  else { cx.fillStyle = '#2F6F62'; cx.fillRect(0,0,W,H); }
  cx.textBaseline = 'alphabetic';

  const maxTextWidth = W - marginX*2 - (isAccent ? 24*scale : 0);
  const handleFontSize = Math.round((layout.decor==='solid-bar' ? 24 : 30) * scale);

  // Vùng an toàn tối đa cho khối chữ theo từng bố cục (tỉ lệ theo chiều cao canvas).
  let zoneTop, zoneBottom, baseFontSize, minFontSize;
  if(layout.key === 'bottom-center'){ zoneTop = 0.40*H; zoneBottom = 0.86*H; baseFontSize = 58*scale; minFontSize = 24*scale; }
  else if(layout.key === 'top-center'){ zoneTop = 0.07*H; zoneBottom = 0.46*H; baseFontSize = 54*scale; minFontSize = 22*scale; }
  else if(layout.key === 'quote-left'){ zoneTop = 0.26*H; zoneBottom = 0.74*H; baseFontSize = 46*scale; minFontSize = 20*scale; }
  else { zoneTop = 0.60*H; zoneBottom = 0.97*H; baseFontSize = 44*scale; minFontSize = 18*scale; } // caption-bar

  const availableHeight = Math.max((zoneBottom - zoneTop) - handleFontSize - handleGap, minFontSize*1.2);
  const { fontSize, lineHeight, lines } = fitTitle(cx, title, {
    maxWidth: maxTextWidth, maxHeight: availableHeight,
    baseFontSize, minFontSize, lineHeightRatio: 1.2,
    fontFamily: font.family, fontWeight: font.weight,
  });
  const blockHeight = Math.max(lines.length,1) * lineHeight;

  // startY = baseline của dòng đầu tiên.
  let startY;
  if(layout.textPos === 'bottom') startY = (zoneBottom - handleFontSize - handleGap) - (lines.length-1)*lineHeight;
  else if(layout.textPos === 'top') startY = zoneTop + fontSize*0.85;
  else startY = zoneTop + ((zoneBottom - zoneTop) - blockHeight)/2 + fontSize*0.75;

  if(layout.decor === 'gradient-bottom'){
    const gradStart = H * 0.42;
    const grad = cx.createLinearGradient(0, gradStart, 0, H);
    grad.addColorStop(0, 'rgba(0,0,0,0)'); grad.addColorStop(1, 'rgba(0,0,0,0.8)');
    cx.fillStyle = grad; cx.fillRect(0, gradStart, W, H - gradStart);
  } else if(layout.decor === 'gradient-top'){
    const gradEnd = H * 0.48;
    const grad = cx.createLinearGradient(0, 0, 0, gradEnd);
    grad.addColorStop(0, 'rgba(0,0,0,0.65)'); grad.addColorStop(1, 'rgba(0,0,0,0)');
    cx.fillStyle = grad; cx.fillRect(0, 0, W, gradEnd);
  } else if(layout.decor === 'solid-bar'){
    const padding = 28*scale;
    const barHeight = Math.min(Math.max(blockHeight + handleFontSize + handleGap + padding*2, 0.16*H), 0.40*H);
    cx.fillStyle = 'rgba(10,12,10,0.9)';
    cx.fillRect(0, H - barHeight, W, barHeight);
    // Neo lại khối chữ theo đúng thanh vừa vẽ (không dùng zoneBottom cố định nữa).
    startY = (H - padding - handleFontSize - handleGap) - (lines.length-1)*lineHeight;
  } else if(layout.decor === 'accent-bar'){
    const boxTop = startY - lineHeight*0.75;
    const boxHeight = blockHeight + lineHeight*0.35;
    cx.fillStyle = 'rgba(8,10,8,0.5)';
    cx.fillRect(marginX - 22*scale, boxTop, maxTextWidth + 40*scale, boxHeight);
    cx.fillStyle = color.hex;
    cx.fillRect(marginX - 22*scale, boxTop, 6*scale, boxHeight);
  }

  const alignX = layout.align === 'center' ? W/2 : marginX;
  drawLines(cx, lines, { align: layout.align, x: alignX, startY, lineHeight, highlightColor: color.hex });

  cx.font = `500 ${handleFontSize}px 'Be Vietnam Pro', sans-serif`;
  cx.fillStyle = '#E8E4D6';
  cx.shadowColor = 'rgba(0,0,0,0.5)'; cx.shadowBlur = 6*scale;
  const lastLineBaseline = startY + (lines.length-1)*lineHeight;
  const handleY = lastLineBaseline + lineHeight*0.62;
  if(layout.align === 'center'){
    const hw = cx.measureText(handle).width;
    cx.fillText(handle, W/2 - hw/2, handleY);
  } else {
    cx.fillText(handle, alignX, handleY);
  }
  cx.shadowBlur = 0;
}

function render(container, ctx){
  const pendingTitle = window.PendingImageTitle;
  window.PendingImageTitle = null;
  const state = { bgImage:null, layout:'bottom-center', font:'oswald', color:'yellow', title:pendingTitle || DEMO_TITLE, handle:DEMO_HANDLE };

  function draw(){ container.innerHTML = html(); bind(); ensureFontsThenPaint(); }

  async function ensureFontsThenPaint(){
    try{ await Promise.all([
      document.fonts.load("700 50px 'Oswald'"),
      document.fonts.load("800 50px 'Playfair Display'"),
      document.fonts.load("700 50px 'Be Vietnam Pro'"),
    ]); } catch(e){}
    paintAll();
  }

  function pickerRow(title, items, activeKey, dataAttr, renderSwatch){
    return `
      <label style="display:block;font-size:13px;font-weight:600;color:var(--ink-soft);margin:16px 0 8px;">${esc(title)}</label>
      <div style="display:flex;gap:10px;flex-wrap:wrap;">
        ${items.map(it => `
          <div data-${dataAttr}="${it.key}" style="cursor:pointer;text-align:center;">
            ${renderSwatch(it, it.key===activeKey)}
            <div style="font-size:11px;margin-top:4px;color:${it.key===activeKey?'var(--accent)':'var(--ink-soft)'};font-weight:${it.key===activeKey?700:400};">${esc(it.label)}</div>
          </div>
        `).join('')}
      </div>
    `;
  }

  function html(){
    return `
      <div class="page-head"><h1>Tạo Ảnh Thương Hiệu</h1><p>Dùng để tạo ảnh có chữ đăng content (dạng "Text trên ảnh") — tải ảnh nền, chọn bố cục / font / màu, điền tiêu đề, tải PNG đăng ngay.</p></div>
      <div style="display:flex;gap:24px;flex-wrap:wrap-reverse;align-items:flex-start;">
        <div class="card" style="flex:1;min-width:300px;">
          <label style="display:block;font-size:13px;font-weight:600;color:var(--ink-soft);margin-bottom:6px;">Ảnh nền</label>
          <input type="file" accept="image/*" id="ta-upload">

          ${pickerRow('Bố cục chữ', LAYOUTS, state.layout, 'layout', (it, active)=>`
            <canvas class="ta-thumb-layout" data-thumb-layout="${it.key}" width="160" height="200"
              style="width:112px;height:auto;border-radius:8px;border:2px solid ${active?'var(--accent)':'var(--line)'};display:block;"></canvas>
          `)}
          <div style="font-size:12.5px;color:var(--ink-soft);margin-top:8px;">${esc((LAYOUTS.find(l=>l.key===state.layout)||{}).desc||'')} Xem full ở khung ảnh xem trước phía trên. ⬆</div>

          ${pickerRow('Kiểu chữ (font)', FONTS, state.font, 'font', (it, active)=>`
            <canvas class="ta-thumb-font" data-thumb-font="${it.key}" width="150" height="60"
              style="width:100px;height:auto;border-radius:8px;border:2px solid ${active?'var(--accent)':'var(--line)'};display:block;background:#1E2420;"></canvas>
          `)}

          ${pickerRow('Màu nhấn', COLORS, state.color, 'color', (it, active)=>`
            <div style="width:36px;height:36px;border-radius:50%;background:${it.hex};border:3px solid ${active?'var(--ink)':'var(--line)'};"></div>
          `)}

          <label style="display:block;font-size:13px;font-weight:600;color:var(--ink-soft);margin:18px 0 6px;">Tiêu đề chính</label>
          <div style="font-size:12.5px;color:var(--ink-soft);margin-bottom:6px;">Bọc từ khoá muốn tô màu nhấn trong dấu **...**, ví dụ: Facebook đang **trả lương** ảnh cao gấp đôi video?</div>
          <textarea id="ta-title" style="min-height:80px;">${esc(state.title)}</textarea>

          <label style="display:block;font-size:13px;font-weight:600;color:var(--ink-soft);margin:16px 0 6px;">Handle thương hiệu</label>
          <input type="text" id="ta-handle" value="${esc(state.handle)}" placeholder="@tenban" style="width:100%;padding:12px 14px;border:1px solid var(--line);border-radius:10px;font-size:14.5px;background:#FDFCF8;">

          <div class="btn-row"><button class="btn" data-action="download">Tải ảnh PNG</button></div>
        </div>
        <div style="flex:0 0 auto;position:sticky;top:16px;">
          <div style="font-size:12px;font-weight:700;color:var(--ink-soft);text-transform:uppercase;letter-spacing:.04em;margin-bottom:8px;">Xem trước — cập nhật ngay khi bạn chọn</div>
          <canvas id="ta-canvas" width="${CANVAS_W}" height="${CANVAS_H}" style="width:320px;max-width:80vw;height:auto;aspect-ratio:${CANVAS_W}/${CANVAS_H};border-radius:12px;border:1px solid var(--line);background:#ddd;"></canvas>
        </div>
      </div>
    `;
  }

  function paintAll(){
    const main = container.querySelector('#ta-canvas');
    if(main) paintDesign(main.getContext('2d'), CANVAS_W, CANVAS_H, { layoutKey: state.layout, fontKey: state.font, colorKey: state.color, title: state.title, handle: state.handle, bgImage: state.bgImage });

    container.querySelectorAll('.ta-thumb-layout').forEach(c=>{
      const key = c.getAttribute('data-thumb-layout');
      paintDesign(c.getContext('2d'), c.width, c.height, { layoutKey: key, fontKey: state.font, colorKey: state.color, title: DEMO_TITLE, handle: DEMO_HANDLE, bgImage: state.bgImage });
    });
    container.querySelectorAll('.ta-thumb-font').forEach(c=>{
      const key = c.getAttribute('data-thumb-font');
      const font = FONTS.find(f=>f.key===key);
      const fx = c.getContext('2d');
      fx.clearRect(0,0,c.width,c.height);
      fx.fillStyle = '#1E2420'; fx.fillRect(0,0,c.width,c.height);
      fx.font = `${font.weight} 28px '${font.family}', sans-serif`;
      fx.fillStyle = '#FFFFFF';
      fx.textBaseline = 'middle';
      const txt = 'Ăn Vặt';
      const tw = fx.measureText(txt).width;
      fx.fillText(txt, (c.width-tw)/2, c.height/2 + 2);
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
        img.onload = () => { state.bgImage = img; paintAll(); };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    };

    container.querySelectorAll('[data-layout]').forEach(el=>{ el.onclick = () => { state.layout = el.getAttribute('data-layout'); draw(); }; });
    container.querySelectorAll('[data-font]').forEach(el=>{ el.onclick = () => { state.font = el.getAttribute('data-font'); draw(); }; });
    container.querySelectorAll('[data-color]').forEach(el=>{ el.onclick = () => { state.color = el.getAttribute('data-color'); draw(); }; });

    const titleInput = container.querySelector('#ta-title');
    if(titleInput) titleInput.oninput = () => { state.title = titleInput.value; paintAll(); };

    const handleInput = container.querySelector('#ta-handle');
    if(handleInput) handleInput.oninput = () => { state.handle = handleInput.value; paintAll(); };

    const downloadBtn = container.querySelector('[data-action="download"]');
    if(downloadBtn) downloadBtn.onclick = () => {
      const canvas = container.querySelector('#ta-canvas');
      // Thẻ <a download> với data URL không đáng tin cậy trên Safari iOS/PWA (thường chỉ mở ảnh ra
      // xem chứ không lưu được thật) — ưu tiên Web Share API (mở đúng bảng chia sẻ "Lưu ảnh" của
      // hệ điều hành) nếu máy hỗ trợ, chỉ dùng lại cách tải file cũ làm phương án dự phòng.
      canvas.toBlob(async (blob) => {
        if(!blob) return;
        const file = new File([blob], 'anh-thuong-hieu.png', { type:'image/png' });
        if(navigator.canShare && navigator.canShare({ files:[file] })){
          try{ await navigator.share({ files:[file], title:'Ảnh thương hiệu' }); return; }
          catch(e){ if(e && e.name==='AbortError') return; }
        }
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.download = 'anh-thuong-hieu.png';
        a.href = url;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(()=>URL.revokeObjectURL(url), 30000);
      }, 'image/png');
    };
  }

  draw();
}

window.Modules = window.Modules || {};
window.Modules['tao-anh'] = { title:'Tạo Ảnh Thương Hiệu', render };
// Cho các module khác (vd Sửa Kênh) tái dùng để vẽ ảnh bìa gợi ý.
window.TaoAnhEngine = { paintDesign, LAYOUTS, FONTS, COLORS };
})();
