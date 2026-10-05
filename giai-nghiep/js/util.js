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
