function esc(s){
  return String(s==null?'':s).replace(/[&<>]/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
}

// Escape rồi in đậm các đoạn được AI bọc trong **...** — dùng cho các đoạn giải thích dài
// để nhấn từ khoá quan trọng, đỡ phải đọc hết cả đoạn mới nắm được ý chính.
function escBold(s){
  return esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
}

// Một số bản định vị cũ lưu "kết luận định vị" dạng cả đoạn dài nhiều câu dính liền nhau
// (trước khi siết prompt chỉ còn đúng 1 câu) — tách xuống dòng theo từng câu cho dễ đọc.
// AI đôi khi hiểu nhầm chỉ dẫn "xuống dòng bằng \n\n" theo nghĩa đen và in ra 4 ký tự
// \, n, \, n thay vì 1 dòng mới thật — chuẩn hoá về xuống dòng thật trước khi tách câu.
function breakSentences(s){
  const str = String(s==null?'':s).replace(/\\n+/g, '\n\n');
  return str.replace(/([.!?]['"'"”]?)\s+(?=[A-ZÀ-Ỹ"'"“])/g, '$1\n\n');
}

// Lấy đúng câu đầu tiên — dùng khi cần hiển thị ngắn gọn dạng tiêu đề (vd bản cũ dài nhiều câu).
function firstSentence(s){
  const str = String(s==null?'':s).trim();
  const m = /^[^.!?]*[.!?]/.exec(str);
  return m ? m[0].trim() : str;
}

function fmtDate(d){
  const dt = (d instanceof Date) ? d : new Date(d);
  return dt.toLocaleDateString('vi-VN', { weekday:'short', day:'2-digit', month:'2-digit' });
}

function isoDate(d){
  const dt = (d instanceof Date) ? d : new Date(d);
  const tzOffset = dt.getTimezoneOffset() * 60000;
  return new Date(dt - tzOffset).toISOString().slice(0,10);
}

function startOfWeek(d){
  const dt = new Date(d);
  const day = dt.getDay(); // 0=Sun
  const diff = (day === 0 ? -6 : 1) - day; // move to Monday
  dt.setDate(dt.getDate() + diff);
  dt.setHours(0,0,0,0);
  return dt;
}

async function callApi(path, body){
  // Đường dẫn tương đối (bỏ dấu "/" đầu) để hoạt động đúng dù web được host ở
  // gốc domain (Vercel) hay dưới 1 thư mục con qua reverse proxy (vd Cloudflare Worker
  // tại hesinhthaihieu.com/webxaynhanhieu) — trình duyệt sẽ tự nối theo đúng thư mục hiện tại.
  const relativePath = path.replace(/^\//, '');
  const { data: sessionData } = await supabaseClient.auth.getSession();
  const token = sessionData && sessionData.session ? sessionData.session.access_token : null;
  const resp = await fetch(relativePath, {
    method:'POST',
    headers:{
      'content-type':'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  const data = await resp.json();
  if(!resp.ok) throw new Error(data.error || 'Có lỗi xảy ra.');
  return data;
}
