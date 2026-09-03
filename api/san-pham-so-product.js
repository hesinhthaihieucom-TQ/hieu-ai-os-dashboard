// Sản Phẩm Số — người bán tạo/sửa/xoá/liệt kê sản phẩm của CHÍNH MÌNH. Dùng service role (bỏ qua
// RLS) nhưng LUÔN tự lọc theo owner_id = user.id trong mọi câu truy vấn, không tin owner_id nào từ
// client — giống pattern các api/*.js khác trong repo (requireUser xác thực, supabaseAdmin thao tác
// dữ liệu). Không xử lý upload file ở đây (xem api/san-pham-so-upload-url.js) — file có thể lớn hơn
// giới hạn payload của hàm serverless, nên client upload thẳng lên Storage qua signed URL riêng.

const { requireUser } = require('./_lib/auth');
const { supabaseAdmin } = require('./_lib/supabase-admin');

// Cho phép chữ/số thường + gạch ngang, không dấu, không khoảng trắng — dùng thẳng trong URL công
// khai (san-pham-so/p/?slug=...).
function slugify(s) {
  return String(s || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '') // bỏ dấu tiếng Việt
    .toLowerCase()
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

  const user = await requireUser(req);
  if (!user) { res.status(401).json({ error: 'Chưa đăng nhập.' }); return; }

  try {
    const { action, id } = req.body || {};

    if (action === 'list') {
      const resp = await supabaseAdmin(`digital_products?owner_id=eq.${user.id}&select=*&order=created_at.desc`);
      const rows = resp.ok ? await resp.json() : [];
      res.status(200).json({ products: rows });
      return;
    }

    if (action === 'delete') {
      if (!id) { res.status(400).json({ error: 'Thiếu id.' }); return; }
      await supabaseAdmin(`digital_products?id=eq.${id}&owner_id=eq.${user.id}`, { method: 'DELETE', prefer: 'return=minimal' });
      res.status(200).json({ success: true });
      return;
    }

    // Sửa tay nội dung landing page SAU KHI AI đã viết (san-pham-so-tao-landing-page.js) — tách riêng
    // khỏi 'save' vì không cần validate title/price/deliverable, chỉ ghi đúng 1 cột.
    if (action === 'update_landing_page') {
      const { landing_page_content, landing_page_template, case_study_images, bonus_items, guarantee_text, reference_price, team_members, stat_items } = req.body || {};
      if (!id) { res.status(400).json({ error: 'Thiếu id.' }); return; }
      const resp = await supabaseAdmin(`digital_products?id=eq.${id}&owner_id=eq.${user.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          landing_page_content: landing_page_content || null,
          landing_page_template: landing_page_template || 'quynh',
          case_study_images: case_study_images || null,
          bonus_items: bonus_items || null,
          guarantee_text: guarantee_text || null,
          reference_price: reference_price || null,
          team_members: team_members || null,
          stat_items: stat_items || null,
          updated_at: new Date().toISOString(),
        }),
      });
      const rows = resp.ok ? await resp.json() : [];
      if (!resp.ok || !rows[0]) { res.status(404).json({ error: 'Không tìm thấy sản phẩm.' }); return; }
      res.status(200).json({ product: rows[0] });
      return;
    }

    if (action === 'save') {
      const { title, description, price, cover_image_url, status, file_storage_path, file_name, external_link, dinh_dang, mini_course_lessons, webinar_datetime } = req.body || {};
      if (!title || !String(title).trim()) { res.status(400).json({ error: 'Vui lòng nhập tên sản phẩm.' }); return; }
      const priceNum = Number(price);
      if (!priceNum || priceNum <= 0) { res.status(400).json({ error: 'Giá sản phẩm phải lớn hơn 0.' }); return; }
      // Sản phẩm nào cần deliverable gì để đăng công khai — KHÁC NHAU theo dinh_dang (2026-09-01,
      // trước đây chỉ có 1 quy tắc chung "file HOẶC link"). mini_course cần ít nhất 1 bài học có link;
      // các loại còn lại (kể cả không set dinh_dang — sản phẩm cũ) vẫn theo quy tắc cũ.
      const hasLessons = Array.isArray(mini_course_lessons) && mini_course_lessons.some(l => l && l.link && String(l.link).trim());
      const hasGenericDeliverable = !!file_storage_path || !!external_link;
      if (status === 'published') {
        if (dinh_dang === 'mini_course' ? !hasLessons : !hasGenericDeliverable) {
          res.status(400).json({ error: 'Chưa đủ nội dung giao hàng cho khách — kiểm tra lại file/link/danh sách bài học trước khi đăng công khai.' });
          return;
        }
      }

      if (id) {
        // Sửa sản phẩm ĐÃ CÓ — chỉ đúng chủ sở hữu mới sửa được (lọc owner_id ngay trong query, PATCH
        // vào hàng không khớp sẽ không có tác dụng gì, không lỗi cũng không đổi được của người khác).
        const patchBody = { title: title.trim(), description: description || null, price: priceNum, updated_at: new Date().toISOString() };
        if (cover_image_url !== undefined) patchBody.cover_image_url = cover_image_url || null;
        if (status) patchBody.status = status;
        if (file_storage_path !== undefined) patchBody.file_storage_path = file_storage_path || null;
        if (file_name !== undefined) patchBody.file_name = file_name || null;
        if (external_link !== undefined) patchBody.external_link = external_link || null;
        if (dinh_dang !== undefined) patchBody.dinh_dang = dinh_dang || null;
        if (mini_course_lessons !== undefined) patchBody.mini_course_lessons = mini_course_lessons || null;
        if (webinar_datetime !== undefined) patchBody.webinar_datetime = webinar_datetime || null;
        const resp = await supabaseAdmin(`digital_products?id=eq.${id}&owner_id=eq.${user.id}`, {
          method: 'PATCH',
          body: JSON.stringify(patchBody),
        });
        const rows = resp.ok ? await resp.json() : [];
        if (!resp.ok || !rows[0]) { res.status(404).json({ error: 'Không tìm thấy sản phẩm.' }); return; }
        res.status(200).json({ product: rows[0] });
        return;
      }

      // Tạo mới — sinh slug từ tên, thêm hậu tố ngắn nếu trùng (unique constraint ở schema) thay vì
      // báo lỗi bắt người bán tự đổi tên, để trải nghiệm mượt hơn.
      let slug = slugify(title) || 'san-pham';
      for (let attempt = 0; attempt < 5; attempt++) {
        const candidate = attempt === 0 ? slug : `${slug}-${Math.random().toString(36).slice(2, 6)}`;
        const insertResp = await supabaseAdmin('digital_products', {
          method: 'POST',
          body: JSON.stringify({
            owner_id: user.id,
            slug: candidate,
            title: title.trim(),
            description: description || null,
            cover_image_url: cover_image_url || null,
            price: priceNum,
            file_storage_path: file_storage_path || null,
            file_name: file_name || null,
            external_link: external_link || null,
            dinh_dang: dinh_dang || null,
            mini_course_lessons: mini_course_lessons || null,
            webinar_datetime: webinar_datetime || null,
            status: status === 'published' ? 'published' : 'draft',
          }),
        });
        if (insertResp.ok) {
          const rows = await insertResp.json();
          res.status(200).json({ product: rows[0] });
          return;
        }
        // 409/23505 = trùng slug — thử lại với hậu tố ngẫu nhiên, các lỗi khác thì dừng luôn.
        if (insertResp.status !== 409) break;
      }
      res.status(500).json({ error: 'Không tạo được sản phẩm — thử lại giúp mình.' });
      return;
    }

    res.status(400).json({ error: 'Thiếu action hợp lệ.' });
  } catch (e) {
    res.status(500).json({ error: 'Có lỗi xảy ra — thử lại giúp mình.' });
  }
};
