// Tiện ích dùng chung rất nhỏ — app này không cần bộ util đầy đủ của tai-chinh/suc-khoe.
// esc() phải escape cả " và ' (nội dung chèn vào thuộc tính HTML bọc "..." từng bị cắt mất khi gặp ").
function esc(s){
  return String(s==null?'':s).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
function debounce(fn, ms){
  let t; return (...a)=>{ clearTimeout(t); t = setTimeout(()=>fn(...a), ms); };
}

// Tải toàn bộ tiến độ của 1 người → map { [ngày]: {answers, checklist, done_at} }. Lỗi/chưa chạy schema
// (bảng chưa tồn tại) thì trả map rỗng — app vẫn mở được, chỉ chưa lưu/đọc được tiến độ.
async function gnLoadAllProgress(supabase, userId){
  const map = {};
  try{
    const { data } = await supabase.from('gn_progress').select('day,answers,checklist,done_at').eq('user_id', userId);
    (data||[]).forEach(r=>{ map[r.day] = r; });
  } catch(e){}
  return map;
}

// Một ngày coi là "đã bắt đầu" khi có ít nhất 1 chữ đã gõ hoặc 1 ô checklist đã tick.
function gnDayHasContent(row){
  if(!row) return false;
  const a = row.answers || {};
  const any = ['ex','jr','wk'].some(k=>(a[k]||[]).some(x=>x && String(x).trim()));
  return any || (row.checklist||[]).some(Boolean) || !!row.done_at;
}

// Ghép các dòng đã bị ngắt theo bề rộng trang PDF thành đoạn văn: đoạn kết thúc khi dòng kết thúc câu
// (. ! ? ” ") VÀ ngắn hơn ~80 ký tự (dòng dài kết thúc câu thường là nằm giữa đoạn); dòng bắt đầu bằng "01 " là
// mục mới; dòng ngắn không có dấu câu (tiêu đề phụ) đứng riêng thành 1 đoạn.
function gnParas(lines){
  const out = []; let cur = [];
  const flush = ()=>{ if(cur.length){ out.push(cur.join(' ')); cur = []; } };
  (lines||[]).forEach(l=>{
    l = String(l).trim(); if(!l) return;
    if(/^0\d\s/.test(l) || /^(TRỤ CỘT|✦|—|\d\.\s)/.test(l)) flush();
    cur.push(l);
    if(/[.!?”"…]$/.test(l) && l.length < 80) flush();
    else if(!/[,;:—-]$/.test(l) && l.length < 45 && cur.length === 1) flush();
  });
  flush(); return out;
}

// Ghi thêm 1 khoá vào answers của 1 ngày mà KHÔNG làm mất câu trả lời/checklist/done_at đang có (đọc dòng cũ → gộp → upsert).
async function gnPatchAnswers(supabase, userId, day, patch){
  let row = null;
  try{
    const { data } = await supabase.from('gn_progress').select('answers,checklist,done_at').eq('user_id', userId).eq('day', day).maybeSingle();
    row = data;
  } catch(e){}
  const answers = Object.assign({}, (row && row.answers) || {}, patch);
  const { error } = await supabase.from('gn_progress').upsert({
    user_id: userId, day, answers, checklist: (row && row.checklist) || [], done_at: (row && row.done_at) || null,
    updated_at: new Date().toISOString(),
  }, { onConflict:'user_id,day' });
  return { error, answers };
}

// ===== Hình minh hoạ (SVG nội tuyến, màu theo bảng màu ebook) =====
const GN_SVG = {
  // Vòng lặp nghiệp: Ý → Khẩu → Thân → kết quả quen thuộc → quay lại
  loop: `<svg viewBox="0 0 360 260" style="width:100%;max-width:380px;display:block;margin:10px auto;" role="img" aria-label="Vòng lặp nghiệp: suy nghĩ, lời nói, hành động, kết quả quen thuộc">
    <defs><marker id="ar" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" fill="#B8923A"/></marker></defs>
    <ellipse cx="180" cy="132" rx="118" ry="84" fill="none" stroke="#E3DCC8" stroke-width="2" stroke-dasharray="4 6"/>
    <path d="M222 52 Q 282 62 292 96" fill="none" stroke="#B8923A" stroke-width="3" marker-end="url(#ar)"/>
    <path d="M292 168 Q 282 214 232 220" fill="none" stroke="#B8923A" stroke-width="3" marker-end="url(#ar)"/>
    <path d="M128 222 Q 66 214 62 170" fill="none" stroke="#B8923A" stroke-width="3" marker-end="url(#ar)"/>
    <path d="M62 94 Q 72 56 134 50" fill="none" stroke="#B8923A" stroke-width="3" marker-end="url(#ar)"/>
    <g font-family="Be Vietnam Pro,sans-serif" font-size="13" text-anchor="middle">
      <rect x="134" y="30" width="96" height="36" rx="18" fill="#2E5B2B"/><text x="182" y="53" fill="#fff" font-weight="600">Suy nghĩ · Ý</text>
      <rect x="250" y="102" width="104" height="36" rx="18" fill="#4E7F45"/><text x="302" y="125" fill="#fff" font-weight="600">Lời nói · Khẩu</text>
      <rect x="128" y="202" width="116" height="36" rx="18" fill="#8B6B3A"/><text x="186" y="225" fill="#fff" font-weight="600">Hành động · Thân</text>
      <rect x="6" y="100" width="108" height="48" rx="12" fill="#FFF8EC" stroke="#E0B36A"/><text x="60" y="120" fill="#6A5A2A" font-size="12.5">Kết quả</text><text x="60" y="137" fill="#6A5A2A" font-size="12.5">quen thuộc</text>
    </g></svg>`,
  pillar(n){
    const c = ['#2E5B2B','#8B6B3A','#B8566B','#B8923A','#2B4F6B'][n-1] || '#2E5B2B';
    const g = {
      1:`<circle cx="22" cy="14" r="6" fill="${c}"/><path d="M10 38c0-8 5-13 12-13s12 5 12 13" fill="none" stroke="${c}" stroke-width="3" stroke-linecap="round"/>`,
      2:`<path d="M22 38V18M22 18c-6 0-10-4-10-9 6 0 10 3 10 9zM22 24c6 0 10-4 10-9-6 0-10 3-10 9z" fill="none" stroke="${c}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>`,
      3:`<path d="M22 36C8 26 8 12 16 10c4-1 6 2 6 4 0-2 2-5 6-4 8 2 8 16-6 26z" fill="none" stroke="${c}" stroke-width="3" stroke-linejoin="round"/>`,
      4:`<circle cx="22" cy="22" r="13" fill="none" stroke="${c}" stroke-width="3"/><path d="M22 14v16M17 19c0-3 10-3 10 0s-10 3-10 6 10 3 10 0" fill="none" stroke="${c}" stroke-width="2.5" stroke-linecap="round"/>`,
      5:`<path d="M8 30c6-14 22-14 28 0M22 10v6M12 16l3 4M32 16l-3 4" fill="none" stroke="${c}" stroke-width="3" stroke-linecap="round"/><circle cx="22" cy="30" r="3" fill="${c}"/>`,
    }[n];
    return `<svg viewBox="0 0 44 44" aria-hidden="true">${g}</svg>`;
  },
  week(n){
    const g = {
      1:`<circle cx="27" cy="27" r="22" fill="none" stroke="#fff" stroke-opacity=".5" stroke-width="2"/><path d="M27 42V22M27 22c-7 0-11-5-11-10 7 0 11 4 11 10zM27 28c7 0 11-5 11-10-7 0-11 4-11 10z" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>`,
      2:`<circle cx="27" cy="27" r="22" fill="none" stroke="#fff" stroke-opacity=".5" stroke-width="2"/><path d="M27 40C13 31 13 17 21 15c4-1 6 2 6 4 0-2 2-5 6-4 8 2 8 16-6 25z" fill="none" stroke="#fff" stroke-width="3" stroke-linejoin="round"/>`,
      3:`<circle cx="27" cy="27" r="22" fill="none" stroke="#fff" stroke-opacity=".5" stroke-width="2"/><path d="M15 38l8-10 6 6 10-16" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/><circle cx="39" cy="18" r="3" fill="#fff"/>`,
    }[n];
    return `<svg viewBox="0 0 54 54" aria-hidden="true">${g}</svg>`;
  },
};

// Tiêu đề trong ebook bị cách chữ ("L Ờ I  T H Ệ  Ư Ớ C") → gộp lại. Chỉ áp dụng khi đa số "từ" là 1 ký tự.
function gnDespace(s){
  const ne = String(s).split(' ').filter(Boolean);
  if(ne.length > 3 && ne.filter(x=>x.length===1).length/ne.length > 0.6){
    return String(s).replace(/ {2,}/g,'\u0001').replace(/(?<=\S) (?=\S)/g,'').replace(/\u0001/g,' ');
  }
  return s;
}
// Tách 1 trang phần mở đầu thành: phụ đề (các dòng ngắn đầu), đoạn dẫn, danh sách mục "01 …" và đoạn kết.
function gnSplitFront(f){
  const lines = (f.items||[]).map(gnDespace);
  const sub = []; let i = 0;
  while(i < lines.length && lines[i].length < 45 && !/[.!?]$/.test(lines[i]) && !/^0\d\s/.test(lines[i])){ sub.push(lines[i]); i++; }
  const intro = []; const items = [];
  for(; i < lines.length; i++){
    const l = lines[i];
    if(/^0\d\s/.test(l)) items.push({ t:l.replace(/^0\d\s+/,''), n:l.slice(0,2), lines:[] });
    else if(items.length) items[items.length-1].lines.push(l);
    else intro.push(l);
  }
  let outro = [];
  items.forEach((it,k)=>{
    const ps = gnParas(it.lines);
    it.d = ps[0] || '';
    if(ps.length > 1){ if(k === items.length-1) outro = ps.slice(1); else it.d += ' ' + ps.slice(1).join(' '); }
  });
  return { h: gnDespace(f.h), sub: sub.join(' '), intro: gnParas(intro), items, outro };
}
