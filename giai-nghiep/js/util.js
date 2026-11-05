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
