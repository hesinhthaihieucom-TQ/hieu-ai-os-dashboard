// Ký URL tạm (10 phút) để đọc 1 file "tài liệu/kiến thức" (materials/) mà user đã tải lên qua
// api/san-pham-so-upload-material-url.js — dùng chung giữa đầu wizard Giai đoạn 1
// (api/tim-san-pham-phu-hop.js có logic tương tự inline, giữ nguyên không đổi) và Giai đoạn 2
// (api/xay-dung-noi-dung.js, để nội dung viết ra bám sát tài liệu gốc thay vì chỉ dùng 1 lần ở bước
// tìm ý tưởng rồi bỏ). Trả về null (không throw) nếu thiếu/lỗi — tài liệu là phần BỔ SUNG, không có
// vẫn phải viết được bình thường.
const { SUPABASE_URL } = require('./supabase-admin');

async function signMaterialUrl(userId, materialPath) {
  if (!materialPath || !materialPath.startsWith(`materials/${userId}-`)) return null;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) return null;
  try {
    const signResp = await fetch(`${SUPABASE_URL}/storage/v1/object/sign/digital-products/${materialPath}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
      body: JSON.stringify({ expiresIn: 600 }),
    });
    if (!signResp.ok) return null;
    const signData = await signResp.json();
    return `${SUPABASE_URL}/storage/v1${signData.signedURL}`;
  } catch (e) {
    return null;
  }
}

module.exports = { signMaterialUrl };
